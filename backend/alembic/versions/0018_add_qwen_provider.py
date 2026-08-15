"""add Qwen to the per-client provider catalog

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-15
"""

from alembic import op


revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_client_provider_credentials_provider",
        "client_provider_credentials",
        type_="check",
    )
    op.create_check_constraint(
        "ck_client_provider_credentials_provider",
        "client_provider_credentials",
        "provider IN ('openai', 'anthropic', 'google', 'deepseek', 'qwen')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_client_provider_credentials_provider",
        "client_provider_credentials",
        type_="check",
    )
    op.create_check_constraint(
        "ck_client_provider_credentials_provider",
        "client_provider_credentials",
        "provider IN ('openai', 'anthropic', 'google', 'deepseek')",
    )
