from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
import uuid
from enum import Enum

class WakeReason(str, Enum):
    scheduled = "scheduled"
    task_assigned = "task_assigned"
    retry = "retry"

class A01PrecheckResult(BaseModel):
    is_valid: bool
    reason: Optional[str] = None
    client_id: Optional[uuid.UUID] = None
    cycle_id: Optional[uuid.UUID] = None

class ContextPacket(BaseModel):
    brand_settings: Dict[str, Any]
    episodic_memory: List[Dict[str, Any]] = Field(default_factory=list)

class DispatchInstruction(BaseModel):
    agent_code: str
    payload: Dict[str, Any]
    idempotency_key: str
