import uuid
from sqlalchemy import Column, String, Boolean, Numeric, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from ..core.db import Base, utcnow


class ClientLLMConfig(Base):
    """Per-agent LLM configuration for each client.
    
    Agency Admin sets provider at onboarding.
    Client can change model/tier via Portal (effective ≤5min, NFR-T3-05).
    API key is NOT stored here — resolved via PROVIDER_ENV_MAP in core/llm.py.
    """
    __tablename__ = "client_llm_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agent_code = Column(String, nullable=False)  # A01, B02, B03, D01, D02, E01
    provider = Column(String, nullable=False, default="openai")  # openai, anthropic, google, deepseek, qwen
    model = Column(String, nullable=False, default="gpt-4o")
    tier = Column(String, nullable=False, default="standard")  # fast, standard, power
    budget_usd = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
