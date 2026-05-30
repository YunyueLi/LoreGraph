"""LLM canonicalization — well-known names, factions, generic flags.

Pass-3 clusters mentions into entities and picks the most-FREQUENT surface form
as the canonical name. For famous works that's wrong (西游记 says 行者 far more
than 孙悟空) and it offers no notion of "faction". Top narrative-KG systems handle
this with an explicit LLM step — BookNLP keeps the recognized proper name;
Microsoft GraphRAG runs an LLM canonicalization + community-labeling pass. This
module is that step, shared by:

- ``Pass3`` (via the orchestrator) — runs automatically after clustering so every
  new book gets well-known names + factions natively.
- ``scripts/canonicalize_book.py`` — re-run canonicalization on already-extracted
  books without re-clustering.

It is pure LLM logic (no DB/ORM): callers pass plain item dicts and apply the
results however they persist entities. Failures are swallowed (best-effort): a
refinement miss leaves the entity with its surface-form name, never aborts a pass.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from pydantic import BaseModel, RootModel

from loregraph.llm.client import LLMClient, LLMUsage
from loregraph.llm.parser import parse_into

log = logging.getLogger(__name__)

BATCH = 12
CONCURRENCY = 8

# ISO-639-1 (book language) → English name for the prompt.
LANG = {
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
# UI locales the faction labels are translated into (zh-CN is the source for CJK works).
FAC_LOCALES = ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "es", "de"]


class CanonResult(BaseModel):
    id: str
    canon: str = ""
    faction: str = ""
    generic: bool = False


class _Batch(RootModel[list[CanonResult]]):
    pass


class _FacMap(RootModel[dict[str, dict[str, str]]]):
    pass


def lang_name(language: str | None) -> str:
    return LANG.get((language or "en").lower()[:2], "the work's original language")


def build_prompt(title: str, lang: str, items: list[dict[str, Any]]) -> str:
    rows = "\n".join(
        json.dumps(
            {
                "id": it["id"],
                "name": it["name"],
                "aliases": (it.get("aliases") or [])[:8],
                "type": it.get("type", ""),
            },
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
        f"If the given name is already the recognized name, return it unchanged. Never invent a name.\n"
        f'- "faction": for CHARACTERS only, a short label for the group/faction/势力 they belong to in '
        f"this work (e.g. 取经队伍 / 天庭 / 佛门 / 龙宫 / 妖魔 / 地府 / 凡间 / 朝廷). Use the SAME label for "
        f'everyone in the same group so they cluster. For non-characters use "".\n'
        f'- "generic": true ONLY if this is not a specific individual but a generic / collective / '
        f"unnamed reference (e.g. 妖精 / 群妖 / 小妖 / 众僧 / 老者 / 群猴 / 众神 / 百姓 / 两个行者).\n\n"
        f"Preserve every id EXACTLY. Return ONLY a JSON array, same order, each "
        f'{{"id","canon","faction","generic"}}. No commentary.\n\n'
        f"Entities:\n{rows}"
    )


async def _do_batch(
    llm: LLMClient, title: str, lang: str, items: list[dict[str, Any]], usage: LLMUsage | None
) -> dict[str, CanonResult]:
    try:
        msg = await llm.complete(system="", user=build_prompt(title, lang, items), max_tokens=4096)
        if usage is not None:
            usage.merge(msg)
        out = parse_into(_Batch, llm.extract_text(msg)).root
    except Exception as exc:  # best-effort: a failed batch just stays un-canonicalized
        log.warning("canonicalize batch failed: %s", exc)
        return {}
    return {o.id: o for o in out if o.id}


async def canonicalize(
    llm: LLMClient,
    title: str,
    language: str | None,
    items: list[dict[str, Any]],
    *,
    batch_size: int = BATCH,
    concurrency: int = CONCURRENCY,
    usage: LLMUsage | None = None,
) -> dict[str, CanonResult]:
    """Map entity ``items`` ([{id, name, aliases, type}]) → {id: CanonResult}.

    Swallows per-batch errors; returns whatever resolved (possibly partial)."""
    if not items:
        return {}
    lang = lang_name(language)
    batches = [items[i : i + batch_size] for i in range(0, len(items), batch_size)]
    sem = asyncio.Semaphore(concurrency)

    async def one(batch: list[dict[str, Any]]) -> dict[str, CanonResult]:
        async with sem:
            return await _do_batch(llm, title, lang, batch, usage)

    out: dict[str, CanonResult] = {}
    for fut in asyncio.as_completed([asyncio.ensure_future(one(b)) for b in batches]):
        out.update(await fut)
    return out


async def localize_factions(
    llm: LLMClient, title: str, srclang: str, labels: list[str], usage: LLMUsage | None = None
) -> dict[str, dict[str, str]]:
    """Translate faction labels into every UI locale (for localized region titles)."""
    if not labels:
        return {}
    locs = ", ".join(FAC_LOCALES)
    prompt = (
        f'These are faction / group labels (in {srclang}) from the work "{title}". '
        f"Translate EACH into these locales: {locs}. Use the conventional rendering for this work "
        f"where one exists; keep them short (a few words). Return ONLY a JSON object mapping each "
        f"ORIGINAL label to an object of locale→translation, e.g. "
        f'{{"取经队伍": {{"en": "The Pilgrimage Party", "ja": "取経隊", ...}}}}.\n\n'
        f"Labels: {json.dumps(labels, ensure_ascii=False)}"
    )
    try:
        msg = await llm.complete(system="", user=prompt, max_tokens=2048)
        if usage is not None:
            usage.merge(msg)
        out = parse_into(_FacMap, llm.extract_text(msg)).root
    except Exception as exc:  # network/parse failure → skip faction localization
        log.warning("faction translation failed: %s", exc)
        return {label: {} for label in labels}
    for label in labels:
        out.setdefault(label, {})
    return out
