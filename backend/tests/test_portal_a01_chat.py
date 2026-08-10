import uuid

import httpx
import pytest
from sqlalchemy import select

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext, IDEMPOTENCY_CACHE
from app.main import app
from app.models.clients import Client
from app.models.content import ContentItem, WorkflowCycle
from app.models.reviews import AgentMemory
from app.models.system import TaskLog
from app.tasks import orchestrator_tasks
from app.api import portal_router


def _install_portal_overrides(db_session, client_id):
    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client_id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth


@pytest.mark.asyncio
async def test_a01_chat_creates_cycle_item_and_dispatches_through_a01(db_session, monkeypatch):
    client = Client(name="A01 Chat", brand_name="A01 Chat", is_active=True)
    db_session.add(client)
    await db_session.commit()

    dispatched = []

    def fake_delay(**kwargs):
        dispatched.append(kwargs)

    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", fake_delay)
    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.post(
                "/api/v1/portal/a01/messages",
                json={
                    "message": "Viết bài Facebook giới thiệu cold brew cuối tuần này",
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["action"] == "create_content"
    assert payload["data"]["dispatch_status"] == "queued"

    cycle = await db_session.scalar(
        select(WorkflowCycle).where(WorkflowCycle.client_id == client.id)
    )
    item = await db_session.scalar(
        select(ContentItem).where(ContentItem.client_id == client.id)
    )
    assert cycle is not None
    assert cycle.phase == "content_production"
    assert item is not None
    assert item.status == "planned"
    assert item.image_brief["source"] == "a01_chat"
    assert dispatched == [
        {
            "client_id": str(client.id),
            "event_type": "a01_chat_task_created",
            "cycle_id": str(cycle.id),
            "content_item_id": str(item.id),
        }
    ]


@pytest.mark.asyncio
async def test_a01_chat_history_is_tenant_scoped(db_session):
    client = Client(name="Tenant A", brand_name="Tenant A", is_active=True)
    other = Client(name="Tenant B", brand_name="Tenant B", is_active=True)
    db_session.add_all([client, other])
    await db_session.flush()
    db_session.add_all(
        [
            AgentMemory(
                client_id=client.id,
                agent_code="A01",
                task_type="portal_chat:answer:not_needed",
                input_summary="Tin nhắn của A",
                output_summary="Trả lời cho A",
            ),
            AgentMemory(
                client_id=other.id,
                agent_code="A01",
                task_type="portal_chat:answer:not_needed",
                input_summary="Tin nhắn bí mật của B",
                output_summary="Trả lời cho B",
            ),
        ]
    )
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.get("/api/v1/portal/a01/messages")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert [message["user_message"] for message in data] == ["Tin nhắn của A"]
    assert "bí mật" not in response.text


@pytest.mark.asyncio
async def test_a01_idempotency_key_cannot_replay_another_clients_response(db_session, monkeypatch):
    IDEMPOTENCY_CACHE.clear()
    first = Client(name="Replay A", brand_name="Replay A", is_active=True)
    second = Client(name="Replay B", brand_name="Replay B", is_active=True)
    db_session.add_all([first, second])
    await db_session.commit()
    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", lambda **_kwargs: None)
    shared_key = str(uuid.uuid4())
    responses = []

    for client in (first, second):
        _install_portal_overrides(db_session, client.id)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as http:
                responses.append(await http.post(
                    "/api/v1/portal/a01/messages",
                    json={
                        "message": "Viết bài Facebook giới thiệu cold brew cuối tuần này",
                        "idempotency_key": shared_key,
                    },
                ))
        finally:
            app.dependency_overrides.clear()

    assert all(response.status_code == 200 for response in responses)
    first_item = responses[0].json()["data"]["content_item_id"]
    second_item = responses[1].json()["data"]["content_item_id"]
    assert first_item != second_item
    assert await db_session.scalar(
        select(ContentItem).where(
            ContentItem.id == uuid.UUID(first_item),
            ContentItem.client_id == first.id,
        )
    )
    assert await db_session.scalar(
        select(ContentItem).where(
            ContentItem.id == uuid.UUID(second_item),
            ContentItem.client_id == second.id,
        )
    )


@pytest.mark.asyncio
async def test_content_approval_idempotency_is_scoped_to_target_item(db_session):
    IDEMPOTENCY_CACHE.clear()
    client = Client(name="Target Scope", brand_name="Target Scope", is_active=True)
    db_session.add(client)
    await db_session.flush()
    cycle = WorkflowCycle(client_id=client.id, phase="content_production", status="active")
    db_session.add(cycle)
    await db_session.flush()
    first = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="First",
        platform="facebook",
        status="pending_content_approval",
    )
    second = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Second",
        platform="facebook",
        status="pending_content_approval",
    )
    db_session.add_all([first, second])
    await db_session.commit()
    shared_key = str(uuid.uuid4())

    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            first_response = await http.post(
                f"/api/v1/portal/content-items/{first.id}/approve",
                json={"idempotency_key": shared_key},
            )
            second_response = await http.post(
                f"/api/v1/portal/content-items/{second.id}/approve",
                json={"idempotency_key": shared_key},
            )
    finally:
        app.dependency_overrides.clear()

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["data"]["review_id"] != second_response.json()["data"]["review_id"]
    await db_session.refresh(first)
    await db_session.refresh(second)
    assert first.status == "approved_ready_to_post"
    assert second.status == "approved_ready_to_post"


@pytest.mark.asyncio
async def test_a01_chat_reuses_strategy_cycle_without_skipping_its_gate(db_session, monkeypatch):
    client = Client(name="Strategy Cycle", brand_name="Strategy Cycle", is_active=True)
    db_session.add(client)
    await db_session.flush()
    cycle = WorkflowCycle(client_id=client.id, phase="strategy", status="active")
    db_session.add(cycle)
    await db_session.commit()

    monkeypatch.setattr(orchestrator_tasks.a01_handle_trigger, "delay", lambda **kwargs: None)
    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.post(
                "/api/v1/portal/a01/messages",
                json={
                    "message": "Viết bài Instagram giới thiệu món mới",
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    await db_session.refresh(cycle)
    assert cycle.phase == "strategy"
    items = (
        await db_session.execute(
            select(ContentItem).where(ContentItem.cycle_id == cycle.id)
        )
    ).scalars().all()
    assert len(items) == 1


def test_removed_manual_routes_are_not_exposed():
    paths = app.openapi()["paths"]
    assert "/api/v1/portal/briefs" not in paths
    assert "/api/v1/internal/clients/{client_id}/test-workflow/start" not in paths
    assert "/api/v1/portal/a01/messages" in paths


@pytest.mark.asyncio
async def test_a01_chat_returns_safe_structured_error_and_persists_task_log(db_session, monkeypatch):
    client = Client(name="A01 Failure", brand_name="A01 Failure", is_active=True)
    db_session.add(client)
    await db_session.commit()

    class ProviderFailure(Exception):
        provider = "openai"
        request_id = "provider-request-42"
        status_code = 429

    async def fail_a01(*_args, **_kwargs):
        raise ProviderFailure("rate limited")

    monkeypatch.setattr(portal_router, "run_a01_chat", fail_a01)
    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            response = await http.post(
                "/api/v1/portal/a01/messages",
                json={"message": "Viết bài mới", "idempotency_key": str(uuid.uuid4())},
            )
    finally:
        app.dependency_overrides.clear()

    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["error_code"] == "PROVIDER_RATE_LIMITED"
    assert payload["error"]["details"]["provider"] == "openai"
    assert payload["error"]["details"]["provider_request_id"] == "provider-request-42"
    log = await db_session.scalar(select(TaskLog))
    assert log.error_code == "PROVIDER_RATE_LIMITED"
