import uuid
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, DateTime, Date, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..core.db import Base, utcnow

class WorkflowCycle(Base):
    __tablename__ = "workflow_cycles"
    __table_args__ = (
        CheckConstraint("phase IN ('strategy', 'content_production', 'done')", name="ck_workflow_cycles_phase"),
        CheckConstraint("status IN ('active', 'completed')", name="ck_workflow_cycles_status"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    phase = Column(String, nullable=False, default="strategy") # strategy, content_production, done
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="active") # active, completed
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="cycles")
    pillars = relationship("ContentPillar", back_populates="cycle")
    items = relationship("ContentItem", back_populates="cycle")

class ContentPillar(Base):
    __tablename__ = "content_pillars"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("workflow_cycles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, default=1)
    updated_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="pillars")
    cycle = relationship("WorkflowCycle", back_populates="pillars")
    items = relationship("ContentItem", back_populates="pillar")

class ContentItem(Base):
    __tablename__ = "content_items"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planned', 'ready_for_generation', 'caption_generating', 'visual_matching', "
            "'waiting_asset', 'asset_blocked', 'visual_generating', 'evaluating', 'eval_failed', "
            "'pending_content_approval', 'approved_ready_to_post', 'posted', 'rejected', 'archived')",
            name="ck_content_items_status"
        ),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("workflow_cycles.id", ondelete="CASCADE"), nullable=False, index=True)
    pillar_id = Column(UUID(as_uuid=True), ForeignKey("content_pillars.id", ondelete="SET NULL"), nullable=True, index=True)
    
    topic = Column(String, nullable=False)
    platform = Column(String, nullable=False) # Facebook, Instagram, etc.
    status = Column(String, nullable=False, default="planned", index=True)
    
    caption = Column(Text, nullable=True)
    image_brief = Column(JSONB, nullable=True)
    image_url = Column(String, nullable=True)
    
    eval_score_caption = Column(Float, nullable=True)
    eval_score_visual = Column(Float, nullable=True)
    eval_retry_count = Column(Integer, default=0, nullable=False)
    
    failed_criteria = Column(JSONB, nullable=True)
    fix_instructions = Column(Text, nullable=True)
    
    client_edited_caption = Column(Text, nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="items")
    cycle = relationship("WorkflowCycle", back_populates="items")
    pillar = relationship("ContentPillar", back_populates="items")
    asset_requests = relationship("AssetRequest", back_populates="item")
    hitl_reviews = relationship("HitlReview", back_populates="item")
    state_logs = relationship("ContentItemStateLog", back_populates="item")


class ContentItemStateLog(Base):
    __tablename__ = "content_item_state_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_code = Column(String, nullable=True) # VD: D01, D02, E01, System
    previous_state = Column(String, nullable=True)
    new_state = Column(String, nullable=False)
    reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    item = relationship("ContentItem", back_populates="state_logs")
