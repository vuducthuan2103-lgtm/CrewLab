"""add DeepSeek to the per-client provider catalog

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-05
"""

from alembic import op


revision = "0011"
down_revision = "0010"
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
        "provider IN ('openai', 'anthropic', 'google', 'deepseek')",
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
        "provider IN ('openai', 'anthropic', 'google')",
    )
