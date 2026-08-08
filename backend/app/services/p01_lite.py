import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.reviews import AgentMemory

logger = logging.getLogger(__name__)

D01_REASONS = {"tone_wrong", "info_incorrect", "off_brand", "bad_timing"}
D02_REASONS = {"visual_poor", "wrong_asset"}

async def upsert_agent_memory(
    session: AsyncSession,
    client_id: UUID,
    content_item_id: UUID,
    agent_code: str,
    task_type: str,
    input_summary: str,
    output_summary: str,
    human_feedback: str,
) -> AgentMemory:
    """Upsert human feedback into agent_memory table for P01-lite learning loop."""
    stmt = select(AgentMemory).where(
        AgentMemory.client_id == client_id,
        AgentMemory.content_item_id == content_item_id,
        AgentMemory.agent_code == agent_code
    )
    res = await session.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.human_feedback = human_feedback
        await session.commit()
        await session.refresh(existing)
        logger.info(f"P01-lite updated agent_memory id={existing.id} for agent={agent_code}")
        return existing
    else:
        mem = AgentMemory(
            client_id=client_id,
            content_item_id=content_item_id,
            agent_code=agent_code,
            task_type=task_type,
            input_summary=input_summary,
            output_summary=output_summary,
            human_feedback=human_feedback
        )
        session.add(mem)
        await session.commit()
        await session.refresh(mem)
        logger.info(f"P01-lite created agent_memory id={mem.id} for agent={agent_code}")
        return mem

def determine_agent_for_reject_reason(reject_reason: str) -> str:
    if reject_reason in D02_REASONS:
        return "D02"
    return "D01"
