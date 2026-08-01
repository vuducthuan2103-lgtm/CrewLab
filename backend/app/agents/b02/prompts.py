"""Prompt templates for B02 — Content Pillar agent."""
import json
from typing import Any


SYSTEM_PROMPT_B02 = """Bạn là B02 — Content Pillar Strategist, một AI chuyên gia lên chiến lược nội dung cho quán cà phê / F&B Việt Nam.

NHIỆM VỤ: Tạo ra 2-5 trụ nội dung (Content Pillar) cho tuần này, dựa trên thương hiệu và phản hồi từ các tuần trước.

QUY TẮC BẮT BUỘC:
1. Tổng weight (%) của tất cả pillar phải = 100%
2. Mỗi pillar tối thiểu 5%, tối đa 5 pillar, tối thiểu 2 pillar
3. Mỗi pillar cần ít nhất 1 góc khai thác (angle) cụ thể
4. Sử dụng ngôn ngữ phù hợp với brand voice và đối tượng khách hàng
5. Tham khảo phản hồi từ các tuần trước (nếu có) để tránh lặp lại lỗi cũ

OUTPUT FORMAT: JSON theo cấu trúc sau:
{
  "pillars": [
    {
      "name": "Tên pillar",
      "description": "Mô tả ngắn mục đích pillar",
      "weight": 40,
      "angles": ["Góc khai thác 1", "Góc khai thác 2"]
    }
  ]
}
"""


def build_b02_user_prompt(context_packet: dict[str, Any]) -> str:
    """Build the user message for B02 from the context packet."""
    brand = context_packet.get("brand_settings", {})
    memory = context_packet.get("episodic_memory", [])

    parts = []

    # Brand identity
    parts.append("## THÔNG TIN THƯƠNG HIỆU")
    if brand.get("brand_voice_short"):
        parts.append(f"Brand Voice: {brand['brand_voice_short']}")
    if brand.get("tone_of_voice"):
        parts.append(f"Tone: {brand['tone_of_voice']}")
    if brand.get("target_audience"):
        parts.append(f"Đối tượng: {brand['target_audience']}")
    if brand.get("personality_keywords"):
        parts.append(f"Tính cách thương hiệu: {json.dumps(brand['personality_keywords'], ensure_ascii=False)}")
    if brand.get("avoid_phrases"):
        parts.append(f"Tránh sử dụng: {json.dumps(brand['avoid_phrases'], ensure_ascii=False)}")
    if brand.get("writing_style"):
        parts.append(f"Phong cách viết: {brand['writing_style']}")

    # Episodic memory — feedback from past weeks
    if memory:
        parts.append("\n## PHẢN HỒI TỪ CÁC TUẦN TRƯỚC")
        for mem in memory[:10]:  # Cap at 10 most relevant
            feedback = mem.get("human_feedback", "")
            if feedback:
                parts.append(f"- [{mem.get('agent_code', '?')}] {feedback}")

    parts.append("\n## YÊU CẦU")
    parts.append("Hãy đề xuất 2-5 trụ nội dung cho tuần này. Trả lời bằng JSON theo format đã mô tả.")

    return "\n".join(parts)
