"""Require a source URL for every brand asset.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-02

Brand assets must be addressable either by their source URL or by a storage URL
materialized into this field. This restores the Phase 1 invariant after the
legacy staging baseline allowed NULL values.
"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "brand_assets",
        "url",
        existing_type=sa.String(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "brand_assets",
        "url",
        existing_type=sa.String(),
        nullable=True,
    )
