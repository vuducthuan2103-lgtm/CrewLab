"""Celery entry point for D02 visual production."""
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

from app.agents.a01.dispatcher import handle_event
from app.agents.d02.executor import execute_d02
from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.models.content import ContentItem, ContentItemStateLog
from app.services.task_errors import PermanentTaskInputError, classify_task_error, log_task_failure
from app.tasks.orchestrator_tasks import dispatch_instructions

logger = logging.getLogger(__name__)
def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@shared_task(name="agents.d02.image_designer", bind=True, max_retries=2, default_retry_delay=30)
def run_d02(self, payload: dict):
    """Run D02 and dispatch its completion through A01."""
    client_id = uuid.UUID(payload["client_id"])
    cycle_id = uuid.UUID(payload["cycle_id"])
    content_item_id = uuid.UUID(payload["content_item_id"])
    context_packet = {
        **payload["context_packet"],
        "failed_criteria": payload.get("failed_criteria", []),
        "fix_instructions": payload.get("fix_instructions"),
    }
    wake_reason = payload.get("wake_reason", "task_assigned")

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
            if item.status != "visual_generating":
                provenance = (item.image_brief or {}).get("d02_provenance") or {}
                if provenance.get("derivative_asset_id"):
                    logger.info(
                        "D02 redelivery already advanced item=%s state=%s derivative=%s",
                        content_item_id,
                        item.status,
                        provenance["derivative_asset_id"],
                    )
                    return
                raise RuntimeError(f"D02 completed without a final visual (state={item.status})")
            instructions = await handle_event(
                session=session,
                client_id=client_id,
                event_type="d02_complete",
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )
            dispatch_instructions(instructions)

    try:
        _run_async(_run())
    except PermanentTaskInputError as exc:
        logger.error("D02 permanent input failure for item=%s: %s", content_item_id, exc)

        async def _log_input_failure():
            async with AsyncSessionLocal() as session:
                await log_task_failure(
                    session,
                    client_id=client_id,
                    content_item_id=content_item_id,
                    agent_code="D02",
                    task_type="celery_task",
                    wake_reason=wake_reason,
                    exc=exc,
                )

        try:
            _run_async(_log_input_failure())
        except Exception:
            logger.exception("D02 failed to persist permanent input failure")
        raise
    except Exception as exc:
        logger.exception("D02 task failed for item=%s", content_item_id)
        error = classify_task_error(exc)

        async def _log_failure():
            async with AsyncSessionLocal() as session:
                await log_task_failure(
                    session,
                    client_id=client_id,
                    content_item_id=content_item_id,
                    agent_code="D02",
                    task_type="celery_task",
                    wake_reason=wake_reason,
                    exc=exc,
                )

        _run_async(_log_failure())
        if not error.retryable:
            if error.code == "PROVIDER_CREDITS_EXHAUSTED":
                async def _mark_visual_blocked():
                    async with AsyncSessionLocal() as failure_session:
                        item = await failure_session.get(ContentItem, content_item_id, with_for_update=True)
                        if item is None or item.client_id != client_id or item.cycle_id != cycle_id:
                            return
                        previous_state = item.status
                        item.status = "eval_failed"
                        item.failed_criteria = ["visual_generation_unavailable"]
                        item.fix_instructions = (
                            "Không thể tạo/chỉnh sửa ảnh vì tài khoản OpenAI đã hết credit. "
                            "Agency Admin cần nạp thêm credit rồi chạy lại tạo ảnh."
                        )
                        failure_session.add(
                            ContentItemStateLog(
                                content_item_id=content_item_id,
                                agent_code="D02",
                                previous_state=previous_state,
                                new_state="eval_failed",
                                reason="D02 visual generation blocked: provider credits exhausted.",
                            )
                        )
                        await failure_session.commit()
                try:
                    _run_async(_mark_visual_blocked())
                except Exception:
                    logger.exception("D02 failed to record exhausted provider credits")
            raise
        raise self.retry(exc=exc)
