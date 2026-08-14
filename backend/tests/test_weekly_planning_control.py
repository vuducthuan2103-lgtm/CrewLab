"""API coverage for the Portal-controlled weekly planning entry point."""

import uuid
from datetime import date

import httpx
import pytest
from sqlalchemy import select

from app.api import portal_router
from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import Client
from app.models.content import ContentItem, WorkflowCycle


def _install_overrides(db_session, client_id):
    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client_id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth


@pytest.mark.asyncio
async def test_start_weekly_preview_creates_cycle_and_queues_a01(db_session, monkeypatch):
    client = Client(name="Weekly", brand_name="Weekly Coffee", is_active=True)
    db_session.add(client)
    await db_session.commit()
    queued: list[tuple[str, dict]] = []
    monkeypatch.setattr(
        portal_router.celery_app,
        "send_task",
        lambda task_name, kwargs: queued.append((task_name, kwargs)),
    )
    _install_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            response = await http.post(
                "/api/v1/portal/cycles/weekly-preview",
                json={"idempotency_key": str(uuid.uuid4())},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "queued_for_b02"
    cycle = await db_session.scalar(select(WorkflowCycle).where(WorkflowCycle.client_id == client.id))
    assert cycle is not None
    assert cycle.status == "active"
    assert queued == [("a01_handle_trigger", {
        "client_id": str(client.id),
        "event_type": "beat_weekly",
        "cycle_id": str(cycle.id),
    })]


@pytest.mark.asyncio
async def test_start_weekly_preview_completes_old_cycle_and_starts_new(db_session, monkeypatch):
    client = Client(name="Weekly", brand_name="Weekly Coffee", is_active=True)
    db_session.add(client)
    await db_session.flush()
    active_cycle = WorkflowCycle(client_id=client.id, phase="strategy", status="active")
    db_session.add(active_cycle)
    await db_session.commit()
    queued: list[tuple[str, dict]] = []
    monkeypatch.setattr(
        portal_router.celery_app,
        "send_task",
        lambda task_name, kwargs: queued.append((task_name, kwargs)),
    )
    _install_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            response = await http.post(
                "/api/v1/portal/cycles/weekly-preview",
                json={"idempotency_key": str(uuid.uuid4())},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["status"] == "queued_for_b02"
    cycles = list((await db_session.scalars(select(WorkflowCycle).where(WorkflowCycle.client_id == client.id).order_by(WorkflowCycle.created_at.asc()))).all())
    assert len(cycles) == 2
    assert cycles[0].status == "completed"
    assert cycles[1].status == "active"



@pytest.mark.asyncio
async def test_client_can_change_a_planned_items_date_and_time_before_s3(db_session):
    client = Client(name="Weekly", brand_name="Weekly Coffee", is_active=True)
    db_session.add(client)
    await db_session.flush()
    cycle = WorkflowCycle(client_id=client.id, phase="strategy", status="active")
    db_session.add(cycle)
    await db_session.flush()
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Draft post",
        platform="instagram",
        status="planned",
        scheduled_date=date(2026, 8, 11),
        scheduled_time="09:00",
    )
    db_session.add(item)
    await db_session.commit()
    _install_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as http:
            response = await http.patch(
                f"/api/v1/portal/content-items/{item.id}/schedule",
                json={"scheduled_date": "2026-08-14", "scheduled_time": "18:30", "idempotency_key": str(uuid.uuid4())},
            )
    finally:
        app.dependency_overrides.clear()

    await db_session.refresh(item)
    assert response.status_code == 200
    assert response.json()["data"]["scheduled_time"] == "18:30"
    assert item.scheduled_date == date(2026, 8, 14)
    assert item.scheduled_time == "18:30"
