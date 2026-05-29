"""Quick Pass-2 validation harness (NOT a committed tool — dev scratch).

Runs entity extraction on one book's already-chunked text WITHOUT writing to
the DB, and tallies mentions by type. Used to iterate on the Pass-2 prompt's
salience bar (esp. the Event over-extraction).

    uv run python scripts/_validate_pass2.py --book-id 2 [--limit N]
"""

from __future__ import annotations

import argparse
import asyncio
from collections import Counter
from types import SimpleNamespace

from sqlalchemy import select

from loregraph.db import schema as orm
from loregraph.db.engine import init_engine, session_scope
from loregraph.pipeline.orchestrator import make_llm_client_from_env
from loregraph.pipeline.pass2_entity import Pass2EntityExtractor


async def run(book_id: int, limit: int | None, concurrency: int, offset: int = 0) -> None:
    init_engine()
    async with session_scope() as session:
        rows = (
            (
                await session.execute(
                    select(orm.Chunk)
                    .where(orm.Chunk.book_id == book_id)
                    .order_by(orm.Chunk.chapter, orm.Chunk.seq)
                )
            )
            .scalars()
            .all()
        )
        chunks = [
            SimpleNamespace(id=r.id, book_id=r.book_id, atom_id=r.atom_id, text=r.text)
            for r in rows
        ]
    if offset:
        chunks = chunks[offset:]
    if limit:
        chunks = chunks[:limit]

    llm = make_llm_client_from_env()
    extractor = Pass2EntityExtractor(llm)
    sem = asyncio.Semaphore(concurrency)

    async def one(c: SimpleNamespace) -> list:
        async with sem:
            return await extractor.extract_chunk(c)  # type: ignore[arg-type]

    results = await asyncio.gather(*[one(c) for c in chunks], return_exceptions=True)

    by_type: Counter[str] = Counter()
    distinct: set[tuple[str, str]] = set()
    surfaces: dict[str, Counter[str]] = {}
    n_fail = 0
    for r in results:
        if isinstance(r, BaseException):
            n_fail += 1
            continue
        for m in r:
            t = m.type.value if hasattr(m.type, "value") else m.type
            by_type[t] += 1
            distinct.add((t, m.surface_form.strip().lower()))
            surfaces.setdefault(t, Counter())[m.surface_form.strip()] += 1

    dt: Counter[str] = Counter(t for t, _ in distinct)
    print(f"chunks={len(chunks)} failures={n_fail}")
    print(f"mentions by type:   {dict(by_type)}  (total={sum(by_type.values())})")
    print(f"distinct by type:   {dict(dt)}  (TOTAL distinct={len(distinct)})")
    for show in ("Agent", "Event"):
        print(f"\ntop 25 {show} surfaces:")
        for s, n in surfaces.get(show, Counter()).most_common(25):
            print(f"  {n:3d}  {s[:72]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--book-id", type=int, default=2)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--concurrency", type=int, default=8)
    a = ap.parse_args()
    asyncio.run(run(a.book_id, a.limit, a.concurrency, a.offset))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
