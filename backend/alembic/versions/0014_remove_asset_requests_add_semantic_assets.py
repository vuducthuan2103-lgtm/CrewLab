"""Remove Asset Request workflow and add client-isolated semantic asset records.

Revision ID: 0014
Revises: 0013
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Supabase installs extensions in the dedicated `extensions` schema. Do
    # not pin an extension version; the platform now manages the safe default.
    op.execute("CREATE SCHEMA IF NOT EXISTS extensions")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions")
    op.execute("""
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'brand-assets', 'brand-assets', false, 52428800,
            ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
        )
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types
    """)
    # Supabase protects direct DELETEs on storage catalog tables. Any obsolete
    # bucket must be removed through the Storage API after its objects are
    # deleted; the active bucket remains `brand-assets`.
    # Historical Asset Requests have no live rows. Drop the dependent column
    # first, then the orphaned feature table and obsolete FSM states.
    op.execute("ALTER TABLE brand_assets DROP CONSTRAINT IF EXISTS brand_assets_asset_request_id_fkey")
    op.execute("DROP INDEX IF EXISTS ix_brand_assets_asset_request_id")
    op.execute("ALTER TABLE brand_assets DROP COLUMN IF EXISTS asset_request_id")
    op.execute("DROP TABLE IF EXISTS asset_requests")

    op.execute("UPDATE content_items SET status = 'visual_matching' WHERE status IN ('waiting_asset', 'asset_blocked')")
    op.execute("ALTER TABLE content_items DROP CONSTRAINT IF EXISTS ck_content_items_status")
    op.create_check_constraint(
        "ck_content_items_status",
        "content_items",
        "status IN ('planned', 'ready_for_generation', 'caption_generating', 'visual_matching', "
        "'visual_generating', 'evaluating', 'eval_failed', 'pending_content_approval', "
        "'approved_ready_to_post', 'posted', 'rejected', 'archived')",
    )
    op.add_column("brand_assets", sa.Column("content_sha256", sa.String(length=64), nullable=True))
    op.create_index("ix_brand_assets_content_sha256", "brand_assets", ["content_sha256"], unique=False)
    op.execute("ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS source_asset_id UUID")
    op.execute("ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS generation_mode TEXT")
    op.execute("ALTER TABLE brand_assets DROP CONSTRAINT IF EXISTS brand_assets_source_asset_id_fkey")
    op.execute("ALTER TABLE brand_assets ADD CONSTRAINT brand_assets_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES brand_assets(id) ON DELETE SET NULL")
    op.execute("""
        CREATE UNIQUE INDEX uq_brand_assets_client_source_fingerprint
        ON brand_assets (client_id, content_sha256)
        WHERE content_sha256 IS NOT NULL AND source_asset_id IS NULL
          AND source IN ('client_uploaded', 'real_photo', 'portal')
    """)

    op.create_table(
        "semantic_asset_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_asset_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("brand_assets.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("status", sa.String(), nullable=False, server_default="processing"),
        sa.Column("content_fingerprint", sa.String(length=64), nullable=True),
        sa.Column("analysis_version", sa.String(), nullable=False, server_default="v1"),
        sa.Column("embedding_version", sa.String(), nullable=True),
        sa.Column("search_text", sa.Text(), nullable=True),
        sa.Column("semantic_summary", sa.Text(), nullable=True),
        sa.Column("primary_subjects", postgresql.JSONB(), nullable=True),
        sa.Column("secondary_subjects", postgresql.JSONB(), nullable=True),
        sa.Column("setting", postgresql.JSONB(), nullable=True),
        sa.Column("actions", postgresql.JSONB(), nullable=True),
        sa.Column("composition", postgresql.JSONB(), nullable=True),
        sa.Column("mood_lighting", postgresql.JSONB(), nullable=True),
        sa.Column("text_safe_areas", postgresql.JSONB(), nullable=True),
        sa.Column("visible_text", postgresql.JSONB(), nullable=True),
        sa.Column("suggested_tags", postgresql.JSONB(), nullable=True),
        sa.Column("technical_quality", postgresql.JSONB(), nullable=True),
        sa.Column("editability", postgresql.JSONB(), nullable=True),
        sa.Column("safety", postgresql.JSONB(), nullable=True),
        sa.Column("confidence", postgresql.JSONB(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        "ALTER TABLE semantic_asset_records "
        "ADD COLUMN embedding extensions.vector(1536)"
    )
    op.create_check_constraint(
        "ck_semantic_asset_records_status",
        "semantic_asset_records",
        "status IN ('processing', 'ready', 'needs_attention', 'failed', 'superseded')",
    )
    op.create_index("ix_semantic_asset_records_client_id", "semantic_asset_records", ["client_id"])
    # `unique=True` on source_asset_id already creates the required unique
    # index; adding another one triggers Supabase's duplicate-index advisor.
    op.create_index("ix_semantic_asset_records_status", "semantic_asset_records", ["status"])
    op.create_index("ix_semantic_asset_records_content_fingerprint", "semantic_asset_records", ["content_fingerprint"])
    op.create_index(
        "ix_semantic_asset_records_client_status",
        "semantic_asset_records",
        ["client_id", "status"],
    )
    op.execute("""
        CREATE INDEX ix_semantic_asset_records_embedding_hnsw
        ON semantic_asset_records
        USING hnsw (embedding extensions.vector_cosine_ops)
        WHERE status = 'ready'
    """)
    op.execute("ALTER TABLE semantic_asset_records ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY \"Agency Admin has full access to semantic_asset_records\"
        ON semantic_asset_records FOR ALL TO authenticated
        USING ((((select auth.jwt()) -> 'app_metadata' ->> 'role')::text) = 'agency_admin')
        WITH CHECK ((((select auth.jwt()) -> 'app_metadata' ->> 'role')::text) = 'agency_admin')
    """)
    op.execute("""
        CREATE POLICY \"Clients can view their own semantic_asset_records\"
        ON semantic_asset_records FOR SELECT TO authenticated
        USING (client_id::text = ((select auth.jwt()) -> 'app_metadata' ->> 'client_id')::text)
    """)


def downgrade() -> None:
    op.drop_table("semantic_asset_records")
    op.drop_index("uq_brand_assets_client_source_fingerprint", table_name="brand_assets")
    op.drop_index("ix_brand_assets_content_sha256", table_name="brand_assets")
    op.drop_column("brand_assets", "content_sha256")
    # Recreating removed Asset Request data is intentionally unsupported.
    raise NotImplementedError("Asset Request removal cannot be safely downgraded")
