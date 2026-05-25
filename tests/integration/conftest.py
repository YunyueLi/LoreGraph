"""Integration test fixtures — Postgres via testcontainers."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from testcontainers.postgres import PostgresContainer

from loregraph.db.engine import init_engine, reset_engine, session_scope
from loregraph.db.schema import Base


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
    yield container
    container.stop()


@pytest_asyncio.fixture(scope="session")
async def engine_setup(pg_container: PostgresContainer) -> AsyncIterator[None]:
    """Initialise the engine + create all tables. Session-scoped."""
    os.environ["DATABASE_URL"] = pg_container.get_connection_url()
    os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test")

    # Fresh import-time settings — clear any cached singletons.
    await reset_engine()
    engine = init_engine()

    # CREATE EXTENSION before any Vector column is referenced.
    async with engine.begin() as conn:
        from sqlalchemy import text

        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Enums + tables come from the ORM metadata; we skip Alembic here for
        # speed, and have a separate test that runs alembic upgrade head.
        for enum in (
            "CREATE TYPE entity_type AS ENUM ('Agent','Object','Event','Concept')",
            "CREATE TYPE relation_type AS ENUM "
            "('STRUCTURAL','INTERACTS','ASSERTS','INFLUENCES','PREDICTS')",
            "CREATE TYPE inference_depth AS ENUM ('explicit','one_step','multi_step')",
            "CREATE TYPE glucose_dim AS ENUM "
            "('cause','emotion','location','possession','attribute')",
            "CREATE TYPE glucose_time AS ENUM ('before','after')",
            "CREATE TYPE pass_status AS ENUM ('pending','running','done','failed')",
        ):
            await conn.execute(text(enum))
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await reset_engine()


@pytest_asyncio.fixture
async def session(engine_setup: None) -> AsyncIterator[AsyncSession]:
    """Per-test session that rolls back at the end for isolation."""
    async with session_scope() as s:
        yield s
        await s.rollback()
