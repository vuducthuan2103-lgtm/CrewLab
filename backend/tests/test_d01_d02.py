"""Integration tests for Spec 0007: D01 (Caption Writer) and D02 (Image Design & Matching)."""
import os
import uuid
from types import SimpleNamespace
import pytest
from sqlalchemy.future import select

# Enable mock LLM mode before test execution
os.environ["CREWLAB_LLM_MOCK"] = "true"

from app.agents.d01.executor import execute_d01
from app.agents.d02.executor import _resolve_selected_asset, execute_d02
from app.agents.d02.tools import query_media_library
from app.models.assets import BrandAsset
from app.models.clients import BrandSetting, Client
from app.models.content import ContentItem, ContentItemStateLog, ContentPillar, WorkflowCycle
from app.models.reviews import AgentMemory
from app.services.context_packet import build_context_packet
from app.services.task_errors import PermanentTaskInputError
from scripts.seed_bardinh import seed_bardinh


def test_d02_unknown_selector_id_falls_back_to_eligible_client_asset():
    first = SimpleNamespace(id=uuid.uuid4())
    second = SimpleNamespace(id=uuid.uuid4())

    selected, note = _resolve_selected_asset("hallucinated-asset-id", [first, second])

    assert selected is first
    assert "highest-ranked eligible client asset" in note


def test_d02_selector_fallback_keeps_a_real_image_available_for_guided_edit():
    source = SimpleNamespace(id=uuid.uuid4())

    selected, fallback_note = _resolve_selected_asset(None, [source])

    assert selected is source
    assert fallback_note is not None


@pytest.mark.asyncio
async def test_d01_normal_flow(db_session):
    """Test D01 Caption Writer normal execution from planned state."""
    client, cycle = await seed_bardinh(db_session)

    # 1. Create a ContentPillar and ContentItem
    pillar = ContentPillar(
        client_id=client.id,
        cycle_id=cycle.id,
        name="Product Spotlight",
        description="Giới thiệu sản phẩm đặc trưng của quán",
        weight=40,
    )
    db_session.add(pillar)
    await db_session.commit()

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        pillar_id=pillar.id,
        topic="Cold Brew mùa hè — hương vị mới",
        platform="facebook",
        status="planned",
    )
    db_session.add(item)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # 2. Execute D01
    updated_item = await execute_d01(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )

    # 3. Assertions
    assert updated_item.caption is not None
    assert "Cold Brew" in updated_item.caption
    assert updated_item.image_brief is not None
    assert "suggested_tags" in updated_item.image_brief
    assert updated_item.status == "visual_matching"

    # Verify State Logs
    stmt_log = select(ContentItemStateLog).where(
        ContentItemStateLog.content_item_id == item.id,
        ContentItemStateLog.agent_code == "D01",
    )
    res_log = await db_session.execute(stmt_log)
    logs = res_log.scalars().all()
    assert len(logs) == 1
    assert logs[0].previous_state == "planned"
    assert logs[0].new_state == "visual_matching"

    # Verify AgentMemory write with content_item_id
    stmt_mem = select(AgentMemory).where(
        AgentMemory.content_item_id == item.id,
        AgentMemory.agent_code == "D01",
    )
    res_mem = await db_session.execute(stmt_mem)
    memories = res_mem.scalars().all()
    assert len(memories) == 1
    assert memories[0].task_type == "caption_writing"
    assert memories[0].content_item_id == item.id


@pytest.mark.asyncio
async def test_d01_retry_flow_reads_previous_state(db_session):
    """Test D01 retry flow preserves previous_state='eval_failed' instead of hardcoding 'planned'."""
    client, cycle = await seed_bardinh(db_session)

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Sân thượng hoàng hôn",
        platform="instagram",
        status="eval_failed",
    )
    db_session.add(item)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # Execute D01 in retry mode
    await execute_d01(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="retry",
        fix_instructions="Viết ngắn gọn hơn cho Instagram",
        failed_criteria=["caption_length"],
    )

    # Verify previous_state recorded in state log is 'eval_failed'
    stmt_log = select(ContentItemStateLog).where(
        ContentItemStateLog.content_item_id == item.id,
        ContentItemStateLog.agent_code == "D01",
    )
    res_log = await db_session.execute(stmt_log)
    logs = res_log.scalars().all()
    assert len(logs) == 1
    assert logs[0].previous_state == "eval_failed"
    assert logs[0].new_state == "visual_matching"


@pytest.mark.asyncio
async def test_d01_rejects_content_item_from_another_client(db_session):
    owner, cycle = await seed_bardinh(db_session)
    other = Client(name="Other D01", brand_name="Other D01", is_active=True)
    item = ContentItem(
        client_id=owner.id,
        cycle_id=cycle.id,
        topic="Tenant secret",
        platform="facebook",
        status="planned",
    )
    db_session.add_all([other, item])
    await db_session.commit()

    with pytest.raises(PermanentTaskInputError):
        await execute_d01(
            session=db_session,
            client_id=other.id,
            cycle_id=cycle.id,
            content_item_id=item.id,
            context_packet={},
        )

    await db_session.refresh(item)
    assert item.status == "planned"


@pytest.mark.asyncio
async def test_d02_matching_real_photo(db_session):
    """Test D02 finding a matching real photo in brand_assets."""
    client, cycle = await seed_bardinh(db_session)

    # 1. Create a ContentItem with image_brief
    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Cold Brew mùa hè",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "Ly Cold Brew tươi mát trên bàn gỗ",
            "mood": "summer vibes",
            "suggested_tags": ["cold brew", "cà phê"],
            "composition_notes": "Close-up 45 độ",
            "avoid": ["ảnh mờ"],
        },
    )
    db_session.add(item)

    # 2. Add an approved BrandAsset with matching tags
    asset = BrandAsset(
        client_id=client.id,
        url="https://supabase.co/storage/cold_brew.jpg",
        file_name="cold_brew.jpg",
        tags=["cold brew", "cà phê đá"],
        asset_type="photo",
        source="real_photo",
        status="approved",
        usage_rights="client_owned",
    )
    db_session.add(asset)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # 3. Execute D02
    updated_item = await execute_d02(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )

    # 4. Assertions
    assert updated_item.image_url != asset.url
    assert updated_item.image_url.startswith("mock://generated/")
    assert updated_item.image_brief["d02_provenance"]["source_asset_id"] == str(asset.id)
    assert updated_item.image_brief["d02_provenance"]["edit_mode"] == "minimal_edit"
    assert updated_item.status == "visual_generating"

    # Verify State Log
    stmt_log = select(ContentItemStateLog).where(
        ContentItemStateLog.content_item_id == item.id,
        ContentItemStateLog.agent_code == "D02",
    )
    res_log = await db_session.execute(stmt_log)
    logs = res_log.scalars().all()
    assert len(logs) == 1
    assert logs[0].previous_state == "visual_matching"
    assert logs[0].new_state == "visual_generating"

    # Verify AgentMemory
    stmt_mem = select(AgentMemory).where(
        AgentMemory.content_item_id == item.id,
        AgentMemory.agent_code == "D02",
    )
    res_mem = await db_session.execute(stmt_mem)
    memories = res_mem.scalars().all()
    assert len(memories) == 1
    assert memories[0].content_item_id == item.id
    assert "minimal_edit" in memories[0].output_summary


@pytest.mark.asyncio
async def test_d02_rejects_content_item_from_another_client(db_session):
    owner, cycle = await seed_bardinh(db_session)
    other = Client(name="Other D02", brand_name="Other D02", is_active=True)
    item = ContentItem(
        client_id=owner.id,
        cycle_id=cycle.id,
        topic="Tenant visual",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "visual_mode": "visual_required",
            "description": "Secret product",
            "mood": "warm",
            "suggested_tags": ["secret"],
        },
    )
    db_session.add_all([other, item])
    await db_session.commit()

    with pytest.raises(PermanentTaskInputError):
        await execute_d02(
            session=db_session,
            client_id=other.id,
            cycle_id=cycle.id,
            content_item_id=item.id,
            context_packet={},
        )

    await db_session.refresh(item)
    assert item.image_url is None


@pytest.mark.asyncio
async def test_d02_no_photo_creates_new_ai_visual(db_session):
    """D02 always creates a final visual when no eligible real source exists."""
    client, cycle = await seed_bardinh(db_session)

    # A client setting cannot bypass D02's final-visual requirement.
    stmt_setting = select(BrandSetting).where(BrandSetting.client_id == client.id)
    res_setting = await db_session.execute(stmt_setting)
    setting = res_setting.scalar_one_or_none()
    if setting:
        setting.allow_ai_images = False
        await db_session.commit()

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Bánh croissant nướng nóng",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "Bánh croissant vàng giòn trên khay gỗ",
            "mood": "ấm áp",
            "suggested_tags": ["bánh ngọt", "croissant"],
            "composition_notes": "Top down shot",
            "avoid": ["bánh cháy"],
        },
    )
    db_session.add(item)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # Execute D02
    updated_item = await execute_d02(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )

    # Assertions
    assert updated_item.status == "visual_generating"
    assert updated_item.image_url.startswith("mock://generated/")
    assert updated_item.image_brief["d02_provenance"]["source_asset_id"] is None

@pytest.mark.asyncio
async def test_d02_ai_images_allowed_generates_ai_image(db_session):
    """Test D02 when allow_ai_images=True -> generates AI image when no real photo is found."""
    client, cycle = await seed_bardinh(db_session)

    # Set allow_ai_images = True
    stmt_setting = select(BrandSetting).where(BrandSetting.client_id == client.id)
    res_setting = await db_session.execute(stmt_setting)
    setting = res_setting.scalar_one_or_none()
    if setting:
        setting.allow_ai_images = True
        await db_session.commit()

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Poster khuyến mãi mùa hè",
        platform="facebook",
        status="visual_matching",
        image_brief={
            "description": "Poster phong cách biển xanh tươi mát",
            "mood": "vibrant",
            "suggested_tags": ["poster", "summer_promo"],
            "composition_notes": "Poster 3:4",
            "avoid": [],
        },
    )
    db_session.add(item)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # Execute D02
    updated_item = await execute_d02(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )

    # Assertions
    assert updated_item.status == "visual_generating"
    assert updated_item.image_url is not None
    assert updated_item.image_url.startswith("mock://generated/")


@pytest.mark.asyncio
async def test_d01_d02_chained_flow(db_session):
    """Test full D01 -> D02 chained flow for a planned item."""
    client, cycle = await seed_bardinh(db_session)

    # Add 1 brand asset so D02 finds a match
    asset = BrandAsset(
        client_id=client.id,
        url="https://supabase.co/storage/matcha.jpg",
        file_name="matcha.jpg",
        tags=["cà phê", "cold brew", "flat lay", "mùa hè"],
        asset_type="photo",
        source="real_photo",
        status="approved",
        usage_rights="client_owned",
    )
    db_session.add(asset)

    item = ContentItem(
        client_id=client.id,
        cycle_id=cycle.id,
        topic="Trà matcha sữa thơm ngon",
        platform="facebook",
        status="planned",
    )
    db_session.add(item)
    await db_session.commit()

    context_packet = (await build_context_packet(db_session, client.id)).model_dump()

    # Step 1: Run D01
    item_d01 = await execute_d01(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )
    assert item_d01.status == "visual_matching"
    assert item_d01.caption is not None
    assert item_d01.image_brief is not None

    # Step 2: Run D02
    item_d02 = await execute_d02(
        session=db_session,
        client_id=client.id,
        cycle_id=cycle.id,
        content_item_id=item.id,
        context_packet=context_packet,
        wake_reason="task_assigned",
    )
    assert item_d02.status == "visual_generating"
    assert item_d02.image_url != asset.url
    assert item_d02.image_url.startswith("mock://generated/")

    # Check complete history in ContentItemStateLog
    stmt_logs = (
        select(ContentItemStateLog)
        .where(ContentItemStateLog.content_item_id == item.id)
        .order_by(ContentItemStateLog.created_at.asc())
    )
    res_logs = await db_session.execute(stmt_logs)
    logs = res_logs.scalars().all()

    assert len(logs) == 2
    assert logs[0].agent_code == "D01"
    assert logs[0].previous_state == "planned"
    assert logs[0].new_state == "visual_matching"

    assert logs[1].agent_code == "D02"
    assert logs[1].previous_state == "visual_matching"
    assert logs[1].new_state == "visual_generating"
