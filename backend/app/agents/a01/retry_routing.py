"""Retry routing logic for A01 Orchestrator based on E01 failed_criteria.

Standard criteria defined in ADR-0005 and MVP-Scope §1a:
- D01 (Caption): brand_voice, content_accuracy, platform_fit, pillar_relevance, originality
- D02 (Visual): visual_asset_fit, image_design_quality, mobile_readability
"""
import logging
from typing import List

logger = logging.getLogger(__name__)

# Standard 5 caption criteria (ADR-0005) + legacy aliases
CAPTION_CRITERIA = {
    "brand_voice",
    "content_accuracy",
    "platform_fit",
    "pillar_relevance",
    "originality",
    # Legacy/subdimension aliases
    "tone",
    "caption_length",
    "grammar",
    "missing_cta",
    "format_issue",
    "policy_violation",
}

# Standard 3 visual criteria (ADR-0005) + legacy aliases
VISUAL_CRITERIA = {
    "visual_asset_fit",
    "image_design_quality",
    "mobile_readability",
    # Legacy/subdimension aliases
    "text_on_image",
    "visual_quality",
    "aspect_ratio",
    "poor_contrast",
    "brand_consistency",
}


def determine_retry_route(failed_criteria: List[str]) -> str:
    """Determine which agent to route to based on failed_criteria from E01.

    Returns:
        "D01" for caption issues (always prioritized if both caption & visual fail).
        "D02" for visual issues.
    """
    if not failed_criteria:
        logger.warning("Empty failed_criteria provided for retry routing. Defaulting to D01.")
        return "D01"

    has_caption_issue = any(c in CAPTION_CRITERIA for c in failed_criteria)
    has_visual_issue = any(c in VISUAL_CRITERIA for c in failed_criteria)

    # If there are caption issues, always route to D01 first.
    # Flow will naturally proceed D01 -> D02 -> E01.
    if has_caption_issue:
        return "D01"

    if has_visual_issue:
        return "D02"

    logger.warning(f"Unknown failed criteria: {failed_criteria}. Defaulting to D01.")
    return "D01"
