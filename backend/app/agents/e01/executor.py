"""Executor for Agent E01 — Evaluator."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agents.e01.prompts import SYSTEM_PROMPT_E01, build_e01_user_prompt
from app.agents.e01.schemas import E01Output
from app.core.llm import call_llm
from app.models.content import ContentItem, ContentItemEvalAttempt, ContentItemStateLog
from app.services.storage import BRAND_ASSETS_BUCKET, get_signed_url

logger = logging.getLogger(__name__)


async def _resolve_image_url(image_url: str | None) -> str | None:
    """Resolve image URL for multimodal LLM vision call.

    - None -> return None
    - https://... -> return as-is
    - Storage path -> fetch temporary signed URL (300s TTL)
    """
    if not image_url:
        return None

    if image_url.startswith("https://") or image_url.startswith("http://"):
        return image_url

    # Storage path relative or starting with /
    clean_path = image_url.lstrip("/")
    signed = get_signed_url(BRAND_ASSETS_BUCKET, clean_path, expires_in=300)
    if signed:
        return signed

    logger.warning(f"E01: Could not get signed URL for path={image_url}")
    return None


async def execute_e01(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
) -> ContentItem:
    """Execute E01 Evaluator for a single ContentItem."""
    logger.info(f"E01 start: client={client_id} item={content_item_id} wake={wake_reason}")

    # 1. Load ContentItem
    item = await session.get(ContentItem, content_item_id)
    if not item:
        raise ValueError(f"ContentItem {content_item_id} not found — E01 cannot proceed")

    # 2. Detect previous_state (fix: if retrying infra while in evaluating state, get real previous state)
    if item.status == "evaluating":
        stmt_log = (
            select(ContentItemStateLog)
            .where(
                ContentItemStateLog.content_item_id == content_item_id,
                ContentItemStateLog.new_state == "evaluating",
            )
            .order_by(ContentItemStateLog.created_at.desc())
            .limit(1)
        )
        res = await session.execute(stmt_log)
        last_log = res.scalar_one_or_none()
        previous_state = last_log.previous_state if last_log else "visual_generating"
    else:
        previous_state = item.status

    # 3. Transition -> evaluating and commit early for dashboard visibility
    item.status = "evaluating"
    session.add(
        ContentItemStateLog(
            content_item_id=content_item_id,
            agent_code="E01",
            previous_state=previous_state,
            new_state="evaluating",
            reason=f"E01 evaluation started. Wake: {wake_reason}",
        )
    )
    await session.commit()
    logger.info(f"E01: item={content_item_id} -> evaluating")

    # 4. Resolve image URL for vision model
    resolved_image_url = await _resolve_image_url(item.image_url)

    # 5. Build multimodal message
    identity = context_packet.get("identity") or context_packet.get("brand_settings", {})
    episodic = context_packet.get("episodic") or context_packet.get("episodic_memory", [])

    user_text_prompt = build_e01_user_prompt(
        caption=item.caption or "",
        image_brief=item.image_brief,
        brand_settings=identity,
        platform=item.platform or "facebook",
        episodic_memory=episodic,
        has_image=resolved_image_url is not None,
    )

    user_content: list[dict[str, Any]] = []
    if resolved_image_url:
        user_content.append({"type": "image_url", "image_url": {"url": resolved_image_url}})

    user_content.append({"type": "text", "text": user_text_prompt})

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_E01},
        {"role": "user", "content": user_content},
    ]

    # 6. Call LLM (call_llm automatically logs to task_logs)
    llm_response = await call_llm(
        client_id=client_id,
        agent_code="E01",
        messages=messages,
        session=session,
        response_format=E01Output,
        wake_reason=wake_reason,
        content_item_id=content_item_id,
    )

    # 7. Parse E01Output
    try:
        parsed = E01Output.model_validate_json(llm_response.content)
    except Exception as e:
        logger.error(f"E01 parse failed: {llm_response.content[:200]}. Error: {e}")
        raise ValueError(f"E01 LLM output parsing failed: {e}")

    # 8. Update item scores
    item.eval_score_caption = parsed.caption_eval.score
    item.eval_score_visual = parsed.visual_eval.score

    all_failed = parsed.caption_eval.failed_criteria + parsed.visual_eval.failed_criteria

    # 9. Record eval attempt history
    attempt = ContentItemEvalAttempt(
        content_item_id=content_item_id,
        attempt_number=item.eval_retry_count + 1,
        caption_score=parsed.caption_eval.score,
        visual_score=parsed.visual_eval.score,
        caption_passed=parsed.caption_eval.passed,
        visual_passed=parsed.visual_eval.passed,
        overall_passed=parsed.overall_passed,
        failed_criteria=all_failed,
        fix_instructions_caption=parsed.caption_eval.fix_instructions,
        fix_instructions_visual=parsed.visual_eval.fix_instructions,
    )
    session.add(attempt)

    # Import handle_event locally to prevent circular imports
    from app.agents.a01.dispatcher import handle_event

    if parsed.overall_passed:
        # 10. PASS -> pending_content_approval
        item.status = "pending_content_approval"
        item.failed_criteria = None
        item.fix_instructions = None

        session.add(
            ContentItemStateLog(
                content_item_id=content_item_id,
                agent_code="E01",
                previous_state="evaluating",
                new_state="pending_content_approval",
                reason=(
                    f"E01 Passed. Caption={parsed.caption_eval.score}/10, "
                    f"Visual={parsed.visual_eval.score}/5"
                ),
            )
        )
        await session.commit()
        await session.refresh(item)

        logger.info(f"E01 complete PASS: item={content_item_id} -> pending_content_approval")

        await handle_event(
            session=session,
            client_id=client_id,
            event_type="eval_passed",
            cycle_id=cycle_id,
            content_item_id=content_item_id,
        )
    else:
        # 11. FAIL -> increment eval_retry_count, set eval_failed
        item.eval_retry_count += 1
        item.failed_criteria = all_failed

        fix_parts = []
        if parsed.caption_eval.fix_instructions:
            fix_parts.append(f"[Caption] {parsed.caption_eval.fix_instructions}")
        if parsed.visual_eval.fix_instructions:
            fix_parts.append(f"[Visual] {parsed.visual_eval.fix_instructions}")
        item.fix_instructions = "\n".join(fix_parts)

        item.status = "eval_failed"

        session.add(
            ContentItemStateLog(
                content_item_id=content_item_id,
                agent_code="E01",
                previous_state="evaluating",
                new_state="eval_failed",
                reason=(
                    f"E01 Failed (attempt {item.eval_retry_count}). "
                    f"Failed criteria: {all_failed}"
                ),
            )
        )
        await session.commit()
        await session.refresh(item)

        logger.info(
            f"E01 complete FAIL (attempt {item.eval_retry_count}): "
            f"item={content_item_id} -> eval_failed"
        )

        await handle_event(
            session=session,
            client_id=client_id,
            event_type="eval_failed",
            cycle_id=cycle_id,
            content_item_id=content_item_id,
        )

    return item
