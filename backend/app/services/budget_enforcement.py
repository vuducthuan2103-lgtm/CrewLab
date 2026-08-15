"""Customer-charge budget status and pre-provider reservation controls.

Postgres is the financial source of truth. Redis only coordinates short-lived,
integer-cent reservations between workers so concurrent stale reads cannot
admit more spend than a client or agent cap allows.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from typing import Protocol
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.system import TaskLog
from app.models.usage import PricingSnapshot, UsageCostAdjustment, UsageEvent


logger = logging.getLogger(__name__)

ACTIVE_MVP_AGENTS = ("A01", "B02", "B03", "D01", "D02", "E01")
WARNING_PERCENT = Decimal("80")
CENT = Decimal("0.01")
RESERVATION_TTL_SECONDS = 30 * 60
MONTH_KEY_GRACE_SECONDS = 5 * 60


class BudgetAdmissionError(RuntimeError):
    """A billable request must not proceed to its provider."""


class BudgetExceeded(BudgetAdmissionError):
    code = "budget_exceeded"


class BudgetEstimateUnavailable(BudgetAdmissionError):
    code = "budget_estimate_unavailable"


@dataclass(frozen=True)
class BudgetStatus:
    scope: str
    charge_usd: Decimal
    budget_usd: Decimal | None
    remaining_usd: Decimal | None
    percentage: Decimal | None
    state: str


@dataclass(frozen=True)
class BudgetReservation:
    reservation_id: str
    client_key: str
    agent_key: str
    amount_cents: int
    expires_at: datetime
    scope_expires_at: datetime | None = None
    created_at: datetime | None = None


class ReservationStore(Protocol):
    async def reserve(
        self,
        reservation: BudgetReservation,
        *,
        client_limit_cents: int | None,
        agent_limit_cents: int | None,
        client_committed_cents: int,
        agent_committed_cents: int,
    ) -> bool: ...

    async def release(self, reservation: BudgetReservation) -> None: ...


class InMemoryReservationStore:
    """Deterministic adapter used by tests; production injects Redis."""

    def __init__(self) -> None:
        self._entries: dict[str, BudgetReservation] = {}
        self._lock = asyncio.Lock()

    async def reserve(
        self,
        reservation: BudgetReservation,
        *,
        client_limit_cents: int | None,
        agent_limit_cents: int | None,
        client_committed_cents: int,
        agent_committed_cents: int,
    ) -> bool:
        async with self._lock:
            self._purge(reservation.created_at or datetime.now(UTC))
            if reservation.reservation_id in self._entries:
                return True
            client_reserved = sum(
                item.amount_cents
                for item in self._entries.values()
                if item.client_key == reservation.client_key
            )
            agent_reserved = sum(
                item.amount_cents
                for item in self._entries.values()
                if item.agent_key == reservation.agent_key
            )
            next_client = (
                client_committed_cents + client_reserved + reservation.amount_cents
            )
            next_agent = (
                agent_committed_cents + agent_reserved + reservation.amount_cents
            )
            if client_limit_cents is not None and next_client > client_limit_cents:
                return False
            if agent_limit_cents is not None and next_agent > agent_limit_cents:
                return False
            self._entries[reservation.reservation_id] = reservation
            return True

    async def release(self, reservation: BudgetReservation) -> None:
        async with self._lock:
            self._entries.pop(reservation.reservation_id, None)

    def _purge(self, now: datetime) -> None:
        expired = [
            reservation_id
            for reservation_id, item in self._entries.items()
            if item.expires_at <= now
        ]
        for reservation_id in expired:
            self._entries.pop(reservation_id, None)
        if expired:
            logger.warning(
                "Recovered %d expired budget reservation(s) from the test adapter",
                len(expired),
            )


_RESERVE_LUA = """
local function decrement(counter_key, amount)
  local remaining = redis.call('DECRBY', counter_key, amount)
  if remaining < 0 then redis.call('SET', counter_key, 0) end
end
local function purge(hash_key, counter_key, now)
  local expired = 0
  local rows = redis.call('HGETALL', hash_key)
  for index = 1, #rows, 2 do
    local amount, expires = string.match(rows[index + 1], '^(%d+)|(%d+)$')
    if amount and expires and tonumber(expires) <= now then
      decrement(counter_key, tonumber(amount))
      redis.call('HDEL', hash_key, rows[index])
      expired = expired + 1
    end
  end
  return expired
end
local expired = purge(KEYS[1], KEYS[3], tonumber(ARGV[3]))
expired = expired + purge(KEYS[2], KEYS[4], tonumber(ARGV[3]))
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then return {1, expired} end
local client_total = tonumber(redis.call('GET', KEYS[3]) or '0')
local agent_total = tonumber(redis.call('GET', KEYS[4]) or '0')
if tonumber(ARGV[4]) >= 0 and client_total + tonumber(ARGV[2]) > tonumber(ARGV[4]) then
  return {0, expired}
end
if tonumber(ARGV[5]) >= 0 and agent_total + tonumber(ARGV[2]) > tonumber(ARGV[5]) then
  return {0, expired}
end
local value = ARGV[2] .. '|' .. ARGV[6]
redis.call('HSET', KEYS[1], ARGV[1], value)
redis.call('HSET', KEYS[2], ARGV[1], value)
redis.call('INCRBY', KEYS[3], tonumber(ARGV[2]))
redis.call('INCRBY', KEYS[4], tonumber(ARGV[2]))
for index = 1, 4 do redis.call('EXPIRE', KEYS[index], tonumber(ARGV[7])) end
return {1, expired}
"""

_RELEASE_LUA = """
local function decrement(counter_key, amount)
  local remaining = redis.call('DECRBY', counter_key, amount)
  if remaining < 0 then redis.call('SET', counter_key, 0) end
end
local function release(hash_key, counter_key, reservation_id)
  local value = redis.call('HGET', hash_key, reservation_id)
  if not value then return end
  local amount = tonumber(string.match(value, '^(%d+)'))
  decrement(counter_key, amount)
  redis.call('HDEL', hash_key, reservation_id)
end
release(KEYS[1], KEYS[3], ARGV[1])
release(KEYS[2], KEYS[4], ARGV[1])
return 1
"""


class RedisReservationStore:
    """Production reservation adapter using one atomic script for both caps."""

    def __init__(self, client) -> None:
        self._client = client

    @staticmethod
    def _keys(reservation: BudgetReservation) -> list[str]:
        return [
            f"{reservation.client_key}:members",
            f"{reservation.agent_key}:members",
            f"{reservation.client_key}:cents",
            f"{reservation.agent_key}:cents",
        ]

    async def reserve(
        self,
        reservation: BudgetReservation,
        *,
        client_limit_cents: int | None,
        agent_limit_cents: int | None,
        client_committed_cents: int,
        agent_committed_cents: int,
    ) -> bool:
        client_remaining = (
            -1
            if client_limit_cents is None
            else max(client_limit_cents - client_committed_cents, 0)
        )
        agent_remaining = (
            -1
            if agent_limit_cents is None
            else max(agent_limit_cents - agent_committed_cents, 0)
        )
        now = datetime.now(UTC)
        scope_expires_at = reservation.scope_expires_at or reservation.expires_at
        key_ttl = max(1, int((scope_expires_at - now).total_seconds()))
        result = await self._client.eval(
            _RESERVE_LUA,
            4,
            *self._keys(reservation),
            reservation.reservation_id,
            reservation.amount_cents,
            int(now.timestamp()),
            client_remaining,
            agent_remaining,
            int(reservation.expires_at.timestamp()),
            key_ttl,
        )
        if isinstance(result, (list, tuple)):
            admitted, expired_count = int(result[0]), int(result[1])
        else:
            admitted, expired_count = int(result), 0
        if expired_count:
            logger.warning(
                "Recovered %d expired Redis budget reservation entries",
                expired_count,
            )
        return bool(admitted)

    async def release(self, reservation: BudgetReservation) -> None:
        await self._client.eval(
            _RELEASE_LUA,
            4,
            *self._keys(reservation),
            reservation.reservation_id,
        )


_default_store: RedisReservationStore | None = None


def default_reservation_store() -> RedisReservationStore:
    """Use the existing Celery Redis lifecycle; no second daemon is introduced."""

    global _default_store
    if _default_store is None:
        import redis.asyncio as redis

        _default_store = RedisReservationStore(
            redis.from_url(
                os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
                decode_responses=True,
            )
        )
    return _default_store


def month_bounds(now: datetime, timezone_name: str) -> tuple[str, datetime, datetime]:
    """Return local YYYY-MM and the corresponding half-open UTC interval."""

    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)
    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, TypeError) as exc:
        raise ValueError("client timezone is invalid") from exc
    local = now.astimezone(zone)
    start_local = local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start_local.month == 12:
        end_local = start_local.replace(year=start_local.year + 1, month=1)
    else:
        end_local = start_local.replace(month=start_local.month + 1)
    return (
        start_local.strftime("%Y-%m"),
        start_local.astimezone(UTC),
        end_local.astimezone(UTC),
    )


def cents(value: Decimal) -> int:
    if not value.is_finite() or value < 0:
        raise ValueError("budget amounts must be finite and non-negative")
    return int((value / CENT).to_integral_value(rounding=ROUND_CEILING))


def budget_state(charge: Decimal, budget: Decimal | None) -> BudgetStatus:
    if budget is None:
        return BudgetStatus("", charge, None, None, None, "not_configured")
    if not budget.is_finite() or budget < 0:
        raise ValueError("budget must be finite and non-negative")
    percentage = (
        Decimal("100") if budget == 0 else charge / budget * Decimal("100")
    )
    state = (
        "exceeded"
        if percentage >= 100
        else "warning"
        if percentage >= WARNING_PERCENT
        else "normal"
    )
    return BudgetStatus("", charge, budget, budget - charge, percentage, state)


async def _charge_sums(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    start: datetime,
    end: datetime,
) -> tuple[Decimal, dict[str, Decimal]]:
    event_rows = await session.execute(
        select(
            UsageEvent.agent_code,
            func.coalesce(func.sum(UsageEvent.customer_charge_usd), 0),
        )
        .where(
            UsageEvent.client_id == client_id,
            UsageEvent.started_at >= start,
            UsageEvent.started_at < end,
            UsageEvent.customer_charge_usd.is_not(None),
        )
        .group_by(UsageEvent.agent_code)
    )
    adjustment_rows = await session.execute(
        select(
            UsageEvent.agent_code,
            func.coalesce(
                func.sum(UsageCostAdjustment.customer_charge_delta_usd), 0
            ),
        )
        .join(UsageEvent, UsageCostAdjustment.usage_event_id == UsageEvent.id)
        .where(
            UsageEvent.client_id == client_id,
            UsageEvent.started_at >= start,
            UsageEvent.started_at < end,
        )
        .group_by(UsageEvent.agent_code)
    )
    by_agent: dict[str, Decimal] = {}
    for agent_code, amount in event_rows:
        by_agent[agent_code] = Decimal(str(amount or 0))
    for agent_code, amount in adjustment_rows:
        by_agent[agent_code] = by_agent.get(agent_code, Decimal("0")) + Decimal(
            str(amount or 0)
        )
    return sum(by_agent.values(), Decimal("0")), by_agent


def _scoped_status(scope: str, charge: Decimal, budget: Decimal | None) -> BudgetStatus:
    status = budget_state(charge, budget)
    return BudgetStatus(
        scope,
        status.charge_usd,
        status.budget_usd,
        status.remaining_usd,
        status.percentage,
        status.state,
    )


async def get_budget_statuses(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    now: datetime | None = None,
) -> tuple[BudgetStatus, dict[str, BudgetStatus]]:
    """Return one canonical month-to-date status for total and all MVP agents."""

    client = await session.get(Client, client_id)
    if client is None:
        raise ValueError("client not found")
    _month, start, end = month_bounds(now or datetime.now(UTC), client.timezone)
    total, by_agent = await _charge_sums(
        session, client_id=client_id, start=start, end=end
    )
    overall_budget = (
        Decimal(str(client.monthly_budget_usd))
        if client.monthly_budget_usd is not None
        else None
    )
    configs = list(
        (
            await session.execute(
                select(ClientLLMConfig).where(
                    ClientLLMConfig.client_id == client_id,
                    ClientLLMConfig.is_active.is_(True),
                )
            )
        ).scalars()
    )
    budgets = {
        config.agent_code: (
            Decimal(str(config.budget_usd))
            if config.budget_usd is not None
            else None
        )
        for config in configs
    }
    agent_codes = dict.fromkeys((*ACTIVE_MVP_AGENTS, *budgets, *by_agent))
    agents = {
        agent_code: _scoped_status(
            agent_code,
            by_agent.get(agent_code, Decimal("0")),
            budgets.get(agent_code),
        )
        for agent_code in agent_codes
    }
    return _scoped_status("client", total, overall_budget), agents


async def _record_quota_signal(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    agent_code: str,
    signal: str,
    content_item_id: uuid.UUID | None,
) -> None:
    session.add(
        TaskLog(
            client_id=client_id,
            content_item_id=content_item_id,
            agent_code=agent_code,
            task_type="budget_enforcement",
            status=signal,
            wake_reason="budget_admission",
            error_code=signal,
            error_retryable=False,
        )
    )
    await session.commit()


def _projected_warning(status: BudgetStatus, estimated_charge: Decimal) -> bool:
    if status.budget_usd is None:
        return False
    projected = budget_state(
        status.charge_usd + estimated_charge, status.budget_usd
    )
    return projected.state == "warning"


async def admit_budget(
    session: AsyncSession,
    *,
    usage_event_id: uuid.UUID,
    client_id: uuid.UUID,
    agent_code: str,
    estimated_customer_charge_usd: Decimal | None,
    store: ReservationStore | None = None,
    now: datetime | None = None,
    content_item_id: uuid.UUID | None = None,
) -> BudgetReservation | None:
    """Reserve both caps before any external provider call, or raise."""

    current = now or datetime.now(UTC)
    overall, agents = await get_budget_statuses(
        session, client_id=client_id, now=current
    )
    agent = agents.get(
        agent_code,
        BudgetStatus(
            agent_code, Decimal("0"), None, None, None, "not_configured"
        ),
    )
    if overall.budget_usd is None and agent.budget_usd is None:
        return None
    if overall.state == "exceeded" or agent.state == "exceeded":
        await _record_quota_signal(
            session,
            client_id=client_id,
            agent_code=agent_code,
            signal="quota_exceeded",
            content_item_id=content_item_id,
        )
        raise BudgetExceeded("Client or agent budget is exhausted")
    if estimated_customer_charge_usd is None:
        raise BudgetEstimateUnavailable(
            "A configured budget needs a conservative estimate"
        )
    if (
        not estimated_customer_charge_usd.is_finite()
        or estimated_customer_charge_usd < 0
    ):
        raise ValueError("estimated customer charge must be finite and non-negative")
    client = await session.get(Client, client_id)
    if client is None:
        raise ValueError("client not found")
    month, _start, end = month_bounds(current, client.timezone)
    reservation = BudgetReservation(
        reservation_id=str(usage_event_id),
        client_key=f"crewlab:budget:client:{client_id}:{month}",
        agent_key=f"crewlab:budget:agent:{client_id}:{agent_code}:{month}",
        amount_cents=cents(estimated_customer_charge_usd),
        expires_at=current + timedelta(seconds=RESERVATION_TTL_SECONDS),
        scope_expires_at=end + timedelta(seconds=MONTH_KEY_GRACE_SECONDS),
        created_at=current,
    )
    active_store = store or default_reservation_store()
    admitted = await active_store.reserve(
        reservation,
        client_limit_cents=(
            cents(overall.budget_usd)
            if overall.budget_usd is not None
            else None
        ),
        agent_limit_cents=(
            cents(agent.budget_usd) if agent.budget_usd is not None else None
        ),
        client_committed_cents=cents(max(overall.charge_usd, Decimal("0"))),
        agent_committed_cents=cents(max(agent.charge_usd, Decimal("0"))),
    )
    if not admitted:
        await _record_quota_signal(
            session,
            client_id=client_id,
            agent_code=agent_code,
            signal="quota_exceeded",
            content_item_id=content_item_id,
        )
        raise BudgetExceeded("Client or agent budget would be exceeded")
    if _projected_warning(overall, estimated_customer_charge_usd) or _projected_warning(
        agent, estimated_customer_charge_usd
    ):
        try:
            await _record_quota_signal(
                session,
                client_id=client_id,
                agent_code=agent_code,
                signal="quota_warning",
                content_item_id=content_item_id,
            )
        except Exception:
            await active_store.release(reservation)
            raise
    return reservation


async def finalize_budget_reservation(
    store: ReservationStore | None,
    reservation: BudgetReservation | None,
) -> None:
    if reservation is None:
        return
    await (store or default_reservation_store()).release(reservation)


def maximum_text_units(messages: list[dict], max_output_tokens: int) -> dict[str, int]:
    """Bound text/vision tokens without relying on provider tokenization."""

    if max_output_tokens < 0:
        raise ValueError("max output tokens must be non-negative")
    encoded = json.dumps(
        messages, ensure_ascii=False, separators=(",", ":"), default=str
    ).encode("utf-8")
    return {
        "input_tokens": max(len(encoded), 1),
        "output_tokens": max_output_tokens,
    }


def maximum_image_units(*, has_source_image: bool) -> dict[str, int]:
    return {
        "images": 1,
        "source_images": 1 if has_source_image else 0,
        "image_edits": 1 if has_source_image else 0,
        "image_generations": 0 if has_source_image else 1,
    }


def maximum_embedding_units(text_value: str, dimensions: int) -> dict[str, int]:
    if dimensions <= 0:
        raise ValueError("embedding dimensions must be positive")
    return {
        "input_tokens": max(len(text_value.encode("utf-8")), 1),
        "dimensions": dimensions,
    }


def _unit_cost(raw_rate: object, amount: int) -> Decimal | None:
    if isinstance(raw_rate, Mapping):
        if "price_usd" not in raw_rate:
            return None
        raw_price = raw_rate["price_usd"]
        raw_per_units = raw_rate.get("per_units", 1)
    else:
        raw_price = raw_rate
        raw_per_units = 1
    try:
        price = Decimal(str(raw_price))
        per_units = Decimal(str(raw_per_units))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if not price.is_finite() or not per_units.is_finite():
        return None
    if price < 0 or per_units <= 0:
        return None
    return Decimal(amount) * price / per_units


async def estimate_customer_charge(
    session: AsyncSession,
    *,
    provider: str,
    model: str,
    usage_category: str,
    maximum_units: dict[str, int],
    multiplier: Decimal,
    at: datetime | None = None,
) -> Decimal | None:
    """Conservatively price bounded request units from the active snapshot."""

    now = at or datetime.now(UTC)
    snapshot = await session.scalar(
        select(PricingSnapshot)
        .where(
            PricingSnapshot.provider == provider,
            PricingSnapshot.model == model,
            PricingSnapshot.usage_category == usage_category,
            PricingSnapshot.effective_from <= now,
            (PricingSnapshot.effective_to.is_(None))
            | (PricingSnapshot.effective_to > now),
        )
        .order_by(PricingSnapshot.effective_from.desc())
        .limit(1)
    )
    if snapshot is None:
        return None
    if not multiplier.is_finite() or multiplier < 0:
        raise ValueError("multiplier must be finite and non-negative")
    actual = Decimal("0")
    for unit, amount in maximum_units.items():
        if isinstance(amount, bool) or not isinstance(amount, int) or amount < 0:
            raise ValueError("maximum units must be non-negative integers")
        if amount == 0:
            continue
        price = snapshot.unit_prices.get(unit)
        if price is None:
            return None
        unit_cost = _unit_cost(price, amount)
        if unit_cost is None:
            return None
        actual += unit_cost
    return actual * multiplier
