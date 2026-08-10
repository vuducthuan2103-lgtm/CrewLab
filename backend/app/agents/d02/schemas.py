"""Validated LLM outputs for D02 image retrieval and vision ranking."""
from pydantic import BaseModel, Field


class D02TagOutput(BaseModel):
    enhanced_tags: list[str]
    search_priority: list[str]


class D02SelectionOutput(BaseModel):
    selected_asset_id: str | None = None
    reason: str
    score: float = Field(default=0, ge=0, le=100)
    hard_gate_passed: bool = True
    subject_product_match: float = Field(default=0, ge=0, le=40)
    visual_intent_fit: float = Field(default=0, ge=0, le=25)
    brand_setting_fit: float = Field(default=0, ge=0, le=15)
    editability: float = Field(default=0, ge=0, le=10)
    freshness: float = Field(default=0, ge=0, le=5)
    rights_confidence: float = Field(default=0, ge=0, le=5)
