# Spec 0006 — LLM Core + B02 Content Pillar + B03 Content Plan

**Ngày tạo:** 2026-08-01 | **Trạng thái:** Draft

> **Scope note (2026-08-03):** Các giả định về API key chung qua biến môi trường trong spec này đã được thay thế bởi Decision 0007 và Spec 0010. Các yêu cầu B02/B03 khác vẫn giữ nguyên; việc quản lý provider/credential theo từng client sẽ được triển khai theo Spec 0010.

---

## 0. Tóm tắt thay đổi so với bản spec cũ

Bản spec cũ (0006 ngày 27/07) có 4 lỗ hổng nghiêm trọng được phát hiện khi review:

| # | Gap | Hệ quả nếu không sửa | Giải pháp |
|---|-----|----------------------|-----------|
| 1 | **Không có LLM abstraction** — plan cũ gọi thẳng SDK 1 hãng | Mỗi agent hardcode 1 provider, không thể đổi model per-agent per-client theo PRD B5 | Dùng `litellm` qua hàm `call_llm()` duy nhất (Decision 0004) |
| 2 | **`hitl_reviews.content_item_id` NOT NULL** — S2/S3 Gate approve Pillar Set và Content Plan, KHÔNG phải 1 content item | Không ghi lại được hành vi Approve S2/S3 — bể luồng HITL | Mở `content_item_id` thành nullable, thêm `gate_type` enum + `target_id` |
| 3 | **`brand_settings` thiếu `posting_frequency`/`platforms`** — B03 cần biết tạo bao nhiêu bài, nền tảng nào | B03 bịa số lượng N bài ("3-5"), không đọc config nào | Thêm `posting_frequency` (JSONB) vào `brand_settings` |
| 4 | **A01 Orchestrator không gọi LLM** — PRD mục 1a dòng 100 ghi rõ "LLM Calls: dùng tier Power" | A01 hiện chỉ là if/else rule engine, không có khả năng reasoning | A01 cũng gọi `call_llm()` — nhưng scope cụ thể dời sang spec riêng (0007) |

**Gap #4 ghi nhận nhưng KHÔNG build trong spec này.** A01 dispatcher hiện tại đang hoạt động đúng logic rule-based cho MVP. Việc thêm LLM reasoning cho A01 (vd: quyết định retry routing phức tạp hơn, tóm tắt context khi escalate) sẽ là spec riêng (0007) sau khi 5 content agent đã chạy — vì A01 cần có output thật từ B02-E01 để có gì mà reasoning. Tuy nhiên, interface `call_llm(client_id, agent_code="A01", ...)` phải sẵn sàng ngay từ spec này.

---

## 1. Phạm vi (Scope)

Spec này build 3 thành phần theo thứ tự phụ thuộc:

```
1a. LLM Core Module          ← tất cả agent phụ thuộc
1b. DB Migration (3 thay đổi) ← B02/B03 + HITL phụ thuộc
1c. Agent B02 — Content Pillar
1d. Agent B03 — Content Plan
```

---

## 1a. LLM Core Module — `backend/app/core/llm.py`

### Mục tiêu

Một hàm `call_llm()` duy nhất mà tất cả 6 agent đều gọi qua. Không agent nào import trực tiếp SDK của bất kỳ hãng LLM nào.

### Interface

```python
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, Type

class LLMResponse(BaseModel):
    content: str                      # Raw text response
    model_used: str                   # Tên model thật đã dùng (vd "gpt-4o")
    tokens_in: int
    tokens_out: int
    latency_ms: int
    provider: str                     # "openai", "anthropic", "google", etc.

async def call_llm(
    client_id: UUID,
    agent_code: str,                  # "A01", "B02", "B03", "D01", "D02", "E01"
    messages: list[dict],             # [{"role": "system", "content": "..."}, ...]
    response_format: Optional[Type[BaseModel]] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> LLMResponse:
    ...
```

### Cấu hình per-agent

Đọc từ bảng `client_llm_configs` (xem mục 1b migration):

```
client_llm_configs:
  client_id    UUID FK → clients.id
  agent_code   VARCHAR  (A01, B02, B03, D01, D02, E01)
  provider     VARCHAR  (openai, anthropic, google)
  model        VARCHAR  (gpt-4o, claude-sonnet-4-20250514, gemini-2.5-flash)
  tier         VARCHAR  (fast, standard, power)
  budget_usd   DECIMAL  (budget cap per agent per month — nullable)
  is_active    BOOLEAN  DEFAULT true
```

**Không có cột `api_key_ref`.** API key lấy theo provider qua env var cố định:

```python
PROVIDER_ENV_MAP = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
}
```

Lý do: nếu vừa có `provider` vừa có `api_key_ref` free-text, 2 nguồn có thể lệch (vd provider="anthropic" nhưng key ref trỏ sang OpenAI). Map cứng theo provider loại bỏ khả năng lệch. Xem thêm AGENTS.md phần "API key management (Phase 1)".

### Hành vi mock (Phase đầu)

Khi `CREWLAB_LLM_MOCK=true` (env var), `call_llm()` trả về response giả lập (hardcoded JSON) thay vì gọi litellm thật. Cho phép test toàn bộ luồng DB/FSM mà không cần API key.

### Ghi log Observability

Sau mỗi lần gọi, `call_llm()` tự ghi 1 record vào bảng `task_logs` (mục 1d MVP Scope) với `model_used`, `tokens_in`, `tokens_out`, `latency_ms`. Agent không cần tự ghi — giảm boilerplate.

---

## 1b. DB Migration — 3 thay đổi

### Thay đổi 1: Bảng mới `client_llm_configs`

```sql
CREATE TABLE client_llm_configs (
    -- Không có cột api_key_ref — key lấy theo provider qua PROVIDER_ENV_MAP
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    agent_code  VARCHAR NOT NULL,
    provider    VARCHAR NOT NULL DEFAULT 'openai',
    model       VARCHAR NOT NULL DEFAULT 'gpt-4o',
    tier        VARCHAR NOT NULL DEFAULT 'standard',
    budget_usd  DECIMAL(10,2),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_id, agent_code)
);
```

### Thay đổi 2: Thêm `posting_frequency` vào `brand_settings`

```sql
ALTER TABLE brand_settings
ADD COLUMN posting_frequency JSONB DEFAULT '{"facebook": 3, "instagram": 2}'::jsonb;
```

**Business rule cho B03:** "Content Plan phải tôn trọng đúng posting_frequency — không tạo thêm hoặc bớt bài tự ý" (PRD C4). Giá trị `posting_frequency` = số bài/tuần per platform. B03 đọc field này để xác định chính xác bao nhiêu `ContentItem` cần tạo, KHÔNG bịa con số.

Lưu ý: `platforms` đã có sẵn trong `clients.platforms` (JSONB, line 19 của `clients.py`). `posting_frequency` bổ sung chi tiết số bài per platform, đặt ở `brand_settings` vì nó thuộc về cấu hình nội dung (client tự đổi qua Portal Settings).

### Thay đổi 3: `hitl_reviews` — mở rộng cho Gate S2/S3

`hitl_reviews` hiện tại **đã có** `gate_type`, `target_id`, và `content_item_id` nullable (kiểm tra line 13-15 của `reviews.py`). **Không cần migration.**

Tuy nhiên, cần bổ sung enum cho `gate_type`:
- `s2_pillar` — Approve/Reject bộ Content Pillar (target_id = workflow_cycles.id)
- `s3_plan` — Approve/Reject Content Plan tuần (target_id = workflow_cycles.id)
- `content_approval` — Approve/Reject 1 content item (target_id = content_items.id, content_item_id cũng trỏ tới item)

Enum này enforce ở application layer (Pydantic), không cần CHECK constraint trong DB.

---

## 1c. Agent B02 — Content Pillar

### Vai trò (PRD mục 1, bảng agent)

Tự sáng tạo trụ nội dung (Content Pillar) mỗi tuần. Mode B duy nhất (không có B01 IMC/Campaign trong MVP).

### Trigger

A01 dispatch khi event `beat_weekly` (xem mục 1a MVP Scope, trigger #1).

### Input

```python
# Payload trong DispatchInstruction
{
    "client_id": "...",
    "cycle_id": "...",
    "wake_reason": "scheduled",
    "context_packet": {
        "brand_settings": { ... },   # brand_voice_short, tone, target_audience, etc.
        "episodic_memory": [ ... ]   # human_feedback từ cycle trước
    }
}
```

### LLM Call

```python
messages = [
    {"role": "system", "content": SYSTEM_PROMPT_B02},
    {"role": "user", "content": build_b02_user_prompt(context_packet)}
]
response = await call_llm(
    client_id=client_id,
    agent_code="B02",
    messages=messages,
    response_format=B02Output   # structured output
)
```

### Output Schema (Pydantic)

```python
class PillarItem(BaseModel):
    name: str                 # VD: "Product Spotlight"
    description: str          # Mô tả ngắn pillar
    weight: int               # Phần trăm (tổng = 100%)
    angles: list[str]         # Góc khai thác (xem PRD §2c — Tab Pillar & Angle)

class B02Output(BaseModel):
    pillars: list[PillarItem]  # 2-5 pillar (PRD Validation rules: min 2, max 5, mỗi cái ≥5%)
```

### Validation rules (PRD §2c, Tab Pillar & Angle)

- Tổng weight = 100%
- Mỗi pillar tối thiểu 5%
- Tối thiểu 2 — tối đa 5 pillar

### Database Write

Sau khi LLM trả kết quả hợp lệ:
1. Insert N record vào bảng `content_pillars` (link `client_id`, `cycle_id`)
2. Ghi `AgentMemory` (retain — T03): input_summary = brand context tóm tắt, output_summary = tên các pillar

### State / Trigger tiếp theo

B02 KHÔNG update state của `ContentItem` (chưa có item nào tại bước này). Thay vào đó:
- B02 hoàn thành → **DỪNG ở trạng thái `pending_s2_review`**, chờ client bấm "Xác nhận ✓" trên Portal (PRD §7.3.5 Gate Family 1 — mọi weekly cycle đều phải approve, không có case tự động skip).
- **Gate S2 behavior trong MVP:** Task loại Người (Gate S2) nằm ở cột "Review" trên Kanban (PRD §2b). Client approve → ghi `hitl_reviews(gate_type='s2_pillar', target_id=cycle_id)` → fire trigger `strategy_gate_approved(S2)` → A01 dispatch B03.
- Hàm `approve_gate(cycle_id, gate_type, reviewer_id)` cần tồn tại ở service layer để cả Portal API lẫn test đều dùng được.

### Model Tier

Standard (hoặc Power tuỳ ngân sách — PRD line 195).

---

## 1d. Agent B03 — Content Plan

### Vai trò (PRD mục 1, bảng agent)

Lên lịch đăng cụ thể dựa trên Pillar đã duyệt.

### Trigger

A01 dispatch khi event `strategy_gate_approved(S2)` — tức sau khi client approve Pillar.

### Input

```python
{
    "client_id": "...",
    "cycle_id": "...",
    "wake_reason": "task_assigned",
    "context_packet": { ... }
}
```

B03 sẽ:
1. Query `content_pillars` WHERE `cycle_id` = cycle hiện tại → lấy danh sách Pillar đã duyệt
2. Query `brand_settings.posting_frequency` → lấy số bài/tuần per platform
3. Query `clients.platforms` → lấy danh sách nền tảng active

### LLM Call

```python
messages = [
    {"role": "system", "content": SYSTEM_PROMPT_B03},
    {"role": "user", "content": build_b03_user_prompt(
        pillars=pillars,
        posting_frequency=posting_freq,
        platforms=platforms,
        context_packet=context_packet
    )}
]
response = await call_llm(
    client_id=client_id,
    agent_code="B03",
    messages=messages,
    response_format=B03Output
)
```

### Output Schema (Pydantic)

```python
class ContentPlanItem(BaseModel):
    topic: str              # Chủ đề bài viết
    platform: str           # "facebook" hoặc "instagram"
    pillar_name: str        # Tên pillar gốc (để link FK)
    scheduled_date: str     # ISO date (YYYY-MM-DD) — ngày dự kiến đăng
    scheduled_time: str     # HH:MM — giờ dự kiến (theo timezone client)

class B03Output(BaseModel):
    items: list[ContentPlanItem]
```

### Business Rules (PRD §C4, §2c Tab Content Plan Calendar)

1. **Tổng số item = tổng `posting_frequency` across platforms.** VD: `{"facebook": 3, "instagram": 2}` → B03 phải tạo chính xác 5 item (3 FB + 2 IG). Không bịa thêm, không bớt.
2. Mỗi item phải gắn đúng 1 pillar. Phân bổ item theo weight (vd pillar 40% → 2/5 bài).
3. Ngày đăng phải nằm trong khoảng `start_date` — `end_date` của cycle.
4. Giờ đăng mặc định = `clients.schedule_time`, có thể vary theo platform.

### Database Write

Sau khi LLM trả kết quả:
1. Match `pillar_name` → `content_pillars.id` (FK)
2. Insert N record vào bảng `content_items` với `status='planned'`, `client_id`, `cycle_id`, `pillar_id`, `topic`, `platform`
3. Bổ sung field `scheduled_date` / `scheduled_time` vào content_items nếu chưa có (cần check — hiện tại model content_items không có field lịch đăng)
4. Ghi `AgentMemory` (retain)

### Content Items — field thiếu

Hiện tại `ContentItem` model KHÔNG có field lịch đăng (`scheduled_date`, `scheduled_time`). Cần bổ sung trong migration:

```sql
ALTER TABLE content_items
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time VARCHAR(5);  -- "HH:MM" format
```

### State / Trigger tiếp theo

B03 tạo xong items → fire trigger `strategy_gate_approved(S3)` → client approve Content Plan qua Portal (Gate S3 — nút "Duyệt tất cả tuần" trên Calendar, PRD §2c) → A01 dispatch D01 × N items.

### Model Tier

Standard.

---

## 2. Cấu trúc File

```
backend/
├── app/
│   ├── core/
│   │   ├── db.py              # [MODIFY] thêm LLM env vars
│   │   └── llm.py             # [NEW] call_llm() + LLMResponse
│   ├── models/
│   │   ├── clients.py         # [MODIFY] thêm posting_frequency vào BrandSetting
│   │   ├── content.py         # [MODIFY] thêm scheduled_date/time vào ContentItem
│   │   ├── llm_config.py      # [NEW] ClientLLMConfig model
│   │   └── __init__.py        # [MODIFY] export ClientLLMConfig
│   ├── agents/
│   │   ├── b02/
│   │   │   ├── __init__.py    # [NEW]
│   │   │   ├── schemas.py     # [NEW] PillarItem, B02Output
│   │   │   ├── prompts.py     # [NEW] SYSTEM_PROMPT_B02, build_b02_user_prompt()
│   │   │   └── executor.py    # [NEW] execute_b02()
│   │   └── b03/
│   │       ├── __init__.py    # [NEW]
│   │       ├── schemas.py     # [NEW] ContentPlanItem, B03Output
│   │       ├── prompts.py     # [NEW] SYSTEM_PROMPT_B03, build_b03_user_prompt()
│   │       └── executor.py    # [NEW] execute_b03()
│   └── ...
├── alembic/versions/
│   └── 0004_llm_config_and_schedule.py  # [NEW] migration cho 3 thay đổi DB
└── ...
```

---

## 3. Acceptance Criteria

| ID | Tiêu Chí | Verify |
|---|---|---|
| AC-LLM-01 | `call_llm()` tồn tại, mock mode trả response hợp lệ khi `CREWLAB_LLM_MOCK=true` | Unit test |
| AC-LLM-02 | `call_llm()` đọc `client_llm_configs` để xác định provider/model per agent | Unit test |
| AC-LLM-03 | Gọi `call_llm()` tự động ghi `task_logs` | Unit test |
| AC-B02-01 | `execute_b02()` gọi `call_llm()` với đúng `agent_code="B02"` và parse output thành `B02Output` | Unit test |
| AC-B02-02 | B02 output được validate: 2-5 pillar, tổng weight = 100%, mỗi pillar ≥ 5% | Unit test |
| AC-B02-03 | B02 ghi thành công `content_pillars` vào DB | Integration test (mock LLM) |
| AC-B03-01 | B03 đọc `posting_frequency` từ `brand_settings` để xác định số bài | Unit test |
| AC-B03-02 | B03 output tạo đúng số `ContentItem` = tổng posting_frequency | Unit test |
| AC-B03-03 | B03 ghi thành công `content_items` với `status='planned'` và `scheduled_date/time` | Integration test |
| AC-B03-04 | B03 phân bổ items theo pillar weight (sai lệch ≤1 item do làm tròn) | Unit test |
| AC-DB-01 | Migration `0004` chạy thành công: tạo bảng `client_llm_configs`, thêm cột `posting_frequency`, thêm cột `scheduled_date/time` | Migration script |

---

## 4. Ngoài scope spec này (ghi nhận để không quên)

| Item | Spec dự kiến |
|---|---|
| A01 LLM reasoning (tier Power) | 0007 — sau khi 5 content agent có output thật |
| D01 Caption Writer | 0008 |
| D02 Image Design | 0009 |
| E01 Evaluator | 0010 |
| Portal UI cho Gate S2/S3 (Tab Pillar & Angle, Content Plan Calendar) | 0011 |
