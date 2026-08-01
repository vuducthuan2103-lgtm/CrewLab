import uuid
from sqlalchemy import Column, String, Boolean, Text, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..core.db import Base, utcnow

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    brand_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    industry = Column(String, nullable=True)
    timezone = Column(String, default="Asia/Ho_Chi_Minh")
    schedule_frequency = Column(String, default="weekly", nullable=False)
    schedule_day = Column(Integer, default=1, nullable=False) # 1=Monday, 7=Sunday
    schedule_time = Column(String, default="08:00", nullable=False)
    platforms = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    settings = relationship("BrandSetting", back_populates="client", uselist=False)
    cycles = relationship("WorkflowCycle", back_populates="client")
    pillars = relationship("ContentPillar", back_populates="client")
    items = relationship("ContentItem", back_populates="client")
    assets = relationship("BrandAsset", back_populates="client")
    asset_requests = relationship("AssetRequest", back_populates="client")

class BrandSetting(Base):
    __tablename__ = "brand_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    
    brand_voice_short = Column(Text, nullable=True)
    tone_of_voice = Column(String, nullable=True)
    target_audience = Column(Text, nullable=True)
    avoid_phrases = Column(JSONB, nullable=True)
    brand_colors = Column(JSONB, nullable=True)
    personality_keywords = Column(JSONB, nullable=True)
    writing_style = Column(Text, nullable=True)
    sample_captions = Column(JSONB, nullable=True)
    logo_url = Column(String, nullable=True)
    posting_frequency = Column(JSONB, nullable=True)  # {"facebook": 3, "instagram": 2} — bài/tuần per platform
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="settings")

class BrandSettingHistory(Base):
    __tablename__ = "brand_settings_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_setting_id = Column(UUID(as_uuid=True), ForeignKey("brand_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    brand_voice_short = Column(Text, nullable=True)
    tone_of_voice = Column(String, nullable=True)
    target_audience = Column(Text, nullable=True)
    avoid_phrases = Column(JSONB, nullable=True)
    brand_colors = Column(JSONB, nullable=True)
    personality_keywords = Column(JSONB, nullable=True)
    writing_style = Column(Text, nullable=True)
    sample_captions = Column(JSONB, nullable=True)
    logo_url = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
