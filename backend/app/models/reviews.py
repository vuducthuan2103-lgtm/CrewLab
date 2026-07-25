import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..core.db import Base, utcnow

class HitlReview(Base):
    __tablename__ = "hitl_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    gate_type = Column(String, nullable=False) # pillar, plan, content
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    reviewer_id = Column(UUID(as_uuid=True), nullable=False, index=True) # Map to auth.users (Supabase Auth)
    action = Column(String, nullable=False) # approved, rejected, edited
    reject_reason = Column(String, nullable=True) # Taxonomy reason
    
    feedback_text = Column(Text, nullable=True)
    edited_caption = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    
    item = relationship("ContentItem", back_populates="hitl_reviews")

class AgentMemory(Base):
    __tablename__ = "agent_memory"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    agent_code = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)
    
    input_summary = Column(Text, nullable=False)
    output_summary = Column(Text, nullable=False)
    human_feedback = Column(Text, nullable=True)
    eval_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
