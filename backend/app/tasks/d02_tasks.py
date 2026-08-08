"""Celery tasks for Agent D02 — Image Design & Matching."""
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
from app.agents.d02.executor import execute_d02
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


@shared_task(name="agents.d02.image_designer", bind=True, max_retries=2, default_retry_delay=30)
def run_d02(self, payload: dict):
    """Celery task: D02 Image Design & Matching.

    payload keys:
        client_id, cycle_id, content_item_id, context_packet, wake_reason
    """
    client_id = uuid.UUID(payload["client_id"])
    cycle_id = uuid.UUID(payload["cycle_id"])
    content_item_id = uuid.UUID(payload["content_item_id"])
    context_packet = payload["context_packet"]
    wake_reason = payload.get("wake_reason", "task_assigned")

    logger.info(f"[D02 Task] Starting: item={content_item_id} wake={wake_reason}")

    async def _run():
        async with AsyncSessionLocal() as session:
            item = await execute_d02(
                session=session,
                client_id=client_id,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
                context_packet=context_packet,
                wake_reason=wake_reason,
            )

            # Chỉ fire d02_complete khi có ảnh — KHÔNG fire khi waiting_asset
            if item.status == "visual_generating":
                await handle_event(
                    session=session,
                    client_id=client_id,
                    event_type="d02_complete",
                    cycle_id=cycle_id,
                    content_item_id=content_item_id,
                )
                logger.info(f"[D02 Task] d02_complete fired: item={content_item_id}")
            else:
                logger.info(
                    f"[D02 Task] Status={item.status}, NOT firing d02_complete "
                    f"(waiting for asset or blocked)"
                )

    try:
        _run_async(_run())
        logger.info(f"[D02 Task] Done: item={content_item_id}")
    except Exception as exc:
        logger.error(f"[D02 Task] Failed: item={content_item_id} error={exc}")
        raise self.retry(exc=exc)
