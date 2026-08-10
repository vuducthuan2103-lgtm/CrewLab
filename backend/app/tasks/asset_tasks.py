"""Celery tasks for asynchronous semantic indexing of media-library sources."""
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

from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.services.asset_semantics import index_asset_semantics, mark_semantic_index_failed
from app.services.task_errors import log_task_failure

logger = logging.getLogger(__name__)
def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@shared_task(name="assets.index_semantic", bind=True, max_retries=2, default_retry_delay=30)
def index_semantic_asset(self, client_id: str, asset_id: str):
    client_uuid = uuid.UUID(client_id)
    asset_uuid = uuid.UUID(asset_id)

    async def _run():
        async with AsyncSessionLocal() as session:
            await index_asset_semantics(session, client_id=client_uuid, asset_id=asset_uuid)

    try:
        _run_async(_run())
    except Exception as exc:
        logger.exception("Semantic indexing failed for asset=%s", asset_id)
        exhausted = self.request.retries >= self.max_retries

        async def _log():
            async with AsyncSessionLocal() as session:
                if exhausted:
                    await mark_semantic_index_failed(
                        session,
                        client_id=client_uuid,
                        asset_id=asset_uuid,
                        reason="semantic_indexing_retries_exhausted",
                    )
                await log_task_failure(
                    session,
                    client_id=client_uuid,
                    content_item_id=None,
                    agent_code="D02",
                    task_type="semantic_asset_indexing",
                    wake_reason="asset_upload",
                    exc=exc,
                )

        _run_async(_log())
        raise self.retry(exc=exc)
