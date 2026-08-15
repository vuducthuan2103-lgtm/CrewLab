import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.system import TaskLog
from app.models.usage import PricingSnapshot, UsageCostAdjustment, UsageEvent
from app.services.budget_enforcement import (
    BudgetEstimateUnavailable,
    BudgetExceeded,
    BudgetReservation,
    InMemoryReservationStore,
    RedisReservationStore,
    admit_budget,
    budget_state,
    cents,
    estimate_customer_charge,
    finalize_budget_reservation,
    get_budget_statuses,
    month_bounds,
)


NOW = datetime(2026, 8, 15, 8, 0, tzinfo=UTC)


@pytest_asyncio.fixture
async def budget_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    client_id = uuid.uuid4()
    async with factory() as session:
        session.add_all(
            [
                Client(
                    id=client_id,
                    name="Budget Test",
                    brand_name="Budget Test",
                    is_active=True,
                    timezone="Asia/Ho_Chi_Minh",
                    monthly_budget_usd=Decimal("10.00"),
                ),
                ClientLLMConfig(
                    client_id=client_id,
                    agent_code="D01",
                    provider="openai",
                    model="gpt-5-mini",
                    tier="standard",
                    budget_usd=Decimal("10.00"),
                    is_active=True,
                ),
            ]
        )
        await session.commit()

    yield factory, client_id
    await engine.dispose()


def _event(
    *,
    client_id: uuid.UUID,
    charge: str,
    started_at: datetime = NOW,
    agent_code: str = "D01",
) -> UsageEvent:
    return UsageEvent(
        event_key=f"budget:{uuid.uuid4()}",
        client_id=client_id,
        agent_code=agent_code,
        task_type="llm_call",
        wake_reason="task_assigned",
        provider="openai",
        model="gpt-5-mini",
        usage_category="text",
        usage_units={"input_tokens": 1},
        environment="production",
        is_production=True,
        billing_classification="customer_billable",
        status="succeeded",
        cost_status="final",
        cost_source="provider_reported",
        multiplier_snapshot=Decimal("1.10000000"),
        multiplier_source="global_default",
        actual_cost_usd=Decimal(charge) / Decimal("1.10"),
        customer_charge_usd=Decimal(charge),
        started_at=started_at,
        completed_at=started_at,
    )


async def _set_caps(
    factory,
    client_id: uuid.UUID,
    *,
    client: str | None,
    agent: str | None,
) -> None:
    async with factory() as session:
        client_row = await session.get(Client, client_id)
        config = await session.scalar(
            select(ClientLLMConfig).where(
                ClientLLMConfig.client_id == client_id,
                ClientLLMConfig.agent_code == "D01",
            )
        )
        client_row.monthly_budget_usd = Decimal(client) if client is not None else None
        config.budget_usd = Decimal(agent) if agent is not None else None
        await session.commit()


@pytest.mark.parametrize(
    ("charge", "expected_state", "expected_percentage"),
    [
        ("7.99", "normal", Decimal("79.9")),
        ("8.00", "warning", Decimal("80")),
        ("9.99", "warning", Decimal("99.9")),
        ("10.00", "exceeded", Decimal("100")),
    ],
)
def test_thresholds_use_exact_customer_charge(charge, expected_state, expected_percentage):
    """AC-0024B-01/02: 80% warns and 100% exceeds with no fuzzy boundary."""
    status = budget_state(Decimal(charge), Decimal("10.00"))

    assert status.state == expected_state
    assert status.percentage == expected_percentage


def test_unconfigured_and_zero_budget_have_distinct_states():
    """AC-0024B-02/03: missing configuration is unknown; zero is exhausted."""
    missing = budget_state(Decimal("0"), None)
    zero = budget_state(Decimal("0"), Decimal("0"))

    assert (missing.state, missing.percentage, missing.remaining_usd) == (
        "not_configured",
        None,
        None,
    )
    assert (zero.state, zero.percentage, zero.remaining_usd) == (
        "exceeded",
        Decimal("100"),
        Decimal("0"),
    )


def test_reservations_round_up_to_integer_cents():
    """AC-0024B-04: a fractional cent can never be under-reserved."""
    assert cents(Decimal("0.000001")) == 1
    assert cents(Decimal("1.230001")) == 124


@pytest.mark.asyncio
async def test_client_and_agent_statuses_use_charge_plus_adjustments(budget_store):
    """AC-0024B-01: both scopes use canonical customer charge, including corrections."""
    factory, client_id = budget_store
    event = _event(client_id=client_id, charge="4.00")
    async with factory() as session:
        session.add(event)
        await session.flush()
        session.add(
            UsageCostAdjustment(
                usage_event_id=event.id,
                actual_cost_delta_usd=Decimal("0.25"),
                customer_charge_delta_usd=Decimal("1.00"),
                reason="approved customer charge correction",
                approved_by=uuid.uuid4(),
            )
        )
        await session.commit()

    async with factory() as session:
        overall, agents = await get_budget_statuses(
            session, client_id=client_id, now=NOW
        )

    assert overall.charge_usd == Decimal("5.000000000000")
    assert agents["D01"].charge_usd == overall.charge_usd
    assert agents["D01"].percentage == overall.percentage == Decimal("50")
    assert agents["D01"].remaining_usd == overall.remaining_usd == Decimal("5")


@pytest.mark.asyncio
async def test_warning_status_does_not_block_new_work(budget_store):
    """AC-0024B-02: reaching 80% is a warning gate, not a rejection gate."""
    factory, client_id = budget_store
    async with factory() as session:
        session.add(_event(client_id=client_id, charge="8.00"))
        await session.commit()

    reservations = InMemoryReservationStore()
    async with factory() as session:
        overall, _ = await get_budget_statuses(session, client_id=client_id, now=NOW)
        reservation = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.10"),
            store=reservations,
            now=NOW,
        )
        warning = await session.scalar(
            select(TaskLog).where(
                TaskLog.client_id == client_id,
                TaskLog.status == "quota_warning",
            )
        )

    assert overall.state == "warning"
    assert reservation is not None
    assert warning.error_code == "quota_warning"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("client_cap", "agent_cap"),
    [
        pytest.param("1.00", "2.00", id="client-total-exhausted"),
        pytest.param("2.00", "1.00", id="agent-exhausted"),
    ],
)
async def test_either_exhausted_cap_rejects_admission(
    budget_store, client_cap, agent_cap
):
    """AC-0024B-03: client-total and agent caps independently fail closed."""
    factory, client_id = budget_store
    await _set_caps(
        factory, client_id, client=client_cap, agent=agent_cap
    )
    async with factory() as session:
        session.add(_event(client_id=client_id, charge="1.00"))
        await session.commit()

    async with factory() as session:
        with pytest.raises(BudgetExceeded):
            await admit_budget(
                session,
                usage_event_id=uuid.uuid4(),
                client_id=client_id,
                agent_code="D01",
                estimated_customer_charge_usd=Decimal("0.01"),
                store=InMemoryReservationStore(),
                now=NOW,
            )


@pytest.mark.asyncio
async def test_missing_estimate_fails_closed_only_when_a_cap_exists(budget_store):
    """AC-0024B-02/03: configured caps reject an unsafe zero estimate."""
    factory, client_id = budget_store
    async with factory() as session:
        with pytest.raises(BudgetEstimateUnavailable):
            await admit_budget(
                session,
                usage_event_id=uuid.uuid4(),
                client_id=client_id,
                agent_code="D01",
                estimated_customer_charge_usd=None,
                store=InMemoryReservationStore(),
                now=NOW,
            )

    await _set_caps(factory, client_id, client=None, agent=None)
    async with factory() as session:
        reservation = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=None,
            store=InMemoryReservationStore(),
            now=NOW,
        )

    assert reservation is None


@pytest.mark.asyncio
async def test_concurrent_admissions_share_one_atomic_capacity_decision(budget_store):
    """AC-0024B-04: concurrent workers cannot both pass the same stale read."""
    factory, client_id = budget_store
    await _set_caps(factory, client_id, client="1.00", agent="1.00")
    reservations = InMemoryReservationStore()
    admission_time = datetime.now(UTC)

    async def attempt():
        async with factory() as session:
            try:
                return await admit_budget(
                    session,
                    usage_event_id=uuid.uuid4(),
                    client_id=client_id,
                    agent_code="D01",
                    estimated_customer_charge_usd=Decimal("0.60"),
                    store=reservations,
                    now=admission_time,
                )
            except BudgetExceeded as error:
                return error

    outcomes = await asyncio.gather(attempt(), attempt())

    assert sum(isinstance(item, BudgetReservation) for item in outcomes) == 1
    assert sum(isinstance(item, BudgetExceeded) for item in outcomes) == 1


@pytest.mark.asyncio
async def test_reservation_replay_and_release_are_idempotent():
    """AC-0024B-04/05: retries do not double-reserve or double-release."""
    store = InMemoryReservationStore()
    reservation = BudgetReservation(
        reservation_id="stable-event-key",
        client_key="client:august",
        agent_key="agent:august",
        amount_cents=60,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    arguments = {
        "client_limit_cents": 100,
        "agent_limit_cents": 100,
        "client_committed_cents": 0,
        "agent_committed_cents": 0,
    }

    assert await store.reserve(reservation, **arguments) is True
    assert await store.reserve(reservation, **arguments) is True
    await store.release(reservation)
    await store.release(reservation)
    replacement = BudgetReservation(
        reservation_id="replacement",
        client_key=reservation.client_key,
        agent_key=reservation.agent_key,
        amount_cents=100,
        expires_at=reservation.expires_at,
    )
    assert await store.reserve(replacement, **arguments) is True


@pytest.mark.asyncio
async def test_expired_crash_reservation_releases_capacity():
    """AC-0024B-05: a dead worker cannot hold budget capacity permanently."""
    store = InMemoryReservationStore()
    expired = BudgetReservation(
        reservation_id="crashed-worker",
        client_key="client:august",
        agent_key="agent:august",
        amount_cents=80,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    current = BudgetReservation(
        reservation_id="replacement-worker",
        client_key=expired.client_key,
        agent_key=expired.agent_key,
        amount_cents=100,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    arguments = {
        "client_limit_cents": 100,
        "agent_limit_cents": 100,
        "client_committed_cents": 0,
        "agent_committed_cents": 0,
    }

    assert await store.reserve(expired, **arguments) is True
    assert await store.reserve(current, **arguments) is True


@pytest.mark.asyncio
async def test_redis_lua_atomically_reserves_releases_and_recovers_expired_entries():
    """AC-0024B-04/05: production Lua preserves cap and counter invariants."""
    import os

    import redis.asyncio as redis
    from redis.exceptions import RedisError

    redis_client = redis.from_url(
        os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
        decode_responses=True,
        socket_connect_timeout=1,
        socket_timeout=2,
    )
    try:
        try:
            await redis_client.ping()
        except (RedisError, OSError) as error:
            pytest.skip(f"Redis is unreachable: {type(error).__name__}")

        scope = str(uuid.uuid4())
        client_key = f"crewlab:test:budget:{scope}:client:2026-08"
        agent_key = f"crewlab:test:budget:{scope}:agent:D01:2026-08"
        store = RedisReservationStore(redis_client)
        future = datetime.now(UTC) + timedelta(minutes=5)
        template = BudgetReservation(
            reservation_id="key-template",
            client_key=client_key,
            agent_key=agent_key,
            amount_cents=0,
            expires_at=future,
            scope_expires_at=future,
        )
        exact_keys = RedisReservationStore._keys(template)
        arguments = {
            "client_limit_cents": 100,
            "agent_limit_cents": 100,
            "client_committed_cents": 0,
            "agent_committed_cents": 0,
        }

        try:
            first = BudgetReservation(
                reservation_id=f"{scope}:concurrent:first",
                client_key=client_key,
                agent_key=agent_key,
                amount_cents=60,
                expires_at=future,
                scope_expires_at=future,
            )
            second = BudgetReservation(
                reservation_id=f"{scope}:concurrent:second",
                client_key=client_key,
                agent_key=agent_key,
                amount_cents=60,
                expires_at=future,
                scope_expires_at=future,
            )

            outcomes = await asyncio.gather(
                store.reserve(first, **arguments),
                store.reserve(second, **arguments),
            )

            assert sorted(outcomes) == [False, True]
            admitted = first if outcomes[0] else second
            assert await store.reserve(admitted, **arguments) is True
            assert await redis_client.mget(exact_keys[2], exact_keys[3]) == [
                "60",
                "60",
            ]

            await store.release(admitted)
            await store.release(admitted)
            full_capacity = BudgetReservation(
                reservation_id=f"{scope}:full-capacity",
                client_key=client_key,
                agent_key=agent_key,
                amount_cents=100,
                expires_at=future,
                scope_expires_at=future,
            )
            assert await store.reserve(full_capacity, **arguments) is True
            await store.release(full_capacity)

            expired = BudgetReservation(
                reservation_id=f"{scope}:expired-worker",
                client_key=client_key,
                agent_key=agent_key,
                amount_cents=80,
                expires_at=datetime.now(UTC) - timedelta(seconds=1),
                scope_expires_at=future,
            )
            assert await store.reserve(expired, **arguments) is True
            assert await redis_client.mget(exact_keys[2], exact_keys[3]) == [
                "80",
                "80",
            ]

            recovered = BudgetReservation(
                reservation_id=f"{scope}:after-recovery",
                client_key=client_key,
                agent_key=agent_key,
                amount_cents=100,
                expires_at=future,
                scope_expires_at=future,
            )
            assert await store.reserve(recovered, **arguments) is True
            assert await redis_client.mget(exact_keys[2], exact_keys[3]) == [
                "100",
                "100",
            ]
            assert await redis_client.hlen(exact_keys[0]) == 1
            assert await redis_client.hlen(exact_keys[1]) == 1
            assert await redis_client.hexists(
                exact_keys[0], recovered.reservation_id
            )
            assert await redis_client.hexists(
                exact_keys[1], recovered.reservation_id
            )

            await store.release(recovered)
            assert await redis_client.mget(exact_keys[2], exact_keys[3]) == [
                "0",
                "0",
            ]
            assert await redis_client.hlen(exact_keys[0]) == 0
            assert await redis_client.hlen(exact_keys[1]) == 0
        finally:
            await redis_client.delete(*exact_keys)
    finally:
        await redis_client.aclose()


@pytest.mark.asyncio
async def test_final_charge_reconciles_reserved_capacity(budget_store):
    """AC-0024B-04/05: release uses finalized ledger charge, not the estimate."""
    factory, client_id = budget_store
    await _set_caps(factory, client_id, client="1.00", agent="1.00")
    store = InMemoryReservationStore()
    first_id = uuid.uuid4()

    async with factory() as session:
        first = await admit_budget(
            session,
            usage_event_id=first_id,
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.80"),
            store=store,
            now=NOW,
        )
        session.add(_event(client_id=client_id, charge="0.40"))
        await session.commit()

    await finalize_budget_reservation(store, first)
    async with factory() as session:
        second = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.60"),
            store=store,
            now=NOW,
        )

    assert second is not None


@pytest.mark.asyncio
async def test_final_overage_blocks_subsequent_work_after_release(budget_store):
    """AC-0024B-04: an actual overage is ledger truth after reservation release."""
    factory, client_id = budget_store
    await _set_caps(factory, client_id, client="1.00", agent="1.00")
    store = InMemoryReservationStore()
    async with factory() as session:
        reservation = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.50"),
            store=store,
            now=NOW,
        )
        session.add(_event(client_id=client_id, charge="1.10"))
        await session.commit()

    await finalize_budget_reservation(store, reservation)
    async with factory() as session:
        with pytest.raises(BudgetExceeded):
            await admit_budget(
                session,
                usage_event_id=uuid.uuid4(),
                client_id=client_id,
                agent_code="D01",
                estimated_customer_charge_usd=Decimal("0.01"),
                store=store,
                now=NOW,
            )


@pytest.mark.asyncio
async def test_budget_update_is_visible_to_new_admission_within_five_minutes(budget_store):
    """AC-0024B-06: newly admitted work observes a committed cap change immediately."""
    factory, client_id = budget_store
    await _set_caps(factory, client_id, client="2.00", agent="2.00")
    store = InMemoryReservationStore()
    async with factory() as session:
        old = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.50"),
            store=store,
            now=NOW,
        )
    await finalize_budget_reservation(store, old)
    await _set_caps(factory, client_id, client="0.25", agent="0.25")

    async with factory() as session:
        with pytest.raises(BudgetExceeded):
            await admit_budget(
                session,
                usage_event_id=uuid.uuid4(),
                client_id=client_id,
                agent_code="D01",
                estimated_customer_charge_usd=Decimal("0.50"),
                store=store,
                now=NOW + timedelta(minutes=4, seconds=59),
            )


@pytest.mark.asyncio
async def test_pricing_and_multiplier_change_the_conservative_estimate(budget_store):
    """AC-0024B-06: admission estimate uses effective 0024a price and multiplier."""
    factory, _client_id = budget_store
    async with factory() as session:
        session.add(
            PricingSnapshot(
                provider="openai",
                model="gpt-5-mini",
                usage_category="text",
                currency="USD",
                unit_prices={
                    "input_tokens": {"price_usd": "0.10", "per_units": "1000"},
                    "output_tokens": {"price_usd": "0.20", "per_units": "1000"},
                },
                version="budget-estimate-v1",
                source_reference="test fixture",
                effective_from=NOW - timedelta(minutes=1),
            )
        )
        await session.commit()
        estimate = await estimate_customer_charge(
            session,
            provider="openai",
            model="gpt-5-mini",
            usage_category="text",
            maximum_units={"input_tokens": 100, "output_tokens": 20},
            multiplier=Decimal("1.50"),
            at=NOW,
        )

    assert estimate == Decimal("0.021")


def test_month_bounds_use_client_timezone_at_exact_boundary():
    """AC-0024B-07: one UTC instant maps to one client-local calendar month."""
    before = datetime(2026, 7, 31, 16, 59, 59, 999999, tzinfo=UTC)
    boundary = datetime(2026, 7, 31, 17, 0, 0, tzinfo=UTC)

    july, july_start, july_end = month_bounds(before, "Asia/Ho_Chi_Minh")
    august, august_start, _august_end = month_bounds(
        boundary, "Asia/Ho_Chi_Minh"
    )

    assert july == "2026-07"
    assert august == "2026-08"
    assert july_end == august_start == boundary
    assert july_start < before < july_end


@pytest.mark.asyncio
async def test_reservations_use_the_same_client_local_month_boundary(budget_store):
    """AC-0024B-07: reservation keys flip once at the client's local midnight."""
    factory, client_id = budget_store
    before = datetime(2026, 7, 31, 16, 59, 59, 999999, tzinfo=UTC)
    boundary = datetime(2026, 7, 31, 17, 0, 0, tzinfo=UTC)
    store = InMemoryReservationStore()

    async with factory() as session:
        july = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.01"),
            store=store,
            now=before,
        )
        august = await admit_budget(
            session,
            usage_event_id=uuid.uuid4(),
            client_id=client_id,
            agent_code="D01",
            estimated_customer_charge_usd=Decimal("0.01"),
            store=store,
            now=boundary,
        )

    assert july.client_key.endswith(":2026-07")
    assert july.agent_key.endswith(":2026-07")
    assert august.client_key.endswith(":2026-08")
    assert august.agent_key.endswith(":2026-08")


@pytest.mark.asyncio
async def test_ledger_event_is_counted_in_exactly_one_client_local_month(budget_store):
    """AC-0024B-07: status aggregation uses half-open local-month UTC bounds."""
    factory, client_id = budget_store
    async with factory() as session:
        session.add_all(
            [
                _event(
                    client_id=client_id,
                    charge="1.00",
                    started_at=datetime(2026, 7, 31, 16, 59, 59, tzinfo=UTC),
                ),
                _event(
                    client_id=client_id,
                    charge="2.00",
                    started_at=datetime(2026, 7, 31, 17, 0, 0, tzinfo=UTC),
                ),
            ]
        )
        await session.commit()

    async with factory() as session:
        july, _ = await get_budget_statuses(
            session,
            client_id=client_id,
            now=datetime(2026, 7, 15, tzinfo=UTC),
        )
        august, _ = await get_budget_statuses(
            session,
            client_id=client_id,
            now=datetime(2026, 8, 15, tzinfo=UTC),
        )

    assert july.charge_usd == Decimal("1.000000000000")
    assert august.charge_usd == Decimal("2.000000000000")
