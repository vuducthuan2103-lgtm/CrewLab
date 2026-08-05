import uuid

import httpx
import pytest
from sqlalchemy import select

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import Client
from app.models.content import ContentItem, WorkflowCycle
from app.models.reviews import AgentMemory
from app.tasks import orchestrator_tasks


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
