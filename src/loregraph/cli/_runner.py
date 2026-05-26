"""Async runners called by Typer subcommands. Kept separate so CLI
dispatching stays trivial and the async logic is easy to test directly.
"""

from __future__ import annotations

from pathlib import Path

from loregraph.db import init_engine, session_scope
from loregraph.db import repository as repo
from loregraph.llm.client import LLMClient, make_llm_client
from loregraph.models.atoms import BookCreate
from loregraph.models.runs import PassRun
from loregraph.pipeline.context import PipelineContext
from loregraph.pipeline.orchestrator import Orchestrator


async def run_ingest(*, path: Path, title: str, author: str, language: str) -> int:
    """Register a new book; returns its book_id."""
    init_engine()
    async with session_scope() as session:
        book = await repo.create_book(
            session,
            BookCreate(
                title=title,
                author=author,
                language=language,
                source_path=str(path),
            ),
        )
    return book.id


async def run_extract(*, book_id: int, from_pass: int, to_pass: int) -> None:
    """Run a contiguous pass range against an already-ingested book."""
    init_engine()
    # LLM client only constructed if a pass needs it (Pass-2+). The orchestrator
    # is permitted to receive a not-yet-ready client and lazy-init at first use.
    llm: LLMClient | None = None
    if to_pass >= 2:
        llm = make_llm_client()
    async with session_scope() as session:
        ctx = PipelineContext(
            book_id=book_id,
            session=session,
            llm=llm,  # type: ignore[arg-type]  # only None when to_pass < 2
        )
        orchestrator = Orchestrator(ctx)
        await orchestrator.run(from_pass=from_pass, to_pass=to_pass)


async def run_status(*, book_id: int) -> list[PassRun]:
    init_engine()
    async with session_scope() as session:
        return await repo.list_pass_runs(session, book_id)
