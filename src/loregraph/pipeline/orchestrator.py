"""Pipeline orchestrator.

Owns the lifecycle of a single book through some range of passes. Tracks
each run in `pass_runs`, exposes cost / token statistics, and enforces a
per-book LLM spend ceiling.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete

from loregraph.db import repository as repo
from loregraph.db import schema as orm
from loregraph.llm.client import LLMClient, make_llm_client
from loregraph.models.enums import PassStatus
from loregraph.models.runs import PassRunCreate
from loregraph.pipeline.context import PipelineContext
from loregraph.pipeline.pass1_chunk import ChunkerConfig, Pass1Chunker
from loregraph.pipeline.pass2_entity import Pass2EntityExtractor
from loregraph.pipeline.pass3_cluster import Pass3Clusterer
from loregraph.pipeline.pass4_coref import Pass4CorefResolver
from loregraph.pipeline.pass5_relation import Pass5RelationExtractor
from loregraph.pipeline.pass6_glucose import Pass6GlucoseExtractor
from loregraph.pipeline.pass7_cove import Pass7CoVeVerifier
from loregraph.pipeline.pass8_note import Pass8NoteSynth

log = logging.getLogger(__name__)

# Pass-8 (Hybrid Note synthesis) is optional in spirit but always run by
# default — it's the bit the front-end uses for entity profile cards.
MAX_PASS_NUM_V0_1 = 8

# Bounded parallelism for per-chunk LLM calls. Claude-via-OpenRouter tolerates
# ~10-15 concurrent; the client's retry+jitter absorbs the occasional 429.
# This is what turns a ~20-min sequential entity pass into ~2 min.
_LLM_CONCURRENCY = 10


async def _gather_bounded(coros: list[Any], limit: int) -> list[Any]:
    """Run awaitables with a concurrency cap, preserving input order.

    Used to parallelize the LLM calls inside a pass. DB writes are NOT done
    here — a single AsyncSession is not safe for concurrent use, so callers
    collect these results and write to the DB serially.
    """
    sem = asyncio.Semaphore(limit)

    async def _run(coro: Any) -> Any:
        async with sem:
            return await coro

    return await asyncio.gather(*(_run(c) for c in coros))


class Orchestrator:
    """Run a contiguous range of passes against a book."""

    def __init__(self, ctx: PipelineContext) -> None:
        self.ctx = ctx

    async def run(self, *, from_pass: int = 1, to_pass: int = MAX_PASS_NUM_V0_1) -> None:
        if from_pass < 1 or to_pass < from_pass:
            raise ValueError(f"invalid pass range [{from_pass}, {to_pass}]")
        if to_pass > MAX_PASS_NUM_V0_1:
            raise NotImplementedError(
                f"Pass-{to_pass} is out of range (only Pass-1..Pass-{MAX_PASS_NUM_V0_1} exist)."
            )

        for pass_num in range(from_pass, to_pass + 1):
            await self._run_one_pass(pass_num)

    # ---- internals ----

    async def _run_one_pass(self, pass_num: int) -> None:
        log.info("Pass-%d starting (book_id=%d)", pass_num, self.ctx.book_id)
        started = datetime.now(UTC)

        try:
            stats = await {
                1: self._run_pass_1_chunk,
                2: self._run_pass_2_entity,
                3: self._run_pass_3_cluster,
                4: self._run_pass_4_coref,
                5: self._run_pass_5_relation,
                6: self._run_pass_6_glucose,
                7: self._run_pass_7_cove,
                8: self._run_pass_8_note,
            }[pass_num]()
        except Exception as exc:
            # Discard the failed pass's partial writes, then durably record the
            # FAILED marker. Earlier passes stay committed, so the book can be
            # resumed with `--from <this pass>` instead of re-running everything.
            await self.ctx.session.rollback()
            await repo.upsert_pass_run(
                self.ctx.session,
                PassRunCreate(
                    book_id=self.ctx.book_id,
                    pass_num=pass_num,
                    status=PassStatus.FAILED,
                    stats={},
                    error=f"{type(exc).__name__}: {exc}",
                ),
            )
            await self.ctx.session.commit()
            log.exception("Pass-%d failed", pass_num)
            raise

        finished = datetime.now(UTC)
        await repo.upsert_pass_run(
            self.ctx.session,
            PassRunCreate(
                book_id=self.ctx.book_id,
                pass_num=pass_num,
                status=PassStatus.DONE,
                stats={
                    **stats,
                    "started_at": started.isoformat(),
                    "finished_at": finished.isoformat(),
                    "elapsed_sec": (finished - started).total_seconds(),
                },
            ),
        )
        # Commit each pass independently: the pipeline spans many minutes of LLM
        # calls, so we must NOT hold one transaction (and its locks) open across
        # the whole run. Per-pass commits also make every pass durable + resumable.
        await self.ctx.session.commit()
        log.info("Pass-%d done in %.1fs", pass_num, (finished - started).total_seconds())

    async def _run_pass_1_chunk(self) -> dict[str, Any]:
        book = await repo.get_book(self.ctx.session, self.ctx.book_id)
        if book is None or book.source_path is None:
            raise RuntimeError(
                f"book_id={self.ctx.book_id} has no source_path; "
                "re-run `loregraph ingest` to populate it."
            )

        with open(book.source_path, encoding="utf-8") as f:
            text = f.read()

        # Idempotent re-run: clear chunks (cascades to mentions/edges/facts) so a
        # `--from 1` rebuild starts clean instead of duplicating rows.
        await self.ctx.session.execute(
            delete(orm.Chunk).where(orm.Chunk.book_id == self.ctx.book_id)
        )
        chunker = Pass1Chunker(ChunkerConfig())
        chunks_in = chunker.chunk(book_id=self.ctx.book_id, text=text)
        chunks_out = await repo.insert_chunks(self.ctx.session, chunks_in)

        return {"chunks": len(chunks_out)}

    async def _run_pass_2_entity(self) -> dict[str, Any]:
        chunks = await repo.list_chunks(self.ctx.session, self.ctx.book_id)
        if not chunks:
            raise RuntimeError("Pass-2 needs chunks from Pass-1. Run with --from 1 first.")

        # Idempotent re-run: clear mentions from any previous Pass-2 attempt.
        await self.ctx.session.execute(
            delete(orm.Mention).where(orm.Mention.book_id == self.ctx.book_id)
        )

        extractor = Pass2EntityExtractor(self.ctx.llm)
        # Parallelize the per-chunk LLM extraction; then write serially.
        per_chunk = await _gather_bounded(
            [extractor.extract_chunk(chunk) for chunk in chunks], _LLM_CONCURRENCY
        )
        all_mentions = []
        for mentions in per_chunk:
            all_mentions.extend(await repo.insert_mentions(self.ctx.session, mentions))

        self.ctx.usage.merge_from(extractor.usage)

        return {
            "chunks_processed": len(chunks),
            "mentions": len(all_mentions),
            **extractor.usage.to_dict(),
        }

    async def _run_pass_3_cluster(self) -> dict[str, Any]:
        mentions = await repo.list_mentions(self.ctx.session, self.ctx.book_id)
        if not mentions:
            raise RuntimeError("Pass-3 needs mentions from Pass-2. Run --from 2 first.")

        # Idempotent re-run: clear entities (cascades to edges/facts/community
        # members; nulls mentions.entity_id) before re-clustering.
        await self.ctx.session.execute(
            delete(orm.Entity).where(orm.Entity.book_id == self.ctx.book_id)
        )

        clusterer = Pass3Clusterer(self.ctx.llm)
        entities_in = await clusterer.cluster_book(book_id=self.ctx.book_id, mentions=mentions)
        entities_out = await repo.insert_entities(self.ctx.session, entities_in)

        self.ctx.usage.merge_from(clusterer.usage)

        return {
            "mentions_seen": len(mentions),
            "entities_created": len(entities_out),
            **clusterer.usage.to_dict(),
        }

    async def _run_pass_4_coref(self) -> dict[str, Any]:
        entities = await repo.list_entities(self.ctx.session, self.ctx.book_id)
        if not entities:
            raise RuntimeError("Pass-4 needs canonical entities from Pass-3. Run --from 3 first.")
        mentions = await repo.list_mentions(self.ctx.session, self.ctx.book_id)
        if not mentions:
            raise RuntimeError("Pass-4 needs mentions from Pass-2. Run --from 2 first.")

        resolver = Pass4CorefResolver()
        return await resolver.resolve_book(
            session=self.ctx.session, entities=entities, mentions=mentions
        )

    async def _run_pass_5_relation(self) -> dict[str, Any]:
        chunks = await repo.list_chunks(self.ctx.session, self.ctx.book_id)
        if not chunks:
            raise RuntimeError("Pass-5 needs chunks. Run --from 1 first.")

        # Idempotent re-run: clear edges from any previous Pass-5 attempt.
        await self.ctx.session.execute(delete(orm.Edge).where(orm.Edge.book_id == self.ctx.book_id))

        extractor = Pass5RelationExtractor(self.ctx.llm)
        # Fetch each chunk's entity list serially (fast, shared session), then
        # parallelize the LLM relation extraction.
        pairs = [
            (chunk, await repo.list_entities_in_chunk(self.ctx.session, chunk.id))
            for chunk in chunks
        ]
        per_chunk = await _gather_bounded(
            [extractor.extract_chunk(chunk, ents) for chunk, ents in pairs],
            _LLM_CONCURRENCY,
        )
        total_edges = 0
        chunks_with_edges = 0
        for edges_in in per_chunk:
            if edges_in:
                edges_out = await repo.insert_edges(self.ctx.session, edges_in)
                total_edges += len(edges_out)
                chunks_with_edges += 1

        self.ctx.usage.merge_from(extractor.usage)
        return {
            "chunks_processed": len(chunks),
            "chunks_with_edges": chunks_with_edges,
            "edges": total_edges,
            **extractor.usage.to_dict(),
        }

    async def _run_pass_7_cove(self) -> dict[str, Any]:
        verifier = Pass7CoVeVerifier(self.ctx.llm)
        stats = await verifier.verify_book(session=self.ctx.session, book_id=self.ctx.book_id)
        self.ctx.usage.merge_from(verifier.usage)
        return {**stats.to_dict(), **verifier.usage.to_dict()}

    async def _run_pass_8_note(self) -> dict[str, Any]:
        synth = Pass8NoteSynth(self.ctx.llm)
        stats = await synth.synthesise_all(session=self.ctx.session, book_id=self.ctx.book_id)
        self.ctx.usage.merge_from(synth.usage)
        return {**stats, **synth.usage.to_dict()}

    async def _run_pass_6_glucose(self) -> dict[str, Any]:
        chunks = await repo.list_chunks(self.ctx.session, self.ctx.book_id)
        if not chunks:
            raise RuntimeError("Pass-6 needs chunks. Run --from 1 first.")

        # Idempotent re-run: clear glucose facts from any previous Pass-6 attempt.
        await self.ctx.session.execute(
            delete(orm.GlucoseFact).where(orm.GlucoseFact.book_id == self.ctx.book_id)
        )

        extractor = Pass6GlucoseExtractor(self.ctx.llm)
        pairs = [
            (chunk, await repo.list_entities_in_chunk(self.ctx.session, chunk.id))
            for chunk in chunks
        ]
        per_chunk = await _gather_bounded(
            [extractor.extract_chunk(chunk, ents) for chunk, ents in pairs],
            _LLM_CONCURRENCY,
        )
        total_facts = 0
        chunks_with_facts = 0
        for facts_in in per_chunk:
            if facts_in:
                facts_out = await repo.insert_glucose_facts(self.ctx.session, facts_in)
                total_facts += len(facts_out)
                chunks_with_facts += 1

        self.ctx.usage.merge_from(extractor.usage)
        return {
            "chunks_processed": len(chunks),
            "chunks_with_facts": chunks_with_facts,
            "facts": total_facts,
            **extractor.usage.to_dict(),
        }


def make_llm_client_from_env() -> LLMClient:
    """Convenience constructor for CLI / scripts. Reads LOREGRAPH_LLM_PROVIDER."""
    return make_llm_client()
