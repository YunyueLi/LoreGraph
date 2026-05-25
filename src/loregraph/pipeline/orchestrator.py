"""Pipeline orchestrator.

Owns the lifecycle of a single book through some range of passes. Tracks
each run in `pass_runs`, exposes cost / token statistics, and enforces a
per-book LLM spend ceiling.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient
from loregraph.models.enums import PassStatus
from loregraph.models.runs import PassRunCreate
from loregraph.pipeline.context import PipelineContext
from loregraph.pipeline.pass1_chunk import ChunkerConfig, Pass1Chunker
from loregraph.pipeline.pass2_entity import Pass2EntityExtractor
from loregraph.pipeline.pass3_cluster import Pass3Clusterer
from loregraph.pipeline.pass4_coref import Pass4CorefResolver

log = logging.getLogger(__name__)

MAX_PASS_NUM_V0_1 = 4  # v0.1 ships Pass-1..Pass-4. Later passes raise.


class Orchestrator:
    """Run a contiguous range of passes against a book."""

    def __init__(self, ctx: PipelineContext) -> None:
        self.ctx = ctx

    async def run(self, *, from_pass: int = 1, to_pass: int = MAX_PASS_NUM_V0_1) -> None:
        if from_pass < 1 or to_pass < from_pass:
            raise ValueError(f"invalid pass range [{from_pass}, {to_pass}]")
        if to_pass > MAX_PASS_NUM_V0_1:
            raise NotImplementedError(
                f"Pass-{to_pass} is not implemented yet (v0.1 ships only "
                f"Pass-1 and Pass-2). Lower --to or wait for the next release."
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
            }[pass_num]()
        except Exception as exc:
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
        log.info("Pass-%d done in %.1fs", pass_num, (finished - started).total_seconds())

    async def _run_pass_1_chunk(self) -> dict:
        book = await repo.get_book(self.ctx.session, self.ctx.book_id)
        if book is None or book.source_path is None:
            raise RuntimeError(
                f"book_id={self.ctx.book_id} has no source_path; "
                "re-run `loregraph ingest` to populate it."
            )

        with open(book.source_path, encoding="utf-8") as f:
            text = f.read()

        chunker = Pass1Chunker(ChunkerConfig())
        chunks_in = chunker.chunk(book_id=self.ctx.book_id, text=text)
        chunks_out = await repo.insert_chunks(self.ctx.session, chunks_in)

        return {"chunks": len(chunks_out)}

    async def _run_pass_2_entity(self) -> dict:
        chunks = await repo.list_chunks(self.ctx.session, self.ctx.book_id)
        if not chunks:
            raise RuntimeError("Pass-2 needs chunks from Pass-1. Run with --from 1 first.")

        extractor = Pass2EntityExtractor(self.ctx.llm)
        all_mentions = []
        for chunk in chunks:
            mentions = await extractor.extract_chunk(chunk)
            all_mentions.extend(await repo.insert_mentions(self.ctx.session, mentions))

        self.ctx.usage.merge_from(extractor.usage)

        return {
            "chunks_processed": len(chunks),
            "mentions": len(all_mentions),
            **extractor.usage.to_dict(),
        }

    async def _run_pass_3_cluster(self) -> dict:
        mentions = await repo.list_mentions(self.ctx.session, self.ctx.book_id)
        if not mentions:
            raise RuntimeError("Pass-3 needs mentions from Pass-2. Run --from 2 first.")

        clusterer = Pass3Clusterer(self.ctx.llm)
        entities_in = await clusterer.cluster_book(book_id=self.ctx.book_id, mentions=mentions)
        entities_out = await repo.insert_entities(self.ctx.session, entities_in)

        self.ctx.usage.merge_from(clusterer.usage)

        return {
            "mentions_seen": len(mentions),
            "entities_created": len(entities_out),
            **clusterer.usage.to_dict(),
        }

    async def _run_pass_4_coref(self) -> dict:
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


def make_llm_client_from_env() -> LLMClient:
    """Convenience constructor for CLI / scripts."""
    return LLMClient()
