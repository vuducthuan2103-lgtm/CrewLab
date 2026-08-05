# 0002 - Orchestrator A01 (MVP)

## WHAT & WHY
A01 là agent điều phối toàn bộ workflow của một weekly cycle. Nó đọc trạng thái (state), quyết định bước tiếp theo, dispatch task cho đúng agent, và xử lý retry-routing/escalation. A01 không tự viết content hay phân tích dữ liệu, nó đóng vai trò máy trạng thái (FSM) và luồng điều khiển cho 5 agent nội dung MVP (B02, B03, D01, D02, E01). 

Mục đích của Spec này là triển khai A01 tuân thủ giới hạn của Phase 1 (MVP-Scope v3.5), loại bỏ các trigger chưa cần thiết như F01, G01-G04, B01, nhưng vẫn giữ nguyên kiến trúc chuẩn (DispatchInstruction, WakeReason, Idempotency) để dễ dàng mở rộng sau này.

## Nguồn Tham Khảo từ PRD

### 1. Agent Role & Trigger (Theo MVP Scope v3.5 Mục 1a)
- **Role:** Điều phối toàn bộ workflow 1 weekly cycle.
- **Trigger Active cho MVP:**
  - `beat_weekly` -> dispatch B02
  - `strategy_gate_approved` (S2) -> dispatch B03
  - `strategy_gate_approved` (S3) -> dispatch D01 × N item
  - `d01_complete` -> dispatch D02
  - `d02_complete` (visual_ready) -> dispatch E01
  - `asset_submitted` -> dispatch D02 lại
  - `asset_request_expired` -> Set `asset_blocked` + `notify_agency_admin`
  - `eval_failed` (còn lượt retry) -> dispatch D01 hoặc D02 theo bảng retry-routing
  - `eval_failed` (hard fail / hết lượt) -> Set `rejected` + `notify_agency_admin`
  - `content_gate_approved` -> Set `approved_ready_to_post` (không dispatch — đăng tay)
  - `a01_chat_task_created` -> A01 dispatch D01 cho content item được nhận qua Portal chat

### 2. Wake Reason
- `scheduled` — dispatch theo `beat_weekly`
- `task_assigned` — dispatch task cụ thể
- `retry` — Celery tự retry sau lỗi hạ tầng (không tăng `eval_retry_count`)

> **Amendment Spec 0014 / Decision 0010:** Phase 1 không có manual retry. Giao việc cho A01 qua chat dùng `task_assigned`; Direct Assign nghĩa là bỏ qua A01 và vẫn defer.

### 3. Business Rules (MVP)
1. **Precheck:** Chỉ check `clients.is_active` (bỏ quota 12 agent cho MVP).
2. **Không Campaign check:** Luôn chạy Mode B.
3. **Concurrent cycle:** Không tạo cycle mới nếu cycle hiện tại chưa qua khỏi `content_production`.
4. **Retry-routing:** Đọc `failed_criteria` từ E01 để điều hướng (D01, D02, hoặc D01 -> D02 tuần tự).
5. **`eval_retry_count`:** Chỉ tăng khi E01 đã chạy xong và trả score dưới ngưỡng. Lỗi hạ tầng (retry của Celery) không tăng count.
6. **Ai sở hữu state transition:** Từng agent tự cập nhật state qua T15; A01 chỉ ĐỌC state để dispatch, không ghi đè transition.

### 4. Dispatch Schema
```json
{
  "task_name": "agents.d01.caption_writer",
  "payload": {
    "client_id": "...",
    "content_item_id": "...",
    "wake_reason": "task_assigned",
    "context_packet": { ... }
  },
  "idempotency_key": "{client_id}:{cycle_id}:{agent_code}:{content_item_id}:{attempt}"
}
```

### 5. Context Packet (P01-lite) & Observability
- Context Packet MVP chỉ gồm: `identity`, `episodic` (5 bản ghi gần nhất + feedback 30 ngày), `assignments`, `wake_reason`.
- Tất cả các agent bao gồm A01 phải tự ghi log vào bảng `task_logs` (Observability tối giản).

## Acceptance Criteria (AC)
- **AC-WF-01:** A01 dispatch B02 khi nhận `beat_weekly` (vì không có campaign/event trong MVP).
- **AC-WF-20:** `eval_retry_count` chỉ tăng khi E01 fail về chất lượng, không tăng do Celery timeout/network lỗi.
- **AC-WF-21:** Asset_request hết hạn thì set state thành `asset_blocked` và notify Agency Admin, không tự ý fallback ảnh.
- **AC-A01-01:** A01 phải precheck `clients.is_active` thành công trước khi dispatch.
- **AC-A01-02:** A01 không tạo cycle mới nếu cycle của client đó vẫn đang ở phase `strategy`.
- **AC-A01-03:** Retry routing phải điều hướng chính xác D01 hoặc D02 dựa vào `failed_criteria`.
- **AC-A01-04:** Idempotency_key phải được sinh đúng cú pháp để tránh xử lý trùng task trên Celery.
- **AC-A01-05:** Task logs được lưu vào DB cho mỗi lần chạy A01.
