"""Independent-transaction usage ledger lifecycle and cost calculation."""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from enum import Enum
from typing import Any, AsyncContextManager, Callable, Mapping

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.db import CeleryAsyncSessionLocal, utcnow
from app.models.usage import (
    ChargeMultiplierConfig,
    PricingSnapshot,
    UsageCostAdjustment,
    UsageEvent,
)


USD_QUANTUM = Decimal("0.000000000001")
MULTIPLIER_QUANTUM = Decimal("0.00000001")
DEFAULT_CHARGE_MULTIPLIER = Decimal("1.10")
SAFE_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]*$")
SAFE_ERROR_CODE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class BillingClassification(str, Enum):
    CUSTOMER_BILLABLE = "customer_billable"
    INTERNAL_NON_BILLABLE = "internal_non_billable"


class UsageCategory(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VISION = "vision"
    EMBEDDING = "embedding"
    OTHER_METERED_AI = "other_metered_ai"


class UsageEventStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UsageCostStatus(str, Enum):
    PENDING = "pending"
    PROVISIONAL = "provisional"
    FINAL = "final"
    UNRESOLVED = "unresolved"


class UsageCostSource(str, Enum):
    PROVIDER_REPORTED = "provider_reported"
    PRICING_SNAPSHOT = "pricing_snapshot"
    LEGACY_TASK_LOG = "legacy_task_log"
    NONE = "none"


class MultiplierSource(str, Enum):
    GLOBAL_DEFAULT = "global_default"
    CLIENT_OVERRIDE = "client_override"


class UsageLedgerError(RuntimeError):
    """Base class for ledger errors safe to surface to application code."""


class UsageLedgerUnavailable(UsageLedgerError):
    """Raised when an independent ledger transaction cannot be committed."""


class UsageValidationError(UsageLedgerError):
    """Raised when ledger input violates the internal contract."""


class UsageEventNotFound(UsageLedgerError):
    """Raised when finalization or adjustment targets no ledger event."""


class UsageReconciliationError(UsageLedgerError):
    """Raised when a finalized event receives conflicting evidence."""


SessionFactory = Callable[[], AsyncContextManager[AsyncSession]]


@dataclass(frozen=True)
class BeginUsageEventCommand:
    event_key: str
    client_id: uuid.UUID | None
    agent_code: str
    task_type: str
    wake_reason: str
    provider: str
    model: str
    usage_category: UsageCategory | str
    environment: str
    is_production: bool
    billing_classification: BillingClassification | str
    content_item_id: uuid.UUID | None = None
    parent_event_id: uuid.UUID | None = None
    trace_id: str | None = None
    span_id: str | None = None
    request_mode: str | None = None
    source_task_log_id: uuid.UUID | None = None
    started_at: datetime | None = None


@dataclass(frozen=True)
class BeginUsageEventResult:
    usage_event_id: uuid.UUID
    event_key: str
    multiplier_snapshot: Decimal
    multiplier_source: str
    status: str
    should_call_provider: bool


@dataclass(frozen=True)
class FinalizeUsageEventCommand:
    usage_event_id: uuid.UUID | None = None
    event_key: str | None = None
    provider_request_id: str | None = None
    status: UsageEventStatus | str = UsageEventStatus.SUCCEEDED
    usage_units: Mapping[str, int] = field(default_factory=dict)
    latency_ms: int | None = None
    provider_reported_cost_usd: Decimal | str | int | float | None = None
    error_code: str | None = None
    force_unresolved: bool = False


@dataclass(frozen=True)
class FinalizeUsageEventResult:
    usage_event_id: uuid.UUID
    event_key: str
    status: str
    cost_status: str
    cost_source: str | None
    actual_cost_usd: Decimal | None
    customer_charge_usd: Decimal | None
    reconciliation_required: bool


@dataclass(frozen=True)
class RecordUsageAdjustmentCommand:
    usage_event_id: uuid.UUID
    actual_cost_delta_usd: Decimal | str | int | float
    customer_charge_delta_usd: Decimal | str | int | float
    reason: str
    approved_by: uuid.UUID


@dataclass(frozen=True)
class RecordUsageAdjustmentResult:
    adjustment_id: uuid.UUID
    usage_event_id: uuid.UUID
    actual_cost_delta_usd: Decimal
    customer_charge_delta_usd: Decimal


def default_usage_session_factory() -> AsyncContextManager[AsyncSession]:
    """Return a short-lived NullPool session safe across Celery event loops."""

    return CeleryAsyncSessionLocal()


def independent_session_factory_for(session: AsyncSession) -> SessionFactory:
    """Create injectable independent sessions on the caller's database engine."""

    bind = getattr(session, "bind", None)
    if bind is None:
        return default_usage_session_factory
    factory = sessionmaker(bind=bind, class_=AsyncSession, expire_on_commit=False)
    return factory


def quantize_usd(value: Decimal | str | int | float) -> Decimal:
    try:
        return _decimal(value, "USD amount").quantize(
            USD_QUANTUM, rounding=ROUND_HALF_UP
        )
    except InvalidOperation as exc:
        raise UsageValidationError("USD amount is outside supported precision") from exc


def quantize_multiplier(value: Decimal | str | int | float) -> Decimal:
    try:
        multiplier = _decimal(value, "multiplier").quantize(
            MULTIPLIER_QUANTUM, rounding=ROUND_HALF_UP
        )
    except InvalidOperation as exc:
        raise UsageValidationError("multiplier is outside supported precision") from exc
    if multiplier < 0:
        raise UsageValidationError("multiplier cannot be negative")
    return multiplier


def validate_usage_units(units: Mapping[str, int]) -> dict[str, int]:
    if not isinstance(units, Mapping):
        raise UsageValidationError("usage_units must be an object")
    normalized: dict[str, int] = {}
    for key, value in units.items():
        if not isinstance(key, str) or not SAFE_IDENTIFIER.fullmatch(key):
            raise UsageValidationError("usage unit names must be safe identifiers")
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise UsageValidationError("usage unit values must be non-negative integers")
        normalized[key] = value
    return normalized


def sanitize_error_category(error: BaseException) -> str:
    """Map an exception type to a bounded category without retaining its message."""

    name = type(error).__name__.casefold()
    if "timeout" in name:
        return "provider_timeout"
    if "ratelimit" in name or "rate_limit" in name:
        return "provider_rate_limit"
    if "auth" in name or "permission" in name:
        return "provider_authentication"
    if "connection" in name or "network" in name:
        return "provider_connection"
    if "validation" in name or "value" in name:
        return "provider_invalid_response"
    return "provider_error"


async def begin_usage_event(
    command: BeginUsageEventCommand,
    *,
    session_factory: SessionFactory | None = None,
) -> BeginUsageEventResult:
    """Commit a pending event before caller admission to an external provider."""

    values = _validated_begin_values(command)
    factory = session_factory or default_usage_session_factory
    try:
        async with factory() as session:
            existing = await session.scalar(
                select(UsageEvent).where(UsageEvent.event_key == values["event_key"])
            )
            if existing is not None:
                return _begin_result(existing, should_call_provider=False)

            multiplier, multiplier_source = await _resolve_multiplier(
                session,
                client_id=values["client_id"],
                effective_at=values["started_at"],
            )
            event = UsageEvent(
                **values,
                status=UsageEventStatus.PENDING.value,
                cost_status=UsageCostStatus.PENDING.value,
                usage_units={},
                multiplier_snapshot=multiplier,
                multiplier_source=multiplier_source,
            )
            session.add(event)
            await session.commit()
            await session.refresh(event)
            return _begin_result(event, should_call_provider=True)
    except IntegrityError:
        existing = await _find_event_by_key(factory, values["event_key"])
        if existing is not None:
            return _begin_result(existing, should_call_provider=False)
        raise UsageLedgerUnavailable("Usage ledger admission failed") from None
    except UsageLedgerError:
        raise
    except SQLAlchemyError as exc:
        raise UsageLedgerUnavailable("Usage ledger admission failed") from exc


async def finalize_usage_event(
    command: FinalizeUsageEventCommand,
    *,
    session_factory: SessionFactory | None = None,
) -> FinalizeUsageEventResult:
    """Finalize one event once, preserving immutable cost evidence."""

    factory = session_factory or default_usage_session_factory
    status = _enum_value(command.status, UsageEventStatus, "status")
    if status == UsageEventStatus.PENDING.value:
        raise UsageValidationError("final status cannot be pending")
    units = validate_usage_units(command.usage_units)
    provider_request_id = _safe_optional_identifier(
        command.provider_request_id, "provider_request_id", 255
    )
    error_code = _validated_error_code(command.error_code)
    latency_ms = command.latency_ms
    if latency_ms is not None and (
        isinstance(latency_ms, bool) or not isinstance(latency_ms, int) or latency_ms < 0
    ):
        raise UsageValidationError("latency_ms must be a non-negative integer")
    provider_cost = (
        quantize_usd(command.provider_reported_cost_usd)
        if command.provider_reported_cost_usd is not None
        else None
    )
    if provider_cost is not None and provider_cost < 0:
        raise UsageValidationError("provider cost cannot be negative")

    try:
        async with factory() as session:
            event = await _locked_event(session, command)
            if event is None:
                raise UsageEventNotFound("Usage event was not found")
            if event.status != UsageEventStatus.PENDING.value:
                if _same_finalization_evidence(
                    event,
                    status=status,
                    units=units,
                    provider_request_id=provider_request_id,
                    provider_cost=provider_cost,
                    error_code=error_code,
                    force_unresolved=command.force_unresolved,
                ):
                    return _finalize_result(event, reconciliation_required=False)
                raise UsageReconciliationError(
                    "Finalized usage event received conflicting evidence"
                )

            if provider_request_id is not None:
                duplicate = await session.scalar(
                    select(UsageEvent)
                    .where(
                        UsageEvent.provider == event.provider,
                        UsageEvent.provider_request_id == provider_request_id,
                        UsageEvent.id != event.id,
                    )
                    .with_for_update()
                )
                if duplicate is not None:
                    event.status = UsageEventStatus.CANCELLED.value
                    event.cost_status = UsageCostStatus.FINAL.value
                    event.cost_source = UsageCostSource.NONE.value
                    event.usage_units = units
                    event.actual_cost_usd = Decimal("0").quantize(USD_QUANTUM)
                    event.customer_charge_usd = Decimal("0").quantize(USD_QUANTUM)
                    event.latency_ms = latency_ms
                    event.error_code = "duplicate_provider_request"
                    event.completed_at = utcnow()
                    event.updated_at = event.completed_at
                    await session.commit()
                    return _finalize_result(duplicate, reconciliation_required=False)

            cost = await _resolve_cost(
                session,
                event=event,
                status=status,
                usage_units=units,
                provider_reported_cost=provider_cost,
                force_unresolved=command.force_unresolved,
            )
            event.provider_request_id = provider_request_id
            event.status = status
            event.usage_units = units
            event.provider_reported_cost_usd = provider_cost
            event.actual_cost_usd = cost.actual_cost_usd
            event.customer_charge_usd = _customer_charge(event, cost.actual_cost_usd)
            event.cost_status = cost.cost_status
            event.cost_source = cost.cost_source
            event.pricing_snapshot_id = cost.pricing_snapshot_id
            event.latency_ms = latency_ms
            event.error_code = error_code
            event.completed_at = utcnow()
            event.updated_at = event.completed_at
            await session.commit()
            await session.refresh(event)
            return _finalize_result(event, reconciliation_required=False)
    except (UsageLedgerError, UsageValidationError):
        raise
    except IntegrityError as exc:
        raise UsageReconciliationError(
            "Usage event conflicts with existing provider evidence"
        ) from exc
    except SQLAlchemyError as exc:
        raise UsageLedgerUnavailable("Usage ledger finalization failed") from exc


async def record_usage_adjustment(
    command: RecordUsageAdjustmentCommand,
    *,
    session_factory: SessionFactory | None = None,
) -> RecordUsageAdjustmentResult:
    """Append a financial correction without mutating the original event."""

    actual_delta = quantize_usd(command.actual_cost_delta_usd)
    charge_delta = quantize_usd(command.customer_charge_delta_usd)
    reason = _required_text(command.reason, "reason", 1000)
    if actual_delta == 0 and charge_delta == 0:
        raise UsageValidationError("an adjustment must change at least one amount")
    factory = session_factory or default_usage_session_factory
    try:
        async with factory() as session:
            event = await session.get(UsageEvent, command.usage_event_id)
            if event is None:
                raise UsageEventNotFound("Usage event was not found")
            if event.status == UsageEventStatus.PENDING.value:
                raise UsageValidationError("pending usage event cannot be adjusted")
            adjustment = UsageCostAdjustment(
                usage_event_id=event.id,
                actual_cost_delta_usd=actual_delta,
                customer_charge_delta_usd=charge_delta,
                reason=reason,
                approved_by=command.approved_by,
            )
            session.add(adjustment)
            await session.commit()
            await session.refresh(adjustment)
            return RecordUsageAdjustmentResult(
                adjustment_id=adjustment.id,
                usage_event_id=adjustment.usage_event_id,
                actual_cost_delta_usd=adjustment.actual_cost_delta_usd,
                customer_charge_delta_usd=adjustment.customer_charge_delta_usd,
            )
    except UsageLedgerError:
        raise
    except SQLAlchemyError as exc:
        raise UsageLedgerUnavailable("Usage adjustment append failed") from exc


@dataclass(frozen=True)
class _ResolvedCost:
    actual_cost_usd: Decimal | None
    cost_status: str
    cost_source: str
    pricing_snapshot_id: uuid.UUID | None


async def _resolve_multiplier(
    session: AsyncSession,
    *,
    client_id: uuid.UUID | None,
    effective_at: datetime,
) -> tuple[Decimal, str]:
    active_at = (
        ChargeMultiplierConfig.effective_from <= effective_at,
        or_(
            ChargeMultiplierConfig.effective_to.is_(None),
            ChargeMultiplierConfig.effective_to > effective_at,
        ),
    )
    if client_id is not None:
        override = await session.scalar(
            select(ChargeMultiplierConfig)
            .where(
                ChargeMultiplierConfig.scope == MultiplierSource.CLIENT_OVERRIDE.value,
                ChargeMultiplierConfig.client_id == client_id,
                *active_at,
            )
            .order_by(ChargeMultiplierConfig.effective_from.desc())
            .limit(1)
        )
        if override is not None:
            return (
                quantize_multiplier(override.multiplier),
                MultiplierSource.CLIENT_OVERRIDE.value,
            )
    global_default = await session.scalar(
        select(ChargeMultiplierConfig)
        .where(
            ChargeMultiplierConfig.scope == MultiplierSource.GLOBAL_DEFAULT.value,
            ChargeMultiplierConfig.client_id.is_(None),
            *active_at,
        )
        .order_by(ChargeMultiplierConfig.effective_from.desc())
        .limit(1)
    )
    if global_default is None:
        return (
            quantize_multiplier(DEFAULT_CHARGE_MULTIPLIER),
            MultiplierSource.GLOBAL_DEFAULT.value,
        )
    return (
        quantize_multiplier(global_default.multiplier),
        MultiplierSource.GLOBAL_DEFAULT.value,
    )


async def _resolve_cost(
    session: AsyncSession,
    *,
    event: UsageEvent,
    status: str,
    usage_units: Mapping[str, int],
    provider_reported_cost: Decimal | None,
    force_unresolved: bool,
) -> _ResolvedCost:
    if force_unresolved:
        return _ResolvedCost(
            actual_cost_usd=None,
            cost_status=UsageCostStatus.UNRESOLVED.value,
            cost_source=UsageCostSource.LEGACY_TASK_LOG.value,
            pricing_snapshot_id=None,
        )
    if event.provider == "mock" or event.environment in {"local", "test"}:
        return _ResolvedCost(
            actual_cost_usd=Decimal("0").quantize(USD_QUANTUM),
            cost_status=UsageCostStatus.FINAL.value,
            cost_source=UsageCostSource.NONE.value,
            pricing_snapshot_id=None,
        )
    if provider_reported_cost is not None:
        return _ResolvedCost(
            actual_cost_usd=provider_reported_cost,
            cost_status=UsageCostStatus.FINAL.value,
            cost_source=UsageCostSource.PROVIDER_REPORTED.value,
            pricing_snapshot_id=None,
        )

    snapshot = await session.scalar(
        select(PricingSnapshot)
        .where(
            PricingSnapshot.provider == event.provider,
            PricingSnapshot.model == event.model,
            PricingSnapshot.usage_category == event.usage_category,
            PricingSnapshot.currency == "USD",
            PricingSnapshot.effective_from <= event.started_at,
            or_(
                PricingSnapshot.effective_to.is_(None),
                PricingSnapshot.effective_to > event.started_at,
            ),
        )
        .order_by(PricingSnapshot.effective_from.desc())
        .limit(1)
    )
    if snapshot is not None:
        snapshot_cost = _calculate_snapshot_cost(snapshot.unit_prices, usage_units)
        if snapshot_cost is not None:
            return _ResolvedCost(
                actual_cost_usd=snapshot_cost,
                cost_status=UsageCostStatus.PROVISIONAL.value,
                cost_source=UsageCostSource.PRICING_SNAPSHOT.value,
                pricing_snapshot_id=snapshot.id,
            )

    has_measured_usage = any(value > 0 for value in usage_units.values())
    is_unbilled_failure = status == UsageEventStatus.FAILED.value and not has_measured_usage
    if is_unbilled_failure:
        return _ResolvedCost(
            actual_cost_usd=Decimal("0").quantize(USD_QUANTUM),
            cost_status=UsageCostStatus.FINAL.value,
            cost_source=UsageCostSource.NONE.value,
            pricing_snapshot_id=None,
        )
    return _ResolvedCost(
        actual_cost_usd=None,
        cost_status=UsageCostStatus.UNRESOLVED.value,
        cost_source=UsageCostSource.NONE.value,
        pricing_snapshot_id=None,
    )


def _calculate_snapshot_cost(
    unit_prices: Mapping[str, Any], usage_units: Mapping[str, int]
) -> Decimal | None:
    total = Decimal("0")
    measured = False
    for unit_name, count in usage_units.items():
        if count == 0:
            continue
        measured = True
        if unit_name not in unit_prices:
            return None
        raw_rate = unit_prices[unit_name]
        per_units = Decimal("1")
        if isinstance(raw_rate, Mapping):
            if "price_usd" not in raw_rate:
                return None
            per_units = _decimal(raw_rate.get("per_units", 1), "pricing unit basis")
            raw_rate = raw_rate["price_usd"]
        rate = _decimal(raw_rate, "pricing unit rate")
        if rate < 0 or per_units <= 0:
            raise UsageValidationError("pricing snapshot contains an invalid rate")
        total += Decimal(count) * rate / per_units
    if not measured:
        return None
    return total.quantize(USD_QUANTUM, rounding=ROUND_HALF_UP)


def _customer_charge(event: UsageEvent, actual_cost: Decimal | None) -> Decimal | None:
    if actual_cost is None:
        return None
    if event.billing_classification != BillingClassification.CUSTOMER_BILLABLE.value:
        return Decimal("0").quantize(USD_QUANTUM)
    return (actual_cost * Decimal(event.multiplier_snapshot)).quantize(
        USD_QUANTUM, rounding=ROUND_HALF_UP
    )


def _validated_begin_values(command: BeginUsageEventCommand) -> dict[str, Any]:
    event_key = _safe_identifier(command.event_key, "event_key", 255)
    agent_code = _required_text(command.agent_code, "agent_code", 32)
    task_type = _required_text(command.task_type, "task_type", 128)
    wake_reason = _required_text(command.wake_reason, "wake_reason", 128)
    provider = _safe_identifier(command.provider, "provider", 64)
    model = _required_text(command.model, "model", 255)
    usage_category = _enum_value(
        command.usage_category, UsageCategory, "usage_category"
    )
    environment = _safe_identifier(command.environment, "environment", 32)
    billing_classification = _enum_value(
        command.billing_classification,
        BillingClassification,
        "billing_classification",
    )
    if not command.is_production or command.client_id is None:
        billing_classification = BillingClassification.INTERNAL_NON_BILLABLE.value
    started_at = command.started_at or utcnow()
    return {
        "event_key": event_key,
        "client_id": command.client_id,
        "content_item_id": command.content_item_id,
        "parent_event_id": command.parent_event_id,
        "trace_id": _safe_optional_identifier(command.trace_id, "trace_id", 255),
        "span_id": _safe_optional_identifier(command.span_id, "span_id", 255),
        "agent_code": agent_code,
        "task_type": task_type,
        "wake_reason": wake_reason,
        "provider": provider,
        "model": model,
        "usage_category": usage_category,
        "request_mode": _safe_optional_identifier(
            command.request_mode, "request_mode", 64
        ),
        "environment": environment,
        "is_production": bool(command.is_production),
        "billing_classification": billing_classification,
        "source_task_log_id": command.source_task_log_id,
        "started_at": started_at,
    }


async def _locked_event(
    session: AsyncSession, command: FinalizeUsageEventCommand
) -> UsageEvent | None:
    if command.usage_event_id is not None:
        return await session.get(
            UsageEvent, command.usage_event_id, with_for_update=True
        )
    if command.event_key is not None:
        event_key = _safe_identifier(command.event_key, "event_key", 255)
        return await session.scalar(
            select(UsageEvent)
            .where(UsageEvent.event_key == event_key)
            .with_for_update()
        )
    raise UsageValidationError("usage_event_id or event_key is required")


async def _find_event_by_key(
    factory: SessionFactory, event_key: str
) -> UsageEvent | None:
    try:
        async with factory() as session:
            return await session.scalar(
                select(UsageEvent).where(UsageEvent.event_key == event_key)
            )
    except SQLAlchemyError as exc:
        raise UsageLedgerUnavailable("Usage ledger lookup failed") from exc


def _same_finalization_evidence(
    event: UsageEvent,
    *,
    status: str,
    units: Mapping[str, int],
    provider_request_id: str | None,
    provider_cost: Decimal | None,
    error_code: str | None,
    force_unresolved: bool,
) -> bool:
    if force_unresolved and event.cost_source != UsageCostSource.LEGACY_TASK_LOG.value:
        return False
    stored_provider_cost = (
        quantize_usd(event.provider_reported_cost_usd)
        if event.provider_reported_cost_usd is not None
        else None
    )
    return (
        event.status == status
        and dict(event.usage_units or {}) == dict(units)
        and event.provider_request_id == provider_request_id
        and stored_provider_cost == provider_cost
        and event.error_code == error_code
    )


def _begin_result(
    event: UsageEvent, *, should_call_provider: bool
) -> BeginUsageEventResult:
    return BeginUsageEventResult(
        usage_event_id=event.id,
        event_key=event.event_key,
        multiplier_snapshot=Decimal(event.multiplier_snapshot),
        multiplier_source=event.multiplier_source,
        status=event.status,
        should_call_provider=should_call_provider,
    )


def _finalize_result(
    event: UsageEvent, *, reconciliation_required: bool
) -> FinalizeUsageEventResult:
    return FinalizeUsageEventResult(
        usage_event_id=event.id,
        event_key=event.event_key,
        status=event.status,
        cost_status=event.cost_status,
        cost_source=event.cost_source,
        actual_cost_usd=(
            Decimal(event.actual_cost_usd)
            if event.actual_cost_usd is not None
            else None
        ),
        customer_charge_usd=(
            Decimal(event.customer_charge_usd)
            if event.customer_charge_usd is not None
            else None
        ),
        reconciliation_required=reconciliation_required,
    )


def _enum_value(value: Enum | str, enum_type: type[Enum], field_name: str) -> str:
    raw = value.value if isinstance(value, Enum) else value
    try:
        return enum_type(raw).value
    except (TypeError, ValueError) as exc:
        raise UsageValidationError(f"invalid {field_name}") from exc


def _decimal(value: Decimal | str | int | float, field_name: str) -> Decimal:
    if isinstance(value, bool):
        raise UsageValidationError(f"{field_name} must be decimal")
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise UsageValidationError(f"{field_name} must be decimal") from exc
    if not decimal_value.is_finite():
        raise UsageValidationError(f"{field_name} must be finite")
    return decimal_value


def _required_text(value: str, field_name: str, max_length: int) -> str:
    if not isinstance(value, str):
        raise UsageValidationError(f"{field_name} is required")
    normalized = value.strip()
    if not normalized or len(normalized) > max_length or any(
        ord(character) < 32 for character in normalized
    ):
        raise UsageValidationError(f"invalid {field_name}")
    return normalized


def _safe_identifier(value: str, field_name: str, max_length: int) -> str:
    normalized = _required_text(value, field_name, max_length)
    if not SAFE_IDENTIFIER.fullmatch(normalized):
        raise UsageValidationError(f"invalid {field_name}")
    return normalized


def _safe_optional_identifier(
    value: str | None, field_name: str, max_length: int
) -> str | None:
    if value is None:
        return None
    return _safe_identifier(value, field_name, max_length)


def _validated_error_code(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().casefold()
    if not SAFE_ERROR_CODE.fullmatch(normalized):
        raise UsageValidationError("invalid error_code")
    return normalized
