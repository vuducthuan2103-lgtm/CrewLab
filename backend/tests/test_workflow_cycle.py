from datetime import date

import pytest

from app.models.clients import Client
from app.tasks.orchestrator_tasks import create_weekly_cycle


@pytest.mark.asyncio
async def test_create_weekly_cycle_builds_seven_day_active_window(db_session):
    client = Client(name="Cycle Test", brand_name="Cycle Test", is_active=True)
    db_session.add(client)
    await db_session.commit()

    cycle = await create_weekly_cycle(db_session, client.id)

    assert cycle.status == "active"
    assert cycle.phase == "strategy"
    assert isinstance(cycle.start_date, date)
    assert (cycle.end_date - cycle.start_date).days == 6
