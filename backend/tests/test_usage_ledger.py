import uuid
from dataclasses import fields
from decimal import Decimal
from unittest.mock import Mock

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core import llm
from app.core.db import Base
from app.models.clients import Client
from app.models.usage import UsageEvent
from app.services.usage_ledger import (
    BeginUsageEventCommand,
    BillingClassification,
    FinalizeUsageEventCommand,
    UsageCategory,
    UsageEventStatus,
    UsageLedgerUnavailable,
    begin_usage_event,
    finalize_usage_event,
    sanitize_error_category,
)


@pytest_asyncio.fixture
async def ledger_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    client_id = uuid.uuid4()
    async with factory() as session:
        session.add(
            Client(
                id=client_id,
                name="Usage Ledger Test",
                brand_name="Usage Ledger Test",
                is_active=True,
            )
        )
        await session.commit()

    yield factory, client_id
    await engine.dispose()


def _begin_command(
    *,
    event_key: str,
    client_id: uuid.UUID,
    parent_event_id: uuid.UUID | None = None,
) -> BeginUsageEventCommand:
    return BeginUsageEventCommand(
        event_key=event_key,
        client_id=client_id,
        parent_event_id=parent_event_id,
        agent_code="D01",
        task_type="llm_call",
        wake_reason="task_assigned",
        provider="openai",
        model="gpt-5-mini",
        usage_category=UsageCategory.TEXT,
        environment="production",
        is_production=True,
        billing_classification=BillingClassification.CUSTOMER_BILLABLE,
    )


@pytest.mark.asyncio
async def test_begin_database_failure_prevents_provider_mock_call(monkeypatch):
    """AC-01: admission persistence is a hard precondition for provider work."""

    class FailingSessionContext:
        async def __aenter__(self):
            raise SQLAlchemyError("ledger unavailable")

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    def failing_factory():
        return FailingSessionContext()

    provider_mock = Mock(wraps=llm._mock_llm_response)
    monkeypatch.setattr(llm, "_mock_llm_response", provider_mock)
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "true")

    with pytest.raises(UsageLedgerUnavailable, match="admission failed"):
        await llm.call_llm(
            client_id=uuid.uuid4(),
            agent_code="D01",
            messages=[{"role": "user", "content": "must not reach provider"}],
            usage_event_key="llm:db-admission-failure",
            usage_session_factory=failing_factory,
        )

    assert provider_mock.call_count == 0


@pytest.mark.asyncio
async def test_event_key_replay_is_one_event_and_one_provider_admission(
    ledger_store, monkeypatch
):
    """AC-01: application replay cannot create a second event or provider call."""
    factory, client_id = ledger_store
    provider_mock = Mock(wraps=llm._mock_llm_response)
    monkeypatch.setattr(llm, "_mock_llm_response", provider_mock)
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "true")

    await llm.call_llm(
        client_id=client_id,
        agent_code="D01",
        messages=[{"role": "user", "content": "same logical request"}],
        usage_event_key="llm:stable-replay-key",
        usage_session_factory=factory,
    )

    with pytest.raises(llm.LLMUsageReplayError, match="provider call was suppressed"):
        await llm.call_llm(
            client_id=client_id,
            agent_code="D01",
            messages=[{"role": "user", "content": "same logical request"}],
            usage_event_key="llm:stable-replay-key",
            usage_session_factory=factory,
        )

    async with factory() as session:
        event_count = await session.scalar(select(func.count()).select_from(UsageEvent))

    assert event_count == 1
    assert provider_mock.call_count == 1


@pytest.mark.asyncio
async def test_provider_request_replay_has_only_one_charged_event(ledger_store):
    """AC-01/02: provider identity deduplicates financial evidence."""
    factory, client_id = ledger_store
    first = await begin_usage_event(
        _begin_command(event_key="llm:first", client_id=client_id),
        session_factory=factory,
    )
    second = await begin_usage_event(
        _begin_command(event_key="llm:provider-replay", client_id=client_id),
        session_factory=factory,
    )

    first_result = await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=first.usage_event_id,
            provider_request_id="provider-request-001",
            status=UsageEventStatus.SUCCEEDED,
            usage_units={"input_tokens": 100, "output_tokens": 20},
            provider_reported_cost_usd=Decimal("0.010000000001"),
        ),
        session_factory=factory,
    )
    replay_result = await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=second.usage_event_id,
            provider_request_id="provider-request-001",
            status=UsageEventStatus.SUCCEEDED,
            usage_units={"input_tokens": 100, "output_tokens": 20},
            provider_reported_cost_usd=Decimal("0.010000000001"),
        ),
        session_factory=factory,
    )

    async with factory() as session:
        events = list((await session.scalars(select(UsageEvent))).all())

    charged_events = [event for event in events if event.customer_charge_usd]
    cancelled = next(event for event in events if event.id == second.usage_event_id)
    assert replay_result.usage_event_id == first_result.usage_event_id
    assert len(charged_events) == 1
    assert cancelled.status == "cancelled"
    assert Decimal(cancelled.customer_charge_usd) == Decimal("0E-12")


@pytest.mark.asyncio
async def test_retry_event_has_distinct_identity_and_parent_correlation(ledger_store):
    """AC-02: a billed retry is separate but linked to its initial request."""
    factory, client_id = ledger_store
    initial = await begin_usage_event(
        _begin_command(event_key="llm:initial", client_id=client_id),
        session_factory=factory,
    )
    retry = await begin_usage_event(
        _begin_command(
            event_key="llm:retry",
            client_id=client_id,
            parent_event_id=initial.usage_event_id,
        ),
        session_factory=factory,
    )

    for event_id, request_id in (
        (initial.usage_event_id, "provider-initial"),
        (retry.usage_event_id, "provider-retry"),
    ):
        await finalize_usage_event(
            FinalizeUsageEventCommand(
                usage_event_id=event_id,
                provider_request_id=request_id,
                status=UsageEventStatus.SUCCEEDED,
                usage_units={"input_tokens": 10, "output_tokens": 5},
                provider_reported_cost_usd="0.01",
            ),
            session_factory=factory,
        )

    async with factory() as session:
        retry_row = await session.get(UsageEvent, retry.usage_event_id)
        total_charge = await session.scalar(
            select(func.sum(UsageEvent.customer_charge_usd))
        )

    assert retry.usage_event_id != initial.usage_event_id
    assert retry_row.parent_event_id == initial.usage_event_id
    assert Decimal(total_charge) == Decimal("0.022000000000")


@pytest.mark.asyncio
async def test_ledger_schema_and_error_path_reject_forbidden_payloads(ledger_store):
    """FR-008/012: financial rows contain correlation and sanitized codes only."""
    factory, client_id = ledger_store
    forbidden_names = {
        "prompt",
        "prompt_text",
        "response",
        "response_text",
        "api_key",
        "authorization",
        "headers",
        "raw_exception",
        "error_message",
    }
    command_fields = {
        field.name for field in fields(BeginUsageEventCommand)
    } | {field.name for field in fields(FinalizeUsageEventCommand)}
    ledger_columns = {column.name for column in UsageEvent.__table__.columns}
    raw_secret = "Authorization: Bearer sk-secret prompt=private response=private"
    error_code = sanitize_error_category(RuntimeError(raw_secret))

    admission = await begin_usage_event(
        _begin_command(event_key="llm:sanitized-error", client_id=client_id),
        session_factory=factory,
    )
    await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=admission.usage_event_id,
            status=UsageEventStatus.FAILED,
            usage_units={},
            error_code=error_code,
        ),
        session_factory=factory,
    )
    async with factory() as session:
        event = await session.get(UsageEvent, admission.usage_event_id)
        persisted_values = {
            column.name: getattr(event, column.name)
            for column in UsageEvent.__table__.columns
        }

    assert forbidden_names.isdisjoint(command_fields)
    assert forbidden_names.isdisjoint(ledger_columns)
    assert event.error_code == "provider_error"
    assert "sk-secret" not in repr(persisted_values)
    assert "prompt=private" not in repr(persisted_values)
