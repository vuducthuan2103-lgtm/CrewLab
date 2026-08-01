# Kế Hoạch Triển Khai (Implementation Plan) - 0002 Orchestrator A01

## 1. Kiến Trúc Kỹ Thuật (Architecture)

- Dùng `Celery` để tạo các task hàng đợi. 
- A01 không phải là một service chạy nền liên tục (daemon) mà là các Celery tasks được kích hoạt bởi các events (trigger).
- Cụ thể thay vì một `beat_weekly` cố định 8h Thứ 2 cho toàn hệ thống, sẽ có một background job (cron/Celery Beat) chạy định kỳ (vd: mỗi 15 phút) quét cấu hình `schedule_config` của từng Client. Nếu đến giờ hẹn của Client (tính theo múi giờ `Asia/Ho_Chi_Minh`), job này mới đẩy 1 task `beat_weekly` vào queue cho A01 của Client đó.
- A01 đóng vai trò là "người gửi thư" (Dispatcher) tạo ra các task con (`DispatchInstruction`) đẩy vào queue cho các agent khác (B02, B03, D01, D02, E01).

### Modules Cần Thiết
Tạo cấu trúc code trong `backend/app/`:
- `backend/app/agents/a01/`: Chứa logic của Orchestrator.
  - `dispatcher.py`: Logic sinh ra `DispatchInstruction`.
  - `retry_routing.py`: Logic xác định D01 hay D02 cần chạy lại dựa vào `failed_criteria`.
  - `precheck.py`: Kiểm tra client active và concurrent cycle.
- `backend/app/tasks/orchestrator_tasks.py`: Các Celery task để hứng trigger (ví dụ: `a01_handle_trigger`).
- `backend/app/services/context_packet.py`: Logic tạo `Context Packet MVP` cho các agent content.
- `backend/app/services/task_logger.py`: Helper để ghi vào `task_logs`.

## 2. Thiết Kế Cơ Sở Dữ Liệu (Cần Cập Nhật)
Cấu trúc cơ bản đã tạo ở Spec 0001, tuy nhiên cần bổ sung thêm field cho bảng `clients` để quản lý lịch trình linh hoạt:
- `clients.schedule_day`: Ngày chạy trong tuần (VD: 1 = Thứ 2).
- `clients.schedule_time`: Giờ chạy (VD: "08:00").
- `clients.schedule_frequency`: Tần suất (VD: "weekly", "biweekly").

A01 sẽ tương tác bằng SQLAlchemy với các bảng:
- `clients` (đọc `is_active` và lịch trình)
- `workflow_cycles` (đọc/tạo cycle)
- `content_items` (đọc state hiện tại và `failed_criteria`)
- `task_logs` (ghi nhật ký)
- `agent_memory` (đọc `episodic` qua Context Packet)

## 3. Luồng Dữ Liệu (Data Flow)
1. **Trigger Nhận Vào:** Hệ thống (API / Webhook / Celery Beat) ném 1 sự kiện vào queue cho A01.
2. **A01 Precheck:** Kiểm tra `client_id` có active không. 
3. **Xác Định State:** A01 đọc DB để biết item/cycle đang ở state nào.
4. **Quyết Định (Routing):** Tùy thuộc vào trigger và state, A01 quyết định agent tiếp theo.
5. **Tạo Context Packet:** Gom dữ liệu (identity, episodic) từ DB thành dictionary chuẩn.
6. **Dispatch:** Tạo `DispatchInstruction` -> Gọi `task.delay()` để đưa task vào hàng đợi của Agent Đích.
7. **Log:** Ghi thông tin vào `task_logs`.

## 4. Các Endpoints (Tuỳ Chọn để Test/Trigger)
- `POST /api/v1/orchestrator/trigger`: API nội bộ/Admin để trigger thủ công (manual wake reason) nhằm test luồng mà không cần đợi beat_weekly.

## 5. Review & Open Questions
- Với `beat_weekly`, chúng ta sẽ cấu hình Celery Beat chạy vào 08:00 T2 hàng tuần cho mọi client hay chạy riêng theo múi giờ client (`client.timezone`)? 
*(Đề xuất: Chạy theo timezone của Server trong MVP để đơn giản hóa Celery Beat, hoặc chạy theo múi giờ client nếu Celery Beat hỗ trợ dynamic schedule).*
