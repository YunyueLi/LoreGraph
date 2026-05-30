"""Re-run LLM canonicalization on an already-extracted book (no re-clustering).

The same canonicalization that Pass-3 now applies automatically lives in
``loregraph.pipeline.canonicalize``; this CLI re-applies it to a book already in
the DB — handy for books extracted before canonicalization was wired in, or to
refresh names/factions after prompt tweaks. It writes ``canon`` / ``faction`` /
``generic`` to ``entities.attributes`` (additive — reversible by clearing those
keys), most-connected entities first.

    uv run python scripts/canonicalize_book.py --book-id 3 --dry-run --limit 30
    uv run python scripts/canonicalize_book.py --book-id 3
    uv run python scripts/canonicalize_book.py --book-id 3 --factions-only --frontend-id xyj
"""

from __future__ import annotations

import argparse
import asyncio
import json
from collections import Counter
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope
from loregraph.pipeline.canonicalize import (
    FAC_LOCALES,
    canonicalize,
    lang_name,
    localize_factions,
)
from loregraph.pipeline.orchestrator import make_llm_client_from_env

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "data" / "exports"


def _v(x: object) -> str:
    return str(x.value if hasattr(x, "value") else x)


async def run(book_id: int, limit: int, dry_run: bool) -> None:
    init_engine()
    async with session_scope() as session:
        book = await session.get(orm.Book, book_id)
        if book is None:
            raise SystemExit(f"book_id {book_id} not found")
        entities = (
            (
                await session.execute(
                    select(orm.Entity).where(orm.Entity.book_id == book_id).order_by(orm.Entity.id)
                )
            )
            .scalars()
            .all()
        )
        deg: Counter = Counter()
        for src, dst in (
            await session.execute(
                select(orm.Edge.src_entity_id, orm.Edge.dst_entity_id).where(
                    orm.Edge.book_id == book_id
                )
            )
        ).all():
            deg[src] += 1
            deg[dst] += 1
        # Most-connected first: those names/factions matter most and validate fastest.
        ranked = sorted(entities, key=lambda e: -deg.get(e.id, 0))
        items = [
            {
                "id": e.canonical_id,
                "name": e.canonical_name,
                "aliases": list(e.aliases or []),
                "type": _v(e.type).lower(),
                "deg": deg.get(e.id, 0),
            }
            for e in ranked
        ]
    if limit:
        items = items[:limit]

    results = await canonicalize(make_llm_client_from_env(), book.title, book.language, items)

    # --- report ---
    rows = [(it, results[it["id"]]) for it in items if it["id"] in results]
    changed = [(it, r) for it, r in rows if r.canon and r.canon.strip() != it["name"]]
    generics = [it for it, r in rows if r.generic]
    factions = Counter(r.faction.strip() for _, r in rows if r.faction.strip())
    print(f"\nprocessed {len(rows)}/{len(items)} entities")
    print(
        f"renamed: {len(changed)} | generic(dropped): {len(generics)} | factions: {len(factions)}"
    )
    print("\n=== sample renames (by degree) ===")
    for it, r in changed[:30]:
        print(f"  deg={it['deg']:<4} {it['name']!r:>14} -> {r.canon!r:<14} [{r.faction or '-'}]")
    print("\n=== factions ===")
    for f, c in factions.most_common(20):
        print(f"  {c:>3}  {f}")
    print("\n=== flagged generic ===")
    print("  " + ", ".join(sorted({it["name"] for it in generics})[:40]))

    if dry_run:
        print("\n[dry-run] no DB writes")
        return

    n = 0
    async with session_scope() as session:
        db_rows = (
            (await session.execute(select(orm.Entity).where(orm.Entity.book_id == book_id)))
            .scalars()
            .all()
        )
        for e in db_rows:
            r = results.get(e.canonical_id)
            if r is None:
                continue
            attrs = dict(e.attributes or {})
            if r.canon and r.canon.strip():
                attrs["canon"] = r.canon.strip()
            if r.faction and r.faction.strip():
                attrs["faction"] = r.faction.strip()
            attrs["generic"] = bool(r.generic)
            e.attributes = attrs
            flag_modified(e, "attributes")
            n += 1
        await session.commit()
    print(f"\nwrote attributes (canon/faction/generic) to {n} entities for book {book_id}")


async def run_factions(book_id: int, frontend_id: str) -> None:
    """Localize factions + collapse Traditional/Simplified duplicates.

    The source text can be Traditional (西游记 is), so the LLM emits faction labels
    in mixed 繁/简 (凡间 vs 凡間) which would split one faction into two regions. We
    translate every raw label into the UI locales; the zh-CN (Simplified) rendering
    becomes the CANONICAL key, so 凡间/凡間 merge. The normalized faction is written
    back to entities.attributes and the locale map to <frontend_id>.factions.json."""
    init_engine()
    async with session_scope() as session:
        book = await session.get(orm.Book, book_id)
        if book is None:
            raise SystemExit(f"book_id {book_id} not found")
        ents = (
            (await session.execute(select(orm.Entity).where(orm.Entity.book_id == book_id)))
            .scalars()
            .all()
        )
    raw = sorted({(e.attributes or {}).get("faction", "").strip() for e in ents} - {""})
    print(f"raw factions ({len(raw)}): {raw}")
    if not raw:
        print("no factions on DB yet — run canonicalization (without --factions-only) first")
        return

    fac = await localize_factions(
        make_llm_client_from_env(), book.title, lang_name(book.language), raw
    )
    # Canonical Simplified key per raw label = its zh-CN rendering, so 繁/简
    # duplicates (凡间 / 凡間) collapse into one faction/region.
    canon_of = {r: ((fac.get(r) or {}).get("zh-CN") or r).strip() for r in raw}
    merged: dict[str, dict] = {}
    for r in raw:
        key = canon_of[r]
        if key not in merged or len(fac.get(r) or {}) > len(merged[key]):
            merged[key] = fac.get(r) or {}
    print(f"normalized to {len(merged)} factions: {sorted(merged)}")

    n = 0
    async with session_scope() as session:
        db_rows = (
            (await session.execute(select(orm.Entity).where(orm.Entity.book_id == book_id)))
            .scalars()
            .all()
        )
        for e in db_rows:
            f = (e.attributes or {}).get("faction", "").strip()
            if f and canon_of.get(f) and canon_of[f] != f:
                attrs = dict(e.attributes or {})
                attrs["faction"] = canon_of[f]
                e.attributes = attrs
                flag_modified(e, "attributes")
                n += 1
        await session.commit()
    print(f"normalized faction on {n} entities")

    out = EXPORTS / f"{frontend_id}.factions.json"
    out.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}  ({len(merged)} factions, {len(FAC_LOCALES)} locales)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--limit", type=int, default=0, help="only the top-N by degree (0 = all)")
    ap.add_argument("--dry-run", action="store_true", help="print results, write nothing")
    ap.add_argument(
        "--factions-only",
        action="store_true",
        help="skip per-entity work; just translate existing DB factions → <id>.factions.json",
    )
    ap.add_argument(
        "--frontend-id", help="output id for the factions sidecar (required with --factions-only)"
    )
    a = ap.parse_args()
    if a.factions_only:
        if not a.frontend_id:
            raise SystemExit("--factions-only requires --frontend-id")
        asyncio.run(run_factions(a.book_id, a.frontend_id))
    else:
        asyncio.run(run(a.book_id, a.limit, a.dry_run))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
