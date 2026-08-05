"""add encrypted per-client provider credentials

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


ADMIN_PREDICATE = "(auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'"


def upgrade() -> None:
    op.create_table(
        "client_provider_credentials",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "client_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("encrypted_api_key", sa.Text(), nullable=False),
        sa.Column("key_hint", sa.String(length=8), nullable=False),
        sa.Column(
            "is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "validation_status",
            sa.String(length=16),
            nullable=False,
            server_default="untested",
        ),
        sa.Column("last_tested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_test_error", sa.String(length=200), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), nullable=False),
        sa.Column("updated_by", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "provider IN ('openai', 'anthropic', 'google')",
            name="ck_client_provider_credentials_provider",
        ),
        sa.CheckConstraint(
            "validation_status IN ('untested', 'valid', 'invalid')",
            name="ck_client_provider_credentials_validation_status",
        ),
        sa.UniqueConstraint(
            "client_id",
            "provider",
            name="uq_client_provider_credentials_client_provider",
        ),
    )
    op.create_index(
        "ix_client_provider_credentials_client_id",
        "client_provider_credentials",
        ["client_id"],
    )
    op.create_index(
        "ix_client_provider_credentials_enabled_client",
        "client_provider_credentials",
        ["client_id"],
        postgresql_where=sa.text("is_enabled = true"),
    )

    op.execute(
        "ALTER TABLE client_provider_credentials ENABLE ROW LEVEL SECURITY"
    )
    op.execute(
        "ALTER TABLE client_provider_credentials FORCE ROW LEVEL SECURITY"
    )
    op.execute(
        'CREATE POLICY "Agency Admin has full access to client_provider_credentials" '
        "ON client_provider_credentials FOR ALL TO authenticated "
        f"USING ({ADMIN_PREDICATE}) WITH CHECK ({ADMIN_PREDICATE})"
    )


def downgrade() -> None:
    op.drop_index(
        "ix_client_provider_credentials_enabled_client",
        table_name="client_provider_credentials",
    )
    op.drop_index(
        "ix_client_provider_credentials_client_id",
        table_name="client_provider_credentials",
    )
    op.drop_table("client_provider_credentials")
