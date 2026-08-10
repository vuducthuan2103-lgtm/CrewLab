"""Celery tasks for Agent D01 — Caption Writer."""
import uuid
import logging
import asyncio

try:
    from celery import shared_task
except ImportError:
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **kw: None
            return func
        return decorator

from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.agents.d01.executor import execute_d01
from app.agents.a01.dispatcher import handle_event
from app.tasks.orchestrator_tasks import dispatch_instructions
from app.services.task_errors import PermanentTaskInputError, log_task_failure

logger = logging.getLogger(__name__)

def _run_async(coro):
    """Helper to run async code in Celery sync tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@shared_task(name="agents.d01.caption_writer", bind=True, max_retries=2, default_retry_delay=30)
def run_d01(self, payload: dict):
    """Celery task: D01 Caption Writer.

    payload keys:
        client_id, cycle_id, content_item_id, context_packet,
        wake_reason, fix_instructions (optional), failed_criteria (optional)
    """
    client_id = uuid.UUID(payload["client_id"])
    cycle_id = uuid.UUID(payload["cycle_id"])
    content_item_id = uuid.UUID(payload["content_item_id"])
    context_packet = payload["context_packet"]
    wake_reason = payload.get("wake_reason", "task_assigned")
    fix_instructions = payload.get("fix_instructions")
    failed_criteria = payload.get("failed_criteria", [])

    logger.info(f"[D01 Task] Starting: item={content_item_id} wake={wake_reason}")

    async def _run():
        async with AsyncSessionLocal() as session:
            # Execute D01
            item = await execute_d01(
                session=session,
                client_id=client_id,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
                context_packet=context_packet,
                wake_reason=wake_reason,
                fix_instructions=fix_instructions,
                failed_criteria=failed_criteria,
            )

            # Fire d01_complete → A01 dispatches D02
            if item is not None and (
                getattr(item, "_workflow_reused", False)
                or item.status != "visual_matching"
                or not item.caption
                or not item.image_brief
            ):
                logger.info(
                    "[D01 Task] No downstream dispatch for reused/in-flight item=%s state=%s",
                    content_item_id,
                    item.status,
                )
                return

            instructions = await handle_event(
                session=session,
                client_id=client_id,
                event_type="d01_complete",
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )
            dispatch_instructions(instructions)

    try:
        _run_async(_run())
        logger.info(f"[D01 Task] Done: item={content_item_id}")
    except PermanentTaskInputError as exc:
        logger.error(f"[D01 Task] Permanent input failure: item={content_item_id} error={exc}")

        async def _log_input_failure():
            async with AsyncSessionLocal() as failure_session:
                await log_task_failure(
                    failure_session,
                    client_id=client_id,
                    content_item_id=content_item_id,
                    agent_code="D01",
                    task_type="celery_task",
                    wake_reason=wake_reason,
                    exc=exc,
                )

        try:
            _run_async(_log_input_failure())
        except Exception:
            logger.exception("[D01 Task] Failed to persist permanent input failure")
        raise
    except Exception as exc:
        logger.error(f"[D01 Task] Failed: item={content_item_id} error={exc}")
        async def _log_failure():
            async with AsyncSessionLocal() as failure_session:
                await log_task_failure(
                    failure_session,
                    client_id=client_id,
                    content_item_id=content_item_id,
                    agent_code="D01",
                    task_type="celery_task",
                    wake_reason=wake_reason,
                    exc=exc,
                )
        try:
            _run_async(_log_failure())
        except Exception:
            logger.exception("[D01 Task] Failed to persist failure log")
        raise self.retry(exc=exc)
