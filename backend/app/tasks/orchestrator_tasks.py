import uuid
import logging
import asyncio
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

try:
    from celery import shared_task
except ImportError:
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **kw: None
            return func
        return decorator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.models.clients import Client
from app.models.content import WorkflowCycle, ContentItem, ContentItemStateLog
from app.models.reviews import AgentMemory
from app.models.system import TaskLog
from app.agents.a01.precheck import check_client_readiness
from app.agents.a01.dispatcher import handle_event
from app.services.task_errors import TaskDispatchError, classify_task_error, log_task_failure
from app.services.weekly_schedule import is_weekly_schedule_due

logger = logging.getLogger(__name__)


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


def _send_task(task_name: str, payload: dict, task_id: str) -> None:
    """Send one already-authorized A01 instruction to Celery."""
    from celery import current_app as celery_app

    celery_app.send_task(task_name, kwargs={"payload": payload}, task_id=task_id)


def dispatch_instructions(instructions) -> None:
    """A01-owned conversion of DispatchInstructions into concrete Celery work.

    Agents may obtain instructions from ``handle_event`` but must always use this
    function so task-name routing stays centralized and observable.
    """
    failures: list[str] = []
    for inst in instructions:
        task_name = AGENT_TASK_MAP.get(inst.agent_code)
        if not task_name:
            message = f"No Celery task registered for agent={inst.agent_code} id={inst.idempotency_key}"
            logger.error(message)
            failures.append(message)
            continue
        logger.info(
            "Dispatching: agent=%s task=%s idempotency=%s",
            inst.agent_code,
            task_name,
            inst.idempotency_key,
        )
        try:
            _send_task(task_name, inst.payload, inst.idempotency_key)
        except Exception as exc:
            logger.exception(
                "Celery dispatch failed: agent=%s idempotency=%s",
                inst.agent_code,
                inst.idempotency_key,
            )
            failures.append(f"{inst.agent_code}:{inst.idempotency_key}: {exc}")

    if failures:
        raise TaskDispatchError("; ".join(failures))


@shared_task(name="a01_handle_trigger", bind=True, max_retries=2, default_retry_delay=30)
def a01_handle_trigger(self, client_id: str, event_type: str, cycle_id: str = None, content_item_id: str = None):
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

            # 3. Dispatch each instruction to its Celery task.
            dispatch_instructions(instructions)

    try:
        run_async(_run())
    except Exception as exc:
        logger.exception("A01 trigger failed: client=%s event=%s", client_id, event_type)

        async def _log_failure():
            async with AsyncSessionLocal() as failure_session:
                await log_task_failure(
                    failure_session,
                    client_id=client_uuid,
                    content_item_id=item_uuid,
                    agent_code="A01",
                    task_type="orchestrator_dispatch",
                    wake_reason=event_type,
                    exc=exc,
                )

        try:
            run_async(_log_failure())
        except Exception:
            logger.exception("A01 failed to persist trigger failure")
        raise self.retry(exc=exc)


@shared_task(name="check_scheduled_cycles")
def check_scheduled_cycles():
    """
    Runs periodically to check if any client is scheduled to start a new cycle.
    """
    async def _run():
        async with AsyncSessionLocal() as session:
            stmt = select(Client).where(Client.is_active == True)
            result = await session.execute(stmt)
            clients = result.scalars().all()
            
            for client in clients:
                if is_weekly_schedule_due(client, datetime.now(UTC)):
                    logger.info(f"Triggering beat_weekly for client {client.id}")
                    a01_handle_trigger.delay(
                        client_id=str(client.id),
                        event_type="beat_weekly"
                    )
                    
    run_async(_run())


async def recover_stalled_items(session: AsyncSession, now: datetime | None = None) -> int:
    """Requeue work that was acknowledged by a worker which then disappeared."""
    now = now or datetime.now(UTC)
    cutoff = now - timedelta(minutes=15)
    state_to_event = {
        "caption_generating": "recover_d01",
        "visual_matching": "recover_d02",
        "visual_generating": "recover_d02",
        "evaluating": "recover_e01",
        "eval_failed": "eval_failed",
    }
    stmt = select(ContentItem).where(
        ContentItem.status.in_(tuple(state_to_event)),
        ContentItem.updated_at < cutoff,
    )
    items = list((await session.execute(stmt)).scalars().all())
    pending_chat_stmt = (
        select(ContentItem)
        .join(AgentMemory, AgentMemory.content_item_id == ContentItem.id)
        .where(
            ContentItem.status == "planned",
            ContentItem.updated_at < cutoff,
            AgentMemory.agent_code == "A01",
            AgentMemory.task_type == "portal_chat:create_content:pending",
        )
        .distinct()
    )
    items.extend((await session.execute(pending_chat_stmt)).scalars().all())
    recovered = 0
    for item in items:
        event_type = (
            "a01_chat_task_created"
            if item.status == "planned"
            else state_to_event[item.status]
        )
        if (
            item.status == "visual_matching"
            and (item.image_brief or {}).get("visual_mode") == "text_only"
        ):
            event_type = "recover_e01"
        if (
            item.status == "visual_generating"
            and item.image_url
            and ((item.image_brief or {}).get("d02_provenance") or {}).get("derivative_asset_id")
        ):
            event_type = "recover_e01"
        try:
            a01_handle_trigger.delay(
                client_id=str(item.client_id),
                event_type=event_type,
                cycle_id=str(item.cycle_id),
                content_item_id=str(item.id),
            )
        except Exception as exc:
            error = classify_task_error(TaskDispatchError(str(exc)))
            values = dict(
                client_id=item.client_id,
                content_item_id=item.id,
                agent_code="A01",
                task_type="worker_recovery",
                status="failed",
                wake_reason="worker_restart_recovery",
                error_code=error.code,
                error_provider=error.provider,
                provider_request_id=error.provider_request_id,
                error_message=error.message,
            )
            if hasattr(TaskLog, "error_retryable"):
                values["error_retryable"] = error.retryable
            session.add(TaskLog(**values))
            continue

        recovered += 1
        item.updated_at = now
        session.add(ContentItemStateLog(
            content_item_id=item.id,
            agent_code="System",
            previous_state=item.status,
            new_state=item.status,
            reason=f"Worker recovery queued {event_type} after stale activity",
        ))
        session.add(TaskLog(
            client_id=item.client_id,
            content_item_id=item.id,
            agent_code="A01",
            task_type="worker_recovery",
            status="recovered",
            wake_reason="worker_restart_recovery",
        ))
    await session.commit()
    return recovered


@shared_task(name="recover_stalled_agent_work")
def recover_stalled_agent_work():
    async def _run():
        async with AsyncSessionLocal() as session:
            await recover_stalled_items(session)

    run_async(_run())
