import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system import TaskLog

async def log_task_event(
    session: AsyncSession,
    client_id: uuid.UUID,
    agent_code: str,
    task_type: str,
    status: str,
    wake_reason: str,
    content_item_id: Optional[uuid.UUID] = None,
    model_used: Optional[str] = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
    latency_ms: int = 0,
    eval_score: Optional[float] = None
) -> None:
    """
    Helper to log an event to the task_logs table.
    """
    new_log = TaskLog(
        client_id=client_id,
        content_item_id=content_item_id,
        agent_code=agent_code,
        task_type=task_type,
        status=status,
        wake_reason=wake_reason,
        model_used=model_used,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        latency_ms=latency_ms,
        eval_score=eval_score
    )
    
    session.add(new_log)
    await session.commit()
