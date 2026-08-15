"""Celery task wrapper for Agent B03 (Content Plan)."""
import asyncio
import logging
import uuid

from celery import shared_task

from app.agents.b03.executor import execute_b03
from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.services.task_errors import log_task_failure

logger = logging.getLogger(__name__)


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@shared_task(name="agents.b03.content_plan", bind=True, max_retries=2, default_retry_delay=30)
def run_b03(self, payload: dict):
    """Generate planned posts after the human approves the B02 pillar draft at S2."""
    client_id = uuid.UUID(payload["client_id"])
    cycle_id = uuid.UUID(payload["cycle_id"])
    context_packet = payload["context_packet"]
    wake_reason = payload.get("wake_reason", "task_assigned")

    async def _run():
        async with AsyncSessionLocal() as session:
            await execute_b03(
                session=session,
                client_id=client_id,
                cycle_id=cycle_id,
                context_packet=context_packet,
                wake_reason=wake_reason,
            )

    try:
        _run_async(_run())
        logger.info("[B03 Task] Done: cycle=%s", cycle_id)
    except Exception as exc:
        logger.exception("[B03 Task] Failed: cycle=%s", cycle_id)

        async def _log_failure():
            async with AsyncSessionLocal() as session:
                await log_task_failure(
                    session,
                    client_id=client_id,
                    content_item_id=None,
                    agent_code="B03",
                    task_type="celery_task",
                    wake_reason=wake_reason,
                    exc=exc,
                )

        try:
            _run_async(_log_failure())
        except Exception:
            logger.exception("[B03 Task] Failed to persist task error")
        raise self.retry(exc=exc)
