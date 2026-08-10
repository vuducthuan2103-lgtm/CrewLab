"""Validated Pydantic schemas for Agent E01 — Evaluator."""
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


CaptionCriterion = Literal[
    "brand_voice",
    "content_accuracy",
    "platform_fit",
    "pillar_relevance",
    "originality",
]
VisualCriterion = Literal[
    "visual_asset_fit",
    "image_design_quality",
    "mobile_readability",
]


class CaptionEval(BaseModel):
    """Evaluation result for caption text."""

    score: float = Field(..., ge=0.0, le=10.0, description="Caption quality score (0.0 to 10.0)")
    passed: bool = Field(..., description="Must equal score >= 7.0")
    failed_criteria: list[CaptionCriterion] = Field(
        default_factory=list,
        description="Subset of the five standard caption criteria",
    )
    fix_instructions: str = Field("", description="Specific actionable fix instructions for D01 if failed")

    @model_validator(mode="after")
    def validate_evaluation_consistency(self) -> "CaptionEval":
        expected_passed = self.score >= 7.0
        if self.passed != expected_passed:
            raise ValueError("caption_eval.passed must match the 7.0 score threshold")
        if self.passed and self.failed_criteria:
            raise ValueError("a passing caption evaluation cannot contain failed criteria")
        if not self.passed and not self.failed_criteria:
            raise ValueError("a failing caption evaluation must include failed criteria")
        if not self.passed and not self.fix_instructions.strip():
            raise ValueError("a failing caption evaluation must include fix instructions")
        return self


class VisualEval(BaseModel):
    """Evaluation result for visual image."""

    score: Optional[float] = Field(None, ge=0.0, le=5.0, description="Visual quality score (0.0 to 5.0)")
    passed: bool = Field(..., description="Must equal score >= 3.5")
    not_applicable: bool = False
    failed_criteria: list[VisualCriterion] = Field(
        default_factory=list,
        description="Subset of the three standard visual criteria",
    )
    fix_instructions: str = Field("", description="Specific actionable fix instructions for D02 if failed")

    @model_validator(mode="after")
    def validate_evaluation_consistency(self) -> "VisualEval":
        if self.not_applicable:
            if self.score is not None or not self.passed or self.failed_criteria:
                raise ValueError("not_applicable visual evaluation must be passed without a score or failures")
            return self
        if self.score is None:
            raise ValueError("visual_eval.score is required unless not_applicable")
        expected_passed = self.score >= 3.5
        if self.passed != expected_passed:
            raise ValueError("visual_eval.passed must match the 3.5 score threshold")
        if self.passed and self.failed_criteria:
            raise ValueError("a passing visual evaluation cannot contain failed criteria")
        if not self.passed and not self.failed_criteria:
            raise ValueError("a failing visual evaluation must include failed criteria")
        if not self.passed and not self.fix_instructions.strip():
            raise ValueError("a failing visual evaluation must include fix instructions")
        return self


class E01Output(BaseModel):
    """Combined output from E01 Evaluator."""

    caption_eval: CaptionEval
    visual_eval: VisualEval
    overall_passed: bool = Field(..., description="True if both dimensions pass")
    evaluation_reasoning: str = Field("", description="Short overall evaluation summary")

    @model_validator(mode="after")
    def validate_overall_status(self) -> "E01Output":
        expected_passed = self.caption_eval.passed and self.visual_eval.passed
        if self.overall_passed != expected_passed:
            raise ValueError("overall_passed must equal caption_eval.passed AND visual_eval.passed")
        return self
