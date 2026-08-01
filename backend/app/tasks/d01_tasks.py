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

from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import engine
from app.agents.d01.executor import execute_d01
from app.agents.a01.dispatcher import handle_event

logger = logging.getLogger(__name__)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


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
            await execute_d01(
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
            await handle_event(
                session=session,
                client_id=client_id,
                event_type="d01_complete",
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )

    try:
        _run_async(_run())
        logger.info(f"[D01 Task] Done: item={content_item_id}")
    except Exception as exc:
        logger.error(f"[D01 Task] Failed: item={content_item_id} error={exc}")
        raise self.retry(exc=exc)
