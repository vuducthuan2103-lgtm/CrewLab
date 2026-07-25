import uuid
import logging
import asyncio
from datetime import datetime
import pytz

try:
    from celery import shared_task
except ImportError:
    # Fallback mock for Celery if not installed yet
    def shared_task(*args, **kwargs):
        def decorator(func):
            func.delay = lambda *a, **kw: None
            return func
        return decorator

from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.db import engine
from app.models.clients import Client
from app.agents.a01.precheck import check_client_readiness
from app.agents.a01.dispatcher import handle_event

logger = logging.getLogger(__name__)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

def run_async(coro):
    """Helper to run async code in celery sync tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@shared_task(name="a01_handle_trigger")
def a01_handle_trigger(client_id: str, event_type: str, cycle_id: str = None, content_item_id: str = None):
    """
    Main entry point for Orchestrator A01.
    """
    client_uuid = uuid.UUID(client_id)
    cycle_uuid = uuid.UUID(cycle_id) if cycle_id else None
    item_uuid = uuid.UUID(content_item_id) if content_item_id else None
    
    async def _run():
        async with AsyncSessionLocal() as session:
            # 1. Precheck
            precheck = await check_client_readiness(session, client_uuid)
            if not precheck.is_valid:
                logger.info(f"A01 Precheck failed for client {client_id}: {precheck.reason}")
                return
                
            # 2. Handle Event
            instructions = await handle_event(
                session=session,
                client_id=client_uuid,
                event_type=event_type,
                cycle_id=cycle_uuid,
                content_item_id=item_uuid
            )
            
            # 3. Dispatch to Celery Queues
            for inst in instructions:
                logger.info(f"Dispatching to {inst.agent_code} with idempotency {inst.idempotency_key}")
                # In the future, this will call the respective agent's Celery task
                # e.g., current_app.send_task(inst.agent_code.lower() + "_task", kwargs=inst.payload)
                
    run_async(_run())

@shared_task(name="check_scheduled_cycles")
def check_scheduled_cycles():
    """
    Runs periodically to check if any client is scheduled to start a new cycle.
    """
    async def _run():
        async with AsyncSessionLocal() as session:
            tz = pytz.timezone('Asia/Ho_Chi_Minh')
            now = datetime.now(tz)
            
            current_day = now.isoweekday()
            current_time_str = now.strftime("%H:%M")
            
            stmt = select(Client).where(Client.is_active == True)
            result = await session.execute(stmt)
            clients = result.scalars().all()
            
            for client in clients:
                # Note: In production with 15min intervals, we'd check if schedule_time is within the last 15 mins.
                # For MVP, we'll do an exact match or simple comparison.
                if client.schedule_day == current_day and client.schedule_time == current_time_str:
                    logger.info(f"Triggering beat_weekly for client {client.id}")
                    a01_handle_trigger.delay(
                        client_id=str(client.id),
                        event_type="beat_weekly"
                    )
                    
    run_async(_run())
