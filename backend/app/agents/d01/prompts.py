"""Prompts for D01 — Caption Writer agent."""
from .schemas import ImageBrief


SYSTEM_PROMPT_D01 = """Bạn là D01 — Caption Writer của CrewLab, chuyên viết nội dung marketing F&B cho thị trường Việt Nam.

## Vai trò
Bạn nhận thông tin về một bài đăng cần tạo và thực hiện 2 nhiệm vụ:
1. Viết **Caption** hoàn chỉnh sẵn sàng đăng (bao gồm hashtag, emoji, CTA nếu phù hợp)
2. Tạo **Image Brief** — bản mô tả ý tưởng hình ảnh cho bộ phận tìm/chọn ảnh

## Nguyên tắc viết Caption F&B Việt Nam
- **Gần gũi, thật**: Viết như người bạn chia sẻ, không như quảng cáo cứng
- **Truyền cảm hứng**: Gợi lên cảm xúc, trải nghiệm, không chỉ mô tả sản phẩm
- **Không sáo rỗng**: Tránh "chất lượng hàng đầu", "đẳng cấp", "hoàn hảo cho bạn"
- **Platform phù hợp**:
  - Facebook: 200-500 ký tự, CTA rõ ràng, 3-5 hashtag, có thể kể chuyện
  - Instagram: Ngắn gọn hơn, visual-first, 5-15 hashtag, emoji có chọn lọc
- **Phản ánh đúng pillar/topic**: Không tự ý đổi chủ đề được giao
- **Tiếng Việt tự nhiên**: Sử dụng từ ngữ gen Z/millennial nếu phù hợp brand voice

## Nguyên tắc viết Image Brief
- Trước hết quyết định `visual_mode`: chỉ dùng `text_only` khi bài đăng thực sự không cần visual; mọi trường hợp khác là `visual_required`.
- **suggested_tags** là tags để TÌM KIẾM ảnh trong thư viện — dùng từ khóa cụ thể, thực tế
- Mô tả cụ thể: màu sắc, bố cục, góc chụp, ánh sáng, cảm xúc
- **avoid** phải thực tế và hữu ích (không phải tránh "ảnh xấu" chung chung)

## Khi retry (có fix_instructions)
- Đọc kỹ fix_instructions và failed_criteria
- CHỈ sửa những phần có vấn đề, không viết lại hoàn toàn nếu không cần
- Giải thích ngắn những thay đổi bạn đã làm (trong output hoặc caption)

## Output Format
Trả về JSON hợp lệ với đúng cấu trúc schema được yêu cầu. Không thêm text ngoài JSON."""


def build_d01_user_prompt(
    topic: str,
    platform: str,
    pillar_name: str,
    pillar_description: str,
    brand_settings: dict,
    episodic_memory: list[dict],
    fix_instructions: str | None = None,
    failed_criteria: list[str] | None = None,
) -> str:
    """Build user prompt cho D01 LLM call."""
    lines = []

    # Brand context
    brand_voice = brand_settings.get("brand_voice_short", "")
    tone = brand_settings.get("tone_of_voice", "thân thiện, gần gũi")
    target_audience = brand_settings.get("target_audience", "")
    avoid_phrases = brand_settings.get("avoid_phrases") or []
    sample_captions = brand_settings.get("sample_captions") or []

    lines.append("## Brand Context")
    if brand_voice:
        lines.append(f"Brand voice: {brand_voice}")
    lines.append(f"Tone of voice: {tone}")
    if target_audience:
        lines.append(f"Target audience: {target_audience}")
    if avoid_phrases:
        lines.append(f"Tránh dùng: {', '.join(avoid_phrases)}")
    if sample_captions:
        lines.append(f"Mẫu caption đã được approve:\n" + "\n".join(f"  - {c}" for c in sample_captions[:2]))

    # Pillar context
    lines.append(f"\n## Content Pillar: {pillar_name}")
    if pillar_description:
        lines.append(f"Mô tả: {pillar_description}")

    # Task
    lines.append(f"\n## Bài cần viết")
    lines.append(f"Topic: {topic}")
    lines.append(f"Platform: {platform.upper()}")

    # Episodic memory (P01-lite)
    if episodic_memory:
        lines.append(f"\n## Kinh nghiệm từ bài trước ({len(episodic_memory)} bản ghi gần nhất)")
        for mem in episodic_memory[:3]:
            if mem.get("human_feedback"):
                lines.append(f"  - {mem.get('input_summary', '')} → Feedback: {mem['human_feedback']}")

    # Retry instructions
    if fix_instructions:
        lines.append(f"\n## ⚠️ RETRY MODE — Yêu cầu sửa")
        lines.append(f"Vấn đề cần sửa: {', '.join(failed_criteria or [])}")
        lines.append(f"Hướng dẫn cụ thể:\n{fix_instructions}")
        lines.append("Chỉ sửa những phần có vấn đề, giữ nguyên phần đã tốt.")

    lines.append("\n## Yêu cầu Output")
    lines.append(
        "Trả về JSON với format:\n"
        "{\n"
        '  "caption": "Nội dung caption đầy đủ",\n'
        '  "image_brief": {\n'
        '    "description": "Mô tả ý tưởng hình ảnh",\n'
        '    "mood": "Cảm xúc/phong cách",\n'
        '    "suggested_tags": ["tag1", "tag2"],\n'
        '    "composition_notes": "Gợi ý bố cục",\n'
        '    "avoid": ["tránh1", "tránh2"],\n'
        '    "visual_mode": "visual_required",\n'
        '    "rationale": "Vì sao bài có/không cần visual",\n'
        '    "required_subject": "Sản phẩm/chủ thể bắt buộc",\n'
        '    "preferred_setting": "Preferred real-world setting",\n'
        '    "platform_format": "Platform aspect ratio and format",\n'
        '    "desired_text_treatment": "No overlay, or exact text placement and hierarchy",\n'
        '    "desired_alteration": "minimal"\n'
        "  }\n"
        "}"
    )

    return "\n".join(lines)
