# Spec 0007 — Agent D01 (Caption Writer) + Agent D02 (Image Design & Matching)

**Ngày tạo:** 2026-08-01 | **Cập nhật:** 2026-08-01 (v2 — fix 4 issues từ review)
**Trạng thái:** Draft — Đã review, sẵn sàng implement
**Phụ thuộc:** Spec 0006 (LLM Core + B02/B03) — phải hoàn thành trước

---

## Changelog v1 → v2 (issues từ review)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | 🔴 Bug | `previous_state` hardcode string → sai khi retry từ `eval_failed` | Đọc `item.status` từ DB trước khi transition |
| 2 | 🔴 Gap | `AgentMemory` insert thiếu `content_item_id` → P01-lite không upsert được | Thêm `content_item_id` vào tất cả AgentMemory write D01/D02 |
| 3 | 🟡 Gap | Observability: không xác nhận `call_llm()` đã tự ghi `task_logs` | Xác nhận rõ: `call_llm()` tự ghi task_logs (Spec 0006 §1a) — D01/D02 không cần ghi thêm |
| 4 | 🟡 Gap | Thiếu Failure Behavior section — format chuẩn A1 bắt buộc | Thêm mục Failure Behavior cho cả D01 và D02 |
| 5 | 🟡 Gap | Angle lấy từ đâu? — `content_items` không có field `angle` | Quyết định: D01 dùng pillar description (có angles) + topic; đây là gap có thể cải thiện sau |
| 6 | ✅ Info | E01 = spec **0008** (không phải 0009/0010) | Xác nhận — ghi nhận ở mục 4 |

---

---

## 0. Bối cảnh và Phạm vi

Spec này build 2 agent thuộc nhóm **Creative Desk** trong workflow MVP:

```
B03 tạo ContentItem (status='planned')
  → Gate S3: Client approve Content Plan
    → A01 dispatch D01 × N items   ← spec này bắt đầu
      → D01: viết Caption + Image Brief
        → D01 tự update state → fire 'd01_complete'
          → A01 dispatch D02        ← spec này tiếp tục
            → D02: tìm ảnh thật hoặc tạo asset_request
              → D02 update state → fire 'd02_complete'
                → A01 dispatch E01 ← spec tiếp theo (0008)
```

**Không có DB Migration mới bắt buộc** — `content_items` đã có đủ các field cần thiết (`caption`, `image_brief`, `image_url`, `status`, v.v.). `brand_assets` và `asset_requests` cũng đã tồn tại.

**Tuy nhiên:** cần bổ sung thêm field cho `AssetRequest` để D02 tạo được yêu cầu ảnh có cấu trúc hơn (xem mục 1b DB Changes).

---

## 1. Thành phần sẽ build

```
1a. Agent D01 — Caption Writer
1b. DB Changes nhỏ (3 field bổ sung vào asset_requests + 1 field vào brand_settings)
1c. Agent D02 — Image Design & Matching
1d. Wiring D01/D02 vào Celery tasks
1e. Mock data bổ sung vào llm.py
```

---

## 1a. Agent D01 — Caption Writer

### Vai trò (PRD mục 1, bảng agent)

Đọc kế hoạch content đã qua Gate S3, viết:
1. **Caption** (nội dung bài đăng chi tiết, sẵn sàng đăng)
2. **Image Brief** (bản mô tả ý tưởng hình ảnh cho D02 tìm/tạo ảnh)

### Trigger

A01 dispatch khi event `strategy_gate_approved(S3)` → D01 nhận từng `content_item_id` (N item song song).

### State Transitions (D01 sở hữu)

```
planned → caption_generating          (luồng bình thường — bắt đầu lần đầu)
eval_failed → caption_generating      (retry từ E01 với failed_criteria → D01)
any_state → caption_generating        (manual retry từ Agency Admin)
```

**Quy tắc quan trọng (fix 🔴 Bug #1):** D01 KHÔNG hardcode `previous_state`. Trước khi transition, executor phải:
1. Query `item = session.get(ContentItem, content_item_id)`
2. Ghi `previous_state = item.status` (đọc từ DB)
3. Cập nhật `item.status = "caption_generating"`
4. Insert `ContentItemStateLog(previous_state=previous_state, new_state="caption_generating", ...)`

Nếu hardcode `previous_state="planned"` và item đang ở `eval_failed`, state log sẽ ghi sai lịch sử.

D01 KHÔNG chuyển sang `visual_generating` — đó là của D02.

### Input

```python
{
    "client_id": "...",
    "cycle_id": "...",
    "content_item_id": "...",
    "wake_reason": "task_assigned",   # hoặc "retry" nếu E01 fail và route lại D01
    "failed_criteria": [],            # chỉ có khi wake_reason="retry" — list string
    "fix_instructions": None,         # text từ E01, chỉ có khi retry
    "context_packet": {
        "identity": { ... },          # brand_voice_short, tone, target_audience, etc.
        "episodic": [ ... ],          # 5 bản ghi gần nhất từ agent_memory của D01
        "assignments": { ... },
        "wake_reason": "..."
    }
}
```

D01 sẽ query thêm từ DB:
- `content_items` WHERE `id = content_item_id` → lấy `topic`, `platform`, `pillar_id`, `scheduled_date`
- `content_pillars` WHERE `id = pillar_id` → lấy `name`, `description` (gồm angles)
- `brand_settings` (đã có trong context_packet.identity nhưng query thêm nếu cần)

### LLM Call

```python
messages = [
    {"role": "system", "content": SYSTEM_PROMPT_D01},
    {"role": "user", "content": build_d01_user_prompt(
        topic=item.topic,
        platform=item.platform,
        pillar_name=pillar.name,
        pillar_description=pillar.description,
        brand_settings=context_packet["identity"],
        episodic_memory=context_packet["episodic"],
        fix_instructions=fix_instructions,   # None hoặc text nếu retry
        failed_criteria=failed_criteria,
    )}
]
response = await call_llm(
    client_id=client_id,
    agent_code="D01",
    messages=messages,
    session=session,
    response_format=D01Output,
    wake_reason=wake_reason,
    content_item_id=content_item_id,
)
```

### Output Schema (Pydantic)

```python
class ImageBrief(BaseModel):
    description: str           # Mô tả ý tưởng hình ảnh tổng quát
    mood: str                  # Cảm xúc/phong cách (VD: "ấm áp, tự nhiên, summer vibes")
    suggested_tags: list[str]  # Tags để D02 tìm trong brand_assets (VD: ["cà phê", "cold brew"])
    composition_notes: str     # Gợi ý bố cục (VD: "Ảnh dọc, close-up sản phẩm trên nền gỗ sáng")
    avoid: list[str]           # Cần tránh trong ảnh (VD: ["ảnh mờ", "nền tối"])

class D01Output(BaseModel):
    caption: str               # Nội dung caption đầy đủ sẵn sàng đăng, bao gồm hashtag
    image_brief: ImageBrief
```

### Business Rules

1. **Caption phải phù hợp platform:**
   - Facebook: caption có thể dài hơn (200-500 từ), ngôn ngữ thân thiện, CTA rõ ràng
   - Instagram: ngắn gọn hơn, visual-first, hashtag #5-15 tags, emoji phù hợp
2. **Caption phải phản ánh đúng pillar/angle** — không tự ý đổi chủ đề bài
3. **Image Brief phải cụ thể** — `suggested_tags` là từ khóa tìm kiếm ảnh trong thư viện, không phải hashtag bài đăng
4. **Khi retry** (`wake_reason="retry"`):
   - Đọc `fix_instructions` từ E01 trong payload
   - Đọc `failed_criteria` để biết vấn đề cụ thể
   - Ưu tiên sửa theo `fix_instructions`, không viết lại hoàn toàn nếu không cần thiết
5. **Không hardcode thương hiệu** — đọc từ `brand_settings` trong context_packet

### Database Write

```python
# 0. Đọc state hiện tại TRƯỚC KHI THAY ĐỔI (fix 🔴 Bug #1)
previous_state = item.status   # Đọc từ DB — có thể là 'planned' hoặc 'eval_failed'

# 1. Update state: bắt đầu xử lý
item.status = "caption_generating"
await session.commit()   # Commit sớm để task_logs/dashboard thấy ngay

# ... gọi call_llm() ...

# 2. Update ContentItem với kết quả LLM
item.caption = parsed_output.caption
item.image_brief = parsed_output.image_brief.model_dump()  # Store as JSONB
item.status = "visual_matching"   # T15: state transition

# 3. Log state change (dùng previous_state đọc từ DB, không hardcode)
state_log = ContentItemStateLog(
    content_item_id=content_item_id,
    agent_code="D01",
    previous_state=previous_state,    # ← đọc từ DB, không hardcode
    new_state="visual_matching",
    reason="Caption written, image brief created"
)
session.add(state_log)

# 4. AgentMemory (T03 retain) — BẮT BUỘC có content_item_id (fix 🔴 Gap #2)
# P01-lite cần content_item_id để upsert human_feedback vào đúng row sau này
memory = AgentMemory(
    client_id=client_id,
    content_item_id=content_item_id,    # ← bắt buộc — P01-lite dùng để upsert
    agent_code="D01",
    task_type="caption_writing",
    input_summary=f"Topic: {item.topic}, Platform: {item.platform}, Wake: {wake_reason}",
    output_summary=f"Caption ({len(parsed_output.caption)} chars), Brief tags: {parsed_output.image_brief.suggested_tags}",
)
session.add(memory)

await session.commit()
```

### Observability (xác nhận 🟡 Gap #3)

`call_llm()` (Spec 0006 §1a, file `backend/app/core/llm.py` dòng 183-186) **đã tự động ghi `task_logs`** sau mỗi lần gọi LLM. D01 không cần ghi thêm — chỉ cần đảm bảo truyền đúng `content_item_id` và `wake_reason` vào `call_llm()` để task_logs có đủ context.

### Fire Trigger Tiếp Theo

Sau khi commit thành công, fire event `d01_complete` → A01 dispatch D02:

```python
# Trong Celery task sau execute_d01() xong:
instructions = await handle_event(
    session=session,
    client_id=client_id,
    event_type="d01_complete",
    cycle_id=cycle_id,
    content_item_id=content_item_id,
)
# Dispatch các instructions (D02 task)
```

### Model Tier

Standard.

### SYSTEM_PROMPT_D01 — Nguyên tắc viết

Prompt hệ thống phải bao gồm:
- Vai trò: "Bạn là D01 — Caption Writer của CrewLab, viết nội dung marketing F&B cho thị trường Việt Nam"
- Nhiệm vụ kép: viết caption VÀ tạo image brief
- Nguyên tắc caption F&B: gần gũi, truyền cảm hứng, không sáo rỗng, phù hợp thị trường Việt
- Format JSON output expected (trùng D01Output schema)
- Instruction về retry: nếu có `fix_instructions`, ưu tiên sửa theo đó

### Quyết định về Angle (🟡 Gap #5)

**Vấn đề:** PRD nhắc đến "angle" là góc khai thác riêng cho từng bài, nhưng `content_items` (do B03 tạo) không có field `angle` riêng — chỉ có `topic` và `pillar_id`. `ContentPlanItem` của B03 cũng không output field angle.

**Quyết định MVP:** D01 suy ra angle từ:
1. `pillar.description` — chứa angles chung của pillar (B02 đã nhúng vào description)
2. `item.topic` — topic cụ thể B03 đặt
3. Context từ episodic memory

**Trade-off ghi nhận:** Thiếu field `angle` riêng làm D01 có thể generic hơn dự định — không biết B03 chọn angle cụ thể nào cho bài này. Mitigation phase sau: thêm field `angle` vào B03 output schema và `content_items`, B03 set angle cụ thể khi tạo plan.

### Failure Behavior (bắt buộc, fix 🟡 Gap #4)

| Tình huống | Hành vi |
|---|---|
| LLM call timeout / network error | Celery task retry tự động (max 2 lần, `wake_reason='retry'`, **không tăng `eval_retry_count`**) |
| Parse D01Output thất bại (JSON sai) | Raise `ValueError`, Celery retry lần kế tiếp với cùng prompt |
| Hết retry (3 lần total) | Task vào Dead Letter, ghi `task_logs.status='failed'`, `notify_agency_admin` |
| Item không tồn tại trong DB | Raise lỗi rõ ràng, không retry — Agency Admin xử lý thủ công |

---

## 1b. DB Changes (Migration 0005)

### Bổ sung field cho `AssetRequest`

`AssetRequest` hiện tại chỉ có `note` dạng text tự do. D02 cần tạo asset request có cấu trúc để client hiểu rõ cần chụp gì.

```sql
-- Migration: 0005_asset_request_structured.py
ALTER TABLE asset_requests
ADD COLUMN shot_list JSONB,          -- [{angle: str, description: str}]
ADD COLUMN reference_tags JSONB,     -- Tags tham khảo từ image_brief
ADD COLUMN example_asset_ids JSONB;  -- UUID[] ảnh ví dụ phong cách

ALTER TABLE brand_settings
ADD COLUMN allow_ai_images BOOLEAN NOT NULL DEFAULT false;
```

**Model `AssetRequest` cần update** để có 3 field mới.
**Model `BrandSetting` cần update** để có `allow_ai_images`.

---

## 1c. Agent D02 — Image Design & Matching

### Vai trò (PRD mục 1, bảng agent)

Nhận `image_brief` từ D01, thực hiện theo thứ tự ưu tiên:

1. **Tìm ảnh thật** trong `brand_assets` bằng tag filter (T04 `query_media_library`)
2. **Nếu không có ảnh thật phù hợp + `allow_ai_images=true`** → tạo ảnh AI (T12)
3. **Nếu không có ảnh + `allow_ai_images=false`** → tạo `AssetRequest` (T05) → `waiting_asset`

### State Transitions (D02 sở hữu)

```
visual_matching → visual_generating   (có ảnh thật match hoặc AI image)
visual_matching → waiting_asset        (không có ảnh, cần client nộp)
```

**Lưu ý (PRD AC-WF-21):** Nếu `asset_request` hết hạn trong `waiting_asset`, job `check_asset_request_expiry` (Celery Beat, ngoài scope spec này) mới chuyển sang `asset_blocked`. D02 KHÔNG xử lý case timeout.

**Quy tắc previous_state (fix 🔴 Bug #1 — áp dụng tương tự D01):** D02 cũng KHÔNG hardcode `previous_state`. Phải đọc `item.status` từ DB trước khi transition. Khi retry từ E01, state có thể là `eval_failed`, không phải `visual_matching`.

### Trigger

A01 dispatch khi:
- `d01_complete` (content_item_id cụ thể) — luồng bình thường
- `asset_submitted` (client nộp ảnh) — A01 dispatch D02 lại, bỏ qua D01, ảnh đã sẵn trong brand_assets

### Logic Phân Nhánh D02

```python
async def execute_d02(
    session, client_id, cycle_id, content_item_id,
    context_packet, wake_reason="task_assigned"
):
    # 1. Load item + image_brief
    item = await session.get(ContentItem, content_item_id)
    image_brief = ImageBrief(**item.image_brief)

    # 2. LLM call để enhance tags (T04 matching tốt hơn)
    enhanced_tags = await _enhance_tags_with_llm(
        session, client_id, content_item_id, image_brief, wake_reason
    )

    # 3. Tìm ảnh thật qua tag filter (T04)
    matching_assets = await query_media_library(
        session=session,
        client_id=client_id,
        tags=enhanced_tags,
        status="approved",
        limit=10,
    )

    if matching_assets:
        # 4a. Có ảnh thật → chọn ảnh tốt nhất (LLM nếu nhiều ảnh)
        if len(matching_assets) > 1:
            best_asset = await _select_best_asset_with_llm(
                session, client_id, content_item_id,
                matching_assets, image_brief, wake_reason
            )
        else:
            best_asset = matching_assets[0]

        item.image_url = best_asset.url or best_asset.storage_path
        item.status = "visual_generating"
        result_type = "real_photo"

    else:
        # 4b. Không có ảnh thật phù hợp
        allow_ai = context_packet.get("identity", {}).get("allow_ai_images", False)

        if allow_ai:
            # 4c. Tạo AI image (T12)
            ai_asset = await generate_image_ai(
                session=session,
                client_id=client_id,
                prompt=_build_ai_image_prompt(image_brief),
            )
            item.image_url = ai_asset.url or ai_asset.storage_path
            item.status = "visual_generating"
            result_type = "ai_generated"

        else:
            # 4d. Tạo AssetRequest → waiting_asset
            await _create_asset_request_for_item(
                session=session,
                client_id=client_id,
                content_item_id=content_item_id,
                image_brief=image_brief,
            )
            item.status = "waiting_asset"
            result_type = "waiting_asset"

    # 5. Ghi state log + memory
    # previous_state đọc từ DB TRƯỚC KHI transition (fix 🔴 Bug #1)
    state_log = ContentItemStateLog(
        content_item_id=content_item_id,
        agent_code="D02",
        previous_state=previous_state_d02,   # ← đọc từ DB trước bước 2
        new_state=item.status,
        reason=f"D02 result: {result_type}"
    )
    session.add(state_log)

    # BẮT BUỘC có content_item_id (fix 🔴 Gap #2) — P01-lite dùng để upsert human_feedback
    memory = AgentMemory(
        client_id=client_id,
        content_item_id=content_item_id,    # ← bắt buộc
        agent_code="D02",
        task_type="image_matching",
        input_summary=f"Item: {content_item_id}, Tags: {enhanced_tags}",
        output_summary=f"Result: {result_type}, Wake: {wake_reason}",
    )
    session.add(memory)

    await session.commit()

    # 6. Fire trigger CHỈ KHI có ảnh
    if item.status == "visual_generating":
        await handle_event(
            session=session, client_id=client_id,
            event_type="d02_complete",
            cycle_id=cycle_id, content_item_id=content_item_id,
        )
    # Khi waiting_asset: dừng tại đây, chờ asset_submitted trigger
```

### LLM Calls của D02

D02 dùng LLM cho 2 việc nhỏ:

**LLM Call 1 — Tag Enhancement:**
```python
# Làm giàu suggested_tags để query_media_library match tốt hơn
response = await call_llm(
    client_id=client_id,
    agent_code="D02",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT_D02_TAG},
        {"role": "user", "content": build_d02_tag_prompt(image_brief)}
    ],
    session=session,
    response_format=D02TagOutput,
    wake_reason=wake_reason,
    content_item_id=content_item_id,
)
# Kết quả: enhanced_tags list + search_priority list
```

**LLM Call 2 — Asset Selection (chỉ khi có nhiều ảnh match):**
```python
if len(matching_assets) > 1:
    response = await call_llm(
        client_id=client_id,
        agent_code="D02",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_D02_SELECT},
            {"role": "user", "content": build_d02_select_prompt(matching_assets, image_brief)}
        ],
        session=session,
        response_format=D02SelectionOutput,
        wake_reason=wake_reason,
        content_item_id=content_item_id,
    )
```

### Output Schema (Pydantic)

```python
class D02TagOutput(BaseModel):
    enhanced_tags: list[str]      # Tags bổ sung + chuẩn hóa
    search_priority: list[str]    # Tags quan trọng nhất, thử match trước

class D02SelectionOutput(BaseModel):
    selected_asset_id: str        # UUID của ảnh được chọn
    reason: str                   # Giải thích ngắn

class AssetRequestData(BaseModel):
    """Cấu trúc nội dung asset request."""
    note: str                     # Mô tả tổng quát cho client
    shot_list: list[dict]         # [{angle: str, description: str}]
    reference_tags: list[str]     # Tags tham khảo
    example_asset_ids: list[str]  # UUID[] ảnh ví dụ (có thể rỗng)
    expires_days: int = 3         # Số ngày trước khi expire
```

### Tool Functions (T04, T05, T12)

```python
# T04 — query_media_library (tag filter, dùng Postgres JSONB ?| operator)
async def query_media_library(
    session: AsyncSession,
    client_id: uuid.UUID,
    tags: list[str],
    status: str = "approved",
    asset_type: str = None,    # None = all, "photo", "ai_generated"
    limit: int = 10,
) -> list[BrandAsset]:
    """
    Filter brand_assets có ít nhất 1 tag khớp với danh sách tags.
    Dùng SQL: WHERE tags ?| ARRAY['tag1', 'tag2', ...]
    Chỉ lấy status='approved'. asset_type filter tùy chọn.
    """

# T05 — create_asset_request
async def create_asset_request(
    session: AsyncSession,
    client_id: uuid.UUID,
    content_item_id: uuid.UUID,
    image_brief: ImageBrief,
    expires_days: int = 3,
) -> AssetRequest:
    """
    Tạo AssetRequest với shot_list từ image_brief.
    Kiểm tra duplicate: nếu đã có AssetRequest pending cho item này → skip tạo mới.
    Notify client qua notification system (xem spec Portal UI sau).
    """

# T12 — generate_image_ai
async def generate_image_ai(
    session: AsyncSession,
    client_id: uuid.UUID,
    prompt: str,
    size: str = "1080x1080",
) -> BrandAsset:
    """
    Generate AI image. MVP: gọi API (VD: Replicate/DALL-E).
    Lưu kết quả vào brand_assets với source='ai_generated'.
    Trả về BrandAsset record đã commit.
    NOTE: MVP có thể mock nếu không có API key image generation.
    """
```

### Business Rules D02

1. **Ưu tiên ảnh thật tuyệt đối** — chỉ dùng T12 khi `brand_settings.allow_ai_images = true`
2. **Tag matching fuzzy** — dùng `?|` operator (có ít nhất 1 tag match), không cần exact
3. **Chỉ lấy ảnh `status='approved'`** — `pending_review` bỏ qua hoàn toàn
4. **Khi retry** (`failed_criteria` có `visual_asset_fit`/`image_design_quality`/`mobile_readability`):
   - Log ảnh đã dùng trước (từ `item.image_url`)
   - Exclude ảnh đó khỏi kết quả matching
   - Nếu vẫn không có ảnh khác phù hợp → tạo AssetRequest mới (không tự dùng AI)
5. **Không tạo AssetRequest duplicate** — kiểm tra `AssetRequest WHERE content_item_id = X AND status='pending'` trước khi insert mới
6. **`asset_submitted` trigger**: khi client nộp ảnh, D02 chạy lại nhưng ảnh đã ở trong `brand_assets` với `status='pending_review'` → cần Agency Admin approve trước. Luồng: `asset_submitted` → D02 thử tìm ảnh pending review của request đó → nếu đã approved → proceed; nếu chưa approved → chờ.

**Quyết định scope:** Trong MVP, khi `asset_submitted`, ảnh vẫn cần Agency Admin approve trước khi D02 dùng được. D02 chỉ tìm ảnh `status='approved'`.

### Observability D02 (xác nhận 🟡 Gap #3)

Mỗi lần `call_llm()` được gọi (D02 có 2 lần), `task_logs` được ghi tự động bởi `call_llm()`. D02 không cần ghi thêm — chỉ cần truyền đúng `content_item_id` và `wake_reason`.

### Failure Behavior D02 (fix 🟡 Gap #4)

| Tình huống | Hành vi |
|---|---|
| LLM timeout (tag enhancement hoặc selection) | Celery retry tự động max 2 lần |
| `query_media_library()` raise exception (DB error) | Celery retry |
| `create_asset_request()` raise (duplicate check fail) | Log error, không retry — không tạo duplicate |
| `generate_image_ai()` fail (API error) | Fallback về `create_asset_request()` nếu AI fail — KHÔNG để item treo |
| Hết retry | `task_logs.status='failed'` + `notify_agency_admin` |

### Model Tier

Standard (2 LLM call nhỏ mỗi lần chạy D02).

---

## 1d. Celery Task Wiring

D01 và D02 cần được expose qua Celery tasks:

```python
# backend/app/tasks/d01_tasks.py
@celery_app.task(name="agents.d01.caption_writer", bind=True, max_retries=2)
def run_d01(self, payload: dict):
    """Celery task wrapper cho execute_d01()."""
    import asyncio
    async def _run():
        async with get_async_session() as session:
            await execute_d01(
                session=session,
                client_id=uuid.UUID(payload["client_id"]),
                cycle_id=uuid.UUID(payload["cycle_id"]),
                content_item_id=uuid.UUID(payload["content_item_id"]),
                context_packet=payload["context_packet"],
                wake_reason=payload.get("wake_reason", "task_assigned"),
                fix_instructions=payload.get("fix_instructions"),
                failed_criteria=payload.get("failed_criteria", []),
                cycle_id_for_dispatch=uuid.UUID(payload["cycle_id"]),
            )
    asyncio.run(_run())

# backend/app/tasks/d02_tasks.py
@celery_app.task(name="agents.d02.image_designer", bind=True, max_retries=2)
def run_d02(self, payload: dict):
    """Celery task wrapper cho execute_d02()."""
    ...
```

**Cập nhật A01 dispatcher** (nếu chưa có task map):

```python
# A01 đã có sẵn logic dispatch D01/D02 trong dispatcher.py (lines 80-125)
# Chỉ cần đảm bảo Celery app import đúng task module khi start
```

**Check:** Xem `backend/app/tasks/` có file nào sẵn không để follow pattern.

---

## 1e. Mock Data bổ sung vào `llm.py`

Thêm vào `mock_responses` dict trong `_mock_llm_response()`:

```python
"D01": json.dumps({
    "caption": "☀️ Cold Brew mùa hè — Giải nhiệt theo cách của bạn!\n\nMùa hè nóng bức cần một thức uống đủ mát, đủ ngon, đủ chill. Cold Brew Bardinh được ngâm lạnh 12 giờ — đậm đà, mượt mà, không cần đường.\n\nGhé Bardinh hôm nay, order ngay Cold Brew yêu thích của bạn! 🧋\n\n#ColdBrew #Bardinh #CafeSaigon #GiaiNhiet #CafeMuaHe",
    "image_brief": {
        "description": "Ly Cold Brew trên nền gỗ sáng, ánh nắng tự nhiên chiếu qua cửa sổ tạo bóng đổ nhẹ",
        "mood": "Tươi mát, tự nhiên, summer vibes",
        "suggested_tags": ["cold brew", "cà phê", "flat lay", "mùa hè", "ly đá"],
        "composition_notes": "Ảnh dọc 4:5, close-up ly từ góc 45 độ, xung quanh vài viên đá và lá bạc hà",
        "avoid": ["ảnh mờ", "nền tối", "góc chụp nghiêng nhiều"]
    }
}),
"D02_tags": json.dumps({
    "enhanced_tags": ["cold brew", "cà phê đá", "flat lay", "summer drink", "coffee shop"],
    "search_priority": ["cold brew", "flat lay", "cà phê"]
}),
"D02_select": json.dumps({
    "selected_asset_id": "00000000-0000-0000-0000-000000000001",
    "reason": "Ảnh flat lay Cold Brew có ánh sáng tự nhiên, khớp với brief về nền gỗ sáng và summer vibes"
}),
```

**Lưu ý:** `_mock_llm_response()` hiện dùng `agent_code` làm key. D02 dùng 2 LLM call với cùng agent_code "D02" → cần dùng heuristic đơn giản (VD: kiểm tra nội dung user message để phân biệt call 1 vs call 2). Hoặc thêm param `call_type` vào mock, hoặc dùng counter. **Đề xuất:** thêm optional param `mock_key` vào `call_llm()` cho mock mode, default = agent_code.

---

## 2. Cấu trúc File

```
backend/
├── app/
│   ├── agents/
│   │   ├── d01/
│   │   │   ├── __init__.py           [NEW]
│   │   │   ├── schemas.py            [NEW] D01Output, ImageBrief
│   │   │   ├── prompts.py            [NEW] SYSTEM_PROMPT_D01, build_d01_user_prompt()
│   │   │   └── executor.py           [NEW] execute_d01()
│   │   └── d02/
│   │       ├── __init__.py           [NEW]
│   │       ├── schemas.py            [NEW] D02TagOutput, D02SelectionOutput, AssetRequestData
│   │       ├── prompts.py            [NEW] SYSTEM_PROMPT_D02_TAG, SYSTEM_PROMPT_D02_SELECT, builders
│   │       ├── executor.py           [NEW] execute_d02()
│   │       └── tools.py              [NEW] query_media_library(), create_asset_request(), generate_image_ai()
│   ├── tasks/
│   │   ├── d01_tasks.py              [NEW] Celery task run_d01()
│   │   └── d02_tasks.py              [NEW] Celery task run_d02()
│   ├── models/
│   │   ├── assets.py                 [MODIFY] Thêm shot_list, reference_tags, example_asset_ids
│   │   └── clients.py                [MODIFY] Thêm allow_ai_images vào BrandSetting
│   └── core/
│       └── llm.py                    [MODIFY] Thêm mock D01/D02, thêm optional mock_key param
├── alembic/versions/
│   └── 0005_asset_request_structured.py  [NEW] Migration
└── tests/
    └── test_d01_d02.py               [NEW]
```

---

## 3. Acceptance Criteria

| ID | Tiêu Chí | Verify |
|---|---|---|
| AC-D01-01 | `execute_d01()` gọi `call_llm()` với `agent_code="D01"` và parse output thành `D01Output` | Unit test |
| AC-D01-02 | D01 update `content_items.caption` và `content_items.image_brief` (JSONB) sau khi chạy | Integration test (mock LLM) |
| AC-D01-03 | D01 ghi `ContentItemStateLog.previous_state = item.status` (không hardcode "planned") — khi retry từ eval_failed, previous_state phải là "eval_failed" | Integration test |
| AC-D01-04 | D01 fire event `d01_complete` sau khi commit thành công | Integration test |
| AC-D01-05 | Khi `wake_reason='retry'` với `fix_instructions`, nội dung fix_instructions xuất hiện trong prompt user | Unit test |
| AC-D01-06 | `AgentMemory` insert của D01 có `content_item_id` không null | Integration test |
| AC-D02-01 | `execute_d02()` gọi `query_media_library()` với tags từ `image_brief.suggested_tags` (enhanced) | Unit test |
| AC-D02-02 | Khi có ảnh thật match: `item.image_url` được set, state = `visual_generating`, fire `d02_complete` | Integration test |
| AC-D02-03 | Khi không có ảnh + `allow_ai_images=false`: tạo `AssetRequest`, state = `waiting_asset`, KHÔNG fire `d02_complete` | Integration test |
| AC-D02-04 | `create_asset_request()` không tạo duplicate nếu đã có `AssetRequest status='pending'` cho item | Unit test |
| AC-D02-05 | `query_media_library()` chỉ trả ảnh có `status='approved'` | Unit test |
| AC-D02-06 | Khi retry với `visual_asset_fit` trong `failed_criteria`: exclude ảnh đã dùng (từ `item.image_url`) | Integration test |
| AC-D02-07 | `AgentMemory` insert của D02 có `content_item_id` không null | Integration test |
| AC-D02-08 | D02 ghi `ContentItemStateLog.previous_state = item.status` (không hardcode) | Integration test |
| AC-DB-01 | Migration `0005` thành công: thêm 3 field vào `asset_requests`, 1 field vào `brand_settings` | Migration script |
| AC-MOCK-01 | Mock mode với `agent_code="D01"` trả response parse thành `D01Output` hợp lệ | Unit test |
| AC-WIRE-01 | Celery task `agents.d01.caption_writer` đăng ký và A01 dispatch được | Integration test |
| AC-WIRE-02 | Celery task `agents.d02.image_designer` đăng ký và A01 dispatch được | Integration test |

---

## 4. Ngoài scope spec này

| Item | Spec dự kiến |
|---|---|
| E01 Evaluator (chấm điểm caption + ảnh) | 0008 |
| Portal UI: hiển thị trạng thái bài đang xử lý D01/D02 | 0009 |
| `check_asset_request_expiry` Celery Beat job (`asset_blocked`) | 0008 hoặc spec riêng |
| Notification gửi client khi D02 tạo AssetRequest | 0009 (Portal UI) |
| Thêm field `angle` vào B03 output + `content_items` | Đã quyết định: B03 là source of truth, D01/D02 sẽ đọc field này để biết angle mong muốn |
| Auto-tag ảnh upload bằng vision model | Phase 2+ |
| T13 `compose_image_from_assets` (ghép ảnh phức tạp) | Phase 2+ |

---

## 5. Quyết định kỹ thuật

### Q1: `allow_ai_images` lưu ở đâu?

**Quyết định:** Thêm field `allow_ai_images BOOLEAN DEFAULT false` vào `brand_settings`.  
**Lý do:** Setting này thuộc quyết định thương hiệu của client (có cho phép dùng ảnh AI hay không), phù hợp với `brand_settings`. Client tự bật/tắt qua Portal Settings → tab Brand Voice.

### Q2: D02 có cần LLM không, hay chỉ rule-based?

**Quyết định: Có, 2 LLM call nhỏ.**  
**Lý do:** Tag matching thuần túy miss nhiều case ngữ nghĩa (VD: brief ghi "ly đá" nhưng tag trong thư viện là "cold brew" — LLM hiểu được liên kết). PRD mục 1a xác nhận D02 dùng Standard tier.

### Q3: Tag matching dùng SQL gì?

**Quyết định: Postgres JSONB `?|` operator.**

```sql
-- Tìm asset có ít nhất 1 tag trong danh sách
SELECT * FROM brand_assets
WHERE client_id = $1
  AND status = 'approved'
  AND tags ?| ARRAY['cold brew', 'flat lay', 'cà phê']
ORDER BY usage_count ASC  -- Ưu tiên ảnh chưa dùng nhiều
LIMIT 10
```

### Q4: D02 có phân biệt được D01_call_1 vs D01_call_2 trong mock?

**Quyết định:** Thêm optional param `mock_key: str = None` vào `call_llm()`. Default = `agent_code`. D02 gọi với `mock_key="D02_tags"` và `mock_key="D02_select"`. Không ảnh hưởng production (mock chỉ dùng khi `CREWLAB_LLM_MOCK=true`).

---

## 6. Open Questions (cần xác nhận trước khi implement)

> [!IMPORTANT]
> Team cần xác nhận trước khi bắt đầu code:

**Q1 — allow_ai_images default:** Mặc định là `false` (không cho AI) hay `true` cho giai đoạn pilot? Bardinh Coffee cụ thể có cho phép tạo ảnh AI không?

**Q2 — Thư viện ảnh hiện tại:** `brand_assets` đã có data thật chưa, hay vẫn trống? Nếu trống, tất cả D02 sẽ đi nhánh `waiting_asset` → flow test chủ yếu là case đó.

**Q3 — AssetRequest deadline:** 3 ngày có phù hợp không? PRD không ghi số ngày cụ thể.

**Q4 — T12 generate_image_ai:** Giai đoạn đầu có API key để gọi thật không, hay mock hoàn toàn? Provider nào (DALL-E 3, Replicate, Flux)?

**Q5 — Numbering spec:** Spec 0006 ghi D01=0008, D02=0009. Spec này gộp D01+D02 thành 0007. E01 sẽ là **0008** — team xác nhận để cập nhật note trong spec 0006.
