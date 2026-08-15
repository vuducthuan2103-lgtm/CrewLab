"""Canonical per-provider-request usage and financial ledger models."""

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..core.db import Base, utcnow


JSON_DOCUMENT = JSONB().with_variant(JSON(), "sqlite")
USD_AMOUNT = Numeric(24, 12)
MULTIPLIER_AMOUNT = Numeric(18, 8)


class PricingSnapshot(Base):
    """Immutable effective-dated fallback pricing for one provider model."""

    __tablename__ = "pricing_snapshots"
    __table_args__ = (
        CheckConstraint("currency = 'USD'", name="ck_pricing_snapshots_currency"),
        CheckConstraint(
            "effective_to IS NULL OR effective_to > effective_from",
            name="ck_pricing_snapshots_effective_range",
        ),
        UniqueConstraint(
            "provider",
            "model",
            "usage_category",
            "version",
            name="uq_pricing_snapshots_provider_model_category_version",
        ),
        Index(
            "ix_pricing_snapshots_effective_lookup",
            "provider",
            "model",
            "usage_category",
            "effective_from",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(64), nullable=False)
    model = Column(String(255), nullable=False)
    usage_category = Column(String(32), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    unit_prices = Column(JSON_DOCUMENT, nullable=False, default=dict)
    version = Column(String(128), nullable=False)
    source_reference = Column(Text, nullable=False)
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ChargeMultiplierConfig(Base):
    """Append-only effective-dated global or client multiplier configuration."""

    __tablename__ = "charge_multiplier_configs"
    __table_args__ = (
        CheckConstraint(
            "scope IN ('global_default', 'client_override')",
            name="ck_charge_multiplier_configs_scope",
        ),
        CheckConstraint(
            "((scope = 'global_default' AND client_id IS NULL) OR "
            "(scope = 'client_override' AND client_id IS NOT NULL))",
            name="ck_charge_multiplier_configs_scope_client",
        ),
        CheckConstraint(
            "multiplier >= 0", name="ck_charge_multiplier_configs_nonnegative"
        ),
        CheckConstraint(
            "effective_to IS NULL OR effective_to > effective_from",
            name="ck_charge_multiplier_configs_effective_range",
        ),
        Index(
            "uq_charge_multiplier_configs_active_global",
            "scope",
            unique=True,
            postgresql_where=text(
                "scope = 'global_default' AND effective_to IS NULL"
            ),
            sqlite_where=text("scope = 'global_default' AND effective_to IS NULL"),
        ),
        Index(
            "uq_charge_multiplier_configs_active_client",
            "client_id",
            unique=True,
            postgresql_where=text(
                "scope = 'client_override' AND effective_to IS NULL"
            ),
            sqlite_where=text(
                "scope = 'client_override' AND effective_to IS NULL"
            ),
        ),
        Index(
            "ix_charge_multiplier_configs_effective_lookup",
            "scope",
            "client_id",
            "effective_from",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(String(32), nullable=False)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    multiplier = Column(MULTIPLIER_AMOUNT, nullable=False)
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    changed_by = Column(UUID(as_uuid=True), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class UsageEvent(Base):
    """One independently committed ledger row per provider request."""

    __tablename__ = "usage_events"
    __table_args__ = (
        CheckConstraint(
            "billing_classification IN "
            "('customer_billable', 'internal_non_billable')",
            name="ck_usage_events_billing_classification",
        ),
        CheckConstraint(
            "status IN ('pending', 'succeeded', 'failed', 'cancelled')",
            name="ck_usage_events_status",
        ),
        CheckConstraint(
            "cost_status IN ('pending', 'provisional', 'final', 'unresolved')",
            name="ck_usage_events_cost_status",
        ),
        CheckConstraint(
            "cost_source IS NULL OR cost_source IN "
            "('provider_reported', 'pricing_snapshot', 'legacy_task_log', 'none')",
            name="ck_usage_events_cost_source",
        ),
        CheckConstraint(
            "multiplier_source IN ('global_default', 'client_override')",
            name="ck_usage_events_multiplier_source",
        ),
        CheckConstraint(
            "provider_reported_cost_usd IS NULL OR provider_reported_cost_usd >= 0",
            name="ck_usage_events_provider_cost_nonnegative",
        ),
        CheckConstraint(
            "actual_cost_usd IS NULL OR actual_cost_usd >= 0",
            name="ck_usage_events_actual_cost_nonnegative",
        ),
        CheckConstraint(
            "multiplier_snapshot >= 0",
            name="ck_usage_events_multiplier_nonnegative",
        ),
        CheckConstraint(
            "customer_charge_usd IS NULL OR customer_charge_usd >= 0",
            name="ck_usage_events_customer_charge_nonnegative",
        ),
        CheckConstraint(
            "latency_ms IS NULL OR latency_ms >= 0",
            name="ck_usage_events_latency_nonnegative",
        ),
        Index(
            "uq_usage_events_provider_request",
            "provider",
            "provider_request_id",
            unique=True,
            postgresql_where=text("provider_request_id IS NOT NULL"),
            sqlite_where=text("provider_request_id IS NOT NULL"),
        ),
        Index("ix_usage_events_client_started_at", "client_id", "started_at"),
        Index("ix_usage_events_agent_started_at", "agent_code", "started_at"),
        Index("ix_usage_events_status_cost_status", "status", "cost_status"),
        Index("ix_usage_events_trace_id", "trace_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_key = Column(String(255), nullable=False, unique=True, index=True)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    content_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    parent_event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usage_events.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    trace_id = Column(String(255), nullable=True)
    span_id = Column(String(255), nullable=True)
    agent_code = Column(String(32), nullable=False, index=True)
    task_type = Column(String(128), nullable=False)
    wake_reason = Column(String(128), nullable=False)
    provider = Column(String(64), nullable=False)
    model = Column(String(255), nullable=False)
    usage_category = Column(String(32), nullable=False)
    request_mode = Column(String(64), nullable=True)
    usage_units = Column(JSON_DOCUMENT, nullable=False, default=dict)
    provider_request_id = Column(String(255), nullable=True)
    environment = Column(String(32), nullable=False)
    is_production = Column(Boolean, nullable=False, default=False)
    billing_classification = Column(String(32), nullable=False)
    status = Column(String(16), nullable=False, default="pending")
    cost_status = Column(String(16), nullable=False, default="pending")
    cost_source = Column(String(32), nullable=True)
    pricing_snapshot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pricing_snapshots.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    provider_reported_cost_usd = Column(USD_AMOUNT, nullable=True)
    actual_cost_usd = Column(USD_AMOUNT, nullable=True)
    multiplier_snapshot = Column(MULTIPLIER_AMOUNT, nullable=False)
    multiplier_source = Column(String(32), nullable=False)
    customer_charge_usd = Column(USD_AMOUNT, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    error_code = Column(String(64), nullable=True)
    source_task_log_id = Column(
        UUID(as_uuid=True),
        ForeignKey("task_logs.id", ondelete="RESTRICT"),
        nullable=True,
        unique=True,
        index=True,
    )
    started_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class UsageCostAdjustment(Base):
    """Append-only correction or refund linked to an immutable usage event."""

    __tablename__ = "usage_cost_adjustments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usage_event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usage_events.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    actual_cost_delta_usd = Column(USD_AMOUNT, nullable=False)
    customer_charge_delta_usd = Column(USD_AMOUNT, nullable=False)
    reason = Column(Text, nullable=False)
    approved_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
