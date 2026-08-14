# Spec 0019 — Customer Content Workflow

**Feature Branch:** `feature/0019-customer-content-workflow`  
**Status:** Approved by founder on 2026-08-08  
**Nguồn gốc:** `customer-content-workflow.md` (root repo)

---

## 1. Mục tiêu

Tạo một hành trình rõ ràng để khách hàng lên lịch tuần hoặc giao một bài phát sinh mà:
- Không tạo trùng `content_item`
- Không gọi thẳng agent con từ Portal
- Không có hai nơi cùng sửa một state

---

## 2. In Scope

### 2.1 Luồng lịch tuần (Weekly Workflow)
1. Scheduler (Celery Beat) gọi A01 vào đúng ngày/giờ trong `clients.schedule_day` + `clients.schedule_time`
2. A01 dispatch B02 → B02 đề xuất 2–5 Content Pillar + Angle
3. Khách hàng xác nhận tại **Gate S2** (Content Hub → Tab Pillar & Angle)
4. A01 dispatch B03 → B03 tạo đúng số bài theo `posting_frequency`
5. Khách hàng duyệt cả tuần tại **Gate S3** (Content Hub → Tab Calendar → "Duyệt tất cả tuần")
6. Sau Gate S3, A01 dispatch từng bài: D01 → D02 → E01; E01 tự retry tối đa 3 lần
7. Bài đạt tiêu chí → sang **Gate 2** (Modal Duyệt bài)

### 2.2 Luồng bài phát sinh (Ad-hoc via Chat)
1. Khách hàng chat với A01 tại màn hình `/a01-chat`
2. A01 đi qua 4 trạng thái hội thoại (xem §3)
3. Chỉ ở trạng thái `assigned` A01 mới tạo `content_item` và dispatch D01
4. Bài phát sinh **không** chạy lại B02/B03, **không** sửa plan đã duyệt

### 2.3 Đầu việc của khách hàng
- Nộp ảnh khi D02 yêu cầu → màn hình `/assets`
- Gate 2: Approve / Approve with edit / Reject → Modal Duyệt bài
- Tự đăng → bấm "Đánh dấu đã đăng" → trạng thái `posted`

---

## 3. A01 Conversation FSM (4 States)

```
exploring → clarifying → confirmation → assigned
```

| State | Ý nghĩa | Hành động được phép |
|---|---|---|
| `exploring` | Khách hàng đang hỏi ý kiến, chưa rõ ý định | Chỉ trả lời, **không tạo item** |
| `clarifying` | A01 đang hỏi lại thông tin còn thiếu | Hỏi tối đa 3 câu, **không tạo item** |
| `confirmation` | A01 hiển thị Assignment Summary, chờ xác nhận | **Không tạo item** cho đến khi khách hàng confirm |
| `assigned` | Khách hàng đã confirm bản tóm tắt | Tạo đúng **1** `content_item` + dispatch D01 |

### Assignment Summary (bắt buộc ở state `confirmation`)
```
📋 Tóm tắt bài viết:
- Chủ đề: [topic]
- Mục tiêu: [goal]
- Nền tảng: [FB / IG / both]
- Lịch đăng: [date + time]
- Pillar: [pillar_name] / Angle: [angle_name hoặc TBD]
- CTA: [call to action]
- Asset: [ảnh thật / thư viện / AI tạo]

Xác nhận để tạo bài? (Có / Không / Sửa lại)
```

### Idempotency
- A01 chỉ tạo item khi nhận được `action: confirm` từ Portal
- Portal gửi `idempotency_key = sha256(client_id + topic + scheduled_date)` kèm request
- Backend từ chối tạo nếu key đã tồn tại trong 24h

---

## 4. Rule bài phát sinh là Add-on (xem ADR 0014)

- Bài phát sinh **mặc định là add-on** — không tự thay / xóa bài trong lịch đã duyệt
- A01 **phải cảnh báo** và yêu cầu chọn giờ/chủ đề khác nếu:
  - Trùng platform + khung giờ (±2h) với bài đã có trong tuần
  - Cùng pillar + cùng ngày với ≥2 bài khác
- A01 **không được tự ghi đè** — chỉ người dùng quyết định

---

## 5. Quy tắc chống xung đột

| Rule | Mô tả |
|---|---|
| Portal → A01 only | Portal chỉ gửi message cho A01; không gọi trực tiếp B02/B03/D01/D02/E01 |
| Content Hub là single source | Chỉ Content Hub sửa/xác nhận Pillar, Angle và lịch tuần |
| Gate S2 khóa version Pillar | Sau Gate S2, không ghi đè Pillar version cũ |
| Gate S3 khóa version Plan | Sau Gate S3, không ghi đè Content Plan version cũ |
| Agent owns transition | Agent vừa hoàn thành bước nào thì agent đó sở hữu state transition của bước đó |
| Idempotent actions | Mọi action có side effect phải idempotent (double-click/double-send không tạo bài trùng) |
| Reject là terminal | Reject của người dùng → `rejected` thẳng, **không có nút retry/reopen thủ công** |

---

## 6. Giải quyết mâu thuẫn về Reject

**Mâu thuẫn:** MVP Scope mô tả Reject có thể trigger retry; Spec 0009a và ADR 0010 nói Reject là terminal.

**Kết luận (nguồn mới hơn thắng):**
- Theo **ADR 0010** (`0010-remove-manual-workflow-controls-phase-1.md`) — đây là nguồn mới nhất
- **Reject của người dùng → `rejected` và là trạng thái cuối trong Phase 1**
- Retry chất lượng chỉ do E01 tự động kích hoạt (không phải từ action của người dùng)
- Không có nút "Tạo lại bài" hay "Mở lại để sửa"

---

## 7. Thuật ngữ chuẩn (đồng bộ trên Portal)

| Khái niệm | Nhãn hiển thị | Màn hình xuất hiện |
|---|---|---|
| `ContentPillar` | Trụ nội dung (Pillar) | Content Hub Tab 2, A01 Chat |
| `ContentAngle` | Góc khai thác (Angle) | Content Hub Tab 2, A01 Chat |
| `ContentItem` | Bài viết | Kanban, Calendar, Gate 2 |
| `content_item.state` | (theo FSM_STATE_LABELS) | Kanban badge |

---

## 8. Mẫu giao việc cho A01

```
Tạo 1 bài phát sinh về [chủ đề/sản phẩm], mục tiêu [mục tiêu],
đăng trên [FB/IG] lúc [ngày giờ], thuộc pillar [tên] và angle
[góc khai thác nếu biết], thông điệp/ưu đãi [nội dung], CTA [CTA],
dùng [ảnh thật/ảnh trong thư viện].
Hãy hỏi lại phần còn thiếu và chỉ tạo bài sau khi tôi xác nhận bản tóm tắt.
```

**Không nhắn A01 để:** duyệt Pillar, duyệt tuần, nộp ảnh, approve/reject bài, Mark as posted.

---

## 9. Out of Scope (Phase 1)

- Direct Assign (bypass A01, giao thẳng agent con)
- Campaign / Event branching (B01 IMC Planner)
- F01 Publisher / Meta Graph API posting
- G01–G04 Analytics agents
- Manual retry / reopen content item
- Telegram bot / ChromaDB / Hindsight / Docling

---

## 10. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-0019-01 | Bài phát sinh tạo qua A01 Chat luôn là add-on; không ghi đè bài trong lịch đã duyệt |
| AC-0019-02 | A01 chỉ tạo content_item khi ở state `assigned` (sau khi user confirm bản tóm tắt) |
| AC-0019-03 | Portal không gọi trực tiếp B02/B03/D01/D02/E01 — chỉ POST đến A01 |
| AC-0019-04 | Khi trùng platform + khung giờ (±2h), A01 cảnh báo và yêu cầu chọn lại |
| AC-0019-05 | Reject → `rejected` terminal; không có nút retry/reopen thủ công trên Portal |
| AC-0019-06 | Tài liệu (spec, ADR, PRD) không còn mô tả Human Reject là automatic retry |
| AC-0019-07 | Assignment Summary gồm đủ: topic, goal, platform, schedule, pillar/angle, CTA, asset |
| AC-0019-08 | Idempotency key ngăn tạo bài trùng khi double-submit |
