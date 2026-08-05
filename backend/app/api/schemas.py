from typing import Optional, Generic, TypeVar, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from uuid import UUID

T = TypeVar('T')

class ErrorDetail(BaseModel):
    error_code: str
    message: str
    details: Optional[Any] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None


class A01ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    idempotency_key: str = Field(min_length=8, max_length=200)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


class A01ChatMessageOut(BaseModel):
    id: UUID
    user_message: str
    assistant_message: str
    action: Literal["answer", "create_content"]
    content_item_id: Optional[UUID] = None
    dispatch_status: Literal["not_needed", "queued", "pending"]
    created_at: datetime

class ApproveRequest(BaseModel):
    edited_caption: Optional[str] = None
    idempotency_key: str

class RejectRequest(BaseModel):
    reject_reason: str  # tone_wrong, info_incorrect, visual_poor, wrong_asset, off_brand, bad_timing, other
    feedback_text: str
    idempotency_key: str

class MarkPostedRequest(BaseModel):
    idempotency_key: str

class ContentItemOut(BaseModel):
    id: UUID
    topic: str
    caption: Optional[str] = None
    client_edited_caption: Optional[str] = None
    image_url: Optional[str] = None
    image_brief: Optional[Any] = None
    pillar_id: Optional[UUID] = None
    eval_score_caption: Optional[float] = None
    eval_score_visual: Optional[float] = None
    eval_retry_count: int = 0
    failed_criteria: Optional[Any] = None
    fix_instructions: Optional[str] = None
    status: str
    platform: str
    scheduled_date: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskLogOut(BaseModel):
    id: UUID
    agent_code: str
    task_type: str
    model_used: Optional[str] = None
    tokens_in: int
    tokens_out: int
    latency_ms: int
    status: str
    wake_reason: str
    created_at: datetime
    content_item_id: Optional[UUID] = None

    class Config:
        from_attributes = True


MVP_AGENT_CODES = {"A01", "B02", "B03", "D01", "D02", "E01"}


class PillarItem(BaseModel):
    id: UUID
    name: str
    weight: int = Field(ge=5, le=100)


class ConfirmPillarsRequest(BaseModel):
    pillars: list[PillarItem]
    idempotency_key: str

    @field_validator("pillars")
    @classmethod
    def validate_pillars(cls, value: list[PillarItem]) -> list[PillarItem]:
        if not 2 <= len(value) <= 5:
            raise ValueError("pillar count must be between 2 and 5")
        if sum(p.weight for p in value) != 100:
            raise ValueError("total pillar weight must equal 100")
        return value


class ApproveWeekRequest(BaseModel):
    content_plan_id: UUID
    idempotency_key: str


class AssetSubmitRequest(BaseModel):
    asset_ids: list[UUID] = Field(default_factory=list, max_length=10)
    idempotency_key: str


class BrandVoiceUpdate(BaseModel):
    tone: str = Field(min_length=1, max_length=500)
    personality_keywords: list[str] = Field(min_length=1, max_length=10)
    writing_style: Literal["conversational", "professional", "playful"]
    avoid_phrases: list[str] = Field(default_factory=list, max_length=50)
    brand_colors: Optional[dict[str, str]] = None
    idempotency_key: str


class AgentConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_code: str
    model: str = Field(min_length=1, max_length=200)
    budget_usd_month: float = Field(gt=0, le=10000)
    tier: Literal["fast", "standard", "power"] = "standard"
    idempotency_key: str

    @field_validator("agent_code")
    @classmethod
    def validate_agent_scope(cls, value: str) -> str:
        if value not in MVP_AGENT_CODES:
            raise ValueError(f"{value} is outside the MVP agent scope")
        return value


class PillarOut(BaseModel):
    id: UUID
    cycle_id: UUID
    name: str
    description: Optional[str] = None
    weight: int

    class Config:
        from_attributes = True


class AssetRequestOut(BaseModel):
    id: UUID
    content_item_id: UUID
    shot_list: Optional[Any] = None
    expires_at: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True


class BrandAssetOut(BaseModel):
    id: UUID
    asset_request_id: Optional[UUID] = None
    url: str
    file_name: Optional[str] = None
    storage_path: Optional[str] = None
    tags: Optional[Any] = None
    source: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
