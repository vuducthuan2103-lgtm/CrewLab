# Kế Hoạch Triển Khai (Plan) — Spec 0006

**Phụ thuộc:** Spec 0001 (DB schema), Spec 0005 (A01 dispatcher). Cả hai đã hoàn thành.

---

## Trình tự build (thứ tự phụ thuộc, không bỏ qua)

### Phase A — Hạ tầng (cần xong trước khi viết bất kỳ agent nào)

**A1. DB Migration `0004_llm_config_and_schedule.py`**
- Tạo bảng `client_llm_configs`
- Thêm cột `posting_frequency` vào `brand_settings`
- Thêm cột `scheduled_date`, `scheduled_time` vào `content_items`
- Thêm model SQLAlchemy `ClientLLMConfig` → `backend/app/models/llm_config.py`
- Cập nhật `__init__.py` export

**A2. LLM Core Module — `backend/app/core/llm.py`**
- Cài đặt `litellm` (pip install)
- Viết `call_llm()` với mock mode (env `CREWLAB_LLM_MOCK=true`)
- Viết `LLMResponse` Pydantic model
- Logic đọc `client_llm_configs` per agent_code
- Auto-ghi `task_logs` sau mỗi lần gọi
- Test: unit test gọi call_llm mock → verify trả LLMResponse hợp lệ + task_logs được ghi

### Phase B — Agent B02

**B1. Schemas — `backend/app/agents/b02/schemas.py`**
- `PillarItem(name, description, weight, angles)`
- `B02Output(pillars: list[PillarItem])`
- Validator: tổng weight = 100, min 2 max 5 pillar, mỗi pillar ≥ 5%

**B2. Prompts — `backend/app/agents/b02/prompts.py`**
- `SYSTEM_PROMPT_B02`: Role của B02, format output JSON expected
- `build_b02_user_prompt(context_packet)`: Inject brand_voice, tone, target_audience, episodic_memory vào prompt

**B3. Executor — `backend/app/agents/b02/executor.py`**
- `execute_b02(session, client_id, cycle_id, context_packet) -> list[ContentPillar]`
- Gọi `call_llm()` → parse `B02Output` → validate → insert `content_pillars` → ghi `AgentMemory`

**B4. Test**
- Mock LLM response → verify DB insert đúng
- Verify validation reject output sai (tổng ≠ 100, <2 pillar, etc.)

### Phase C — Agent B03

**C1. Schemas — `backend/app/agents/b03/schemas.py`**
- `ContentPlanItem(topic, platform, pillar_name, scheduled_date, scheduled_time)`
- `B03Output(items: list[ContentPlanItem])`
- Validator: tổng items = tổng posting_frequency, platforms hợp lệ

**C2. Prompts — `backend/app/agents/b03/prompts.py`**
- `SYSTEM_PROMPT_B03`: Role của B03, business rules (tôn trọng posting_frequency)
- `build_b03_user_prompt(pillars, posting_frequency, platforms, context_packet)`

**C3. Executor — `backend/app/agents/b03/executor.py`**
- `execute_b03(session, client_id, cycle_id, context_packet) -> list[ContentItem]`
- Query `content_pillars` cho cycle → query `brand_settings.posting_frequency`
- Gọi `call_llm()` → parse `B03Output` → match pillar_name → insert `content_items` (status='planned') → ghi `AgentMemory`

**C4. Test**
- Mock LLM → verify đúng số items = posting_frequency
- Verify pillar phân bổ theo weight
- Verify scheduled_date nằm trong cycle range

### Phase D — Verification tổng hợp

- Chạy full flow mock: `beat_weekly` → A01 dispatch B02 → B02 tạo pillars → (giả lập approve S2) → A01 dispatch B03 → B03 tạo items
- Verify DB state: `content_pillars` có data, `content_items` status='planned'

---

## Ước lượng file thay đổi

| File | Hành động | Ghi chú |
|---|---|---|
| `backend/app/models/llm_config.py` | NEW | Model `ClientLLMConfig` |
| `backend/app/models/clients.py` | MODIFY | Thêm `posting_frequency` vào `BrandSetting` |
| `backend/app/models/content.py` | MODIFY | Thêm `scheduled_date`, `scheduled_time` vào `ContentItem` |
| `backend/app/models/__init__.py` | MODIFY | Export `ClientLLMConfig` |
| `backend/app/core/llm.py` | NEW | `call_llm()` + `LLMResponse` |
| `backend/app/core/db.py` | MODIFY | Thêm env vars cho LLM mock |
| `backend/alembic/versions/0004_...py` | NEW | Migration |
| `backend/app/agents/b02/` | NEW (4 files) | schemas, prompts, executor, __init__ |
| `backend/app/agents/b03/` | NEW (4 files) | schemas, prompts, executor, __init__ |
| `backend/tests/test_b02_b03.py` | NEW | Tests |
