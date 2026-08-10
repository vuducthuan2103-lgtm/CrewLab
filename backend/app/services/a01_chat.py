"""Conversational Portal entry point for A01.

The Portal only talks to A01. A01 decides whether a message needs more
clarification or is ready to enter the content workflow.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import call_llm
from app.models.content import ContentItem, WorkflowCycle
from app.models.reviews import AgentMemory
from app.services.context_packet import build_context_packet
from app.services.task_errors import InitialDispatchError, log_task_failure

logger = logging.getLogger(__name__)

CHAT_TASK_PREFIX = "portal_chat"


class A01ChatDecision(BaseModel):
    reply: str = Field(min_length=1, max_length=3000)
    action: Literal["answer", "create_content"] = "answer"
    task_title: str | None = Field(default=None, max_length=240)
    task_details: str | None = Field(default=None, max_length=4000)
    platform: Literal["facebook", "instagram", "facebook_instagram"] = "facebook_instagram"


SYSTEM_PROMPT = """Bạn là A01, điều phối viên marketing của CrewLab cho một quán F&B.
Bạn trò chuyện bằng tiếng Việt, ngắn gọn, chủ động và dễ hiểu với chủ quán.

Nhiệm vụ của bạn:
1. Trả lời câu hỏi và giúp người dùng làm rõ nhu cầu marketing.
2. Chỉ chọn action=create_content khi yêu cầu đã đủ cụ thể để đội sáng tạo viết một bài.
3. Nếu thiếu chủ đề, mục tiêu hoặc kênh đăng, hãy hỏi một câu làm rõ và chọn action=answer.
4. Khi nhận việc, tóm tắt việc đã nhận trong reply; không tự nhận là đã đăng bài.
5. Không giao thẳng từ Portal cho agent con. Mọi việc phải đi qua A01.

Trả về đúng cấu trúc được yêu cầu."""


def parse_chat_task_type(task_type: str) -> tuple[str, str]:
    parts = task_type.split(":")
    action = parts[1] if len(parts) > 1 else "answer"
    dispatch_status = parts[2] if len(parts) > 2 else "not_needed"
    if action not in {"answer", "create_content"}:
        action = "answer"
    if dispatch_status not in {"not_needed", "queued", "pending"}:
        dispatch_status = "not_needed"
    return action, dispatch_status


async def list_a01_chat_history(
    session: AsyncSession,
    client_id: uuid.UUID,
    limit: int = 50,
) -> list[AgentMemory]:
    result = await session.execute(
        select(AgentMemory)
        .where(
            AgentMemory.client_id == client_id,
            AgentMemory.agent_code == "A01",
            AgentMemory.task_type.like(f"{CHAT_TASK_PREFIX}:%"),
        )
        .order_by(AgentMemory.created_at.desc())
        .limit(limit)
    )
    return list(reversed(result.scalars().all()))


async def _get_or_create_active_cycle(
    session: AsyncSession,
    client_id: uuid.UUID,
) -> WorkflowCycle:
    cycle = await session.scalar(
        select(WorkflowCycle)
        .where(
            WorkflowCycle.client_id == client_id,
            WorkflowCycle.status == "active",
            WorkflowCycle.phase != "done",
        )
        .order_by(WorkflowCycle.created_at.desc())
        .limit(1)
    )
    if cycle:
        return cycle

    today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
    cycle = WorkflowCycle(
        client_id=client_id,
        phase="content_production",
        status="active",
        start_date=today,
        end_date=today + timedelta(days=6),
    )
    session.add(cycle)
    await session.flush()
    return cycle


async def run_a01_chat(
    session: AsyncSession,
    client_id: uuid.UUID,
    user_message: str,
) -> tuple[AgentMemory, str]:
    """Run one A01 turn and persist its conversation/task result."""
    history = await list_a01_chat_history(session, client_id, limit=12)
    context_packet = await build_context_packet(session, client_id)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": (
                "Thông tin thương hiệu hiện tại:\n"
                f"{context_packet.model_dump_json(exclude_none=True)}"
            ),
        },
    ]
    for entry in history:
        messages.append({"role": "user", "content": entry.input_summary})
        messages.append({"role": "assistant", "content": entry.output_summary})
    messages.append({"role": "user", "content": user_message})

    response = await call_llm(
        client_id=client_id,
        agent_code="A01",
        messages=messages,
        session=session,
        response_format=A01ChatDecision,
        temperature=0.3,
        max_tokens=900,
        wake_reason="task_assigned",
    )
    decision = A01ChatDecision.model_validate_json(response.content)

    content_item: ContentItem | None = None
    dispatch_status = "not_needed"
    if decision.action == "create_content":
        cycle = await _get_or_create_active_cycle(session, client_id)
        title = (decision.task_title or user_message).strip()[:240]
        content_item = ContentItem(
            client_id=client_id,
            cycle_id=cycle.id,
            topic=title,
            platform=decision.platform,
            status="planned",
            image_brief={
                "source": "a01_chat",
                "client_request": user_message,
                "task_details": decision.task_details or user_message,
            },
        )
        session.add(content_item)
        await session.flush()
        dispatch_status = "queued"

    memory = AgentMemory(
        client_id=client_id,
        content_item_id=content_item.id if content_item else None,
        agent_code="A01",
        task_type=f"{CHAT_TASK_PREFIX}:{decision.action}:{dispatch_status}",
        input_summary=user_message,
        output_summary=decision.reply,
    )
    session.add(memory)
    await session.commit()
    await session.refresh(memory)

    if content_item:
        try:
            from app.tasks.orchestrator_tasks import a01_handle_trigger

            a01_handle_trigger.delay(
                client_id=str(client_id),
                event_type="a01_chat_task_created",
                cycle_id=str(content_item.cycle_id),
                content_item_id=str(content_item.id),
            )
        except Exception as exc:
            dispatch_status = "pending"
            memory.task_type = f"{CHAT_TASK_PREFIX}:create_content:pending"
            try:
                await log_task_failure(
                    session,
                    client_id=client_id,
                    content_item_id=content_item.id,
                    agent_code="A01",
                    task_type="initial_dispatch",
                    wake_reason="task_assigned",
                    exc=InitialDispatchError(str(exc)),
                )
            except Exception:
                await session.rollback()
                memory.task_type = f"{CHAT_TASK_PREFIX}:create_content:pending"
                await session.commit()
                logger.exception("Could not persist initial A01 dispatch failure log")
            logger.exception("A01 accepted item %s but queue dispatch is pending", content_item.id)

    return memory, dispatch_status
