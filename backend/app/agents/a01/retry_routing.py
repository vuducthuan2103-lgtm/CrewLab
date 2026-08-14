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
SYSTEM_RECOVERY_CRITERIA = {
    "visual_generation_unavailable": "D02",
    "vision_evaluator_unavailable": "E01",
}


def determine_retry_route(failed_criteria: Sequence[str]) -> str:
    """Return the responsible agent for evaluation failures and provider recovery.

    System recovery criteria are emitted only for a non-retryable provider block;
    they resume the exact blocked step after the provider becomes available.
    Other invalid criteria remain a data-integrity error.
    """
    if not failed_criteria:
        raise ValueError("failed_criteria must contain at least one standard E01 criterion")

    recovery_agents = {SYSTEM_RECOVERY_CRITERIA[criterion] for criterion in failed_criteria if criterion in SYSTEM_RECOVERY_CRITERIA}
    unknown_criteria = set(failed_criteria) - CAPTION_CRITERIA - VISUAL_CRITERIA - set(SYSTEM_RECOVERY_CRITERIA)
    if unknown_criteria:
        raise ValueError(f"Unknown E01 failed criteria: {sorted(unknown_criteria)}")

    if any(criterion in CAPTION_CRITERIA for criterion in failed_criteria):
        return "D01"
    if any(criterion in VISUAL_CRITERIA for criterion in failed_criteria):
        return "D02"
    if len(recovery_agents) == 1:
        return recovery_agents.pop()
    raise ValueError("failed_criteria did not identify a retry target")
