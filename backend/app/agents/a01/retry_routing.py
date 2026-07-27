from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# Categories of failures
CAPTION_CRITERIA = {
    "brand_voice", "tone", "caption_length", "grammar", 
    "missing_cta", "format_issue", "policy_violation"
}

VISUAL_CRITERIA = {
    "visual_asset_fit", "text_on_image", "visual_quality", 
    "aspect_ratio", "poor_contrast"
}

def determine_retry_route(failed_criteria: List[str]) -> str:
    """
    Determine which agent to route to based on the failed criteria from E01.
    Returns:
        "D01" for caption issues.
        "D02" for visual issues.
    """
    if not failed_criteria:
        logger.warning("Empty failed_criteria provided for retry routing. Defaulting to D01.")
        return "D01"
        
    has_caption_issue = any(c in CAPTION_CRITERIA for c in failed_criteria)
    has_visual_issue = any(c in VISUAL_CRITERIA for c in failed_criteria)
    
    # If there are caption issues, always route to D01 first.
    # The workflow will naturally flow D01 -> D02 -> E01.
    if has_caption_issue:
        return "D01"
        
    if has_visual_issue:
        return "D02"
        
    # If criteria is unknown, default to D01 as a safe fallback
    logger.warning(f"Unknown failed criteria: {failed_criteria}. Defaulting to D01.")
    return "D01"
