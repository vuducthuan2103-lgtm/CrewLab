"""Integration tests for Spec 0006: B02 (Content Pillar), Gate S2 approval, and B03 (Content Plan)."""
import os
import uuid
import pytest
from sqlalchemy.future import select

# Enable mock LLM mode before importing LLM modules
os.environ["CREWLAB_LLM_MOCK"] = "true"

from app.agents.b02.executor import execute_b02
from app.agents.b03.executor import execute_b03
from app.models.content import ContentItem, ContentPillar
from app.models.reviews import HitlReview
from app.services.context_packet import build_context_packet
from app.services.gate_service import approve_gate
from scripts.seed_bardinh import seed_bardinh


@pytest.mark.asyncio
async def test_b02_b03_end_to_end_flow(db_session):
    """Test full B02 -> Gate S2 Approve -> B03 flow with mock LLM."""
    # 1. Seed Bardinh Coffee data
    client, cycle = await seed_bardinh(db_session)
    client_id = client.id
    cycle_id = cycle.id

    # 2. Build context packet
    context_packet = await build_context_packet(db_session, client_id)
    packet_dict = context_packet.model_dump()

    # 3. Execute B02 (Content Pillar)
    pillars = await execute_b02(
        session=db_session,
        client_id=client_id,
        cycle_id=cycle_id,
        context_packet=packet_dict,
        wake_reason="scheduled",
    )

    assert len(pillars) == 3
    total_weight = sum(p.weight for p in pillars)
    assert total_weight == 100
    assert pillars[0].name == "Product Spotlight"
    assert pillars[0].weight == 40

    # Verify DB state for B02
    stmt_p = select(ContentPillar).where(ContentPillar.cycle_id == cycle_id)
    res_p = await db_session.execute(stmt_p)
    db_pillars = res_p.scalars().all()
    assert len(db_pillars) == 3

    # 4. Gate S2 Approval — User approves pillars via Portal
    fake_admin_id = uuid.uuid4()
    review, instructions = await approve_gate(
        session=db_session,
        client_id=client_id,
        cycle_id=cycle_id,
        gate_type="s2_pillar",
        reviewer_id=fake_admin_id,
        action="approved",
    )

    assert review.gate_type == "s2_pillar"
    assert review.action == "approved"
    assert len(instructions) == 1
    assert instructions[0].agent_code == "B03"

    # Verify hitl_reviews table state
    stmt_rev = select(HitlReview).where(
        HitlReview.cycle_id == cycle_id if hasattr(HitlReview, "cycle_id") else HitlReview.target_id == cycle_id
    )
    res_rev = await db_session.execute(stmt_rev)
    db_review = res_rev.scalar_one_or_none()
    assert db_review is not None
    assert db_review.gate_type == "s2_pillar"

    # 5. Execute B03 (Content Plan)
    items = await execute_b03(
        session=db_session,
        client_id=client_id,
        cycle_id=cycle_id,
        context_packet=packet_dict,
        wake_reason="task_assigned",
    )

    # Bardinh posting_frequency is {"facebook": 3, "instagram": 2} -> total 5 items
    assert len(items) == 5

    fb_items = [i for i in items if i.platform == "facebook"]
    ig_items = [i for i in items if i.platform == "instagram"]
    assert len(fb_items) == 3
    assert len(ig_items) == 2

    # Verify ContentItem DB fields
    for item in items:
        assert item.status == "planned"
        assert item.pillar_id is not None
        assert item.scheduled_date is not None
        assert item.scheduled_time is not None

    # Verify DB state for B03 items
    stmt_items = select(ContentItem).where(ContentItem.cycle_id == cycle_id)
    res_items = await db_session.execute(stmt_items)
    db_items = res_items.scalars().all()
    assert len(db_items) == 5
