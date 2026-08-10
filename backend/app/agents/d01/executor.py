"""Executor for Agent D01 — Caption Writer."""
import json
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agents.d01.prompts import SYSTEM_PROMPT_D01, build_d01_user_prompt
from app.agents.d01.schemas import D01Output
from app.core.llm import call_llm
from app.models.clients import BrandSetting
from app.models.content import ContentItem, ContentItemStateLog, ContentPillar
from app.models.reviews import AgentMemory
from app.services.task_errors import InvalidModelOutputError, PermanentTaskInputError

logger = logging.getLogger(__name__)


async def execute_d01(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
    fix_instructions: str | None = None,
    failed_criteria: list[str] | None = None,
) -> ContentItem:
    """Execute D01 Caption Writer for a single ContentItem.

    1. Load ContentItem + ContentPillar from DB
    2. Transition state → caption_generating (commit early for visibility)
    3. Build prompt + call LLM
    4. Parse D01Output, update caption + image_brief
    5. Transition state → visual_matching
    6. Write ContentItemStateLog + AgentMemory
    7. Commit + return item
    """
    logger.info(f"D01 start: client={client_id} item={content_item_id} wake={wake_reason}")

    # 1. Load ContentItem
    item = await session.scalar(
        select(ContentItem).where(
            ContentItem.id == content_item_id,
            ContentItem.client_id == client_id,
            ContentItem.cycle_id == cycle_id,
        ).with_for_update()
    )
    if not item:
        raise PermanentTaskInputError(
            f"ContentItem {content_item_id} was not found for the requested client and cycle"
        )

    if wake_reason != "retry":
        if item.status == "caption_generating":
            logger.info("D01 duplicate delivery ignored while item=%s is already running", content_item_id)
            item._workflow_reused = True
            return item
        if item.caption and item.image_brief and item.status not in {"planned", "ready_for_generation"}:
            logger.info("D01 duplicate delivery reused completed caption for item=%s", content_item_id)
            item._workflow_reused = True
            return item

    # 2. Read current state BEFORE transition (fix: do not hardcode previous_state)
    previous_state = item.status

    # Load ContentPillar for context
    pillar = None
    if item.pillar_id:
        pillar = await session.scalar(
            select(ContentPillar).where(
                ContentPillar.id == item.pillar_id,
                ContentPillar.client_id == client_id,
                ContentPillar.cycle_id == cycle_id,
            )
        )

    # 3. Transition → caption_generating and commit early (dashboard/task_logs see it immediately)
    item.status = "caption_generating"
    await session.commit()
    logger.info(f"D01: item={content_item_id} → caption_generating")

    # 4. Build prompt
    identity = context_packet.get("identity") or context_packet.get("brand_settings", {})
    episodic = context_packet.get("episodic") or context_packet.get("episodic_memory", [])

    user_prompt = build_d01_user_prompt(
        topic=item.topic or "",
        platform=item.platform or "facebook",
        pillar_name=pillar.name if pillar else "",
        pillar_description=pillar.description if pillar else "",
        brand_settings=identity,
        episodic_memory=episodic,
        fix_instructions=fix_instructions,
        failed_criteria=failed_criteria or [],
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_D01},
        {"role": "user", "content": user_prompt},
    ]

    # 5. Call LLM (call_llm auto-writes task_logs — Observability §1d confirmed)
    llm_response = await call_llm(
        client_id=client_id,
        agent_code="D01",
        messages=messages,
        session=session,
        response_format=D01Output,
        wake_reason=wake_reason,
        content_item_id=content_item_id,
    )

    # 6. Parse output
    try:
        parsed = D01Output.model_validate_json(llm_response.content)
    except Exception as e:
        logger.error(f"D01 parse failed: {llm_response.content[:200]}. Error: {e}")
        raise InvalidModelOutputError(f"D01 LLM output parsing failed: {e}") from e

    # 7. Update item: caption + image_brief (JSONB)
    item.caption = parsed.caption
    image_brief = parsed.image_brief.model_dump()
    image_brief["preferred_setting"] = (
        image_brief.get("preferred_setting") or "Use the real setting described in the visual brief"
    )
    image_brief["platform_format"] = image_brief.get("platform_format") or item.platform or "facebook"
    image_brief["desired_text_treatment"] = (
        image_brief.get("desired_text_treatment") or "No overlay text unless explicitly requested"
    )
    item.image_brief = image_brief
    item.status = "visual_matching"

    # 8. State log — previous_state read from DB, not hardcoded
    state_log = ContentItemStateLog(
        content_item_id=content_item_id,
        agent_code="D01",
        previous_state=previous_state,      # ← đọc từ DB, không hardcode
        new_state="visual_matching",
        reason=f"Caption written ({len(parsed.caption)} chars), image brief created. Wake: {wake_reason}",
    )
    session.add(state_log)

    # 9. Agent memory — content_item_id bắt buộc (P01-lite upsert)
    memory = AgentMemory(
        client_id=client_id,
        content_item_id=content_item_id,    # ← bắt buộc, P01-lite dùng để upsert feedback
        agent_code="D01",
        task_type="caption_writing",
        input_summary=(
            f"Topic: {item.topic}, Platform: {item.platform}, "
            f"Pillar: {pillar.name if pillar else 'N/A'}, Wake: {wake_reason}"
        ),
        output_summary=(
            f"Caption {len(parsed.caption)} chars | "
            f"Brief tags: {parsed.image_brief.suggested_tags}"
        ),
    )
    session.add(memory)

    await session.commit()
    await session.refresh(item)

    logger.info(f"D01 complete: item={content_item_id} → visual_matching")
    return item
