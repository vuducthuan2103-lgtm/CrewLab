# Spec 0008 — Agent E01 (Evaluator) + Retry Loop + check_asset_request_expiry

**Ngày tạo:** 2026-08-01 | **Phiên bản:** v2 (sau review 3 vấn đề chặn)  
**Trạng thái:** Approved — sẵn sàng implement  
**Phụ thuộc:** Spec 0007 (D01 + D02) — phải hoàn thành trước  
**ADR liên quan:** `docs/decisions/0005-e01-criteria-vocabulary.md`

---

## Changelog v1 → v2

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | 🔴 Bug | `eval_retry_count >= 3` để item treo ở `eval_failed` — sai FSM | Thêm transition → `rejected` (terminal) kèm `ContentItemStateLog` |
| 2 | 🔴 Launch Blocker | `_resolve_image_url` fallback None = E01 không chấm visual thật trong pilot | Implement thật dùng `supabase_client.storage.create_signed_url()` |
| 3 | 🟡 Vocab Mismatch | Criteria tên mới (tone, cta_quality...) không khớp MVP-Scope §1a routing table | Dùng đúng 8 criterion gốc; ghi ADR-0005 |
| 4 | 🟡 Audit | Lịch sử attempt cần thứ tự ổn định | Sort bằng `created_at` |
| 5 | 🟡 Audit | `previous_state` sai khi Celery retry infra | E01 check `item.status == "evaluating"` → đọc state log gần nhất |

---

## 0. Bối cảnh và Phạm vi

Build 3 thành phần hoàn thiện Quality Gate:

```
D02 output → visual_generating
  → A01 dispatch E01
    → E01: chấm caption (text) + visual (multimodal — vision model)
      → overall_passed=True  → pending_content_approval
      → overall_passed=False → eval_failed → A01 check retry_count
        → retry_count < 3  → route D01 (text lỗi) hoặc D02 (visual lỗi)
        → retry_count >= 3 → transition → rejected (terminal) + TaskLog
```

**Không notify / push alert nào ở MVP.** Item ở `rejected` hiển thị trong Internal App filter theo state. Agency Admin xem lịch sử 3 lần qua `content_item_eval_attempts` và tự quyết định (xem §4 Ngoài scope spec này về manual restart).

---

## 1. Thành phần sẽ build

```
1a. Agent E01 — Evaluator (multimodal vision + đúng 8 criteria từ MVPScope §1a)
1b. DB — bảng content_item_eval_attempts (Migration 0006)
1c. check_asset_request_expiry — nâng cấp skeleton đã có
1d. Celery app config (NEW file)
1e. A01 Dispatcher nâng cấp — retry limit + rejected terminal
1f. Retry routing — align 8 criteria gốc
```

---

## 1a. Agent E01 — Evaluator

### Vai trò

Ban kiểm duyệt độc lập. Chấm **2 chiều độc lập**:
- **Caption score** (0.0–10.0, pass ≥ 7.0)
- **Visual score** (0.0–5.0, pass ≥ 3.5)

### Criteria chuẩn (theo ADR-0005 + MVP-Scope §1a)

**Caption — route về D01 khi fail:**

| Criterion | Ý nghĩa kiểm tra |
|---|---|
| `brand_voice` | Giọng điệu có khớp brand personality keywords, avoid_phrases không? |
| `content_accuracy` | Thông tin sản phẩm/giá/tên có đúng với brand_settings không? |
| `platform_fit` | Độ dài, hashtag count, emoji, format phù hợp platform (FB vs IG)? |
| `pillar_relevance` | Caption có bám sát pillar + image_brief gốc D01 không? |
| `originality` | Cấu trúc/hook không lặp so với episodic_memory 5 bài gần nhất? |

**Visual — route về D02 khi fail (bắt buộc có ảnh thật để kiểm tra):**

| Criterion | Ý nghĩa kiểm tra |
|---|---|
| `visual_asset_fit` | Ảnh khớp với nội dung caption + image_brief không? |
| `image_design_quality` | Ảnh rõ nét, ánh sáng tốt, không crop lỗi, watermark, text overlay xấu? |
| `mobile_readability` | Ảnh hiển thị rõ trên 5"? Text không bị mờ/che? |

### Trigger

A01 dispatch khi `d02_complete` → E01 nhận `content_item_id`.

### State Transitions (E01 sở hữu)

```
visual_generating → evaluating           (bắt đầu — commit sớm để dashboard thấy)
evaluating → pending_content_approval    (overall_passed=True → via eval_passed event)
evaluating → eval_failed                 (overall_passed=False, retry_count < 3)
evaluating → rejected                    (overall_passed=False, retry_count >= 3 → TERMINAL)
```

**Fix vấn đề nhỏ #2 — previous_state khi Celery retry:**  
Nếu `item.status == "evaluating"` khi E01 task bắt đầu (do Celery tự retry sau infra error), đọc `previous_state` từ `ContentItemStateLog` gần nhất có `new_state='evaluating'` thay vì dùng `item.status` trực tiếp.

### Input

```python
{
    "client_id": "...",
    "cycle_id": "...",
    "content_item_id": "...",
    "wake_reason": "task_assigned",
    "context_packet": {
        "identity": { "brand_voice_short": "...", "personality_keywords": [...], ... },
        "episodic": [ ... ]   # 5 bản ghi gần nhất — dùng để chấm originality
    }
}
```

E01 executor tự load từ DB:
- `content_items.caption`
- `content_items.image_url` → resolve signed URL
- `content_items.image_brief`
- `content_items.platform`

### LLM Call — Multimodal (bắt buộc Vision model)

```python
# 1. Resolve image URL thật (implement thật, không skip)
image_url = await _resolve_image_url(item.image_url)

# 2. Build multimodal message
user_message_content = []
if image_url:
    user_message_content.append({
        "type": "image_url",
        "image_url": {"url": image_url}
    })
# Dù không có ảnh, vẫn chấm caption — nhưng visual criteria = fail mặc định
user_message_content.append({
    "type": "text",
    "text": build_e01_user_prompt(
        caption=item.caption,
        image_brief=item.image_brief,
        brand_settings=identity,
        platform=item.platform,
        episodic_memory=episodic,
        has_image=image_url is not None,
    )
})

response = await call_llm(
    client_id=client_id,
    agent_code="E01",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT_E01},
        {"role": "user",   "content": user_message_content},
    ],
    session=session,
    response_format=E01Output,
    wake_reason=wake_reason,
    content_item_id=content_item_id,
)
```

### `_resolve_image_url()` — Implement thật (không để fallback None)

```python
async def _resolve_image_url(image_url: str | None) -> str | None:
    """Resolve image URL cho LLM vision call.
    
    - None → return None (E01 chỉ chấm caption)
    - https://... → return as-is (public URL)
    - /... hoặc path tương đối → lấy signed URL từ Supabase Storage (300s TTL)
    """
    if not image_url:
        return None
    if image_url.startswith("https://"):
        return image_url
    # Supabase storage path
    from app.services.storage import supabase_client, BRAND_ASSETS_BUCKET
    if not supabase_client:
        logger.warning("Supabase client unavailable — E01 cannot evaluate visual")
        return None
    try:
        res = supabase_client.storage.from_(BRAND_ASSETS_BUCKET).create_signed_url(
            image_url.lstrip("/"), expires_in=300
        )
        return res.get("signedURL") or res.get("signedUrl")
    except Exception as e:
        logger.error(f"Cannot resolve signed URL for {image_url}: {e}")
        return None
```

**Cần thêm vào `storage.py`:** hằng `BRAND_ASSETS_BUCKET = "brand-assets"` (hoặc đọc từ env).

### Output Schema

```python
class CaptionEval(BaseModel):
    score: float                  # 0.0–10.0
    passed: bool                  # True nếu >= 7.0
    failed_criteria: list[str]    # subset của ["brand_voice", "content_accuracy", "platform_fit", "pillar_relevance", "originality"]
    fix_instructions: str         # Hướng dẫn cụ thể cho D01

class VisualEval(BaseModel):
    score: float                  # 0.0–5.0
    passed: bool                  # True nếu >= 3.5
    failed_criteria: list[str]    # subset của ["visual_asset_fit", "image_design_quality", "mobile_readability"]
    fix_instructions: str         # Hướng dẫn cụ thể cho D02

class E01Output(BaseModel):
    caption_eval: CaptionEval
    visual_eval: VisualEval
    overall_passed: bool          # True nếu CẢ HAI pass
    evaluation_reasoning: str     # Giải thích tổng quan
```

### Database Write E01

```python
# 0. Load item + detect previous_state (fix vấn đề nhỏ #2)
item = await session.get(ContentItem, content_item_id)
if item.status == "evaluating":
    # Celery tự retry sau infra error — tìm previous_state từ state log
    stmt = select(ContentItemStateLog).where(
        ContentItemStateLog.content_item_id == content_item_id,
        ContentItemStateLog.new_state == "evaluating",
    ).order_by(ContentItemStateLog.created_at.desc()).limit(1)
    res = await session.execute(stmt)
    log = res.scalar_one_or_none()
    previous_state = log.previous_state if log else "visual_generating"
else:
    previous_state = item.status

# 1. Transition → evaluating (commit sớm)
item.status = "evaluating"
session.add(ContentItemStateLog(
    content_item_id=content_item_id,
    agent_code="E01",
    previous_state=previous_state,
    new_state="evaluating",
    reason=f"E01 started. Wake: {wake_reason}",
))
await session.commit()

# 2. Resolve image + Call LLM multimodal
# 3. Parse E01Output
# ...

# 4. Save scores
item.eval_score_caption = parsed.caption_eval.score
item.eval_score_visual = parsed.visual_eval.score

# 5. Insert eval attempt (KHÔNG bao giờ overwrite — 1 row per attempt)
# Ghi chú: sort lịch sử bằng created_at; Phase 1 không có reopen
# → Sort bằng created_at khi cần đọc lịch sử đúng thứ tự, không dùng attempt_number làm key
all_failed = parsed.caption_eval.failed_criteria + parsed.visual_eval.failed_criteria
session.add(ContentItemEvalAttempt(
    content_item_id=content_item_id,
    attempt_number=item.eval_retry_count + 1,
    caption_score=parsed.caption_eval.score,
    visual_score=parsed.visual_eval.score,
    caption_passed=parsed.caption_eval.passed,
    visual_passed=parsed.visual_eval.passed,
    overall_passed=parsed.overall_passed,
    failed_criteria=all_failed,
    fix_instructions_caption=parsed.caption_eval.fix_instructions,
    fix_instructions_visual=parsed.visual_eval.fix_instructions,
))

if parsed.overall_passed:
    # PASS: → pending_content_approval
    item.status = "pending_content_approval"
    item.failed_criteria = None
    item.fix_instructions = None
    session.add(ContentItemStateLog(
        content_item_id=content_item_id, agent_code="E01",
        previous_state="evaluating", new_state="pending_content_approval",
        reason=f"E01 PASS. Caption={parsed.caption_eval.score}, Visual={parsed.visual_eval.score}",
    ))
    await session.commit()
    await handle_event(session, client_id, "eval_passed", cycle_id=cycle_id, content_item_id=content_item_id)

else:
    # FAIL: tăng retry_count, merge fix_instructions
    item.eval_retry_count += 1   # ← CHỈ tăng khi AI quality fail, không phải infra
    item.failed_criteria = all_failed
    fix_parts = []
    if parsed.caption_eval.fix_instructions:
        fix_parts.append(f"[Caption] {parsed.caption_eval.fix_instructions}")
    if parsed.visual_eval.fix_instructions:
        fix_parts.append(f"[Visual] {parsed.visual_eval.fix_instructions}")
    item.fix_instructions = "\n".join(fix_parts)
    item.status = "eval_failed"
    session.add(ContentItemStateLog(
        content_item_id=content_item_id, agent_code="E01",
        previous_state="evaluating", new_state="eval_failed",
        reason=f"E01 FAIL attempt {item.eval_retry_count}. Criteria: {all_failed}",
    ))
    await session.commit()
    # Fire eval_failed → A01 check retry_count
    await handle_event(session, client_id, "eval_failed", cycle_id=cycle_id, content_item_id=content_item_id)
```

### Failure Behavior E01

| Tình huống | Hành vi |
|---|---|
| `image_url = None` (không có ảnh) | Chỉ chấm caption. `visual_eval.passed = False`, tất cả visual criteria = failed. Log warning. |
| Supabase unavailable (test env) | `_resolve_image_url` return None → chỉ chấm caption |
| LLM timeout / network error | Celery retry max 2 lần — **KHÔNG tăng `eval_retry_count`** |
| Parse E01Output thất bại | Celery retry — KHÔNG tăng eval_retry_count |
| `item.status == "evaluating"` khi bắt đầu | Celery đang tự retry — đọc previous_state từ state log, không crash |
| Item không tồn tại | Raise ValueError, không retry |

### Model Tier

Standard — đã hỗ trợ multimodal (Claude Sonnet Vision, GPT-4o, Gemini Flash).

---

## 1b. DB Changes — Migration 0006

Xem `alembic/versions/0006_eval_attempts.py` (đã tạo).

**Ghi chú `attempt_number`:** Không dùng `attempt_number` làm unique key; luôn sort lịch sử bằng `created_at`. Phase 1 không có reopen/manual restart theo Spec 0014.

---

## 1c. A01 Dispatcher — Nâng cấp eval_failed handler

```python
elif event_type == "eval_failed":
    item = ...
    retry_count = item.eval_retry_count

    if retry_count >= 3:
        # TERMINAL: chuyển rejected, ghi log bình thường
        item.status = "rejected"
        session.add(ContentItemStateLog(
            content_item_id=content_item_id,
            agent_code="A01",
            previous_state="eval_failed",
            new_state="rejected",
            reason=f"Hard fail after {retry_count} eval attempts. Agency Admin review eval_attempts table.",
        ))
        session.add(TaskLog(
            client_id=client_id,
            content_item_id=content_item_id,
            agent_code="A01",
            task_type="eval_hard_fail",
            status="terminal",
            wake_reason="eval_failed_terminal",
        ))
        await session.commit()
        return []   # empty — không dispatch thêm

    # retry_count < 3 → route bình thường
    target_agent = determine_retry_route(failed_criteria)
    instructions.append(DispatchInstruction(...))
```

**Không có push notification.** Item ở `rejected` hiển thị trong Internal App filter.

---

## 1d. Retry Routing — 8 criteria chuẩn

Theo ADR-0005: chỉ dùng 8 tên từ MVP-Scope §1a.

```python
CAPTION_CRITERIA = {
    "brand_voice", "content_accuracy", "platform_fit",
    "pillar_relevance", "originality",
}

VISUAL_CRITERIA = {
    "visual_asset_fit", "image_design_quality", "mobile_readability",
}
```

---

## 1e. check_asset_request_expiry — Nâng cấp

Skeleton đã có `orchestrator_tasks.py` line 134. Nâng cấp:
1. Guard: `item.status != "waiting_asset"` → skip
2. Thêm `ContentItemStateLog` (previous=`waiting_asset`, new=`asset_blocked`)
3. Thêm `TaskLog` bình thường (`task_type="asset_request_expiry"`, không có alert field đặc biệt)
4. Commit per-item (không để 1 lỗi phá cả batch)

**KHÔNG push notification. KHÔNG generate AI image.**

---

## 1f. Celery Beat Config — `core/celery_app.py` (NEW)

Tạo mới, import `shared_task` từ đây. Beat schedule:
- `check_scheduled_cycles`: `*/15 * * * *`  
- `check_asset_request_expiry`: `0 * * * *` (mỗi giờ)

---

## 2. Cấu trúc File

```
backend/
├── app/
│   ├── agents/
│   │   └── e01/
│   │       ├── __init__.py           [NEW — đã tạo]
│   │       ├── schemas.py            [NEW] CaptionEval, VisualEval, E01Output
│   │       ├── prompts.py            [NEW] SYSTEM_PROMPT_E01, build_e01_user_prompt()
│   │       └── executor.py           [NEW] execute_e01(), _resolve_image_url()
│   ├── tasks/
│   │   ├── e01_tasks.py              [NEW]
│   │   └── orchestrator_tasks.py     [MODIFY] nâng cấp check_asset_request_expiry
│   ├── models/
│   │   └── content.py                [MODIFY — đã có ContentItemEvalAttempt]
│   ├── services/
│   │   └── storage.py                [MODIFY] thêm BRAND_ASSETS_BUCKET constant
│   └── core/
│       ├── celery_app.py             [NEW]
│       └── llm.py                    [MODIFY] thêm E01, E01_fail mock
├── alembic/versions/
│   └── 0006_eval_attempts.py         [NEW — đã tạo]
├── docs/decisions/
│   └── 0005-e01-criteria-vocabulary.md [NEW — đã tạo]
└── tests/
    └── test_e01.py                   [NEW]
```

---

## 3. Acceptance Criteria

| ID | Tiêu chí | Verify |
|---|---|---|
| AC-E01-01 | E01 build multimodal message có image_url thật (signed URL) + text | Integration test |
| AC-E01-02 | `_resolve_image_url` trả signed URL khi path là Supabase storage path | Unit test |
| AC-E01-03 | Caption pass ≥7.0 + Visual pass ≥3.5 → `pending_content_approval` | Integration test |
| AC-E01-04 | Caption fail → `eval_failed` → A01 dispatch D01 (retry_count < 3) | Integration test |
| AC-E01-05 | Visual fail → `eval_failed` → A01 dispatch D02 (retry_count < 3) | Integration test |
| AC-E01-06 | `eval_retry_count >= 3` → dispatcher transition item → `rejected` + ContentItemStateLog + TaskLog `status=terminal`; return empty instructions | Integration test (query DB) |
| AC-E01-07 | Infra error → KHÔNG tăng `eval_retry_count` | Unit test |
| AC-E01-08 | Mỗi E01 fail → insert 1 row `content_item_eval_attempts` | Integration test |
| AC-E01-09 | `failed_criteria` chỉ chứa các tên trong 8 criteria chuẩn | Unit test (schema validation) |
| AC-E01-10 | `image_url = None` → chỉ chấm caption, visual criteria = failed, không crash | Unit test |
| AC-E01-11 | Celery retry infra → `previous_state` được đọc từ ContentItemStateLog, không từ `item.status="evaluating"` | Unit test |
| AC-EXPIRY-01 | Job query `AssetRequest status=pending AND expires_at <= now()` | Unit test |
| AC-EXPIRY-02 | `waiting_asset` → `asset_blocked` + state_log + task_log; item không ở `waiting_asset` thì skip | Integration test |
| AC-EXPIRY-03 | Không push notification, không tự generate AI image | Code review |
| AC-RETRY-01 | `failed_criteria` + `fix_instructions` được truyền vào payload D01/D02 retry | Integration test |

---

## 4. Ngoài scope spec này

| Item | Spec dự kiến |
|---|---|
| Internal App UI — hiển thị `eval_attempts` history | 0009 |
| Manual restart/reopen từ `rejected` | Không build trong Phase 1 (Spec 0014) |
| Real-time notification (Supabase Realtime) | Spec riêng hoặc 0009 |
