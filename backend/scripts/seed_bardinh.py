"""Seed script for Bardinh Coffee pilot client.

Creates/upserts:
1. Client (Bardinh Coffee)
2. BrandSetting (with brand_voice, tone, posting_frequency)
3. ClientLLMConfig (for 6 agents: A01, B02, B03, D01, D02, E01)
4. Active WorkflowCycle

Usage:
  python -m scripts.seed_bardinh
  Or import seed_bardinh(session) in test files.
"""
import asyncio
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.db import engine
from app.models.clients import BrandSetting, Client
from app.models.content import WorkflowCycle
from app.models.llm_config import ClientLLMConfig

logger = logging.getLogger(__name__)

# Fixed UUID for Bardinh Coffee seed data so it's consistent across tests/demos
BARDIHN_CLIENT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
BARDIHN_CYCLE_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


async def seed_bardinh(session: AsyncSession) -> tuple[Client, WorkflowCycle]:
    """Seed Bardinh Coffee data into database. Reusable for tests, scripts, and demos."""

    # 1. Upsert Client
    stmt_client = select(Client).where(Client.id == BARDIHN_CLIENT_ID)
    res_client = await session.execute(stmt_client)
    client = res_client.scalar_one_or_none()

    if not client:
        client = Client(
            id=BARDIHN_CLIENT_ID,
            name="Bardinh Coffee",
            brand_name="Bardinh Coffee",
            is_active=True,
            industry="F&B Coffee",
            timezone="Asia/Ho_Chi_Minh",
            schedule_frequency="weekly",
            schedule_day=1,
            schedule_time="08:00",
            platforms=["facebook", "instagram"],
        )
        session.add(client)
        logger.info("Created Client: Bardinh Coffee")

    # 2. Upsert BrandSetting
    stmt_setting = select(BrandSetting).where(
        BrandSetting.client_id == BARDIHN_CLIENT_ID,
        BrandSetting.is_current == True,
    )
    res_setting = await session.execute(stmt_setting)
    setting = res_setting.scalar_one_or_none()

    if not setting:
        setting = BrandSetting(
            client_id=BARDIHN_CLIENT_ID,
            is_current=True,
            brand_voice_short="Thân thiện, mộc mạc, đậm chất cà phê thủ công Việt Nam.",
            tone_of_voice="Ấm áp, gần gũi, chia sẻ chân thành",
            target_audience="Dân văn phòng, người yêu cà phê chất lượng tại TPHCM (22-40 tuổi)",
            avoid_phrases=["giảm giá sốc", "cam kết 100%", "mua ngay kẻo lỡ"],
            brand_colors={"primary": "#4A2C11", "secondary": "#D9A05B", "background": "#FDFBF7"},
            personality_keywords=["Thủ công", "Chân thành", "Mộc mạc", "Tỉ mỉ"],
            writing_style="Câu văn mượt mà, sử dụng ẩn dụ nhẹ nhàng về hương vị cà phê và nhịp sống.",
            sample_captions=[
                "Một tách Cold Brew mát lạnh cho ngày thứ 2 tràn đầy cảm hứng...",
                "Hạt cà phê Arabica Cầu Đất được rang mộc tỉ mỉ mỗi tuần..."
            ],
            posting_frequency={"facebook": 3, "instagram": 2},
        )
        session.add(setting)
        logger.info("Created BrandSetting for Bardinh Coffee")

    # 3. Upsert ClientLLMConfig (6 MVP agents)
    agents_config = [
        ("A01", "anthropic", "claude-sonnet-4-20250514", "power"),
        ("B02", "openai", "gpt-4o", "standard"),
        ("B03", "openai", "gpt-4o", "standard"),
        ("D01", "openai", "gpt-4o", "standard"),
        ("D02", "openai", "gpt-4o", "standard"),
        ("E01", "google", "gemini-2.5-flash", "standard"),
    ]

    for agent_code, provider, model, tier in agents_config:
        stmt_llm = select(ClientLLMConfig).where(
            ClientLLMConfig.client_id == BARDIHN_CLIENT_ID,
            ClientLLMConfig.agent_code == agent_code,
        )
        res_llm = await session.execute(stmt_llm)
        llm_cfg = res_llm.scalar_one_or_none()

        if not llm_cfg:
            llm_cfg = ClientLLMConfig(
                client_id=BARDIHN_CLIENT_ID,
                agent_code=agent_code,
                provider=provider,
                model=model,
                tier=tier,
                is_active=True,
            )
            session.add(llm_cfg)

    # 4. Upsert WorkflowCycle
    stmt_cycle = select(WorkflowCycle).where(WorkflowCycle.id == BARDIHN_CYCLE_ID)
    res_cycle = await session.execute(stmt_cycle)
    cycle = res_cycle.scalar_one_or_none()

    if not cycle:
        cycle = WorkflowCycle(
            id=BARDIHN_CYCLE_ID,
            client_id=BARDIHN_CLIENT_ID,
            phase="strategy",
            status="active",
        )
        session.add(cycle)
        logger.info("Created WorkflowCycle for Bardinh Coffee")

    await session.commit()
    await session.refresh(client)
    await session.refresh(cycle)

    return client, cycle


async def _main():
    from app.core.db import AsyncSession
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        client, cycle = await seed_bardinh(session)
        print(f"Successfully seeded Bardinh Coffee: client_id={client.id}, cycle_id={cycle.id}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
