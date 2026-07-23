# CrewLab — MVP Scope Cuối Cùng (v3.4) — 6 Agent (5 Content Agent + A01 Orchestrator)

**Thay thế v3.3** | 19/07/2026 (cập nhật) | Dựa trên lựa chọn tính năng: **AI lọc chất lượng = CÓ | Đăng bài = tay | Học từ feedback = có (không đọc số liệu Meta)**

**Changelog v3 → v3.1:** (1) Chốt model tier E01 = Standard (khớp PRD v3.2, không còn để ngỏ Fast/Standard). (2) Bổ sung state `asset\_blocked` vào FSM mục 3, theo AC-WF-21 gốc PRD (asset\_request hết hạn → escalate, không tự dùng ảnh AI thay thế). (3) Mục 5 cập nhật: ngưỡng pass/fail E01 đã đồng bộ trong PRD v3.2, chỉ còn chờ ký xác nhận cuối.

**Changelog v3.1 → v3.2 (fix gap A01/P01/Observability):** (1) A01 không còn là "Cycle Runner tối giản" đặt tên suông — build kiến trúc đầy đủ theo PRD (trigger table, DispatchInstruction, retry-routing, wake\_reason enum), chỉ giới hạn trigger active theo scope 5-agent (mục 1a). (2) Thêm Context Packet MVP cụ thể — trước đây chỉ ghi "giữ, đơn giản hoá" không có schema (mục 1b). (3) Thêm P01-lite cụ thể — trước đây chỉ ghi "ghi feedback đơn giản" không định nghĩa (mục 1c). (4) Thêm Observability tối giản — trước đây MVP hoàn toàn chưa nhắc tới (mục 1d). (5) Bổ sung rule phân biệt `eval\_retry\_count` vs infra retry (carry-over AC-WF-20 gốc PRD, trước đây MVP thiếu — rủi ro reject oan do lỗi mạng). (6) Sprint estimate tăng \~1 sprint để phản ánh effort thật thay vì gộp ẩn vào "Cycle Runner".

**Changelog v3.2 → v3.3 (A01 chính thức là agent thứ 6, không còn ghi tách "5 agent + Orchestrator"):** (1) Mục 1 đổi tên "Agent scope — 5 agent" → "Agent scope — 6 agent (5 content agent + A01 Orchestrator)", thêm A01 vào bảng agent chính. Lý do: A01 đã được build đúng chất lượng contract đầy đủ (schema, `wake\_reason` enum, `DispatchInstruction`, idempotency pattern, module riêng — mục 1a) ngay từ v3.2, không phải rule phụ viết tắt — ghi nó ngoài bảng đếm agent như trước gây hiểu lầm effort thấp hơn thực tế, và không khớp cách Tầng 3 đã tự gọi là "6 contract" (mục 2). (2) P01 vẫn KHÔNG tính vào agent count — đúng nguyên tắc PRD gốc §7.3.2 ("System pipeline không tính vào 12 agent"), vì P01 không có contract/LLM call riêng như A01, chỉ là pipeline trích xuất-ghi memory. (3) Cập nhật các chỗ nhắc "5 agent"/"5-agent MVP" khi đang nói về *tổng scope MVP* sang "6 agent"; giữ nguyên cách gọi "5 agent nội dung" ở những chỗ nói riêng về nhóm B02/B03/D01/D02/E01 mà A01 dispatch tới (vd bảng trigger-routing của A01 — A01 không tự dispatch cho chính nó nên vẫn cần phân biệt). (4) Không đổi số sprint ở mục 6 — đây là đổi cách đếm/gọi tên cho nhất quán với Tầng 3, không đổi scope hay effort build thực tế.

**Changelog v3.3 → v3.4 (bỏ chia sprint, thêm tiêu chí định lượng, ghi chú diễn giải scope):** (1) **Mục 6 viết lại hoàn toàn** — bỏ hẳn "Sprint 0 → Sprint 4" với số tuần ước lượng. Lý do: team không quản lý bằng sprint, nên số tuần áng chừng trước khi code tạo cảm giác chắc chắn giả; đồng thời chữ "Phase" ở mục này (2a/2b/2c) trùng tên nhưng khác nghĩa hoàn toàn với "PHASE 1-7" ở `CrewLab-Phase-Roadmap.md`, dễ gây nhầm khi đọc cả 2 file; và bảng sprint cũ cộng ra 8.0-8.5 nhưng dòng tổng kết lại ghi 8.5-9.5 — lệch không giải thích được. Thay bằng **trình tự build phụ thuộc** (cái sau cần cái trước), không gắn số tuần/sprint nào — thời gian thật sẽ lộ ra khi bắt tay code, không đoán trước. (2) Bỏ câu hỏi 5 ở mục 7 (đồng ý mức tăng sprint) vì không còn số sprint để hỏi. (3) Thêm mục 1e — ghi chú diễn giải kết quả pilot khi MVP không build State Architecture Layer (RAG/Hindsight/ingest) đầy đủ. (4) Manual posting cho Bardinh Coffee (quán nhà Trường) không phải vấn đề minh bạch khách hàng ở giai đoạn này — ghi chú chi tiết + mốc cần xử lý lại đặt ở `CrewLab-Phase-Roadmap.md` Phase 1 (nơi mô tả "đăng tay"), không lặp lại ở đây.

\---

## 1\. Agent scope — 6 agent (5 content agent + A01 Orchestrator)

**Vì sao A01 được tính là agent thứ 6:** ở các bản trước (v3.1–v3.2), A01 được ghi tách riêng ngoài bảng "5 agent" với chú thích "A01 và P01 KHÔNG bị cắt" — cách viết này vô tình gợi ý A01 là phần phụ nhẹ, trong khi thực tế A01 được build đúng "chất lượng kiến trúc" full: schema, `wake\_reason` enum, `DispatchInstruction`, idempotency pattern, module riêng theo đúng format contract A1 gốc (Tầng 3 Part A) — chỉ giới hạn số trigger được wire active cho MVP (10/15 trigger, xem mục 1a), không giới hạn chất lượng build. Vì vậy từ v3.3, A01 được đếm là agent chính thức thứ 6, khớp với cách mục 2 (Tầng 3) vốn đã tự gọi là "6 contract".

|Agent|Vai trò|Có trong "4 agent" ban đầu?|
|-|-|-|
|B02 — Content Pillar|Tự sáng tạo trụ nội dung mỗi tuần|Có|
|B03 — Content Plan|Lên lịch đăng cụ thể|Có|
|D01 — Caption Writer|Viết caption + image brief|Có|
|D02 — Image Design|Chọn/tạo ảnh, ưu tiên ảnh thật|Có|
|E01 — Evaluator|Chấm điểm caption+ảnh, tự retry tối đa 3 lần trước khi người xem|Không, thêm vào vì chọn "có AI lọc trước"|
|**A01 — Orchestrator**|**Điều phối 5 agent nội dung trên** — đọc state, dispatch task, retry-routing theo `failed\_criteria`, escalation. Build kiến trúc đầy đủ theo format contract Tầng 3 Part A1 (không phải rule-engine viết tắt), chỉ giới hạn 10 trigger active cho scope MVP (xem mục 1a)|Không có trong "4 agent" gốc, và trước v3.3 còn bị ghi tách ngoài bảng "5 agent" — từ v3.3 chính thức là agent thứ 6|

**Vẫn bỏ hoàn toàn (chưa có gì thay thế, chờ phase sau):** B01 IMC Planner + Campaign, F01 Meta Publisher, G01-G04 Analytics.

**P01 KHÔNG tính vào 6 agent, nhưng cũng KHÔNG bị cắt** — khác A01, P01 không có contract/LLM call riêng như một agent thật, nó là pipeline nội bộ (trích xuất feedback người → ghi vào `agent\_memory`), đúng nguyên tắc PRD gốc §7.3.2 ("System pipeline không tính vào 12 agent"). P01 build ở mức lite ngay từ MVP (xem mục 1c Context Packet MVP, 1c P01-lite, 1d Observability tối giản — các mục bổ sung từ v3.2 vì bản trước chỉ đặt tên "Cycle Runner"/"ghi feedback đơn giản" mà chưa spec).

\---

## 1a. A01 — Orchestrator (kiến trúc đầy đủ, scope trigger giới hạn cho MVP)

**Quyết định:** build A01 đúng kiến trúc PRD gốc (trigger table, DispatchInstruction, idempotency, `wake\_reason` enum) — nhưng **chỉ wire các trigger mà 5 agent nội dung MVP (B02/B03/D01/D02/E01) thật sự cần**. Trigger còn lại (campaign/publish/analytics) vẫn giữ tên trong bảng dưới đây, đánh dấu Deferred — Phase 3-7 chỉ cần cắm thêm handler, không viết lại module. *(Từ v3.3: A01 tự nó được tính là agent thứ 6 của MVP — xem mục 1 — chính vì nó được build đúng chất lượng contract này, không phải rule phụ đính kèm 5 agent nội dung.)*

**Role:** Điều phối toàn bộ workflow 1 weekly cycle — đọc state, quyết định bước tiếp theo, dispatch task đúng agent, xử lý retry-routing/escalation. A01 không viết content, không phân tích dữ liệu.

**Trigger — Active vs Deferred:**

|Trigger|Dispatch tới (khi Active)|MVP|
|-|-|-|
|`beat\_weekly`|B02 (luôn Mode B — không check campaign vì đã cắt B01/S1)|✅ Active|
|`strategy\_gate\_approved` (S2)|B03|✅ Active|
|`strategy\_gate\_approved` (S3)|D01 × N item|✅ Active|
|`d01\_complete` *(mới — PRD gốc gộp D01→D02 làm 1 bước tuần tự, MVP tách trigger riêng cho dễ test)*|D02|✅ Active|
|`d02\_complete` (visual\_ready)|E01|✅ Active|
|`asset\_submitted`|D02 lại (không phải D01 — caption không đổi)|✅ Active|
|`asset\_request\_expired` *(mới, xem mục 3)*|Set `asset\_blocked` + `notify\_agency\_admin`|✅ Active|
|`eval\_failed` (còn lượt retry)|D01 hoặc D02 theo bảng retry-routing dưới|✅ Active|
|`eval\_failed` (hard fail / hết lượt)|Set `rejected` + `notify\_agency\_admin`|✅ Active|
|`content\_gate\_approved`|Set `approved\_ready\_to\_post` (không dispatch — đăng tay)|✅ Active|
|`campaign\_created` / `campaign\_ended`|B01 / cleanup|⏸ Phase 5|
|`publish\_due`|F01|⏸ Phase 3|
|`analytics\_due`|G01|⏸ Phase 4|
|`recommendation\_done`|P01 đầy đủ|⏸ Phase 4|
|`direct\_assign`|Forward tới agent (T20)|⏸ Phase 5 (T20 đã defer ở mục 4)|

**`wake\_reason` truyền xuống agent task (giữ nguyên 4 giá trị PRD gốc, cả 4 đều dùng ngay ở MVP):**

* `scheduled` — dispatch theo `beat\_weekly`
* `task\_assigned` — dispatch task cụ thể (đa số trigger ở trên)
* `manual` — Agency Admin bấm nút "Chạy lại" trên Internal App cho 1 content item (xem mục 2 Tầng 4)
* `retry` — Celery tự retry sau lỗi hạ tầng — **KHÔNG tăng `eval\_retry\_count`** (business rule 5 dưới)

**Business Rules:**

1. Precheck: chỉ cần `clients.is\_active` — bỏ quota-tổng-12-agent (MVP 1 client, 6 agent, chưa cần).
2. Không Campaign check — MVP luôn chạy Mode B, không có nhánh B01.
3. Concurrent cycle: chỉ 1 loại cycle (weekly) — không tạo cycle mới nếu cycle hiện tại chưa qua khỏi `content\_production`.
4. **Retry-routing** (logic quan trọng nhất của A01 MVP) — đọc `failed\_criteria` từ output E01:

|`failed\_criteria` chứa|Route retry tới|
|-|-|
|`brand\_voice`, `content\_accuracy`, `platform\_fit`, `pillar\_relevance`, `originality`|D01|
|`visual\_asset\_fit`, `image\_design\_quality`, `mobile\_readability`|D02|
|Cả 2 nhóm cùng lúc|D01 trước, D02 sau khi D01 xong (giữ đúng thứ tự tuần tự D01→D02)|

5. **`eval\_retry\_count` chỉ tăng khi E01 đã chạy xong và trả score dưới ngưỡng** (carry-over AC-WF-20 gốc PRD — bản MVP trước đây thiếu rule này). Celery task tự retry do timeout/network/worker crash dùng `wake\_reason='retry'` và **không tăng** `eval\_retry\_count`. Thiếu rule này, 1 lỗi mạng ngẫu nhiên có thể làm content item bị `rejected` oan trước khi thật sự chạm ngưỡng chất lượng 3 lần.
6. **Ai sở hữu state transition:** từng agent tự cập nhật state của chính bước mình vừa xong (D01 → `caption\_and\_brief\_ready`, D02 → `visual\_ready`/`waiting\_asset`, E01 → `pending\_content\_approval`/`eval\_failed`/`rejected`) qua `T15`; A01 chỉ **đọc** state mới nhất để quyết định dispatch bước kế tiếp — không có 2 nơi cùng ghi 1 transition, tránh race condition.

**Dispatch schema** (giữ nguyên format PRD gốc):

```
{
  "task\_name": "agents.d01.caption\_writer",
  "payload": {
    "client\_id": "...",
    "content\_item\_id": "...",
    "wake\_reason": "task\_assigned",
    "context\_packet": { ... }   // xem mục 1b
  },
  "idempotency\_key": "{client\_id}:{cycle\_id}:{agent\_code}:{content\_item\_id}:{attempt}"
}
```

**LLM Calls:** dùng tier Power.

**Failure Behavior:** Dispatch fail → retry 2 lần → ghi `task\_logs` (mục 1d) + Telegram/notify Agency Admin. MVP chưa có DLQ replay UI (dời Phase 3 theo Roadmap) — Agency Admin xử lý bằng nút "Chạy lại" thủ công (`wake\_reason='manual'`), không phải requeue tự động.

\---

## 1b. Context Packet MVP

```python
def build\_context\_packet\_mvp(client\_id, agent\_code, wake\_reason, task\_context=None):
    return {
        "identity": load\_agent\_config(client\_id, agent\_code),   # persona tĩnh + brand voice form ngắn B2
        "episodic": recall\_episodic\_memory\_mvp(agent\_code, client\_id, task\_type, top\_k=5),
        "assignments": task\_context or {},
        "wake\_reason": wake\_reason,
    }
```

So với bản gốc PRD (7 field), MVP giữ 4 field: bỏ `brand\_memory` (gộp vào `identity` vì form B2 quá nhỏ để tách field RAG riêng), `reflections` (không có Mental Models vì không có Hindsight), `budget\_status` (A01 tự check trước khi dispatch, không cần lộ cho agent). Đặt tên hàm hậu tố `\_mvp` để Phase 5 chỉ cần viết `build\_context\_packet()` đầy đủ thay thế — agent code không phải đổi cách gọi.

**🔶 Rủi ro cần theo dõi:** `recall\_episodic\_memory\_mvp` chỉ lấy 5 bản ghi gần nhất theo thời gian (recency), không có trọng số theo mức độ liên quan (Hindsight gốc dùng 4 kênh song song chính vì lý do này). Nếu 1 bài học quan trọng (vd reject nặng) rơi ở bản ghi thứ 8, nó biến mất khỏi top-5. Đề xuất mitigation nhẹ: `recall` luôn kèm thêm mọi bản ghi có `human\_feedback IS NOT NULL` trong 30 ngày gần nhất (không giới hạn top-5), cộng với 5 bản ghi gần nhất — tránh mất bài học quan trọng chỉ vì nó không phải bản ghi mới nhất.

\---

## 1c. P01 — Feedback Learning Pipeline (lite)

Định nghĩa tối thiểu cho "ghi feedback đơn giản" (trước đây chỉ đặt tên, chưa spec):

**Trigger:** `content\_gate\_approved` (khi có `client\_edited\_caption`) hoặc `content\_rejected` (có `reject\_reason` + `feedback\_text`).

**Việc P01-lite làm:** upsert vào đúng row `agent\_memory` của agent liên quan (tìm theo `content\_item\_id` nếu có record cũ, hoặc insert mới) — ghi `human\_feedback` = nội dung sửa/lý do reject. Không có bước LLM tự tổng hợp "learned" như bản đầy đủ (P01 gốc dùng pipeline trích xuất riêng) — MVP để nguyên feedback dạng text thô, agent tự đọc qua field `episodic` trong Context Packet ở lần chạy sau.

**Không làm ở MVP:** không tạo learning packet machine-readable, không ghi `performance\_patterns` (không có ChromaDB), không tự động cảnh báo "lặp lỗi nhiều lần" — Agency Admin tự đọc `agent\_memory` qua Internal App nếu nghi ngờ lỗi lặp lại.

\---

## 1d. Observability tối giản (MỚI — MVP trước đây hoàn toàn chưa nhắc tới)

PRD gốc bắt buộc mọi agent ghi Langfuse trace (`client\_id, agent\_code, task\_type, model\_used, tokens\_in/out, latency\_ms, status, eval\_score, wake\_reason` — Tầng 3 §A6). Bản MVP trước đây không có dòng nào về observability — nếu bỏ hẳn, khi pilot có lỗi (vd "sao tuần này B02 chọn pillar kỳ vậy") Trường/Thuận không có cách nào tra ngoài đọc code; và khi Phase 3+ cần bật Langfuse thật để debug đa client, phải instrument lại 6 agent đã build xong — tốn công gấp đôi.

**Đề xuất tối thiểu:** không cần Langfuse Docker đầy đủ, nhưng mỗi agent task (kể cả A01) tự ghi 1 dòng vào bảng Postgres đơn giản, **giữ đúng tên field như Observability Contract gốc** để khi bật Langfuse thật chỉ cần đổi nơi ghi log, không đổi field:

```
task\_logs(id, client\_id, agent\_code, task\_type, model\_used,
          tokens\_in, tokens\_out, latency\_ms, status, eval\_score,
          wake\_reason, created\_at)
```

Internal App nên có 1 màn hình đơn giản list `task\_logs` filter theo `content\_item\_id`/`agent\_code` — đủ để Trường/Thuận tự tra khi có sự cố mà không cần hỏi Antigravity đọc code.

\---

## 1e. Ghi chú diễn giải: MVP không test State Architecture Layer (MỚI, v3.4)

MVP cắt hoàn toàn ChromaDB/RAG (C2), Hindsight (C3), Docling+Chonkie (C5) — nghĩa là "moat" kỹ thuật theo PRD Objective (State Architecture Layer dùng chung, chi phí biên/client thấp) **không được kiểm chứng ở Phase 1**. Nếu pilot Bardinh Coffee chạy tốt, kết luận đúng chỉ là "**vòng lặp content → approve → đăng (tay hoặc auto) hoạt động tốt với 1 client**" — KHÔNG phải "**hệ thống cần Hindsight/RAG mới hoạt động**". Hai kết luận này dễ bị lẫn khi quyết định có đầu tư Phase 5 hay không, vì pilot chỉ có 1 client nên bản thân câu hỏi "RAG có cần thiết để scale margin cao không" cũng chưa thể trả lời được ở N=1 — nó là câu hỏi của Phase 6 (nhiều client), không phải Phase 1.

**Quyết định giữ nguyên ở bản này:** không build State Architecture Layer đầy đủ ở MVP — `agent\_memory` Postgres đơn giản là đủ cho mục tiêu thật của Phase 1 (validate vòng lặp workflow + chất lượng output, không phải validate công nghệ memory).

**Đề xuất bổ sung:** thay vì gắn Phase 5 (RAG/Hindsight) vào một mốc thứ tự cố định sau Phase 4, nên mở Phase 5 khi có **tín hiệu cụ thể** từ dữ liệu pilot thật, ví dụ (đề xuất, chưa chốt — team tự điều chỉnh):

* B02 bắt đầu lặp lại pillar/angle dù đã có `human\_feedback` reject rõ ràng trong `agent\_memory` (dấu hiệu recall recency-based không đủ);
* hoặc số lượng record trong `agent\_memory` per agent vượt một ngưỡng mà việc chỉ lấy "5 bản ghi gần nhất + feedback 30 ngày" (mục 1b) không còn phủ đủ context cần thiết.

Cách làm này tránh đầu tư RAG/Hindsight theo lịch trình mặc định trong khi chưa có bằng chứng nó thật sự cần, đồng thời vẫn giữ đường nâng cấp rõ ràng (đã có sẵn ở Phase 5/7 trong Roadmap) khi tín hiệu xuất hiện.

\---

## 2\. Cập nhật theo Tầng

### Tầng 1

|Component|Quyết định|
|-|-|
|C1 PostgreSQL|Schema gồm `content\_items` (FSM đủ evaluating/eval\_failed/asset\_blocked), `hitl\_reviews`, `brand\_settings`, `content\_pillars`, `brand\_assets`, `asset\_requests` (cần field hết hạn để job check\_asset\_request\_expiry dùng), `audit\_log`. Bỏ `analytics\_records`.|
|C2 ChromaDB|**Bỏ** — brand voice dùng form ngắn (B2) nhét thẳng vào context, không cần semantic search tài liệu dài|
|C3 Hindsight|**Thay bằng bảng Postgres đơn giản** `agent\_memory(agent\_code, client\_id, task\_type, input\_summary, output\_summary, human\_feedback, created\_at)` — Retain sau mỗi lần người approve/edit/reject; Recall = query 5 bản ghi gần nhất|
|C4 Celery + Context Packet|Giữ, đơn giản hoá — spec cụ thể `build\_context\_packet\_mvp()` ở mục 1b (4/7 field so với bản gốc)|
|C5 Ingest (Docling+Chonkie)|**Bỏ** — không có tài liệu dài cần đọc tự động|
|C6 Multi-tenant|Giữ nguyên (rẻ, nên có từ đầu)|
|C7 Media Library|Giữ storage+metadata, tìm ảnh bằng **lọc tag đơn giản** (không semantic search), asset request = flag + note, Agency Admin tự nhắn khách ngoài hệ thống|

### Tầng 2

* FSM (xem mục 3) — **giữ lại `evaluating`/`eval\_failed`** vì có E01, **thêm mới `asset\_blocked`** cho case asset\_request hết hạn
* Gates: S2 (Pillar), S3 (Plan), **Content Approval Gate** (người xem caption+ảnh đã qua E01 lọc, **không thấy điểm số** — giữ nguyên tinh thần AC-WF-14 gốc)
* Không S1 (không campaign), không Gate Family 3 (không G04)
* Retry: A01 đọc `failed\_criteria` từ E01 để route đúng agent — bảng routing chi tiết ở mục 1a — tối đa 3 lần → hard fail alert Agency Admin
* **`eval\_retry\_count` chỉ tăng khi E01 đã chạy và fail chất lượng — Celery retry do lỗi hạ tầng (`wake\_reason='retry'`) KHÔNG tăng counter này** (mục 1a, business rule 5 — carry-over AC-WF-20 gốc PRD)
* Thêm job đơn giản `check\_asset\_request\_expiry` (Celery Beat, mỗi vài giờ) → asset\_request quá hạn → chuyển item sang `asset\_blocked` + `notify\_agency\_admin`, không tự dùng ảnh AI thay thế (theo AC-WF-21 gốc PRD)
* `workflow\_cycles`: rút còn 2 phase — `strategy` → `content\_production` → **`done`** (không `publishing`/`analytics` vì đăng tay, không phân tích tự động)

### Tầng 3

* **6 agent contract** theo đúng format A1 gốc — B02, B03, D01, D02, E01, và A01 Orchestrator (mục 1a — kiến trúc đầy đủ, trigger giới hạn theo scope MVP). Từ v3.3, cả 6 đều tính là agent chính thức của MVP (xem mục 1), không còn ghi tách "5 agent + 1 phụ" như bản trước.
* Tool Registry rút gọn (mục 4)
* Model tier: B02 Standard/Power tuỳ ngân sách, B03/D01/D02/E01 **Standard** (đã chốt — khớp PRD v3.2 §A3.2/§B5/§C7), A01 dùng tier Power
* Observability tối giản (mục 1d) — mới bổ sung, PRD gốc có (Langfuse) nhưng bản MVP trước đây chưa nhắc tới

### Tầng 4

* **Không có Part E (Meta Graph API)** — không OAuth, không webhook, không chờ Meta duyệt app
* Client Portal: Duyệt bài (ẩn điểm E01) · Kế hoạch (S2/S3) · Thư viện ảnh (tag filter) · Cài đặt (form brand voice ngắn)
* Thêm 1 nút nhỏ: **"Đánh dấu đã đăng"** — sau khi người tự đăng tay lên FB/IG, bấm nút này để đóng item, dọn dashboard
* Internal App: onboarding client cơ bản, xem content item theo trạng thái, **màn `task\_logs`** (mục 1d, filter theo content\_item\_id/agent\_code), **nút "Chạy lại"** cho 1 content item (gọi A01 với `wake\_reason='manual'`, tự dispatch đúng agent theo state hiện tại) — không cần DLQ phức tạp/replay UI (dời Phase 3 theo Roadmap)
* Không Telegram bot (giữ default đã nêu, chưa bị phản đối)

\---

## 3\. FSM cập nhật (đưa evaluating/eval\_failed trở lại, bổ sung asset\_blocked)

```
planned
  → ready\_for\_generation
  → caption\_generating          (D01)
  → visual\_matching
  → waiting\_asset                 (thiếu ảnh thật → tạo asset\_request, chờ chủ quán nộp ảnh)
  → asset\_blocked                 (MỚI — chỉ khi asset\_request hết hạn trong lúc waiting\_asset: escalate
                                    Agency Admin, KHÔNG tự dùng ảnh AI/fallback, KHÔNG tự reject —
                                    Agency Admin xử lý tay rồi mới đưa item quay lại visual\_matching
                                    hoặc reject thủ công — theo AC-WF-21 gốc PRD)
  → visual\_generating              (D02 — chạy khi asset đã có, dù đến từ waiting\_asset bình thường
                                    hay từ asset\_blocked đã được Agency Admin resolve)
  → evaluating                      (E01 chấm điểm)
  → eval\_failed  ⟲ (quay lại D01 hoặc D02 tuỳ lỗi, tối đa 3 lần)
  → pending\_content\_approval          (người xem — không thấy điểm)
  → approved\_ready\_to\_post              (approve xong, chờ đăng tay)
  → posted                                (người tự bấm "Đánh dấu đã đăng")
  → rejected / archived
```

**Vì sao cần `asset\_blocked` ngay từ MVP:** dù MVP cắt hết Meta integration/analytics, workflow Asset Request/Media Library (C7) vẫn chạy đầy đủ ngay từ Phase 1 — nên case "chủ quán không nộp ảnh kịp deadline" hoàn toàn có thể xảy ra trong pilot thật, không phải chuyện của các phase sau. Cần 1 job đơn giản `check\_asset\_request\_expiry` (Celery Beat, chạy mỗi vài giờ — không cần đầy đủ như `maintenance.check\_stale\_items` bản PRD gốc) để phát hiện asset\_request quá hạn và chuyển state.

**Ai điều khiển transition:** từng agent tự ghi state của bước mình vừa xong (qua `T15`); A01 (mục 1a) đọc state mới nhất và quyết định dispatch bước kế tiếp — không có 2 nơi cùng ghi 1 transition, tránh race condition.

\---

## 4\. Tool Registry cập nhật (\~10 tool)

|Giữ|Cắt|
|-|-|
|T02/T03 recall/retain — nhưng trỏ vào bảng Postgres đơn giản, không phải Hindsight|T01 (không ChromaDB)|
|T04 query\_media\_library (tag filter)|T06, T07 (không publish/metrics Meta)|
|T05 create\_asset\_request (chỉ flag+note)|T10, T11 (không performance\_patterns)|
|T08 read\_content\_plan, T09 write\_planning\_artifact|T16, T17 (không B01, không schedule publish)|
|T12 generate\_image\_ai, T13 compose\_image\_from\_assets|T18, T19 (không analytics record/learning packet — Retain vào `agent\_memory` đã đóng vai trò này)|
|T14 notify\_agency\_admin (rút gọn), T15 update\_content\_state|T20 (defer), T21 (không G02)|

*(T15 `update\_content\_state`: từng agent tự gọi khi hoàn thành bước của mình; A01 chỉ đọc state để quyết định dispatch tiếp theo, không gọi T15 thay agent — xem mục 1a business rule 6.)*

\---

## 5\. Ngưỡng pass/fail Evaluator — đã đồng bộ trong PRD v3.2 (chờ ký xác nhận cuối)

* Caption ≥ 7.0/10 AND Visual ≥ 3.5/5 → **pass**
* Caption 5.0–6.9 OR Visual 2.5–3.4 → **retry** (route đúng agent lỗi)
* Caption < 5.0 OR Visual < 2.5 → **hard fail**

\---

## 6\. Trình tự build Phase 1 

|#|Việc|Vì sao đứng ở vị trí này|
|-|-|-|
|1|VPS/Coolify — không spike Hindsight, không khởi động Meta App Review|Hạ tầng chạy trước, mọi thứ khác cần chỗ để deploy lên|
|2|C1 schema + C6 + `agent\_memory` + C7 rút gọn|Mọi agent đều query các bảng này — phải có trước khi code agent đầu tiên|
|3|A01 Orchestrator (agent thứ 6 — trigger routing, retry-routing table, DispatchInstruction, idempotency, mục 1a)|5 agent nội dung cần A01 dispatch tới mới chạy được — viết trước để có khung test|
|4|Context Packet MVP + P01-lite + Observability tối giản (mục 1b/1c/1d)|Mọi agent nội dung đều gọi `build\_context\_packet\_mvp()` và ghi `task\_logs` — cần có trước khi 5 agent nội dung chạy|
|5|5 agent nội dung (B02/B03/D01/D02/E01) + FSM/state transitions + retry loop E01|Phần lõi tạo ra output thật — việc lớn nhất, làm sau khi khung dispatch/context đã sẵn|
|6|Portal (Duyệt bài ẩn điểm + Kế hoạch + Thư viện ảnh + Cài đặt) + Internal App (`task\_logs` + nút Chạy lại)|Cần có agent chạy ra output thật rồi mới build UI để duyệt nó|
|7|Hardening nhẹ + pilot thật tại Bardinh Coffee (đăng tay)|Bước cuối, sau khi mọi phần trên đã chạy được|

Không ước lượng thời gian cho từng dòng trong tài liệu này. Nếu cần một con số tổng để lên kế hoạch (vd báo với ai đó ngoài team), khuyến nghị chạy thật dòng 1-4 trước rồi mới tự ước lượng phần còn lại dựa trên tốc độ thật đã quan sát được, thay vì đoán trước khi có dữ liệu — sprint estimate lần đầu chưa chạy thật gần như luôn lạc quan, nhất là khi code cùng AI coding assistant (rework/debug thường tốn thời gian hơn dự đoán).

