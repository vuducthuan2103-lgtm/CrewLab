"""Background semantic analysis for immutable, client-owned source images."""
import logging
import uuid

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import LLMConfigurationError, call_llm, create_asset_embedding
from app.models.assets import BrandAsset, SemanticAssetRecord
from app.services.storage import BRAND_ASSETS_BUCKET, download_file, get_signed_url

logger = logging.getLogger(__name__)


class TechnicalQuality(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usable: bool


class Editability(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: float = Field(ge=0, le=1)


class Safety(BaseModel):
    model_config = ConfigDict(extra="forbid")

    safe: bool


class Confidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall: float = Field(ge=0, le=1)


class AssetSemanticOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(max_length=1000)
    primary_subjects: list[str]
    secondary_subjects: list[str]
    setting: list[str]
    actions: list[str]
    composition: list[str]
    mood_lighting: list[str]
    text_safe_areas: list[str]
    visible_text: list[str]
    suggested_tags: list[str]
    technical_quality: TechnicalQuality
    editability: Editability
    safety: Safety
    confidence: Confidence


ANALYSIS_PROMPT = """Analyse this client-owned marketing-library image. Return only
facts visible in the image; do not identify people or infer identities. Describe
subjects/products, setting, actions, composition, lighting, safe areas for text,
visible text, concise searchable tags, technical quality, editability, safety and
confidence. Return JSON matching the requested schema."""

ANALYSIS_VERSION = "vision-facts-multimodal-v2"


def semantic_embedding_text(output: AssetSemanticOutput) -> str:
    """Canonical text paired with the source image analysis for embedding."""
    sections = {
        "summary": [output.summary],
        "primary_subjects": output.primary_subjects,
        "secondary_subjects": output.secondary_subjects,
        "setting": output.setting,
        "actions": output.actions,
        "composition": output.composition,
        "mood_lighting": output.mood_lighting,
        "text_safe_areas": output.text_safe_areas,
        "visible_text": output.visible_text,
        "suggested_tags": output.suggested_tags,
    }
    return "\n".join(
        f"{name}: {', '.join(str(value) for value in values if value)}"
        for name, values in sections.items()
        if values
    )


async def mark_semantic_index_failed(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    asset_id: uuid.UUID,
    reason: str,
) -> None:
    """Leave an exhausted background task in an observable terminal state."""
    record = await session.scalar(
        select(SemanticAssetRecord).where(
            SemanticAssetRecord.client_id == client_id,
            SemanticAssetRecord.source_asset_id == asset_id,
        )
    )
    if record is None:
        return
    record.status = "failed"
    record.failure_reason = reason[:200]
    await session.commit()


async def index_asset_semantics(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    asset_id: uuid.UUID,
) -> SemanticAssetRecord:
    asset = await session.get(BrandAsset, asset_id)
    if asset is None or asset.client_id != client_id:
        raise ValueError("Asset does not belong to the requested client")
    record = await session.scalar(
        select(SemanticAssetRecord).where(SemanticAssetRecord.source_asset_id == asset.id)
    )
    if record is None:
        record = SemanticAssetRecord(
            client_id=client_id,
            source_asset_id=asset.id,
            content_fingerprint=asset.content_sha256,
            status="processing",
        )
        session.add(record)
        await session.flush()
    elif record.client_id != client_id:
        raise ValueError("Semantic record does not belong to the requested client")

    if (
        record.status == "ready"
        and record.analysis_version == ANALYSIS_VERSION
        and record.embedding is not None
        and record.embedding_version
    ):
        return record

    record.status = "processing"
    record.failure_reason = None
    record.analysis_version = ANALYSIS_VERSION
    await session.commit()

    source_image_bytes = (
        download_file(BRAND_ASSETS_BUCKET, asset.storage_path)
        if asset.storage_path
        else None
    )
    if not source_image_bytes:
        record.status = "failed"
        record.failure_reason = "storage_source_image_unavailable"
        await session.commit()
        return record

    signed_url = get_signed_url(BRAND_ASSETS_BUCKET, asset.storage_path)
    if not signed_url:
        record.status = "failed"
        record.failure_reason = "storage_signed_url_unavailable"
        await session.commit()
        return record

    response = await call_llm(
        client_id=client_id,
        agent_code="D02",
        session=session,
        response_format=AssetSemanticOutput,
        mock_key="D02_asset_semantics",
        messages=[
            {"role": "system", "content": ANALYSIS_PROMPT},
            {"role": "user", "content": [
                {"type": "text", "text": "Analyse this source image for retrieval only."},
                {"type": "image_url", "image_url": {"url": signed_url}},
            ]},
        ],
    )
    output = AssetSemanticOutput.model_validate_json(response.content)
    safe = output.safety.safe
    usable = output.technical_quality.usable
    confidence = output.confidence.overall
    if safe is False:
        record.status = "needs_attention"
        record.failure_reason = "image_safety_review_required"
    elif usable is False:
        record.status = "needs_attention"
        record.failure_reason = "image_not_technically_usable"
    elif isinstance(confidence, (int, float)) and confidence < 0.35:
        record.status = "needs_attention"
        record.failure_reason = "semantic_analysis_low_confidence"

    record.semantic_summary = output.summary
    record.primary_subjects = output.primary_subjects
    record.secondary_subjects = output.secondary_subjects
    record.setting = output.setting
    record.actions = output.actions
    record.composition = output.composition
    record.mood_lighting = output.mood_lighting
    record.text_safe_areas = output.text_safe_areas
    record.visible_text = output.visible_text
    record.suggested_tags = output.suggested_tags
    record.technical_quality = output.technical_quality.model_dump()
    record.editability = output.editability.model_dump()
    record.safety = output.safety.model_dump()
    record.confidence = output.confidence.model_dump()
    asset.tags = output.suggested_tags
    asset.asset_type = asset.asset_type or "photo"

    if record.status == "needs_attention":
        record.embedding = None
        record.embedding_version = None
        record.search_text = None
        await session.commit()
        await session.refresh(record)
        return record

    search_text = semantic_embedding_text(output)
    try:
        embedding = await create_asset_embedding(
            session=session,
            client_id=client_id,
            text_value=search_text,
            source_image_bytes=source_image_bytes,
            wake_reason="semantic_asset_indexing",
        )
    except LLMConfigurationError:
        record.status = "needs_attention"
        record.failure_reason = "embedding_provider_unavailable"
        await session.commit()
        await session.refresh(record)
        return record

    record.search_text = search_text
    record.embedding = embedding.embedding
    record.embedding_version = embedding.version
    record.status = "ready"
    record.failure_reason = None
    if asset.replaces_asset_id:
        previous_record = await session.scalar(
            select(SemanticAssetRecord).where(
                SemanticAssetRecord.client_id == client_id,
                SemanticAssetRecord.source_asset_id == asset.replaces_asset_id,
            )
        )
        if previous_record is not None:
            previous_record.status = "superseded"
            previous_record.failure_reason = f"superseded_by:{asset.id}"
    await session.commit()
    await session.refresh(record)
    return record
