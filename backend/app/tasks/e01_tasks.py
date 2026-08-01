"""Celery tasks for Agent E01 — Evaluator."""
import asyncio
import logging
import uuid

try:
    from celery import shared_task
except ImportError:
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **kw: None
            return func
        return decorator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.agents.e01.executor import execute_e01
from app.core.db import engine

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


@shared_task(name="agents.e01.evaluator", bind=True, max_retries=2, default_retry_delay=30)
def run_e01(self, payload: dict):
    """Celery task: E01 Evaluator.

    payload keys:
        client_id, cycle_id, content_item_id, context_packet, wake_reason
    """
    client_id = uuid.UUID(payload["client_id"])
    cycle_id = uuid.UUID(payload["cycle_id"])
    content_item_id = uuid.UUID(payload["content_item_id"])
    context_packet = payload["context_packet"]
    wake_reason = payload.get("wake_reason", "task_assigned")

    logger.info(f"[E01 Task] Starting: item={content_item_id} wake={wake_reason}")

    async def _run():
        async with AsyncSessionLocal() as session:
            await execute_e01(
                session=session,
                client_id=client_id,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
                context_packet=context_packet,
                wake_reason=wake_reason,
            )

    try:
        _run_async(_run())
        logger.info(f"[E01 Task] Done: item={content_item_id}")
    except Exception as exc:
        logger.error(f"[E01 Task] Failed: item={content_item_id} error={exc}")
        raise self.retry(exc=exc)
