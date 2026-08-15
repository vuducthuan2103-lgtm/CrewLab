"""Customer-charge budget status and pre-provider reservation controls.

Postgres is the financial source of truth. Redis only coordinates short-lived,
integer-cent reservations between workers so a concurrent stale read cannot
admit more spend than a client or agent cap allows.
"""

from __future__ import annotations

import asyncio
import calendar
import os
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_CEILING
from typing import Protocol
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.usage import PricingSnapshot, UsageCostAdjustment, UsageEvent


WARNING_PERCENT = Decimal("80")
CENT = Decimal("0.01")
RESERVATION_TTL_SECONDS = 30 * 60


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


class ReservationStore(Protocol):
    async def reserve(
        self, reservation: BudgetReservation, *, client_limit_cents: int | None,
        agent_limit_cents: int | None, client_committed_cents: int,
        agent_committed_cents: int,
    ) -> bool: ...

    async def release(self, reservation: BudgetReservation) -> None: ...


class InMemoryReservationStore:
    """Deterministic adapter used by tests; production injects Redis."""

    def __init__(self) -> None:
        self._entries: dict[str, BudgetReservation] = {}
        self._lock = asyncio.Lock()

    async def reserve(self, reservation: BudgetReservation, *, client_limit_cents: int | None, agent_limit_cents: int | None, client_committed_cents: int, agent_committed_cents: int) -> bool:
        async with self._lock:
            self._purge(datetime.now(UTC))
            if reservation.reservation_id in self._entries:
                return True
            client_reserved = sum(r.amount_cents for r in self._entries.values() if r.client_key == reservation.client_key)
            agent_reserved = sum(r.amount_cents for r in self._entries.values() if r.agent_key == reservation.agent_key)
            if client_limit_cents is not None and client_committed_cents + client_reserved + reservation.amount_cents > client_limit_cents:
                return False
            if agent_limit_cents is not None and agent_committed_cents + agent_reserved + reservation.amount_cents > agent_limit_cents:
                return False
            self._entries[reservation.reservation_id] = reservation
            return True

    async def release(self, reservation: BudgetReservation) -> None:
        async with self._lock:
            self._entries.pop(reservation.reservation_id, None)

    def _purge(self, now: datetime) -> None:
        for key, item in list(self._entries.items()):
            if item.expires_at <= now:
                self._entries.pop(key, None)


_RESERVE_LUA = """
local function purge(hash_key, counter_key, now)
  local rows = redis.call('HGETALL', hash_key)
  for index = 1, #rows, 2 do
    local parts = {}
    for value in string.gmatch(rows[index + 1], '([^|]+)') do table.insert(parts, value) end
    if tonumber(parts[2]) <= now then
      redis.call('HINCRBY', counter_key, rows[index], -tonumber(parts[1]))
      redis.call('HDEL', hash_key, rows[index])
    end
  end
end
purge(KEYS[1], KEYS[3], tonumber(ARGV[3])); purge(KEYS[2], KEYS[4], tonumber(ARGV[3]))
if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then return 1 end
local client_total = tonumber(redis.call('GET', KEYS[3]) or '0')
local agent_total = tonumber(redis.call('GET', KEYS[4]) or '0')
if tonumber(ARGV[4]) >= 0 and client_total + tonumber(ARGV[2]) > tonumber(ARGV[4]) then return 0 end
if tonumber(ARGV[5]) >= 0 and agent_total + tonumber(ARGV[2]) > tonumber(ARGV[5]) then return 0 end
local value = ARGV[2] .. '|' .. ARGV[6]
redis.call('HSET', KEYS[1], ARGV[1], value); redis.call('HSET', KEYS[2], ARGV[1], value)
redis.call('INCRBY', KEYS[3], tonumber(ARGV[2])); redis.call('INCRBY', KEYS[4], tonumber(ARGV[2]))
for index = 1, 4 do redis.call('EXPIRE', KEYS[index], tonumber(ARGV[7])) end
return 1
"""

_RELEASE_LUA = """
local function release(hash_key, counter_key, reservation_id)
  local value = redis.call('HGET', hash_key, reservation_id)
  if not value then return end
  local amount = tonumber(string.match(value, '^([^|]+)'))
  redis.call('HINCRBY', counter_key, -amount); redis.call('HDEL', hash_key, reservation_id)
end
release(KEYS[1], KEYS[3], ARGV[1]); release(KEYS[2], KEYS[4], ARGV[1]); return 1
"""


class RedisReservationStore:
    """Production reservation adapter using one atomic script for both caps."""

    def __init__(self, client) -> None:
        self._client = client

    @staticmethod
    def _keys(reservation: BudgetReservation) -> list[str]:
        return [
            f"{reservation.client_key}:members", f"{reservation.agent_key}:members",
            f"{reservation.client_key}:cents", f"{reservation.agent_key}:cents",
        ]

    async def reserve(self, reservation: BudgetReservation, *, client_limit_cents: int | None, agent_limit_cents: int | None, client_committed_cents: int, agent_committed_cents: int) -> bool:
        # Limits are reduced by committed Postgres spend before the script runs.
        client_remaining = -1 if client_limit_cents is None else max(client_limit_cents - client_committed_cents, 0)
        agent_remaining = -1 if agent_limit_cents is None else max(agent_limit_cents - agent_committed_cents, 0)
        now = datetime.now(UTC)
        ttl = max(1, int((reservation.expires_at - now).total_seconds()))
        result = await self._client.eval(
            _RESERVE_LUA, 4, *self._keys(reservation), reservation.reservation_id,
            reservation.amount_cents, int(now.timestamp()), client_remaining,
            agent_remaining, int(reservation.expires_at.timestamp()), ttl,
        )
        return bool(int(result))

    async def release(self, reservation: BudgetReservation) -> None:
        await self._client.eval(_RELEASE_LUA, 4, *self._keys(reservation), reservation.reservation_id)


_default_store: RedisReservationStore | None = None


def default_reservation_store() -> RedisReservationStore:
    """Use the existing Celery Redis lifecycle; no second daemon is introduced."""

    global _default_store
    if _default_store is None:
        import redis.asyncio as redis

        _default_store = RedisReservationStore(
            redis.from_url(os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"), decode_responses=True)
        )
    return _default_store


def month_bounds(now: datetime, timezone_name: str) -> tuple[str, datetime, datetime]:
    """Return local YYYY-MM and the corresponding half-open UTC interval."""

    try:
        zone = ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, TypeError):
        zone = ZoneInfo("Asia/Ho_Chi_Minh")
    local = now.astimezone(zone)
    start_local = local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_day = calendar.monthrange(local.year, local.month)[1]
    end_local = (start_local.replace(day=last_day) + timedelta(days=1))
    return start_local.strftime("%Y-%m"), start_local.astimezone(UTC), end_local.astimezone(UTC)


def cents(value: Decimal) -> int:
    if value < 0:
        raise ValueError("budget amounts must be non-negative")
    return int((value / CENT).to_integral_value(rounding=ROUND_CEILING))


def budget_state(charge: Decimal, budget: Decimal | None) -> BudgetStatus:
    if budget is None:
        return BudgetStatus("", charge, None, None, None, "not_configured")
    if budget < 0:
        raise ValueError("budget cannot be negative")
    percentage = Decimal("100") if budget == 0 else (charge / budget * Decimal("100"))
    state = "exceeded" if percentage >= 100 else "warning" if percentage >= WARNING_PERCENT else "normal"
    return BudgetStatus("", charge, budget, budget - charge, percentage, state)


async def _charge_sum(session: AsyncSession, *, client_id: uuid.UUID, start: datetime, end: datetime, agent_code: str | None = None) -> Decimal:
    filters = [UsageEvent.client_id == client_id, UsageEvent.started_at >= start, UsageEvent.started_at < end, UsageEvent.customer_charge_usd.is_not(None)]
    if agent_code is not None:
        filters.append(UsageEvent.agent_code == agent_code)
    total = await session.scalar(select(func.coalesce(func.sum(UsageEvent.customer_charge_usd), 0)).where(*filters))
    # Adjustments are client-attributable through their immutable event.
    adjustment_filters = [UsageEvent.client_id == client_id, UsageEvent.started_at >= start, UsageEvent.started_at < end]
    if agent_code is not None:
        adjustment_filters.append(UsageEvent.agent_code == agent_code)
    adjustments = await session.scalar(select(func.coalesce(func.sum(UsageCostAdjustment.customer_charge_delta_usd), 0)).join(UsageEvent, UsageCostAdjustment.usage_event_id == UsageEvent.id).where(*adjustment_filters))
    return Decimal(str(total or 0)) + Decimal(str(adjustments or 0))


async def get_budget_statuses(session: AsyncSession, *, client_id: uuid.UUID, now: datetime | None = None) -> tuple[BudgetStatus, dict[str, BudgetStatus]]:
    client = await session.get(Client, client_id)
    if client is None:
        raise ValueError("client not found")
    _month, start, end = month_bounds(now or datetime.now(UTC), client.timezone)
    total = await _charge_sum(session, client_id=client_id, start=start, end=end)
    overall = budget_state(total, Decimal(str(client.monthly_budget_usd)) if client.monthly_budget_usd is not None else None)
    overall = BudgetStatus("client", overall.charge_usd, overall.budget_usd, overall.remaining_usd, overall.percentage, overall.state)
    configs = list((await session.execute(select(ClientLLMConfig).where(ClientLLMConfig.client_id == client_id, ClientLLMConfig.is_active.is_(True)))).scalars())
    agents: dict[str, BudgetStatus] = {}
    for config in configs:
        charge = await _charge_sum(session, client_id=client_id, start=start, end=end, agent_code=config.agent_code)
        status = budget_state(charge, Decimal(str(config.budget_usd)) if config.budget_usd is not None else None)
        agents[config.agent_code] = BudgetStatus(config.agent_code, status.charge_usd, status.budget_usd, status.remaining_usd, status.percentage, status.state)
    return overall, agents


async def admit_budget(session: AsyncSession, *, usage_event_id: uuid.UUID, client_id: uuid.UUID, agent_code: str, estimated_customer_charge_usd: Decimal | None, store: ReservationStore, now: datetime | None = None) -> BudgetReservation | None:
    """Reserve both caps before any external provider call, or raise."""

    overall, agents = await get_budget_statuses(session, client_id=client_id, now=now)
    agent = agents.get(agent_code, BudgetStatus(agent_code, Decimal("0"), None, None, None, "not_configured"))
    if overall.budget_usd is None and agent.budget_usd is None:
        return None
    if estimated_customer_charge_usd is None:
        raise BudgetEstimateUnavailable("A configured budget needs a conservative estimate")
    if estimated_customer_charge_usd < 0:
        raise ValueError("estimated customer charge cannot be negative")
    current = now or datetime.now(UTC)
    client = await session.get(Client, client_id)
    if client is None:
        raise ValueError("client not found")
    month, _start, end = month_bounds(current, client.timezone)
    reservation = BudgetReservation(
        reservation_id=str(usage_event_id),
        client_key=f"crewlab:budget:client:{client_id}:{month}",
        agent_key=f"crewlab:budget:agent:{client_id}:{agent_code}:{month}",
        amount_cents=cents(estimated_customer_charge_usd),
        expires_at=max(end + timedelta(minutes=5), current + timedelta(seconds=RESERVATION_TTL_SECONDS)),
    )
    admitted = await store.reserve(
        reservation,
        client_limit_cents=cents(overall.budget_usd) if overall.budget_usd is not None else None,
        agent_limit_cents=cents(agent.budget_usd) if agent.budget_usd is not None else None,
        client_committed_cents=cents(max(overall.charge_usd, Decimal("0"))),
        agent_committed_cents=cents(max(agent.charge_usd, Decimal("0"))),
    )
    if not admitted:
        raise BudgetExceeded("Client or agent budget would be exceeded")
    return reservation


async def finalize_budget_reservation(store: ReservationStore, reservation: BudgetReservation | None) -> None:
    if reservation is not None:
        await store.release(reservation)


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
    """Conservatively price bounded request units from 0024a's active snapshot."""

    now = at or datetime.now(UTC)
    snapshot = await session.scalar(
        select(PricingSnapshot)
        .where(
            PricingSnapshot.provider == provider,
            PricingSnapshot.model == model,
            PricingSnapshot.usage_category == usage_category,
            PricingSnapshot.effective_from <= now,
            (PricingSnapshot.effective_to.is_(None)) | (PricingSnapshot.effective_to > now),
        )
        .order_by(PricingSnapshot.effective_from.desc())
    )
    if snapshot is None:
        return None
    actual = Decimal("0")
    for unit, amount in maximum_units.items():
        if amount < 0:
            raise ValueError("maximum units must be non-negative")
        price = snapshot.unit_prices.get(unit)
        if price is None:
            # A snapshot lacking a billable unit cannot safely bound this request.
            return None
        actual += Decimal(str(price)) * Decimal(amount)
    return actual * multiplier
