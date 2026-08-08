"""Pydantic schemas for D01 — Caption Writer agent output."""
from pydantic import BaseModel
from typing import Optional


class ImageBrief(BaseModel):
    """Mô tả ý tưởng hình ảnh để D02 tìm/tạo ảnh phù hợp."""
    description: str           # Mô tả ý tưởng hình ảnh tổng quát
    mood: str                  # Cảm xúc/phong cách (VD: "ấm áp, tự nhiên, summer vibes")
    suggested_tags: list[str]  # Tags để D02 tìm trong brand_assets (VD: ["cà phê", "cold brew"])
    composition_notes: str     # Gợi ý bố cục (VD: "Ảnh dọc, close-up sản phẩm trên nền gỗ sáng")
    avoid: list[str]           # Cần tránh trong ảnh (VD: ["ảnh mờ", "nền tối"])


class D01Output(BaseModel):
    """Structured output từ D01 LLM call."""
    caption: str               # Nội dung caption đầy đủ sẵn sàng đăng, bao gồm hashtag
    image_brief: ImageBrief
