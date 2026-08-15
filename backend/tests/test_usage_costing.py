import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core import llm
from app.core.db import Base
from app.models.clients import Client
from app.models.usage import (
    ChargeMultiplierConfig,
    PricingSnapshot,
    UsageCostAdjustment,
    UsageEvent,
)
from app.services.usage_ledger import (
    BeginUsageEventCommand,
    BillingClassification,
    FinalizeUsageEventCommand,
    RecordUsageAdjustmentCommand,
    UsageCategory,
    UsageEventStatus,
    UsageValidationError,
    begin_usage_event,
    finalize_usage_event,
    quantize_multiplier,
    record_usage_adjustment,
)


USD_QUANTUM = Decimal("0.000000000001")


@pytest_asyncio.fixture
async def costing_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    client_id = uuid.uuid4()
    async with factory() as session:
        session.add(
            Client(
                id=client_id,
                name="Costing Test",
                brand_name="Costing Test",
                is_active=True,
            )
        )
        await session.commit()

    yield factory, client_id
    await engine.dispose()


def _begin_command(
    *,
    event_key: str,
    client_id: uuid.UUID | None,
    started_at: datetime | None = None,
    provider: str = "openai",
    model: str = "gpt-5-mini",
    environment: str = "production",
    is_production: bool = True,
    billing_classification: BillingClassification = (
        BillingClassification.CUSTOMER_BILLABLE
    ),
) -> BeginUsageEventCommand:
    return BeginUsageEventCommand(
        event_key=event_key,
        client_id=client_id,
        agent_code="D01",
        task_type="llm_call",
        wake_reason="task_assigned",
        provider=provider,
        model=model,
        usage_category=UsageCategory.TEXT,
        environment=environment,
        is_production=is_production,
        billing_classification=billing_classification,
        started_at=started_at,
    )


async def _finalize_with_provider_cost(
    factory,
    event_id: uuid.UUID,
    *,
    request_id: str,
    cost: str,
    status: UsageEventStatus = UsageEventStatus.SUCCEEDED,
):
    return await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=event_id,
            provider_request_id=request_id,
            status=status,
            usage_units={"input_tokens": 100, "output_tokens": 25},
            provider_reported_cost_usd=cost,
            error_code=("provider_timeout" if status == UsageEventStatus.FAILED else None),
        ),
        session_factory=factory,
    )


@pytest.mark.asyncio
async def test_provider_reported_cost_precedes_matching_pricing_snapshot(costing_store):
    """AC-03: provider billing evidence wins and keeps ledger precision."""
    factory, client_id = costing_store
    started_at = datetime(2026, 8, 15, 8, 0, tzinfo=timezone.utc)
    async with factory() as session:
        session.add(
            PricingSnapshot(
                provider="openai",
                model="gpt-5-mini",
                usage_category="text",
                currency="USD",
                unit_prices={
                    "input_tokens": {"price_usd": "99", "per_units": "1"},
                    "output_tokens": {"price_usd": "99", "per_units": "1"},
                },
                version="deliberately-expensive-fallback",
                source_reference="test-fixture",
                effective_from=started_at - timedelta(days=1),
            )
        )
        await session.commit()

    admission = await begin_usage_event(
        _begin_command(
            event_key="cost:provider-precedence",
            client_id=client_id,
            started_at=started_at,
        ),
        session_factory=factory,
    )
    result = await _finalize_with_provider_cost(
        factory,
        admission.usage_event_id,
        request_id="provider-cost-001",
        cost="0.123456789123",
    )

    expected_charge = (Decimal("0.123456789123") * Decimal("1.10")).quantize(
        USD_QUANTUM, rounding=ROUND_HALF_UP
    )
    assert result.cost_source == "provider_reported"
    assert result.cost_status == "final"
    assert result.actual_cost_usd == Decimal("0.123456789123")
    assert result.customer_charge_usd == expected_charge


@pytest.mark.asyncio
async def test_versioned_pricing_snapshot_fallback_is_reproducible(costing_store):
    """AC-03: fallback cost records its exact version and decimal calculation."""
    factory, client_id = costing_store
    started_at = datetime(2026, 8, 15, 9, 0, tzinfo=timezone.utc)
    async with factory() as session:
        snapshot = PricingSnapshot(
            provider="openai",
            model="gpt-5-mini",
            usage_category="text",
            currency="USD",
            unit_prices={
                "input_tokens": {"price_usd": "0.15", "per_units": "1000000"},
                "output_tokens": {"price_usd": "0.60", "per_units": "1000000"},
            },
            version="2026-08-15",
            source_reference="provider-pricing-test-fixture",
            effective_from=started_at - timedelta(hours=1),
        )
        session.add(snapshot)
        await session.commit()
        snapshot_id = snapshot.id

    admission = await begin_usage_event(
        _begin_command(
            event_key="cost:snapshot-fallback",
            client_id=client_id,
            started_at=started_at,
        ),
        session_factory=factory,
    )
    result = await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=admission.usage_event_id,
            provider_request_id="snapshot-request-001",
            status=UsageEventStatus.SUCCEEDED,
            usage_units={"input_tokens": 1234, "output_tokens": 567},
        ),
        session_factory=factory,
    )

    expected = (
        Decimal(1234) * Decimal("0.15") / Decimal(1_000_000)
        + Decimal(567) * Decimal("0.60") / Decimal(1_000_000)
    ).quantize(USD_QUANTUM, rounding=ROUND_HALF_UP)
    async with factory() as session:
        event = await session.get(UsageEvent, admission.usage_event_id)
        persisted_snapshot = await session.get(PricingSnapshot, snapshot_id)

    assert result.cost_source == "pricing_snapshot"
    assert result.cost_status == "provisional"
    assert result.actual_cost_usd == expected
    assert event.pricing_snapshot_id == snapshot_id
    assert persisted_snapshot.version == "2026-08-15"


@pytest.mark.parametrize(
    "unit_prices",
    [
        pytest.param(
            {"input_tokens": {"price_usd": "-0.01", "per_units": "1000"}},
            id="negative-rate",
        ),
        pytest.param(
            {"input_tokens": {"price_usd": "0.01", "per_units": "0"}},
            id="zero-unit-basis",
        ),
        pytest.param(
            {"input_tokens": {"price_usd": "not-a-decimal", "per_units": "1000"}},
            id="non-decimal-rate",
        ),
    ],
)
@pytest.mark.asyncio
async def test_invalid_pricing_snapshot_is_rejected_without_finalizing_event(
    costing_store,
    unit_prices,
):
    """R-007: bounded invalid rates fail closed without inventing a cost."""
    factory, client_id = costing_store
    started_at = datetime(2026, 8, 15, 9, 30, tzinfo=timezone.utc)
    async with factory() as session:
        session.add(
            PricingSnapshot(
                provider="openai",
                model="gpt-5-mini",
                usage_category="text",
                currency="USD",
                unit_prices=unit_prices,
                version=f"invalid-{uuid.uuid4()}",
                source_reference="invalid-pricing-regression-fixture",
                effective_from=started_at - timedelta(minutes=1),
            )
        )
        await session.commit()

    admission = await begin_usage_event(
        _begin_command(
            event_key=f"cost:invalid-pricing:{uuid.uuid4()}",
            client_id=client_id,
            started_at=started_at,
        ),
        session_factory=factory,
    )
    with pytest.raises(UsageValidationError):
        await finalize_usage_event(
            FinalizeUsageEventCommand(
                usage_event_id=admission.usage_event_id,
                provider_request_id=f"invalid-pricing-request-{uuid.uuid4()}",
                status=UsageEventStatus.SUCCEEDED,
                usage_units={"input_tokens": 100},
            ),
            session_factory=factory,
        )

    async with factory() as session:
        event = await session.get(UsageEvent, admission.usage_event_id)

    assert event.status == "pending"
    assert event.cost_status == "pending"
    assert event.actual_cost_usd is None


@pytest.mark.asyncio
async def test_multiplier_default_and_effective_dated_overrides_are_prospective(
    costing_store,
):
    """AC-04/05: configuration changes never rewrite earlier snapshots."""
    factory, client_id = costing_store
    t1 = datetime(2026, 8, 15, 10, 0, tzinfo=timezone.utc)
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    actor = uuid.uuid4()
    async with factory() as session:
        session.add_all(
            [
                ChargeMultiplierConfig(
                    scope="client_override",
                    client_id=client_id,
                    multiplier=Decimal("1.25000000"),
                    effective_from=t2,
                    effective_to=t3,
                    changed_by=actor,
                    reason="first prospective override",
                ),
                ChargeMultiplierConfig(
                    scope="client_override",
                    client_id=client_id,
                    multiplier=Decimal("1.50000000"),
                    effective_from=t3,
                    effective_to=None,
                    changed_by=actor,
                    reason="second prospective override",
                ),
            ]
        )
        await session.commit()

    admissions = []
    for key, started_at in (
        ("multiplier:default", t1),
        ("multiplier:first-override", t2 + timedelta(minutes=1)),
        ("multiplier:second-override", t3 + timedelta(minutes=1)),
    ):
        admissions.append(
            await begin_usage_event(
                _begin_command(
                    event_key=key,
                    client_id=client_id,
                    started_at=started_at,
                ),
                session_factory=factory,
            )
        )

    for index, admission in enumerate(admissions):
        await _finalize_with_provider_cost(
            factory,
            admission.usage_event_id,
            request_id=f"multiplier-request-{index}",
            cost="1.00",
        )

    async with factory() as session:
        rows = list(
            (
                await session.scalars(
                    select(UsageEvent).where(
                        UsageEvent.id.in_([item.usage_event_id for item in admissions])
                    )
                )
            ).all()
        )
    by_key = {row.event_key: row for row in rows}

    assert Decimal(by_key["multiplier:default"].multiplier_snapshot) == Decimal(
        "1.10000000"
    )
    assert by_key["multiplier:default"].multiplier_source == "global_default"
    assert Decimal(
        by_key["multiplier:first-override"].multiplier_snapshot
    ) == Decimal("1.25000000")
    assert Decimal(
        by_key["multiplier:second-override"].multiplier_snapshot
    ) == Decimal("1.50000000")
    assert Decimal(
        by_key["multiplier:first-override"].customer_charge_usd
    ) == Decimal("1.250000000000")


@pytest.mark.asyncio
async def test_mock_call_is_nonproduction_nonbillable_and_zero_charge(
    costing_store, monkeypatch
):
    """AC-06: mock execution stays outside production/customer accounting."""
    factory, client_id = costing_store
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "true")
    monkeypatch.setenv("CREWLAB_ENVIRONMENT", "production")
    await llm.call_llm(
        client_id=client_id,
        agent_code="D01",
        messages=[{"role": "user", "content": "offline mock"}],
        usage_event_key="nonbillable:mock",
        usage_session_factory=factory,
    )

    async with factory() as session:
        event = await session.scalar(
            select(UsageEvent).where(UsageEvent.event_key == "nonbillable:mock")
        )

    assert event.is_production is False
    assert event.billing_classification == "internal_non_billable"
    assert Decimal(event.customer_charge_usd) == Decimal("0E-12")


@pytest.mark.asyncio
async def test_local_and_internal_usage_have_zero_customer_charge(costing_store):
    """AC-06: internal actual cost is retained while customer charge stays zero."""
    factory, client_id = costing_store

    internal = await begin_usage_event(
        _begin_command(
            event_key="nonbillable:internal",
            client_id=None,
            billing_classification=BillingClassification.INTERNAL_NON_BILLABLE,
        ),
        session_factory=factory,
    )
    await _finalize_with_provider_cost(
        factory,
        internal.usage_event_id,
        request_id="internal-request",
        cost="0.50",
    )

    local = await begin_usage_event(
        _begin_command(
            event_key="nonbillable:local",
            client_id=client_id,
            environment="local",
            is_production=False,
        ),
        session_factory=factory,
    )
    await _finalize_with_provider_cost(
        factory,
        local.usage_event_id,
        request_id="local-request",
        cost="0.50",
    )

    async with factory() as session:
        rows = list(
            (
                await session.scalars(
                    select(UsageEvent).where(
                        UsageEvent.event_key.in_(
                            [
                                "nonbillable:internal",
                                "nonbillable:local",
                            ]
                        )
                    )
                )
            ).all()
        )
    by_key = {row.event_key: row for row in rows}

    assert Decimal(by_key["nonbillable:internal"].actual_cost_usd) == Decimal(
        "0.500000000000"
    )
    assert Decimal(by_key["nonbillable:internal"].customer_charge_usd) == Decimal(
        "0E-12"
    )
    assert Decimal(by_key["nonbillable:local"].customer_charge_usd) == Decimal(
        "0E-12"
    )


@pytest.mark.asyncio
async def test_failed_billed_and_failed_unbilled_events_are_distinct(costing_store):
    """AC-07: workflow failure alone neither erases nor fabricates provider cost."""
    factory, client_id = costing_store
    billed = await begin_usage_event(
        _begin_command(event_key="failure:billed", client_id=client_id),
        session_factory=factory,
    )
    unbilled = await begin_usage_event(
        _begin_command(event_key="failure:unbilled", client_id=client_id),
        session_factory=factory,
    )

    billed_result = await _finalize_with_provider_cost(
        factory,
        billed.usage_event_id,
        request_id="failed-billed-request",
        cost="0.02",
        status=UsageEventStatus.FAILED,
    )
    unbilled_result = await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=unbilled.usage_event_id,
            provider_request_id="failed-unbilled-request",
            status=UsageEventStatus.FAILED,
            usage_units={},
            error_code="provider_timeout",
        ),
        session_factory=factory,
    )

    assert billed_result.cost_source == "provider_reported"
    assert billed_result.actual_cost_usd == Decimal("0.020000000000")
    assert billed_result.customer_charge_usd == Decimal("0.022000000000")
    assert unbilled_result.cost_source == "none"
    assert unbilled_result.actual_cost_usd == Decimal("0E-12")
    assert unbilled_result.customer_charge_usd == Decimal("0E-12")


@pytest.mark.asyncio
async def test_adjustments_append_without_mutating_original_event(costing_store):
    """AC-05: corrections are additional audit rows, not event rewrites."""
    factory, client_id = costing_store
    admission = await begin_usage_event(
        _begin_command(event_key="adjustment:original", client_id=client_id),
        session_factory=factory,
    )
    await _finalize_with_provider_cost(
        factory,
        admission.usage_event_id,
        request_id="adjustment-provider-request",
        cost="1.00",
    )
    async with factory() as session:
        original = await session.get(UsageEvent, admission.usage_event_id)
        original_amounts = (
            Decimal(original.actual_cost_usd),
            Decimal(original.customer_charge_usd),
        )

    for actual_delta, charge_delta, reason in (
        ("-0.10", "-0.11", "provider refund"),
        ("0.02", "0.022", "provider correction"),
    ):
        await record_usage_adjustment(
            RecordUsageAdjustmentCommand(
                usage_event_id=admission.usage_event_id,
                actual_cost_delta_usd=actual_delta,
                customer_charge_delta_usd=charge_delta,
                reason=reason,
                approved_by=uuid.uuid4(),
            ),
            session_factory=factory,
        )

    async with factory() as session:
        unchanged = await session.get(UsageEvent, admission.usage_event_id)
        adjustments = list(
            (
                await session.scalars(
                    select(UsageCostAdjustment).where(
                        UsageCostAdjustment.usage_event_id == admission.usage_event_id
                    )
                )
            ).all()
        )

    assert (
        Decimal(unchanged.actual_cost_usd),
        Decimal(unchanged.customer_charge_usd),
    ) == original_amounts
    assert len(adjustments) == 2
    assert {adjustment.reason for adjustment in adjustments} == {
        "provider refund",
        "provider correction",
    }


def test_negative_multiplier_is_rejected():
    with pytest.raises(UsageValidationError, match="cannot be negative"):
        quantize_multiplier("-0.00000001")
