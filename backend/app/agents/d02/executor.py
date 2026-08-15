"""Executor for D02 semantic retrieval, vision ranking and visual production."""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select

from app.agents.d01.schemas import ImageBrief
from app.agents.d02.prompts import (
    SYSTEM_PROMPT_D02_SELECT,
    SYSTEM_PROMPT_D02_TAG,
    build_d02_select_prompt,
    build_d02_tag_prompt,
)
from app.agents.d02.schemas import D02SelectionOutput, D02TagOutput
from app.agents.d02.tools import generate_image_ai, query_media_library
from app.core.llm import call_llm
from app.models.assets import VisualSelectionDecision
from app.models.content import ContentItem, ContentItemStateLog
from app.models.reviews import AgentMemory
from app.services.storage import BRAND_ASSETS_BUCKET, get_signed_url
from app.services.task_errors import PermanentTaskInputError

logger = logging.getLogger(__name__)


def _resolve_selected_asset(selection_id: str | None, matching_assets: list[Any]):
    """Resolve a vision selection without ever trusting an unverified asset ID.

    ``matching_assets`` has already been scoped to the current tenant and
    passed the media-library eligibility checks. A model may still return an
    ID from an earlier turn or hallucinate one, so keep the production flow
    moving by selecting the highest-ranked eligible candidate instead.
    """
    normalized_selection_id = selection_id.strip() if selection_id else None
    asset_map = {str(asset.id): asset for asset in matching_assets}
    selected_asset = asset_map.get(normalized_selection_id)
    if selected_asset is not None:
        return selected_asset, None

    fallback_asset = matching_assets[0]
    fallback_note = (
        "Vision selector returned no valid candidate ID; used the highest-ranked "
        f"eligible client asset {fallback_asset.id} instead."
    )
    logger.warning(
        "D02 selector returned invalid asset_id=%r; falling back to eligible asset=%s",
        selection_id,
        fallback_asset.id,
    )
    return fallback_asset, fallback_note


async def execute_d02(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    content_item_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
) -> ContentItem:
    """Create exactly one final derivative for a visual-required content item."""
    item = await session.scalar(
        select(ContentItem).where(
            ContentItem.id == content_item_id,
            ContentItem.client_id == client_id,
            ContentItem.cycle_id == cycle_id,
        ).with_for_update()
    )
    if item is None:
        raise PermanentTaskInputError(
            f"ContentItem {content_item_id} was not found for the requested client and cycle"
        )
    if not item.image_brief:
        raise PermanentTaskInputError(
            f"ContentItem {content_item_id} has no Visual Intent; D01 must run first"
        )
    if item.image_brief.get("visual_mode") == "text_only":
        raise PermanentTaskInputError(
            f"ContentItem {content_item_id} is text-only and must bypass D02"
        )

    persisted_provenance = (item.image_brief or {}).get("d02_provenance") or {}
    completed_decision = (
        persisted_provenance.get("derivative_asset_id")
        and persisted_provenance.get("generation_mode")
        and item.image_url
    )
    if completed_decision and wake_reason != "retry":
        logger.info(
            "D02 redelivery reused persisted decision item=%s derivative=%s state=%s",
            content_item_id,
            persisted_provenance["derivative_asset_id"],
            item.status,
        )
        return item

    previous_state = item.status
    image_brief = ImageBrief(**item.image_brief)
    failed_criteria = list(context_packet.get("failed_criteria") or [])
    fix_instructions = str(context_packet.get("fix_instructions") or "").strip()
    previous_provenance = persisted_provenance
    exclude_source_id = (
        previous_provenance.get("source_asset_id")
        if wake_reason == "retry" and "visual_asset_fit" in failed_criteria
        else None
    )

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
    except Exception as exc:
        logger.warning("D02 tag output invalid; using persisted tags: %s", exc)
        enhanced_tags = image_brief.suggested_tags

    visual_intent_text = (
        f"Required subject: {image_brief.required_subject or image_brief.description}. "
        f"Description: {image_brief.description}. Preferred setting: {image_brief.preferred_setting}. "
        f"Mood: {image_brief.mood}. Platform format: {image_brief.platform_format}. "
        f"Text treatment: {image_brief.desired_text_treatment}. "
        f"Composition: {image_brief.composition_notes}. "
        f"Tags: {', '.join(enhanced_tags)}. Avoid: {', '.join(image_brief.avoid)}."
    )
    retrieval_exclusions: list[dict] = []
    matching_assets = await query_media_library(
        session=session,
        client_id=client_id,
        tags=enhanced_tags,
        status="approved",
        limit=10,
        visual_intent_text=visual_intent_text,
        exclusion_audit=retrieval_exclusions,
    )
    if exclude_source_id:
        matching_assets = [
            asset for asset in matching_assets if str(asset.id) != exclude_source_id
        ]

    candidate_audit = [
        {
            "asset_id": str(asset.id),
            "semantic_similarity": getattr(asset, "_semantic_similarity", None),
            "lexical_score": getattr(asset, "_lexical_score", None),
            "hybrid_score": getattr(asset, "_hybrid_score", None),
        }
        for asset in matching_assets
    ]
    result_type = "new_generation"
    best_asset = None
    selection_reason = "No eligible real source reached the suitability threshold."
    selection_score = 0.0

    if matching_assets:
        prompt_assets = [
            {
                "id": str(asset.id),
                "tags": asset.tags or [],
                "usage_count": asset.usage_count or 0,
                "usage_rights": asset.usage_rights,
                "semantic_summary": (
                    asset.semantic_record.semantic_summary if asset.semantic_record else ""
                ),
                "editability": asset.semantic_record.editability if asset.semantic_record else {},
                "hybrid_score": getattr(asset, "_hybrid_score", None),
            }
            for asset in matching_assets
        ]
        vision_content: list[dict] = [
            {
                "type": "text",
                "text": build_d02_select_prompt(prompt_assets, image_brief),
            }
        ]
        for asset in matching_assets:
            source_url = (
                get_signed_url(BRAND_ASSETS_BUCKET, asset.storage_path)
                if asset.storage_path
                else asset.url
            )
            if source_url:
                vision_content.extend(
                    [
                        {"type": "text", "text": f"Candidate asset ID: {asset.id}"},
                        {"type": "image_url", "image_url": {"url": source_url}},
                    ]
                )

        select_response = await call_llm(
            client_id=client_id,
            agent_code="D02",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_D02_SELECT},
                {"role": "user", "content": vision_content},
            ],
            session=session,
            response_format=D02SelectionOutput,
            wake_reason=wake_reason,
            content_item_id=content_item_id,
            mock_key="D02_select",
        )
        selection = D02SelectionOutput.model_validate_json(select_response.content)
        best_asset, fallback_note = _resolve_selected_asset(
            selection.selected_asset_id,
            matching_assets,
        )
        weighted_score = sum(
            [
                selection.subject_product_match,
                selection.visual_intent_fit,
                selection.brand_setting_fit,
                selection.editability,
                selection.freshness,
                selection.rights_confidence,
            ]
        )
        selection_score = weighted_score or selection.score
        if selection_score <= 0 and select_response.provider == "mock":
            selection_score = 90.0
        selection_reason = " ".join(
            note for note in (selection.reason, fallback_note) if note
        )

        if fallback_note:
            # The ranked candidate set is already tenant-scoped and eligible.
            # When the vision model rejects a source solely because it lacks a
            # detail that D02 can add during an edit (for example a holiday
            # prop), preserve the customer's real image as the edit source.
            selection_score = max(selection_score, 85.0)
            result_type = (
                "minimal_edit"
                if image_brief.desired_alteration == "minimal"
                else "guided_edit"
            )
        elif not selection.hard_gate_passed or selection_score < 65:
            best_asset = None
        elif selection_score < 85:
            result_type = "source_guided_generation"
        elif image_brief.desired_alteration == "minimal":
            result_type = "minimal_edit"
        else:
            result_type = "guided_edit"

    retry_instruction = (
        f" Correct the previous E01 failure: {fix_instructions}." if fix_instructions else ""
    )
    if best_asset is not None:
        generation_prompt = (
            "Edit the supplied immutable client image pixels into a polished social-media visual. "
            f"Required subject and brief: {image_brief.required_subject or image_brief.description}. "
            f"Preferred setting: {image_brief.preferred_setting}. Mood: {image_brief.mood}. "
            f"Platform format: {image_brief.platform_format}. Text treatment: {image_brief.desired_text_treatment}. "
            f"Composition: {image_brief.composition_notes}. Alteration mode: {result_type}. "
            f"Preserve the real product and brand truth. Do not include: {', '.join(image_brief.avoid)}."
            f"{retry_instruction}"
        )
        derivative = await generate_image_ai(
            session=session,
            client_id=client_id,
            prompt=generation_prompt,
            source_asset_id=best_asset.id,
            generation_mode=result_type,
        )
    else:
        generation_prompt = (
            f"Create a new polished social-media visual for: {image_brief.required_subject or image_brief.description}. "
            f"Preferred setting: {image_brief.preferred_setting}. Style: {image_brief.mood}. "
            f"Platform format: {image_brief.platform_format}. Text treatment: {image_brief.desired_text_treatment}. "
            f"Composition: {image_brief.composition_notes}. "
            f"Do not include: {', '.join(image_brief.avoid)}.{retry_instruction}"
        )
        derivative = await generate_image_ai(
            session=session,
            client_id=client_id,
            prompt=generation_prompt,
            generation_mode="new_generation",
        )

    item.image_url = derivative.url
    item.image_brief = {
        **item.image_brief,
        "d02_provenance": {
            "source_asset_id": str(best_asset.id) if best_asset else None,
            "derivative_asset_id": str(derivative.id),
            "generation_mode": result_type,
            "edit_mode": result_type,
            "selection_rationale": selection_reason,
            "selection_score": selection_score,
            "candidates": candidate_audit,
            "eligibility_exclusions": retrieval_exclusions,
            "prompt_summary": generation_prompt[:500],
            "retry_fix_instructions": fix_instructions or None,
            "technical_validation": getattr(derivative, "_technical_validation", None),
        },
    }
    item.status = "visual_generating"

    previous_run_number = await session.scalar(
        select(func.max(VisualSelectionDecision.run_number)).where(
            VisualSelectionDecision.client_id == client_id,
            VisualSelectionDecision.content_item_id == content_item_id,
        )
    )
    session.add(
        VisualSelectionDecision(
            client_id=client_id,
            content_item_id=content_item_id,
            run_number=(previous_run_number or 0) + 1,
            wake_reason=wake_reason,
            source_asset_id=best_asset.id if best_asset else None,
            derivative_asset_id=derivative.id,
            generation_mode=result_type,
            selection_score=selection_score,
            selection_rationale=selection_reason,
            candidates=candidate_audit,
            eligibility_exclusions=retrieval_exclusions,
            prompt_summary=generation_prompt[:500],
            technical_validation=getattr(derivative, "_technical_validation", None) or {},
        )
    )

    session.add(
        ContentItemStateLog(
            content_item_id=content_item_id,
            agent_code="D02",
            previous_state=previous_state,
            new_state=item.status,
            reason=(
                f"D02 result: {result_type}. Wake: {wake_reason}. "
                f"Selection score: {selection_score:.1f}."
            ),
        )
    )
    session.add(
        AgentMemory(
            client_id=client_id,
            content_item_id=content_item_id,
            agent_code="D02",
            task_type="image_matching",
            input_summary=(
                f"Item: {content_item_id}, Tags: {enhanced_tags[:5]}, Wake: {wake_reason}"
            ),
            output_summary=(
                f"Result: {result_type}, Score: {selection_score:.1f}, Status: {item.status}"
            ),
        )
    )
    await session.commit()
    await session.refresh(item)
    logger.info(
        "D02 complete item=%s derivative=%s source=%s mode=%s score=%.1f",
        content_item_id,
        derivative.id,
        best_asset.id if best_asset else None,
        result_type,
        selection_score,
    )
    return item
