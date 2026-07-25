import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.clients import BrandSetting
from app.models.reviews import AgentMemory
from app.agents.a01.schemas import ContextPacket

async def build_context_packet(session: AsyncSession, client_id: uuid.UUID) -> ContextPacket:
    """
    Builds the MVP context packet containing:
    1. The current Brand Settings (voice, tone, style, etc.)
    2. Episodic Memory (recent AgentMemory rows for this client)
    """
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
        }
        
    # 2. Fetch Episodic Memory (Last 5 memories)
    stmt_memory = select(AgentMemory).where(
        AgentMemory.client_id == client_id
    ).order_by(AgentMemory.created_at.desc()).limit(5)
    
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
