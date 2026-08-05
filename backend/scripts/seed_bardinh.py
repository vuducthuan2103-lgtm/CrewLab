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
from app.models.content import ContentItem, ContentPillar, WorkflowCycle
from app.models.assets import AssetRequest
from app.models.system import TaskLog
from app.models.llm_config import ClientLLMConfig

logger = logging.getLogger(__name__)

# Fixed UUID for Bardinh Coffee seed data so it's consistent across tests/demos
BARDIHN_CLIENT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
BARDIHN_CYCLE_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
SEED_PILLAR_IDS = [
    uuid.UUID("33333333-3333-3333-3333-333333333331"),
    uuid.UUID("33333333-3333-3333-3333-333333333332"),
    uuid.UUID("33333333-3333-3333-3333-333333333333"),
    uuid.UUID("33333333-3333-3333-3333-333333333334"),
]
SEED_ITEM_IDS = [
    uuid.UUID("44444444-4444-4444-4444-444444444441"),
    uuid.UUID("44444444-4444-4444-4444-444444444442"),
    uuid.UUID("44444444-4444-4444-4444-444444444443"),
    uuid.UUID("44444444-4444-4444-4444-444444444444"),
]
SEED_ASSET_REQUEST_ID = uuid.UUID("55555555-5555-5555-5555-555555555551")


async def seed_bardinh(
    session: AsyncSession,
    include_staging_content: bool = False,
) -> tuple[Client, WorkflowCycle]:
    """Seed core Bardinh config; optionally add deterministic staging records."""

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

    if not include_staging_content:
        await session.commit()
        await session.refresh(client)
        await session.refresh(cycle)
        return client, cycle

    # 5. Seed a small, deterministic staging dataset covering the main portal gates.
    pillar_values = [
        ("Món & Đồ uống", "Sản phẩm chủ lực và trải nghiệm vị giác", 35),
        ("Câu chuyện quán", "Con người, quy trình và nguồn gốc", 30),
        ("Lifestyle & Community", "Nhịp sống và cộng đồng yêu cà phê", 20),
        ("Ưu đãi theo mùa", "Ưu đãi có thời hạn và dịp đặc biệt", 15),
    ]
    pillars = []
    for pillar_id, (name, description, weight) in zip(SEED_PILLAR_IDS, pillar_values):
        pillar = await session.scalar(select(ContentPillar).where(ContentPillar.id == pillar_id))
        if not pillar:
            pillar = ContentPillar(
                id=pillar_id,
                client_id=BARDIHN_CLIENT_ID,
                cycle_id=BARDIHN_CYCLE_ID,
                name=name,
                description=description,
                weight=weight,
            )
            session.add(pillar)
        pillars.append(pillar)

    item_values = [
        ("Cold Brew Cầu Đất — bài giới thiệu sản phẩm", "facebook", "pending_content_approval", 0),
        ("Behind the scenes: một mẻ rang thủ công", "instagram", "waiting_asset", 0),
        ("Gợi ý góc làm việc cùng cà phê sáng", "both", "planned", 0),
        ("Ưu đãi cuối tuần cho khách quen", "facebook", "eval_failed", 1),
    ]
    items = []
    for item_id, (topic, platform, status, retry_count) in zip(SEED_ITEM_IDS, item_values):
        item = await session.scalar(select(ContentItem).where(ContentItem.id == item_id))
        if not item:
            item = ContentItem(
                id=item_id,
                client_id=BARDIHN_CLIENT_ID,
                cycle_id=BARDIHN_CYCLE_ID,
                pillar_id=SEED_PILLAR_IDS[len(items) % len(SEED_PILLAR_IDS)],
                topic=topic,
                platform=platform,
                status=status,
                caption=(
                    "Một tách Cold Brew mát lạnh, vị sạch và hậu vị dịu — sẵn sàng cho buổi sáng nhiều năng lượng."
                    if status != "planned" else None
                ),
                image_url=("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085" if status != "waiting_asset" else None),
                eval_retry_count=retry_count,
                failed_criteria=["visual_match"] if status == "eval_failed" else None,
                fix_instructions="Cần chọn ảnh đúng sản phẩm và bối cảnh thương hiệu." if status == "eval_failed" else None,
            )
            session.add(item)
        items.append(item)

    asset_request = await session.scalar(select(AssetRequest).where(AssetRequest.id == SEED_ASSET_REQUEST_ID))
    if not asset_request:
        asset_request = AssetRequest(
            id=SEED_ASSET_REQUEST_ID,
            client_id=BARDIHN_CLIENT_ID,
            content_item_id=SEED_ITEM_IDS[1],
            note="Vui lòng gửi 2 ảnh thật: quầy pha chế và cận cảnh mẻ rang.",
            shot_list=["Ảnh quầy pha chế", "Ảnh cận cảnh mẻ rang"],
            reference_tags=["coffee", "handcrafted", "warm-light"],
            status="pending",
            priority="normal",
        )
        session.add(asset_request)

    task_values = [
        ("B02", "content_planning", "completed", SEED_ITEM_IDS[0]),
        ("D01", "write_caption", "completed", SEED_ITEM_IDS[0]),
        ("E01", "evaluate_content", "failed", SEED_ITEM_IDS[3]),
    ]
    for agent_code, task_type, status, content_item_id in task_values:
        existing = await session.scalar(
            select(TaskLog).where(
                TaskLog.client_id == BARDIHN_CLIENT_ID,
                TaskLog.agent_code == agent_code,
                TaskLog.task_type == task_type,
                TaskLog.content_item_id == content_item_id,
            )
        )
        if not existing:
            session.add(
                TaskLog(
                    client_id=BARDIHN_CLIENT_ID,
                    content_item_id=content_item_id,
                    agent_code=agent_code,
                    task_type=task_type,
                    status=status,
                    wake_reason="scheduled" if status == "completed" else "retry",
                )
            )

    await session.commit()
    await session.refresh(client)
    await session.refresh(cycle)

    return client, cycle


async def _main():
    from app.core.db import AsyncSession
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        client, cycle = await seed_bardinh(session, include_staging_content=True)
        print(f"Successfully seeded Bardinh Coffee: client_id={client.id}, cycle_id={cycle.id}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
