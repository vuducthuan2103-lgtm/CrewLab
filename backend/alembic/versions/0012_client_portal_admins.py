"""record the first Portal administrator for each client

Revision ID: 0012
Revises: 0011
Create Date: 2026-08-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


ADMIN_PREDICATE = "(auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'"


def upgrade() -> None:
    op.create_table(
        "client_portal_admins",
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
        sa.Column("auth_user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("client_id", name="uq_client_portal_admins_client_id"),
        sa.UniqueConstraint("auth_user_id", name="uq_client_portal_admins_auth_user_id"),
        sa.UniqueConstraint("email", name="uq_client_portal_admins_email"),
    )
    op.create_index(
        "ix_client_portal_admins_client_id", "client_portal_admins", ["client_id"]
    )
    op.create_index(
        "ix_client_portal_admins_auth_user_id",
        "client_portal_admins",
        ["auth_user_id"],
    )
    op.execute("ALTER TABLE client_portal_admins ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE client_portal_admins FORCE ROW LEVEL SECURITY")
    op.execute(
        'CREATE POLICY "Agency Admin has full access to client_portal_admins" '
        "ON client_portal_admins FOR ALL TO authenticated "
        f"USING ({ADMIN_PREDICATE}) WITH CHECK ({ADMIN_PREDICATE})"
    )


def downgrade() -> None:
    op.drop_index("ix_client_portal_admins_auth_user_id", table_name="client_portal_admins")
    op.drop_index("ix_client_portal_admins_client_id", table_name="client_portal_admins")
    op.drop_table("client_portal_admins")
