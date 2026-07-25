import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..core.db import Base, utcnow

class TaskLog(Base):
    __tablename__ = "task_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    agent_code = Column(String, nullable=False, index=True)
    task_type = Column(String, nullable=False)
    
    model_used = Column(String, nullable=True)
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    
    status = Column(String, nullable=False)
    eval_score = Column(Float, nullable=True)
    wake_reason = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True) # Map to auth.users (Supabase Auth)
    action = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
