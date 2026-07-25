import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..core.db import Base, utcnow

class BrandAsset(Base):
    __tablename__ = "brand_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_request_id = Column(UUID(as_uuid=True), ForeignKey("asset_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    
    url = Column(String, nullable=False)
    file_name = Column(String, nullable=True)
    tags = Column(JSONB, nullable=True)
    asset_type = Column(String, nullable=True)
    source = Column(String, nullable=True)
    status = Column(String, nullable=False, default="approved")
    usage_rights = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="assets")
    request = relationship("AssetRequest", back_populates="assets")

class AssetRequest(Base):
    __tablename__ = "asset_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    content_item_id = Column(UUID(as_uuid=True), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    note = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending", index=True) # pending, fulfilled, expired
    priority = Column(String, nullable=False, default="normal") # low, normal, high, urgent
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    
    client = relationship("Client", back_populates="asset_requests")
    item = relationship("ContentItem", back_populates="asset_requests")
    assets = relationship("BrandAsset", back_populates="request")
