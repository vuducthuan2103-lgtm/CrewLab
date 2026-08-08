import uuid
from datetime import datetime, timezone

import httpx
import pytest

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import Client
from app.models.content import ContentItem, ContentPillar, WorkflowCycle
from app.models.system import TaskLog


def _install_portal_overrides(db_session, client_id, email="owner@example.com"):
    async def override_db():
        yield db_session

    async def override_auth():
        context = AuthContext(uuid.uuid4(), client_id, "client_admin")
        context.email = email
        return context

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth


async def _get_bootstrap():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as http:
        return await http.get("/api/v1/portal/bootstrap")


@pytest.mark.asyncio
async def test_bootstrap_returns_viewer_client_and_work_board(db_session):
    client = Client(name="Bardinh", brand_name="Bardinh Coffee", is_active=True)
    other = Client(name="Other", brand_name="Secret Restaurant", is_active=True)
    db_session.add_all([client, other])
    await db_session.flush()

    old_cycle = WorkflowCycle(
        client_id=client.id,
        phase="done",
        status="completed",
        created_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
    )
    cycle = WorkflowCycle(client_id=client.id, phase="content_production", status="active")
    other_cycle = WorkflowCycle(client_id=other.id, phase="strategy", status="active")
    db_session.add_all([old_cycle, cycle, other_cycle])
    await db_session.flush()

    pillar = ContentPillar(
        client_id=client.id, cycle_id=cycle.id, name="Coffee", description="Core", weight=100
    )
    other_pillar = ContentPillar(
        client_id=other.id, cycle_id=other_cycle.id, name="Private", weight=100
    )
    db_session.add_all([pillar, other_pillar])
    await db_session.flush()

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        pillar_id=pillar.id,
        topic="Cold brew",
        platform="facebook",
        status="planned",
    )
    other_item = ContentItem(
        client_id=other.id,
        cycle_id=other_cycle.id,
        pillar_id=other_pillar.id,
        topic="Private menu",
        platform="instagram",
        status="planned",
    )
    historical_item = ContentItem(
        client_id=client.id,
        cycle_id=old_cycle.id,
        topic="Historical item",
        platform="facebook",
        status="posted",
    )
    db_session.add_all([item, other_item, historical_item])
    await db_session.flush()
    db_session.add_all(
        [
            TaskLog(
                client_id=client.id,
                content_item_id=item.id,
                agent_code="B03",
                task_type="content_plan",
                status="completed",
                wake_reason="cycle_started",
            ),
            TaskLog(
                client_id=other.id,
                content_item_id=other_item.id,
                agent_code="D01",
                task_type="private_task",
                status="completed",
                wake_reason="private",
            ),
        ]
    )
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)
    try:
        response = await _get_bootstrap()
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["viewer"]["email"] == "owner@example.com"
    assert payload["client"] == {"id": str(client.id), "brand_name": "Bardinh Coffee"}
    assert [entry["topic"] for entry in payload["work_board"]["content_items"]] == ["Cold brew"]
    assert [entry["task_type"] for entry in payload["work_board"]["task_logs"]] == ["content_plan"]
    assert [entry["name"] for entry in payload["work_board"]["pillars"]] == ["Coffee"]
    assert payload["work_board"]["schedule"] == {
        "cycle_id": str(cycle.id),
        "phase": "content_production",
    }
    assert "Secret Restaurant" not in response.text
    assert "Private menu" not in response.text
    assert "private_task" not in response.text
    assert "Historical item" not in response.text


@pytest.mark.asyncio
async def test_bootstrap_accepts_valid_empty_work_board(db_session):
    client = Client(name="Empty", brand_name="Empty Coffee", is_active=True)
    db_session.add(client)
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)
    try:
        response = await _get_bootstrap()
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    work_board = response.json()["data"]["work_board"]
    assert work_board == {
        "content_items": [],
        "task_logs": [],
        "pillars": [],
        "schedule": {"cycle_id": None, "phase": None},
    }


@pytest.mark.asyncio
@pytest.mark.parametrize("create_inactive", [False, True])
async def test_bootstrap_rejects_missing_or_inactive_client(db_session, create_inactive):
    client_id = uuid.uuid4()
    if create_inactive:
        db_session.add(
            Client(
                id=client_id,
                name="Inactive",
                brand_name="Inactive Coffee",
                is_active=False,
            )
        )
        await db_session.commit()

    _install_portal_overrides(db_session, client_id)
    try:
        response = await _get_bootstrap()
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"] == "Portal client is unavailable"
