"""Add structured fields to asset_requests and allow_ai_images to brand_settings.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-01

Changes:
- asset_requests: + shot_list JSONB, reference_tags JSONB, example_asset_ids JSONB
- brand_settings: + allow_ai_images BOOLEAN DEFAULT false
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # asset_requests: add structured fields for D02 to create rich asset requests
    op.add_column("asset_requests", sa.Column("shot_list", JSONB, nullable=True))
    op.add_column("asset_requests", sa.Column("reference_tags", JSONB, nullable=True))
    op.add_column("asset_requests", sa.Column("example_asset_ids", JSONB, nullable=True))

    # brand_settings: allow_ai_images flag — default false (real photos always first)
    op.add_column(
        "brand_settings",
        sa.Column("allow_ai_images", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("brand_settings", "allow_ai_images")
    op.drop_column("asset_requests", "example_asset_ids")
    op.drop_column("asset_requests", "reference_tags")
    op.drop_column("asset_requests", "shot_list")
