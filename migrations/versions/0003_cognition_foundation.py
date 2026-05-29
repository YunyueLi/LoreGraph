"""cognition foundation: story-time + dedup on edges/facts, community tables,
populate-ready embeddings, pass_runs 1..10 (reconcile=8, community=9, note=10).

Additive only — every new column is nullable or defaulted, so this is safe to
apply while older rows exist. Backfill (story_pos, embeddings) happens in the
re-extraction, not here.

Revision ID: 0003_cognition_foundation
Revises: 0002_pass8_constraint
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0003_cognition_foundation"
down_revision: str | None = "0002_pass8_constraint"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_VECTOR_DIM = 1024


def upgrade() -> None:
    # ---- chunks: story-time coordinate + incremental hash ----
    op.add_column("chunks", sa.Column("story_pos", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("chunks", sa.Column("content_hash", sa.Text(), nullable=True))

    # ---- edges: narrative-temporal + dedup grouping ----
    op.add_column("edges", sa.Column("valid_from_pos", sa.Integer(), nullable=True))
    op.add_column("edges", sa.Column("invalid_from_pos", sa.Integer(), nullable=True))
    op.add_column("edges", sa.Column("superseded_by_edge_id", sa.BigInteger(), nullable=True))
    op.add_column("edges", sa.Column("canonical_edge_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "edges_superseded_by_fk", "edges", "edges",
        ["superseded_by_edge_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "edges_canonical_fk", "edges", "edges",
        ["canonical_edge_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("edges_canonical_idx", "edges", ["canonical_edge_id"])

    # ---- glucose_facts: story-time + dedup ----
    op.add_column("glucose_facts", sa.Column("valid_from_pos", sa.Integer(), nullable=True))
    op.add_column("glucose_facts", sa.Column("canonical_fact_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "glucose_canonical_fk", "glucose_facts", "glucose_facts",
        ["canonical_fact_id"], ["id"], ondelete="SET NULL",
    )

    # ---- communities (Pass-9) ----
    op.create_table(
        "communities",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("book_id", sa.BigInteger(), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("parent_id", sa.BigInteger(), sa.ForeignKey("communities.id", ondelete="SET NULL"), nullable=True),
        sa.Column("label", sa.Text(), nullable=False, server_default=""),
        sa.Column("summary_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attributes", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("embedding", Vector(_VECTOR_DIM), nullable=True),
    )
    op.create_index("communities_book_level_idx", "communities", ["book_id", "level"])

    op.create_table(
        "community_members",
        sa.Column("community_id", sa.BigInteger(), sa.ForeignKey("communities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("entity_id", sa.BigInteger(), sa.ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_index("community_members_entity_idx", "community_members", ["entity_id"])

    # ---- pass_runs: widen 1..8 -> 1..10 ----
    op.drop_constraint("pass_runs_pass_num_range", "pass_runs", type_="check")
    op.create_check_constraint("pass_runs_pass_num_range", "pass_runs", "pass_num BETWEEN 1 AND 10")


def downgrade() -> None:
    op.drop_constraint("pass_runs_pass_num_range", "pass_runs", type_="check")
    op.create_check_constraint("pass_runs_pass_num_range", "pass_runs", "pass_num BETWEEN 1 AND 8")

    op.drop_index("community_members_entity_idx", table_name="community_members")
    op.drop_table("community_members")
    op.drop_index("communities_book_level_idx", table_name="communities")
    op.drop_table("communities")

    op.drop_constraint("glucose_canonical_fk", "glucose_facts", type_="foreignkey")
    op.drop_column("glucose_facts", "canonical_fact_id")
    op.drop_column("glucose_facts", "valid_from_pos")

    op.drop_index("edges_canonical_idx", table_name="edges")
    op.drop_constraint("edges_canonical_fk", "edges", type_="foreignkey")
    op.drop_constraint("edges_superseded_by_fk", "edges", type_="foreignkey")
    op.drop_column("edges", "canonical_edge_id")
    op.drop_column("edges", "superseded_by_edge_id")
    op.drop_column("edges", "invalid_from_pos")
    op.drop_column("edges", "valid_from_pos")

    op.drop_column("chunks", "content_hash")
    op.drop_column("chunks", "story_pos")
