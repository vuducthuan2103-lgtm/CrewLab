import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from ..core.db import Base, utcnow


class ClientProviderCredential(Base):
    __tablename__ = "client_provider_credentials"
    __table_args__ = (
        UniqueConstraint(
            "client_id", "provider", name="uq_client_provider_credentials_client_provider"
        ),
        CheckConstraint(
            "provider IN ('openai', 'anthropic', 'google', 'deepseek', 'qwen')",
            name="ck_client_provider_credentials_provider",
        ),
        CheckConstraint(
            "validation_status IN ('untested', 'valid', 'invalid')",
            name="ck_client_provider_credentials_validation_status",
        ),
        Index(
            "ix_client_provider_credentials_enabled_client",
            "client_id",
            postgresql_where=text("is_enabled = true"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(32), nullable=False)
    encrypted_api_key = Column(Text, nullable=False)
    key_hint = Column(String(8), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=False)
    validation_status = Column(String(16), nullable=False, default="untested")
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    last_test_error = Column(String(200), nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    updated_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
