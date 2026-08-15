# Spec 0018 - Weekly Schedule Settings

**Feature Branch:** `feature/0018-weekly-schedule-settings`
**Status:** Approved by direct user request on 2026-08-08

## Goal

Cho phép khách hàng chỉnh thứ và giờ A01 bắt đầu workflow tuần tự động từ Portal Settings, đồng thời bảo đảm Celery Beat thực thi lịch đã lưu trong cửa sổ kiểm tra 15 phút.

## In Scope

- `GET /api/v1/portal/settings` trả `schedule.weekly_cycle_day`, `weekly_cycle_time`, `timezone` và `frequency`.
- `PATCH /api/v1/portal/settings/schedule` cập nhật `clients.schedule_day` và `clients.schedule_time` đúng tenant.
- Validate thứ trong tuần, giờ `HH:MM` và idempotency key.
- Tab Portal `Lịch tự động` có loading, saving, success và error states.
- Scheduler xét timezone từng client trong cửa sổ `[scheduled_time, scheduled_time + 15 phút)`.

## Out of Scope

- Nút chạy workflow ngay/test workflow, manual retry/reopen hoặc Direct Assign.
- Per-agent schedule, campaign/event branching hay agent ngoài 6 agent MVP.
- Đổi posting frequency, nền tảng đăng hoặc timezone từ Portal.
- Migration database.

## Acceptance Criteria

1. GET settings trả đúng day/time/timezone/frequency của client đăng nhập.
2. PATCH hợp lệ chỉ cập nhật client đang xác thực; request lặp cùng key không tạo side effect mới.
3. Day/time không hợp lệ trả 422, không đổi DB.
4. Scheduler due trong 15 phút, kể cả qua nửa đêm; timezone lỗi không làm batch dừng.
5. Không có nút chạy ngay, retry thủ công hay direct assign.
6. Backend tests, Portal lint và build pass.
