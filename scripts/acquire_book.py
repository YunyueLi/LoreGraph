"""scripts/acquire_book.py — fetch one book's source text into data/books/<id>/.

Resolution order:
    1. Project Gutenberg via Gutendex API (https://gutendex.com)
    2. archive.org (TODO — only if PG misses)
    3. WebFetch fallback (manual entries in .goal/manual_sources.json)

Saves:
    data/books/<id>/source.txt          raw text (UTF-8, BOM stripped)
    data/books/<id>/meta.json           {id, title, author, source_url, fetched_at, sha256, license}

Updates .goal/state.json with txt_path / source_url / source_hash / license.

CLI:
    uv run python scripts/acquire_book.py <frontend_id>
    uv run python scripts/acquire_book.py --list-pending [--limit N]
    uv run python scripts/acquire_book.py --batch <N>      # acquire next N pending
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import unicodedata
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
STATE_PATH = ROOT / ".goal" / "state.json"
BOOKS_DIR = ROOT / "data" / "books"
MANUAL_PATH = ROOT / ".goal" / "manual_sources.json"
GUTENDEX = "https://gutendex.com/books/"


def load_state() -> dict:
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def save_state(state: dict) -> None:
    state["updated_at"] = datetime.now(UTC).isoformat()
    tmp = STATE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(STATE_PATH)


def load_manual() -> dict:
    if MANUAL_PATH.exists():
        return json.loads(MANUAL_PATH.read_text(encoding="utf-8"))
    return {}


def _normalize_title(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return " ".join(s.lower().split())


def gutendex_by_id(client: httpx.Client, gid: int) -> dict | None:
    """Fetch a single Gutenberg record by its numeric id."""
    r = client.get(GUTENDEX, params={"ids": str(gid)}, timeout=60.0, follow_redirects=True)
    r.raise_for_status()
    data = r.json()
    return data["results"][0] if data.get("results") else None


def _verify_text(text: str, title: str, author: str) -> bool:
    """Sanity check that a downloaded text plausibly matches the work.

    Looks at the first ~12k chars (covers PG header + opening) for either a
    title token or the author surname. Translations/librettos legitimately
    may not contain the English title, so this is best-effort — callers can
    bypass with skip_verify for known-good manual sources.
    """
    head = _normalize_title(text[:12000])
    norm_title = _normalize_title(title)
    title_tokens = [t for t in norm_title.split() if len(t) > 3]
    surname = _normalize_title(author.split()[-1]) if author else ""
    if surname and surname in head:
        return True
    # Require at least half the substantive title tokens to appear.
    if title_tokens:
        hits = sum(1 for t in title_tokens if t in head)
        if hits >= max(1, len(title_tokens) // 2):
            return True
    return False


def gutendex_search(client: httpx.Client, title: str, author: str) -> dict | None:
    """Best-effort match: query title + first-token of author surname."""
    author_surname = author.split()[-1] if author else ""
    q = f"{title} {author_surname}".strip()
    r = client.get(GUTENDEX, params={"search": q}, timeout=60.0, follow_redirects=True)
    r.raise_for_status()
    data = r.json()
    if not data.get("results"):
        return None
    norm_title = _normalize_title(title)
    norm_surname = _normalize_title(author_surname)
    # Require BOTH title and author surname to match (substring after normalize).
    # Don't fall back to "first hit" — that produces false positives for modern
    # in-copyright works whose only PG match is some unrelated book of the same
    # name (e.g. "The Name of the Rose" 1980 vs PG #33283 some Victorian novel).
    for result in data["results"]:
        rt = _normalize_title(result["title"])
        authors = " ".join(a.get("name", "") for a in result.get("authors", []))
        ra = _normalize_title(authors)
        if norm_title in rt and norm_surname and norm_surname in ra:
            return result
    return None


def gutendex_pick_text_format(formats: dict) -> str | None:
    """Pick the best plaintext URL from a Gutendex `formats` dict.

    PG sometimes serves text at `.txt.utf-8` or `.txt` URLs; don't filter
    by file extension — just trust the MIME key prefix.
    """
    preferred_keys = [
        "text/plain; charset=utf-8",
        "text/plain; charset=us-ascii",
        "text/plain; charset=iso-8859-1",
        "text/plain",
    ]
    for key in preferred_keys:
        if key in formats:
            return formats[key]
    for k, v in formats.items():
        if k.startswith("text/plain"):
            return v
    return None


def download_text(client: httpx.Client, url: str) -> str:
    r = client.get(url, timeout=60.0, follow_redirects=True)
    r.raise_for_status()
    text = r.text
    # Strip UTF-8 BOM if present.
    if text.startswith("﻿"):
        text = text[1:]
    return text


def save_book(
    book_id: str, text: str, source_url: str, title: str, author: str, license_: str
) -> tuple[str, str]:
    book_dir = BOOKS_DIR / book_id
    book_dir.mkdir(parents=True, exist_ok=True)
    txt_path = book_dir / "source.txt"
    txt_path.write_text(text, encoding="utf-8")
    sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
    meta = {
        "id": book_id,
        "title": title,
        "author": author,
        "source_url": source_url,
        "fetched_at": datetime.now(UTC).isoformat(),
        "sha256": sha,
        "license": license_,
        "bytes": len(text.encode("utf-8")),
        "chars": len(text),
    }
    (book_dir / "meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return str(txt_path.relative_to(ROOT)), sha


def acquire_one(client: httpx.Client, state: dict, book_id: str) -> tuple[bool, str]:
    """Returns (ok, message). On success, updates state in-place."""
    book = state["books"].get(book_id)
    if not book:
        return False, f"unknown id {book_id!r}"
    if book.get("txt_path"):
        return True, "already acquired"

    manual = load_manual().get(book_id)
    if manual:
        # Manual source spec. Supports:
        #   {"gutenberg_id": 2554}                     fetch PG by id
        #   {"url": "https://..."}                     direct text URL
        #   optional: "license", "skip_verify", "note"
        try:
            if "gutenberg_id" in manual:
                rec = gutendex_by_id(client, int(manual["gutenberg_id"]))
                if not rec:
                    raise RuntimeError(f"PG id {manual['gutenberg_id']} not found")
                src_url = gutendex_pick_text_format(rec.get("formats", {}))
                if not src_url:
                    raise RuntimeError(f"PG id {manual['gutenberg_id']} has no text format")
                license_ = manual.get("license", "public-domain")
            else:
                src_url = manual["url"]
                license_ = manual.get("license", "unknown")

            text = download_text(client, src_url)
            if not manual.get("skip_verify") and not _verify_text(
                text, book["title"], book["author"]
            ):
                raise RuntimeError(
                    f"verification failed — {src_url} doesn't look like {book['title']!r} "
                    "(set skip_verify:true in manual_sources.json if this source is correct)"
                )
            txt_path, sha = save_book(
                book_id, text, src_url, book["title"], book["author"], license_
            )
            book["txt_path"] = txt_path
            book["source_url"] = src_url
            book["source_hash"] = sha
            book["license"] = license_
            return True, f"manual ok ({len(text):,} chars) {manual.get('note', '')}".strip()
        except Exception as e:
            book["errors"].append(f"manual fetch failed: {e!s}")
            return False, f"manual fetch failed: {e!s}"

    # Gutendex
    try:
        match = gutendex_search(client, book["title"], book["author"])
    except Exception as e:
        book["errors"].append(f"gutendex search error: {e!s}")
        return False, f"gutendex search error: {e!s}"

    if not match:
        # Not on PG with strict title+author match. Almost always means
        # the book is modern / in-copyright. Flag for a later non-PG
        # fallback pass (archive.org, manual_sources.json).
        book["license"] = "copyrighted"
        book["errors"].append("not found on Gutendex (strict match) — likely in-copyright")
        return False, "not on Gutendex (flagged copyrighted for fallback)"

    txt_url = gutendex_pick_text_format(match.get("formats", {}))
    if not txt_url:
        book["license"] = "blocked"
        book["errors"].append(f"Gutendex match {match.get('id')} has no plain-text format")
        return False, f"match {match.get('id')} has no text format"

    try:
        text = download_text(client, txt_url)
    except Exception as e:
        book["errors"].append(f"download failed: {e!s}")
        return False, f"download failed: {e!s}"

    txt_path, sha = save_book(
        book_id, text, txt_url, book["title"], book["author"], "public-domain"
    )
    book["txt_path"] = txt_path
    book["source_url"] = txt_url
    book["source_hash"] = sha
    book["license"] = "public-domain"
    return True, f"PG #{match.get('id')} ok ({len(text):,} chars)"


def reconcile(state: dict) -> list[str]:
    """Scan data/books/<id>/ for source.txt written out-of-band (e.g. by a
    research agent) and fold them into state. Centralizes state writes so
    parallel agents never race on state.json — they only write book dirs.
    """
    updated: list[str] = []
    for bid, book in state["books"].items():
        if book.get("txt_path"):
            continue
        txt = BOOKS_DIR / bid / "source.txt"
        if not txt.exists() or txt.stat().st_size == 0:
            continue
        text = txt.read_text(encoding="utf-8", errors="replace")
        sha = hashlib.sha256(text.encode("utf-8")).hexdigest()
        meta_path = BOOKS_DIR / bid / "meta.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        book["txt_path"] = str(txt.relative_to(ROOT))
        book["source_url"] = meta.get("source_url", book.get("source_url"))
        book["source_hash"] = sha
        book["license"] = meta.get("license", book.get("license") or "unknown")
        updated.append(bid)
    return updated


def list_pending(state: dict, limit: int | None = None) -> list[str]:
    """Books without a txt_path AND license is still 'unknown'.

    Flagged states ('copyrighted', 'blocked') are excluded — a separate
    fallback pass (archive.org / manual) handles those.
    """
    pending = [
        bid
        for bid, b in state["books"].items()
        if not b.get("txt_path") and b.get("license") == "unknown"
    ]
    return pending[:limit] if limit else pending


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("book_id", nargs="?")
    parser.add_argument("--batch", type=int, default=None, help="acquire next N pending")
    parser.add_argument(
        "--manual", action="store_true", help="acquire all ids in manual_sources.json"
    )
    parser.add_argument(
        "--reconcile", action="store_true", help="fold out-of-band source.txt files into state"
    )
    parser.add_argument("--list-pending", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args(argv)

    state = load_state()

    if args.reconcile:
        updated = reconcile(state)
        save_state(state)
        print(f"reconciled {len(updated)} books: {', '.join(updated) if updated else '(none)'}")
        return 0

    if args.list_pending:
        pend = list_pending(state, args.limit)
        print(f"pending: {len(pend)}")
        for bid in pend:
            b = state["books"][bid]
            print(f"  {bid:8s} {b['lang']:3s} {b['title']} — {b['author']}")
        return 0

    targets: list[str]
    if args.manual:
        targets = list(load_manual().keys())
        # Re-attempt even if previously flagged: clear non-txt flags so the
        # manual source gets a clean shot.
        for bid in targets:
            b = state["books"].get(bid)
            if b and not b.get("txt_path") and b.get("license") in {"copyrighted", "blocked"}:
                b["license"] = "unknown"
    elif args.batch:
        targets = list_pending(state, args.batch)
    elif args.book_id:
        targets = [args.book_id]
    else:
        parser.error("provide <book_id>, --batch N, --manual, or --list-pending")
        return 2

    with httpx.Client(headers={"User-Agent": "LoreGraph/1.0 (acquire)"}) as client:
        for bid in targets:
            t0 = time.time()
            ok, msg = acquire_one(client, state, bid)
            dt = time.time() - t0
            status = "OK " if ok else "ERR"
            b = state["books"][bid]
            print(f"  {status} {bid:8s} {b['lang']:3s} {b['title'][:40]:40s} {dt:5.1f}s  {msg}")
            save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
