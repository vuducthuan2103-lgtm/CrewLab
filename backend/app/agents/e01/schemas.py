"""Pydantic schemas for Agent E01 — Evaluator."""
from pydantic import BaseModel, Field


class CaptionEval(BaseModel):
    """Evaluation result for caption text."""
    score: float = Field(..., ge=0.0, le=10.0, description="Caption quality score (0.0 to 10.0)")
    passed: bool = Field(..., description="True if score >= 7.0")
    failed_criteria: list[str] = Field(
        default_factory=list,
        description="Subset of ['brand_voice', 'content_accuracy', 'platform_fit', 'pillar_relevance', 'originality']",
    )
    fix_instructions: str = Field("", description="Specific actionable fix instructions for D01 if failed")


class VisualEval(BaseModel):
    """Evaluation result for visual image."""
    score: float = Field(..., ge=0.0, le=5.0, description="Visual quality score (0.0 to 5.0)")
    passed: bool = Field(..., description="True if score >= 3.5")
    failed_criteria: list[str] = Field(
        default_factory=list,
        description="Subset of ['visual_asset_fit', 'image_design_quality', 'mobile_readability']",
    )
    fix_instructions: str = Field("", description="Specific actionable fix instructions for D02 if failed")


class E01Output(BaseModel):
    """Combined output from E01 Evaluator."""
    caption_eval: CaptionEval
    visual_eval: VisualEval
    overall_passed: bool = Field(..., description="True if BOTH caption_eval.passed and visual_eval.passed are True")
    evaluation_reasoning: str = Field("", description="Short overall evaluation summary")
