"""Translate a book's entity names + glosses into the UI locales.

Produces data/exports/<frontend_id>.i18n.json:
    { canonical_id: { locale: {name, gloss} } }   # 8 locales incl. en

The landing page's window.LG_ENTITY_LOCALE is keyed exactly this way, so
build_frontend_data.py merges this file in and every view (graph nodes, index,
reader highlights, timeline, panels) localizes automatically. Evidence spans and
the reading text stay in the original language — those are literal citations.

    uv run python scripts/translate_book.py --frontend-id alice

Uses the configured LLM (currently DeepSeek via OpenRouter — cheap, multilingual).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path

from pydantic import BaseModel, RootModel

from loregraph.llm.parser import parse_into
from loregraph.pipeline.orchestrator import make_llm_client_from_env

ROOT = Path(__file__).resolve().parent.parent
EXPORTS = ROOT / "data" / "exports"

# en is the source; translate into these.
LOCALES = {
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
}
_BATCH = 10
_CONCURRENCY = 8


def _summary(note_md: str) -> str:
    if not note_md:
        return ""
    m = re.search(r"\[CONTEXT\]\s*(.+?)(?:\n\[[A-Z_]+\]|\Z)", note_md, re.S)
    body = (m.group(1) if m else note_md).strip()
    body = re.sub(r"\s+", " ", body)
    return body[:280] + ("…" if len(body) > 280 else "")


class _One(BaseModel):
    id: str
    name: str
    gloss: str


class _Batch(RootModel[list[_One]]):
    pass


def _prompt(title: str, lang: str, items: list[dict]) -> str:
    rows = "\n".join(
        f'{{"id": "{it["id"]}", "name": {json.dumps(it["name"])}, "gloss": {json.dumps(it["gloss"])}}}'
        for it in items
    )
    return (
        f"You are a literary translator. Translate the entity NAME and the one-line GLOSS "
        f'of characters/objects/events/concepts from the work "{title}" into {lang}.\n\n'
        f"Rules:\n"
        f"- Translate names the way they are conventionally rendered in {lang} editions of this "
        f"work (use the established/idiomatic translation, not a literal transliteration, when one "
        f"exists). Keep a sensible {lang} rendering otherwise.\n"
        f"- Translate the gloss into natural, fluent {lang}. Keep it one line, similar length.\n"
        f"- Preserve every id exactly. Return ONLY a JSON array, same order, each item "
        f'{{"id","name","gloss"}}. No commentary.\n\n'
        f"Items:\n{rows}"
    )


async def _translate_batch(llm, title: str, lang: str, items: list[dict]) -> dict:
    try:
        msg = await llm.complete(system="", user=_prompt(title, lang, items), max_tokens=4096)
        text = llm.extract_text(msg)
        out = parse_into(_Batch, text).root
    except Exception:
        return {}
    return {o.id: {"name": o.name.strip(), "gloss": o.gloss.strip()} for o in out if o.id}


async def run(frontend_id: str) -> None:
    payload = json.loads((EXPORTS / f"{frontend_id}.json").read_text(encoding="utf-8"))
    title = payload["metadata"]["title"]
    items = [
        {"id": e["canonical_id"], "name": e["canonical_name"], "gloss": _summary(e.get("note_md", ""))}
        for e in payload["entities"]
    ]
    llm = make_llm_client_from_env()

    # English is the source — store it verbatim.
    result: dict[str, dict] = {it["id"]: {"en": {"name": it["name"], "gloss": it["gloss"]}} for it in items}

    batches = [items[i : i + _BATCH] for i in range(0, len(items), _BATCH)]
    sem = asyncio.Semaphore(_CONCURRENCY)

    async def one(lang: str, batch: list[dict]) -> tuple[str, dict]:
        async with sem:
            return lang, await _translate_batch(llm, title, lang, batch)

    jobs = [one(lang, b) for lang in LOCALES for b in batches]
    for done, fut in enumerate(asyncio.as_completed([asyncio.ensure_future(j) for j in jobs]), start=1):
        lang, mapping = await fut
        for eid, val in mapping.items():
            if eid in result:
                result[eid][lang] = val
        if done % 20 == 0:
            print(f"  {done}/{len(jobs)} batches")

    out_path = EXPORTS / f"{frontend_id}.i18n.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    # Coverage report.
    cov = {lang: sum(1 for v in result.values() if lang in v) for lang in LOCALES}
    print(f"wrote {out_path.relative_to(ROOT)}  ({len(result)} entities)  coverage={cov}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--frontend-id", required=True)
    a = ap.parse_args()
    asyncio.run(run(a.frontend_id))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
