"""Reconcile fields missing from the pre-Alembic staging baseline.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-02

The original staging database contained the Phase 1 core tables but omitted two
columns already required by the ORM and full deployment schema.  The migration
is idempotent so it is also safe for a clean database created from an earlier
manual baseline.
"""

from alembic import op


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE brand_settings "
        "ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_brand_settings_is_current "
        "ON brand_settings (is_current)"
    )

    op.execute(
        "ALTER TABLE task_logs "
        "ADD COLUMN IF NOT EXISTS content_item_id UUID"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint "
        "WHERE conname = 'fk_task_logs_content_item_id') THEN "
        "ALTER TABLE task_logs ADD CONSTRAINT fk_task_logs_content_item_id "
        "FOREIGN KEY (content_item_id) REFERENCES content_items(id) "
        "ON DELETE SET NULL; "
        "END IF; END $$"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_task_logs_content_item_id "
        "ON task_logs (content_item_id)"
    )


def downgrade() -> None:
    op.drop_index("ix_task_logs_content_item_id", table_name="task_logs")
    op.drop_constraint("fk_task_logs_content_item_id", "task_logs", type_="foreignkey")
    op.drop_column("task_logs", "content_item_id")
    op.drop_index("ix_brand_settings_is_current", table_name="brand_settings")
    op.drop_column("brand_settings", "is_current")
