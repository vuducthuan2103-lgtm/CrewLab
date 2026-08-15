import sys
import types
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core import llm
from app.core.db import Base
from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.usage import PricingSnapshot
from app.services.budget_enforcement import (
    BudgetEstimateUnavailable,
    BudgetExceeded,
    InMemoryReservationStore,
)


NOW = datetime(2026, 8, 15, 8, 0, tzinfo=UTC)


class TrackingReservationStore(InMemoryReservationStore):
    def __init__(self):
        super().__init__()
        self.reserved_ids: list[str] = []
        self.released_ids: list[str] = []

    async def reserve(self, reservation, **kwargs):
        accepted = await super().reserve(reservation, **kwargs)
        if accepted:
            self.reserved_ids.append(reservation.reservation_id)
        return accepted

    async def release(self, reservation):
        self.released_ids.append(reservation.reservation_id)
        await super().release(reservation)


@pytest_asyncio.fixture
async def llm_budget_store():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    client_id = uuid.uuid4()
    actor_id = uuid.uuid4()
    async with factory() as session:
        session.add_all(
            [
                Client(
                    id=client_id,
                    name="LLM Budget Test",
                    brand_name="LLM Budget Test",
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
                ClientLLMConfig(
                    client_id=client_id,
                    agent_code="D02",
                    provider="openai",
                    model="gpt-image-1-mini",
                    tier="fast",
                    budget_usd=Decimal("10.00"),
                    is_active=True,
                ),
                ClientProviderCredential(
                    client_id=client_id,
                    provider="openai",
                    encrypted_api_key="encrypted-test-key",
                    key_hint="test",
                    is_enabled=True,
                    validation_status="valid",
                    created_by=actor_id,
                    updated_by=actor_id,
                ),
                PricingSnapshot(
                    provider="openai",
                    model="gpt-5-mini",
                    usage_category="text",
                    currency="USD",
                    unit_prices={
                        "input_tokens": {"price_usd": "0.10", "per_units": "1000"},
                        "output_tokens": {"price_usd": "0.20", "per_units": "1000"},
                    },
                    version="text-budget-v1",
                    source_reference="test fixture",
                    effective_from=NOW - timedelta(days=1),
                ),
                PricingSnapshot(
                    provider="openai",
                    model="text-embedding-3-small",
                    usage_category="embedding",
                    currency="USD",
                    unit_prices={
                        "input_tokens": {"price_usd": "0.02", "per_units": "1000"},
                        "dimensions": {"price_usd": "0", "per_units": "1"},
                    },
                    version="embedding-budget-v1",
                    source_reference="test fixture",
                    effective_from=NOW - timedelta(days=1),
                ),
                PricingSnapshot(
                    provider="openai",
                    model="gpt-image-1-mini",
                    usage_category="image",
                    currency="USD",
                    unit_prices={
                        "images": {"price_usd": "0.01", "per_units": "1"},
                        "source_images": {"price_usd": "0", "per_units": "1"},
                        "image_edits": {"price_usd": "0", "per_units": "1"},
                        "image_generations": {"price_usd": "0", "per_units": "1"},
                    },
                    version="image-budget-v1",
                    source_reference="test fixture",
                    effective_from=NOW - timedelta(days=1),
                ),
            ]
        )
        await session.commit()

    yield factory, client_id
    await engine.dispose()


@pytest.fixture
def provider_module(monkeypatch):
    module = types.SimpleNamespace(
        acompletion=AsyncMock(),
        aembedding=AsyncMock(),
        aimage_generation=AsyncMock(),
        aimage_edit=AsyncMock(),
    )
    monkeypatch.setitem(sys.modules, "litellm", module)
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setenv("CREWLAB_ENVIRONMENT", "production")
    monkeypatch.setattr(
        llm,
        "get_credential_cipher",
        lambda: types.SimpleNamespace(decrypt=lambda _value: "sk-test"),
    )
    return module


async def _set_caps(
    factory,
    client_id: uuid.UUID,
    *,
    client_cap: str,
    agent_code: str,
    agent_cap: str,
) -> None:
    async with factory() as session:
        client = await session.get(Client, client_id)
        config = await session.scalar(
            select(ClientLLMConfig).where(
                ClientLLMConfig.client_id == client_id,
                ClientLLMConfig.agent_code == agent_code,
            )
        )
        client.monthly_budget_usd = Decimal(client_cap)
        config.budget_usd = Decimal(agent_cap)
        await session.commit()


def _completion_response(*, request_id: str = "budget-provider-request"):
    return types.SimpleNamespace(
        id=request_id,
        response_cost=Decimal("0.01"),
        usage=types.SimpleNamespace(prompt_tokens=10, completion_tokens=2),
        choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="ok"))],
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("client_cap", "agent_cap"),
    [
        pytest.param("0.00", "10.00", id="client-total-cap"),
        pytest.param("10.00", "0.00", id="agent-cap"),
    ],
)
async def test_text_call_blocks_before_provider_when_either_cap_is_exhausted(
    llm_budget_store,
    provider_module,
    client_cap,
    agent_cap,
):
    """AC-0024B-02/03: exhausted caps produce zero external text calls."""
    factory, client_id = llm_budget_store
    await _set_caps(
        factory,
        client_id,
        client_cap=client_cap,
        agent_code="D01",
        agent_cap=agent_cap,
    )

    async with factory() as session:
        with pytest.raises(BudgetExceeded):
            await llm.call_llm(
                client_id=client_id,
                agent_code="D01",
                messages=[{"role": "user", "content": "must not leave CrewLab"}],
                session=session,
                max_tokens=10,
                usage_event_key=f"budget:block:{uuid.uuid4()}",
                usage_session_factory=factory,
                budget_reservation_store=InMemoryReservationStore(),
            )

    assert provider_module.acompletion.call_count == 0


@pytest.mark.asyncio
async def test_embedding_and_image_paths_also_block_before_provider(
    llm_budget_store,
    provider_module,
):
    """AC-0024B-02/03: every billable provider surface shares the budget gate."""
    factory, client_id = llm_budget_store
    await _set_caps(
        factory,
        client_id,
        client_cap="0.00",
        agent_code="D02",
        agent_cap="10.00",
    )

    async with factory() as session:
        with pytest.raises(BudgetExceeded):
            await llm.create_asset_embedding(
                session=session,
                client_id=client_id,
                text_value="budget controlled semantic asset",
                usage_event_key=f"budget:embedding:{uuid.uuid4()}",
                usage_session_factory=factory,
                budget_reservation_store=InMemoryReservationStore(),
            )
        with pytest.raises(BudgetExceeded):
            await llm.generate_image(
                session=session,
                client_id=client_id,
                prompt="budget controlled image",
                usage_event_key=f"budget:image:{uuid.uuid4()}",
                usage_session_factory=factory,
                budget_reservation_store=InMemoryReservationStore(),
            )

    assert provider_module.aembedding.call_count == 0
    assert provider_module.aimage_generation.call_count == 0
    assert provider_module.aimage_edit.call_count == 0


@pytest.mark.asyncio
async def test_missing_safe_estimate_blocks_before_provider(
    llm_budget_store,
    provider_module,
):
    """AC-0024B-02/06: missing effective pricing never becomes a zero estimate."""
    factory, client_id = llm_budget_store
    async with factory() as session:
        await session.execute(
            delete(PricingSnapshot).where(
                PricingSnapshot.provider == "openai",
                PricingSnapshot.model == "gpt-5-mini",
                PricingSnapshot.usage_category == "text",
            )
        )
        await session.commit()

    async with factory() as session:
        with pytest.raises(BudgetEstimateUnavailable):
            await llm.call_llm(
                client_id=client_id,
                agent_code="D01",
                messages=[{"role": "user", "content": "unknown price"}],
                session=session,
                max_tokens=10,
                usage_event_key=f"budget:no-estimate:{uuid.uuid4()}",
                usage_session_factory=factory,
                budget_reservation_store=InMemoryReservationStore(),
            )

    assert provider_module.acompletion.call_count == 0


@pytest.mark.asyncio
async def test_success_finalizes_ledger_before_releasing_reservation(
    llm_budget_store,
    provider_module,
):
    """AC-0024B-04/05: successful calls release their temporary capacity."""
    factory, client_id = llm_budget_store
    store = TrackingReservationStore()
    provider_module.acompletion.return_value = _completion_response()

    async with factory() as session:
        response = await llm.call_llm(
            client_id=client_id,
            agent_code="D01",
            messages=[{"role": "user", "content": "complete normally"}],
            session=session,
            max_tokens=10,
            usage_event_key=f"budget:release-success:{uuid.uuid4()}",
            usage_session_factory=factory,
            budget_reservation_store=store,
        )

    assert response.content == "ok"
    assert len(store.reserved_ids) == 1
    assert store.released_ids == store.reserved_ids


@pytest.mark.asyncio
async def test_provider_failure_finalizes_then_releases_reservation(
    llm_budget_store,
    provider_module,
):
    """AC-0024B-05: provider errors do not strand reservation capacity."""
    factory, client_id = llm_budget_store
    store = TrackingReservationStore()
    provider_module.acompletion.side_effect = RuntimeError("provider timeout")

    async with factory() as session:
        with pytest.raises(RuntimeError, match="provider timeout"):
            await llm.call_llm(
                client_id=client_id,
                agent_code="D01",
                messages=[{"role": "user", "content": "provider will fail"}],
                session=session,
                max_tokens=10,
                usage_event_key=f"budget:release-error:{uuid.uuid4()}",
                usage_session_factory=factory,
                budget_reservation_store=store,
            )

    assert len(store.reserved_ids) == 1
    assert store.released_ids == store.reserved_ids
