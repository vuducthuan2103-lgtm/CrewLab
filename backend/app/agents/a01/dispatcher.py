import uuid
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.content import ContentItem
from app.models.reviews import AgentMemory
from app.services.content_state import update_content_state
from app.services.context_packet import build_context_packet
from .schemas import DispatchInstruction, WakeReason
from .retry_routing import determine_retry_route

logger = logging.getLogger(__name__)

async def handle_event(
    session: AsyncSession, 
    client_id: uuid.UUID, 
    event_type: str, 
    cycle_id: Optional[uuid.UUID] = None,
    content_item_id: Optional[uuid.UUID] = None
) -> List[DispatchInstruction]:
    """
    Core Dispatcher logic for A01.
    Translates an event into 0 or more DispatchInstructions.
    """
    instructions = []
    
    # Deferred Triggers Placeholder
    deferred_triggers = [
        "campaign_created", 
        "campaign_ended", 
        "publish_due", 
        "client_onboarded", 
        "onboarding_failed"
    ]
    if event_type in deferred_triggers:
        logger.info(f"Deferred trigger {event_type} ignored in MVP")
        return instructions

    # Build context packet containing brand settings and memory
    context_packet = await build_context_packet(session, client_id)
    packet_dict = context_packet.model_dump()
    
    if event_type == "beat_weekly":
        # Dispatch to B02 Content Pillar
        instructions.append(
            DispatchInstruction(
                agent_code="B02",
                idempotency_key=f"{client_id}:{cycle_id}:B02:0",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id) if cycle_id else None,
                    "wake_reason": WakeReason.scheduled.value,
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "strategy_gate_approved(S2)":
        # Dispatch to B03 Content Plan
        if not cycle_id:
            logger.error(f"{event_type} requires cycle_id")
            return instructions
            
        instructions.append(
            DispatchInstruction(
                agent_code="B03",
                idempotency_key=f"{client_id}:{cycle_id}:B03:0",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id),
                    "wake_reason": WakeReason.task_assigned.value,
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "strategy_gate_approved(S3)":
        # Dispatch to D01 Caption Writer for all planned items
        if not cycle_id:
            logger.error(f"{event_type} requires cycle_id")
            return instructions
            
        stmt = select(ContentItem).where(
            ContentItem.cycle_id == cycle_id,
            ContentItem.status == 'planned'
        )
        result = await session.execute(stmt)
        items = result.scalars().all()
        
        for item in items:
            instructions.append(
                DispatchInstruction(
                    agent_code="D01",
                    idempotency_key=f"{client_id}:{cycle_id}:D01:{item.id}:0",
                    payload={
                        "client_id": str(client_id),
                        "cycle_id": str(cycle_id),
                        "content_item_id": str(item.id),
                        "wake_reason": WakeReason.task_assigned.value,
                        "context_packet": packet_dict
                    }
                )
            )
            
    elif event_type == "d01_complete":
        # Dispatch to D02 Image Design
        if not cycle_id or not content_item_id:
            logger.error("d01_complete requires cycle_id and content_item_id")
            return instructions
            
        instructions.append(
            DispatchInstruction(
                agent_code="D02",
                idempotency_key=f"{client_id}:{cycle_id}:D02:{content_item_id}:0",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id),
                    "content_item_id": str(content_item_id),
                    "wake_reason": WakeReason.task_assigned.value,
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "d02_complete":
        # Dispatch to E01 Evaluator
        if not cycle_id or not content_item_id:
            logger.error("d02_complete requires cycle_id and content_item_id")
            return instructions
            
        instructions.append(
            DispatchInstruction(
                agent_code="E01",
                idempotency_key=f"{client_id}:{cycle_id}:E01:{content_item_id}:0",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id),
                    "content_item_id": str(content_item_id),
                    "wake_reason": WakeReason.task_assigned.value,
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "eval_failed":
        # Retry routing based on failed_criteria
        if not cycle_id or not content_item_id:
            logger.error("eval_failed requires cycle_id and content_item_id")
            return instructions
            
        stmt = select(ContentItem).where(ContentItem.id == content_item_id)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            logger.error(f"ContentItem {content_item_id} not found")
            return instructions
            
        failed_criteria = item.failed_criteria or []
        retry_count = item.eval_retry_count
        
        target_agent = determine_retry_route(failed_criteria)
        
        instructions.append(
            DispatchInstruction(
                agent_code=target_agent,
                idempotency_key=f"{client_id}:{cycle_id}:{target_agent}:{content_item_id}:{retry_count}",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id),
                    "content_item_id": str(content_item_id),
                    "wake_reason": WakeReason.retry.value,
                    "failed_criteria": failed_criteria,
                    "fix_instructions": item.fix_instructions,
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "eval_passed":
        # Eval passed, usually we can just log state and no route to next agent right away 
        # as content gate approval is manual.
        if not content_item_id:
            logger.error("eval_passed requires content_item_id")
            return instructions
        
        await update_content_state(
            session=session,
            content_item_id=content_item_id,
            new_state="pending_content_approval",
            agent_code="System",
            reason="eval_passed"
        )
        
    elif event_type == "content_gate_approved" or event_type == "content_rejected":
        # Hindsight Episodic P01-lite
        if not content_item_id:
            logger.error(f"{event_type} requires content_item_id")
            return instructions
            
        stmt = select(ContentItem).where(ContentItem.id == content_item_id)
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        
        if not item:
            return instructions
            
        # Extract feedback text if any
        # Assuming the caller has populated fix_instructions or client_edited_caption
        # or we fetch from HitlReview latest
        from app.models.reviews import HitlReview
        review_stmt = select(HitlReview).where(
            HitlReview.content_item_id == content_item_id
        ).order_by(HitlReview.created_at.desc()).limit(1)
        
        review_result = await session.execute(review_stmt)
        latest_review = review_result.scalar_one_or_none()
        
        if latest_review:
            feedback = latest_review.feedback_text or latest_review.edited_caption
            
            if feedback:
                # Upsert AgentMemory
                mem_stmt = select(AgentMemory).where(AgentMemory.content_item_id == content_item_id)
                mem_res = await session.execute(mem_stmt)
                memory_entry = mem_res.scalar_one_or_none()
                
                if memory_entry:
                    memory_entry.human_feedback = feedback
                else:
                    memory_entry = AgentMemory(
                        client_id=client_id,
                        content_item_id=content_item_id,
                        agent_code="System",
                        task_type="content_review",
                        input_summary=item.topic or "Topic",
                        output_summary=item.caption or "Output",
                        human_feedback=feedback
                    )
                    session.add(memory_entry)
                    
                await session.commit()
                
        if event_type == "content_rejected":
            # Determine retry route if rejected
            target_agent = "D01" # Default to caption writer, or could be D02
            retry_count = item.eval_retry_count
            instructions.append(
                DispatchInstruction(
                    agent_code=target_agent,
                    idempotency_key=f"{client_id}:{cycle_id}:{target_agent}:{content_item_id}:{retry_count}_reject",
                    payload={
                        "client_id": str(client_id),
                        "cycle_id": str(cycle_id),
                        "content_item_id": str(content_item_id),
                        "wake_reason": WakeReason.retry.value,
                        "failed_criteria": ["human_rejected"],
                        "context_packet": packet_dict
                    }
                )
            )

    elif event_type == "asset_request_expired":
        if not content_item_id:
            logger.error("asset_request_expired requires content_item_id")
            return instructions
            
        await update_content_state(
            session=session,
            content_item_id=content_item_id,
            new_state="asset_blocked",
            agent_code="System",
            reason="asset_request_expired"
        )
        logger.info(f"Agency Admin notified for content item {content_item_id} due to expired asset request")
            
    else:
        logger.warning(f"Unknown event_type: {event_type}")

    return instructions
