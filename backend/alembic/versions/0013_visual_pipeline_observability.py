"""Add structured task-failure fields for the visual pipeline.

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa


revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Wake reasons include workflow events and recovery causes; a static four-
    # value constraint makes new observable paths fail to log.
    op.execute("ALTER TABLE task_logs DROP CONSTRAINT IF EXISTS ck_task_logs_wake_reason")
    op.add_column("task_logs", sa.Column("error_code", sa.String(), nullable=True))
    op.add_column("task_logs", sa.Column("error_provider", sa.String(), nullable=True))
    op.add_column("task_logs", sa.Column("provider_request_id", sa.String(), nullable=True))
    op.add_column("task_logs", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("task_logs", sa.Column("error_retryable", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("task_logs", "error_retryable")
    op.drop_column("task_logs", "error_message")
    op.drop_column("task_logs", "provider_request_id")
    op.drop_column("task_logs", "error_provider")
    op.drop_column("task_logs", "error_code")
    op.create_check_constraint(
        "ck_task_logs_wake_reason",
        "task_logs",
        "wake_reason IN ('scheduled', 'task_assigned', 'manual', 'retry')",
    )
