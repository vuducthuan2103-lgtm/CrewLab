from typing import Optional, Generic, TypeVar, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date, datetime
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
    image_provenance: Optional[dict[str, Any]] = None
    image_provenance_history: list[dict[str, Any]] = Field(default_factory=list)
    pillar_id: Optional[UUID] = None
    eval_score_caption: Optional[float] = None
    eval_score_visual: Optional[float] = None
    eval_retry_count: int = 0
    failed_criteria: Optional[Any] = None
    fix_instructions: Optional[str] = None
    status: str
    platform: str
    scheduled_date: Optional[datetime] = None
    scheduled_time: Optional[str] = None
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
    error_code: Optional[str] = None
    error_provider: Optional[str] = None
    provider_request_id: Optional[str] = None
    error_message: Optional[str] = None
    error_retryable: Optional[bool] = None

    class Config:
        from_attributes = True


MVP_AGENT_CODES = {"A01", "B02", "B03", "D01", "D02", "E01"}


class PillarItem(BaseModel):
    id: UUID
    name: str = Field(min_length=1, max_length=120)
    weight: int = Field(ge=5, le=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    angles: Optional[list[str]] = None

    @field_validator("angles")
    @classmethod
    def validate_angles(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        cleaned = [angle.strip() for angle in value if angle.strip()]
        if not cleaned:
            raise ValueError("each pillar needs at least one angle")
        if len(cleaned) > 8:
            raise ValueError("each pillar can have at most 8 angles")
        return cleaned


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


class WeeklyScheduleUpdate(BaseModel):
    weekly_cycle_day: Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    weekly_cycle_time: str = Field(min_length=5, max_length=5)
    idempotency_key: str

    @field_validator("weekly_cycle_time")
    @classmethod
    def validate_weekly_cycle_time(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError as exc:
            raise ValueError("weekly_cycle_time must use HH:MM") from exc
        return value


class StartWeeklyPreviewRequest(BaseModel):
    idempotency_key: str


class ContentScheduleUpdate(BaseModel):
    scheduled_date: date
    scheduled_time: str = Field(min_length=5, max_length=5)
    idempotency_key: str

    @field_validator("scheduled_time")
    @classmethod
    def validate_scheduled_time(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError as exc:
            raise ValueError("scheduled_time must use HH:MM") from exc
        return value


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
    angles: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PortalViewerOut(BaseModel):
    user_id: UUID
    email: Optional[str] = None
    role: str


class PortalClientOut(BaseModel):
    id: UUID
    brand_name: str


class PortalScheduleOut(BaseModel):
    cycle_id: Optional[UUID] = None
    phase: Optional[str] = None


class PortalWorkBoardOut(BaseModel):
    content_items: list[ContentItemOut]
    task_logs: list[TaskLogOut]
    pillars: list[PillarOut]
    schedule: PortalScheduleOut


class PortalBootstrapOut(BaseModel):
    viewer: PortalViewerOut
    client: PortalClientOut
    work_board: PortalWorkBoardOut


class BrandAssetOut(BaseModel):
    id: UUID
    url: str
    file_name: Optional[str] = None
    storage_path: Optional[str] = None
    tags: Optional[Any] = None
    source: Optional[str] = None
    status: str
    usage_rights: Optional[str] = None
    dimensions: Optional[str] = None
    indexing_status: str = "processing"
    indexing_reason: Optional[str] = None
    semantic_summary: Optional[str] = None
    suggested_tags: Optional[list[str]] = None
    duplicate_of_asset_id: Optional[UUID] = None
    replaces_asset_id: Optional[UUID] = None
    ready_for_d02: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
