"""Executor for Agent D02 — Image Design & Matching."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.d01.schemas import ImageBrief
from app.agents.d02.prompts import (
    SYSTEM_PROMPT_D02_SELECT,
    SYSTEM_PROMPT_D02_TAG,
    build_d02_select_prompt,
    build_d02_tag_prompt,
)
from app.agents.d02.schemas import D02SelectionOutput, D02TagOutput
from app.agents.d02.tools import create_asset_request, generate_image_ai, query_media_library
from app.core.llm import call_llm
from app.models.content import ContentItem, ContentItemStateLog
from app.models.reviews import AgentMemory

logger = logging.getLogger(__name__)


async def execute_d02(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
) -> ContentItem:
    """Execute D02 Image Design & Matching for a single ContentItem.

    Logic phân nhánh:
    A. Có ảnh thật match → image_url set → status=visual_generating → fire d02_complete
    B. Không có ảnh + allow_ai=true → generate AI → status=visual_generating → fire d02_complete
    C. Không có ảnh + allow_ai=false → create AssetRequest → status=waiting_asset → STOP
    """
    logger.info(f"D02 start: client={client_id} item={content_item_id} wake={wake_reason}")

    # 1. Load ContentItem + image_brief
    item = await session.get(ContentItem, content_item_id)
    if not item:
        raise ValueError(f"ContentItem {content_item_id} not found — D02 cannot proceed")

    if not item.image_brief:
        raise ValueError(
            f"ContentItem {content_item_id} has no image_brief — D01 must run first"
        )

    # Read previous_state BEFORE transition (fix: không hardcode)
    previous_state = item.status

    image_brief = ImageBrief(**item.image_brief)
    identity = context_packet.get("identity") or context_packet.get("brand_settings", {})
    allow_ai = identity.get("allow_ai_images", False)

    # Retry: exclude ảnh đã dùng nếu failed_criteria có visual issues
    failed_criteria = context_packet.get("failed_criteria", [])
    exclude_url: str | None = None
    if wake_reason == "retry" and any(
        c in failed_criteria
        for c in ["visual_asset_fit", "image_design_quality", "mobile_readability"]
    ):
        exclude_url = item.image_url
        logger.info(f"D02 retry: excluding previously used asset url={exclude_url}")

    # 2. LLM Call 1 — Tag enhancement
    tag_response = await call_llm(
        client_id=client_id,
        agent_code="D02",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_D02_TAG},
            {"role": "user", "content": build_d02_tag_prompt(image_brief)},
        ],
        session=session,
        response_format=D02TagOutput,
        wake_reason=wake_reason,
        content_item_id=content_item_id,
        mock_key="D02_tags",
    )

    try:
        tag_output = D02TagOutput.model_validate_json(tag_response.content)
        enhanced_tags = tag_output.enhanced_tags or image_brief.suggested_tags
    except Exception as e:
        logger.warning(f"D02 tag enhancement parse failed, falling back to brief tags: {e}")
        enhanced_tags = image_brief.suggested_tags

    # 3. Query media library (T04)
    matching_assets = await query_media_library(
        session=session,
        client_id=client_id,
        tags=enhanced_tags,
        status="approved",
        limit=10,
    )

    # Filter out previously used asset on retry
    if exclude_url:
        matching_assets = [a for a in matching_assets if a.url != exclude_url]

    result_type: str
    selected_url: str | None = None

    if matching_assets:
        # 4A. Có ảnh thật → chọn best asset
        if len(matching_assets) == 1:
            best_asset = matching_assets[0]
        else:
            # LLM Call 2 — Asset selection (chỉ khi nhiều ảnh)
            assets_for_prompt = [
                {
                    "id": str(a.id),
                    "tags": a.tags or [],
                    "usage_count": getattr(a, "usage_count", 0),
                }
                for a in matching_assets
            ]
            select_response = await call_llm(
                client_id=client_id,
                agent_code="D02",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_D02_SELECT},
                    {
                        "role": "user",
                        "content": build_d02_select_prompt(assets_for_prompt, image_brief),
                    },
                ],
                session=session,
                response_format=D02SelectionOutput,
                wake_reason=wake_reason,
                content_item_id=content_item_id,
                mock_key="D02_select",
            )

            try:
                select_output = D02SelectionOutput.model_validate_json(select_response.content)
                # Find the selected asset
                asset_map = {str(a.id): a for a in matching_assets}
                best_asset = asset_map.get(select_output.selected_asset_id, matching_assets[0])
            except Exception as e:
                logger.warning(f"D02 selection parse failed, using first match: {e}")
                best_asset = matching_assets[0]

        selected_url = best_asset.url or getattr(best_asset, "storage_path", None)
        item.image_url = selected_url
        item.status = "visual_generating"
        result_type = "real_photo"
        logger.info(f"D02: real photo selected asset={best_asset.id}")

    elif allow_ai:
        # 4B. Không có ảnh thật, AI cho phép → generate
        ai_prompt = (
            f"{image_brief.description}. "
            f"Style: {image_brief.mood}. "
            f"Composition: {image_brief.composition_notes}"
        )
        ai_asset = await generate_image_ai(
            session=session,
            client_id=client_id,
            prompt=ai_prompt,
        )
        item.image_url = ai_asset.url
        item.status = "visual_generating"
        result_type = "ai_generated"
        logger.info(f"D02: AI image generated (mock)")

    else:
        # 4C. Không có ảnh, AI không cho phép → waiting_asset
        await create_asset_request(
            session=session,
            client_id=client_id,
            content_item_id=content_item_id,
            image_brief=image_brief,
            topic=item.topic or "",
            expires_days=3,
        )
        item.status = "waiting_asset"
        result_type = "waiting_asset"
        logger.info(f"D02: no assets found, AssetRequest created → waiting_asset")

    # 5. State log — previous_state từ DB, không hardcode
    state_log = ContentItemStateLog(
        content_item_id=content_item_id,
        agent_code="D02",
        previous_state=previous_state,      # ← đọc từ DB, không hardcode
        new_state=item.status,
        reason=f"D02 result: {result_type}. Wake: {wake_reason}. Tags: {enhanced_tags[:5]}",
    )
    session.add(state_log)

    # 6. Agent memory — content_item_id bắt buộc (P01-lite upsert)
    memory = AgentMemory(
        client_id=client_id,
        content_item_id=content_item_id,    # ← bắt buộc
        agent_code="D02",
        task_type="image_matching",
        input_summary=f"Item: {content_item_id}, Tags: {enhanced_tags[:5]}, Wake: {wake_reason}",
        output_summary=f"Result: {result_type}, Status: {item.status}",
    )
    session.add(memory)

    await session.commit()
    await session.refresh(item)

    logger.info(f"D02 complete: item={content_item_id} → {item.status} ({result_type})")
    return item
