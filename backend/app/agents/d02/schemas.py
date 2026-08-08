"""Pydantic schemas for D02 — Image Design & Matching agent."""
from pydantic import BaseModel


class D02TagOutput(BaseModel):
    """Output của LLM call 1: enhance tags để query media library tốt hơn."""
    enhanced_tags: list[str]      # Tags bổ sung + chuẩn hóa từ image_brief
    search_priority: list[str]    # Tags quan trọng nhất, thử match trước


class D02SelectionOutput(BaseModel):
    """Output của LLM call 2: chọn ảnh tốt nhất trong danh sách match."""
    selected_asset_id: str        # UUID của ảnh được chọn
    reason: str                   # Giải thích ngắn tại sao chọn ảnh này


class AssetRequestData(BaseModel):
    """Cấu trúc dữ liệu để tạo AssetRequest có cấu trúc cho client."""
    note: str                       # Mô tả tổng quát cho client đọc
    shot_list: list[dict]           # [{"angle": str, "description": str}]
    reference_tags: list[str]       # Tags tham khảo từ image_brief
    example_asset_ids: list[str]    # UUID[] ảnh ví dụ phong cách (có thể rỗng)
    expires_days: int = 3           # Số ngày trước khi expire (configurable)
