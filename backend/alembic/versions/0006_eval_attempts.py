"""Create content_item_eval_attempts table for E01 evaluation history.

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-01

Changes:
- content_item_eval_attempts: new table to store per-attempt E01 scoring history
  Fields: attempt_number, caption_score, visual_score, passed flags,
          failed_criteria JSONB, fix_instructions per agent (D01/D02)

Rationale: Each eval attempt must be stored separately (not overwritten) so that
Agency Admin can debug why an item failed 3 times — e.g. conflicting brand_voice config,
bad media library assets, or an impossible B03 brief.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_item_eval_attempts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column(
            "client_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "content_item_id",
            UUID(as_uuid=True),
            sa.ForeignKey("content_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),   # 1, 2, 3
        sa.Column("caption_score", sa.Float(), nullable=True),
        sa.Column("visual_score", sa.Float(), nullable=True),
        sa.Column("caption_passed", sa.Boolean(), nullable=True),
        sa.Column("visual_passed", sa.Boolean(), nullable=True),
        sa.Column("overall_passed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("failed_criteria", JSONB, nullable=True),           # ["brand_voice", ...]
        sa.Column("fix_instructions_caption", sa.Text(), nullable=True),  # for D01
        sa.Column("fix_instructions_visual", sa.Text(), nullable=True),   # for D02
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    # Index for fast lookup by item (most common query pattern)
    op.create_index(
        "idx_eval_attempts_item",
        "content_item_eval_attempts",
        ["content_item_id"],
    )
    op.create_index(
        "idx_eval_attempts_client",
        "content_item_eval_attempts",
        ["client_id"],
    )
    # Composite index for ordered history per item
    op.create_index(
        "idx_eval_attempts_item_num",
        "content_item_eval_attempts",
        ["content_item_id", "attempt_number"],
    )

    op.execute("ALTER TABLE content_item_eval_attempts ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY "Agency Admin has full access to content_item_eval_attempts"
        ON content_item_eval_attempts FOR ALL TO authenticated
        USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin')
        WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin')
        """
    )
    op.execute(
        """
        CREATE POLICY "Clients can only access their own content_item_eval_attempts"
        ON content_item_eval_attempts FOR ALL TO authenticated
        USING (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text)
        WITH CHECK (client_id::text = (auth.jwt() -> 'app_metadata' ->> 'client_id')::text)
        """
    )


def downgrade() -> None:
    op.execute('DROP POLICY IF EXISTS "Clients can only access their own content_item_eval_attempts" ON content_item_eval_attempts')
    op.execute('DROP POLICY IF EXISTS "Agency Admin has full access to content_item_eval_attempts" ON content_item_eval_attempts')
    op.drop_index("idx_eval_attempts_client", table_name="content_item_eval_attempts")
    op.drop_index("idx_eval_attempts_item_num", table_name="content_item_eval_attempts")
    op.drop_index("idx_eval_attempts_item", table_name="content_item_eval_attempts")
    op.drop_table("content_item_eval_attempts")
