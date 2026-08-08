import types
import uuid

from app.tasks import orchestrator_tasks


def test_a01_task_uses_supplied_cycle_without_closure_error(monkeypatch):
    client_id = uuid.uuid4()
    cycle_id = uuid.uuid4()
    captured = {}

    class FakeSessionContext:
        async def __aenter__(self):
            return object()

        async def __aexit__(self, _exc_type, _exc, _traceback):
            return False

    async def fake_precheck(_session, _client_id):
        return types.SimpleNamespace(
            is_valid=True,
            cycle_id=cycle_id,
            reason=None,
        )

    async def fake_handle_event(**kwargs):
        captured.update(kwargs)
        return []

    monkeypatch.setattr(orchestrator_tasks, "AsyncSessionLocal", FakeSessionContext)
    monkeypatch.setattr(orchestrator_tasks, "check_client_readiness", fake_precheck)
    monkeypatch.setattr(orchestrator_tasks, "handle_event", fake_handle_event)

    orchestrator_tasks.a01_handle_trigger.run(
        client_id=str(client_id),
        event_type="a01_chat_task_created",
        cycle_id=str(cycle_id),
    )

    assert captured["client_id"] == client_id
    assert captured["cycle_id"] == cycle_id
    assert captured["event_type"] == "a01_chat_task_created"
