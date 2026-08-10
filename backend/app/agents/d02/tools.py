"""Database and generation tools for the D02 visual-production agent."""
import logging
import hashlib
from io import BytesIO
import os
import re
import uuid

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from PIL import Image

from app.core.llm import LLMConfigurationError, create_asset_embedding, generate_image
from app.models.assets import BrandAsset, SemanticAssetRecord
from app.services.asset_service import inspect_image_upload
from app.services.storage import (
    BRAND_ASSETS_BUCKET,
    client_derivative_path,
    download_file,
    upload_file,
)

logger = logging.getLogger(__name__)


async def query_media_library(
    session: AsyncSession,
    client_id: uuid.UUID,
    tags: list[str],
    status: str = "approved",
    asset_type: str | None = None,
    limit: int = 10,
    visual_intent_text: str | None = None,
    exclusion_audit: list[dict] | None = None,
) -> list[BrandAsset]:
    """Hybrid pgvector + lexical retrieval with tenant and eligibility gates.

    Newly uploaded assets require a ready Semantic Asset Record. Only legacy
    assets without any semantic row may use the metadata fallback during the
    controlled backfill window.
    """
    if not tags and not visual_intent_text:
        logger.warning("query_media_library called without tags or Visual Intent")
        return []

    bind = getattr(session, "bind", None)
    dialect = getattr(getattr(bind, "dialect", None), "name", None)
    disallowed_rights = ("unknown", "denied", "expired", "restricted", "none")
    hard_filters = (
        BrandAsset.client_id == client_id,
        BrandAsset.status == status,
        BrandAsset.source_asset_id.is_(None),
        BrandAsset.source.in_(("client_uploaded", "real_photo", "portal")),
        BrandAsset.usage_rights.is_not(None),
        BrandAsset.usage_rights.not_in(disallowed_rights),
    )

    if exclusion_audit is not None:
        audit_stmt = (
            select(BrandAsset)
            .where(
                BrandAsset.client_id == client_id,
                BrandAsset.source_asset_id.is_(None),
            )
            .options(selectinload(BrandAsset.semantic_record))
            .order_by(BrandAsset.created_at.desc())
            .limit(200)
        )
        for asset in (await session.execute(audit_stmt)).scalars().all():
            reason = None
            if asset.status != status:
                reason = "approval_not_approved"
            elif asset.source not in {"client_uploaded", "real_photo", "portal"}:
                reason = "source_not_eligible"
            elif not asset.usage_rights or asset.usage_rights in disallowed_rights:
                reason = "usage_rights_ineligible"
            elif asset.semantic_record is not None and asset.semantic_record.status != "ready":
                reason = f"semantic_{asset.semantic_record.status}"
            elif asset.semantic_record is not None and (
                (asset.semantic_record.safety or {}).get("safe") is False
            ):
                reason = "safety_gate_failed"
            elif asset.semantic_record is not None and (
                (asset.semantic_record.technical_quality or {}).get("usable") is False
            ):
                reason = "technical_quality_gate_failed"
            if reason:
                exclusion_audit.append({"asset_id": str(asset.id), "reason": reason})

    query_embedding = None
    if visual_intent_text:
        try:
            query_embedding = await create_asset_embedding(
                session=session,
                client_id=client_id,
                text_value=visual_intent_text,
                wake_reason="d02_semantic_retrieval",
            )
        except LLMConfigurationError:
            logger.warning("No compatible embedding provider for client=%s", client_id)

    semantic_scores: dict[uuid.UUID, float] = {}
    if query_embedding is not None and dialect != "sqlite":
        similarity = (
            1 - SemanticAssetRecord.embedding.cosine_distance(query_embedding.embedding)
        ).label("semantic_similarity")
        vector_stmt = (
            select(BrandAsset, similarity)
            .join(
                SemanticAssetRecord,
                SemanticAssetRecord.source_asset_id == BrandAsset.id,
            )
            .where(
                *hard_filters,
                SemanticAssetRecord.client_id == client_id,
                SemanticAssetRecord.status == "ready",
                SemanticAssetRecord.embedding_version == query_embedding.version,
                SemanticAssetRecord.embedding.is_not(None),
            )
            .options(selectinload(BrandAsset.semantic_record))
            .order_by(similarity.desc())
            .limit(max(limit * 5, 25))
        )
        if asset_type:
            vector_stmt = vector_stmt.where(BrandAsset.asset_type == asset_type)
        for asset, score in (await session.execute(vector_stmt)).all():
            semantic_scores[asset.id] = max(0.0, min(float(score or 0.0), 1.0))

    pool_stmt = (
        select(BrandAsset)
        .outerjoin(
            SemanticAssetRecord,
            SemanticAssetRecord.source_asset_id == BrandAsset.id,
        )
        .where(
            *hard_filters,
            or_(
                SemanticAssetRecord.id.is_(None),
                (
                    (SemanticAssetRecord.client_id == client_id)
                    & (SemanticAssetRecord.status == "ready")
                ),
            ),
        )
        .options(selectinload(BrandAsset.semantic_record))
        .order_by(BrandAsset.created_at.desc())
        .limit(max(limit * 10, 50))
    )
    if asset_type:
        pool_stmt = pool_stmt.where(BrandAsset.asset_type == asset_type)
    assets = list((await session.execute(pool_stmt)).scalars().unique().all())

    wanted_tags = {str(tag).casefold().strip() for tag in tags if str(tag).strip()}
    intent_tokens = set(re.findall(r"[\w-]+", (visual_intent_text or "").casefold()))
    ranked: list[tuple[float, BrandAsset]] = []
    for asset in assets:
        record = asset.semantic_record
        if record is not None:
            if (record.safety or {}).get("safe") is False:
                continue
            if (record.technical_quality or {}).get("usable") is False:
                continue
            edit_score = (record.editability or {}).get("score")
            if isinstance(edit_score, (int, float)) and edit_score < 0.25:
                continue

        semantic_score = semantic_scores.get(asset.id)
        if semantic_score is None and query_embedding is not None and dialect == "sqlite" and record is not None:
            stored = [float(value) for value in (record.embedding or [])]
            if len(stored) == len(query_embedding.embedding):
                semantic_score = sum(
                    left * right for left, right in zip(stored, query_embedding.embedding)
                )

        searchable_values = [str(value).casefold().strip() for value in (asset.tags or [])]
        if record is not None:
            searchable_values.extend(
                str(value).casefold().strip() for value in (record.suggested_tags or [])
            )
            searchable_values.extend(
                str(value).casefold().strip() for value in (record.primary_subjects or [])
            )
        exact_hits = len(wanted_tags.intersection(searchable_values))
        searchable_text = " ".join(searchable_values + [
            (record.semantic_summary or "").casefold() if record is not None else ""
        ])
        token_hits = len(intent_tokens.intersection(set(re.findall(r"[\w-]+", searchable_text))))
        lexical_score = min(1.0, exact_hits * 0.35 + token_hits * 0.03)
        if semantic_score is None and lexical_score <= 0:
            continue

        freshness_score = 1.0 / (1.0 + max(asset.usage_count or 0, 0))
        rights_score = 1.0 if asset.usage_rights else 0.5
        if semantic_score is None:
            hybrid_score = lexical_score * 0.85 + freshness_score * 0.10 + rights_score * 0.05
        else:
            hybrid_score = (
                semantic_score * 0.70
                + lexical_score * 0.20
                + freshness_score * 0.05
                + rights_score * 0.05
            )
        asset._semantic_similarity = semantic_score
        asset._lexical_score = lexical_score
        asset._hybrid_score = max(0.0, min(hybrid_score, 1.0))
        ranked.append((asset._hybrid_score, asset))

    ranked.sort(key=lambda candidate: candidate[0], reverse=True)
    return [asset for _, asset in ranked[:limit]]


async def generate_image_ai(
    session: AsyncSession,
    client_id: uuid.UUID,
    prompt: str,
    size: str = "1080x1080",
    source_asset_id: uuid.UUID | None = None,
    generation_mode: str = "new_generation",
) -> BrandAsset:
    """Create a new D02 derivative through the configured image-capable LLM."""
    source_asset = None
    source_bytes = None
    source_file_name = "source.png"
    source_content_type = "image/png"
    if source_asset_id is not None:
        source_asset = await session.get(BrandAsset, source_asset_id)
        if source_asset is None or source_asset.client_id != client_id:
            raise ValueError("D02 source asset does not belong to the client")
        if not source_asset.storage_path:
            if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in {"true", "1", "yes"}:
                source_bytes = b"mock-source-pixels"
            else:
                raise ValueError("D02 source asset has no immutable storage object")
        else:
            source_bytes = download_file(BRAND_ASSETS_BUCKET, source_asset.storage_path)
            if not source_bytes:
                raise RuntimeError("D02 could not download immutable source pixels")
        source_file_name = source_asset.file_name or "source.png"
        source_content_type = source_asset.format or "image/png"

    result = await generate_image(
        session=session,
        client_id=client_id,
        prompt=prompt,
        size="1024x1024" if size == "1080x1080" else size,
        source_image_bytes=source_bytes,
        source_file_name=source_file_name,
        source_content_type=source_content_type,
        generation_mode=generation_mode,
    )
    derivative_id = uuid.uuid4()
    storage_path = ""
    content_sha256 = None
    dimensions = None
    image_format = None
    persisted_url = result.image_url
    derivative_extension = "png"
    generated_bytes = result.image_bytes
    if generated_bytes is None and result.provider == "mock":
        mock_buffer = BytesIO()
        Image.new("RGB", (1024, 1024), (120, 80, 40)).save(mock_buffer, format="PNG")
        generated_bytes = mock_buffer.getvalue()

    technical_validation = None
    if generated_bytes is not None:
        inspection = inspect_image_upload(generated_bytes)
        if not inspection.is_d02_resolution:
            raise ValueError("D02 generated image is below the minimum usable resolution")
        technical_validation = {
            "passed": True,
            "format": inspection.image_format,
            "content_type": inspection.content_type,
            "dimensions": inspection.dimensions,
            "width": inspection.width,
            "height": inspection.height,
            "size_bytes": len(generated_bytes),
        }
        storage_path = client_derivative_path(
            str(client_id), str(derivative_id), inspection.content_type
        )
        if result.provider != "mock":
            if not upload_file(
                BRAND_ASSETS_BUCKET,
                storage_path,
                generated_bytes,
                inspection.content_type,
            ):
                raise RuntimeError("D02 generated image could not be persisted to CrewLab Storage")
            persisted_url = storage_path
        else:
            storage_path = ""
        content_sha256 = hashlib.sha256(generated_bytes).hexdigest()
        dimensions = inspection.dimensions
        image_format = inspection.content_type
        derivative_extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }[inspection.content_type]

    generated_asset = BrandAsset(
        id=derivative_id,
        client_id=client_id,
        url=persisted_url,
        storage_path=storage_path,
        file_name=f"ai_generated_{uuid.uuid4().hex[:8]}.{derivative_extension}",
        tags=["ai_generated", "d02_derivative"],
        asset_type="photo",
        source="d02_ai_derivative",
        status="approved",
        source_asset_id=source_asset_id,
        generation_mode=generation_mode,
        content_sha256=content_sha256,
        dimensions=dimensions,
        format=image_format,
        usage_rights="client_derivative",
    )
    generated_asset._technical_validation = technical_validation
    session.add(generated_asset)
    return generated_asset
