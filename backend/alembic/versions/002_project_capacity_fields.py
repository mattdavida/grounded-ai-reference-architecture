"""Add FTE demand and overallocation for capacity planning.

Revision ID: 002_capacity
Revises: 001_initial
Create Date: 2026-08-04

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "002_capacity"
down_revision: Union[str, Sequence[str], None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("fte_demand", sa.Float(), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column(
            "overallocation",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "overallocation")
    op.drop_column("projects", "fte_demand")
