import uuid
import logging
import asyncio
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

try:
    from celery import shared_task
except ImportError:
    # Fallback mock for Celery if not installed yet
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **kw: None
            return func
        return decorator

from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.db import engine
from app.models.clients import Client
from app.models.content import WorkflowCycle
from app.agents.a01.precheck import check_client_readiness
from app.agents.a01.dispatcher import handle_event

logger = logging.getLogger(__name__)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


async def create_weekly_cycle(session: AsyncSession, client_id: uuid.UUID) -> WorkflowCycle:
    """Create the active cycle that B02/B03 and the creative agents operate on."""
    today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    cycle = WorkflowCycle(
        client_id=client_id,
        phase="strategy",
        status="active",
        start_date=today,
        end_date=today + timedelta(days=6),
    )
    session.add(cycle)
    await session.commit()
    await session.refresh(cycle)
    return cycle

def run_async(coro):
    """Helper to run async code in celery sync tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


# Map agent_code → Celery task name
AGENT_TASK_MAP = {
    "B02": "agents.b02.content_pillar",
    "B03": "agents.b03.content_plan",
    "D01": "agents.d01.caption_writer",
    "D02": "agents.d02.image_designer",
    "E01": "agents.e01.evaluator",
}


@shared_task(name="a01_handle_trigger")
def a01_handle_trigger(client_id: str, event_type: str, cycle_id: str = None, content_item_id: str = None):
    """
    Main entry point for Orchestrator A01.
    Handles events and dispatches to appropriate agent Celery tasks.
    """
    client_uuid = uuid.UUID(client_id)
    cycle_uuid = uuid.UUID(cycle_id) if cycle_id else None
    item_uuid = uuid.UUID(content_item_id) if content_item_id else None

    async def _run():
        resolved_cycle_uuid = cycle_uuid
        async with AsyncSessionLocal() as session:
            # 1. Precheck
            precheck = await check_client_readiness(session, client_uuid)
            same_active_cycle = (
                resolved_cycle_uuid is not None
                and precheck.cycle_id is not None
                and precheck.cycle_id == resolved_cycle_uuid
            )
            if not precheck.is_valid and not same_active_cycle:
                logger.info(f"A01 Precheck failed for client {client_id}: {precheck.reason}")
                return

            if event_type == "beat_weekly" and resolved_cycle_uuid is None:
                cycle = await create_weekly_cycle(session, client_uuid)
                resolved_cycle_uuid = cycle.id

            # 2. Handle Event → get DispatchInstructions
            instructions = await handle_event(
                session=session,
                client_id=client_uuid,
                event_type=event_type,
                cycle_id=resolved_cycle_uuid,
                content_item_id=item_uuid
            )

            # 3. Dispatch each instruction to its Celery task
            for inst in instructions:
                task_name = AGENT_TASK_MAP.get(inst.agent_code)
                if not task_name:
                    logger.warning(
                        f"No Celery task registered for agent={inst.agent_code}. "
                        f"Skipping dispatch. (Add to AGENT_TASK_MAP when task is implemented.)"
                    )
                    continue

                logger.info(
                    f"Dispatching: agent={inst.agent_code} task={task_name} "
                    f"idempotency={inst.idempotency_key}"
                )
                try:
                    from celery import current_app as celery_app
                    celery_app.send_task(task_name, kwargs={"payload": inst.payload})
                except Exception as e:
                    logger.error(
                        f"Failed to dispatch {task_name} for agent={inst.agent_code}: {e}"
                    )

    run_async(_run())


@shared_task(name="check_scheduled_cycles")
def check_scheduled_cycles():
    """
    Runs periodically to check if any client is scheduled to start a new cycle.
    """
    async def _run():
        async with AsyncSessionLocal() as session:
            tz = ZoneInfo('Asia/Ho_Chi_Minh')
            now = datetime.now(tz)
            
            current_day = now.isoweekday()
            current_time_str = now.strftime("%H:%M")
            
            stmt = select(Client).where(Client.is_active == True)
            result = await session.execute(stmt)
            clients = result.scalars().all()
            
            for client in clients:
                # Note: In production with 15min intervals, we'd check if schedule_time is within the last 15 mins.
                # For MVP, we'll do an exact match or simple comparison.
                if client.schedule_day == current_day and client.schedule_time == current_time_str:
                    logger.info(f"Triggering beat_weekly for client {client.id}")
                    a01_handle_trigger.delay(
                        client_id=str(client.id),
                        event_type="beat_weekly"
                    )
                    
    run_async(_run())


async def expire_asset_requests(session: AsyncSession, now: datetime | None = None) -> int:
    """Expire due asset requests without allowing one bad row to stop the batch."""
    from app.models.assets import AssetRequest
    from app.models.content import ContentItem, ContentItemStateLog
    from app.models.system import TaskLog

    now = now or datetime.now(UTC)
    stmt = select(AssetRequest).where(
        AssetRequest.status == "pending",
        AssetRequest.expires_at <= now,
    )
    requests = (await session.execute(stmt)).scalars().all()
    processed = 0

    for req in requests:
        try:
            item = await session.get(ContentItem, req.content_item_id)
            req.status = "expired"

            if not item or item.status != "waiting_asset":
                logger.info(
                    "Skipping asset state transition for expired request %s: item=%s status=%s",
                    req.id,
                    req.content_item_id,
                    item.status if item else None,
                )
                await session.commit()
                processed += 1
                continue

            previous_state = item.status
            item.status = "asset_blocked"
            session.add(
                ContentItemStateLog(
                    content_item_id=req.content_item_id,
                    agent_code="System",
                    previous_state=previous_state,
                    new_state="asset_blocked",
                    reason=f"AssetRequest {req.id} expired at {req.expires_at}",
                )
            )
            session.add(
                TaskLog(
                    client_id=req.client_id,
                    content_item_id=req.content_item_id,
                    agent_code="System",
                    task_type="asset_request_expiry",
                    status="completed",
                    wake_reason="beat_expiry_check",
                )
            )
            await session.commit()
            processed += 1
        except Exception:
            await session.rollback()
            logger.exception("Failed to process expired AssetRequest %s; continuing batch", req.id)

    return processed


@shared_task(name="check_asset_request_expiry")
def check_asset_request_expiry():
    """Runs periodically (hourly) to process due AssetRequest records."""
    async def _run():
        async with AsyncSessionLocal() as session:
            await expire_asset_requests(session)

    run_async(_run())

