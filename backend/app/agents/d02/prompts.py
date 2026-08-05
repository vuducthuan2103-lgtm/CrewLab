"""Prompts for D02 — Image Design & Matching agent."""
from app.agents.d01.schemas import ImageBrief


SYSTEM_PROMPT_D02_TAG = """Bạn là D02 — Image Matching Specialist của CrewLab.

Nhiệm vụ: Phân tích Image Brief và tạo danh sách tags tối ưu để tìm kiếm ảnh trong thư viện.

Nguyên tắc:
- Tags phải thực tế, cụ thể — dùng để match với tags ảnh trong database
- Bổ sung synonyms và từ khóa liên quan (VD: "cold brew" → thêm "cà phê đá", "iced coffee")
- Ưu tiên tags mô tả ĐỐI TƯỢNG trong ảnh (sản phẩm, không gian, người) hơn cảm xúc chung
- search_priority: sắp xếp theo độ quan trọng giảm dần — tag đầu tiên là đặc trưng nhất

Output: JSON với enhanced_tags (list[str]) và search_priority (list[str])."""


SYSTEM_PROMPT_D02_SELECT = """Bạn là D02 — Image Matching Specialist của CrewLab.

Nhiệm vụ: Chọn ảnh phù hợp nhất từ danh sách ảnh match với Image Brief đã cho.

Nguyên tắc chọn ảnh:
1. Phù hợp với mood/cảm xúc trong brief
2. Phù hợp với composition_notes (bố cục, góc chụp)
3. Không vi phạm avoid list
4. Ưu tiên ảnh chưa được dùng nhiều (usage_count thấp)

Output: JSON với selected_asset_id (UUID string) và reason (giải thích ngắn gọn ≤ 50 từ)."""


def build_d02_tag_prompt(image_brief: ImageBrief) -> str:
    """Build prompt cho D02 LLM call 1: tag enhancement."""
    return (
        f"## Image Brief\n"
        f"Mô tả: {image_brief.description}\n"
        f"Mood/phong cách: {image_brief.mood}\n"
        f"Tags ban đầu: {', '.join(image_brief.suggested_tags)}\n"
        f"Bố cục: {image_brief.composition_notes}\n"
        f"Tránh: {', '.join(image_brief.avoid)}\n\n"
        f"Hãy enhance danh sách tags và xác định search_priority.\n"
        f'Output JSON: {{"enhanced_tags": [...], "search_priority": [...]}}'
    )


def build_d02_select_prompt(assets: list[dict], image_brief: ImageBrief) -> str:
    """Build prompt cho D02 LLM call 2: asset selection."""
    asset_list = "\n".join(
        f"- ID: {a['id']} | Tags: {a.get('tags', [])} | Usage: {a.get('usage_count', 0)} lần"
        for a in assets
    )
    return (
        f"## Image Brief\n"
        f"Mô tả: {image_brief.description}\n"
        f"Mood: {image_brief.mood}\n"
        f"Bố cục: {image_brief.composition_notes}\n"
        f"Tránh: {', '.join(image_brief.avoid)}\n\n"
        f"## Danh sách ảnh match\n{asset_list}\n\n"
        f"Chọn ảnh phù hợp nhất.\n"
        f'Output JSON: {{"selected_asset_id": "uuid", "reason": "..."}}'
    )


def build_d02_asset_request_note(image_brief: ImageBrief, topic: str) -> tuple[str, list[dict]]:
    """Tạo note và shot_list cho AssetRequest gửi cho client.

    Returns:
        (note_text, shot_list)
    """
    note = (
        f"📸 Cần ảnh cho bài: {topic}\n\n"
        f"Mô tả ảnh cần: {image_brief.description}\n"
        f"Phong cách/cảm xúc: {image_brief.mood}\n"
        f"Gợi ý bố cục: {image_brief.composition_notes}\n"
        f"Tránh: {', '.join(image_brief.avoid)}"
    )

    # Tạo shot list từ image brief
    shot_list = [
        {
            "angle": "Main shot",
            "description": image_brief.description,
        },
        {
            "angle": "Detail/close-up",
            "description": f"Cận cảnh chi tiết — {image_brief.composition_notes}",
        },
    ]

    return note, shot_list
