"""widen pass_runs.pass_num check 1..7 -> 1..8 for Pass-8 (Hybrid Note synth)

Revision ID: 0002_pass8_constraint
Revises: 0001_initial
Create Date: 2026-05-29
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0002_pass8_constraint"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("pass_runs_pass_num_range", "pass_runs", type_="check")
    op.create_check_constraint("pass_runs_pass_num_range", "pass_runs", "pass_num BETWEEN 1 AND 8")


def downgrade() -> None:
    op.drop_constraint("pass_runs_pass_num_range", "pass_runs", type_="check")
    op.create_check_constraint("pass_runs_pass_num_range", "pass_runs", "pass_num BETWEEN 1 AND 7")
