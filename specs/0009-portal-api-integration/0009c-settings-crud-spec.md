# Spec 0009c — Settings CRUD API Wiring

**Ngày tạo:** 2026-08-01 | **Phiên bản:** v1
**Trạng thái:** Draft — chờ duyệt
**Phụ thuộc:** Spec 0009a (chung auth/response pattern)
**Nhánh git đề xuất:** `feature/0009c-settings-crud`

> Tách khỏi Spec 0009 gốc (`PATCH /settings/*`) vì đây là 3 sub-domain khác nhau
> (brand voice, model/budget per agent, schedule) — mỗi cái có validate rule riêng,
> gộp vào 1 wildcard endpoint dễ thành chỗ khó test và khó review.

---

## 1. Bối cảnh và Mục tiêu

Wiring màn hình Settings (PRD §7.5.3.7) cho phép Trường/Thuận tự sửa cấu hình Bardinh Coffee
qua form, có hiệu lực ngay từ task tiếp theo — không cần deploy lại (đúng nguyên tắc B2.1/B6.1
trong PRD).

---

## 2. Quyết định kế thừa từ Spec 0009a

- Auth: JWT thật.
- Response envelope chuẩn.
- Idempotency cho mọi PATCH.

---

## 3. Phạm vi Triển khai

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/portal/settings/brand-voice` | PATCH | Cập nhật tone, avoid_phrases, example_captions... (PRD B2) |
| `/api/v1/portal/settings/agent-config` | PATCH | Model/provider/budget per agent (PRD B5) — chỉ trong phạm vi 6 agent MVP |
| `/api/v1/portal/settings/schedule` | PATCH | weekly_cycle_day/time, per-agent schedule override (PRD B6) |
| `/api/v1/portal/settings` | GET | Lấy toàn bộ config hiện tại (3 nhóm trên) cho form load ban đầu |

**Không tách riêng endpoint GET cho từng nhóm** — 1 GET trả cả 3 nhóm vì UI hiện gộp chung màn
"Configuration" (PRD B6.1: "Cùng màn hình Configuration này, client cũng quản lý luôn brand
voice, content frequency, model/budget per agent — gộp chung thành một khu vực Agent Settings").

---

## 4. Chi tiết Business Logic

### 4.1. Brand Voice — `PATCH /settings/brand-voice`

**Request:**
```json
{
  "tone": "warm, friendly, approachable",
  "personality_keywords": ["gần gũi", "chân thực", "trẻ trung"],
  "writing_style": "conversational",
  "avoid_phrases": ["siêu phẩm", "đỉnh của chóp"],
  "brand_colors": { "primary": "#3B2F2F", "secondary": "#F5E6C8" },
  "idempotency_key": "uuid"
}
```

**Logic:**
1. Validate `writing_style` thuộc enum `conversational | professional | playful`.
2. Ghi version mới vào `client_config` (versioned, append-only theo C1) — **không** UPDATE
   record cũ, tạo record mới với timestamp, giống pattern `brand_settings`.
3. `example_approved_captions` **không sửa qua endpoint này** — field này tự động cập nhật bởi
   P01 pipeline sau mỗi lần approve (PRD B2.1 ghi chú), client chỉ chọn giữ/bỏ caption nào làm
   mẫu qua 1 action riêng (`PATCH /settings/brand-voice/example-captions`) — để version sau nếu
   cần, chưa bắt buộc cho MVP.
4. Trả config mới, có hiệu lực từ task tiếp theo (không cache version cũ ở agent side — agent
   luôn gọi `build_context_packet_mvp()` lấy bản mới nhất, theo đúng thiết kế MVP-Scope §1b).

### 4.2. Agent Config — `PATCH /settings/agent-config`

**Request:**
```json
{
  "agent_code": "D01",
  "provider": "openai",
  "model": "gpt-5.4",
  "budget_usd_month": 25,
  "idempotency_key": "uuid"
}
```

**⚠️ Ràng buộc quan trọng chưa có trong bản v1 gốc:** `agent_code` chỉ được thuộc 6 agent MVP
(`A01, B02, B03, D01, D02, E01`) — không cho set config cho B01/F01/G01-G04 vì các agent này
chưa build ở MVP (MVP-Scope §1: "Vẫn bỏ hoàn toàn... B01 IMC Planner, F01 Meta Publisher,
G01-G04 Analytics"). Validate fail → `422 validation_agent_not_in_mvp_scope`.

**Logic:**
1. Validate `agent_code` thuộc whitelist 6 agent MVP.
2. Validate `provider`/`model` thuộc danh sách hỗ trợ (PRD §7.4.1.3.1 — bảng model text).
3. Update `client_config.llm_config.per_agent[agent_code]`.
4. Trả config mới — **NFR-T3-03: có hiệu lực trong ≤ 5 phút**, không cần real-time tức thì
   (agent đọc config mới nhất ở đầu mỗi task, không cache).

### 4.3. Schedule — `PATCH /settings/schedule`

**Request:**
```json
{
  "weekly_cycle_day": "monday",
  "weekly_cycle_time": "08:00",
  "per_agent_schedule": {
    "A01": { "run_time": "07:00" }
  },
  "idempotency_key": "uuid"
}
```

**Logic:** tương tự — update `client_config.schedule_config`, validate `weekly_cycle_day`
thuộc enum thứ trong tuần, `run_time` format `HH:MM`.

**Lưu ý MVP:** `analytics_delay_days` **không có trong scope này** vì MVP không có G01
(analytics chưa build) — field này để nguyên default, không expose ra form cho tới Phase 4.

---

## 5. Pydantic Schemas

```python
class BrandVoiceUpdate(BaseModel):
    tone: str
    personality_keywords: list[str]
    writing_style: Literal["conversational", "professional", "playful"]
    avoid_phrases: list[str]
    brand_colors: dict[str, str] | None = None
    idempotency_key: str

MVP_AGENT_CODES = {"A01", "B02", "B03", "D01", "D02", "E01"}

class AgentConfigUpdate(BaseModel):
    agent_code: str
    provider: Literal["anthropic", "openai", "google", "deepseek"]
    model: str
    budget_usd_month: float = Field(gt=0)
    idempotency_key: str

    @field_validator("agent_code")
    def validate_mvp_scope(cls, v):
        if v not in MVP_AGENT_CODES:
            raise ValueError(f"{v} not in MVP agent scope: {MVP_AGENT_CODES}")
        return v

class ScheduleUpdate(BaseModel):
    weekly_cycle_day: Literal["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
    weekly_cycle_time: str  # HH:MM
    per_agent_schedule: dict[str, dict] | None = None
    idempotency_key: str
```

---

## 6. Acceptance Criteria

| ID | Tiêu chí | Phương pháp kiểm tra |
|---|---|---|
| AC-0009c-01 | PATCH brand-voice → tạo version config mới, record cũ vẫn còn (append-only), `is_current=true` chỉ ở record mới | Integration test / DB query |
| AC-0009c-02 | PATCH agent-config với `agent_code="G04"` (ngoài MVP scope) → `422`, không update DB | Integration test |
| AC-0009c-03 | PATCH agent-config với `agent_code="D01"` hợp lệ → task D01 tiếp theo dùng đúng model mới trong ≤ 5 phút (verify qua task_logs `model_used`) | Integration test có delay hoặc mock time |
| AC-0009c-04 | PATCH schedule với `weekly_cycle_day` sai enum → `422` | Integration test |
| AC-0009c-05 | GET settings trả đủ 3 nhóm (brand-voice, agent-config, schedule) trong 1 response | Integration test |
| AC-0009c-06 | Client A đổi model D01 → client B (nếu có, N/A cho pilot 1-client nhưng test vẫn viết để chuẩn bị Phase 6) không bị ảnh hưởng | Integration test (RLS isolation) |

---

## 7. Kế hoạch triển khai

1. Backend: 3 PATCH + 1 GET trong `portal_router.py`, schemas với validate rule ở §5.
2. Frontend: `portal/lib/api.ts` bổ sung 4 hàm tương ứng.
3. Settings screen (PRD §7.5.3.7, các tab Model & Ngân sách / Lịch đăng bài / Brand Voice)
   wiring, bỏ mock, gọi API thật.
4. `pytest` + `npm run lint`.

## 8. Ngoài phạm vi

- Tab "Thư viện ảnh" (Media Library CRUD) — asset đã tách sang Spec 0009d
- Tab "Tích hợp" (Telegram pairing, Meta connection status) — Post-MVP theo Roadmap Phase 3/6
- `example_approved_captions` self-edit qua form — để version sau
