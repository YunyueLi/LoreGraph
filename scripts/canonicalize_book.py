"""Assign well-known canonical names + factions to a book's entities (LLM step).

Top open-source narrative-KG systems don't trust the most-frequent surface form
as a character's name, nor raw graph topology for "factions":

- BookNLP clusters name variants and keeps the recognized PROPER name.
- Microsoft GraphRAG runs an explicit LLM *canonicalization* step and then an
  LLM *community-labeling* step rather than relying on topology alone.

This is that step. For each entity we ask the model for:

- ``canon``   — the name a reader of THIS work recognizes (孙悟空, not 行者;
               猪八戒, not 八戒). Kept blank when the surface form is already it.
- ``faction`` — the group/势力 a CHARACTER belongs to (取经队伍 / 天庭 / 佛门 /
               龙宫 / 妖魔 / 地府 / 凡间 / 朝廷 …). The graph view pools nodes by
               this, giving real region/faction clustering instead of noisy
               label-propagation communities.
- ``generic`` — true for non-individual collective/unnamed references
               (妖精 / 群妖 / 小妖 / 众僧 / 老者 …), which are dropped from the
               character graph.

Results persist on ``entities.attributes`` (additive — reversible by clearing the
``canon``/``faction``/``generic`` keys), so ``export_book.py`` and every downstream
view pick them up. Entities are processed most-connected first.

    uv run python scripts/canonicalize_book.py --book-id 3 --dry-run --limit 30
    uv run python scripts/canonicalize_book.py --book-id 3
"""

from __future__ import annotations

import argparse
import asyncio
import json
from collections import Counter
from pathlib import Path

from pydantic import BaseModel, RootModel
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope
from loregraph.llm.parser import parse_into
from loregraph.pipeline.orchestrator import make_llm_client_from_env

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "data" / "exports"

_BATCH = 12
_CONCURRENCY = 8

# Faction labels are localized into these (zh-CN is usually the source for CJK works).
_FAC_LOCALES = ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de"]

_LANG = {
    "zh": "Chinese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "ru": "Russian",
}


def _v(x: object) -> str:
    return str(x.value if hasattr(x, "value") else x)


class _One(BaseModel):
    id: str
    canon: str = ""
    faction: str = ""
    generic: bool = False


class _Batch(RootModel[list[_One]]):
    pass


class _FacMap(RootModel[dict[str, dict[str, str]]]):
    pass


async def _translate_factions(llm, title: str, srclang: str, labels: list[str]) -> dict:
    """Translate the unique faction labels into every UI locale, so region titles
    localize (取经队伍 → "The Pilgrimage Party" / 「取経隊」 …) instead of showing
    the source language in every view."""
    if not labels:
        return {}
    locs = ", ".join(_FAC_LOCALES)
    prompt = (
        f'These are faction / group labels (in {srclang}) from the work "{title}". '
        f"Translate EACH into these locales: {locs}. Use the conventional rendering for this work "
        f"where one exists; keep them short (a few words). Return ONLY a JSON object mapping each "
        f'ORIGINAL label to an object of locale→translation, e.g. '
        f'{{"取经队伍": {{"en": "The Pilgrimage Party", "ja": "取経隊", ...}}}}.\n\n'
        f"Labels: {json.dumps(labels, ensure_ascii=False)}"
    )
    try:
        msg = await llm.complete(system="", user=prompt, max_tokens=2048)
        out = parse_into(_FacMap, llm.extract_text(msg)).root
    except Exception as exc:  # network/parse failure → skip faction localization
        print(f"  faction translation failed: {exc}")
        return {label: {} for label in labels}
    # Ensure the source label is always present as its own locale value.
    for label in labels:
        out.setdefault(label, {})
    return out


def _prompt(title: str, lang: str, items: list[dict]) -> str:
    rows = "\n".join(
        json.dumps(
            {"id": it["id"], "name": it["name"], "aliases": it["aliases"][:8], "type": it["type"]},
            ensure_ascii=False,
        )
        for it in items
    )
    return (
        f'You are a literary knowledge-graph curator working on the work "{title}".\n'
        f"For each entity, decide how a well-read reader of THIS work would label it. "
        f"Write all text in {lang}.\n\n"
        f"Return for each id:\n"
        f'- "canon": the canonical, widely-recognized name of this entity. If the given name is a '
        f"vague descriptor or a less-common surface form but the entity is clearly ONE specific named "
        f"character/place/object, replace it with the recognized name (e.g. a monkey pilgrim whose "
        f"aliases include 大圣/悟空/行者 → 孙悟空; the pig 天蓬元帅/悟能 → 猪八戒; the monk 玄奘/三藏 → 唐僧). "
        f'If the given name is already the recognized name, return it unchanged. Never invent a name.\n'
        f'- "faction": for CHARACTERS only, a short label for the group/faction/势力 they belong to in '
        f"this work (e.g. 取经队伍 / 天庭 / 佛门 / 龙宫 / 妖魔 / 地府 / 凡间 / 朝廷). Use the SAME label for "
        f'everyone in the same group so they cluster. For non-characters use "".\n'
        f'- "generic": true ONLY if this is not a specific individual but a generic / collective / '
        f"unnamed reference (e.g. 妖精 / 群妖 / 小妖 / 众僧 / 老者 / 群猴 / 众神 / 百姓 / 两个行者).\n\n"
        f"Preserve every id EXACTLY. Return ONLY a JSON array, same order, each "
        f'{{"id","canon","faction","generic"}}. No commentary.\n\n'
        f"Entities:\n{rows}"
    )


async def _do_batch(llm, title: str, lang: str, items: list[dict]) -> dict[str, _One]:
    try:
        msg = await llm.complete(system="", user=_prompt(title, lang, items), max_tokens=4096)
        out = parse_into(_Batch, llm.extract_text(msg)).root
    except Exception as exc:  # a failed batch just stays un-canonicalized
        print(f"  batch failed: {exc}")
        return {}
    return {o.id: o for o in out if o.id}


async def run(book_id: int, limit: int, dry_run: bool) -> None:
    init_engine()
    async with session_scope() as session:
        book = await session.get(orm.Book, book_id)
        if book is None:
            raise SystemExit(f"book_id {book_id} not found")
        lang = _LANG.get((book.language or "en").lower()[:2], "the work's original language")

        entities = (
            (
                await session.execute(
                    select(orm.Entity).where(orm.Entity.book_id == book_id).order_by(orm.Entity.id)
                )
            )
            .scalars()
            .all()
        )
        # Most-connected first: those names/factions matter most and validate fastest.
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
        id_by_entid = {e.id: e.canonical_id for e in entities}
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

    llm = make_llm_client_from_env()
    batches = [items[i : i + _BATCH] for i in range(0, len(items), _BATCH)]
    sem = asyncio.Semaphore(_CONCURRENCY)

    async def one(batch: list[dict]) -> dict[str, _One]:
        async with sem:
            return await _do_batch(llm, book.title, lang, batch)

    result: dict[str, _One] = {}
    futs = [asyncio.ensure_future(one(b)) for b in batches]
    for done, fut in enumerate(asyncio.as_completed(futs), start=1):
        result.update(await fut)
        if done % 10 == 0:
            print(f"  {done}/{len(batches)} batches")

    # --- report ---
    renamed = [(it, result[it["id"]]) for it in items if it["id"] in result]
    changed = [(it, r) for it, r in renamed if r.canon and r.canon.strip() != it["name"]]
    generics = [it for it, r in renamed if r.generic]
    factions = Counter(r.faction.strip() for _, r in renamed if r.faction.strip())
    print(f"\nprocessed {len(renamed)}/{len(items)} entities")
    print(f"renamed: {len(changed)} | generic(dropped): {len(generics)} | factions: {len(factions)}")
    print("\n=== sample renames (by degree) ===")
    for it, r in changed[:30]:
        print(f"  deg={it['deg']:<4} {it['name']!r:>14} → {r.canon!r:<14} [{r.faction or '-'}]")
    print("\n=== factions ===")
    for f, n in factions.most_common(20):
        print(f"  {n:>3}  {f}")
    print("\n=== flagged generic ===")
    print("  " + ", ".join(sorted({it["name"] for it in generics})[:40]))

    if dry_run:
        print("\n[dry-run] no DB writes")
        return

    # --- persist (additive) ---
    n_written = 0
    async with session_scope() as session:
        rows = (
            (
                await session.execute(
                    select(orm.Entity).where(orm.Entity.book_id == book_id)
                )
            )
            .scalars()
            .all()
        )
        for e in rows:
            r = result.get(e.canonical_id)
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
            n_written += 1
        await session.commit()
    _ = id_by_entid  # (kept for parity / debugging)
    print(f"\nwrote attributes (canon/faction/generic) to {n_written} entities for book {book_id}")


async def run_factions(book_id: int, frontend_id: str) -> None:
    """Translate the factions already on entities.attributes into every UI locale
    and write data/exports/<frontend_id>.factions.json (consumed by the converter
    for localized region titles)."""
    init_engine()
    async with session_scope() as session:
        book = await session.get(orm.Book, book_id)
        if book is None:
            raise SystemExit(f"book_id {book_id} not found")
        srclang = _LANG.get((book.language or "en").lower()[:2], "the original language")
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

    fac = await _translate_factions(make_llm_client_from_env(), book.title, srclang, raw)
    # Canonical Simplified key per raw label = its zh-CN rendering, so 繁/简
    # duplicates (凡间 / 凡間) collapse into one faction/region.
    canon_of = {r: ((fac.get(r) or {}).get("zh-CN") or r).strip() for r in raw}
    merged: dict[str, dict] = {}
    for r in raw:
        key = canon_of[r]
        if key not in merged or len(fac.get(r) or {}) > len(merged[key]):
            merged[key] = fac.get(r) or {}
    print(f"normalized to {len(merged)} factions: {sorted(merged)}")

    # Persist the normalized faction back onto each entity.
    n = 0
    async with session_scope() as session:
        rows = (
            (await session.execute(select(orm.Entity).where(orm.Entity.book_id == book_id)))
            .scalars()
            .all()
        )
        for e in rows:
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
    print(f"wrote {out.relative_to(ROOT)}  ({len(merged)} factions, {len(_FAC_LOCALES)} locales)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, required=True)
    ap.add_argument("--limit", type=int, default=0, help="only the top-N by degree (0 = all)")
    ap.add_argument("--dry-run", action="store_true", help="print results, write nothing")
    ap.add_argument("--factions-only", action="store_true",
                    help="skip per-entity work; just translate existing DB factions → <id>.factions.json")
    ap.add_argument("--frontend-id", help="output id for the factions sidecar (required with --factions-only)")
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
