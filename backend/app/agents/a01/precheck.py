import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.clients import Client
from app.models.content import WorkflowCycle
from .schemas import A01PrecheckResult

async def check_client_readiness(session: AsyncSession, client_id: uuid.UUID) -> A01PrecheckResult:
    """
    Perform prechecks before Orchestrator initiates a new workflow cycle or dispatches tasks.
    - Check if client exists and is active.
    - Check if there's already an active, unfinished cycle.
    """
    # 1. Check client
    stmt_client = select(Client).where(Client.id == client_id)
    result_client = await session.execute(stmt_client)
    client = result_client.scalar_one_or_none()
    
    if not client:
        return A01PrecheckResult(is_valid=False, reason="Client not found")
        
    if not client.is_active:
        return A01PrecheckResult(is_valid=False, reason="Client is inactive", client_id=client_id)
        
    # 2. Check for concurrent cycle
    stmt_cycle = select(WorkflowCycle).where(
        WorkflowCycle.client_id == client_id,
        WorkflowCycle.status == 'active',
        WorkflowCycle.phase != 'done'
    )
    result_cycle = await session.execute(stmt_cycle)
    active_cycle = result_cycle.scalar_one_or_none()
    
    if active_cycle:
        return A01PrecheckResult(
            is_valid=False, 
            reason="Concurrent cycle detected. Waiting for current cycle to finish.",
            client_id=client_id,
            cycle_id=active_cycle.id
        )
        
    return A01PrecheckResult(is_valid=True, client_id=client_id)
