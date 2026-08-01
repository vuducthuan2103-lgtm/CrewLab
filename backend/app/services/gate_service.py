"""Gate Service — handles Human-In-The-Loop (HITL) gate approvals and rejections.

Supported gate_types:
- s2_pillar: Strategy Gate S2 (Approve/Reject Content Pillars) -> triggers B03 Content Plan
- s3_plan: Strategy Gate S3 (Approve/Reject Content Plan) -> triggers D01 Caption Writer
- content_approval: Gate 2 (Approve/Reject Content Item) -> triggers manual posting or D01/D02 retry
"""
import logging
import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.a01.dispatcher import handle_event
from app.agents.a01.schemas import DispatchInstruction
from app.models.reviews import HitlReview

logger = logging.getLogger(__name__)

VALID_GATE_TYPES = {"s2_pillar", "s3_plan", "content_approval"}


async def approve_gate(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    gate_type: str,
    reviewer_id: uuid.UUID,
    content_item_id: Optional[uuid.UUID] = None,
    action: str = "approved",
    reject_reason: Optional[str] = None,
    feedback_text: Optional[str] = None,
    edited_caption: Optional[str] = None,
) -> tuple[HitlReview, list[DispatchInstruction]]:
    """Approve or reject a HITL gate.

    1. Validate gate_type
    2. Save record to hitl_reviews table
    3. Trigger A01 dispatcher for next step instructions if approved
    """
    if gate_type not in VALID_GATE_TYPES:
        raise ValueError(f"Invalid gate_type '{gate_type}'. Must be one of {VALID_GATE_TYPES}")

    # Determine target_id: cycle_id for S2/S3, content_item_id for content_approval
    target_id = content_item_id if gate_type == "content_approval" and content_item_id else cycle_id

    review = HitlReview(
        client_id=client_id,
        gate_type=gate_type,
        target_id=target_id,
        content_item_id=content_item_id,
        reviewer_id=reviewer_id,
        action=action,
        reject_reason=reject_reason,
        feedback_text=feedback_text,
        edited_caption=edited_caption,
    )
    session.add(review)
    await session.commit()
    await session.refresh(review)

    logger.info(f"HITL Gate review recorded: gate={gate_type}, action={action}, review_id={review.id}")

    instructions: list[DispatchInstruction] = []

    # Map approval/rejection action to A01 event_type
    if action == "approved":
        if gate_type == "s2_pillar":
            event_type = "strategy_gate_approved(S2)"
        elif gate_type == "s3_plan":
            event_type = "strategy_gate_approved(S3)"
        elif gate_type == "content_approval":
            event_type = "content_gate_approved"
        else:
            event_type = None

        if event_type:
            instructions = await handle_event(
                session=session,
                client_id=client_id,
                event_type=event_type,
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )

    elif action == "rejected":
        if gate_type == "content_approval":
            instructions = await handle_event(
                session=session,
                client_id=client_id,
                event_type="content_rejected",
                cycle_id=cycle_id,
                content_item_id=content_item_id,
            )
        else:
            logger.info(f"Strategy gate '{gate_type}' rejected. Awaiting manual review.")

    return review, instructions
