"""Integration test fixtures — Postgres via testcontainers.

A fresh SQLAlchemy engine is created per test so that every async resource
lives on the test's own event loop. The Postgres container, however, is
session-scoped — the schema is bootstrapped once and tables are truncated
between tests for isolation. This trades a small engine-init cost per test
for full event-loop safety.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from testcontainers.postgres import PostgresContainer

from loregraph.db.engine import (
    get_session_factory,
    init_engine,
    reset_engine,
)
from loregraph.db.schema import Base

_ENUMS: list[tuple[str, list[str]]] = [
    ("entity_type", ["Agent", "Object", "Event", "Concept"]),
    ("relation_type", ["STRUCTURAL", "INTERACTS", "ASSERTS", "INFLUENCES", "PREDICTS"]),
    ("inference_depth", ["explicit", "one_step", "multi_step"]),
    ("glucose_dim", ["cause", "emotion", "location", "possession", "attribute"]),
    ("glucose_time", ["before", "after"]),
    ("pass_status", ["pending", "running", "done", "failed"]),
]

_TABLES_IN_TRUNCATE_ORDER = [
    "pass_runs",
    "glucose_facts",
    "edges",
    "mentions",
    "entities",
    "chunks",
    "books",
]


@pytest.fixture(scope="session")
def pg_container() -> PostgresContainer:
    """Spin up a pgvector-enabled Postgres for the test session."""
    container = PostgresContainer(
        image="pgvector/pgvector:pg17",
        username="lg_test",
        password="lg_test",
        dbname="lg_test",
        driver="asyncpg",
    )
    container.start()
    try:
        yield container
    finally:
        container.stop()


@pytest_asyncio.fixture
async def session(pg_container: PostgresContainer) -> AsyncIterator[AsyncSession]:
    """Per-test session:

    * resets the engine singleton so the new engine binds to *this* test's
      event loop;
    * idempotently installs the vector extension, enum types, and tables;
    * truncates all tables for isolation;
    * yields a session that is rolled back at teardown.
    """
    os.environ["DATABASE_URL"] = pg_container.get_connection_url()
    os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")

    await reset_engine()
    engine = init_engine()

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        for name, values in _ENUMS:
            quoted_values = ", ".join(f"'{v}'" for v in values)
            await conn.execute(
                text(
                    f"DO $$ BEGIN "
                    f"CREATE TYPE {name} AS ENUM ({quoted_values}); "
                    f"EXCEPTION WHEN duplicate_object THEN null; END $$;"
                )
            )
        await conn.run_sync(Base.metadata.create_all)

    async with engine.begin() as conn:
        truncate_list = ", ".join(_TABLES_IN_TRUNCATE_ORDER)
        await conn.execute(text(f"TRUNCATE {truncate_list} RESTART IDENTITY CASCADE"))

    factory = get_session_factory()
    async with factory() as s:
        try:
            yield s
        finally:
            await s.rollback()

    await reset_engine()
