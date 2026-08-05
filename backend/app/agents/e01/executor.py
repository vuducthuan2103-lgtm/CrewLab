"""Executor for Agent E01 — Evaluator."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agents.e01.prompts import SYSTEM_PROMPT_E01, build_e01_user_prompt
from app.agents.e01.schemas import E01Output, VisualEval
from app.core.llm import call_llm
from app.models.content import ContentItem, ContentItemEvalAttempt, ContentItemStateLog
from app.services.storage import BRAND_ASSETS_BUCKET, get_signed_url

logger = logging.getLogger(__name__)


class E01TaskInputError(ValueError):
    """Permanent task input error that must not consume Celery retries."""


class ContentItemNotFoundError(E01TaskInputError):
    """Raised when an item is absent or does not belong to the requested tenant."""


async def _resolve_image_url(image_url: str | None) -> str | None:
    """Resolve an HTTPS or private storage URL for the vision model."""
    if not image_url:
        return None

    if image_url.startswith("https://"):
        return image_url

    clean_path = image_url.lstrip("/")
    signed = get_signed_url(BRAND_ASSETS_BUCKET, clean_path, expires_in=300)
    if signed:
        return signed

    logger.warning("E01: could not get a signed URL for path=%s", image_url)
    return None


async def _get_tenant_content_item(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
) -> ContentItem:
    """Load an item only when it belongs to the supplied client and cycle."""
    item_stmt = select(ContentItem).where(
        ContentItem.id == content_item_id,
        ContentItem.client_id == client_id,
    )
    item = (await session.execute(item_stmt)).scalar_one_or_none()
    if not item:
        raise ContentItemNotFoundError(
            f"ContentItem {content_item_id} was not found for client {client_id}"
        )
    if item.cycle_id != cycle_id:
        raise E01TaskInputError(
            f"ContentItem {content_item_id} does not belong to cycle {cycle_id}"
        )
    return item


def _force_missing_image_failure(parsed: E01Output) -> E01Output:
    """Apply the non-negotiable visual failure rule when no image is available."""
    visual_failure = VisualEval(
        score=0.0,
        passed=False,
        failed_criteria=[
            "visual_asset_fit",
            "image_design_quality",
            "mobile_readability",
        ],
        fix_instructions="No evaluable image was available. Upload or select a valid visual asset.",
    )
    return E01Output(
        caption_eval=parsed.caption_eval,
        visual_eval=visual_failure,
        overall_passed=False,
        evaluation_reasoning=(
            f"{parsed.evaluation_reasoning}\nVisual evaluation failed because no image was available."
        ).strip(),
    )


async def execute_e01(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
) -> ContentItem:
    """Evaluate one content item and persist the resulting FSM transition."""
    logger.info("E01 start: client=%s item=%s wake=%s", client_id, content_item_id, wake_reason)

    item = await _get_tenant_content_item(
        session,
        client_id=client_id,
        cycle_id=cycle_id,
        content_item_id=content_item_id,
    )

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
        last_log = (await session.execute(stmt_log)).scalar_one_or_none()
        previous_state = last_log.previous_state if last_log else "visual_generating"
    else:
        previous_state = item.status

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

    resolved_image_url = await _resolve_image_url(item.image_url)
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

    llm_response = await call_llm(
        client_id=client_id,
        agent_code="E01",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_E01},
            {"role": "user", "content": user_content},
        ],
        session=session,
        response_format=E01Output,
        wake_reason=wake_reason,
        content_item_id=content_item_id,
    )
    try:
        parsed = E01Output.model_validate_json(llm_response.content)
    except Exception as exc:
        logger.error("E01 parse failed: %s", exc)
        raise ValueError(f"E01 LLM output parsing failed: {exc}") from exc

    if not resolved_image_url:
        parsed = _force_missing_image_failure(parsed)

    item.eval_score_caption = parsed.caption_eval.score
    item.eval_score_visual = parsed.visual_eval.score
    all_failed = parsed.caption_eval.failed_criteria + parsed.visual_eval.failed_criteria
    session.add(
        ContentItemEvalAttempt(
            client_id=client_id,
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
    )

    from app.agents.a01.dispatcher import handle_event

    if parsed.overall_passed:
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
                    f"E01 passed. Caption={parsed.caption_eval.score}/10, "
                    f"Visual={parsed.visual_eval.score}/5"
                ),
            )
        )
        await session.commit()
        await handle_event(
            session=session,
            client_id=client_id,
            event_type="eval_passed",
            cycle_id=cycle_id,
            content_item_id=content_item_id,
        )
    else:
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
                    f"E01 failed (attempt {item.eval_retry_count}). "
                    f"Failed criteria: {all_failed}"
                ),
            )
        )
        await session.commit()
        await handle_event(
            session=session,
            client_id=client_id,
            event_type="eval_failed",
            cycle_id=cycle_id,
            content_item_id=content_item_id,
        )

    await session.refresh(item)
    return item
