"""SQLAlchemy 2.0 ORM schema.

Stays in lockstep with the Pydantic models in `loregraph.models`. Any
new column requires:
1. updating the Pydantic model in `loregraph/models/*`
2. adding the SQLAlchemy column here
3. shipping an Alembic migration under `migrations/versions/`
4. adding a round-trip case to `tests/integration/test_db.py`
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from loregraph.models.enums import (
    EntityType,
    GlucoseDim,
    GlucoseTime,
    InferenceDepth,
    PassStatus,
    RelationType,
)

VECTOR_DIM = 1024


class Base(DeclarativeBase):
    """Single declarative base for all ORM tables."""


# Postgres ENUM types. `create_type=False` means we DO NOT auto-create the
# enum type via the ORM; the Alembic migration owns creation/teardown.
_entity_type = ENUM(*[e.value for e in EntityType], name="entity_type", create_type=False)
_relation_type = ENUM(*[r.value for r in RelationType], name="relation_type", create_type=False)
_inference_depth = ENUM(
    *[i.value for i in InferenceDepth], name="inference_depth", create_type=False
)
_glucose_dim = ENUM(*[g.value for g in GlucoseDim], name="glucose_dim", create_type=False)
_glucose_time = ENUM(*[g.value for g in GlucoseTime], name="glucose_time", create_type=False)
_pass_status = ENUM(*[p.value for p in PassStatus], name="pass_status", create_type=False)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    language: Mapped[str] = mapped_column(Text, nullable=False, server_default="en")
    source_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    atom_id: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped[int] = mapped_column(Integer, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    char_offset_start: Mapped[int] = mapped_column(Integer, nullable=False)
    char_offset_end: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(VECTOR_DIM), nullable=True)

    __table_args__ = (
        UniqueConstraint("book_id", "atom_id", name="chunks_book_atom_uq"),
        Index("chunks_book_chapter_idx", "book_id", "chapter", "seq"),
    )


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    canonical_id: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[EntityType] = mapped_column(_entity_type, nullable=False)
    canonical_name: Mapped[str] = mapped_column(Text, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, default=list, server_default="{}"
    )
    note_md: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    embedding: Mapped[list[float] | None] = mapped_column(Vector(VECTOR_DIM), nullable=True)

    __table_args__ = (
        UniqueConstraint("book_id", "canonical_id", name="entities_book_canonical_uq"),
        Index("entities_book_type_idx", "book_id", "type"),
        Index("entities_aliases_gin", "aliases", postgresql_using="gin"),
    )


class Mention(Base):
    __tablename__ = "mentions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    chunk_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False
    )
    entity_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True
    )
    surface_form: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[EntityType] = mapped_column(_entity_type, nullable=False)
    char_start: Mapped[int] = mapped_column(Integer, nullable=False)
    char_end: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_span: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("mentions_chunk_idx", "chunk_id"),
        Index("mentions_entity_idx", "entity_id"),
    )


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    src_entity_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False
    )
    dst_entity_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False
    )
    relation: Mapped[RelationType] = mapped_column(_relation_type, nullable=False)
    chunk_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False
    )
    evidence_span: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    inference_depth: Mapped[InferenceDepth] = mapped_column(
        _inference_depth, nullable=False, server_default=InferenceDepth.EXPLICIT.value
    )
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="edges_conf_range"),
        Index("edges_src_idx", "src_entity_id"),
        Index("edges_dst_idx", "dst_entity_id"),
        Index("edges_book_rel_idx", "book_id", "relation"),
    )


class GlucoseFact(Base):
    __tablename__ = "glucose_facts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    entity_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("entities.id", ondelete="CASCADE"), nullable=False
    )
    chunk_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False
    )
    dimension: Mapped[GlucoseDim] = mapped_column(_glucose_dim, nullable=False)
    time_aspect: Mapped[GlucoseTime] = mapped_column(_glucose_time, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_span: Mapped[str] = mapped_column(Text, nullable=False)
    inference_depth: Mapped[InferenceDepth] = mapped_column(_inference_depth, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    __table_args__ = (
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="glucose_conf_range"),
        Index("glucose_entity_idx", "entity_id", "dimension", "time_aspect"),
    )


class PassRun(Base):
    __tablename__ = "pass_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    book_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    pass_num: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PassStatus] = mapped_column(_pass_status, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stats: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("pass_num BETWEEN 1 AND 7", name="pass_runs_pass_num_range"),
        UniqueConstraint("book_id", "pass_num", name="pass_runs_book_pass_uq"),
    )
