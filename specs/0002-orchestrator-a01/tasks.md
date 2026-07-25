# Tasks: Orchestrator A01 (MVP)

- [ ] **1. Cập nhật Model & Database (Alembic Migration)**
  - Cập nhật file `clients.py` thêm 3 fields: `schedule_day`, `schedule_time`, `schedule_frequency`.
  - Chạy lệnh sinh migration Alembic (`alembic revision --autogenerate -m "add schedule config to client"`).
  - Áp dụng migration (`alembic upgrade head`).

- [ ] **2. Tạo Cấu Trúc Khung (Boilerplate) cho A01**
  - Tạo package `backend/app/agents/a01`.
  - Định nghĩa các schema Pydantic cho input/output (e.g. `DispatchInstruction`, `A01PrecheckResult`).

- [ ] **3. Viết module Precheck (`precheck.py`)**
  - Kiểm tra `client.is_active`.
  - Kiểm tra điều kiện `Concurrent cycle` (không tạo mới nếu cycle chưa qua strategy).

- [ ] **4. Viết module Retry Routing (`retry_routing.py`)**
  - Phân tích `failed_criteria` từ output của E01 để điều hướng (D01 hoặc D02).
  - Tăng biến `eval_retry_count` chỉ khi E01 fail logic, phân biệt với lỗi Celery/hạ tầng.

- [ ] **5. Viết Service Context Packet MVP (`context_packet.py`)**
  - Đọc `brand_voice`, `tone`, v.v... từ `brand_settings`.
  - Truy vấn 5 bản ghi gần nhất và feedback từ `agent_memory`.
  - Format thành JSON trả về cho Orchestrator truyền xuống agent đích.

- [ ] **6. Viết Core Dispatcher (`dispatcher.py`)**
  - Tiếp nhận các event trigger: `d01_complete`, `d02_complete`, `eval_failed`, v.v.
  - Sinh ra `DispatchInstruction` với `idempotency_key` chuẩn xác.

- [ ] **7. Setup Celery Tasks & Dynamic Schedule Job (`orchestrator_tasks.py`)**
  - Định nghĩa Celery Task `check_scheduled_cycles` chạy nền mỗi 15 phút.
  - Logic: quét bảng `clients`, đối chiếu `schedule_time` / `schedule_day` với giờ `Asia/Ho_Chi_Minh` hiện tại -> đẩy `beat_weekly` event vào queue nếu đúng lịch.
  - Định nghĩa Celery task `a01_handle_trigger` để tiếp nhận các trigger (từ API hoặc từ job hẹn giờ trên).

- [ ] **8. Setup Logging (`task_logger.py`)**
  - Viết hàm trợ giúp để ghi log vào bảng `task_logs`.
  
- [ ] **9. Viết UnitTest**
  - Bổ sung test cho module Precheck.
  - Test Retry Routing logic (vd: nếu `failed_criteria = ["visual_asset_fit"]` -> gọi D02).
  - Chạy `pytest` xác nhận mọi thứ hoạt động tốt.
