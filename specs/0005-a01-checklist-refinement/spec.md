# Tính Năng (Spec) - 0005 Hoàn Thiện Checklist A01 Orchestrator

## 1. Tóm Tắt (Overview)
Rà soát và bổ sung các nghiệp vụ còn thiếu cho A01 Orchestrator theo sát Checklist Dự Án đã duyệt, bao gồm việc quản lý 10 triggers Active, 5 triggers Deferred, xử lý Hindsight Episodic (P01-lite) và các Business Rules quản lý State.

## 2. Yêu Cầu Chi Tiết (Requirements)

### 2.1. Quản Lý Triggers trong Dispatcher
A01 cần định nghĩa đầy đủ 10 Active Triggers:
1. `beat_weekly`: Kích hoạt chu kỳ mới (route tới B02).
2. `strategy_gate_approved(S2)`: (Thay thế `b02_complete` cũ) Route tới B03.
3. `strategy_gate_approved(S3)`: (Thay thế `b03_complete` cũ) Route tới D01.
4. `d01_complete`: Route tới D02.
5. `d02_complete`: Route tới E01.
6. `eval_failed`: Route lại D01/D02 (Retry Routing).
7. `eval_passed`: Chuyển sang `pending_content_approval` (Có thể xử lý state hoặc không route tiếp).
8. `content_gate_approved`: Tích hợp P01-lite (Lưu feedback).
9. `content_rejected`: Tích hợp P01-lite (Lưu feedback) & Route lại D01/D02.
10. `asset_request_expired`: Set status `asset_blocked` và notify Agency Admin.

Khai báo 5 Deferred Triggers (Chỉ để placeholder, không wire logic):
1. `campaign_created`
2. `campaign_ended`
3. `publish_due`
4. `client_onboarded`
5. `onboarding_failed`

### 2.2. Hindsight Episodic Memory (P01-lite)
- Khi nhận trigger `content_gate_approved` (có sửa caption) hoặc `content_rejected` (có lý do), A01 gọi hàm lưu vào bảng `agent_memory` (Upsert theo `content_item_id`).
- Dữ liệu lưu: `human_feedback` (nội dung sửa / lý do reject).
- KHÔNG tạo learning packet, KHÔNG ghi performance pattern theo đúng scope MVP.

### 2.3. Celery Beat: Check Asset Request Expiry
- Xây dựng Celery task `check_asset_request_expiry` chạy định kỳ (vd: mỗi vài giờ) trong `orchestrator_tasks.py`.
- Task tìm các `AssetRequest` có `expires_at < now()` và `status = 'pending'`, sau đó bắn event `asset_request_expired` cho A01.

### 2.4. Cấu trúc bảng `content_item_state_log`
- Thêm table `content_item_state_log` lưu lịch sử chuyển state của Content Item.
- Tạo tool `T15 update_content_state` (hoặc hàm helper backend) để các agent tự gọi ghi log khi hoàn thành bước của mình.

### 2.5. Business Rules Compliance
- **Rule 3 (Concurrent Cycle)**: Precheck chỉ block cycle mới nếu cycle hiện tại CÒN ĐANG ở giai đoạn sản xuất (VD: `planned`, `writing`, `designing`, `evaluating`, `pending_content_approval`). Nếu đã qua `approved_ready_to_post` hoặc `posted` thì cho phép tạo cycle mới.
- **Rule 6 (Read-Only State)**: A01 chỉ đọc state để dispatch, KHÔNG ghi đè state thay agent (ngoại trừ các trigger hệ thống như `asset_request_expired` ép về `asset_blocked`).
- **Wake Reason Enum**: Chuẩn hoá `wake_reason` = `[scheduled, task_assigned, manual, retry]`.

## 3. Tiêu Chí Chấp Nhận (Acceptance Criteria)
| ID | Tiêu Chí |
|---|---|
| AC-A01-01 | Dispatcher có đủ 10 Active Triggers và 5 Deferred Triggers. |
| AC-A01-02 | Có hàm upsert vào `agent_memory` xử lý P01-lite. |
| AC-A01-03 | Celery task `check_asset_request_expiry` hoạt động, tìm đúng bản ghi quá hạn. |
| AC-A01-04 | Migration tạo bảng `content_item_state_log` thành công. |
