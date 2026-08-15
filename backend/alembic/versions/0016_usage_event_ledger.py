"""Add canonical usage event and cost ledger tables.

Revision ID: 0016
Revises: 0015
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


LEDGER_TABLES = (
    "pricing_snapshots",
    "charge_multiplier_configs",
    "usage_events",
    "usage_cost_adjustments",
)

IMMUTABILITY_STATEMENT_SEPARATOR = "-- next-immutability-statement"


IMMUTABILITY_SQL = """
CREATE OR REPLACE FUNCTION reject_usage_ledger_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
        USING ERRCODE = '55000';
END;
$$;

-- next-immutability-statement
CREATE OR REPLACE FUNCTION enforce_usage_event_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Usage events cannot be deleted'
            USING ERRCODE = '55000';
    END IF;

    IF OLD.status = 'pending'
       AND NEW.status IN ('succeeded', 'failed', 'cancelled') THEN
        RETURN NEW;
    END IF;

    IF OLD.status <> 'pending' THEN
        RAISE EXCEPTION 'Finalized usage event cannot be updated'
            USING ERRCODE = '55000';
    END IF;

    RAISE EXCEPTION 'Usage event may only transition from pending to a terminal status'
        USING ERRCODE = '55000';
END;
$$;

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_pricing_snapshots_immutable ON pricing_snapshots;
-- next-immutability-statement
CREATE TRIGGER trg_pricing_snapshots_immutable
BEFORE UPDATE OR DELETE ON pricing_snapshots
FOR EACH ROW EXECUTE FUNCTION reject_usage_ledger_history_mutation();

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_usage_cost_adjustments_immutable ON usage_cost_adjustments;
-- next-immutability-statement
CREATE TRIGGER trg_usage_cost_adjustments_immutable
BEFORE UPDATE OR DELETE ON usage_cost_adjustments
FOR EACH ROW EXECUTE FUNCTION reject_usage_ledger_history_mutation();

-- next-immutability-statement
DROP TRIGGER IF EXISTS trg_usage_events_immutable ON usage_events;
-- next-immutability-statement
CREATE TRIGGER trg_usage_events_immutable
BEFORE UPDATE OR DELETE ON usage_events
FOR EACH ROW EXECUTE FUNCTION enforce_usage_event_immutability();
"""


def _drop_immutability_guards() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_usage_events_immutable ON usage_events"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_usage_cost_adjustments_immutable "
        "ON usage_cost_adjustments"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_pricing_snapshots_immutable "
        "ON pricing_snapshots"
    )
    op.execute("DROP FUNCTION IF EXISTS enforce_usage_event_immutability()")
    op.execute("DROP FUNCTION IF EXISTS reject_usage_ledger_history_mutation()")


def upgrade() -> None:
    op.create_table(
        "pricing_snapshots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("usage_category", sa.String(length=32), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column(
            "unit_prices",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("version", sa.String(length=128), nullable=False),
        sa.Column("source_reference", sa.Text(), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("currency = 'USD'", name="ck_pricing_snapshots_currency"),
        sa.CheckConstraint(
            "effective_to IS NULL OR effective_to > effective_from",
            name="ck_pricing_snapshots_effective_range",
        ),
        sa.UniqueConstraint(
            "provider",
            "model",
            "usage_category",
            "version",
            name="uq_pricing_snapshots_provider_model_category_version",
        ),
    )
    op.create_index(
        "ix_pricing_snapshots_effective_lookup",
        "pricing_snapshots",
        ["provider", "model", "usage_category", "effective_from"],
    )

    op.create_table(
        "charge_multiplier_configs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("scope", sa.String(length=32), nullable=False),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("multiplier", sa.Numeric(18, 8), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "scope IN ('global_default', 'client_override')",
            name="ck_charge_multiplier_configs_scope",
        ),
        sa.CheckConstraint(
            "((scope = 'global_default' AND client_id IS NULL) OR "
            "(scope = 'client_override' AND client_id IS NOT NULL))",
            name="ck_charge_multiplier_configs_scope_client",
        ),
        sa.CheckConstraint(
            "multiplier >= 0", name="ck_charge_multiplier_configs_nonnegative"
        ),
        sa.CheckConstraint(
            "effective_to IS NULL OR effective_to > effective_from",
            name="ck_charge_multiplier_configs_effective_range",
        ),
    )
    op.create_index(
        "ix_charge_multiplier_configs_client_id",
        "charge_multiplier_configs",
        ["client_id"],
    )
    op.create_index(
        "ix_charge_multiplier_configs_effective_lookup",
        "charge_multiplier_configs",
        ["scope", "client_id", "effective_from"],
    )
    op.create_index(
        "uq_charge_multiplier_configs_active_global",
        "charge_multiplier_configs",
        ["scope"],
        unique=True,
        postgresql_where=sa.text(
            "scope = 'global_default' AND effective_to IS NULL"
        ),
    )
    op.create_index(
        "uq_charge_multiplier_configs_active_client",
        "charge_multiplier_configs",
        ["client_id"],
        unique=True,
        postgresql_where=sa.text(
            "scope = 'client_override' AND effective_to IS NULL"
        ),
    )
    op.execute(
        """
        INSERT INTO charge_multiplier_configs
            (id, scope, client_id, multiplier, effective_from, effective_to,
             changed_by, reason, created_at)
        VALUES
            ('00000000-0000-0000-0000-000000000110', 'global_default', NULL,
             1.10, now(), NULL, '00000000-0000-0000-0000-000000000000',
             'Initial system default', now())
        ON CONFLICT DO NOTHING
        """
    )

    op.create_table(
        "usage_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("event_key", sa.String(length=255), nullable=False),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "content_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("content_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "parent_event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usage_events.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("trace_id", sa.String(length=255), nullable=True),
        sa.Column("span_id", sa.String(length=255), nullable=True),
        sa.Column("agent_code", sa.String(length=32), nullable=False),
        sa.Column("task_type", sa.String(length=128), nullable=False),
        sa.Column("wake_reason", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("usage_category", sa.String(length=32), nullable=False),
        sa.Column("request_mode", sa.String(length=64), nullable=True),
        sa.Column(
            "usage_units",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("provider_request_id", sa.String(length=255), nullable=True),
        sa.Column("environment", sa.String(length=32), nullable=False),
        sa.Column(
            "is_production", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("billing_classification", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column(
            "cost_status", sa.String(length=16), nullable=False, server_default="pending"
        ),
        sa.Column("cost_source", sa.String(length=32), nullable=True),
        sa.Column(
            "pricing_snapshot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pricing_snapshots.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("provider_reported_cost_usd", sa.Numeric(24, 12), nullable=True),
        sa.Column("actual_cost_usd", sa.Numeric(24, 12), nullable=True),
        sa.Column("multiplier_snapshot", sa.Numeric(18, 8), nullable=False),
        sa.Column("multiplier_source", sa.String(length=32), nullable=False),
        sa.Column("customer_charge_usd", sa.Numeric(24, 12), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column(
            "source_task_log_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("task_logs.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
            "billing_classification IN "
            "('customer_billable', 'internal_non_billable')",
            name="ck_usage_events_billing_classification",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'succeeded', 'failed', 'cancelled')",
            name="ck_usage_events_status",
        ),
        sa.CheckConstraint(
            "cost_status IN ('pending', 'provisional', 'final', 'unresolved')",
            name="ck_usage_events_cost_status",
        ),
        sa.CheckConstraint(
            "cost_source IS NULL OR cost_source IN "
            "('provider_reported', 'pricing_snapshot', 'legacy_task_log', 'none')",
            name="ck_usage_events_cost_source",
        ),
        sa.CheckConstraint(
            "multiplier_source IN ('global_default', 'client_override')",
            name="ck_usage_events_multiplier_source",
        ),
        sa.CheckConstraint(
            "provider_reported_cost_usd IS NULL OR provider_reported_cost_usd >= 0",
            name="ck_usage_events_provider_cost_nonnegative",
        ),
        sa.CheckConstraint(
            "actual_cost_usd IS NULL OR actual_cost_usd >= 0",
            name="ck_usage_events_actual_cost_nonnegative",
        ),
        sa.CheckConstraint(
            "multiplier_snapshot >= 0",
            name="ck_usage_events_multiplier_nonnegative",
        ),
        sa.CheckConstraint(
            "customer_charge_usd IS NULL OR customer_charge_usd >= 0",
            name="ck_usage_events_customer_charge_nonnegative",
        ),
        sa.CheckConstraint(
            "latency_ms IS NULL OR latency_ms >= 0",
            name="ck_usage_events_latency_nonnegative",
        ),
    )
    op.create_index("uq_usage_events_event_key", "usage_events", ["event_key"], unique=True)
    op.create_index("ix_usage_events_client_id", "usage_events", ["client_id"])
    op.create_index(
        "ix_usage_events_content_item_id", "usage_events", ["content_item_id"]
    )
    op.create_index(
        "ix_usage_events_parent_event_id", "usage_events", ["parent_event_id"]
    )
    op.create_index("ix_usage_events_agent_code", "usage_events", ["agent_code"])
    op.create_index(
        "ix_usage_events_pricing_snapshot_id",
        "usage_events",
        ["pricing_snapshot_id"],
    )
    op.create_index(
        "uq_usage_events_source_task_log_id",
        "usage_events",
        ["source_task_log_id"],
        unique=True,
        postgresql_where=sa.text("source_task_log_id IS NOT NULL"),
    )
    op.create_index(
        "uq_usage_events_provider_request",
        "usage_events",
        ["provider", "provider_request_id"],
        unique=True,
        postgresql_where=sa.text("provider_request_id IS NOT NULL"),
    )
    op.create_index(
        "ix_usage_events_client_started_at",
        "usage_events",
        ["client_id", "started_at"],
    )
    op.create_index(
        "ix_usage_events_agent_started_at",
        "usage_events",
        ["agent_code", "started_at"],
    )
    op.create_index(
        "ix_usage_events_status_cost_status",
        "usage_events",
        ["status", "cost_status"],
    )
    op.create_index("ix_usage_events_trace_id", "usage_events", ["trace_id"])

    op.create_table(
        "usage_cost_adjustments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "usage_event_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usage_events.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("actual_cost_delta_usd", sa.Numeric(24, 12), nullable=False),
        sa.Column("customer_charge_delta_usd", sa.Numeric(24, 12), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_usage_cost_adjustments_usage_event_id",
        "usage_cost_adjustments",
        ["usage_event_id"],
    )
    for statement in IMMUTABILITY_SQL.split(IMMUTABILITY_STATEMENT_SEPARATOR):
        op.execute(sa.text(statement.strip()))

    # No Data API policy is created. Backend/Internal API database roles own
    # access; anon and authenticated JWT roles have no direct ledger access.
    for table in LEDGER_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"REVOKE ALL PRIVILEGES ON TABLE {table} FROM anon, authenticated")


def downgrade() -> None:
    _drop_immutability_guards()
    op.drop_table("usage_cost_adjustments")
    op.drop_table("usage_events")
    op.drop_table("charge_multiplier_configs")
    op.drop_table("pricing_snapshots")
