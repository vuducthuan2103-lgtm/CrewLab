# Spec 0009a — Content Approval Gate 2 API Wiring

**Ngày tạo:** 2026-08-01 | **Phiên bản:** v2 (thay thế Spec 0009 v1 + doc "Layer 4 Wiring")
**Trạng thái:** Draft — chờ duyệt
**Phụ thuộc:** Spec 0003 (Client Portal MVP UI), Spec 0008 (E01 Evaluator)
**Nhánh git đề xuất:** `feature/0009a-content-approval-gate2`

> **Vì sao tách nhỏ:** Spec 0009 gốc gộp approve/reject/mark-posted + Gate S2/S3 + settings CRUD
> vào 1 spec — vi phạm nguyên tắc "1 task = 1 phạm vi nhỏ" (Quy-Trinh-Vibe-Coding §1.4).
> Bản này **chỉ** cover Content Approval Gate (Gate Family 2 — per-item approve/reject/posted)
> + Task Logs. Gate S2/S3 → xem Spec 0009b. Settings CRUD → xem Spec 0009c.

---

## 1. Bối cảnh và Mục tiêu

Client Portal (`portal/`) hiện chạy 100% mock data (`portal/lib/mock-data.ts`). Spec này nối
3 hành động chính trên Content Approval Gate (approve / reject / mark-posted) và màn Task Logs
với Postgres thật qua FastAPI, đúng theo FSM và business rule đã chốt ở `MVP-Scope-v3.4.md`
§1a, §3 và PRD §7.3.5 (Gate Family 2).

---

## 2. Quyết định đã chốt lại so với bản v1 (đọc trước khi code)

### 2.1. Auth — dùng Supabase Auth JWT thật, không dùng header tự khai

Bản v1 đề xuất `X-Client-Id` header do frontend tự gửi + `reviewer_id = client_id` hardcode.
**Cả hai bị loại** vì vi phạm thẳng quyết định đã chốt (RLS + Supabase Auth UUID cho
`reviewer_id`/`user_id` là MUST, không deferred).

**Quyết định:** MVP vẫn dùng Supabase Auth email/password thật (đã có sẵn theo PRD §7.5.2.2,
không cần build thêm gì mới) — không phải OAuth/magic link, chỉ cần login thật để có JWT thật.

- Backend đọc JWT từ header `Authorization: Bearer <token>`, verify bằng Supabase JWT secret.
- `client_id` và `user_id` lấy từ JWT claims (`role`, `client_id`, `user_id`) — **không** lấy
  từ body/query do client tự gửi lên.
- `reviewer_id` = `user_id` từ JWT — là UUID của Trường hoặc Thuận thật, không phải `client_id`.
- Middleware `require_role`, `require_client_match` áp dụng theo đúng PRD §7.5.2.3.
- RLS ở DB level vẫn bật (defense-in-depth layer 2) — Celery worker dùng service role key,
  FastAPI request thường đi qua RLS bình thường theo JWT.

Nếu 2 đứa vẫn muốn tạm bỏ qua bước login thật vì thấy quá mất công cho MVP 1 client nội bộ,
đây phải là quyết định ghi vào `docs/decisions/000X-mvp-auth-tradeoff.md` nói rõ rủi ro chấp
nhận và mốc phải sửa lại (chậm nhất là trước khi có client thứ 2 trả phí) — không lặng lẽ chọn
phương án đơn giản nhất trong code.

### 2.2. Response envelope chuẩn hoá theo PRD

Mọi response dùng đúng format PRD §7.5.2.1:

```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "error_code": "...", "message": "...", "details": {} } }
```

### 2.3. Idempotency bắt buộc

Mọi endpoint có side-effect (approve/reject/mark-posted) nhận `idempotency_key` trong body,
theo pattern đã có ở Tầng 2 (`{client_id}:{content_item_id}:{action}:{attempt}` hoặc tương đương
do frontend tự generate UUID cho mỗi lần bấm nút). Server lưu key vào Redis `idem:{key}` TTL 24h,
trùng key trong 24h → trả lại response cũ, không chạy lại side-effect.

---

## 3. Phạm vi Triển khai (In-Scope)

### 3.1. API Endpoints (`backend/app/api/portal_router.py`)

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/portal/content-items` | GET | List content items theo client (từ JWT), filter `status` optional |
| `/api/v1/portal/content-items/{id}/approve` | POST | Duyệt bài — xem §4.1 |
| `/api/v1/portal/content-items/{id}/reject` | POST | Từ chối bài — xem §4.2 |
| `/api/v1/portal/content-items/{id}/mark-posted` | POST | Đánh dấu đã đăng tay — xem §4.3 |
| `/api/v1/portal/task-logs` | GET | List `task_logs` theo client, filter `agent_code` optional |

### 3.2. Ngoài phạm vi (Out-of-Scope, để ở spec khác)

- Gate S2 (pillar confirm), Gate S3 (approve week) → Spec 0009b
- Settings CRUD (brand voice, model/budget, schedule) → Spec 0009c
- Asset request submit → Spec 0009d (tách riêng vì cần xử lý FSM `waiting_asset` cẩn thận —
  xem lý do ở §5 dưới)
- Realtime WebSocket/Supabase Realtime subscription (deferred, theo đúng NFR-T4-02 nhưng chưa
  cần cho MVP nội bộ 1 client — polling ngắn tạm đủ)

---

## 4. Chi tiết Business Logic (sửa lại FSM cho đúng)

### 4.1. Approve — `POST /content-items/{id}/approve`

**Request:**
```json
{
  "edited_caption": "string | null",
  "idempotency_key": "uuid"
}
```

**Logic:**
1. Verify item đang ở state `pending_content_approval` — nếu không, trả `409 conflict_invalid_state`.
2. Nếu `edited_caption` khác caption gốc → lưu `client_edited_caption`, ghi audit log.
3. Update state → `approved_ready_to_post`.
4. Ghi `hitl_reviews`: `action='approved'`, `reviewer_id=<user_id từ JWT>`, `edited_caption` nếu có.
5. **Gọi P01-lite** (xem §6) nếu có `edited_caption` — upsert `agent_memory` cho D01 với
   `human_feedback` = nội dung đã sửa (theo MVP-Scope §1c, PRD AC-WF-15).
6. Trả `next_state: "approved_ready_to_post"`.

Đây là điểm khác biệt lớn nhất so với bản v1: **approve không dispatch A01 event** ở MVP vì
MVP-Scope §1a ghi rõ trigger `content_gate_approved` → chỉ set `approved_ready_to_post`,
**không dispatch** (đăng tay, không có F01). Bản v1 không nói rõ điều này, dễ hiểu nhầm là
cần gọi A01.

### 4.2. Reject — `POST /content-items/{id}/reject`

**Request:**
```json
{
  "reject_reason": "tone_wrong | info_incorrect | visual_poor | wrong_asset | off_brand | bad_timing | other",
  "feedback_text": "string",
  "idempotency_key": "uuid"
}
```

**⚠️ Sửa lỗi FSM so với bản v1:** bản v1 chuyển state sang `eval_failed` và tăng
`eval_retry_count` — **sai**. `eval_failed` chỉ dành cho E01 tự động fail. Người reject ở
Content Approval Gate phải đi tới `rejected` (terminal state), không đụng `eval_retry_count`
(business rule 5, MVP-Scope §1a — counter này chỉ tăng khi E01 chạy và fail chất lượng).

**Logic đúng:**
1. Verify item đang ở `pending_content_approval` — nếu không, `409`.
2. Update state → `rejected` (terminal trong Phase 1; không có manual reopen theo Spec 0014,
   không nằm trong scope spec này).
3. Ghi `hitl_reviews`: `action='rejected'`, `reviewer_id`, `reject_reason`, `feedback_text`.
4. **Không tăng `eval_retry_count`.**
5. **Gọi P01-lite** — route feedback tới đúng agent theo mapping ở §6.2.
6. Trả `next_state: "rejected"`.

*(Ghi chú cho tương lai, không phải scope MVP: nếu sau này muốn có luồng "reject rồi tự động
retry D01/D02" thay vì terminal ngay, đó là thay đổi FSM cần ADR riêng, không phải default
behavior hiện tại.)*

### 4.3. Mark Posted — `POST /content-items/{id}/mark-posted`

**Request:**
```json
{ "idempotency_key": "uuid" }
```

**Logic:**
1. Verify item đang ở `approved_ready_to_post` — nếu không, `409`.
2. Update state → `posted`, `posted_at = now()`.
3. Ghi `hitl_reviews`: `action='marked_posted'`, `reviewer_id`.
4. Trả `next_state: "posted"`.

### 4.4. Task Logs — `GET /task-logs`

Không đổi logic so với bản v1, chỉ đổi cách lấy `client_id` (từ JWT thay vì query param tự khai).
Trả về theo schema `task_logs` đã định nghĩa ở MVP-Scope §1d — không thêm field mới.

---

## 5. Vì sao Asset Request Submit KHÔNG nằm trong spec này

Bản v1 (AC-API-05) đề xuất asset submit → chuyển thẳng `waiting_asset` sang `evaluating`.
**Sai theo FSM đã chốt** (MVP-Scope §3):

```
waiting_asset → visual_matching → visual_generating (D02 chạy lại) → evaluating
```

Trigger đúng là `asset_submitted` → A01 dispatch **D02** (không phải D01 — caption không đổi,
xem bảng trigger MVP-Scope §1a), D02 xử lý visual xong mới tới E01. Nhảy thẳng qua `evaluating`
bỏ mất bước D02 hoàn toàn.

Ngoài ra `asset_requests.status` không có giá trị `fulfilled` trong enum
(`pending | submitted | approved | rejected | expired` — PRD C7.5) — dùng đúng `submitted`,
và asset mới nộp vào `brand_assets` phải ở `status='pending_review'` (PRD FR-ASSET-01), chưa
tự động resume ngay — cần Agency Admin approve asset trước (PRD FR-ASSET-02) rồi mới
`asset_submitted` trigger thật sự chạy.

Vì việc này đụng tới FSM + dispatch A01 + review flow riêng (khác hẳn pattern approve/reject
đơn giản ở spec này), tách thành **Spec 0009d** riêng, làm sau khi 0009a chạy ổn.

---

## 6. P01-lite Integration (MỚI — thiếu ở bản v1)

MVP-Scope §1c định nghĩa P01-lite phải chạy khi có `content_gate_approved` (kèm
`client_edited_caption`) hoặc `content_rejected` (kèm `reject_reason` + `feedback_text`).
Bản v1 không gọi P01-lite ở đâu cả — nếu thiếu, learning loop chết ngay từ MVP dù đã spec kỹ.

### 6.1. Hàm cần có (`backend/app/services/p01_lite.py`)

```python
def upsert_agent_memory(
    agent_code: str,
    client_id: UUID,
    content_item_id: UUID,
    human_feedback: str,
) -> None:
    """
    Upsert vào agent_memory theo content_item_id (tìm record cũ nếu có, insert mới nếu không).
    Không có LLM tổng hợp — ghi feedback dạng text thô, theo MVP-Scope §1c.
    """
```

### 6.2. Routing feedback tới đúng agent

| Nguồn | `reject_reason` / tình huống | Ghi vào `agent_memory` của |
|---|---|---|
| Reject | `tone_wrong`, `info_incorrect`, `off_brand`, `bad_timing`, `other` | D01 |
| Reject | `visual_poor`, `wrong_asset` | D02 |
| Approve + edited_caption | (không có reject_reason) | D01 |

Đây là mapping còn thiếu hoàn toàn ở bản v1 — schema `RejectRequest` phẳng không có logic
route agent nào. Nếu `reject_reason` không rõ ràng thuộc nhóm nào (`other`), ghi vào D01 mặc định
và note rõ trong `human_feedback` để Agency Admin tự đọc, không cố gắng đoán.

---

## 7. Pydantic Schemas (`backend/app/api/schemas.py`)

```python
class ApproveRequest(BaseModel):
    edited_caption: str | None = None
    idempotency_key: str

class RejectRequest(BaseModel):
    reject_reason: Literal["tone_wrong", "info_incorrect", "visual_poor",
                            "wrong_asset", "off_brand", "bad_timing", "other"]
    feedback_text: str
    idempotency_key: str

class MarkPostedRequest(BaseModel):
    idempotency_key: str

class ContentItemOut(BaseModel):
    id: UUID
    topic: str
    facebook_caption: str | None
    instagram_caption: str | None
    status: str
    platform: str
    scheduled_date: datetime | None
    posted_at: datetime | None
    # KHÔNG bao gồm eval_score/caption_score/visual_score — AC-WF-14 cấm hiển thị cho client

class TaskLogOut(BaseModel):
    id: UUID
    agent_code: str
    task_type: str
    model_used: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    status: str
    eval_score: float | None
    wake_reason: str
    created_at: datetime

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None
    error: ErrorDetail | None
```

**Lưu ý bắt buộc:** `ContentItemOut` không được có field `eval_score`/`caption_score`/
`visual_score` — đúng AC-WF-14 gốc PRD ("Client per-item approval view không hiển thị
evaluator score summary"). Bản v1 không nói rõ điều này trong schema, dễ bug lộ điểm cho client.

---

## 8. Acceptance Criteria

| ID | Tiêu chí | Phương pháp kiểm tra |
|---|---|---|
| AC-0009a-01 | Approve item ở state `pending_content_approval` → state chuyển `approved_ready_to_post`, `hitl_reviews` có row `action='approved'`, `reviewer_id` = UUID thật của user đăng nhập (không phải `client_id`) | Integration test / DB query |
| AC-0009a-02 | Reject item → state chuyển `rejected` (không phải `eval_failed`), `eval_retry_count` **không đổi** | Integration test / DB query |
| AC-0009a-03 | Mark posted → state `posted`, `posted_at` có giá trị | Integration test / DB query |
| AC-0009a-04 | Approve kèm `edited_caption` → `agent_memory` của D01 có record mới với `human_feedback` chứa caption đã sửa | Integration test / DB query |
| AC-0009a-05 | Reject với `reject_reason='wrong_asset'` → `agent_memory` của **D02** (không phải D01) nhận feedback | Integration test / DB query |
| AC-0009a-06 | Gọi approve 2 lần với cùng `idempotency_key` → chỉ 1 side-effect xảy ra, lần 2 trả lại response đã cache | Integration test |
| AC-0009a-07 | Gọi approve với JWT của client A cho item thuộc client B → `403`, không update DB | Integration test — xác nhận cross-tenant chặn đúng |
| AC-0009a-08 | Response `ContentItemOut` không chứa bất kỳ field điểm số nào — verify qua network inspector / schema test | Automated schema test |
| AC-0009a-09 | Approve/reject item không ở đúng state kỳ vọng (vd item đã `posted` mà gọi approve lại) → `409 conflict_invalid_state`, không đổi DB | Integration test |
| AC-0009a-10 | Task Logs hiển thị đúng record của client hiện tại, không lẫn client khác | UI check + DB query |

---

## 9. Kế hoạch triển khai

1. Tạo `docs/decisions/000X-mvp-auth-tradeoff.md` nếu quyết định tạm hoãn Supabase Auth thật
   (xem §2.1) — bắt buộc làm trước khi code nếu chọn hướng đơn giản hoá.
2. Backend: JWT verify middleware → `portal_router.py` (4 endpoints §3.1) → `schemas.py` →
   `p01_lite.py` service.
3. Frontend: `portal/lib/api.ts` (HTTP client, tự đính kèm `Authorization` header) →
   `portal/lib/store.tsx` wiring (pessimistic update — chờ response rồi mới update UI).
4. `portal/.env.local`: thêm `NEXT_PUBLIC_API_URL=http://localhost:8000`.
5. `pytest` cho toàn bộ AC ở §8 + `npm run lint`.

---

## 10. Ngoài phạm vi (nhắc lại)

- Gate S2/S3 → Spec 0009b
- Settings CRUD → Spec 0009c
- Asset request submit → Spec 0009d
- Supabase Realtime — deferred, chưa cần cho MVP 1 client nội bộ
