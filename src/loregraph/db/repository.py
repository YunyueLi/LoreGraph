"""Async CRUD helpers — Pydantic in, Pydantic out, ORM hidden.

Every pass writes through these functions; never reach into `db.schema`
from `pipeline/` modules.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from loregraph.db import schema as orm
from loregraph.models.atoms import Book, BookCreate, Chunk, ChunkCreate
from loregraph.models.edges import Edge, EdgeCreate
from loregraph.models.entities import Entity, EntityCreate, Mention, MentionCreate
from loregraph.models.glucose import GlucoseFact, GlucoseFactCreate
from loregraph.models.runs import PassRun, PassRunCreate

# ---------- Book ----------


async def create_book(session: AsyncSession, data: BookCreate) -> Book:
    row = orm.Book(**data.model_dump())
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return Book.model_validate(row)


async def get_book(session: AsyncSession, book_id: int) -> Book | None:
    row = await session.get(orm.Book, book_id)
    return Book.model_validate(row) if row else None


# ---------- Chunk ----------


async def insert_chunks(session: AsyncSession, chunks: Sequence[ChunkCreate]) -> list[Chunk]:
    rows = [orm.Chunk(**c.model_dump()) for c in chunks]
    session.add_all(rows)
    await session.flush()
    for r in rows:
        await session.refresh(r)
    return [Chunk.model_validate(r) for r in rows]


async def list_chunks(session: AsyncSession, book_id: int) -> list[Chunk]:
    stmt = (
        select(orm.Chunk)
        .where(orm.Chunk.book_id == book_id)
        .order_by(orm.Chunk.chapter, orm.Chunk.seq)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [Chunk.model_validate(r) for r in rows]


# ---------- Mention ----------


async def insert_mentions(
    session: AsyncSession, mentions: Sequence[MentionCreate]
) -> list[Mention]:
    rows = [orm.Mention(**m.model_dump()) for m in mentions]
    session.add_all(rows)
    await session.flush()
    for r in rows:
        await session.refresh(r)
    return [Mention.model_validate(r) for r in rows]


async def list_mentions(session: AsyncSession, book_id: int) -> list[Mention]:
    stmt = select(orm.Mention).where(orm.Mention.book_id == book_id).order_by(orm.Mention.id)
    rows = (await session.execute(stmt)).scalars().all()
    return [Mention.model_validate(r) for r in rows]


async def assign_mention_entity(session: AsyncSession, mention_id: int, entity_id: int) -> None:
    """Pass-4 hook: bind a mention to its canonical entity."""
    await session.execute(
        update(orm.Mention).where(orm.Mention.id == mention_id).values(entity_id=entity_id)
    )


# ---------- Entity ----------


async def insert_entities(session: AsyncSession, entities: Sequence[EntityCreate]) -> list[Entity]:
    rows = [orm.Entity(**e.model_dump()) for e in entities]
    session.add_all(rows)
    await session.flush()
    for r in rows:
        await session.refresh(r)
    return [Entity.model_validate(r) for r in rows]


async def list_entities(session: AsyncSession, book_id: int) -> list[Entity]:
    stmt = select(orm.Entity).where(orm.Entity.book_id == book_id).order_by(orm.Entity.id)
    rows = (await session.execute(stmt)).scalars().all()
    return [Entity.model_validate(r) for r in rows]


async def list_entities_in_chunk(session: AsyncSession, chunk_id: int) -> list[Entity]:
    """Entities that have at least one mention inside `chunk_id` after Pass-4."""
    stmt = (
        select(orm.Entity)
        .join(orm.Mention, orm.Mention.entity_id == orm.Entity.id)
        .where(orm.Mention.chunk_id == chunk_id)
        .distinct()
        .order_by(orm.Entity.id)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [Entity.model_validate(r) for r in rows]


# ---------- Edge ----------


async def insert_edges(session: AsyncSession, edges: Sequence[EdgeCreate]) -> list[Edge]:
    rows = [orm.Edge(**e.model_dump()) for e in edges]
    session.add_all(rows)
    await session.flush()
    for r in rows:
        await session.refresh(r)
    return [Edge.model_validate(r) for r in rows]


# ---------- GlucoseFact ----------


async def insert_glucose_facts(
    session: AsyncSession, facts: Sequence[GlucoseFactCreate]
) -> list[GlucoseFact]:
    rows = [orm.GlucoseFact(**f.model_dump()) for f in facts]
    session.add_all(rows)
    await session.flush()
    for r in rows:
        await session.refresh(r)
    return [GlucoseFact.model_validate(r) for r in rows]


# ---------- PassRun ----------


async def upsert_pass_run(session: AsyncSession, data: PassRunCreate) -> PassRun:
    row = orm.PassRun(**data.model_dump())
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return PassRun.model_validate(row)


async def list_pass_runs(session: AsyncSession, book_id: int) -> list[PassRun]:
    stmt = select(orm.PassRun).where(orm.PassRun.book_id == book_id).order_by(orm.PassRun.pass_num)
    rows = (await session.execute(stmt)).scalars().all()
    return [PassRun.model_validate(r) for r in rows]
