"""Pydantic schemas for B03 — Content Plan agent output."""
from pydantic import BaseModel


class ContentPlanItem(BaseModel):
    """A single planned post item."""
    topic: str  # Topic/title of the post
    platform: str  # "facebook" or "instagram"
    pillar_name: str  # Matching pillar name
    scheduled_date: str  # ISO date string "YYYY-MM-DD"
    scheduled_time: str  # "HH:MM" 24h format


class B03Output(BaseModel):
    """Structured output from B03 LLM call."""
    items: list[ContentPlanItem]
