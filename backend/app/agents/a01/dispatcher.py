import uuid
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.content import ContentItem
from app.services.context_packet import build_context_packet
from .schemas import DispatchInstruction
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
                    "wake_reason": "beat_weekly",
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "b02_complete":
        # Dispatch to B03 Content Plan
        if not cycle_id:
            logger.error("b02_complete requires cycle_id")
            return instructions
            
        instructions.append(
            DispatchInstruction(
                agent_code="B03",
                idempotency_key=f"{client_id}:{cycle_id}:B03:0",
                payload={
                    "client_id": str(client_id),
                    "cycle_id": str(cycle_id),
                    "wake_reason": "b02_complete",
                    "context_packet": packet_dict
                }
            )
        )
        
    elif event_type == "b03_complete":
        # Dispatch to D01 Caption Writer for all planned items
        if not cycle_id:
            logger.error("b03_complete requires cycle_id")
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
                        "wake_reason": "b03_complete",
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
                    "wake_reason": "d01_complete",
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
                    "wake_reason": "d02_complete",
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
                    "wake_reason": "eval_failed",
                    "failed_criteria": failed_criteria,
                    "fix_instructions": item.fix_instructions,
                    "context_packet": packet_dict
                }
            )
        )
        
    else:
        logger.warning(f"Unknown event_type: {event_type}")

    return instructions
