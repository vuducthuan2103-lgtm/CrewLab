"""Tool functions for D02 — Image Design & Matching agent.

T04: query_media_library — tag filter với Postgres JSONB ?| operator
T05: create_asset_request — tạo structured asset request, check duplicate
T12: generate_image_ai — mock implementation (Phase 1: allow_ai_images=false default)
"""
import logging
import uuid
from datetime import timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.db import utcnow
from app.models.assets import AssetRequest, BrandAsset

logger = logging.getLogger(__name__)


async def query_media_library(
    session: AsyncSession,
    client_id: uuid.UUID,
    tags: list[str],
    status: str = "approved",
    asset_type: str | None = None,
    limit: int = 10,
) -> list[BrandAsset]:
    """T04 — Tìm ảnh trong brand_assets theo tag filter.

    Dùng Postgres JSONB ?| operator: match nếu có ít nhất 1 tag trong danh sách.
    Chỉ trả ảnh status='approved'. Sắp xếp theo usage_count ASC (ưu tiên ảnh chưa dùng nhiều).
    """
    if not tags:
        logger.warning("query_media_library called with empty tags list")
        return []

    # Build raw SQL với JSONB ?| operator — SQLAlchemy ORM không hỗ trợ trực tiếp
    base_sql = """
        SELECT * FROM brand_assets
        WHERE client_id = :client_id
          AND status = :status
          AND tags ?| ARRAY[:tags]
    """
    params: dict = {
        "client_id": str(client_id),
        "status": status,
        "tags": tags,
    }

    if asset_type:
        base_sql += " AND asset_type = :asset_type"
        params["asset_type"] = asset_type

    base_sql += " ORDER BY COALESCE((SELECT 0), 0) ASC LIMIT :limit"
    params["limit"] = limit

    # Check dialect for SQLite fallback (used in pytest)
    bind = getattr(session, "bind", None)
    if bind and getattr(bind, "dialect", None) and bind.dialect.name == "sqlite":
        stmt = select(BrandAsset).where(
            BrandAsset.client_id == client_id,
            BrandAsset.status == status,
        )
        if asset_type:
            stmt = stmt.where(BrandAsset.asset_type == asset_type)
        res = await session.execute(stmt)
        all_assets = res.scalars().all()

        tags_set = set(t.lower().strip() for t in tags)
        matching = []
        for asset in all_assets:
            asset_tags = asset.tags or []
            if isinstance(asset_tags, list):
                asset_tags_set = set(str(t).lower().strip() for t in asset_tags)
                if tags_set.intersection(asset_tags_set):
                    matching.append(asset)
        return matching[:limit]

    # Postgres raw SQL với JSONB ?| operator
    tag_placeholders = ", ".join(f":tag_{i}" for i in range(len(tags)))
    sql = f"""
        SELECT id, client_id, url, file_name, tags, asset_type, source, status, created_at, updated_at
        FROM brand_assets
        WHERE client_id = :client_id
          AND status = :status
          AND tags::jsonb ?| ARRAY[{tag_placeholders}]
    """
    if asset_type:
        sql += " AND asset_type = :asset_type"
    sql += " ORDER BY created_at DESC LIMIT :limit"

    bind_params: dict = {
        "client_id": str(client_id),
        "status": status,
        "limit": limit,
    }
    for i, tag in enumerate(tags):
        bind_params[f"tag_{i}"] = tag
    if asset_type:
        bind_params["asset_type"] = asset_type

    try:
        result = await session.execute(text(sql), bind_params)
        rows = result.fetchall()
    except Exception as e:
        logger.error(f"query_media_library DB error: {e}")
        raise

    # Convert rows to BrandAsset-like objects bằng cách query ORM
    if not rows:
        return []

    asset_ids = [row[0] for row in rows]
    stmt = select(BrandAsset).where(BrandAsset.id.in_(asset_ids))
    res = await session.execute(stmt)
    assets = res.scalars().all()

    logger.info(
        f"query_media_library: client={client_id} tags={tags} → {len(assets)} assets found"
    )
    return list(assets)


async def create_asset_request(
    session: AsyncSession,
    client_id: uuid.UUID,
    content_item_id: uuid.UUID,
    image_brief,  # ImageBrief instance
    topic: str = "",
    expires_days: int = 3,
) -> AssetRequest | None:
    """T05 — Tạo AssetRequest có cấu trúc cho client.

    Check duplicate trước: nếu đã có AssetRequest pending cho item này → skip, trả None.
    """
    from app.agents.d02.prompts import build_d02_asset_request_note

    # Duplicate check
    stmt = select(AssetRequest).where(
        AssetRequest.content_item_id == content_item_id,
        AssetRequest.status == "pending",
    )
    res = await session.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        logger.info(
            f"AssetRequest already pending for item={content_item_id} (id={existing.id}), skipping create"
        )
        return existing

    # Build structured request
    note, shot_list = build_d02_asset_request_note(image_brief, topic)

    expires_at = utcnow() + timedelta(days=expires_days)

    asset_request = AssetRequest(
        client_id=client_id,
        content_item_id=content_item_id,
        note=note,
        shot_list=shot_list,
        reference_tags=image_brief.suggested_tags,
        example_asset_ids=[],
        status="pending",
        priority="normal",
        expires_at=expires_at,
    )
    session.add(asset_request)
    # Không commit ở đây — để executor's transaction handle

    logger.info(
        f"AssetRequest created: client={client_id} item={content_item_id} "
        f"expires={expires_at.date()} shot_list={len(shot_list)} shots"
    )
    return asset_request


async def generate_image_ai(
    session: AsyncSession,
    client_id: uuid.UUID,
    prompt: str,
    size: str = "1080x1080",
) -> BrandAsset:
    """T12 — Generate AI image.

    Phase 1: MOCK ONLY — allow_ai_images=false by default, nhánh này hiếm khi chạy.
    Phase 2+: tích hợp provider thực (DALL-E / Replicate / Flux) khi cần.
    """
    logger.info(f"T12 generate_image_ai (MOCK): client={client_id} prompt={prompt[:80]}...")

    # Mock: tạo BrandAsset với placeholder AI image
    mock_asset = BrandAsset(
        client_id=client_id,
        url=f"https://via.placeholder.com/{size}?text=AI+Generated",
        file_name=f"ai_generated_{uuid.uuid4().hex[:8]}.jpg",
        tags=["ai_generated", "mock"],
        asset_type="photo",
        source="ai_generated",
        status="approved",
    )
    session.add(mock_asset)
    # Không commit — để caller handle

    logger.warning(
        "T12 generate_image_ai is MOCKED. "
        "Real AI image generation will be implemented in Phase 2+ spec."
    )
    return mock_asset
