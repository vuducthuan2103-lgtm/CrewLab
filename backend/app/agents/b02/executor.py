"""Executor for Agent B02 — Content Pillar."""
import json
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agents.b02.prompts import SYSTEM_PROMPT_B02, build_b02_user_prompt
from app.agents.b02.schemas import B02Output
from app.core.llm import call_llm
from app.models.content import ContentPillar
from app.models.reviews import AgentMemory

logger = logging.getLogger(__name__)


async def execute_b02(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "scheduled",
) -> list[ContentPillar]:
    """Execute B02 Content Pillar creation for a given cycle.

    1. Call LLM via call_llm()
    2. Parse & validate structured output
    3. Save pillars to content_pillars table
    4. Save memory log to agent_memory table
    5. Return saved pillars
    """
    logger.info(f"Executing B02 for client={client_id}, cycle={cycle_id}")

    # Build prompt
    user_prompt = build_b02_user_prompt(context_packet)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_B02},
        {"role": "user", "content": user_prompt},
    ]

    # Call LLM via central abstraction layer
    llm_response = await call_llm(
        client_id=client_id,
        agent_code="B02",
        messages=messages,
        session=session,
        response_format=B02Output,
        wake_reason=wake_reason,
    )

    # Parse and validate output
    try:
        parsed_output = B02Output.model_validate_json(llm_response.content)
    except Exception as e:
        logger.error(f"Failed to parse B02 LLM output: {llm_response.content}. Error: {e}")
        raise ValueError(f"B02 LLM output parsing failed: {e}")

    # Delete any existing pillars for this cycle (idempotency/rerun support)
    stmt_existing = select(ContentPillar).where(
        ContentPillar.client_id == client_id,
        ContentPillar.cycle_id == cycle_id,
    )
    res_existing = await session.execute(stmt_existing)
    existing_pillars = res_existing.scalars().all()
    for item in existing_pillars:
        await session.delete(item)

    # Save new pillars to DB
    new_pillars: list[ContentPillar] = []
    for item in parsed_output.pillars:
        pillar = ContentPillar(
            client_id=client_id,
            cycle_id=cycle_id,
            name=item.name,
            description=f"{item.description}\nAngles: {', '.join(item.angles)}",
            weight=item.weight,
        )
        session.add(pillar)
        new_pillars.append(pillar)

    # Save memory to agent_memory (P01-lite / T03 retain)
    pillar_names = ", ".join([p.name for p in parsed_output.pillars])
    memory = AgentMemory(
        client_id=client_id,
        agent_code="B02",
        task_type="content_pillar",
        input_summary=f"Cycle: {cycle_id}, Context keys: {list(context_packet.get('brand_settings', {}).keys())}",
        output_summary=f"Generated {len(new_pillars)} pillars: {pillar_names}",
    )
    session.add(memory)

    await session.commit()
    for pillar in new_pillars:
        await session.refresh(pillar)

    logger.info(f"B02 complete: saved {len(new_pillars)} pillars for cycle={cycle_id}")
    return new_pillars
