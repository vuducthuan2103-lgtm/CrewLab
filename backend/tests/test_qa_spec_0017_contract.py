"""Independent acceptance probes regenerated from Specs 0014 and 0017."""
import os
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

os.environ["CREWLAB_LLM_MOCK"] = "true"

from app.agents.a01.dispatcher import handle_event
from app.agents.a01.schemas import WakeReason
from app.agents.d01.schemas import ImageBrief
from app.agents.d01 import executor as d01_executor
from app.agents.d01.executor import execute_d01
from app.agents.d02 import executor as d02_executor
from app.agents.d02.executor import execute_d02
from app.agents.e01 import executor as e01_executor
from app.agents.e01.executor import execute_e01
from app.models.assets import BrandAsset
from app.models.content import ContentItem
from app.models.clients import Client
from app.models.reviews import AgentMemory
from app.models.system import TaskLog
from app.services.a01_chat import run_a01_chat
from app.services.context_packet import build_context_packet
from app.services.task_errors import classify_task_error
from scripts.seed_bardinh import seed_bardinh


def test_d01_visual_intent_separates_every_required_spec_field():
    """Spec 0017 FR-006 requires these concerns to be structured separately."""
    required_fields = {
        "visual_mode",
        "rationale",
        "required_subject",
        "preferred_setting",
        "composition_notes",
        "mood",
        "avoid",
        "platform_format",
        "desired_text_treatment",
        "desired_alteration",
    }

    assert required_fields <= set(ImageBrief.model_fields)


@pytest.mark.asyncio
async def test_recovery_uses_the_approved_retry_wake_reason(db_session):
    """Spec 0014 AC-07 permits scheduled, task_assigned and retry only."""
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Recovery contract",
        platform="facebook",
        status="visual_matching",
        image_brief={"visual_mode": "visual_required"},
    )
    db_session.add(item)
    await db_session.commit()

    instructions = await handle_event(
        db_session,
        client.id,
        "recover_d02",
        cycle.id,
        item.id,
    )

    assert instructions[0].payload["wake_reason"] == WakeReason.retry.value


@pytest.mark.asyncio
async def test_duplicate_d02_delivery_reuses_completed_visual_decision(
    db_session, monkeypatch
):
    """Spec 0017 idempotency edge case forbids duplicate derivatives."""
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="One derivative only",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "A coffee product",
            "mood": "warm",
            "suggested_tags": ["unique-no-match"],
            "composition_notes": "square product shot",
            "avoid": [],
            "visual_mode": "visual_required",
        },
    )
    db_session.add(item)
    await db_session.commit()
    packet = (await build_context_packet(db_session, client.id)).model_dump()

    first = await execute_d02(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )
    first_derivative = first.image_brief["d02_provenance"]["derivative_asset_id"]

    async def unexpected_side_effect(*_args, **_kwargs):
        raise AssertionError("D02 redelivery must not call LLM, retrieval or generation")

    monkeypatch.setattr(d02_executor, "call_llm", unexpected_side_effect)
    monkeypatch.setattr(d02_executor, "query_media_library", unexpected_side_effect)
    monkeypatch.setattr(d02_executor, "generate_image_ai", unexpected_side_effect)

    second = await execute_d02(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )
    derivatives = (
        await db_session.execute(
            select(BrandAsset).where(
                BrandAsset.client_id == client.id,
                BrandAsset.source == "d02_ai_derivative",
            )
        )
    ).scalars().all()

    assert second.image_brief["d02_provenance"]["derivative_asset_id"] == first_derivative
    assert len(derivatives) == 1


@pytest.mark.asyncio
async def test_d02_persists_final_visual_technical_validation_outcome(db_session):
    """Spec 0017 FR-019 requires the final visual validation outcome to be auditable."""
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Auditable derivative validation",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "A polished coffee product visual",
            "mood": "warm",
            "suggested_tags": ["unique-no-match"],
            "composition_notes": "square product shot",
            "avoid": [],
            "visual_mode": "visual_required",
        },
    )
    db_session.add(item)
    await db_session.commit()
    packet = (await build_context_packet(db_session, client.id)).model_dump()

    completed = await execute_d02(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )

    validation = completed.image_brief["d02_provenance"].get("technical_validation")
    assert isinstance(validation, dict)
    assert validation.get("passed") is True
    assert validation.get("format")


@pytest.mark.asyncio
async def test_a01_chat_enqueue_failure_has_structured_dispatch_task_log(
    db_session,
    monkeypatch,
):
    """Spec 0017 FR-003 requires dispatch failures to be categorized and logged."""
    from app.tasks import orchestrator_tasks

    client = Client(name="Dispatch Failure", brand_name="Dispatch Failure", is_active=True)
    db_session.add(client)
    await db_session.commit()

    def fail_enqueue(**_kwargs):
        raise ConnectionError("broker unavailable")

    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", fail_enqueue)
    memory, dispatch_status = await run_a01_chat(
        db_session,
        client.id,
        "Viết bài Facebook giới thiệu cold brew cuối tuần này",
    )

    failure = await db_session.scalar(
        select(TaskLog).where(
            TaskLog.client_id == client.id,
            TaskLog.agent_code == "A01",
            TaskLog.status == "failed",
        )
    )
    assert dispatch_status == "pending"
    assert memory.task_type.endswith(":pending")
    assert failure is not None
    assert failure.error_code == "DISPATCH_FAILED"


@pytest.mark.asyncio
async def test_recovery_requeues_a01_chat_item_whose_initial_dispatch_is_pending(
    db_session,
    monkeypatch,
):
    """An accepted A01 task must not remain planned forever after broker failure."""
    from app.tasks import orchestrator_tasks

    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Pending A01 dispatch",
        platform="facebook",
        status="planned",
        image_brief={"source": "a01_chat"},
        updated_at=datetime.now(UTC) - timedelta(minutes=20),
    )
    db_session.add(item)
    await db_session.flush()
    db_session.add(
        AgentMemory(
            client_id=client.id,
            content_item_id=item.id,
            agent_code="A01",
            task_type="portal_chat:create_content:pending",
            input_summary="Create content",
            output_summary="Accepted",
        )
    )
    await db_session.commit()
    queued = []
    monkeypatch.setattr(
        orchestrator_tasks.a01_handle_trigger,
        "delay",
        lambda **kwargs: queued.append(kwargs),
    )

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 1
    assert queued == [
        {
            "client_id": str(client.id),
            "event_type": "a01_chat_task_created",
            "cycle_id": str(cycle.id),
            "content_item_id": str(item.id),
        }
    ]


@pytest.mark.asyncio
async def test_recovery_advances_completed_d02_derivative_to_e01(db_session, monkeypatch):
    """A crash after D02 commit but before E01 enqueue must not generate twice."""
    from app.tasks import orchestrator_tasks

    client, cycle = await seed_bardinh(db_session)
    derivative_id = "11111111-1111-4111-8111-111111111111"
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="D02 committed before worker crash",
        platform="facebook",
        status="visual_generating",
        image_url=f"{client.id}/derivatives/{derivative_id}.png",
        image_brief={
            "visual_mode": "visual_required",
            "d02_provenance": {
                "derivative_asset_id": derivative_id,
                "generation_mode": "minimal_edit",
            },
        },
        updated_at=datetime.now(UTC) - timedelta(minutes=20),
    )
    db_session.add(item)
    await db_session.commit()
    queued = []
    monkeypatch.setattr(
        orchestrator_tasks.a01_handle_trigger,
        "delay",
        lambda **kwargs: queued.append(kwargs),
    )

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 1
    assert queued[0]["event_type"] == "recover_e01"


@pytest.mark.asyncio
async def test_recovery_resumes_e01_failure_committed_before_retry_dispatch(
    db_session, monkeypatch
):
    """An E01 crash after persisting eval_failed must still route the correction."""
    from app.tasks import orchestrator_tasks

    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="E01 failed before retry dispatch",
        platform="facebook",
        status="eval_failed",
        eval_retry_count=1,
        failed_criteria=["image_design_quality"],
        fix_instructions="Increase contrast",
        updated_at=datetime.now(UTC) - timedelta(minutes=20),
    )
    db_session.add(item)
    await db_session.commit()
    queued = []
    monkeypatch.setattr(
        orchestrator_tasks.a01_handle_trigger,
        "delay",
        lambda **kwargs: queued.append(kwargs),
    )

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 1
    assert queued[0]["event_type"] == "eval_failed"


@pytest.mark.asyncio
async def test_duplicate_e01_delivery_reuses_completed_evaluation(db_session, monkeypatch):
    """A duplicate Celery delivery must not reopen HITL or add an eval attempt."""
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Evaluate once",
        platform="facebook",
        status="visual_generating",
        caption="A finished caption",
        image_url="https://example.test/final.png",
        image_brief={"visual_mode": "visual_required"},
    )
    db_session.add(item)
    await db_session.commit()
    packet = (await build_context_packet(db_session, client.id)).model_dump()

    first = await execute_e01(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )
    assert first.status == "pending_content_approval"

    async def unexpected_llm(*_args, **_kwargs):
        raise AssertionError("Completed E01 delivery must not call the LLM again")

    monkeypatch.setattr(e01_executor, "call_llm", unexpected_llm)
    second = await execute_e01(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )

    assert second.status == "pending_content_approval"


@pytest.mark.asyncio
async def test_duplicate_d01_delivery_reuses_completed_caption(db_session, monkeypatch):
    """A duplicate initial D01 delivery must not rewrite an accepted caption result."""
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Write once",
        platform="facebook",
        status="planned",
    )
    db_session.add(item)
    await db_session.commit()
    packet = (await build_context_packet(db_session, client.id)).model_dump()

    first = await execute_d01(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )
    original_caption = first.caption

    async def unexpected_llm(*_args, **_kwargs):
        raise AssertionError("Completed D01 delivery must not call the LLM again")

    monkeypatch.setattr(d01_executor, "call_llm", unexpected_llm)
    second = await execute_d01(
        db_session,
        client.id,
        cycle.id,
        item.id,
        packet,
        "task_assigned",
    )

    assert second.caption == original_caption
    assert second.status == "visual_matching"



def test_sqlalchemy_database_outage_has_database_error_category():
    """Spec 0017 FR-003 requires DB failures to differ from generic execution."""
    error = OperationalError("SELECT 1", {}, ConnectionRefusedError("db offline"))

    classified = classify_task_error(error)

    assert classified.code == "DATABASE_UNAVAILABLE"
    assert classified.retryable is True
