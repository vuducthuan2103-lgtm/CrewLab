import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.content import ContentItem, ContentItemStateLog

async def update_content_state(
    session: AsyncSession,
    content_item_id: uuid.UUID,
    new_state: str,
    agent_code: Optional[str] = None,
    reason: Optional[str] = None
) -> Optional[ContentItem]:
    """
    T15 Tool functionality: Update content item status and log the transition.
    """
    stmt = select(ContentItem).where(ContentItem.id == content_item_id)
    result = await session.execute(stmt)
    item = result.scalar_one_or_none()
    
    if not item:
        return None
        
    previous_state = item.status
    
    if previous_state == new_state:
        # No state change
        return item
        
    # Update item
    item.status = new_state
    
    # Create log
    log_entry = ContentItemStateLog(
        content_item_id=content_item_id,
        agent_code=agent_code,
        previous_state=previous_state,
        new_state=new_state,
        reason=reason
    )
    
    session.add(log_entry)
    await session.commit()
    
    return item
