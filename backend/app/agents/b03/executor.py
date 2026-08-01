"""Executor for Agent B03 — Content Plan."""
import json
import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agents.b03.prompts import SYSTEM_PROMPT_B03, build_b03_user_prompt
from app.agents.b03.schemas import B03Output
from app.core.llm import call_llm
from app.models.clients import BrandSetting, Client
from app.models.content import ContentItem, ContentPillar, WorkflowCycle
from app.models.reviews import AgentMemory

logger = logging.getLogger(__name__)


async def execute_b03(
    session: AsyncSession,
    client_id: uuid.UUID,
    cycle_id: uuid.UUID,
    context_packet: dict[str, Any],
    wake_reason: str = "task_assigned",
) -> list[ContentItem]:
    """Execute B03 Content Plan creation for a given cycle.

    1. Fetch approved ContentPillars for the cycle
    2. Read posting_frequency from BrandSetting
    3. Call LLM via call_llm()
    4. Save planned ContentItems to database
    5. Log memory to agent_memory
    6. Return saved ContentItems
    """
    logger.info(f"Executing B03 for client={client_id}, cycle={cycle_id}")

    # 1. Fetch pillars for this cycle
    stmt_pillars = select(ContentPillar).where(
        ContentPillar.client_id == client_id,
        ContentPillar.cycle_id == cycle_id,
    )
    res_pillars = await session.execute(stmt_pillars)
    pillars = res_pillars.scalars().all()

    if not pillars:
        raise ValueError(f"No ContentPillars found for cycle={cycle_id}. B02 must run & be approved first.")

    pillars_dict = [
        {"name": p.name, "description": p.description or "", "weight": p.weight, "id": p.id}
        for p in pillars
    ]
    pillar_map = {p.name.lower().strip(): p.id for p in pillars}

    # 2. Fetch posting_frequency & platforms from brand_settings / client
    brand = context_packet.get("brand_settings", {})
    posting_freq = brand.get("posting_frequency") or {"facebook": 3, "instagram": 2}

    stmt_client = select(Client).where(Client.id == client_id)
    res_client = await session.execute(stmt_client)
    client_obj = res_client.scalar_one_or_none()
    platforms = client_obj.platforms if client_obj and client_obj.platforms else ["facebook", "instagram"]

    # Fetch cycle start date if available
    stmt_cycle = select(WorkflowCycle).where(WorkflowCycle.id == cycle_id)
    res_cycle = await session.execute(stmt_cycle)
    cycle_obj = res_cycle.scalar_one_or_none()
    start_date_str = str(cycle_obj.start_date) if cycle_obj and cycle_obj.start_date else "2026-08-03"

    # Build prompt
    user_prompt = build_b03_user_prompt(
        pillars=pillars_dict,
        posting_frequency=posting_freq,
        platforms=platforms,
        context_packet=context_packet,
        cycle_start_date=start_date_str,
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_B03},
        {"role": "user", "content": user_prompt},
    ]

    # 3. Call LLM
    llm_response = await call_llm(
        client_id=client_id,
        agent_code="B03",
        messages=messages,
        session=session,
        response_format=B03Output,
        wake_reason=wake_reason,
    )

    # 4. Parse output
    try:
        parsed_output = B03Output.model_validate_json(llm_response.content)
    except Exception as e:
        logger.error(f"Failed to parse B03 LLM output: {llm_response.content}. Error: {e}")
        raise ValueError(f"B03 LLM output parsing failed: {e}")

    # Delete existing planned items for this cycle (rerun/idempotency support)
    stmt_existing = select(ContentItem).where(
        ContentItem.client_id == client_id,
        ContentItem.cycle_id == cycle_id,
        ContentItem.status == "planned",
    )
    res_existing = await session.execute(stmt_existing)
    existing_items = res_existing.scalars().all()
    for item in existing_items:
        await session.delete(item)

    # Save new ContentItems
    new_items: list[ContentItem] = []
    default_pillar_id = pillars[0].id if pillars else None

    for item in parsed_output.items:
        # Match pillar name (fallback to first pillar if LLM modified name slightly)
        matched_pillar_id = pillar_map.get(item.pillar_name.lower().strip(), default_pillar_id)

        # Parse date string
        parsed_date = None
        if item.scheduled_date:
            try:
                parsed_date = datetime.strptime(item.scheduled_date, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"Invalid date format '{item.scheduled_date}', storing None")

        content_item = ContentItem(
            client_id=client_id,
            cycle_id=cycle_id,
            pillar_id=matched_pillar_id,
            topic=item.topic,
            platform=item.platform.lower(),
            status="planned",
            scheduled_date=parsed_date,
            scheduled_time=item.scheduled_time,
        )
        session.add(content_item)
        new_items.append(content_item)

    # Save memory to agent_memory (T03 retain)
    memory = AgentMemory(
        client_id=client_id,
        agent_code="B03",
        task_type="content_plan",
        input_summary=f"Cycle: {cycle_id}, Pillars: {len(pillars)}, Frequency: {posting_freq}",
        output_summary=f"Generated {len(new_items)} planned content items",
    )
    session.add(memory)

    await session.commit()
    for item in new_items:
        await session.refresh(item)

    logger.info(f"B03 complete: saved {len(new_items)} content items for cycle={cycle_id}")
    return new_items
