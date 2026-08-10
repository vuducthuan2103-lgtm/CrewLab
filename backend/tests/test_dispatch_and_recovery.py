import types
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.agents.a01.schemas import DispatchInstruction
from app.models.content import ContentItem
from app.models.system import TaskLog
from app.services.task_errors import TaskDispatchError
from app.tasks import d01_tasks, d02_tasks, e01_tasks, orchestrator_tasks
from scripts.seed_bardinh import seed_bardinh


class _SessionContext:
    async def __aenter__(self):
        return object()

    async def __aexit__(self, _exc_type, _exc, _traceback):
        return False


def _payload():
    return {
        "client_id": str(uuid.uuid4()),
        "cycle_id": str(uuid.uuid4()),
        "content_item_id": str(uuid.uuid4()),
        "context_packet": {},
    }


def test_d01_completion_dispatches_d02_instruction(monkeypatch):
    payload = _payload()
    dispatched = []

    async def fake_execute(**_kwargs):
        return None

    async def fake_handle_event(**_kwargs):
        return [
            DispatchInstruction(
                agent_code="D02",
                idempotency_key="d02-key",
                payload=payload,
            )
        ]

    monkeypatch.setattr(d01_tasks, "AsyncSessionLocal", _SessionContext)
    monkeypatch.setattr(d01_tasks, "execute_d01", fake_execute)
    monkeypatch.setattr(d01_tasks, "handle_event", fake_handle_event)
    monkeypatch.setattr(d01_tasks, "dispatch_instructions", lambda instructions: dispatched.extend(instructions))

    d01_tasks.run_d01.run(payload)

    assert [instruction.agent_code for instruction in dispatched] == ["D02"]


def test_d02_completion_dispatches_e01_instruction(monkeypatch):
    payload = _payload()
    dispatched = []

    async def fake_execute(**_kwargs):
        return types.SimpleNamespace(status="visual_generating")

    async def fake_handle_event(**_kwargs):
        return [
            DispatchInstruction(
                agent_code="E01",
                idempotency_key="e01-key",
                payload=payload,
            )
        ]

    monkeypatch.setattr(d02_tasks, "AsyncSessionLocal", _SessionContext)
    monkeypatch.setattr(d02_tasks, "execute_d02", fake_execute)
    monkeypatch.setattr(d02_tasks, "handle_event", fake_handle_event)
    monkeypatch.setattr(d02_tasks, "dispatch_instructions", lambda instructions: dispatched.extend(instructions))

    d02_tasks.run_d02.run(payload)

    assert [instruction.agent_code for instruction in dispatched] == ["E01"]


@pytest.mark.parametrize("retry_agent", ["D01", "D02"])
def test_e01_failure_dispatches_a01_retry_instruction(monkeypatch, retry_agent):
    payload = _payload()
    dispatched = []

    async def fake_execute(**_kwargs):
        return types.SimpleNamespace(status="eval_failed")

    async def fake_handle_event(**kwargs):
        assert kwargs["event_type"] == "eval_failed"
        return [
            DispatchInstruction(
                agent_code=retry_agent,
                idempotency_key=f"{retry_agent.lower()}-retry",
                payload=payload,
            )
        ]

    monkeypatch.setattr(e01_tasks, "AsyncSessionLocal", _SessionContext)
    monkeypatch.setattr(e01_tasks, "execute_e01", fake_execute)
    monkeypatch.setattr(e01_tasks, "handle_event", fake_handle_event)
    monkeypatch.setattr(e01_tasks, "dispatch_instructions", lambda instructions: dispatched.extend(instructions))

    e01_tasks.run_e01.run(payload)

    assert [instruction.agent_code for instruction in dispatched] == [retry_agent]


def test_e01_pass_stops_at_hitl_without_downstream_agent(monkeypatch):
    payload = _payload()
    events = []

    async def fake_execute(**_kwargs):
        return types.SimpleNamespace(status="pending_content_approval")

    async def fake_handle_event(**kwargs):
        events.append(kwargs["event_type"])
        return []

    monkeypatch.setattr(e01_tasks, "AsyncSessionLocal", _SessionContext)
    monkeypatch.setattr(e01_tasks, "execute_e01", fake_execute)
    monkeypatch.setattr(e01_tasks, "handle_event", fake_handle_event)
    monkeypatch.setattr(
        e01_tasks,
        "dispatch_instructions",
        lambda instructions: pytest.fail("HITL pass must not dispatch another agent") if instructions else None,
    )

    e01_tasks.run_e01.run(payload)

    assert events == ["eval_passed"]


def test_d02_retry_context_reaches_executor(monkeypatch):
    payload = {
        **_payload(),
        "wake_reason": "retry",
        "failed_criteria": ["mobile_readability"],
        "fix_instructions": "Increase text contrast",
    }
    captured = {}

    async def fake_execute(**kwargs):
        captured.update(kwargs["context_packet"])
        return types.SimpleNamespace(status="visual_generating")

    async def fake_handle_event(**_kwargs):
        return []

    monkeypatch.setattr(d02_tasks, "AsyncSessionLocal", _SessionContext)
    monkeypatch.setattr(d02_tasks, "execute_d02", fake_execute)
    monkeypatch.setattr(d02_tasks, "handle_event", fake_handle_event)
    monkeypatch.setattr(d02_tasks, "dispatch_instructions", lambda _instructions: None)

    d02_tasks.run_d02.run(payload)

    assert captured["failed_criteria"] == ["mobile_readability"]
    assert captured["fix_instructions"] == "Increase text contrast"


def test_a01_dispatches_every_instruction_to_the_registered_celery_task(monkeypatch):
    sent = []
    instructions = [
        DispatchInstruction(agent_code="D02", idempotency_key="d02", payload={"id": "1"}),
        DispatchInstruction(agent_code="E01", idempotency_key="e01", payload={"id": "2"}),
    ]

    monkeypatch.setattr(
        orchestrator_tasks,
        "_send_task",
        lambda task_name, payload, task_id: sent.append((task_name, payload, task_id)),
    )

    orchestrator_tasks.dispatch_instructions(instructions)

    assert sent == [
        ("agents.d02.image_designer", {"id": "1"}, "d02"),
        ("agents.e01.evaluator", {"id": "2"}, "e01"),
    ]


def test_a01_attempts_all_instructions_before_reporting_dispatch_failure(monkeypatch):
    sent = []
    instructions = [
        DispatchInstruction(agent_code="D01", idempotency_key="broken", payload={"id": "1"}),
        DispatchInstruction(agent_code="E01", idempotency_key="healthy", payload={"id": "2"}),
    ]

    def fake_send(task_name, payload, task_id):
        sent.append((task_name, payload, task_id))
        if task_id == "broken":
            raise ConnectionError("broker unavailable")

    monkeypatch.setattr(orchestrator_tasks, "_send_task", fake_send)

    with pytest.raises(TaskDispatchError) as exc_info:
        orchestrator_tasks.dispatch_instructions(instructions)

    assert [task_id for _, _, task_id in sent] == ["broken", "healthy"]
    assert "broken" in str(exc_info.value)


def test_a01_rejects_unregistered_agent_instruction(monkeypatch):
    monkeypatch.setattr(
        orchestrator_tasks,
        "_send_task",
        lambda _task_name, _payload, _task_id: pytest.fail("unknown tasks must not be sent"),
    )

    with pytest.raises(TaskDispatchError):
        orchestrator_tasks.dispatch_instructions([
            DispatchInstruction(agent_code="Z99", idempotency_key="unknown", payload={})
        ])


@pytest.mark.asyncio
async def test_recovery_requeues_stale_d02_work_and_records_audit_log(db_session, monkeypatch):
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Cold Brew", platform="facebook", status="visual_matching",
        updated_at=datetime.now(UTC) - timedelta(minutes=20),
    )
    db_session.add(item)
    await db_session.commit()
    queued = []
    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", lambda **kwargs: queued.append(kwargs))

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 1
    assert queued[0]["event_type"] == "recover_d02"
    log = await db_session.scalar(select(TaskLog).where(TaskLog.content_item_id == item.id))
    assert log.status == "recovered"


@pytest.mark.asyncio
async def test_recovery_routes_text_only_visual_matching_item_to_e01(db_session, monkeypatch):
    client, cycle = await seed_bardinh(db_session)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Text only",
        platform="facebook",
        status="visual_matching",
        image_brief={"visual_mode": "text_only", "text_only_rationale": "Editorial choice"},
        updated_at=datetime.now(UTC) - timedelta(minutes=20),
    )
    db_session.add(item)
    await db_session.commit()
    queued = []
    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", lambda **kwargs: queued.append(kwargs))

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 1
    assert queued[0]["event_type"] == "recover_e01"


@pytest.mark.asyncio
async def test_recovery_does_not_mark_item_recovered_when_enqueue_fails(db_session, monkeypatch):
    client, cycle = await seed_bardinh(db_session)
    stale_time = datetime.now(UTC) - timedelta(minutes=20)
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Cold Brew",
        platform="facebook",
        status="visual_matching",
        updated_at=stale_time,
    )
    db_session.add(item)
    await db_session.commit()

    def fail_enqueue(**_kwargs):
        raise ConnectionError("redis down")

    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", fail_enqueue)

    recovered = await orchestrator_tasks.recover_stalled_items(db_session)

    assert recovered == 0
    logs = (await db_session.execute(
        select(TaskLog).where(TaskLog.content_item_id == item.id)
    )).scalars().all()
    assert [log.status for log in logs] == ["failed"]
    assert logs[0].error_code == "TASK_DISPATCH_FAILED"
