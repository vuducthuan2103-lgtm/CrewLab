"""Harden tenant RLS policies for Supabase JWT app metadata.

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-02

Legacy policies used editable profile metadata and top-level tenant claims.
CrewLab authorizes users from immutable app metadata, so all public-table
policies are reconciled to that claim and restricted to authenticated users.
"""

from alembic import op


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


ADMIN_PREDICATE = "(auth.jwt() -> 'app_metadata' ->> 'role') = 'agency_admin'"
CLIENT_ID_CLAIM = "(auth.jwt() -> 'app_metadata' ->> 'client_id')"

TENANT_TABLES = (
    "clients",
    "brand_settings",
    "brand_settings_history",
    "workflow_cycles",
    "content_pillars",
    "content_items",
    "brand_assets",
    "asset_requests",
    "hitl_reviews",
    "agent_memory",
    "task_logs",
    "audit_log",
    "client_llm_configs",
    "content_item_eval_attempts",
)


def _admin_policy_name(table: str) -> str:
    return f"Agency Admin has full access to {table}"


def _client_policy_name(table: str) -> str:
    return f"Clients can only access their own {table}"


def _reconcile_tenant_table(table: str) -> None:
    tenant_column = "id" if table == "clients" else "client_id"
    tenant_predicate = f"{tenant_column}::text = {CLIENT_ID_CLAIM}"
    admin_policy = _admin_policy_name(table)
    client_policy = _client_policy_name(table)

    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f'DROP POLICY IF EXISTS "{admin_policy}" ON {table}')
    op.execute(f'DROP POLICY IF EXISTS "{client_policy}" ON {table}')
    op.execute(
        f'CREATE POLICY "{admin_policy}" ON {table} FOR ALL TO authenticated '
        f"USING ({ADMIN_PREDICATE}) WITH CHECK ({ADMIN_PREDICATE})"
    )
    op.execute(
        f'CREATE POLICY "{client_policy}" ON {table} FOR ALL TO authenticated '
        f"USING ({tenant_predicate}) WITH CHECK ({tenant_predicate})"
    )


def upgrade() -> None:
    for table in TENANT_TABLES:
        _reconcile_tenant_table(table)

    table = "content_item_state_logs"
    admin_policy = _admin_policy_name(table)
    client_policy = "Clients can view their own content item state logs"
    client_predicate = (
        "EXISTS (SELECT 1 FROM content_items "
        "WHERE content_items.id = content_item_state_logs.content_item_id "
        f"AND content_items.client_id::text = {CLIENT_ID_CLAIM})"
    )
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f'DROP POLICY IF EXISTS "{admin_policy}" ON {table}')
    op.execute(f'DROP POLICY IF EXISTS "{client_policy}" ON {table}')
    op.execute(
        f'CREATE POLICY "{admin_policy}" ON {table} FOR ALL TO authenticated '
        f"USING ({ADMIN_PREDICATE}) WITH CHECK ({ADMIN_PREDICATE})"
    )
    op.execute(
        f'CREATE POLICY "{client_policy}" ON {table} FOR SELECT TO authenticated '
        f"USING ({client_predicate})"
    )


def downgrade() -> None:
    raise RuntimeError("Refusing to restore legacy insecure RLS policies")
