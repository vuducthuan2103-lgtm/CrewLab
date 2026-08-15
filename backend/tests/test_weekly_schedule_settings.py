from datetime import UTC, datetime
from types import SimpleNamespace
import uuid

import httpx
import pytest

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import Client
from app.services.weekly_schedule import is_weekly_schedule_due


def _install_portal_overrides(db_session, client_id):
    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client_id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth


@pytest.mark.asyncio
async def test_get_settings_returns_weekly_schedule_for_authenticated_client(db_session):
    client = Client(
        name="Schedule",
        brand_name="Schedule Coffee",
        is_active=True,
        timezone="Asia/Ho_Chi_Minh",
        schedule_frequency="weekly",
        schedule_day=4,
        schedule_time="07:35",
    )
    db_session.add(client)
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.get("/api/v1/portal/settings")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["data"]["schedule"] == {
        "weekly_cycle_day": "thursday",
        "weekly_cycle_time": "07:35",
        "timezone": "Asia/Ho_Chi_Minh",
        "frequency": "weekly",
        "cycle_id": None,
        "status": None,
        "phase": None,
    }


@pytest.mark.asyncio
async def test_patch_schedule_updates_only_authenticated_client_and_is_idempotent(db_session):
    client = Client(name="Owner", brand_name="Owner", is_active=True)
    other = Client(
        name="Other",
        brand_name="Other",
        is_active=True,
        schedule_day=2,
        schedule_time="09:00",
    )
    db_session.add_all([client, other])
    await db_session.commit()
    idempotency_key = str(uuid.uuid4())

    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            first = await http.patch(
                "/api/v1/portal/settings/schedule",
                json={
                    "weekly_cycle_day": "saturday",
                    "weekly_cycle_time": "06:20",
                    "idempotency_key": idempotency_key,
                },
            )
            repeated = await http.patch(
                "/api/v1/portal/settings/schedule",
                json={
                    "weekly_cycle_day": "sunday",
                    "weekly_cycle_time": "18:45",
                    "idempotency_key": idempotency_key,
                },
            )
    finally:
        app.dependency_overrides.clear()

    await db_session.refresh(client)
    await db_session.refresh(other)
    assert first.status_code == 200
    assert repeated.status_code == 200
    assert first.json()["data"] == repeated.json()["data"]
    assert (client.schedule_day, client.schedule_time) == (6, "06:20")
    assert (other.schedule_day, other.schedule_time) == (2, "09:00")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("day", "run_time"),
    [
        ("funday", "08:00"),
        ("monday", "8:00"),
        ("monday", "24:00"),
        ("monday", "08:60"),
    ],
)
async def test_patch_schedule_rejects_invalid_day_or_time(db_session, day, run_time):
    client = Client(
        name="Invalid",
        brand_name="Invalid",
        is_active=True,
        schedule_day=1,
        schedule_time="08:00",
    )
    db_session.add(client)
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.patch(
                "/api/v1/portal/settings/schedule",
                json={
                    "weekly_cycle_day": day,
                    "weekly_cycle_time": run_time,
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    await db_session.refresh(client)
    assert response.status_code == 422
    assert (client.schedule_day, client.schedule_time) == (1, "08:00")


@pytest.mark.parametrize(
    ("schedule_day", "schedule_time", "now_utc", "expected"),
    [
        (1, "08:07", datetime(2026, 8, 3, 1, 15, tzinfo=UTC), True),
        (1, "08:00", datetime(2026, 8, 3, 1, 15, tzinfo=UTC), False),
        (6, "23:55", datetime(2026, 8, 1, 17, 5, tzinfo=UTC), True),
        (1, "08:30", datetime(2026, 8, 3, 1, 20, tzinfo=UTC), False),
    ],
)
def test_weekly_schedule_due_window(schedule_day, schedule_time, now_utc, expected):
    client = SimpleNamespace(
        schedule_day=schedule_day,
        schedule_time=schedule_time,
        timezone="Asia/Ho_Chi_Minh",
    )

    assert is_weekly_schedule_due(client, now_utc) is expected


def test_weekly_schedule_invalid_timezone_is_not_due():
    client = SimpleNamespace(
        schedule_day=1,
        schedule_time="08:00",
        timezone="Invalid/Timezone",
    )

    assert is_weekly_schedule_due(
        client, datetime(2026, 8, 3, 1, 5, tzinfo=UTC)
    ) is False
