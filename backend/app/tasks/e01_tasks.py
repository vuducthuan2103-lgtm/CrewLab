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

from app.agents.a01.dispatcher import handle_event
from app.agents.e01.executor import E01TaskInputError, execute_e01
from app.core.db import CeleryAsyncSessionLocal as AsyncSessionLocal
from app.models.content import ContentItem, ContentItemStateLog
from app.services.task_errors import classify_task_error, log_task_failure
from app.tasks.orchestrator_tasks import dispatch_instructions

logger = logging.getLogger(__name__)

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
            item = await execute_e01(
                session=session,
                client_id=client_id,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
                context_packet=context_packet,
                wake_reason=wake_reason,
            )
            if item.status not in {"eval_failed", "pending_content_approval"}:
                logger.info(
                    "[E01 Task] No completion dispatch for reused/in-flight item=%s state=%s",
                    content_item_id,
                    item.status,
                )
                return
            event_type = "eval_failed" if item.status == "eval_failed" else "eval_passed"
            instructions = await handle_event(
                session=session,
                client_id=client_id,
                event_type=event_type,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )
            dispatch_instructions(instructions)

    try:
        _run_async(_run())
        logger.info(f"[E01 Task] Done: item={content_item_id}")
    except E01TaskInputError as exc:
        logger.error(f"[E01 Task] Permanent input failure: item={content_item_id} error={exc}")
        async def _log_input_failure():
            async with AsyncSessionLocal() as failure_session:
                await log_task_failure(
                    failure_session, client_id=client_id, content_item_id=content_item_id,
                    agent_code="E01", task_type="celery_task", wake_reason=wake_reason, exc=exc,
                )
        try:
            _run_async(_log_input_failure())
        except Exception:
            logger.exception("[E01 Task] Failed to persist failure log")
        raise
    except Exception as exc:
        logger.error(f"[E01 Task] Failed: item={content_item_id} error={exc}")
        error = classify_task_error(exc)
        async def _log_failure():
            async with AsyncSessionLocal() as failure_session:
                await log_task_failure(
                    failure_session, client_id=client_id, content_item_id=content_item_id,
                    agent_code="E01", task_type="celery_task", wake_reason=wake_reason, exc=exc,
                )
        try:
            _run_async(_log_failure())
        except Exception:
            logger.exception("[E01 Task] Failed to persist failure log")
        if not error.retryable:
            if error.code == "PROVIDER_CREDITS_EXHAUSTED":
                async def _mark_evaluation_blocked():
                    async with AsyncSessionLocal() as failure_session:
                        item = await failure_session.get(ContentItem, content_item_id, with_for_update=True)
                        if item is None or item.client_id != client_id or item.cycle_id != cycle_id:
                            return
                        previous_state = item.status
                        item.status = "eval_failed"
                        item.failed_criteria = ["vision_evaluator_unavailable"]
                        item.fix_instructions = (
                            "Không thể kiểm duyệt ảnh vì tài khoản OpenAI đã hết credit. "
                            "Agency Admin cần nạp thêm credit rồi chạy lại kiểm duyệt."
                        )
                        failure_session.add(
                            ContentItemStateLog(
                                content_item_id=content_item_id,
                                agent_code="E01",
                                previous_state=previous_state,
                                new_state="eval_failed",
                                reason="E01 vision evaluation blocked: provider credits exhausted.",
                            )
                        )
                        await failure_session.commit()
                try:
                    _run_async(_mark_evaluation_blocked())
                except Exception:
                    logger.exception("[E01 Task] Failed to record exhausted provider credits")
            raise
        raise self.retry(exc=exc)
