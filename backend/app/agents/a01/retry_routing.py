"""Retry routing for the eight approved E01 evaluation criteria."""
from collections.abc import Sequence


CAPTION_CRITERIA = {
    "brand_voice",
    "content_accuracy",
    "platform_fit",
    "pillar_relevance",
    "originality",
}
VISUAL_CRITERIA = {
    "visual_asset_fit",
    "image_design_quality",
    "mobile_readability",
}


def determine_retry_route(failed_criteria: Sequence[str]) -> str:
    """Return D01 for caption failures and D02 for visual-only failures.

    Invalid criteria are a data-integrity error and must not be silently routed.
    """
    if not failed_criteria:
        raise ValueError("failed_criteria must contain at least one standard E01 criterion")

    unknown_criteria = set(failed_criteria) - CAPTION_CRITERIA - VISUAL_CRITERIA
    if unknown_criteria:
        raise ValueError(f"Unknown E01 failed criteria: {sorted(unknown_criteria)}")

    if any(criterion in CAPTION_CRITERIA for criterion in failed_criteria):
        return "D01"
    if any(criterion in VISUAL_CRITERIA for criterion in failed_criteria):
        return "D02"
    raise ValueError("failed_criteria did not identify a retry target")
