from typing import Optional, Generic, TypeVar, Any
from pydantic import BaseModel, Field
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

    class Config:
        from_attributes = True
