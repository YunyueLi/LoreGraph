"""initial schema: 6 tables + 6 enum types + pgvector extension

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_VECTOR_DIM = 1024


def upgrade() -> None:
    # ---- pgvector extension ----
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ---- enum types ----
    entity_type = postgresql.ENUM(
        "Agent", "Object", "Event", "Concept", name="entity_type"
    )
    entity_type.create(op.get_bind(), checkfirst=True)

    relation_type = postgresql.ENUM(
        "STRUCTURAL", "INTERACTS", "ASSERTS", "INFLUENCES", "PREDICTS",
        name="relation_type",
    )
    relation_type.create(op.get_bind(), checkfirst=True)

    inference_depth = postgresql.ENUM(
        "explicit", "one_step", "multi_step", name="inference_depth"
    )
    inference_depth.create(op.get_bind(), checkfirst=True)

    glucose_dim = postgresql.ENUM(
        "cause", "emotion", "location", "possession", "attribute",
        name="glucose_dim",
    )
    glucose_dim.create(op.get_bind(), checkfirst=True)

    glucose_time = postgresql.ENUM("before", "after", name="glucose_time")
    glucose_time.create(op.get_bind(), checkfirst=True)

    pass_status = postgresql.ENUM(
        "pending", "running", "done", "failed", name="pass_status"
    )
    pass_status.create(op.get_bind(), checkfirst=True)

    # ---- books ----
    op.create_table(
        "books",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("author", sa.Text, nullable=False, server_default=""),
        sa.Column("language", sa.Text, nullable=False, server_default="en"),
        sa.Column("source_path", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ---- chunks ----
    op.create_table(
        "chunks",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("atom_id", sa.Text, nullable=False),
        sa.Column("chapter", sa.Integer, nullable=False),
        sa.Column("seq", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("token_count", sa.Integer, nullable=False),
        sa.Column("char_offset_start", sa.Integer, nullable=False),
        sa.Column("char_offset_end", sa.Integer, nullable=False),
        sa.Column("embedding", Vector(_VECTOR_DIM), nullable=True),
        sa.UniqueConstraint("book_id", "atom_id", name="chunks_book_atom_uq"),
    )
    op.create_index(
        "chunks_book_chapter_idx", "chunks", ["book_id", "chapter", "seq"]
    )

    # ---- entities ----
    op.create_table(
        "entities",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("canonical_id", sa.Text, nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(name="entity_type", create_type=False),
            nullable=False,
        ),
        sa.Column("canonical_name", sa.Text, nullable=False),
        sa.Column(
            "aliases",
            postgresql.ARRAY(sa.Text),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("note_md", sa.Text, nullable=False, server_default=""),
        sa.Column(
            "attributes",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column("embedding", Vector(_VECTOR_DIM), nullable=True),
        sa.UniqueConstraint(
            "book_id", "canonical_id", name="entities_book_canonical_uq"
        ),
    )
    op.create_index("entities_book_type_idx", "entities", ["book_id", "type"])
    op.create_index(
        "entities_aliases_gin",
        "entities",
        ["aliases"],
        postgresql_using="gin",
    )

    # ---- mentions ----
    op.create_table(
        "mentions",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chunk_id",
            sa.BigInteger,
            sa.ForeignKey("chunks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "entity_id",
            sa.BigInteger,
            sa.ForeignKey("entities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("surface_form", sa.Text, nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(name="entity_type", create_type=False),
            nullable=False,
        ),
        sa.Column("char_start", sa.Integer, nullable=False),
        sa.Column("char_end", sa.Integer, nullable=False),
        sa.Column("evidence_span", sa.Text, nullable=False),
    )
    op.create_index("mentions_chunk_idx", "mentions", ["chunk_id"])
    op.create_index("mentions_entity_idx", "mentions", ["entity_id"])

    # ---- edges ----
    op.create_table(
        "edges",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "src_entity_id",
            sa.BigInteger,
            sa.ForeignKey("entities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "dst_entity_id",
            sa.BigInteger,
            sa.ForeignKey("entities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "relation",
            postgresql.ENUM(name="relation_type", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "chunk_id",
            sa.BigInteger,
            sa.ForeignKey("chunks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("evidence_span", sa.Text, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column(
            "inference_depth",
            postgresql.ENUM(name="inference_depth", create_type=False),
            nullable=False,
            server_default="explicit",
        ),
        sa.Column(
            "attributes",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1", name="edges_conf_range"
        ),
    )
    op.create_index("edges_src_idx", "edges", ["src_entity_id"])
    op.create_index("edges_dst_idx", "edges", ["dst_entity_id"])
    op.create_index("edges_book_rel_idx", "edges", ["book_id", "relation"])

    # ---- glucose_facts ----
    op.create_table(
        "glucose_facts",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "entity_id",
            sa.BigInteger,
            sa.ForeignKey("entities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chunk_id",
            sa.BigInteger,
            sa.ForeignKey("chunks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "dimension",
            postgresql.ENUM(name="glucose_dim", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "time_aspect",
            postgresql.ENUM(name="glucose_time", create_type=False),
            nullable=False,
        ),
        sa.Column("statement", sa.Text, nullable=False),
        sa.Column("evidence_span", sa.Text, nullable=False),
        sa.Column(
            "inference_depth",
            postgresql.ENUM(name="inference_depth", create_type=False),
            nullable=False,
        ),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 1", name="glucose_conf_range"
        ),
    )
    op.create_index(
        "glucose_entity_idx",
        "glucose_facts",
        ["entity_id", "dimension", "time_aspect"],
    )

    # ---- pass_runs ----
    op.create_table(
        "pass_runs",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "book_id",
            sa.BigInteger,
            sa.ForeignKey("books.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pass_num", sa.Integer, nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="pass_status", create_type=False),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "stats",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column("error", sa.Text, nullable=True),
        sa.CheckConstraint(
            "pass_num BETWEEN 1 AND 7", name="pass_runs_pass_num_range"
        ),
        sa.UniqueConstraint("book_id", "pass_num", name="pass_runs_book_pass_uq"),
    )


def downgrade() -> None:
    op.drop_table("pass_runs")
    op.drop_table("glucose_facts")
    op.drop_table("edges")
    op.drop_table("mentions")
    op.drop_table("entities")
    op.drop_table("chunks")
    op.drop_table("books")

    for enum_name in (
        "pass_status",
        "glucose_time",
        "glucose_dim",
        "inference_depth",
        "relation_type",
        "entity_type",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")

    # pgvector extension left in place — other schemas may depend on it.
