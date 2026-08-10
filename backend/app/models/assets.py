"""Client-isolated library assets and their semantic retrieval records."""
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from ..core.db import Base, utcnow


class BrandAsset(Base):
    __tablename__ = "brand_assets"
    __table_args__ = (
        Index(
            "uq_brand_assets_client_source_fingerprint",
            "client_id",
            "content_sha256",
            unique=True,
            postgresql_where=text(
                "content_sha256 IS NOT NULL AND source_asset_id IS NULL "
                "AND source IN ('client_uploaded', 'real_photo', 'portal')"
            ),
            sqlite_where=text(
                "content_sha256 IS NOT NULL AND source_asset_id IS NULL "
                "AND source IN ('client_uploaded', 'real_photo', 'portal')"
            ),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    storage_path = Column(String, nullable=False, server_default="")
    file_name = Column(String, nullable=True)
    tags = Column(JSONB, nullable=True)
    asset_type = Column(String, nullable=True)
    format = Column(String, nullable=True)
    source = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending_review")
    source_asset_id = Column(UUID(as_uuid=True), ForeignKey("brand_assets.id", ondelete="SET NULL"), nullable=True, index=True)
    replaces_asset_id = Column(UUID(as_uuid=True), ForeignKey("brand_assets.id", ondelete="RESTRICT"), nullable=True, index=True)
    generation_mode = Column(Text, nullable=True)
    usage_rights = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    content_sha256 = Column(String(64), nullable=True, index=True)
    usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    client = relationship("Client", back_populates="assets")
    semantic_record = relationship(
        "SemanticAssetRecord", back_populates="source_asset", uselist=False,
        cascade="all, delete-orphan",
    )


class VisualSelectionDecision(Base):
    """Append-only audit row for one successful D02 visual-production run."""
    __tablename__ = "visual_selection_decisions"
    __table_args__ = (
        UniqueConstraint(
            "content_item_id", "run_number", name="uq_visual_decision_item_run"
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False, index=True)
    run_number = Column(Integer, nullable=False)
    wake_reason = Column(String, nullable=False)
    source_asset_id = Column(UUID(as_uuid=True), ForeignKey("brand_assets.id", ondelete="RESTRICT"), nullable=True, index=True)
    derivative_asset_id = Column(UUID(as_uuid=True), ForeignKey("brand_assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    generation_mode = Column(String, nullable=False)
    selection_score = Column(Float, nullable=False, default=0)
    selection_rationale = Column(Text, nullable=True)
    candidates = Column(JSONB, nullable=False, default=list)
    eligibility_exclusions = Column(JSONB, nullable=False, default=list)
    prompt_summary = Column(Text, nullable=True)
    technical_validation = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class SemanticAssetRecord(Base):
    """Searchable meaning and editability facts for one immutable source asset."""
    __tablename__ = "semantic_asset_records"
    __table_args__ = (
        CheckConstraint(
            "status IN ('processing', 'ready', 'needs_attention', 'failed', 'superseded')",
            name="ck_semantic_asset_records_status",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    source_asset_id = Column(UUID(as_uuid=True), ForeignKey("brand_assets.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    status = Column(String, nullable=False, default="processing", index=True)
    content_fingerprint = Column(String(64), nullable=True, index=True)
    analysis_version = Column(String, nullable=False, default="v1")
    embedding_version = Column(String, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    search_text = Column(Text, nullable=True)
    semantic_summary = Column(Text, nullable=True)
    primary_subjects = Column(JSONB, nullable=True)
    secondary_subjects = Column(JSONB, nullable=True)
    setting = Column(JSONB, nullable=True)
    actions = Column(JSONB, nullable=True)
    composition = Column(JSONB, nullable=True)
    mood_lighting = Column(JSONB, nullable=True)
    text_safe_areas = Column(JSONB, nullable=True)
    visible_text = Column(JSONB, nullable=True)
    suggested_tags = Column(JSONB, nullable=True)
    technical_quality = Column(JSONB, nullable=True)
    editability = Column(JSONB, nullable=True)
    safety = Column(JSONB, nullable=True)
    confidence = Column(JSONB, nullable=True)
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    source_asset = relationship("BrandAsset", back_populates="semantic_record")
