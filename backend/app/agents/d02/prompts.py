"""Prompts for D02 image retrieval and source selection."""
from app.agents.d01.schemas import ImageBrief


SYSTEM_PROMPT_D02_TAG = """You are D02, an image-retrieval specialist.
Extract concrete searchable tags from the visual brief. Prioritize products,
objects, setting and composition over generic mood. Include useful Vietnamese
and English synonyms. Return JSON with enhanced_tags and search_priority."""


SYSTEM_PROMPT_D02_SELECT = """You are D02, selecting the best client-owned
source image for a visual brief. Inspect the actual candidate pixels. Apply a
hard rejection for wrong product, prohibited content, unsafe/low-quality image,
unusable rights or insufficient editability. Score the selected candidate using
exactly: subject/product 0-40, Visual Intent fit 0-25, brand/setting 0-15,
editability 0-10, freshness 0-5 and rights confidence 0-5. The six components
must sum to score. Return the selected asset ID, concise reason, hard_gate_passed,
score and all six component scores. Do not identify people or infer identity."""


def build_d02_tag_prompt(image_brief: ImageBrief) -> str:
    return (
        "## Visual brief\n"
        f"Description: {image_brief.description}\n"
        f"Required subject: {image_brief.required_subject}\n"
        f"Preferred setting: {image_brief.preferred_setting}\n"
        f"Mood: {image_brief.mood}\n"
        f"Initial tags: {', '.join(image_brief.suggested_tags)}\n"
        f"Composition: {image_brief.composition_notes}\n"
        f"Platform format: {image_brief.platform_format}\n"
        f"Text treatment: {image_brief.desired_text_treatment}\n"
        f"Avoid: {', '.join(image_brief.avoid)}\n\n"
        'Return JSON: {"enhanced_tags": [...], "search_priority": [...]}'
    )


def build_d02_select_prompt(assets: list[dict], image_brief: ImageBrief) -> str:
    asset_list = "\n".join(
        (
            f"- ID: {asset['id']} | Tags: {asset.get('tags', [])} | "
            f"Semantic summary: {asset.get('semantic_summary', '')} | "
            f"Hybrid retrieval: {asset.get('hybrid_score')} | "
            f"Editability: {asset.get('editability', {})} | "
            f"Rights: {asset.get('usage_rights')} | Usage: {asset.get('usage_count', 0)}"
        )
        for asset in assets
    )
    return (
        "## Visual brief\n"
        f"Description: {image_brief.description}\n"
        f"Required subject: {image_brief.required_subject}\n"
        f"Preferred setting: {image_brief.preferred_setting}\n"
        f"Mood: {image_brief.mood}\n"
        f"Composition: {image_brief.composition_notes}\n"
        f"Platform format: {image_brief.platform_format}\n"
        f"Text treatment: {image_brief.desired_text_treatment}\n"
        f"Avoid: {', '.join(image_brief.avoid)}\n\n"
        f"## Candidates\n{asset_list}\n\n"
        "Inspect the candidate images attached after this text. "
        'Return JSON with selected_asset_id, reason, score, hard_gate_passed, '
        "subject_product_match, visual_intent_fit, brand_setting_fit, editability, "
        "freshness and rights_confidence."
    )
