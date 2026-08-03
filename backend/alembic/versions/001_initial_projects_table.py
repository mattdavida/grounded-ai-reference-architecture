"""initial projects table

Revision ID: 001_initial
Revises:
Create Date: 2026-08-03

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("portfolio_id", sa.String(length=50), nullable=False),
        sa.Column("parent_id", sa.String(length=50), nullable=True),
        sa.Column("row_type", sa.Enum("Parent", "Sub-phase", name="rowtype"), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column("area", sa.String(length=100), nullable=True),
        sa.Column("owner", sa.String(length=100), nullable=True),
        sa.Column("priority", sa.String(length=50), nullable=True),
        sa.Column("rag_status", sa.String(length=20), nullable=True),
        sa.Column("project_status", sa.String(length=50), nullable=True),
        sa.Column("risk_level", sa.String(length=50), nullable=True),
        sa.Column("completion_pct", sa.Float(), nullable=True),
        sa.Column("executive_comment", sa.Text(), nullable=True),
        sa.Column("approved_budget", sa.Float(), nullable=True),
        sa.Column("projected_final_cost", sa.Float(), nullable=True),
        sa.Column("budget_spent", sa.Float(), nullable=True),
        sa.Column("budget_variance", sa.Float(), nullable=True),
        sa.Column("planned_start", sa.Date(), nullable=True),
        sa.Column("planned_finish", sa.Date(), nullable=True),
        sa.Column("last_update", sa.Date(), nullable=True),
        sa.Column("is_archived", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["projects.portfolio_id"]),
        sa.PrimaryKeyConstraint("portfolio_id"),
    )


def downgrade() -> None:
    op.drop_table("projects")
