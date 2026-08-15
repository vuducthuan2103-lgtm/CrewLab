"""Add client-total monthly budget for usage-ledger enforcement.

Revision ID: 0017
Revises: 0016
"""

from alembic import op
import sqlalchemy as sa


revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("monthly_budget_usd", sa.Numeric(10, 2), nullable=True),
    )
    op.create_check_constraint(
        "ck_clients_monthly_budget_nonnegative",
        "clients",
        "monthly_budget_usd IS NULL OR monthly_budget_usd >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_clients_monthly_budget_nonnegative", "clients")
    op.drop_column("clients", "monthly_budget_usd")
