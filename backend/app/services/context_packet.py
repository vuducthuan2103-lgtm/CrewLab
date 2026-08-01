import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.clients import BrandSetting
from app.models.reviews import AgentMemory
async def build_context_packet(session: AsyncSession, client_id: uuid.UUID):
    """
    Builds the MVP context packet containing:
    1. The current Brand Settings (voice, tone, style, posting_frequency, etc.)
    2. Episodic Memory (recent AgentMemory rows for this client)
    """
    from app.agents.a01.schemas import ContextPacket

    # 1. Fetch Brand Settings
    stmt_settings = select(BrandSetting).where(
        BrandSetting.client_id == client_id,
        BrandSetting.is_current == True
    )
    result_settings = await session.execute(stmt_settings)
    brand_setting = result_settings.scalar_one_or_none()
    
    settings_dict = {}
    if brand_setting:
        settings_dict = {
            "brand_voice_short": brand_setting.brand_voice_short,
            "tone_of_voice": brand_setting.tone_of_voice,
            "target_audience": brand_setting.target_audience,
            "avoid_phrases": brand_setting.avoid_phrases,
            "brand_colors": brand_setting.brand_colors,
            "personality_keywords": brand_setting.personality_keywords,
            "writing_style": brand_setting.writing_style,
            "sample_captions": brand_setting.sample_captions,
            "posting_frequency": brand_setting.posting_frequency,
        }
        
    # 2. Fetch Episodic Memory (Last 5 memories + All human_feedback in last 30 days)
    # For simplicity in MVP, we just get the most recent ones and filter those with human feedback
    from datetime import datetime, timedelta
    from app.core.db import utcnow
    
    thirty_days_ago = utcnow() - timedelta(days=30)
    
    stmt_memory = select(AgentMemory).where(
        AgentMemory.client_id == client_id,
        AgentMemory.human_feedback.isnot(None),
        AgentMemory.created_at >= thirty_days_ago
    ).order_by(AgentMemory.created_at.desc())
    
    result_memory = await session.execute(stmt_memory)
    memories = result_memory.scalars().all()
    
    memory_list = []
    for mem in memories:
        memory_list.append({
            "agent_code": mem.agent_code,
            "task_type": mem.task_type,
            "input_summary": mem.input_summary,
            "output_summary": mem.output_summary,
            "human_feedback": mem.human_feedback,
            "eval_score": mem.eval_score
        })
        
    return ContextPacket(
        brand_settings=settings_dict,
        episodic_memory=memory_list
    )
