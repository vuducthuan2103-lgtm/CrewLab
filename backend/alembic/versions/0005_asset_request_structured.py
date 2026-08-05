"""Add structured fields to asset_requests and allow_ai_images to brand_settings.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-01

Changes:
- asset_requests: + shot_list JSONB, reference_tags JSONB, example_asset_ids JSONB
- brand_settings: + allow_ai_images BOOLEAN DEFAULT false
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # asset_requests: add structured fields for D02 to create rich asset requests
    op.execute("ALTER TABLE asset_requests ADD COLUMN IF NOT EXISTS shot_list JSONB")
    op.execute("ALTER TABLE asset_requests ADD COLUMN IF NOT EXISTS reference_tags JSONB")
    op.execute("ALTER TABLE asset_requests ADD COLUMN IF NOT EXISTS example_asset_ids JSONB")

    # brand_settings: allow_ai_images flag — default false (real photos always first)
    op.execute(
        "ALTER TABLE brand_settings ADD COLUMN IF NOT EXISTS allow_ai_images BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.drop_column("brand_settings", "allow_ai_images")
    op.drop_column("asset_requests", "example_asset_ids")
    op.drop_column("asset_requests", "reference_tags")
    op.drop_column("asset_requests", "shot_list")
