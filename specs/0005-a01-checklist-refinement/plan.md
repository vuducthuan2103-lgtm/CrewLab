# Kế Hoạch Triển Khai (Implementation Plan) - 0005

## 1. Cập nhật Model & Database Migration
1. **Model `ContentItemStateLog`**: 
   - Thêm vào `backend/app/models/content.py`.
   - Các trường: `id`, `content_item_id`, `agent_code`, `previous_state`, `new_state`, `reason`, `created_at`.
2. **Model `AgentMemory`**:
   - Nếu chưa có, đảm bảo `AgentMemory` được định nghĩa trong `reviews.py`.
   - Các trường cần thiết: `client_id`, `agent_code`, `task_type`, `content_item_id`, `human_feedback`.
3. Tạo file Migration `0003_add_state_log_and_agent_memory.py` bằng Alembic.

## 2. Nâng cấp Dispatcher (`dispatcher.py`)
- Định nghĩa Enum `WakeReason` ở file `schemas.py` (`scheduled`, `task_assigned`, `manual`, `retry`).
- Refactor `handle_event`:
  - Thay `b02_complete` bằng `strategy_gate_approved(S2)`.
  - Thay `b03_complete` bằng `strategy_gate_approved(S3)`.
  - Bổ sung các luồng xử lý: `eval_passed`, `content_gate_approved`, `content_rejected`, `asset_request_expired`.
  - Bổ sung 5 Deferred Triggers với `logger.info("Deferred trigger placeholder")`.
- Viết hàm lưu `human_feedback` cho P01-lite (Upsert vào `AgentMemory`).

## 3. Cập nhật Celery Tasks (`orchestrator_tasks.py`)
- Viết task `check_asset_request_expiry`: query `AssetRequest`, nếu hết hạn, gọi `a01_handle_trigger` truyền event `asset_request_expired`.

## 4. Helper Function `update_content_state`
- Tạo hàm `update_content_state` (T15) trong một module service để Agent hoặc backend dễ dàng gọi, chức năng là cập nhật `status` của `ContentItem` và đồng thời ghi log vào `ContentItemStateLog`.
