"""Add immutable asset replacement lineage and append-only D02 decisions.

Revision ID: 0015
Revises: 0014
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "brand_assets",
        sa.Column("replaces_asset_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "brand_assets_replaces_asset_id_fkey",
        "brand_assets",
        "brand_assets",
        ["replaces_asset_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_brand_assets_replaces_asset_id",
        "brand_assets",
        ["replaces_asset_id"],
        unique=False,
    )

    op.create_table(
        "visual_selection_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_number", sa.Integer(), nullable=False),
        sa.Column("wake_reason", sa.String(), nullable=False),
        sa.Column("source_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("brand_assets.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("derivative_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("brand_assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("generation_mode", sa.String(), nullable=False),
        sa.Column("selection_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("selection_rationale", sa.Text(), nullable=True),
        sa.Column("candidates", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("eligibility_exclusions", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("prompt_summary", sa.Text(), nullable=True),
        sa.Column("technical_validation", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("content_item_id", "run_number", name="uq_visual_decision_item_run"),
    )
    op.create_index("ix_visual_selection_decisions_client_id", "visual_selection_decisions", ["client_id"])
    op.create_index("ix_visual_selection_decisions_content_item_id", "visual_selection_decisions", ["content_item_id"])
    op.create_index("ix_visual_selection_decisions_source_asset_id", "visual_selection_decisions", ["source_asset_id"])
    op.create_index("ix_visual_selection_decisions_derivative_asset_id", "visual_selection_decisions", ["derivative_asset_id"])
    op.execute("ALTER TABLE visual_selection_decisions ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "Agency Admin has full access to visual_selection_decisions"
        ON visual_selection_decisions FOR ALL TO authenticated
        USING ((((select auth.jwt()) -> 'app_metadata' ->> 'role')::text) = 'agency_admin')
        WITH CHECK ((((select auth.jwt()) -> 'app_metadata' ->> 'role')::text) = 'agency_admin')
    """)
    op.execute("""
        CREATE POLICY "Clients can view their own visual_selection_decisions"
        ON visual_selection_decisions FOR SELECT TO authenticated
        USING (client_id::text = ((select auth.jwt()) -> 'app_metadata' ->> 'client_id')::text)
    """)


def downgrade() -> None:
    op.drop_table("visual_selection_decisions")
    op.drop_index("ix_brand_assets_replaces_asset_id", table_name="brand_assets")
    op.drop_constraint("brand_assets_replaces_asset_id_fkey", "brand_assets", type_="foreignkey")
    op.drop_column("brand_assets", "replaces_asset_id")
