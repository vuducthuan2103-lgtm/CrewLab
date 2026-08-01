"""Prompt templates for B03 — Content Plan agent."""
import json
from typing import Any


SYSTEM_PROMPT_B03 = """Bạn là B03 — Content Plan Strategist, một AI chuyên gia lên lịch đăng bài truyền thông cho quán cà phê / F&B Việt Nam.

NHIỆM VỤ: Dựa trên các Trụ nội dung (Content Pillars) đã chọn và Tần suất đăng bài (Posting Frequency) được quy định, lập kế hoạch chi tiết các bài viết cho tuần này.

QUY TẮC BẮT BUỘC:
1. TÔN TRỌNG ĐÚNG TẦN SUẤT ĐĂNG BÀI: Tạo CHÍNH XÁC số lượng bài theo yêu cầu tần suất per platform. KHÔNG tạo thừa hoặc thiếu bài.
2. Phân bổ các bài viết vào từng Trụ nội dung theo tỷ lệ trọng số (weight) hợp lý.
3. Mỗi bài viết phải chọn rõ Nền tảng (platform: facebook/instagram), Chủ đề (topic), Ngày đăng (scheduled_date YYYY-MM-DD), và Giờ đăng (scheduled_time HH:MM).
4. Phân bố các ngày đăng đều trong tuần, tránh dồn nhiều bài vào 1 ngày trừ khi yêu cầu.

OUTPUT FORMAT: JSON theo cấu trúc sau:
{
  "items": [
    {
      "topic": "Chủ đề cụ thể của bài viết",
      "platform": "facebook",
      "pillar_name": "Tên pillar đã có",
      "scheduled_date": "2026-08-04",
      "scheduled_time": "18:00"
    }
  ]
}
"""


def build_b03_user_prompt(
    pillars: list[dict[str, Any]],
    posting_frequency: dict[str, int],
    platforms: list[str],
    context_packet: dict[str, Any],
    cycle_start_date: str = "2026-08-03",  # Monday as baseline if not set
) -> str:
    """Build the user prompt for B03."""
    brand = context_packet.get("brand_settings", {})
    memory = context_packet.get("episodic_memory", [])

    total_requested = sum(posting_frequency.values())

    parts = []

    # Brand identity
    parts.append("## THÔNG TIN THƯƠNG HIỆU")
    if brand.get("brand_voice_short"):
        parts.append(f"Brand Voice: {brand['brand_voice_short']}")
    if brand.get("tone_of_voice"):
        parts.append(f"Tone: {brand['tone_of_voice']}")
    if brand.get("target_audience"):
        parts.append(f"Đối tượng: {brand['target_audience']}")

    # Pillars
    parts.append("\n## DANH SÁCH TRỤ NỘI DUNG (PILLARS) ĐÃ DUYỆT")
    for p in pillars:
        parts.append(f"- **{p['name']}** (Weight: {p['weight']}%): {p.get('description', '')}")

    # Posting Frequency constraint
    parts.append("\n## YÊU CẦU TẦN SUẤT ĐĂNG BÀI (BẮT BUỘC KHÔNG THAY ĐỔI)")
    parts.append(f"Tổng số bài cần tạo: {total_requested} bài.")
    for plat, count in posting_frequency.items():
        parts.append(f"- Nền tảng '{plat}': {count} bài")

    parts.append(f"\nNgày bắt đầu tuần làm việc (Thứ 2): {cycle_start_date}")

    # Episodic memory
    if memory:
        parts.append("\n## LƯU Ý TỪ PHẢN HỒI QUÁ KHỨ")
        for mem in memory[:5]:
            feedback = mem.get("human_feedback", "")
            if feedback:
                parts.append(f"- [{mem.get('agent_code', '?')}] {feedback}")

    parts.append(
        f"\nHãy tạo CHÍNH XÁC {total_requested} bài viết phân bổ theo tần suất và pillar ở trên. Trả lời bằng JSON."
    )

    return "\n".join(parts)
