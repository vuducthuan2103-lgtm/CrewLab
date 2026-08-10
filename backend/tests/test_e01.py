"""Tests for Agent E01 Evaluator and retry-loop behavior."""
import os
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.core.db import Base
from app.models.clients import Client, BrandSetting
from app.models.content import WorkflowCycle, ContentPillar, ContentItem, ContentItemStateLog, ContentItemEvalAttempt
from app.models.system import TaskLog
from app.agents.e01.executor import execute_e01, _resolve_image_url
from app.agents.a01.dispatcher import handle_event
from app.agents.a01.retry_routing import determine_retry_route

# Set mock mode for LLM tests
os.environ["CREWLAB_LLM_MOCK"] = "true"

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def sample_data(async_session: AsyncSession):
    client = Client(name="Test Cafe", brand_name="Test Cafe", is_active=True)
    async_session.add(client)
    await async_session.commit()
    await async_session.refresh(client)

    setting = BrandSetting(
        client_id=client.id,
        is_current=True,
        brand_voice_short="Thân thiện, gần gũi",
        tone_of_voice="Ấm áp",
        target_audience="Giới trẻ",
        allow_ai_images=False,
    )
    cycle = WorkflowCycle(client_id=client.id, phase="content_production", status="active")
    async_session.add_all([setting, cycle])
    await async_session.commit()
    await async_session.refresh(cycle)

    pillar = ContentPillar(
        client_id=client.id,
        cycle_id=cycle.id,
        name="Product Spotlight",
        description="Giới thiệu đồ uống đặc trưng",
    )
    async_session.add(pillar)
    await async_session.commit()
    await async_session.refresh(pillar)

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        pillar_id=pillar.id,
        topic="Cold Brew Mùa Hè",
        platform="facebook",
        status="visual_generating",
        caption="Cold brew giải nhiệt mùa hè cực mát lạnh!",
        image_brief={
            "description": "Ly cold brew mát lạnh",
            "mood": "Tươi mát",
            "suggested_tags": ["cold brew", "cà phê"],
        },
        image_url="https://example.com/coldbrew.jpg",
    )
    async_session.add(item)
    await async_session.commit()
    await async_session.refresh(item)

    return {
        "client": client,
        "cycle": cycle,
        "pillar": pillar,
        "item": item,
    }


@pytest.mark.asyncio
async def test_e01_executor_pass(async_session: AsyncSession, sample_data: dict):
    client = sample_data["client"]
    cycle = sample_data["cycle"]
    item = sample_data["item"]

    context_packet = {
        "identity": {
            "brand_voice_short": "Thân thiện",
            "personality_keywords": ["gần gũi"],
        },
        "episodic": [],
    }

    # Execute E01 (Mock mode returns PASS)
    updated_item = await execute_e01(
        session=async_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
    )

    assert updated_item.status == "pending_content_approval"
    assert updated_item.eval_score_caption == 8.5
    assert updated_item.eval_score_visual == 4.2

    # Check attempt history
    stmt = select(ContentItemEvalAttempt).where(ContentItemEvalAttempt.content_item_id == item.id)
    res = await async_session.execute(stmt)
    attempts = res.scalars().all()

    assert len(attempts) == 1
    assert attempts[0].attempt_number == 1
    assert attempts[0].overall_passed is True
    assert attempts[0].caption_score == 8.5
    assert attempts[0].visual_score == 4.2


@pytest.mark.asyncio
async def test_e01_executor_fail(async_session: AsyncSession, sample_data: dict):
    client = sample_data["client"]
    cycle = sample_data["cycle"]
    item = sample_data["item"]

    context_packet = {
        "identity": {"brand_voice_short": "Thân thiện"},
        "episodic": [],
    }

    # Pass mock_key in context_packet if needed or test fail flow
    # Temporarily monkeypatch mock to return fail or test flow
    import app.agents.e01.executor as e01_exec
    original_call_llm = e01_exec.call_llm

    async def mock_fail_call_llm(*args, **kwargs):
        kwargs["mock_key"] = "E01_fail"
        return await original_call_llm(*args, **kwargs)

    e01_exec.call_llm = mock_fail_call_llm

    try:
        updated_item = await execute_e01(
            session=async_session,
            client_id=client.id,
            cycle_id=cycle.id,
            content_item_id=item.id,
            context_packet=context_packet,
        )

        assert updated_item.status == "eval_failed"
        assert updated_item.eval_retry_count == 1
        assert "brand_voice" in updated_item.failed_criteria
        assert "[Caption]" in updated_item.fix_instructions

        # Check attempt history
        stmt = select(ContentItemEvalAttempt).where(ContentItemEvalAttempt.content_item_id == item.id)
        res = await async_session.execute(stmt)
        attempts = res.scalars().all()

        assert len(attempts) == 1
        assert attempts[0].attempt_number == 1
        assert attempts[0].overall_passed is False
        assert "brand_voice" in attempts[0].failed_criteria
    finally:
        e01_exec.call_llm = original_call_llm


@pytest.mark.asyncio
async def test_retry_limit_transitions_to_rejected(async_session: AsyncSession, sample_data: dict):
    client = sample_data["client"]
    cycle = sample_data["cycle"]
    item = sample_data["item"]

    item.status = "eval_failed"
    item.eval_retry_count = 3  # Hard fail limit reached
    item.failed_criteria = ["brand_voice", "mobile_readability"]
    await async_session.commit()

    instructions = await handle_event(
        session=async_session,
        client_id=client.id,
        event_type="eval_failed",
        cycle_id=cycle.id,
        content_item_id=item.id,
    )

    # Should return empty instructions (no auto-dispatch)
    assert len(instructions) == 0

    # Item should transition to 'rejected' terminal state
    await async_session.refresh(item)
    assert item.status == "rejected"

    # Check state log
    stmt = select(ContentItemStateLog).where(
        ContentItemStateLog.content_item_id == item.id,
        ContentItemStateLog.new_state == "rejected",
    )
    res = await async_session.execute(stmt)
    logs = res.scalars().all()
    assert len(logs) == 1
    assert "Hard fail" in logs[0].reason

    # Check task log
    stmt_task = select(TaskLog).where(
        TaskLog.content_item_id == item.id,
        TaskLog.task_type == "eval_hard_fail",
    )
    res_task = await async_session.execute(stmt_task)
    task_logs = res_task.scalars().all()
    assert len(task_logs) == 1
    assert task_logs[0].status == "terminal"


def test_retry_routing_criteria_mapping():
    # Caption criteria -> D01
    assert determine_retry_route(["brand_voice"]) == "D01"
    assert determine_retry_route(["content_accuracy"]) == "D01"
    assert determine_retry_route(["platform_fit"]) == "D01"
    assert determine_retry_route(["pillar_relevance"]) == "D01"
    assert determine_retry_route(["originality"]) == "D01"

    # Visual criteria -> D02
    assert determine_retry_route(["visual_asset_fit"]) == "D02"
    assert determine_retry_route(["image_design_quality"]) == "D02"
    assert determine_retry_route(["mobile_readability"]) == "D02"

    # Both -> D01 first
    assert determine_retry_route(["brand_voice", "mobile_readability"]) == "D01"


@pytest.mark.asyncio
async def test_resolve_image_url_public_and_none():
    assert await _resolve_image_url(None) is None
    assert await _resolve_image_url("https://example.com/image.png") == "https://example.com/image.png"
