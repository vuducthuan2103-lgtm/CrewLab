# Spec 0009b — Strategy Gates S2/S3 API Wiring

**Ngày tạo:** 2026-08-01 | **Phiên bản:** v1
**Trạng thái:** Draft — chờ duyệt
**Phụ thuộc:** Spec 0009a (Content Approval Gate 2 — chung auth/response pattern)
**Nhánh git đề xuất:** `feature/0009b-strategy-gates`

> Tách khỏi Spec 0009 gốc vì đây là 2 gate khác hẳn về bản chất: S2/S3 duyệt **kế hoạch**
> (pillar weight, content plan), không phải duyệt **từng bài viết** như Gate 2. Validate rule
> của S2 (tổng % = 100, min/max pillar) đủ phức tạp để xứng đáng 1 nhánh riêng.

---

## 1. Bối cảnh và Mục tiêu

Wiring 2 Strategy Gate còn lại của MVP (S1 — IMC Plan — không có trong MVP vì không build B01):

- **S2 — Content Pillar Co-pilot**: xác nhận tỷ lệ/danh sách pillar do B02 tự sáng tạo mỗi cycle.
- **S3 — Content Plan Approval**: duyệt kế hoạch tuần (danh sách content item) trước khi
  A01 dispatch D01 cho từng item.

---

## 2. Quyết định kế thừa từ Spec 0009a

- Auth: JWT thật, `client_id`/`user_id` từ claims (xem 0009a §2.1).
- Response envelope: `{success, data, error}` chuẩn PRD.
- Idempotency: bắt buộc cho cả 2 endpoint có side-effect ở đây.

---

## 3. Phạm vi Triển khai

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/portal/pillars/{pillar_doc_id}/confirm` | POST | Xác nhận Pillar Document (Gate S2) |
| `/api/v1/portal/cycles/{cycle_id}/approve-week` | POST | Duyệt Content Plan cả tuần (Gate S3) |

---

## 4. Chi tiết Business Logic

### 4.1. Confirm Pillars — `POST /pillars/{pillar_doc_id}/confirm`

**Request:**
```json
{
  "pillars": [
    { "id": "pillar_product", "weight": 40, "name": "Món & Đồ uống" },
    { "id": "pillar_story", "weight": 30, "name": "Câu chuyện quán" },
    { "id": "pillar_lifestyle", "weight": 30, "name": "Lifestyle & Community" }
  ],
  "idempotency_key": "uuid"
}
```

**Validate rules (đúng theo PRD §7.5.3.3 Tab 2 — bản v1 của spec gốc chưa có mục nào nói tới):**

1. Tổng `weight` của toàn bộ pillars phải = 100. Sai → `422 validation_weight_sum`.
2. Mỗi pillar `weight >= 5`. Sai → `422 validation_weight_min`.
3. Số lượng pillar: tối thiểu 2, tối đa 5. Sai → `422 validation_pillar_count`.
4. Không cho thêm pillar ngoài danh sách đã được B02 đề xuất trong `planning_artifact` gốc —
   client chỉ được sửa weight/tắt/đổi angle, không tự bịa pillar id mới không có trong draft.
   Nếu client muốn thêm pillar mới, đó là 1 action riêng (`edit`, không phải `confirm`) — ngoài
   scope MVP wiring này, để nguyên form đơn giản trước.

**Logic:**
1. Verify `planning_artifact` (type=`pillar_doc`) đang ở `pending_s2_review`.
2. Validate theo 4 rule trên.
3. Tạo version mới của `planning_artifact` (append-only, versioned — theo C1 quy định), set
   `status='approved'`.
4. Ghi audit log.
5. Trả `next_agent: "B03"` — **không tự dispatch A01 event trong response** (backend tự bắn
   event nội bộ tới A01, frontend không cần biết chi tiết dispatch).

### 4.2. Approve Week — `POST /cycles/{cycle_id}/approve-week`

**Request:**
```json
{
  "content_plan_id": "uuid",
  "idempotency_key": "uuid"
}
```

**Logic:**
1. Verify `content_plan` (planning_artifact) đang ở `pending_s3_review`.
2. Set `status='approved'`, ghi version mới.
3. Với **mỗi** content item thuộc plan này: chuyển state `planned` → `ready_for_generation`.
4. A01 nhận trigger `strategy_gate_approved` (S3) → dispatch D01 × N item (theo MVP-Scope §1a
   bảng trigger) — backend tự bắn event, không nằm trong response body.
5. Trả `data: { items_transitioned: N, next_agent: "D01" }`.

**⚠️ Lưu ý FSM quan trọng chưa nói rõ ở bản gốc:** action "Từ chối tất cả" (reject toàn bộ plan)
**không nằm trong scope endpoint này** — PRD §7.5.3.3 mô tả nó cần modal nhập lý do tự do +
alert Agency Admin riêng, khác hẳn flow reject 1 item ở Gate 2. Nếu cần, làm thành endpoint
riêng `POST /cycles/{cycle_id}/reject-week` ở version sau, không gộp chung logic với approve.

---

## 5. Pydantic Schemas

```python
class PillarItem(BaseModel):
    id: str
    name: str
    weight: int = Field(ge=5, le=100)

class ConfirmPillarsRequest(BaseModel):
    pillars: list[PillarItem]
    idempotency_key: str

    @field_validator("pillars")
    def validate_weight_sum_and_count(cls, v):
        if not (2 <= len(v) <= 5):
            raise ValueError("pillar count must be between 2 and 5")
        if sum(p.weight for p in v) != 100:
            raise ValueError("total weight must equal 100")
        return v

class ApproveWeekRequest(BaseModel):
    content_plan_id: UUID
    idempotency_key: str
```

---

## 6. Acceptance Criteria

| ID | Tiêu chí | Phương pháp kiểm tra |
|---|---|---|
| AC-0009b-01 | Confirm pillars với tổng weight ≠ 100 → `422`, `planning_artifact` không đổi status | Integration test |
| AC-0009b-02 | Confirm pillars hợp lệ (tổng = 100, 2-5 pillar, mỗi pillar ≥5%) → version mới được tạo, status = `approved` | Integration test / DB query |
| AC-0009b-03 | Confirm pillars có 1 pillar id không nằm trong draft gốc của B02 → `422 validation_unknown_pillar` | Integration test |
| AC-0009b-04 | Approve week → toàn bộ content item thuộc plan chuyển từ `planned` sang `ready_for_generation`; item không thuộc plan này không bị ảnh hưởng | Integration test / DB query |
| AC-0009b-05 | Approve week khi `content_plan` không ở `pending_s3_review` (vd đã approved rồi) → `409`, không tạo duplicate dispatch | Integration test |
| AC-0009b-06 | Gọi confirm/approve-week 2 lần cùng idempotency_key → chỉ 1 lần side-effect | Integration test |

---

## 7. Kế hoạch triển khai

1. Backend: 2 endpoint trong `portal_router.py` (cùng file với 0009a, khác prefix path) + schema.
2. Frontend: `portal/lib/api.ts` bổ sung `confirmPillars()`, `approveWeek()`.
3. Content Hub Tab 2 (Pillar & Angle) và Tab 3 (Content Plan → nút "Duyệt tất cả tuần") wiring
   theo đúng UI đã có ở Spec 0003, chỉ thay mock action bằng API call thật.
4. `pytest` + `npm run lint`.

## 8. Ngoài phạm vi

- Reject-week (từ chối cả kế hoạch tuần) — để version sau
- S1 (IMC Plan) — không có trong MVP scope (không build B01)
- Edit pillar draft trước khi confirm (thêm/xóa pillar id mới) — giữ nguyên UI hiện có, chưa cần API riêng ở bản này
