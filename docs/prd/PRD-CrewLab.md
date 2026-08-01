# PRD — CrewLab: Tổng thể Dự án

**Version:** 1.2 **Date:** Tháng 7/2026

## Changelog

| Ngày | Ver | Tác giả | Nội dung thay đổi |
| :---- | :---- | :---- | :---- |
|  | 1.0 | Trường, Thuận | Khởi tạo PRD |
|  | 1.1 | Trường, Thuận | **Hạ tầng (Tầng 4 Part A0):** bỏ đề xuất Railway/Render, quay lại chốt Hetzner VPS (nâng cấp CAX21 → CAX31) đúng theo quyết định gốc ở Tầng 1, có thêm lớp Coolify/Dokploy để giữ trải nghiệm deploy kiểu PaaS. **Số lượng agent (Tầng 2):** chốt **12 agent chính thức**, đưa E01 Evaluator vào Agent Registry chính thức thay vì để lửng "không tính vào 11 agent". *(Phát hiện thêm khi sửa: Tầng 3 Part B — B8 Client Config Self-Service — đã sẵn nói "12 agent chính" ở 2 chỗ trong bản v3.0, mâu thuẫn ngược với Tầng 2 nói 11\. Việc chốt 12 cũng giải quyết luôn chỗ lệch này.)* **RAG rule cho G04 (Tầng 2):** viết lại "Rule RAG" để phản ánh đúng thực tế Tool Registry — G04 được đọc episodic memory/performance patterns nhưng vẫn không được đọc brand RAG. **Queue name (Tầng 2 A01 example):** sửa ví dụ `"queue": "content_queue"` → đúng 1 trong 4 queue chính thức của Tầng 1 C4. |
| 25/7/2026 | 1.2 | Thuận | Sửa lại Tầng 4, bổ sung mô tả thiết kế giao diện |

## 

## 1\. SUMMARY

**CrewLab** là AI agency cung cấp dịch vụ **multi-agent marketing automation** dạng managed service cho SME Việt Nam, với mô hình: Agency Admin thiết kế và vận hành agent stack riêng cho từng client; client chỉ tương tác qua một Portal đơn giản (Approval Queue, Content Calendar, Brand Settings) mà không cần biết gì về backend.

## 2\. CONTACTS

| Tên | Vai trò | Ghi chú |
| :---- | :---- | :---- |
| Trường | Founder / Product Owner | Ra quyết định sản phẩm, kiến trúc, roadmap; tác giả chính của PRD này |
| Thuận | Co-Founder | Ra quyết định sản phẩm, kiến trúc, roadmap |
| Bardinh Coffee | Pilot Client | Nguồn feedback thực tế đầu tiên; quyết định go/no-go sau giai đoạn pilot |

## 3\. BACKGROUND

**Bối cảnh:** Phần lớn SME Việt Nam (quán cafe, F\&B, dịch vụ nhỏ) hiện tự làm marketing social thủ công hoặc thuê agency truyền thống. Tự làm thường thiếu đều đặn và thiếu chiến lược; thuê agency thì chi phí cao, không phù hợp quy mô SME.

**Vì sao là bây giờ:** Các thành phần kỹ thuật để build agent stack chi phí thấp mới đủ trưởng thành trong khoảng 1–2 năm gần đây: framework multi-agent (CrewAI), vector DB nhẹ (ChromaDB), episodic memory (Hindsight), ingest pipeline (Docling, Chonkie) đều đã ở dạng pip-install/Docker-service, không cần build từ đầu hay fork (xem nguyên tắc CONSUME vs OWN, 7.7). Kết hợp với chi phí LLM giảm và chất lượng đủ tốt cho nhu cầu SME, mô hình "agency vận hành bằng agent, quản lý bởi 1–2 người" lần đầu khả thi về mặt kinh tế.

**Vừa mới khả thi:** Trước đây, xây một hệ thống agent ổn định — có state management, HITL approval, và learning loop — đòi hỏi team kỹ thuật lớn. Với OSS hiện tại, một VPS đơn (Hetzner CAX31, xem 7.6) đủ chạy toàn bộ stack cho pilot, giúp CrewLab kiểm chứng mô hình với chi phí hạ tầng ở mức thấp trước khi cam kết đầu tư lớn hơn.

## 4\. OBJECTIVE

**Mục tiêu:** Chứng minh một agency vận hành bằng multi-agent stack (State Architecture Layer dùng chung \+ 12 agent per-client config) có thể thay thế phần lớn công việc của một content/social team truyền thống cho SME — với chi phí vận hành đủ thấp để 1 agency 2 người quản lý được nhiều client song song.

**Lợi ích:**

- Với khách hàng (SME): có nội dung social đều đặn, đúng brand, có chiến lược, có phân tích hiệu quả — mà không cần tự làm hay trả chi phí agency truyền thống.  
- Với CrewLab: margin cao vì State Architecture Layer (7.2) không đổi theo từng client — chi phí biên để thêm 1 client thấp.

**Liên kết với chiến lược:** Đây là giai đoạn pilot (1 quán cafe — Bardinh Coffee) để validate toàn bộ vòng lặp automation trước khi mở rộng sang nhiều SME F\&B khác (xem Section 8 — Release).

**Key Results** *(nháp — Trường điền số liệu mục tiêu thật trước khi chốt):*

- KR1: Pilot Bardinh Coffee chạy đủ vòng lặp full-automation (generate → approve → publish → phân tích → learning) liên tục trong \[X\] tuần, không cần thao tác tay ngoài phê duyệt qua Gate.  
- KR2: \[X\]% content được Client Admin approve ngay lần đầu, không cần reject/retry.  
- KR3: OAuth connect flow hoàn thành ≤ 5 phút *(đã có sẵn ở NFR-T4-03, dùng làm KR tham chiếu)*.  
- KR4: Thời gian trung bình từ content generate đến publish (qua approval) ≤ \[X\] giờ.

## 5\. MARKET SEGMENT(S)

**Đối tượng chính:** SME Việt Nam ngành F\&B (quán cafe, quán ăn, nhà hàng quy mô nhỏ) cần hiện diện social media đều đặn nhưng không có ngân sách hoặc nhân sự cho content team riêng hay agency truyền thống.

**Constraints của segment này:**

- Ngân sách nhỏ — không chịu được chi phí agency full-service.  
- Chủ quán thường không rành công nghệ — cần Portal đơn giản (Approval Queue, Content Calendar) và kênh giao tiếp quen thuộc (Telegram) thay vì hệ thống phức tạp.  
- Platform chính: Facebook \+ Instagram — chưa cần mở rộng kênh khác ở giai đoạn này.

**Pilot segment:** 1 quán cafe (Bardinh Coffee) — chọn quy mô nhỏ để chạy thật trước khi mở rộng (xem Assumptions, 7.7).

*Lưu ý: market ở đây định nghĩa theo nhu cầu ("có nội dung social đều đặn, đúng brand, không phải tự làm hay tự học công cụ") chứ không chỉ theo demographic ngành — nhóm SME dịch vụ khác ngoài F\&B có thể là market thứ hai sau khi pilot F\&B thành công.*

## 6\. VALUE PROPOSITION(S)

**Jobs/needs khách hàng cần giải quyết:** Có nội dung social đăng đều, đúng brand, có chiến lược (không chỉ đăng ngẫu nhiên), và biết được nội dung nào hiệu quả — nhưng không có thời gian tự làm và không đủ ngân sách thuê agency full-service.

**Khách hàng nhận được gì:** Chủ quán chỉ cần bấm Approve; agent lo phần còn lại — từ lên chiến lược (IMC Plan, Content Pillar), viết caption, thiết kế ảnh, đăng bài đúng giờ, đến phân tích hiệu quả và học từ feedback cho vòng sau.

**Pain tránh được:** Không cần tự viết caption hay tự thiết kế ảnh, không cần tự quản lý content calendar, không cần tự đọc số liệu Meta phức tạp — chỉ cần duyệt hoặc từ chối ở đúng thời điểm.

**Vì sao tốt hơn lựa chọn khác:**

- So với **tự làm**: đều đặn hơn, có chiến lược, có học từ dữ liệu thay vì đoán.  
- So với **thuê freelancer**: nhất quán về brand hơn, có learning loop qua các cycle.  
- So với **thuê agency truyền thống**: chi phí thấp hơn nhiều nhờ State Architecture Layer dùng chung, tốc độ triển khai nhanh hơn.

**Positioning đã chốt** *(từ brand strategy work — tham khảo tài liệu brand guidelines đầy đủ để biết chi tiết):* định vị category-creation — "Not a tool. Not an agency." — với tagline tiếng Việt cho hero copy: "Mày chỉ cần bấm Approve." Chi tiết value prop theo từng tier giá và concept "The Crew" đã có trong tài liệu brand strategy riêng.

## 7\. SOLUTION

*Ghi chú cấu trúc: Section 7 gộp cả 4 tầng kiến trúc của CrewLab. 7.1 \= tổng quan UX/kiến trúc; 7.2–7.5 \= Key Features, mỗi tầng một mục con (7.2 Tầng 1, 7.3 Tầng 2, 7.4 Tầng 3, 7.5 Tầng 4); 7.6 \= Technology (toàn hệ thống); 7.7 \= Assumptions (toàn hệ thống). Các nhãn gốc (Part A/B/C, C1, A0.1...) được giữ trong ngoặc đơn ở mỗi đầu mục để không phá vỡ các tham chiếu chéo có sẵn trong tài liệu (vd. "xem C1, C6", "Tầng 3 §A2").*

### 7.1. Kiến trúc tổng thể & Roadmap 4 Tầng

#### 7.1.1. Ba surfaces (đã chốt — gộp từ 5 xuống 3\)

Thiết kế ban đầu đề xuất 5 surface (landing page, client portal, business dashboard, operations portal, agent studio). Quyết định kiến trúc gần nhất là **gộp 3 surface nội bộ** (business dashboard, operations portal, agent studio) thành **một Internal App role-based access duy nhất**, để giảm số codebase phải maintain và tránh trùng lặp logic auth/data-fetching. Kết quả: 3 surfaces.

| Surface | Đối tượng | Vai trò chính |
| :---- | :---- | :---- |
| **Landing Page** | Public (prospect SME) | Marketing site, giới thiệu dịch vụ, lead capture |
| **Client Portal** | Client Admin / Client Staff | Approval Queue, Content Calendar, Brand Settings, Pixel Office (hiển thị agent đang "làm việc") |
| **Internal App** (role-based, gộp 3 surface cũ) | Agency Admin | Business Dashboard (KPI, doanh thu, quota), Operations Portal (Celery Flower, dead letter queue, onboarding/offboarding), Agent Studio (cấu hình agent stack per client) — phân quyền theo role trong cùng một app |

Cả 3 surfaces đều build trên **Next.js (Vercel)** \+ **Supabase** (Auth/Realtime/Storage), dùng chung component library và design system — chỉ khác routing/role-gating.

#### 7.1.2. Kiến trúc hệ thống (high-level)

┌─────────────────────────────────────────────────────────────────┐

│  FRONTEND (Vercel)                                                 │

│  Landing Page  │  Client Portal  │  Internal App (role-based)     │

└───────────────────────────┬───────────────────────────────────────┘

                          │ Supabase Auth / Realtime / Storage

┌─────────────────────────────────────────────────────────────────┐

│  HETZNER VPS (Docker Compose)                                      │

│                                                                     │

│  ┌─────────────┐   ┌──────────────────────────────┐               │

│  │  FastAPI    │──▶│  Celery Workers (4 queues)     │               │

│  │  (API layer)│   │  \+ Celery Beat \+ Flower         │               │

│  └─────────────┘   └────────────┬───────────────────┘               │

│                                  │                                   │

│        ┌─────────────┬──────────┼───────────┬────────────────┐     │

│        ▼             ▼          ▼           ▼                ▼     │

│   ┌─────────┐  ┌──────────┐ ┌─────────┐ ┌──────────┐  ┌───────────┐│

│   │ Redis   │  │ ChromaDB │ │Hindsight│ │ Langfuse │  │ Telegram  ││

│   │(broker/ │  │ (local,  │ │(Docker  │ │(self-    │  │   Bot     ││

│   │ result) │  │per-client│ │sidecar, │ │ hosted)  │  │ (alerts)  ││

│   │         │  │collection│ │Memory   │ │          │  │           ││

│   │         │  │   s)     │ │Banks)   │ │          │  │           ││

│   └─────────┘  └──────────┘ └─────────┘ └──────────┘  └───────────┘│

└───────────────────────────┬───────────────────────────────────────┘

                          │

                     Supabase Cloud

              (PostgreSQL \\+ Auth \\+ Realtime \\+ Storage)

### 7.2. Key Features — Tầng 1: State Architecture Layer

State Architecture Layer là tầng lưu trữ và quản lý state dùng chung, **không thay đổi dù agent stack của từng client khác nhau**. Gồm 7 components. C1, C2, C6 giữ nguyên thiết kế đã spec trong v2.0 và được tóm tắt lại ở đây; khi implement phải dùng thêm `PRD-CrewLab-Tang1-Implementation-Pack-v3.1.md` để có checklist dev-ready, seed pilot cafe, test plan và acceptance criteria. C3, C4, C5 được **cập nhật toàn bộ** theo quyết định OSS mới. C7 được bổ sung để xử lý media/ảnh thật của brand, là dependency trực tiếp cho D02 Image Design và Asset Request workflow ở Tầng 2\.

**Quy ước:** FR \= Functional Requirement, NFR \= Non-Functional Requirement, AC \= Acceptance Criteria. MUST \= bắt buộc MVP, SHOULD \= quan trọng nhưng có thể defer, MAY \= nice-to-have.

---

#### C1 — PostgreSQL Database Schema (giữ nguyên v2.0 — tóm tắt)

**Purpose:** Source of truth duy nhất cho mọi structured/relational data: clients, brand settings (versioned, append-only), content pillars, agent configs (versioned), content items (FSM), HITL review log (append-only), LLM usage, audit log (append-only, BIGSERIAL, không bao giờ UPDATE/DELETE), post performance.

**Key FRs (MUST):**

- Migration idempotent từ một file duy nhất, cover tables/indexes/FKs/RLS.  
- `clients.service_tier` enum DB-level: `social_lite | social_analytics | social_ads | social_campaign | full_content | full_combo`.  
- `users.role`: `agency_admin | client_admin | client_staff` — agency admin có `client_id = NULL`.  
- `brand_settings`, `agent_configs`: versioned, append-only (không UPDATE record cũ).  
- `content_items.status` là FSM (draft → generated → in\_review → approved → scheduled → published, với các nhánh rejected/archived/failed) — transition sai phải fail rõ ràng.  
- `hitl_reviews`, `audit_log`: append-only, DB-level trigger/RLS ngăn DELETE.  
- `llm_usage`: nguồn data chính cho quota và invoice.  
- `internal_llm_usage`: cost ledger nội bộ cho memory extraction, auto-tag asset, evaluator helper hoặc tác vụ system không tính vào quota client mặc định. Minimum schema: `id`, `client_id nullable`, `source`, `provider`, `model`, `tokens_in`, `tokens_out`, `cost_usd`, `created_at`.  
- `content_items.celery_task_id`: dùng để revoke task khi reschedule.  
- Workflow state tables thuộc C1, không để Tầng 2 tự đoán migration: `asset_requests`, `task_attachments`, `notifications`, `content_item_state_log`.  
- Planning artifact state thuộc C1: `planning_artifacts`, `planning_artifact_versions`, `planning_artifact_comments` để lưu IMC Plan, Pillar Set, Content Plan có version/diff/comment-on-selection.

**Key NFRs:** Query p99 \< 50–100ms cho các truy vấn thường xuyên; FK constraints enforce ở DB level; Supabase daily backup, RPO \< 24h, RTO \< 4h; connection pooling qua PgBouncer (max 10 connections/service, Celery workers share pool).

**Key ACs:** Migration chạy 2 lần không lỗi/không đổi data; INSERT `service_tier` sai → constraint violation; INSERT `content_items.status` sai thứ tự FSM → bị từ chối; `audit_log` UPDATE/DELETE bị từ chối bởi mọi role; `brand_settings` chỉ có đúng 1 record `is_current = true` per client.

---

#### C2 — ChromaDB Collections Architecture (giữ nguyên v2.0 — tóm tắt)

**Purpose:** Semantic search cho RAG flow — agent tìm tone example, guideline, performance pattern liên quan đến brief hiện tại bằng vector similarity.

**Key FRs (MUST):**

- 3 text/RAG collections chính mỗi client: `brand_identity_{client_id}`, `campaign_context_{client_id}`, `performance_patterns_{client_id}`. Tên dùng `client_id` UUID với `-` → `_`. Visual asset search dùng collection riêng `visual_assets_{client_id}` ở C7.  
- Metadata schema bắt buộc per collection (xem v2.0 §2.2 FR-CH-02) — thiếu field nào → từ chối insert.  
- Interface duy nhất `query_brand_memory(client_id, query_text, collections, top_k, filters)` — không gọi ChromaDB client trực tiếp.  
- `campaign_context`: filter `is_expired = false` luôn tự động áp dụng.  
- `performance_patterns`: hard filter `confidence_score < 0.4` hoặc `manually_flagged = true`; `sample_size < 5` → đánh dấu `low_confidence: true`.  
- Soft delete campaign context (Celery Beat daily 03:00) → physical delete sau 30 ngày.  
- Performance pattern decay: `last_validated` \> 90 ngày → giảm `confidence_score` 50%; \< 0.2 → DELETE.  
- Manual flag bởi Agency Admin → loại khỏi retrieval ngay, physical delete trong 24h.  
- Health check sau mỗi lần ingest.

**Key NFRs:** Retrieval p99 \< 200ms với top\_k=5 trên 10,000 chunks; embedding model duy nhất `text-embedding-3-small`, không mix model index/query time; ChromaDB local chịu được ≥100,000 chunks; backup rsync daily, verify weekly; atomic write qua collection `_tmp` \+ rename; isolation giữa concurrent read/write của các client khác nhau.

**Key ACs:** 3 collections đúng tên sau onboard; insert thiếu `content_type` → từ chối trước khi gọi ChromaDB; query campaign context khi không có campaign active → empty list không lỗi; chunk `manually_flagged` không xuất hiện trong kết quả; HNSW search 5,000 chunks p99 \< 200ms; daily expire job hoạt động đúng; kill giữa chừng ingest → collection không partially-written.

---

#### C3 — Episodic Memory: Hindsight (CẬP NHẬT TOÀN BỘ — thay SQLite)

##### 3.1. Purpose

Cho phép từng agent "nhớ" những gì nó đã làm trong quá khứ cho cùng client, cùng task type — trước khi generate content, agent truy hồi: lần trước làm gì, điểm số bao nhiêu, feedback là gì, học được gì. Cơ chế này tạo vòng học liên tục mà không cần fine-tuning.

**Thay đổi so với v2.0:** Thay toàn bộ "1 SQLite file per agent per client" bằng **Hindsight** — một memory service mã nguồn mở (MIT license) chạy như Docker sidecar, expose HTTP API, tổ chức data theo **Memory Banks** isolated per context. CrewLab chỉ dùng các primitive đã verify: **Retain** để upsert tài liệu memory theo `document_id`, **Recall** với `tags + tags_match="all_strict"`, và **Mental Models** để lấy insight tổng hợp dạng living document/Q\&A. Không dùng contract cũ dựa trên `memory_id`, PATCH endpoint, hoặc reflection records recall như memory thường.

**Lý do chọn Hindsight (đã research, đã chốt):**

- 91.4% trên LongMemEval — cao nhất hiện tại (ReMe 86.23%, Mem0 61%).  
- Memory Banks isolated per user/context \= multi-tenant built-in, khớp với yêu cầu C6.  
- 4 kênh retrieval song song: Semantic \+ BM25 (keyword) \+ Graph (quan hệ entity) \+ Temporal (theo thời gian) — vượt trội so với chỉ semantic search của SQLite cũ.  
- LLM extraction (tóm tắt, rút "learned") tách biệt, dùng model riêng (Gemini Flash) — không tốn token của agent chính.  
- Thiết kế cho institutional/procedural knowledge (agent học từ task lặp lại theo chu kỳ) — đúng bài toán CrewLab (chu kỳ tuần), khác với ReMe (tối ưu cho long conversational sessions).  
- Self-hosted Docker, MIT license — phù hợp constraint "không fork, dùng OSS qua pip/Docker".

**Decision gate trước production:** Hindsight là lựa chọn ưu tiên, nhưng chưa được coi là production dependency chắc chắn cho đến khi dev hoàn tất spike trong `PRD-CrewLab-Tang1-Implementation-Pack-v3.1.md`. Spike phải xác nhận: Docker sidecar chạy được bằng **external PostgreSQL variant** trỏ vào Supabase/schema riêng, Retain trả response thật `{success, bank_id, items_count, async, operation_id}`, Recall filter được bằng strict tags, upsert hoạt động bằng cách Retain lại cùng `document_id`, delete được theo `document_id`, Mental Models trả được document/Q\&A, Memory Bank isolated theo `(agent_code, client_id)`, và latency top\_k=5 phù hợp pilot. Nếu fail hard requirement, dev phải tạo decision note `C3_ALT` và dùng adapter thay thế có cùng public interface mới. Không được fake episodic learning và không dùng manual fallback.

##### 3.2. Functional Requirements

**FR-MEM-01 — Hindsight Docker sidecar (MUST)** Hindsight chạy như một service riêng trong `docker-compose.yml`, expose HTTP API nội bộ (không public ra internet, chỉ accessible từ network Docker Compose). FastAPI và Celery workers gọi Hindsight qua HTTP client, không có access trực tiếp vào storage layer của Hindsight. Phải dùng Docker Compose variant với external PostgreSQL, trỏ vào Supabase hoặc một schema riêng trong Supabase. Không dùng standalone bundle `pg0-embedded` cho production pilot vì sẽ tạo thêm một PostgreSQL nguồn truth thứ hai trên VPS 8GB. Biến `HINDSIGHT_ENABLED=false` là mặc định cho đến khi spike pass; chỉ bật `true` sau khi decision gate được ký nhận.

**FR-MEM-02 — Memory Bank naming convention (MUST)** Mỗi cặp `(agent_code, client_id)` có đúng một Memory Bank, isolated hoàn toàn — tương đương với "1 SQLite file per agent per client" trước đây nhưng do Hindsight quản lý nội bộ. Naming convention:

memory\_bank\_id \= f"{agent\_code}\_{str(client\_id).replace('-', '\_')}"

\# Ví dụ: "D01\_a3f2b1c4d5e6f7081234567890abcdef"

Không có Memory Bank nào shared giữa hai agents hoặc hai clients. Hàm `get_memory_bank_id(agent_code, client_id)` là interface DUY NHẤT để construct ID này — tương tự `get_episodic_db_path()` cũ.

**FR-MEM-03 — Retain sau mỗi task completion (MUST)** Sau khi agent hoàn thành task (dù pass hay fail tại Evaluator quality step), hệ thống gọi `retain_episodic_memory()` với payload:

class RetainResult(TypedDict):

success: bool

bank\\\_id: str

items\\\_count: int

async\\\_: bool  \\\# maps Hindsight JSON key "async"

operation\\\_id: str | None

def retain\_episodic\_memory(

agent\\\_code: str,

client\\\_id: UUID,

task\\\_type: str,

document\\\_id: str,      \\\# content\\\_item\\\_id nếu memory gắn với content item

input\\\_summary: str,    \\\# ≤ 200 ký tự, tóm tắt brief — không lưu full brief

output\\\_summary: str,   \\\# ≤ 200 ký tự, tóm tắt output đã generate

eval\\\_score: float | None,   \\\# 0.0–10.0, NULL nếu fail trước Evaluator

feedback: str | None,

reject\\\_reason: str | None,

learned: str,          \\\# 1 câu agent tự generate: "học được gì từ task này"

content\\\_item\\\_id: UUID | None,  \\\# để map ngược khi human reject sau

) \-\> dict:

"""

Gọi Hindsight Retain API trên memory\\\_bank \\= get\\\_memory\\\_bank\\\_id(agent\\\_code, client\\\_id).

Gửi tags: client:{client\\\_id}, agent:{agent\\\_code}, task\\\_type:{task\\\_type}.

Trả về response thật của Hindsight: {success, bank\\\_id, items\\\_count, async, operation\\\_id}.

"""

Không lưu `memory_id` vì Hindsight không trả `memory_id` per item. Mapping chính thức là `document_id = str(content_item_id)` cho content memory. Nếu memory không gắn content item, `document_id` phải là deterministic ID do application tạo và lưu trong PostgreSQL record nguồn.

**FR-MEM-04 — Recall trước mỗi task (MUST)** Trước khi generate content, agent gọi `recall_episodic_memory()`:

def recall\_episodic\_memory(

agent\\\_code: str,

client\\\_id: UUID,

task\\\_type: str,

query\\\_text: str,   \\\# brief/context hiện tại — dùng cho semantic \\+ graph retrieval

top\\\_k: int \\= 5,

) \-\> list\[dict\]:

"""

Gọi Hindsight Recall API trên memory\\\_bank \\= get\\\_memory\\\_bank\\\_id(agent\\\_code, client\\\_id),

filter bằng tags \\+ tags\\\_match="all\\\_strict", không dùng metadata filter.

Returns: list of { input\\\_summary, output\\\_summary, eval\\\_score, learned,

                    feedback, reject\\\_reason, created\\\_at, document\\\_id }

"""

Recall tags bắt buộc:

tags \= \[

f"client:{client\\\_id}",

f"agent:{agent\\\_code}",

f"task\\\_type:{task\\\_type}",

\]

tags\_match \= "all\_strict"

Kết quả phải được inject vào context window theo format CHUẨN (không đổi so với v2.0), đặt trong `build_context_packet()` (xem C4):

\=== Lịch sử task gần nhất (${task\_type}) \===

\[Lần 1, score: 8.5\] Learned: viết ngắn hơn, focus vào benefit.

\[Lần 2, score: 6.0, FAILED\] Feedback: sai tone. Reject: tone\_wrong. Learned: không dùng từ "sang trọng" với brand này.

\[Lần 3, score: 9.2\] Learned: emoji phù hợp tăng engagement.

**FR-MEM-05 — Task type taxonomy (MUST, giữ nguyên v2.0)** `task_type` theo format `{agent_code}_{platform}_{content_type}` hoặc `{agent_code}_{workflow_step}` cho strategy tasks (ví dụ `D01_facebook_social_post`, `D02_instagram_visual_design`, `B03_weekly_content_plan`). Phải có taxonomy file (`constants.py`) define toàn bộ valid task types. Agent không được tự đặt `task_type` tùy tiện. Hindsight không filter bằng metadata `task_type`; CrewLab chuyển `task_type` thành tag `task_type:{task_type}` và Recall bằng `tags_match="all_strict"`.

**FR-MEM-06 — Human reject feedback sync (MUST)** Khi user reject content trong Approval Queue (Gate Type 2\) và điền `reject_reason` \+ `feedback_text`, hệ thống phải upsert memory bằng cách gọi Retain lại cùng `document_id = str(content_item_id)`. Không dùng PATCH endpoint.

def upsert\_memory\_with\_human\_feedback(

agent\\\_code: str,

client\\\_id: UUID,

task\\\_type: str,

content\\\_item\\\_id: UUID,

reject\\\_reason: str,

feedback\\\_text: str,

) \-\> RetainResult:

"""

Load content item \\+ latest generated output from PostgreSQL,

merge human feedback into payload, then call retain\\\_episodic\\\_memory()

with document\\\_id=str(content\\\_item\\\_id).

"""

Nếu content item không có prior Retain do lỗi trước đó, upsert vẫn tạo memory document mới với feedback và metadata hiện có; log warning nhưng không raise exception.

**FR-MEM-07 — Mental Models định kỳ (SHOULD)** Khác với SQLite cũ (không có cơ chế tổng hợp), Hindsight hỗ trợ **Mental Models** — living document/Q\&A tổng hợp từ memory bank. Celery Beat job `maintenance.refresh_mental_models` chạy weekly (Thứ 2, 04:00 — trước Orchestrator weekly cycle 06:00) cho mỗi `(agent_code, client_id)` có ≥ 10 memory documents mới hoặc `refresh_after_consolidation=true`:

class ReflectionsContext(TypedDict):

summary\\\_text: str

qa\\\_pairs: list\\\[dict\\\]

refreshed\\\_at: datetime | None

def get\_or\_refresh\_mental\_model(agent\_code: str, client\_id: UUID) \-\> ReflectionsContext:

"""

Gọi Hindsight Mental Models API trên memory\\\_bank \\= get\\\_memory\\\_bank\\\_id(agent\\\_code, client\\\_id).

Trả về living document/Q\\\&A đã refresh nếu cần.

"""

Mental Models được inject vào context packet qua key `reflections` để giữ compatibility với C4/Tầng 2\. Shape cố định:

{

"summary\_text": "Agent D01 nên viết giọng ấm, tránh từ quá formal cho Bardinh.",

"qa\_pairs": \[

{"question": "Tone nào thường bị reject?", "answer": "Quá formal hoặc quá sang trọng."}

\],

"refreshed\_at": "2026-06-13T00:00:00Z"

}

Nếu Mental Models lỗi/timeout, vẫn trả cùng shape rỗng: `{ "summary_text": "", "qa_pairs": [], "refreshed_at": null }`.

**FR-MEM-08 — LLM extraction model riêng (MUST)** Hindsight dùng **Gemini Flash** (model riêng, rẻ, nhanh) cho các tác vụ extraction nội bộ (tóm tắt, rút entity cho Graph retrieval, generate Mental Models). Model này **không tính vào `llm_usage`** của agent — nhưng vẫn phải được ghi nhận vào `internal_llm_usage` hoặc cơ chế cost tracking nội bộ tương đương, có `client_id` khi xác định được, để tránh chi phí memory extraction bị ẩn khỏi unit economics của pilot.

**FR-MEM-09 — Cleanup / retention policy (MUST)** Hindsight tự quản lý storage nội bộ, nhưng CrewLab vẫn cần policy ở application level để tránh Memory Bank phình quá lớn theo thời gian. Monthly Celery job `maintenance.prune_episodic_memory` (ngày 1 hàng tháng) dùng PostgreSQL làm source of truth để chọn `content_item_id` cần prune, rồi gọi Hindsight delete theo `document_id = str(content_item_id)`.

- Giữ lại: mọi memory \< 180 ngày, mọi memory có `eval_score >= 9.0`, mọi memory có `reject_reason` không rỗng.  
- Prune: memory \> 180 ngày, `eval_score < 9.0`, không có human feedback.

Không query Hindsight để tìm `memory_id`. Logic chuẩn:

Query PostgreSQL content\_items/content\_item\_state\_log

→ find content\_item\_id older than 180 days with eval\_score \< 9.0 and no reject\_reason/feedback

→ for each item call delete\_memory\_document(bank\_id, document\_id=str(content\_item\_id))

→ write audit\_log action='episodic\_memory\_pruned'

**FR-MEM-10 — Graceful degradation (MUST)** Nếu Hindsight service không reachable (Docker container down, timeout \> 3s): agent vẫn phải chạy được — `recall_episodic_memory()` trả về `[]` (không raise exception), `retain_episodic_memory()` log warning và queue lại record vào Redis list `pending_retain:{memory_bank_id}` để retry sau khi Hindsight khôi phục (Celery job `maintenance.retry_pending_retains` chạy mỗi 15 phút).

Pending retain payload bắt buộc gồm: `bank_id`, `document_id`, `tags`, `payload`, `created_at`, `attempt_count`.

##### 3.3. Non-Functional Requirements

**NFR-MEM-01 — Latency** Recall call (4 channels song song) phải hoàn thành trong \< 300ms p99 cho top\_k=5. Retain call phải hoàn thành trong \< 200ms p99 (async-friendly — không block agent task quá lâu).

**NFR-MEM-02 — Resource footprint** Hindsight container phải hoạt động ổn định trong giới hạn ≤ 1.5GB RAM trên VPS CAX21 (8GB tổng, chia sẻ với ChromaDB, Celery workers, Langfuse). Con số này giả định đã dùng external-DB variant trỏ vào Supabase/schema riêng. Nếu dùng standalone bundle có PostgreSQL embedded, NFR này không còn đúng và không được xem là pass cho pilot. Nếu Hindsight cần nhiều hơn ở scale 30+ clients, đây là input cho quyết định nâng cấp VPS (xem Scale Roadmap, Section 8).

**NFR-MEM-03 — Backup** Hindsight application volume phải được backup nếu có state ngoài database. Dữ liệu PostgreSQL của Hindsight nằm trong Supabase/schema riêng và đi theo backup policy của Supabase/C1, không tạo backup PostgreSQL thứ hai trên VPS.

**NFR-MEM-04 — Isolation** Recall/Retain trên Memory Bank của client A không được ảnh hưởng latency hoặc data của Memory Bank client B — verify bằng test concurrent calls.

##### 3.4. Acceptance Criteria

**AC-MEM-01:** Agent D01 chạy task `D01_facebook_social_post` cho client X → sau khi complete, `retain_episodic_memory()` gọi Hindsight Retain với `document_id=str(content_item_id)`, tags gồm `client:{id}`, `agent:D01`, `task_type:D01_facebook_social_post`, và trả `{success, bank_id, items_count, async, operation_id}`. Không có code path nào yêu cầu `memory_id`.

**AC-MEM-02:** Agent D01 chạy task lần thứ hai cho cùng client/task\_type → Recall dùng `tags_match="all_strict"` và trả về memory đúng client/agent/task\_type; `build_context_packet()` trả về `episodic` field chứa section "Lịch sử task gần nhất" với data Recall từ lần trước.

**AC-MEM-03:** User reject content với `reject_reason = 'tone_wrong'` trên Portal → trong vòng 1 Celery task cycle, hệ thống gọi Retain lại cùng `document_id=str(content_item_id)` để upsert payload có `reject_reason='tone_wrong'` và `feedback_text`; Recall sau đó thấy feedback mới.

**AC-MEM-04:** Memory bank `D01_{client_x_id}` có ≥ 10 memory documents trong 4 tuần → Celery job `maintenance.refresh_mental_models` chạy → `get_or_refresh_mental_model()` trả `reflections` shape cố định với `summary_text` không rỗng hoặc `qa_pairs` không rỗng; không dùng Recall với `task_type='reflection'`.

**AC-MEM-05:** Monthly prune job chạy → PostgreSQL chọn content item có `created_at < now() - interval '180 days'`, `eval_score = 7.5`, không có `reject_reason`/feedback → gọi Hindsight delete theo `document_id=str(content_item_id)`. Content item có `eval_score = 9.5` hoặc có `reject_reason='tone_wrong'` dù \> 200 ngày → không gọi delete.

**AC-MEM-06:** Dừng Hindsight container (`docker stop hindsight`) → agent task vẫn chạy được (không crash), `recall_episodic_memory()` trả về `[]`, `retain_episodic_memory()` log warning và queue payload gồm `bank_id`, `document_id`, `tags`, `payload`. Khởi động lại Hindsight → job `maintenance.retry_pending_retains` flush queue thành công.

**AC-MEM-07:** Hai Celery workers đồng thời Retain cùng `document_id` vào cùng memory bank → không crash, không tạo duplicate memory document; kết quả Recall là một document latest-version/last-write-wins có payload hợp lệ. Hai workers Retain hai `document_id` khác nhau → cả hai documents đều retrievable.

##### 3.5. Assumptions

- 5 memory records gần nhất (top\_k=5) đủ context cho "Lịch sử task gần nhất". Có thể tăng lên 10 nếu cần — test với data thật.  
- Gemini Flash API key cho Hindsight extraction được cấp riêng, theo dõi cost độc lập trong `internal_llm_usage` hoặc cost ledger nội bộ, không cộng vào `clients.monthly_budget_usd` mặc định.  
- Hindsight delete theo `document_id` là hard requirement cho retention/offboarding. Nếu không hỗ trợ, Hindsight không pass decision gate.

---

#### C4 — Celery Task Architecture \+ Heartbeat Context Packet Pattern (CẬP NHẬT — bổ sung)

##### 4.1. Purpose

Quản lý toàn bộ async task execution: agent runs, scheduled cycles, content publishing, cleanup jobs. Redis làm message broker và result backend. Celery Beat là cron scheduler, Celery Flower là monitoring dashboard. Đây là "hệ thần kinh" của CrewLab.

**Thay đổi so với v2.0:** Kiến trúc Celery cốt lõi (task registry, idempotency, dead letter, queue routing, Beat schedule, timeout, quota check) **giữ nguyên** — xem v2.0 §Component 4 cho FR-CL-01 đến FR-CL-08 đầy đủ, tóm tắt lại ở 4.2 dưới đây. Bổ sung mới: **`build_context_packet()`** chuẩn hóa và field **`wake_reason`** — borrow concept từ Paperclip (TypeScript "company OS" cho AI agents, 67k stars, MIT — đã research, quyết định KHÔNG fork, chỉ borrow 3 concept: context packet, wake\_reason, coalescing).

##### 4.2. Kiến trúc Celery cốt lõi (giữ nguyên v2.0 — tóm tắt)

**Key FRs (MUST):**

- Task registry tập trung (`tasks/registry.py`): mỗi task có `name`, `queue`, `max_retries`, `default_retry_delay`, idempotency key pattern (ví dụ `write:{client_id}:{content_item_id}:{attempt}`).  
- Idempotency enforcement qua Redis (`idem:{task_name}:{key}`, TTL 24h, `SET NX`).  
- Dead letter queue: fail sau retries → insert `task_failures`, update state liên quan, Telegram alert, move sang `celery:dead_letter:{client_id}` để Agency Admin retry thủ công.  
- 4 queues với priority routing: `high_priority` (publish, orchestrator weekly cycle), `normal` (agents.*, analytics.*, ingest), `low_priority` (maintenance.*, quota.*), `ingest` (dedicated).  
- Beat schedule database-backed (`celery-sqlalchemy-scheduler`), per-client, register/unregister khi onboard/offboard.  
- Task timeout: soft/hard limit theo nhóm (agent runs 120s/180s, publish 30s/60s, ingest 150s/200s, maintenance 300s/600s).  
- `quota.check_all_clients` daily: ≥80% budget → email cảnh báo; ≥100% → `quota_exceeded` flag trong Redis, agent task từ chối chạy.

**Key NFRs:** 4 workers xử lý \~200 tasks/tuần cho 10 clients thoải mái; Redis `maxmemory 512mb`, `allkeys-lru`; `acks_late=True` cho worker restart recovery; Celery Flower internal-only; Beat single process với `restart: always`.

**Key ACs:** Idempotency key trùng trong 24h → skip lần 2; fail 3 lần → dead letter \+ Telegram alert; quota 105% → agent bị từ chối "quota exceeded"; kill worker giữa task → re-queue, không mất task; onboard client → schedule xuất hiện trong Beat DB và trigger đúng tuần sau.

##### 4.3. MỚI — Heartbeat Context Packet Pattern

**FR-CL-09 — `build_context_packet()` chuẩn hóa (MUST)**

Thay vì mỗi agent tự load context riêng (brand memory, episodic memory, task assignment, budget...) theo cách khác nhau, MỌI agent task phải gọi một hàm duy nhất ở đầu task để build context packet:

def build\_context\_packet(

client\\\_id: UUID,

agent\\\_code: str,

wake\\\_reason: str,

task\\\_context: dict | None \\= None,  \\\# ví dụ: { "brief": "...", "content\\\_item\\\_id": "..." }

) \-\> dict:

"""

Tổng hợp toàn bộ context cần thiết cho agent trước khi thực thi.

PHẢI gọi qua các interface đã chuẩn hóa ở C1, C2, C3 — KHÔNG query trực tiếp.

"""

return {

    "identity": load\\\_agent\\\_config(client\\\_id, agent\\\_code),       \\\# C1: agent\\\_configs (latest active version)

    "brand\\\_memory": query\\\_brand\\\_memory(                          \\\# C2

        client\\\_id=client\\\_id,

        query\\\_text=task\\\_context.get("brief", "") if task\\\_context else "",

        collections=\\\["brand\\\_identity", "campaign\\\_context", "performance\\\_patterns"\\\],

        top\\\_k=5,

    ),

    "episodic": recall\\\_episodic\\\_memory(                          \\\# C3 (Hindsight)

        agent\\\_code=agent\\\_code,

        client\\\_id=client\\\_id,

        task\\\_type=resolve\\\_task\\\_type(agent\\\_code, task\\\_context),

        query\\\_text=task\\\_context.get("brief", "") if task\\\_context else "",

        top\\\_k=5,

    ),

    "reflections": get\\\_or\\\_refresh\\\_mental\\\_model(                  \\\# C3 — FR-MEM-07

        agent\\\_code=agent\\\_code,

        client\\\_id=client\\\_id,

    ),

    "assignments": db.get\\\_pending\\\_tasks(client\\\_id, agent\\\_code),  \\\# C1: content\\\_items pending cho agent này

    "budget\\\_status": quota.get\\\_status(client\\\_id),                \\\# C1: llm\\\_usage vs monthly\\\_budget\\\_usd

    "wake\\\_reason": wake\\\_reason,

}

Output của `build_context_packet()` là **input chuẩn duy nhất** mà mọi agent prompt template nhận — Tầng 3 (Agent Contract Templates) sẽ định nghĩa cách từng agent map các field này vào prompt, nhưng cấu trúc dict trả về thì cố định ở Tầng 1\.

**Thứ tự inject vào prompt (chuẩn hóa):**

1. `identity` (system prompt / persona)  
2. `brand_memory` (RAG context)  
3. `reflections` (Mental Models — section "=== Insight tổng hợp \===")  
4. `episodic` (lịch sử task gần nhất — section "=== Lịch sử task gần nhất \===")  
5. `assignments` \+ `task_context` (brief cụ thể của task hiện tại)  
6. `wake_reason` (có thể ảnh hưởng instruction — xem FR-CL-10)

`reflections` luôn là dict cố định shape, kể cả khi Hindsight/Mental Models lỗi:

{

"summary\_text": "",

"qa\_pairs": \[\],

"refreshed\_at": null

}

**FR-CL-10 — `wake_reason` field bắt buộc trong mọi task kwargs (MUST)**

Mọi Celery task của agent (không áp dụng cho `maintenance.*`, `quota.*`, `ingest.*`) phải nhận thêm argument `wake_reason: str` với giá trị thuộc enum:

| `wake_reason` | Khi nào xảy ra | Ảnh hưởng đến agent behavior |
| :---- | :---- | :---- |
| `scheduled` | Celery Beat trigger theo lịch tuần (Thứ 2\) | Agent chạy full cycle bình thường, dùng `assignments` từ Orchestrator |
| `task_assigned` | Agent khác (Orchestrator A01) dispatch task cụ thể | Agent tập trung vào `task_context` được truyền, có thể bỏ qua phần discovery |
| `manual` | Agency Admin trigger lại từ Internal App (retry, re-run) | Agent có thể nhận thêm `override_instructions` trong `task_context`, log rõ đây là manual trigger trong `audit_log` |
| `retry` | Celery tự retry sau failure | Agent nên check `episodic` để tránh lặp lại lỗi vừa fail (nếu Retain đã ghi record `FAILED` của chính lần trước) |

@celery\_app.task(name="agents.writer.social\_post")

def social\_post\_task(client\_id: str, content\_item\_id: str, wake\_reason: str, \*\*kwargs):

client \\= db.get\\\_client(UUID(client\\\_id))

assert client is not None and client.is\\\_active, f"Invalid client: {client\\\_id}"

packet \\= build\\\_context\\\_packet(

    client\\\_id=UUID(client\\\_id),

    agent\\\_code="D01",

    wake\\\_reason=wake\\\_reason,

    task\\\_context={"content\\\_item\\\_id": content\\\_item\\\_id, \\\*\\\*kwargs},

)

\\\# packet được truyền cho agent (Tầng 3 định nghĩa cách dùng)

...

**FR-CL-11 — Coalescing cho task trùng lặp gần nhau (SHOULD — borrow từ Paperclip)**

Nếu nhiều `wake_reason='task_assigned'` cho cùng `(agent_code, client_id, task_type)` được dispatch trong cùng một khoảng ngắn (ví dụ Orchestrator dispatch nhiều content item cùng pillar gần nhau), hệ thống nên **coalesce** thành một lần gọi `build_context_packet()` (context không đổi trong vài giây) nhưng vẫn chạy task riêng cho từng `content_item_id`. Implementation: cache context packet trong Redis với TTL ngắn (10s), key \= `context_packet:{agent_code}:{client_id}:{task_type}`. Đây là optimization giảm số lần gọi Hindsight Recall/ChromaDB query, không thay đổi logic nghiệp vụ.

##### 4.4. Non-Functional Requirements (bổ sung)

**NFR-CL-06 — Context packet build latency** `build_context_packet()` (không tính coalescing cache hit) phải hoàn thành trong \< 600ms p99 (300ms Hindsight Recall \+ 200ms ChromaDB query \+ \<100ms PostgreSQL queries, có thể chạy song song bằng `asyncio.gather`).

**NFR-CL-07 — Fail-soft cho từng nguồn context** Nếu một trong các nguồn (`brand_memory`, `episodic`, `reflections`, `assignments`, `budget_status`) lỗi/timeout, `build_context_packet()` KHÔNG được raise exception cho toàn bộ packet — trả về giá trị rỗng/default có type cố định và log warning. Defaults: `brand_memory=[]`, `episodic=[]`, `reflections={"summary_text": "", "qa_pairs": [], "refreshed_at": None}`, `assignments=[]`, `budget_status` dùng safe default từ quota module. Agent task vẫn tiếp tục chạy với context thiếu một phần, thay vì fail toàn bộ.

##### 4.5. Acceptance Criteria (bổ sung)

**AC-CL-08:** Gọi `build_context_packet(client_id, "D01", "scheduled")` → trả về dict đầy đủ 7 keys (`identity`, `brand_memory`, `episodic`, `reflections`, `assignments`, `budget_status`, `wake_reason`), `wake_reason == "scheduled"`.

**AC-CL-09:** Dừng ChromaDB container trong lúc gọi `build_context_packet()` → `brand_memory == []`, các field khác vẫn populate đúng, không raise exception.

**AC-CL-10:** Dispatch 3 task `agents.writer.social_post` với `wake_reason='task_assigned'` cho cùng client/agent trong vòng 5 giây → Hindsight Recall và ChromaDB query chỉ được gọi 1 lần (verify qua Langfuse trace count), nhưng 3 content items đều được xử lý.

**AC-CL-11:** Task được Celery tự động retry (`wake_reason='retry'`) → `episodic` trong context packet chứa record gần nhất với status liên quan đến lần fail trước (nếu Retain đã chạy ở lần fail trước đó).

**AC-CL-12:** Dừng Hindsight/Mental Models endpoint trong lúc gọi `build_context_packet()` → `reflections == {"summary_text": "", "qa_pairs": [], "refreshed_at": None}`, không trả `null`, không raise exception.

---

#### C5 — Ingest Pipeline: Docling \+ Chonkie (CẬP NHẬT TOÀN BỘ)

##### 5.1. Purpose

Background job xử lý brand documents khi client upload — extract text, chunk, embed, index vào ChromaDB. **Không phải agent** — deterministic pipeline, không cần LLM decision-making. Đây là cổng dữ liệu brand vào hệ thống: nếu pipeline sai, mọi content agent generate sau đó đều sai.

**Thay đổi so với v2.0:**

- **Text extraction**: thay PyMuPDF (`fitz`) \+ `python-docx` bằng **Docling** (IBM, 61k stars, MIT/Apache) — 1 API xử lý PDF/DOCX/PPTX/XLSX, preserve structure (headings, tables, lists) tốt hơn extract thô.  
- **Chunking**: thay `RecursiveCharacterTextSplitter` bằng **Chonkie** — semantic chunking, hỗ trợ multilingual bao gồm tiếng Việt, chunk theo ý nghĩa thay vì chỉ theo ký tự/separator.  
- Đây là **drop-in upgrade** ở tầng xử lý nội dung — trigger, validation, embedding, ChromaDB indexing, status tracking, notification, re-ingest vẫn giữ logic cũ. Riêng bước ghi ChromaDB dùng **tmp collection swap** làm canonical path để tránh mất dữ liệu nếu worker crash giữa chừng.

##### 5.2. Functional Requirements

**FR-IN-01 — Trigger flow (MUST, giữ nguyên)** Client Admin/Agency Admin upload file qua Portal → FastAPI `POST /api/brand-docs/upload` → validate → lưu Supabase Storage → INSERT `brand_documents` với `ingest_status='pending'` → enqueue Celery task `ingest.brand_docs` với `document_id`.

**FR-IN-02 — File validation (CẬP NHẬT — mở rộng file\_type)** Vì Docling hỗ trợ nhiều format hơn, mở rộng danh sách `file_type` hợp lệ:

- `file_type` phải thuộc: `pdf`, `docx`, `pptx`, `xlsx`, `txt` (check MIME type, không chỉ extension). PPTX/XLSX hữu ích cho brand deck hoặc bảng sản phẩm dạng spreadsheet.  
- `file_size` phải ≤ 10MB.  
- `client_id` phải tồn tại và `is_active = true`.  
- File không được rỗng (0 bytes).

Validation fail → HTTP 400, không tạo record `brand_documents`, không enqueue task.

**FR-IN-03 — Text extraction bằng Docling (MUST — THAY THẾ FR-IN-03 v2.0)**

from docling.document\_converter import DocumentConverter

def extract\_document(file\_path: Path, file\_type: str) \-\> ExtractedDoc:

"""

Docling xử lý PDF, DOCX, PPTX, XLSX trong 1 API duy nhất.

Output: cấu trúc document preserve headings, tables, lists, reading order.

"""

converter \\= DocumentConverter()

result \\= converter.convert(str(file\\\_path))

return result.document  \\\# DoclingDocument — có thể export markdown hoặc structured JSON

- **PDF**: Docling tự xử lý layout, OCR (nếu cần cho scanned PDF — bật `do_ocr=True`), bảng được nhận diện như table structure (không phải text thô join bằng `\t`).  
- **DOCX/PPTX/XLSX**: Docling extract content \+ structure (headings → markdown `#`, tables → markdown tables, slide text cho PPTX, sheet/cell cho XLSX).  
- **TXT**: Docling không cần cho TXT — giữ logic cũ (decode UTF-8, fallback UTF-16/Latin-1).

Output chuẩn hóa: convert `DoclingDocument` sang **Markdown** trước khi đưa vào Chonkie — Markdown giữ structure (headings, bullet, table) giúp Chonkie chunk theo ý nghĩa chính xác hơn so với plain text.

Nếu extracted content rỗng (PDF chỉ có ảnh và `do_ocr=False`, hoặc OCR fail) → `ingest_status='failed'`, `ingest_error='no_text_extracted'` → alert Agency Admin. Nếu file scanned (cần OCR) → bật `do_ocr=True` mặc định cho PDF (đổi từ v2.0 — trước đây bỏ qua ảnh hoàn toàn).

**FR-IN-04 — Canonical write path bằng tmp collection swap (MUST, cập nhật từ v2.0)** Không dùng delete-before-insert làm luồng chính vì có thể làm mất collection đang dùng nếu INSERT fail sau DELETE. Luồng chính bắt buộc:

Upload file

→ extract \+ chunk \+ embed

→ tạo collection \`\_tmp\`

→ insert chunks vào \`\_tmp\`

→ health check \`\_tmp\`

→ swap \`\_tmp\` thành collection chính

→ cleanup collection cũ / tmp orphan

Nếu crash trước swap, `_tmp` có thể tồn tại nhưng collection chính vẫn giữ data cũ (hoặc empty nếu lần đầu). Cleanup job phát hiện và xóa `_tmp` orphan. Delete-by-file chỉ được dùng như fallback nhỏ khi replace 1 file và đã có test chứng minh không làm hỏng collection chính.

**FR-IN-05 — Chunking bằng Chonkie (MUST — THAY THẾ FR-IN-05 v2.0)**

from chonkie import SemanticChunker

from chonkie.refinery import EmbeddingsRefinery

def chunk\_document(markdown\_text: str, client\_id: str) \-\> list\[ChunkWithEmbedding\]:

"""

Chonkie SemanticChunker tạo semantic chunks từ sentence-level embeddings.

EmbeddingsRefinery tổng hợp sentence-level embeddings thành chunk-level embeddings

để có thể truyền thẳng vào ChromaDB, tránh double-embed ở FR-IN-06/07.

"""

chunker \\= SemanticChunker(

    embedding\\\_model="text-embedding-3-small",  \\\# cùng model dùng để index ChromaDB (NFR-CH-02)

    chunk\\\_size=500,        \\\# tokens, approximate ceiling

    min\\\_chunk\\\_size=50,     \\\# tokens — chunk quá ngắn được merge với chunk kề

)

sentence\\\_chunks \\= chunker.chunk(markdown\\\_text)

refinery \\= EmbeddingsRefinery()

return refinery.refine(sentence\\\_chunks)

So với RecursiveCharacterTextSplitter (v2.0):

- Chonkie chunk theo **semantic boundary** — một đoạn nói về "tone of voice" và một đoạn nói về "sản phẩm" sẽ không bị gộp chung một chunk dù liền kề, ngay cả khi cả hai dưới 500 tokens.  
- Vẫn giữ ràng buộc `chunk_size ≈ 500 tokens`, `min_chunk_size = 50 tokens` (chunk quá ngắn → merge), tương đương yêu cầu cũ.  
- Markdown structure từ Docling (headings, tables) giúp Chonkie nhận diện boundary tốt hơn — heading mới thường là dấu hiệu mạnh cho semantic boundary.  
- `chunk_overlap` không cần config thủ công như RecursiveCharacterTextSplitter — Chonkie tự xử lý overlap dựa trên semantic continuity.  
- `SemanticChunker` có thể tạo sentence-level embeddings trong lúc chunking; bắt buộc dùng `EmbeddingsRefinery` để tạo chunk-level embeddings và reuse chúng ở bước ChromaDB indexing.

**FR-IN-06 — Embedding (MUST, cập nhật để tránh double-embed)** Model `text-embedding-3-small` (OpenAI, dimensions=1536). Nếu Chonkie \+ `EmbeddingsRefinery` đã tạo chunk-level embeddings hợp lệ, hệ thống phải reuse embeddings đó và KHÔNG gọi embedding API lần hai cho cùng chunk. Nếu pipeline không trả embeddings hợp lệ, fallback mới batch 100 chunks/API call. Retry 2 lần (10s, 40s exponential backoff) nếu fail → `ingest_status='failed'`, `ingest_error='embedding_api_error'`.

**FR-IN-07 — ChromaDB indexing (MUST, giữ nguyên v2.0)** Insert batch 50 chunks/`.add()` call. Khi chunk-level embeddings đã có từ FR-IN-05/06, pass `embeddings=` trực tiếp vào `chroma.add()`; không để ChromaDB wrapper tự embed lại text. Metadata đầy đủ theo FR-CH-02 (C2) — bổ sung field `source_format` (`pdf|docx|pptx|xlsx|txt`) vào metadata `brand_identity` để trace nguồn gốc chunk khi cần debug Docling output. Health check sau insert (query dummy text → ≥1 result).

**FR-IN-08 — Status tracking (MUST, giữ nguyên v2.0)** `brand_documents.ingest_status`: `pending → processing → done|failed`. `ingest_error` ghi error code ngắn (không full traceback).

**FR-IN-09 — Portal notification (MUST, giữ nguyên v2.0)** Supabase Realtime event đến channel `client_{client_id}`: `brand_docs_updated` (success, kèm `chunk_count`) hoặc `brand_docs_failed` (kèm `ingest_error`).

**FR-IN-10 — Re-ingest capability (MUST, giữ nguyên v2.0)** Agency Admin trigger re-ingest cho `document_id` đã fail từ Internal App → reset `ingest_status='pending'` → enqueue task mới. Không tự động re-ingest.

**FR-IN-11 — Atomic rename strategy (MUST, giữ nguyên v2.0 nhưng là canonical path)** Tạo collection `_tmp` → insert chunks → health check → atomic rename/swap (collection chính chỉ bị thay sau khi `_tmp` đã pass health check). Crash trước swap → `_tmp` tồn tại, collection chính giữ data cũ, cleanup job phát hiện và xóa `_tmp`. Nếu ChromaDB không hỗ trợ rename atomic đúng nghĩa, dev phải implement swap sequence có downtime tối thiểu và ghi rõ behavior trong spike/test report.

**FR-IN-12 — Task prompt attachments và context ingestion (MUST, BỔ SUNG)**

Ngoài upload brand document ở Brand Settings, hệ thống phải cho phép Client Admin/Agency Admin đính kèm file trực tiếp khi nhập prompt/giao task cho hệ thống. Đây là context theo task/campaign, không mặc định trở thành brand memory dài hạn.

Supported prompt attachments:

- document: `pdf`, `docx`, `pptx`, `xlsx`, `txt`, `md`;  
- image: `png`, `jpg`, `jpeg`, `webp`;  
- max file size: 10MB/file ở MVP;  
- mỗi task/campaign tối đa 10 attachments.

Flow bắt buộc:

User nhập prompt \+ upload attachments

→ validate MIME/size/client scope

→ lưu file vào Supabase Storage

→ INSERT task\_attachments

→ extract context

→ gắn extracted\_context vào task\_context/campaign\_context

→ build\_context\_packet() inject vào prompt agent liên quan

Minimum `task_attachments` fields:

id uuid primary key

client\_id uuid not null

task\_id uuid null

campaign\_id uuid null

content\_item\_id uuid null

uploaded\_by\_user\_id uuid not null

storage\_path text not null

file\_name text not null

file\_type text not null

attachment\_kind text not null          \# document | image

extracted\_context jsonb null

asset\_id uuid null                     \# nếu attachment\_kind \= image

created\_at timestamptz

Rules:

- Document attachments dùng cùng Docling/Chonkie pipeline như C5, nhưng index vào `campaign_context_{client_id}` nếu gắn với campaign/event, hoặc truyền vào `task_context.attachments_context` nếu chỉ dùng một lần.  
- Image attachments phải được lưu vào C7 `brand_assets` với `source='client_uploaded'` hoặc `agency_uploaded`, `status='pending_review'`. Nếu ảnh được gửi để đáp ứng `asset_request`, phải link `asset_request_id` và `content_item_id`.  
- Image understanding ở MVP dùng vision model để tạo `alt_text`, `tags`, `quality_score`, `orientation`, `contains_people`, sau đó cho phép người dùng/admin sửa metadata trước khi approve.  
- Attachment context phải có nguồn trích dẫn rõ: `file_name`, `file_type`, `attachment_id`, `page_or_slide` nếu có.  
- Agent không được đọc binary trực tiếp. Agent chỉ nhận text/metadata/asset IDs đã qua pipeline trong `build_context_packet()`.

##### 5.3. Non-Functional Requirements

**NFR-IN-01 — End-to-end latency (CẬP NHẬT)** File 10MB phải xử lý hoàn toàn (Celery task bắt đầu → ChromaDB indexed) trong \< 3 phút. Docling extraction (đặc biệt với OCR bật cho PDF scan) chậm hơn PyMuPDF thô — nếu file cần OCR và vượt 3 phút, hệ thống vẫn phải hoàn thành nhưng nên log warning để Agency Admin biết file đó "nặng". Nếu vượt `hard_time_limit` của task `ingest.brand_docs` (200s — FR-CL-06), task fail và vào dead letter với error rõ ràng (`ocr_timeout` hoặc `docling_extract_error`). Không xử lý file ngoài hệ thống để thay thế automation; nếu file quá kém chất lượng, yêu cầu client cung cấp file tốt hơn là một scope/input requirement, không phải manual fallback.

**NFR-IN-02 — API rate limit compliance (giữ nguyên)** OpenAI Embedding API 1,000,000 tokens/phút — không có risk với volume hiện tại (10 files × 10,000 tokens/phút ≈ 100,000 tokens/phút).

**NFR-IN-03 — Idempotency (giữ nguyên)** Ingest task cho cùng `document_id` idempotent — chạy 2 lần không tạo duplicate chunks.

**NFR-IN-04 — Storage cleanup (giữ nguyên)** File trong Supabase Storage giữ suốt vòng đời client để re-ingest. Offboarding Script xóa khi offboard.

**NFR-IN-05 — Memory efficiency (CẬP NHẬT)** Docling load toàn bộ document vào memory để phân tích structure (khác với PyMuPDF page-by-page streaming cũ) — với file 10MB, Docling typically dùng 200–400MB RAM. Không để một ingest task vượt 500MB RAM (giữ ngưỡng cũ). Nếu Docling \+ Chonkie cho file 10MB thực tế vượt ngưỡng này khi test, cần giảm `ingest` queue concurrency xuống 1 worker tại một thời điểm (đã là 1 theo FR-CL-04).

##### 5.4. Acceptance Criteria

**AC-IN-01:** Upload PDF 5MB có text layer hợp lệ → `ingest_status: pending → processing → done` trong vòng 3 phút. ChromaDB collection `brand_identity_{client_id}` có `chunk_count > 0`, mỗi chunk có metadata `source_format = 'pdf'`.

**AC-IN-02:** Upload file `.exe` hoặc MIME type không hợp lệ → HTTP 400, không tạo `brand_documents` record, không enqueue task.

**AC-IN-03:** Upload PDF scan (không có text layer, OCR bật) → Docling OCR extract được text → ingest thành công. Nếu OCR cũng fail (ảnh quá mờ) → `ingest_status='failed'`, `ingest_error='no_text_extracted'`, Telegram alert.

**AC-IN-04:** Upload file PPTX brand deck → Docling extract slide text \+ bố cục → Chonkie chunk theo từng slide/section semantic → chunks có `source_format = 'pptx'` trong ChromaDB.

**AC-IN-05:** So sánh chunking output của Chonkie vs RecursiveCharacterTextSplitter trên cùng 1 brand guideline doc tiếng Việt có heading rõ ràng (ví dụ "1. Tone of Voice", "2. Sản phẩm chính") → verify chunks của Chonkie không trộn nội dung giữa 2 section khác nhau trong cùng 1 chunk, trong khi RecursiveCharacterTextSplitter có thể trộn nếu gần ranh giới `chunk_size`.

**AC-IN-06:** Kill Celery worker trước tmp collection swap → collection `_tmp` tồn tại, collection chính giữ data cũ (hoặc empty nếu lần đầu) → query vẫn trả kết quả hợp lệ.

**AC-IN-07:** Upload file mới cùng tên file cũ → sau tmp swap, query chỉ trả chunks mới, không duplicate; nếu swap fail, query vẫn trả data cũ thay vì collection hỏng.

**AC-IN-08:** Ingest 5 files đồng thời (cùng client) → tất cả thành công, collection consistent sau khi xong.

**AC-IN-09:** Sau ingest thành công, Portal nhận Supabase Realtime event `brand_docs_updated` trong vòng 5 giây.

**AC-IN-10:** User nhập prompt kèm PDF/DOCX/MD → attachment được extract, lưu source metadata, và xuất hiện trong `build_context_packet().task_context.attachments_context`.

**AC-IN-11:** User nhập prompt kèm PNG/JPG → file được lưu vào C7 `brand_assets`, auto-tag metadata, và agent chỉ nhận asset ID/metadata chứ không đọc binary trực tiếp.

##### 5.5. Assumptions

- Docling cần được `pip install docling` — verify compatibility với Python version trong Docker image (FastAPI/Celery worker image) trước khi build.  
- `do_ocr=True` mặc định cho PDF làm tăng latency — cần test với sample PDF thật (có và không có text layer) để xác nhận vẫn đạt NFR-IN-01 trong đa số trường hợp.  
- Chonkie `SemanticChunker` gọi embedding model trong lúc chunking (để đo semantic similarity); FR-IN-05/06 đã chốt dùng `EmbeddingsRefinery` để reuse chunk-level embeddings và tránh gọi OpenAI API 2 lần cho cùng nội dung.  
- `text-embedding-3-small` vẫn là model cho cả Chonkie similarity và ChromaDB indexing — giữ nguyên giả định NFR-CH-02 (embedding consistency).

---

#### C6 — Multi-tenant Isolation Model (giữ nguyên v2.0 — tóm tắt, mở rộng cho Hindsight)

**Purpose:** Đảm bảo data của client A không bao giờ accessible/visible/ảnh hưởng đến client B, dù chạy chung một VPS, một PostgreSQL instance, một ChromaDB directory, một Hindsight instance.

**Key FRs (MUST):**

- **RLS trên mọi table** có `client_id` — 2 policies (Agency Admin full access, Client chỉ thấy data của mình); Celery workers dùng `SUPABASE_SERVICE_ROLE_KEY` bypass RLS.  
- **ChromaDB namespace**: collection name luôn có `client_id`, interface duy nhất `get_collection()` — không gọi `chroma_client.get_collection()` trực tiếp.  
- **Celery `client_id` propagation**: mọi task nhận `client_id` bắt buộc, validate UUID \+ client active trước khi làm gì khác.  
- **Hindsight Memory Bank naming** (FR-MEM-02, mới — mở rộng nguyên tắc của FR-MT-04 SQLite cũ): `get_memory_bank_id(agent_code, client_id)` là interface duy nhất, naming luôn chứa `client_id`.  
- **Audit trail cho mọi data access**: agent đọc ChromaDB hoặc Hindsight, ghi episodic memory → log vào `audit_log` với `actor_type='agent'`, `entity_type ∈ {chromadb_collection, hindsight_memory_bank}`. Nếu `metadata.client_id` ≠ embedded client\_id trong `entity_id` → `action='SECURITY_BREACH'` → Telegram alert ngay.  
- **Service role key protection**: chỉ trong Celery workers \+ onboarding/offboarding scripts, inject qua env var, không log, không hardcode.  
- **Offboarding cleanup** (thứ tự bắt buộc): deactivate client → unregister Beat schedules → xóa ChromaDB text collections \+ `visual_assets_{client_id}` → **xóa Hindsight Memory Banks của client** (mới, thay cho "xóa SQLite files") → xóa Supabase Storage files gồm brand docs và media assets → archive/anonymize PostgreSQL records (không DELETE audit-critical records) → ghi audit log `client_offboarded`.  
- **Cross-client query prevention**: không có query nào lấy data nhiều client cùng lúc mà không qua Agency Admin context.

**Key NFRs:** RLS overhead \< 10ms; zero tolerance cross-tenant leak (incident → notify \+ review \+ patch trong 24h); service role key rotation không downtime; audit log retention ≥ 2 năm.

**Key ACs:** Client A query không filter → chỉ thấy data A; agent client A gọi `get_collection("brand_identity", client_B_id)`, `retrieve_visual_assets(client_B_id, ...)` hoặc `get_memory_bank_id("D01", client_B_id)` với sai context → raise error trước khi query thật; sai client\_id trong access → `SECURITY_BREACH` audit \+ Telegram trong 30s; `SUPABASE_SERVICE_ROLE_KEY` không xuất hiện trong log; offboard client A → ChromaDB collections \+ Hindsight memory banks \+ visual assets \+ Storage files của A bị xóa/archived theo policy, PostgreSQL record anonymize, audit log đầy đủ; offboard xong → client A không login được, Celery schedule biến mất.

---

#### C7 — Brand Asset / Media Library (BỔ SUNG — ảnh thật, video, visual source)

**Purpose:** Lưu trữ, phân loại, tìm kiếm và kiểm soát quyền sử dụng mọi media asset của client: ảnh sản phẩm thật, ảnh quán, ảnh nhân sự, ảnh sự kiện, logo, template, background, video ngắn, và output thiết kế đã generated/approved. Đây là nền để D02 Image Design lấy đúng source ảnh cho từng bài, và để workflow tạo Asset Request khi thiếu ảnh phù hợp.

**Lý do cần C7:** Với Bardinh Coffee và đa số SME, bài social không thể chỉ dùng ảnh AI. Ảnh thật của sản phẩm/quán là bằng chứng thương hiệu. Nếu không có Media Library chuẩn, D02 sẽ dễ dùng sai ảnh, dùng ảnh không có quyền, hoặc tạo visual đúng caption nhưng sai thực tế brand.

##### C7.1. Storage Model

File gốc lưu trong Supabase Storage, không lưu binary trong PostgreSQL.

/clients/{client\_id}/assets/raw\_uploads/

/clients/{client\_id}/assets/products/

/clients/{client\_id}/assets/interior/

/clients/{client\_id}/assets/exterior/

/clients/{client\_id}/assets/staff/

/clients/{client\_id}/assets/events/

/clients/{client\_id}/assets/logo/

/clients/{client\_id}/assets/templates/

/clients/{client\_id}/assets/generated/

PostgreSQL lưu metadata trong `brand_assets`; ChromaDB lưu semantic index trong `visual_assets_{client_id}`.

##### C7.2. `brand_assets` Metadata Schema

Minimum fields:

id uuid primary key

client\_id uuid not null

storage\_path text not null

asset\_type text not null

format text not null                  \# image | video | logo | template

source text not null                  \# client\_uploaded | agency\_uploaded | telegram\_uploaded | generated | extracted\_from\_brand\_doc

status text not null                  \# pending\_review | approved | rejected | archived

tags text\[\] not null

related\_product\_id uuid null

campaign\_id uuid null

content\_item\_id uuid null             \# nếu asset sinh ra cho bài cụ thể

asset\_request\_id uuid null            \# nếu asset gửi để đáp ứng request cụ thể

upload\_channel text null              \# portal | telegram | internal\_app

unmatched\_upload boolean default false

orientation text                      \# square | portrait | landscape | story

width int

height int

dominant\_colors text\[\]

contains\_people boolean

usage\_rights text                     \# owned | licensed | unknown | generated

approved\_for\_use boolean default false

quality\_score numeric(3,2)

last\_used\_at timestamptz

usage\_count int default 0

created\_at timestamptz

updated\_at timestamptz

Rules:

- `approved_for_use = true` mới được đưa vào Asset Retrieval cho D02.  
- `usage_rights = unknown` không được dùng cho publish.  
- Asset có người (`contains_people = true`) cần flag consent nếu sau này client yêu cầu.  
- Generated asset phải lưu prompt/tool/source asset IDs để trace.  
- Asset gửi từ Telegram vẫn phải đi qua cùng review/approval rules như Portal upload.

##### C7.3. `visual_assets_{client_id}` ChromaDB Collection

Mỗi approved asset có một vector record để semantic search theo visual meaning.

Metadata bắt buộc:

{

"client\_id": "uuid",

"asset\_id": "uuid",

"asset\_type": "product",

"tags": \["iced\_latte", "morning", "table"\],

"related\_product\_id": "uuid|null",

"campaign\_id": "uuid|null",

"orientation": "portrait",

"approved\_for\_use": true,

"usage\_rights": "owned",

"quality\_score": 0.86,

"last\_used\_at": "2026-06-13T00:00:00Z"

}

Embedding text được tạo từ `description_text` nội bộ:

Ảnh ly bạc xỉu đá của Bardinh Coffee đặt trên bàn gỗ, ánh sáng buổi sáng, mood ấm và gần gũi.

MVP không dùng image embedding model riêng. Khi upload asset, vision model tạo `alt_text`, `tags`, và `description_text`; Client/Admin có thể sửa thủ công trước khi approve. `visual_assets_{client_id}` dùng cùng embedding model `text-embedding-3-small` với C2 để index `description_text`. Chi phí vision/auto-tag ghi vào `internal_llm_usage`.

##### C7.4. Asset Retrieval Interface

D02 không gọi Supabase Storage hoặc ChromaDB trực tiếp. D02 chỉ gọi interface:

def retrieve\_visual\_assets(

client\\\_id: UUID,

visual\\\_need: str,

required\\\_tags: list\\\[str\\\],

platform: str,

format: str,

real\\\_photo\\\_required: bool,

campaign\\\_id: UUID | None \\= None,

top\\\_k: int \\= 5,

) \-\> AssetRetrievalResult:

...

Return:

{

"status": "found",

"selected\_assets": \[

{

  "asset\\\_id": "uuid",

  "storage\\\_path": "clients/.../assets/products/bac\\\_xiu\\\_01.jpg",

  "match\\\_score": 0.87,

  "reason": "Matches bạc xỉu \\+ morning mood \\+ portrait format"

}

\],

"missing\_requirements": \[\]

}

Nếu không đủ asset:

{

"status": "missing\_required\_asset",

"selected\_assets": \[\],

"missing\_requirements": \["real photo of iced latte in portrait format"\],

"asset\_request\_payload": {}

}

##### C7.5. Asset Request Model

Khi `real_photo_required = true` và không có asset phù hợp, Tầng 2 tạo `asset_requests`.

Minimum fields:

id uuid primary key

client\_id uuid not null

content\_item\_id uuid null

campaign\_id uuid null

requested\_by\_agent text               \# usually D02 or A01

request\_type text                     \# product\_photo | interior\_photo | exterior\_photo | staff\_photo | event\_photo | menu\_photo

description\_for\_client text

shot\_list jsonb

example\_asset\_ids uuid\[\]

priority text                         \# low | normal | high | blocking

status text                           \# pending | submitted | approved | rejected | expired

preferred\_submission\_channel text      \# portal | telegram | any

deadline timestamptz

created\_at timestamptz

updated\_at timestamptz

Example `description_for_client`:

CrewLab cần 2 ảnh thật cho bài "cà phê sáng tại Bardinh Coffee": một ảnh ly bạc xỉu đá đặt trên bàn gần cửa sổ, và một ảnh góc quán buổi sáng có ánh sáng tự nhiên. Chụp dọc hoặc vuông, rõ sản phẩm, không cần chỉnh màu.

##### C7.6. Functional Requirements

- **FR-ASSET-01:** Upload asset qua Portal/Internal App → lưu Supabase Storage → tạo `brand_assets` với `status='pending_review'`.  
- **FR-ASSET-02:** Agency Admin hoặc Client Admin approve asset → `approved_for_use=true` → index vào `visual_assets_{client_id}`.  
- **FR-ASSET-03:** Auto-tag có thể dùng vision model, nhưng phải cho phép sửa tag thủ công.  
- **FR-ASSET-04:** D02 bắt buộc gọi `retrieve_visual_assets()` trước khi thiết kế.  
- **FR-ASSET-05:** Nếu thiếu asset bắt buộc, không được auto-generate ảnh thay thế; tạo `asset_request` và set content item `waiting_asset`.  
- **FR-ASSET-06:** Mỗi lần asset được dùng trong content item, tăng `usage_count`, set `last_used_at`, ghi audit log.  
- **FR-ASSET-07:** Asset gắn `campaign_id` hết hạn theo lifecycle campaign; không dùng lại cho evergreen nếu `campaign_restricted=true`.  
- **FR-ASSET-08:** Offboarding xóa Supabase Storage assets và ChromaDB `visual_assets_{client_id}`, PostgreSQL metadata archived/anonymized theo policy.

##### C7.7. Acceptance Criteria

| ID | Acceptance Criteria |
| :---- | :---- |
| AC-ASSET-01 | Upload ảnh ly bạc xỉu cho Bardinh → asset xuất hiện trong `brand_assets`, file nằm đúng Storage path. |
| AC-ASSET-02 | Asset chưa approved không xuất hiện trong Asset Retrieval. |
| AC-ASSET-03 | Asset approved được index vào `visual_assets_{client_id}` và query bằng "bạc xỉu buổi sáng" trả về đúng ảnh. |
| AC-ASSET-04 | D02 request ảnh sản phẩm thật nhưng không có asset phù hợp → tạo `asset_request`, item chuyển `waiting_asset`, không generate ảnh giả. |
| AC-ASSET-05 | Client upload ảnh theo asset request → asset được ingest/index → item resume từ `waiting_asset` sang `visual_matching`. |
| AC-ASSET-06 | Asset có `usage_rights='unknown'` không được dùng cho publish. |
| AC-ASSET-07 | Asset client A không bao giờ retrievable bởi client B. |

---

### 7.3. Key Features — Tầng 2: Core Workflow Layer

Tầng 2 định nghĩa cách 12 agent phối hợp trên nền Tầng 1 để biến một mục tiêu marketing thành bài đăng đã publish, có số liệu, có phân tích, và có learning loop cho vòng sau. Bản này dùng draft `PRD-CrewLab-Tang2-CoreWorkflow-v1.0_1.docx` làm reference, nhưng sửa lại theo quyết định hiện tại: full 12-agent stack cho Bardinh Coffee (11 agent marketing \+ E01 Evaluator, xem 7.3.2), không manual fallback, campaign/event mới gọi IMC Planner, Content Pillar và IMC Plan là co-pilot editable, Content Plan duyệt riêng, retry tối đa 3 lần, và có feedback-learning pipeline riêng.

#### 7.3.1. Scope Tầng 2 Cho Bardinh Coffee

**Pilot client:** Bardinh Coffee.  
**Platform:** Facebook \+ Instagram.  
**Flow đã promise:** content generation → human approval → scheduled auto-publish → analytics/reporting → machine-readable learning loop.  
**No manual fallback:** nếu một bước đã promise là automation, không được làm tay phía sau để bù. Nếu thiếu input, workflow phải tạo request hoặc fail rõ ràng.

Tầng 2 bao gồm:

- Content workflow FSM.  
- Campaign/event branching.  
- HITL gate spec.  
- Orchestrator contract.  
- Execution payload schema cấp workflow.  
- Evaluator retry logic.  
- Asset request workflow cho ảnh thật.  
- Feedback-learning pipeline.  
- Analytics-to-learning loop.

Tầng 2 không bao gồm prompt chi tiết từng agent, tool implementation chi tiết, UI layout của Portal, hay Meta Graph API error taxonomy sâu; các phần đó thuộc Tầng 3/4.

#### 7.3.2. Agent Registry — 12 Agent Chính Thức

12 agent này cố định ở cấp hệ thống (11 agent marketing \+ E01 Evaluator). Từng client chỉ khác config, platform, frequency, tone, campaign/event, asset library và rule vận hành.

| Code | Agent | Nhóm | Có đọc Brand RAG? | Có đọc Episodic/Performance Memory? | Trigger chính |
| :---- | :---- | :---- | :---- | :---- | :---- |
| A01 | Orchestrator | Orchestration | Có | Có | Beat weekly, event created, gate approved, retry, analytics done |
| B01 | IMC Planner | Strategy | Có | Có | Chỉ khi có campaign/event active |
| B02 | Content Pillar | Strategy | Có | Có | A01 dispatch; nhận IMC context nếu có event |
| B03 | Content Plan | Strategy | Có | Có | Sau khi pillar được approve |
| D01 | Caption Writer | Content | Có | Có | Sau khi content plan được approve |
| D02 | Image Design | Content | Có | Có | Sau D01; bắt buộc qua Asset Retrieval |
| E01 | Evaluator | Quality Gate | Không (nhận sẵn qua `context_packet`, xem 7.3.10) | Không | Sau D02 hoàn thành |
| F01 | Meta Publisher | Publish | Không | Không | Gate Content Approval passed \+ scheduled\_at đến hạn |
| G01 | Meta Data Collector & Cleaning | Analytics | Không | Không | T+7 sau publish |
| G02 | Descriptive Analysis | Analytics | Không | Không | G01 complete |
| G03 | Diagnostic Analysis | Analytics | Không | Không | G02 complete |
| G04 | Recommendation | Analytics | Không | **Có** (ngoại lệ — xem Rule RAG) | G03 complete |

**Rule RAG:** tất cả agent ở nhóm Orchestration, Strategy, Content được phép đọc brand memory, campaign context, visual asset metadata và episodic memory. E01 không tự gọi RAG tool — brand voice guideline cần thiết để chấm điểm đã có sẵn trong `context_packet` (Layer 2, xem A4), không cần query lại. F01 không đọc RAG vì chỉ publish payload đã approved. G01–G03 không đọc bất kỳ loại RAG/memory nào — chỉ xử lý post metrics, historical metrics, content metadata, và output đã published. **G04 là ngoại lệ duy nhất trong nhóm Analytics**: được đọc episodic memory (`T02 recall_episodic_memory`) và performance patterns (`T10 read_performance_patterns`) để tạo recommendation dựa trên pattern lịch sử — nhưng vẫn **không** được đọc brand RAG (`T01 query_brand_memory`, ChromaDB `brand_identity`/`campaign_context`), vì recommendation phải dựa trên số liệu hiệu suất thật, không dựa trên tone/brand guideline.

**System pipeline không tính vào 12 agent:** `P01 Feedback Learning Pipeline` là pipeline nội bộ, không phải agent marketing. P01 đọc feedback/chỉnh sửa của con người trên output của B03, D01, D02 và biến chúng thành learning records cho Hindsight/performance patterns/recommendation context.

#### 7.3.3. Campaign/Event Branching

Không phải tuần nào cũng chạy IMC. Bardinh Coffee có hai mode:

**Mode A — Có campaign/event active**

A01 Orchestrator

→ B01 IMC Planner

→ Strategy Gate S1: IMC Plan editable

→ B02 Content Pillar

→ Strategy Gate S2: Content Pillar editable

→ B03 Content Plan

→ Strategy Gate S3: Content Plan approval riêng

→ D01/D02/Evaluator/Approval/Publish

Ví dụ event: khai trương, menu mùa hè, workshop cà phê, ưu đãi cuối tuần, collab với brand khác.

**Mode B — Không có campaign/event active**

A01 Orchestrator

→ B02 Content Pillar

→ Strategy Gate S2: Content Pillar editable

→ B03 Content Plan

→ Strategy Gate S3: Content Plan approval riêng

→ D01/D02/Evaluator/Approval/Publish

B01 không được chạy khi không có active campaign/event. A01 phải kiểm tra `campaigns.status = active` và `campaigns.date_range` trước khi dispatch B01.

**Event cleanup rule:** mọi pillar, angle, campaign context và content plan sinh riêng từ một event phải gắn `campaign_id`. Khi event kết thúc:

- campaign context trong ChromaDB không còn retrievable ngay (`is_expired = true`);  
- generated event pillars không được dùng cho weekly evergreen planning;  
- vector records của event được hard delete theo retention policy;  
- PostgreSQL records được archived, không hard delete, để giữ audit trail;  
- A01 cycle sau đó quay lại Mode B trừ khi có event mới.

#### 7.3.4. Core Workflow FSM

Tầng 2 dùng FSM cho content item và các planning artifact liên quan. `content_items.status` vẫn là source of truth cho từng bài post; strategy objects như IMC plan, pillar set và content plan có lifecycle riêng nhưng phải ghi audit log.

Các state chính cho content item:

| State | Ý nghĩa |
| :---- | :---- |
| `planned` | B03 đã tạo item trong content plan |
| `ready_for_generation` | Content plan đã được approve |
| `caption_generating` | D01 đang viết caption |
| `visual_matching` | Hệ thống đang tìm asset phù hợp |
| `waiting_asset` | Không có ảnh/source phù hợp; đã tạo asset request |
| `asset_blocked` | Asset request hết hạn hoặc thiếu input bắt buộc; đã escalate Agency Admin |
| `visual_generating` | D02 đang thiết kế visual |
| `evaluating` | Evaluator đang chấm caption \+ visual |
| `eval_failed` | Evaluator fail, chờ retry nếu còn lượt |
| `pending_content_approval` | Đã pass evaluator, chờ chủ quán approve |
| `content_approved` | Chủ quán approve |
| `scheduled` | Đã có lịch đăng |
| `published` | F01 publish thành công |
| `publish_failed` | Publish fail sau retry kỹ thuật |
| `analyzing` | G01–G04 đang xử lý metrics/report |
| `analyzed` | Report và learning packet đã tạo |
| `rejected` | Chủ quán reject hoặc fail sau retry max |
| `archived` | Item không dùng nữa |

**Retry rule:** Evaluator fail thì retry vòng D01 → D02 → Evaluator tối đa **3 lần**. Khi `eval_retry_count >= 3`, item chuyển `rejected`, A01 alert Agency Admin, và P01 ghi failure pattern vào learning store.

`eval_retry_count` chỉ tăng khi Evaluator đã chạy xong và trả score dưới threshold. Celery/task retry do timeout, network error, worker crash, rate limit, hoặc lỗi trước khi tới Evaluator là infra-level retry; các retry này dùng Celery `max_retries`/`wake_reason='retry'` nhưng KHÔNG tăng `eval_retry_count`.

**FSM constraints:**

- Không có item nào được publish nếu chưa qua `content_approved`.  
- `waiting_asset` không được tự động bỏ qua bằng ảnh AI nếu brief yêu cầu ảnh thật.  
- Nếu `asset_request.status='expired'` trong khi content item đang `waiting_asset`, item chuyển `asset_blocked`, hệ thống alert Agency Admin, không tự reject, không tự publish, không tự hạ `real_photo_required`.  
- Mọi transition phải ghi `content_item_state_log`.  
- `rejected` và `archived` là terminal state, trừ khi Agency Admin reopen có audit log.  
- Celery Beat job `maintenance.check_stale_items` chạy mỗi 4 giờ để xử lý timeout.

#### 7.3.5. HITL Gates

Tầng 2 có 3 gate family, nhưng Strategy Gate được tách thành 3 sub-gate để con người có thể sửa đúng chỗ.

**Gate Family 1 — Strategy Co-pilot Gates**

| Gate | Khi nào xuất hiện | Con người làm gì | Output |
| :---- | :---- | :---- | :---- |
| S1 — IMC Plan Co-pilot | Chỉ khi có campaign/event active và B01 đã chạy | Sửa theme, key message, offer, event angle, target period | Approved IMC Plan |
| S2 — Content Pillar Co-pilot | Mọi weekly cycle | Sửa/tắt/thêm pillar, chỉnh tỷ trọng, chỉnh angle | Approved Pillar Set |
| S3 — Content Plan Approval | Sau B03 | Duyệt riêng số bài, lịch đăng, platform, brief từng bài | Approved Content Plan |

IMC Plan và Content Pillar là dạng co-pilot editable, không chỉ approve/reject. Content Plan phải duyệt riêng vì nó quyết định số lượng bài, lịch đăng, brief và workload thật.

**IMC Plan editor requirements:**

- IMC Plan hiển thị dạng text document, không phải JSON/table kỹ thuật.  
- User sửa trực tiếp trên nội dung: theme, message, offer, timing, target audience, channel idea.  
- User có thể bôi đậm đoạn text quan trọng.  
- User có thể highlight một đoạn và để lại comment. Comment phải lưu `author_id`, `selected_text`, `comment_body`, `status`, `created_at`.  
- Mỗi lần save tạo version mới của planning artifact, giữ được diff/audit log.  
- Khi user approve, B02/B03 chỉ dùng approved version mới nhất.

**Gate Family 2 — Content Approval Gate**

Mở per content item sau khi Evaluator pass. Chủ quán xem:

- caption final;  
- visual final;  
- preview Facebook/Instagram;  
- scheduled time;  
- asset/source ảnh đã dùng.

Evaluator score summary KHÔNG hiển thị trong per-item view của chủ quán. Score là tín hiệu nội bộ cho Agency Admin/debug/retry, không phải thứ bắt chủ quán phải đọc khi duyệt bài.

Actions:

- approve;  
- approve with schedule edit;  
- reject with reason \+ feedback.

Additional owner edit actions:

- edit caption → save;  
- edit scheduled time → save;  
- approve after saved edits.

Rules:

- Nếu chủ quán sửa caption, hệ thống lưu `client_edited_caption`, ghi audit log, và P01 đọc thay đổi này như human feedback cho D01.  
- Nếu chủ quán sửa scheduled time, hệ thống update `scheduled_at`, revoke/reschedule Celery task cũ nếu đã tạo, rồi ghi audit log.  
- Nút approve chỉ enabled khi caption và scheduled time đang ở trạng thái saved.  
- Sau approve, caption/time bị lock với Client Admin; chỉ Agency Admin reopen được, có audit log.

Reject reason taxonomy tối thiểu:

tone\_wrong

info\_incorrect

visual\_poor

wrong\_asset

off\_brand

bad\_timing

other

**Gate Family 3 — Analytics Acknowledgment Gate**

Mở sau G04 Recommendation. Chủ quán nhận report đọc được cho người thường. Song song, hệ thống nhận machine-readable `learning_packet` để cải thiện bài đăng sau.

Actions:

- acknowledge;  
- acknowledge with comment;  
- request clarification.

Comment của chủ quán được P01 đọc và đưa vào learning loop cho cycle sau.

#### 7.3.6. Visual Asset Retrieval Và Asset Request Workflow

Vì bài social của quán cafe thường cần ảnh thật, Tầng 2 phải có workflow asset rõ ràng.

**Brand Asset / Media Library** đã được spec ở Tầng 1 C7 về storage, metadata, vector index và quyền sử dụng. Tầng 2 chỉ định nghĩa cách workflow dùng C7:

- file gốc lấy từ Supabase Storage;  
- metadata lấy từ PostgreSQL `brand_assets`;  
- semantic search lấy từ ChromaDB collection `visual_assets_{client_id}`;  
- D02 không tự mò file, phải gọi `retrieve_visual_assets()` trước khi thiết kế.

Asset Retrieval input từ D01/B03:

{

"client\_id": "bardinh\_coffee",

"content\_item\_id": "uuid",

"visual\_need": "real product photo of iced latte in cozy morning mood",

"required\_asset\_tags": \["iced\_latte", "morning", "table"\],

"platform": "instagram",

"format": "portrait",

"real\_photo\_required": true

}

Nếu có asset phù hợp:

visual\_matching → visual\_generating

Nếu không có asset phù hợp:

visual\_matching → waiting\_asset

→ create asset\_request

→ notify Client Admin qua Portal Notification Center và Telegram nếu đã connect

→ client uploads photo qua Portal hoặc gửi ảnh vào Telegram bot

→ ingest/index into Brand Asset / Media Library (C7)

→ resume visual\_matching

Không được dùng ảnh AI để thay ảnh sản phẩm thật nếu `real_photo_required = true`. D02 chỉ được dùng generative/design tools cho layout, typography, background phụ, overlay hoặc biến thể thiết kế dựa trên ảnh thật đã approved.

**Client Portal flow khi khách/chủ quán gửi ảnh:**

1. Notification Center hiển thị asset request dạng card: nội dung cần chụp, deadline, bài/campaign liên quan, shot list, ví dụ ảnh nếu có.  
2. User mở request → thấy upload area tối ưu cho mobile: chụp ảnh trực tiếp bằng camera hoặc chọn ảnh từ máy.  
3. User có thể upload nhiều ảnh, thêm ghi chú ngắn/caption cho từng ảnh, và chọn "Ảnh này dùng cho request này".  
4. Submit → tạo `brand_assets` với `status='pending_review'`, link `asset_request_id` và `content_item_id`.  
5. Hệ thống auto-tag bằng vision model, kiểm tra basic quality/orientation, rồi báo Agency Admin/Client Admin review.  
6. Khi asset được approve, index vào `visual_assets_{client_id}`, chuyển `asset_request.status='approved'`, và A01 nhận trigger `asset_submitted` để resume item đang `waiting_asset`.

**Telegram flow cho điện thoại:**

- Mỗi client có thể connect Telegram Bot bằng one-time pairing code từ Client Portal.  
- Khi có asset request mới, bot gửi message gồm shot list ngắn, deadline, và `request_code`.  
- Chủ quán reply trực tiếp bằng ảnh. Bot phải map ảnh vào đúng `client_id` \+ `asset_request_id` qua thread/message metadata hoặc `request_code`.  
- Nếu chủ quán gửi ảnh tự do không gắn request, bot lưu vào `brand_assets` với `source='telegram_uploaded'`, `status='pending_review'`, `unmatched_upload=true`, rồi hỏi nhanh ảnh này dùng cho request nào nếu đang có request mở.  
- Telegram chỉ là input channel. Source of truth vẫn là Supabase Storage \+ PostgreSQL \+ C7 Media Library.

**Notification channel requirements:**

- Portal Notification Center là kênh bắt buộc cho mọi client.  
- Telegram là kênh optional cho mobile convenience.  
- Notification types tối thiểu: `asset_request_created`, `asset_submitted`, `content_ready_for_approval`, `schedule_changed`, `publish_success`, `publish_failed`, `brand_doc_ingest_failed`.  
- Mọi notification phải có `client_id`, `recipient_user_id`, `type`, `entity_type`, `entity_id`, `read_at`, `created_at`.

#### 7.3.7. `workflow_cycles` Table & Cycle Lifecycle *(Tầng 2 EXT.2)*

##### 7.3.7.1. Table Schema

`workflow_cycles` là unit vận hành cốt lõi của CrewLab — mọi agent task đều gắn với một `cycle_id`. `BasePayload.cycle_id` ở 7.3.9 reference table này.

sql  
CREATE TABLE workflow\_cycles (  
id                UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
client\_id         UUID NOT NULL REFERENCES clients(id),  
cycle\_type        TEXT NOT NULL  
CHECK (cycle\_type IN ('weekly', 'campaign\_supplement')),  
campaign\_id       UUID REFERENCES campaigns(id) ON DELETE SET NULL,  
\-- 'weekly'             \= cycle thường, Mode A hoặc B, tạo mỗi thứ 2  
\-- 'campaign\_supplement' \= cycle riêng cho campaign khai trương giữa chừng  
\--                         (campaign được tạo sau khi weekly cycle đã vào content\_production)

status            TEXT NOT NULL DEFAULT 'initializing'  
CHECK (status IN (  
'initializing',       \-- A01 vừa tạo, chưa dispatch agent đầu tiên  
'strategy',           \-- đang chạy B01/B02/B03 và HITL strategy gates  
'content\_production', \-- content plan approved, đang chạy D01/D02/Evaluator  
'publishing',         \-- tất cả items đã approved, đang schedule/publish  
'analytics',          \-- tất cả items đã publish, đang chạy G01–G04  
'completed',          \-- tất cả items analyzed, cycle đóng  
'failed',             \-- cycle thất bại không recover được (e.g. S3 bị reject liên tục)  
'stale'               \-- cycle bị kẹt \> 14 ngày, Agency Admin phải xử lý thủ công  
)),

target\_week\_start DATE NOT NULL, \-- Monday của tuần cycle này cover  
target\_week\_end   DATE NOT NULL, \-- Sunday (= target\_week\_start \+ 6 days)  
mode              TEXT NOT NULL  
CHECK (mode IN ('A', 'B')),    \-- A \= có campaign, B \= không có campaign

\-- Phase timestamps (để tính duration và detect stale)  
strategy\_started\_at     TIMESTAMPTZ,  
strategy\_completed\_at   TIMESTAMPTZ,  
production\_started\_at   TIMESTAMPTZ,  
production\_completed\_at TIMESTAMPTZ,  
publishing\_started\_at   TIMESTAMPTZ,  
publishing\_completed\_at TIMESTAMPTZ,  
analytics\_started\_at    TIMESTAMPTZ,  
analytics\_completed\_at  TIMESTAMPTZ,  
completed\_at            TIMESTAMPTZ,  
failed\_at               TIMESTAMPTZ,  
stale\_detected\_at       TIMESTAMPTZ,

\-- Counters  
total\_planned\_items   INT DEFAULT 0,  \-- set khi B03 được approve  
published\_items       INT DEFAULT 0,  
rejected\_items        INT DEFAULT 0,  
waiting\_asset\_items   INT DEFAULT 0,  
asset\_blocked\_items   INT DEFAULT 0,

failure\_reason        TEXT,  
stale\_reason          TEXT,  
notes                 TEXT,           \-- Agency Admin ghi chú khi xử lý cycle bất thường

created\_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
updated\_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

CREATE INDEX idx\_cycles\_client\_status ON workflow\_cycles(client\_id, status, target\_week\_start DESC);  
CREATE INDEX idx\_cycles\_open          ON workflow\_cycles(client\_id, target\_week\_start DESC)  
WHERE status NOT IN ('completed', 'failed', 'stale');

ALTER TABLE workflow\_cycles ENABLE ROW LEVEL SECURITY;  
CREATE POLICY cycles\_agency ON workflow\_cycles  
FOR ALL USING (auth.jwt() \-\>\> 'role' \= 'agency\_admin');  
CREATE POLICY cycles\_client\_read ON workflow\_cycles  
FOR SELECT USING (  
client\_id \= (auth.jwt() \-\>\> 'client\_id')::UUID  
AND auth.jwt() \-\>\> 'role' IN ('client\_admin', 'client\_staff')  
);

##### 7.3.7.2. Cycle Lifecycle State Machine

initializing  
│  
├─ A01 dispatch B01 (Mode A) hoặc B02 (Mode B)  
▼  
strategy  
│  
├─ S1 approved → dispatch B02  
├─ S2 approved → dispatch B03  
├─ S3 approved → dispatch D01 × N items  
▼  
content\_production  
│  
├─ Khi tất cả items đã rời khỏi state D01/D02/evaluating  
│  (= không còn item nào ở caption\_generating/visual\_generating/evaluating)  
▼  
publishing  
│  
├─ Items lần lượt: content\_approved → scheduled → published  
├─ Khi tất cả items ở terminal hoặc đang analytics (không còn item pending\_content\_approval/scheduled)  
▼  
analytics  
│  
├─ G01 dispatch cho từng published item (T+7)  
├─ G04 → recommendation\_done → P01 → Gate Family 3  
├─ Khi tất cả published items đã có G04 report  
▼  
completed

**Transition guards (A01 kiểm tra trước khi chuyển phase):**

python  
def should\_transition\_to\_content\_production(cycle\_id: UUID) \-\> bool:  
"""  
Chuyển sang content\_production khi:  
\- content\_plan (planning\_artifact type='content\_plan') có status='approved'  
\- Không còn item nào ở state: planned (chờ generate), hay strategy gate pending  
"""  
plan \= db.get\_approved\_content\_plan(cycle\_id)  
return plan is not None and plan.status \== 'approved'

def should\_transition\_to\_publishing(cycle\_id: UUID) \-\> bool:  
"""  
Chuyển sang publishing khi:  
\- Không còn item nào ở: caption\_generating, visual\_matching, visual\_generating,  
evaluating, eval\_failed, waiting\_asset (waiting\_asset còn block → không chuyển)  
\- Ít nhất 1 item ở: pending\_content\_approval hoặc content\_approved hoặc scheduled  
"""  
blocking\_states \= \['caption\_generating', 'visual\_matching', 'visual\_generating',  
'evaluating', 'eval\_failed', 'waiting\_asset'\]  
items\_blocking \= db.count\_items\_in\_states(cycle\_id, blocking\_states)  
items\_progressing \= db.count\_items\_in\_states(  
cycle\_id, \['pending\_content\_approval', 'content\_approved', 'scheduled'\])  
return items\_blocking \== 0 and items\_progressing \> 0

def should\_transition\_to\_analytics(cycle\_id: UUID) \-\> bool:  
"""  
Chuyển sang analytics khi:  
\- Không còn item nào ở pending\_content\_approval, scheduled  
\- Ít nhất 1 item đã published (analytics\_due task sẽ được schedule T+7)  
"""  
pending \= db.count\_items\_in\_states(  
cycle\_id, \['pending\_content\_approval', 'scheduled', 'content\_approved'\])  
published \= db.count\_items\_in\_states(cycle\_id, \['published'\])  
return pending \== 0 and published \> 0

def should\_close\_cycle(cycle\_id: UUID) \-\> bool:  
"""  
Đóng cycle khi:  
\- Tất cả published items đã có analytics record (analyzing → analyzed)  
\- Không còn item nào ở non-terminal state  
"""  
non\_terminal \= db.count\_items\_in\_non\_terminal\_states(cycle\_id)  
\# non\_terminal excludes: published, analyzed, rejected, archived  
unanalyzed \= db.count\_items\_in\_states(cycle\_id, \['published', 'analyzing'\])  
return non\_terminal \== 0 and unanalyzed \== 0

**Stale detection** — `maintenance.check_stale_cycles` (daily 00:30):

python  
STALE\_THRESHOLDS \= {  
'strategy':           timedelta(days=5),   \# strategy gate không ai approve 5 ngày  
'content\_production': timedelta(days=7),   \# content bị kẹt 7 ngày  
'publishing':         timedelta(days=7),   \# publish không xong 7 ngày  
'analytics':          timedelta(days=14),  \# analytics chậm 14 ngày  
}  
\# Nếu cycle đang ở phase X và phase\_started\_at \+ threshold \< now():  
\#   → status \= 'stale', stale\_reason \= f"Phase {X} exceeded {threshold.days} days"  
\#   → Telegram alert Agency Admin  
\#   → KHÔNG auto-resolve: Agency Admin phải quyết định reopen, skip, hoặc close cycle

**Concurrent cycles:** Một client có thể có tối đa 2 cycle open cùng lúc:

* 1 weekly cycle (type='weekly')  
* 1 campaign\_supplement cycle (type='campaign\_supplement') nếu campaign được tạo giữa chừng

Nếu A01 `beat_weekly` fire và client đã có weekly cycle chưa completed ở `strategy` phase: **không tạo cycle mới**, log warning, alert Agency Admin "previous cycle still in strategy — skip new cycle creation". Nếu cycle đã qua `content_production`: tạo cycle mới bình thường (2 cycles song song là OK).

#### 7.3.8. Orchestrator Contract (A01)

A01 là agent điều phối, không viết caption, không thiết kế ảnh, không phân tích sâu. A01 đọc state, quyết định bước tiếp theo, dispatch task, xử lý retry/escalation.

##### 7.3.8.1. Guard chung — chạy trước mọi trigger

python  
def a01\_precheck(client\_id: UUID) \-\> A01PrecheckResult:  
client \= db.get\_client(client\_id)  
if not client or not client.is\_active:  
return A01PrecheckResult(ok=False, reason="client\_inactive")

quota \\= quota\\\_service.get\\\_status(client\\\_id)  

if quota.exceeded:  

    send\\\_telegram\\\_alert(f"⚠️ A01 skipped for {client\\\_id}: quota exceeded")  

    return A01PrecheckResult(ok=False, reason="quota\\\_exceeded")

return A01PrecheckResult(ok=True)

Triggers:

| Trigger | Ý nghĩa |
| :---- | :---- |
| `beat_weekly` | Bắt đầu weekly cycle |
| `campaign_created` | Có campaign/event mới |
| `campaign_ended` | Event kết thúc, cleanup context/pillars |
| `strategy_gate_approved` | S1/S2/S3 pass |
| `content_gate_approved` | Một content item được approve |
| `asset_submitted` | Chủ quán upload asset theo request |
| `eval_failed` | Evaluator fail |
| `publish_due` | Đến giờ publish |
| `analytics_due` | T+7 sau publish |
| `recommendation_done` | G04 xong, gửi learning packet |

A01 output là `DispatchInstruction`:

{

"task\_name": "agents.d01.caption\_writer",

"queue": "normal",

"payload": {},

"idempotency\_key": "client\_id:cycle\_id:agent\_code:content\_item\_id:attempt"

}

#### 7.3.9. Execution Payload Schema

Mọi agent nhận `BasePayload`, không truyền raw data tự do.

class BasePayload(BaseModel):

client\\\_id: UUID

cycle\\\_id: UUID

agent\\\_code: str

wake\\\_reason: str

idempotency\\\_key: str

client\\\_config\\\_snapshot: dict

context\\\_packet: dict

campaign\\\_id: UUID | None \\= None

content\\\_item\\\_id: UUID | None \\= None

is\\\_retry: bool \\= False

retry\\\_count: int \\= 0

previous\\\_failure\\\_report: dict | None \\= None

Payload extensions chính:

| Agent | Required extension |
| :---- | :---- |
| B01 | campaign/event brief, date range, offer, target audience |
| B02 | active evergreen pillars, approved IMC Plan nếu có, performance learning packet |
| B03 | approved pillars, post frequency, platform list, schedule constraints |
| D01 | approved content brief, pillar, angle, platform, previous feedback |
| D02 | caption draft, visual brief, selected asset IDs, real\_photo\_required |
| F01 | approved caption, approved visual URL, scheduled\_at, Meta account refs |
| G01 | published item IDs, metric window, Meta fields to collect |
| G02 | cleaned metrics dataset |
| G03 | descriptive output \+ historical baseline |
| G04 | diagnosis \+ recommendation candidates |

#### 7.3.10. Evaluator SRS

E01 Evaluator là agent thứ 12 trong Agent Registry (7.5.2) — quality gate giữa Content và Publish, không thuộc nhóm Strategy/Content marketing nhưng vẫn là agent chính thức có contract riêng (Tầng 3 Part C7), model tier riêng (mặc định Fast, Tầng 3 A3.2), và budget cap riêng (Tầng 3 B5). E01 không tự gọi tool RAG (T01) — brand voice guideline cần để chấm "Brand voice alignment" đã được đóng gói sẵn trong `context_packet` do `build_context_packet()` tạo ra (Layer 2, xem A4), giống mọi agent khác nhận BasePayload.

Rubric tối thiểu:

| Criteria | Max score |
| :---- | :---- |
| Brand voice alignment | 2.5 |
| Content accuracy | 2.0 |
| Platform fit | 2.0 |
| Pillar/angle relevance | 2.0 |
| Originality / avoid repetition | 1.5 |

Bổ sung visual evaluation criteria cho D02/Image Design:

| Criteria | Max score |
| :---- | :---- |
| Visual asset fit | 2.0 |
| Image design quality | 2.0 |
| Mobile readability / text safety | 1.0 |

Image design quality chấm các điểm tối thiểu:

- ảnh dùng đúng sản phẩm/quán/ngữ cảnh đã brief;  
- bố cục rõ, không che sản phẩm chính;  
- chữ trên ảnh đọc được ở mobile;  
- màu sắc và mood hợp brand;  
- không dùng asset chưa approved hoặc sai usage rights;  
- không có lỗi crop méo, logo sai, text overlap, watermark lạ, hoặc chi tiết AI làm sai thực tế quán.

Pass/fail (v3.2 — reconcile với §7.4.3.7 để dùng chung một bộ ngưỡng, tách riêng Caption/Visual thay vì 1 `score` gộp không rõ thang điểm tổng):

- `caption_score >= 7.0 AND visual_score >= 3.5`: pass → `pending_content_approval`.  
- `5.0 <= caption_score < 7.0 OR 2.5 <= visual_score < 3.5`: retry if `retry_count < 3`.  
- `caption_score < 5.0 OR visual_score < 2.5`: hard fail, retry only if failure is recoverable and `retry_count < 3`; otherwise reject.

Evaluator must output structured failure report:

{

"overall\_score": 6.4,

"failed\_criteria": \["brand\_voice", "visual\_asset\_fit"\],

"fix\_instructions": "Use a warmer Bardinh tone and replace the generic cup photo with a real iced latte asset.",

"retry\_allowed": true

}

#### 7.3.11. Analytics Report Và Machine Learning Loop

Sau khi G04 tạo recommendation, output đi ra 2 đường:

**Human-readable report** cho chủ quán:

- bài nào tốt/kém;  
- lý do dễ hiểu;  
- đề xuất tuần sau;  
- việc cần chủ quán chuẩn bị, ví dụ chụp thêm ảnh sản phẩm.

**Machine-readable learning packet** cho hệ thống:

{

"client\_id": "bardinh\_coffee",

"cycle\_id": "uuid",

"pillar\_adjustments": \[\],

"angle\_adjustments": \[\],

"posting\_time\_insights": \[\],

"asset\_insights": \[\],

"caption\_style\_insights": \[\],

"do\_more": \[\],

"do\_less": \[\]

}

Learning packet được ghi vào:

- Hindsight / memory adapter cho agent liên quan;  
- `performance_patterns_{client_id}`;  
- P01 Feedback Learning Pipeline;  
- A01 context cho weekly cycle sau.

#### 7.3.12. P01 — Feedback Learning Pipeline

P01 không phải một trong 12 agent. Nó là pipeline chạy sau human edits và sau analytics recommendation.

P01 đọc:

- chỉnh sửa trực tiếp trên Content Plan (B03 output);  
- chỉnh sửa/reject feedback trên Caption Writer (D01 output);  
- chỉnh sửa/reject feedback trên Image Design (D02 output);  
- acknowledge/comment ở Analytics Report;  
- learning packet từ G04.

P01 tạo:

- structured feedback records;  
- memory updates cho đúng agent;  
- performance pattern candidates;  
- warning nếu cùng lỗi lặp lại nhiều lần;  
- input cho B02/B03/D01/D02 ở cycle sau.

Ví dụ:

{

"source": "content\_approval\_reject",

"agent\_code": "D02",

"content\_item\_id": "uuid",

"feedback\_type": "wrong\_asset",

"human\_feedback": "Ảnh này không phải ly bạc xỉu của Bardinh.",

"learned\_rule": "When caption mentions bạc xỉu, require real asset tagged bac\_xiu from Bardinh asset library."

}

#### 7.3.13. Acceptance Criteria Tầng 2

| ID | Acceptance Criteria |
| :---- | :---- |
| AC-WF-01 | Khi không có campaign/event active, A01 không dispatch B01; workflow bắt đầu từ B02. |
| AC-WF-02 | Khi có campaign/event active, workflow chạy B01 → S1 → B02 → S2 → B03 → S3. |
| AC-WF-03 | Khi event kết thúc, event-generated pillars không còn retrievable cho evergreen planning. |
| AC-WF-04 | Content Pillar và IMC Plan cho phép human edit/co-pilot, không chỉ approve/reject. |
| AC-WF-05 | Content Plan có approval riêng trước khi D01 chạy. |
| AC-WF-06 | D01/D02 và các strategy agents đọc RAG; F01 và G01–G04 không đọc brand RAG. |
| AC-WF-07 | Evaluator retry tối đa 3 lần; retry lần 4 không xảy ra. |
| AC-WF-08 | Nếu thiếu ảnh thật phù hợp, item chuyển `waiting_asset` và tạo asset request cho chủ quán. |
| AC-WF-09 | Không item nào publish nếu chưa qua Content Approval Gate. |
| AC-WF-10 | G04 tạo cả human report và machine-readable learning packet. |
| AC-WF-11 | P01 đọc feedback/chỉnh sửa từ B03, D01, D02 và ghi learning record đúng agent. |
| AC-WF-12 | Mọi state transition có audit/state log đầy đủ. |
| AC-WF-13 | IMC Plan editor cho phép sửa text trực tiếp, bôi đậm đoạn text, comment trên selection, lưu version và approve version mới nhất. |
| AC-WF-14 | Client per-item approval view không hiển thị evaluator score summary; Agency Admin vẫn xem được score ở internal/debug view. |
| AC-WF-15 | Chủ quán sửa caption → save → approve; caption đã sửa được dùng để publish và P01 ghi learning record cho D01. |
| AC-WF-16 | Chủ quán sửa scheduled time → save → approve; Celery schedule cũ bị revoke/reschedule đúng giờ mới. |
| AC-WF-17 | Asset request gửi qua Portal Notification Center; chủ quán upload ảnh trên mobile portal → asset link đúng request và item resume sau approval. |
| AC-WF-18 | Asset request gửi qua Telegram; chủ quán reply bằng ảnh → bot lưu file, map đúng `asset_request_id`, tạo `brand_assets` pending review. |
| AC-WF-19 | Evaluator report có điểm riêng cho `visual_asset_fit` và `image_design_quality`; ảnh sai sản phẩm hoặc text overlap phải fail/retry dù caption tốt. |
| AC-WF-20 | Celery retry do timeout/network trước Evaluator không tăng `eval_retry_count`; Evaluator fail quality mới tăng counter. |
| AC-WF-21 | `asset_request.status='expired'` khi item đang `waiting_asset` → item chuyển `asset_blocked`, alert Agency Admin, không tự dùng ảnh AI/fallback/publish. |

### 7.4. Key Features — Tầng 3: Agent Contract Templates

Tầng 3 chuẩn hoá cách mỗi agent trong 12 agent (đã liệt kê ở 7.3.2) nhận input, gọi LLM/tool, và trả output — theo một format hợp đồng (contract) chung, cộng với schema cấu hình per-client (Client Config System) để agent stack khác nhau giữa các client mà không đổi code. Gồm: chuẩn contract chung (7.4.1), hệ thống cấu hình client (7.4.2), contract chi tiết cho từng agent trong 12 agent (7.4.3), và NFR/Acceptance Criteria riêng cho tầng này (7.4.4).

#### 7.4.1. Agent Contract Standard *(Tầng 3 · Part A)*

Part A là bộ quy chuẩn chung áp cho mọi agent. Mọi per-agent contract ở Part C chỉ "fill in" vào standard này — không có agent nào được tự làm khác.

---

##### 7.4.1.1. Agent Contract Template Format *(A1)*

Mỗi agent phải được spec đầy đủ theo schema sau:

Agent Code: \[CODE\]

Agent Name: \[Tên đầy đủ\]

Role: \[Mô tả ngắn gọn agent làm gì — 1 câu\]

TRIGGERS:

\- Ai/gì gọi agent này (A01, beat schedule, direct assignment, event)

INPUTS:

\- BasePayload (bắt buộc — xem A5)

\- Payload extension riêng cho agent này

RAG USAGE:

\- Có đọc brand memory (ChromaDB) không? Đọc collection nào?

\- Có đọc episodic memory (Hindsight) không? Memory bank nào?

LLM CALLS:

\- Danh sách các lần gọi LLM trong agent này

\- Mỗi lần: \[mục đích\] → \[tier model mặc định\]

TOOL CALLS:

\- Danh sách tool được gọi (từ Tool Registry A2)

OUTPUTS:

\- Artifact tạo ra là gì (loại, format)

\- Trạng thái chuyển sang trong Content FSM

\- Có ghi episodic memory không? Ghi gì?

HITL GATES:

\- Có cần human approve không? Loại gate nào? (S1/S2/S3/Content Gate)

\- Điều gì xảy ra khi approve / reject / edit

BUSINESS RULES:

\- Các quy tắc logic quan trọng agent phải tuân theo

FAILURE BEHAVIOR:

\- Khi LLM fail / tool fail / timeout → làm gì?

\- Retry policy

\- Escalate khi nào?

---

##### 7.4.1.2. Tool Registry *(A2)*

Danh sách tool toàn hệ thống. Mọi agent **chỉ được gọi tool trong danh sách này**, không gọi ngoài.

| Tool Code | Tool Name | Mô tả | Ai được gọi |
| :---- | :---- | :---- | :---- |
| `T01` | `query_brand_memory` | RAG query ChromaDB brand collection | B01, B02, B03, D01, D02 |
| `T02` | `recall_episodic_memory` | Recall từ Hindsight Memory Bank | B02, B03, D01, D02, G04 |
| `T03` | `retain_episodic_memory` | Ghi vào Hindsight Memory Bank | D01, D02, G04, P01 |
| `T04` | `query_media_library` | Tìm ảnh/video trong Media Library (C7) | D02 |
| `T05` | `create_asset_request` | Tạo asset request gửi cho chủ quán | D02 |
| `T06` | `publish_to_meta` | Đăng bài lên Facebook/Instagram qua Meta Graph API | F01 |
| `T07` | `collect_meta_metrics` | Lấy metrics từ Meta Graph API cho các post đã published | G01 |
| `T08` | `read_content_plan` | Đọc Content Plan đã approved từ DB | B03, D01, D02 |
| `T09` | `write_planning_artifact` | Ghi artifact (IMC Plan, Pillar Doc, Content Plan) vào DB | B01, B02, B03 |
| `T10` | `read_performance_patterns` | Đọc performance pattern collection từ ChromaDB | B02, B03, G04 |
| `T11` | `write_performance_patterns` | Ghi performance pattern mới vào ChromaDB | G04, P01 |
| `T12` | `generate_image_ai` | Gọi AI image generation API (gpt-image-2 hoặc gemini image) | D02 |
| `T13` | `compose_image_from_assets` | Ghép ảnh thật \+ element/overlay bằng image processing | D02 |
| `T14` | `notify_agency_admin` | Gửi Telegram alert cho Agency Admin | A01, F01, G01, tất cả |
| `T15` | `update_content_state` | Cập nhật trạng thái Content Item trong FSM | A01, D01, D02, F01 |
| `T16` | `read_imc_plan` | Đọc IMC Plan đã approved | B02, B03 |
| `T17` | `schedule_publish_task` | Tạo Celery task publish đúng giờ | F01 |
| `T18` | `write_analytics_record` | Ghi metrics đã clean vào DB | G01 |
| `T19` | `write_learning_packet` | Ghi learning packet từ G04 vào DB | G04 |
| `T20` | `direct_assign_task` | Cho phép client giao task trực tiếp cho agent, bypass A01 | Client → bất kỳ agent |
| `T21` | `read_published_content_metadata` | Đọc metadata đầy đủ của content item đã published: pillar, caption, hook, content\_type, posting\_time, platform, campaign\_id (nếu có) — từ bảng `content_items` \+ `planning_artifacts` trong PostgreSQL (Tầng 1\) | G02 |

---

##### 7.4.1.3. Model Policy & LLM Configuration *(A3)*

###### *7.4.1.3.1. Multi-Provider Support (A3.1)*

CrewLab hỗ trợ 4 nhà cung cấp LLM. Khi onboard client, Agency Admin tư vấn và xác nhận provider mặc định với client. Client có thể **tự thay đổi model của từng agent trong Portal** bất cứ lúc nào — thay đổi có hiệu lực ở task tiếp theo.

**Danh sách model text được hỗ trợ:**

| Provider | Tier | Models |
| :---- | :---- | :---- |
| **Anthropic** | Fast | Claude Haiku 4.5 |
| **Anthropic** | Standard | Claude Sonnet 4.6 |
| **Anthropic** | Power | Claude Opus 4.8 |
| **OpenAI** | Fast | gpt-5.4-mini |
| **OpenAI** | Standard | gpt-5.4 |
| **OpenAI** | Power | gpt-5.5 |
| **Google** | Fast | Gemini 2.5 Flash |
| **Google** | Standard | Gemini 3.5 Flash |
| **Google** | Power | Gemini 3.1 Pro |
| **Deepseek** | Fast | deepseek-v4-flash |
| **Deepseek** | Power | deepseek-v4-pro |

**Danh sách model image generation được hỗ trợ:**

| Provider | Model | Ghi chú |
| :---- | :---- | :---- |
| OpenAI | gpt-image-2 | Khuyến nghị cho poster, creative content |
| Google | gemini-3-pro-image | Chất lượng cao, phù hợp visual complex |
| Google | gemini-3.1-flash-image | Nhanh hơn, phù hợp khi cần batch |

###### *7.4.1.3.2. Model Tier và Default (A3.2)*

**Rule cốt lõi:** Mỗi agent được gán **đúng một model tier cố định** cho toàn bộ các lần gọi LLM bên trong agent đó — không có chuyện agent dùng tier khác nhau cho từng bước xử lý nội bộ. Nếu agent có nhiều LLM call (ví dụ D01 viết caption cho 2 platform), tất cả các call đó dùng chung một model/tier đã config cho agent.

Lý do: giữ cost predictable per agent, và để client config (B5) chỉ cần set 1 model cho 1 agent code, không phải set nhiều biến thể.

| Tier | Dùng khi | Default agent |
| :---- | :---- | :---- |
| **Fast** | Task đơn giản, extract data, clean, classify | G01 |
| **Standard** | Viết content, phân tích cơ bản, planning, quality scoring | D01, D02, B03, G02, G03, E01 |
| **Power** | Strategy, reasoning phức tạp, recommendation | B01, B02, A01, G04 |

*(v3.2: E01 chuyển từ Fast → Standard để khớp §B5 llm\_config và §7.4.3.7 Evaluator SRS, vốn đã dùng Standard từ trước — bảng này là chỗ duy nhất trong PRD còn ghi Fast, nay đã đồng bộ.)*

**Rule quan trọng:** Nếu client không config override, dùng default tier. Nếu client config model A cho agent X, agent X luôn dùng model A cho **mọi** LLM call bên trong nó cho đến khi config thay đổi.

###### *7.4.1.3.3. Budget Per Agent (A3.3)*

- Mỗi agent có **budget cap riêng (USD/tháng)** trong client config.  
- Khi agent gần đạt 80% budget → log warning, notify Agency Admin.  
- Khi đạt 100% → agent task bị từ chối, trả về failure report "budget\_exceeded".  
- Client có thể tự điều chỉnh budget cap từng agent trong Portal.

###### *7.4.1.3.4. Model Config & API Key (A3.4)*

- **Toàn bộ API key và model config** được thiết lập bởi Agency Admin thông qua CrewAI account và tài khoản admin của hệ thống — client không thấy API key.  
- Khi client chọn provider A, Agency Admin kích hoạt API key provider A cho client đó trong hệ thống.  
- Client chỉ thấy dropdown chọn model trong Portal, không thao tác trực tiếp với API key.

---

##### 7.4.1.4. Prompt Architecture — 3 Layers *(A4)*

Mọi LLM call trong bất kỳ agent nào đều tuân theo kiến trúc 3 lớp prompt. **Tất cả system prompt và task instruction được viết bằng tiếng Anh.**

| Layer | Tên | Nội dung | Thay đổi khi nào |
| :---- | :---- | :---- | :---- |
| **Layer 1** | System Prompt | Định nghĩa role, behavior, output format cố định của agent | Không thay đổi theo client hoặc task |
| **Layer 2** | Context Packet | Brand voice, pillar, platform, performance history, client config — build từ `build_context_packet()` | Thay đổi theo client và task cụ thể |
| **Layer 3** | Task Instruction | Yêu cầu cụ thể cho task đang chạy (brief, content item, angle, platform) | Thay đổi theo từng content item |

**Ví dụ cấu trúc (D01 \- Caption Writer):**

Layer 1: "You are a professional social media copywriter for Vietnamese SMEs.

      Your job is to write captions that match the client's brand voice,

      selected content pillar, and platform format. Always output JSON."

Layer 2: {brand\_voice, pillar\_active, platform\_rules, recent\_performance,

      last\\\_3\\\_approved\\\_captions, rejected\\\_captions\\\_with\\\_reason}

Layer 3: "Write a Facebook caption for the following brief: \[brief\].

      Angle: \\\[angle\\\]. Avoid: \\\[avoid\\\_list from feedback\\\]."

---

##### 7.4.1.5. BasePayload & BaseAgentOutput *(A5)*

###### *7.4.1.5.1. BasePayload (input chuẩn mọi agent nhận)*

client\_id          : UUID

cycle\_id           : UUID

agent\_code         : str

wake\_reason        : str   ← "beat\_weekly" | "direct\_assign" | "gate\_approved" | ...

idempotency\_key    : str

client\_config      : ClientConfig  ← snapshot tại thời điểm task chạy

context\_packet     : dict          ← từ build\_context\_packet()

campaign\_id        : UUID | null

content\_item\_id    : UUID | null

is\_retry           : bool

retry\_count        : int

previous\_failure   : FailureReport | null

###### *7.4.1.5.2. BaseAgentOutput (output chuẩn mọi agent trả về)*

agent\_code         : str

status             : "success" | "partial" | "failed"

artifact           : dict | null   ← nội dung tạo ra (IMC Plan, caption, image URL,...)

next\_state         : str | null    ← trạng thái FSM mới của content item

memory\_retained    : bool          ← đã ghi episodic memory chưa

failure\_report     : FailureReport | null

###### *7.4.1.5.3. FailureReport (bắt buộc khi status \= "failed")*

error\_code         : str    ← "llm\_timeout" | "tool\_error" | "budget\_exceeded" | "eval\_failed"

error\_message      : str

retry\_allowed      : bool

fix\_instructions   : str    ← hướng dẫn fix để retry thông minh hơn

---

##### 7.4.1.6. Observability Contract *(A6)*

Mọi agent **bắt buộc** ghi Langfuse trace với tối thiểu các field sau:

| Field | Ý nghĩa |
| :---- | :---- |
| `client_id` | Để filter per client |
| `agent_code` | Để filter per agent |
| `task_type` | Loại task (ví dụ: `D01_facebook_caption`) |
| `model_used` | Model thực tế được gọi |
| `tokens_in / tokens_out` | Để tính cost |
| `latency_ms` | Latency end-to-end của agent task |
| `status` | success / failed / retried |
| `eval_score` | Nếu qua Evaluator |
| `wake_reason` | Tại sao agent được gọi |

---

#### 7.4.2. Client Configuration System *(Tầng 3 · Part B)*

Part B giải quyết câu hỏi: "Hệ thống customize cho nhiều client như thế nào mà không sửa agent code?" Mỗi client \= một ClientConfig. Agent đọc config này ở đầu mỗi task.

---

##### 7.4.2.1. Client Config Schema — Top Level *(B1)*

client\_id: "bardinh\_coffee"

client\_name: "Bardinh Coffee"

timezone: "Asia/Ho\_Chi\_Minh"

language: "vi"                  \# Ngôn ngữ nội dung output

vertical: "f\&b\_cafe"            \# Ngành: f\&b\_cafe | retail | ecommerce | spa | other

platforms:

\- facebook

\- instagram

status: "active"                \# active | paused | offboarded

onboarded\_at: "2026-07-01"

##### 7.4.2.2. Brand Voice Config *(B2)*

brand\_voice:

tone: "warm, friendly, approachable"        \# Mô tả tính cách thương hiệu

personality\_keywords:

\\- "gần gũi"

\\- "chân thực"

\\- "trẻ trung"

writing\_style: "conversational"              \# conversational | professional | playful

avoid\_phrases:

\\- "siêu phẩm"

\\- "đỉnh của chóp"

\\- "không thể bỏ qua"

example\_approved\_captions:                  \# 3–5 caption đã được client approve

\\- "Một buổi sáng nhẹ nhàng với ly bạc xỉu Bardinh..."

brand\_colors:

primary: "\\\#3B2F2F"

secondary: "\\\#F5E6C8"

logo\_url: "https://..."

###### *7.4.2.2.1. Brand Voice có thay đổi linh hoạt được không, và thay đổi như thế nào? (B2.1)*

**Có — thay đổi hoàn toàn no-code.** YAML trên là cách hệ thống lưu trong DB, nhưng client/Agency Admin **không bao giờ sửa YAML trực tiếp**. Thao tác thực tế:

1. Client/Agency Admin vào **Client Portal → Brand Settings**  
2. Đây là một **form UI** thông thường: text input cho tone, tag input cho personality keywords và avoid phrases, dropdown cho writing style, color picker cho brand colors, upload button cho logo  
3. Client gõ/chọn xong → bấm **Lưu**  
4. Form submit gọi API ghi xuống bảng `client_config` (PostgreSQL — Tầng 1), version mới được lưu kèm timestamp  
5. **Có hiệu lực ngay từ task tiếp theo** — agent nào đọc config (B01, B02, D01, D02...) đều gọi `build_context_packet()` lấy bản config **mới nhất** tại thời điểm task chạy, không cache version cũ, không cần restart hệ thống, không cần deploy lại

Nói cách khác: thay đổi Brand Voice giống thao tác sửa thông tin cá nhân trên một app bình thường — vào form, sửa, lưu, xong. Không động vào code, không cần Agency Admin can thiệp kỹ thuật (trừ khi client muốn Agency Admin hỗ trợ viết hộ).

**Lưu ý:** `example_approved_captions` được hệ thống **tự động đề xuất cập nhật** sau mỗi lần content được client approve (P01 pipeline ghi nhận), nhưng client vẫn có quyền tự chọn caption nào muốn giữ làm mẫu trong form.

##### 7.4.2.3. Content Configuration *(B3)*

content\_config:

posting\_frequency:

facebook: 5                 \\\# Số bài/tuần

instagram: 4

post\_time\_windows:            \# Khung giờ đăng bài ưa thích

facebook:

  \\- "07:00-09:00"

  \\- "11:30-13:00"

  \\- "19:00-21:00"

instagram:

  \\- "08:00-10:00"

  \\- "19:00-21:00"

content\_pillars:              \# Các trụ nội dung thường trực

\\- id: "pillar\\\_product"

  name: "Món & Đồ uống"

  weight: 40                \\\# % trong content mix

\\- id: "pillar\\\_story"

  name: "Câu chuyện quán"

  weight: 30

\\- id: "pillar\\\_lifestyle"

  name: "Lifestyle & Community"

  weight: 30

hashtag\_strategy:

facebook: "caption\\\_end"     \\\# Vị trí hashtag: caption\\\_end | first\\\_comment | none

instagram: "caption\\\_end"

max\_hashtags:

facebook: 5

instagram: 15

##### 7.4.2.4. Campaign Template Schema *(B4)*

campaigns:

\- campaign\_id: "tet\_2027"

name: "Tết 2027 Campaign"

type: "seasonal"            \\\# seasonal | product\\\_launch | promotion | local\\\_event

date\\\_start: "2027-01-15"

date\\\_end: "2027-02-05"

offer: "Combo quà Tết Bardinh \\- 10% off"

target\\\_audience: "Giới trẻ 18-30, thích không gian cà phê ấm cúng"

key\\\_message: "Tết này, mang Bardinh về nhà"

status: "active"            \\\# draft | active | ended

**Lưu ý:** Schema này **không có field pillar**. Pillar không phải thứ con người định nghĩa sẵn trong campaign config — đó là việc B02 phải tự nghiên cứu insight và sáng tạo ra (xem chi tiết business rule mới ở C3 — B02).

###### *7.4.2.4.1. Schema này để làm gì? (B4.1)*

Đây là **input thô ban đầu** mà con người (Client Admin hoặc Agency Admin) cung cấp khi muốn chạy một campaign/event — tương đương một "campaign brief" rút gọn. Nó **không phải** là IMC Plan hoàn chỉnh, chỉ là dữ liệu khởi tạo để B01 (IMC Planner) dùng làm nguyên liệu đầu vào, từ đó B01 mới research và phát triển thành một IMC Plan đầy đủ (xem C2).

Vai trò cụ thể:

- Là **trigger** để A01 biết "có campaign mới" (`wake_reason = campaign_created`) và dispatch B01  
- Là **payload context** B01 đọc để bắt đầu xây dựng IMC Plan (B01 không tự nghĩ ra tên campaign, ngày tháng, offer — những thứ này con người quyết, B01 phát triển tiếp từ đó)  
- Sau khi B01 hoàn thành IMC Plan và S1 approve, campaign chuyển `status: active` và toàn bộ workflow downstream dùng `campaign_id` này để gắn content item vào đúng campaign

###### *7.4.2.4.2. Hiển thị ở đâu? (B4.2)*

- **Client Portal → Campaign tab**: Client Admin tạo campaign mới qua form (tên, ngày bắt đầu/kết thúc, offer, mô tả target audience, key message mong muốn) — đây chính là nơi sinh ra YAML này, client không thấy YAML, chỉ thấy form

##### 7.4.2.5. LLM Budget & Model Config Per Agent *(B5)*

llm\_config:

default\_provider: "anthropic"   \# Provider mặc định nếu per-agent không config

default\_model: "claude-sonnet-4-6"

per\_agent:

A01:

  provider: "anthropic"

  model: "claude-opus-4-8"    \\\# Orchestrator cần model mạnh nhất

  budget\\\_usd\\\_month: 20

B01:

  provider: "anthropic"

  model: "claude-opus-4-8"

  budget\\\_usd\\\_month: 15

B02:

  provider: "anthropic"

  model: "claude-sonnet-4-6"

  budget\\\_usd\\\_month: 10

B03:

  provider: "anthropic"

  model: "claude-sonnet-4-6"

  budget\\\_usd\\\_month: 10

D01:

  provider: "anthropic"

  model: "claude-sonnet-4-6"

  budget\\\_usd\\\_month: 25

D02:

  provider: "openai"

  model: "gpt-image-2"        \\\# Image model

  budget\\\_usd\\\_month: 30

F01:

  provider: "anthropic"

  model: "claude-haiku-4-5"   \\\# Simple execution task

  budget\\\_usd\\\_month: 5

G01:

  provider: "anthropic"

  model: "claude-sonnet-4-6"

  budget\\\_usd\\\_month: 5

G02:

  provider: "anthropic"

  model: "claude-opus-4-8"

  budget\\\_usd\\\_month: 8

G03:

  provider: "anthropic"

  model: "claude-opus-4-8"

  budget\\\_usd\\\_month: 10

G04:

  provider: "anthropic"

  model: "claude-opus-4-8"

  budget\\\_usd\\\_month: 15

E01:

  provider: "anthropic"

  model: "claude-sonnet-4-6"

  budget\\\_usd\\\_month: 8

image\_config:

real\\\_photo\\\_required\\\_types:    \\\# Content type nào BẮT BUỘC dùng ảnh thật

  \\- "product\\\_feature"

  \\- "food\\\_showcase"

  \\- "store\\\_interior"

  \\- "team\\\_and\\\_people"

ai\\\_generation\\\_allowed\\\_types:  \\\# Content type nào cho phép AI generate ảnh

  \\- "poster"

  \\- "meme"

  \\- "text\\\_graphic"

  \\- "infographic"

  \\- "promotional\\\_banner"

##### 7.4.2.6. Agent Schedule Config *(B6)*

schedule\_config:

weekly\_cycle\_day: "monday"      \# Ngày bắt đầu weekly cycle

weekly\_cycle\_time: "08:00"      \# Giờ A01 bắt đầu dispatch strategy agents

analytics\_delay\_days: 7         \# G01 chạy sau publish bao nhiêu ngày

per\_agent\_schedule:             \# Override schedule riêng từng agent nếu cần

G01:

  run\\\_time: "06:00"           \\\# Chạy sớm để có data trước giờ làm việc

G04:

  run\\\_time: "09:00"           \\\# Chạy sau khi G03 xong

###### *7.4.2.6.1. Client tự điều chỉnh ở đâu? (B6.1)*

Client (hoặc Agency Admin thay mặt client) chỉnh toàn bộ schedule này qua **Client Portal → Cài đặt → Configuration → Agent Schedule**, tương tự B2 — hoàn toàn no-code, thao tác qua form:

- Dropdown chọn ngày bắt đầu weekly cycle (Thứ 2 → Chủ nhật)  
- Time picker chọn giờ A01 dispatch  
- Time picker riêng cho từng agent muốn override (ví dụ kéo G01 chạy sớm hơn)  
- Slider/input chọn `analytics_delay_days` (mặc định T+7, có thể đổi T+3, T+14...)

Cùng màn hình **Configuration** này, client cũng quản lý luôn các config khác đã nêu ở B2/B3/B5: brand voice, content frequency, model/budget per agent — gộp chung thành một khu vực "Agent Settings" duy nhất trong Portal, không tách rời nhiều màn hình khác nhau. Mọi thay đổi áp dụng ngay từ task tiếp theo, không cần deploy.

---

#### 7.4.3. Per-Agent Contracts (12 Agents) *(Tầng 3 · Part C)*

Thứ tự viết theo execution flow: A01 → B01 → B02 → B03 → D01 → D02 → E01 → F01 → G01 → G02 → G03 → G04

---

##### 7.4.3.1. A01 — Orchestrator *(C1)*

**Agent Code:** A01  
**Role:** Điều phối toàn bộ workflow của một weekly cycle — đọc state, quyết định bước tiếp theo, dispatch task đúng agent, xử lý escalation. A01 không viết content, không phân tích dữ liệu.

###### *Triggers*

| Trigger | Ý nghĩa |
| :---- | :---- |
| `beat_weekly` | Celery Beat kích hoạt đầu mỗi tuần — bắt đầu cycle mới |
| `campaign_created` | Agency Admin tạo campaign/event mới |
| `campaign_ended` | Campaign kết thúc, cleanup context |
| `strategy_gate_approved` | Một trong 3 strategy gate (S1/S2/S3) được approve |
| `content_gate_approved` | Một content item được client approve |
| `asset_submitted` | Client upload asset theo asset request |
| `eval_failed` | Evaluator báo fail sau retry tối đa |
| `publish_due` | Đến giờ đăng bài đã schedule |
| `analytics_due` | T+7 sau publish — kích hoạt G01 |
| `recommendation_done` | G04 xong — kích hoạt P01 (xem giải thích P01 ở box bên dưới) |
| `direct_assign` | Client giao task trực tiếp, A01 chỉ validate rồi forward |

**P01 là gì?** P01 — *Feedback Learning Pipeline* — **không phải là một trong 12 agent chính**, mà là một pipeline chạy nền (background job) sau khi G04 hoàn thành hoặc sau khi có human edit/feedback trên content. P01 đọc tất cả chỉnh sửa/reject mà client đã làm trên Caption Writer (D01), Image Design (D02), Content Plan (B03), cùng learning packet từ G04 — rồi chuyển hóa thành các **bản ghi học hỏi cụ thể** (structured feedback record) và ghi ngược vào episodic memory đúng agent liên quan. Nhờ vậy, cycle tuần sau B02/B03/D01/D02 "nhớ" được lỗi đã mắc và performance pattern đã học, mà không cần con người nhắc lại. P01 không gọi LLM để sáng tạo nội dung — nó chỉ trích xuất, cấu trúc hóa và ghi memory. Chi tiết contract đầy đủ của P01 xem ở Tầng 2 — Section 7.3.12.

###### *Inputs*

- BasePayload chuẩn  
- Trạng thái hiện tại của cycle (phase: strategy / content\_production / publishing / analytics)  
- Danh sách content items và trạng thái FSM của từng item

###### *Business Rules*

1. **Precheck bắt buộc trước mọi action:** Client phải `active` (cờ trạng thái trong bảng `clients`), và **quota LLM budget tổng của client trong tháng** (`clients.monthly_budget_usd` — Tầng 1\) chưa vượt 100%. Đây là quota cấp client, khác với budget cap per-agent ở B5 (per-agent budget là giới hạn riêng từng agent, quota ở đây là tổng chi tiêu LLM của toàn bộ 12 agent cộng lại trong tháng cho client đó). Nếu vượt quota tổng → toàn bộ agent của client bị từ chối chạy, không riêng agent nào.  
2. **Campaign check:** Nếu không có campaign active → bỏ qua B01, bắt đầu từ B02. Nếu có campaign → bắt đầu từ B01.  
3. **Phase guard:** A01 không chuyển sang phase mới nếu điều kiện chưa thỏa (xem Tầng 2 — Transition Guards).  
4. **Concurrent cycle limit:** Tối đa 2 cycle open cùng lúc (1 weekly \+ 1 campaign\_supplement). Nếu weekly cycle vẫn ở phase strategy → không tạo cycle mới, alert Agency Admin.  
5. **Direct assign:** Khi client dùng `T20` để giao task thẳng cho agent, A01 nhận request, validate client\_id và agent availability, rồi forward payload trực tiếp — không tạo cycle mới.

###### *LLM Calls*

| Mục đích | Model Tier |
| :---- | :---- |
| Phân tích trigger và quyết định dispatch action | Power |

###### *Outputs*

- `DispatchInstruction` cho mỗi agent được gọi  
- State transition log (ghi vào DB)  
- Alert nếu có anomaly (stale cycle, quota warning, eval hard fail)

###### *Failure Behavior*

- Nếu dispatch fail → retry 2 lần → dead letter queue → Telegram alert Agency Admin  
- Không tự resolve stale cycle — chỉ alert và chờ Agency Admin quyết định

---

##### 7.4.3.2. B01 — IMC Planner *(C2)*

**Agent Code:** B01  
**Role:** Tạo Integrated Marketing Communication Plan khi có campaign/event. B01 chỉ chạy khi A01 xác nhận có campaign active trong cycle hiện tại.

###### *Triggers*

- A01 dispatch với `wake_reason = "campaign_created"` hoặc đầu cycle khi campaign đang active

###### *Inputs*

- Campaign brief (tên, ngày bắt đầu/kết thúc, offer, audience mô tả thô, key message mong muốn) — từ Campaign Template (B4)  
- Brand voice config từ ClientConfig  
- RAG: brand collection (về sản phẩm, tone, positioning, đối thủ nếu có data)  
- Episodic memory: campaign performance lần trước (nếu có)

###### *RAG Usage*

- `T01 query_brand_memory` → đọc brand collection (sản phẩm, tone, lịch sử campaign, thông tin đối thủ nếu có)  
- `T02 recall_episodic_memory` → lịch sử campaign tương tự

###### *LLM Calls*

Model tier cố định cho toàn bộ B01: **Power** (xem A3.2 — mỗi agent dùng một tier cố định cho mọi lần gọi LLM bên trong, bao gồm cả draft ban đầu và refinement khi có feedback).

###### *Outputs — IMC Plan document (cấu trúc chuẩn đầy đủ)*

B01 phải tạo một IMC Plan hoàn chỉnh theo đúng cấu trúc chuẩn ngành, không phải bản rút gọn:

| Phần | Nội dung |
| :---- | :---- |
| **1\. Phân tích bối cảnh (Situation Analysis)** | Bối cảnh thị trường liên quan đến campaign, đối thủ đang làm gì trong cùng giai đoạn (nếu có data), SWOT ngắn gọn riêng cho campaign này |
| **2\. Mục tiêu cụ thể (Objectives)** | Mục tiêu kinh doanh (ví dụ: tăng doanh số dịp Tết), mục tiêu marketing (tăng reach/engagement), mục tiêu truyền thông (tăng nhận diện thông điệp X) |
| **3\. Đối tượng mục tiêu & Insight** | Chân dung đối tượng mục tiêu của riêng campaign này (có thể khác/hẹp hơn audience chung của brand), và **insight** — sự thật ngầm hiểu rút ra từ hành vi/tâm lý đối tượng mà campaign sẽ khai thác |
| **4\. Big Idea & Core Message** | Ý tưởng lớn xuyên suốt campaign, thông điệp cốt lõi (key message) bám theo Big Idea |
| **5\. Kế hoạch thực thi theo giai đoạn** | Chia theo 3 giai đoạn chuẩn: **Teaser** (gây tò mò, khởi động), **Launch** (cao trào, công bố chính), **Sustain** (duy trì momentum, tận dụng UGC/feedback) — mỗi giai đoạn nêu rõ thời gian, kênh truyền thông, loại nội dung chủ đạo, tần suất |
| **6\. Phân bổ ngân sách** | Ước tính phân bổ effort/budget theo giai đoạn (ở mức CrewLab vận hành: chủ yếu là phân bổ volume content, không phải media spend vì CrewLab không chạy ads paid trong scope này trừ khi client có Social Ads tier) |
| **7\. KPIs đo lường** | Chỉ số cụ thể để đánh giá thành công: reach target, engagement rate target, số content được approve không cần sửa, v.v. — các KPI này sẽ được G01–G04 dùng để đối chiếu sau campaign |

Ghi qua `T09 write_planning_artifact` → loại `imc_plan`. Trạng thái: `pending_s1_review` (chờ Strategy Gate 1).

###### *HITL Gate: S1 — Strategy Gate (IMC Plan)*

- Client Admin review IMC Plan trên Portal (rich editor, có thể sửa text trực tiếp, comment, approve version)  
- Nếu **approve** → A01 dispatch B02, B02 đọc IMC Plan này làm context  
- Nếu **reject** → B01 tái tạo với feedback, tối đa 2 lần  
- Nếu **edit & approve** → version đã edit được lưu và dùng làm input cho B02

###### *Business Rules*

1. B01 không tự quyết content angle hoặc pillar — chỉ propose chiến lược tổng (Big Idea, message, giai đoạn thực thi), **không định nghĩa pillar**. Việc sáng tạo pillar cụ thể cho campaign là nhiệm vụ của B02 — B02 sẽ tự nghiên cứu insight và hành vi mạng xã hội rồi dựa trên IMC Plan này để đề xuất pillar phù hợp (xem C3)  
2. IMC Plan phải đủ 7 phần ở bảng trên — thiếu phần nào, artifact coi như chưa hoàn chỉnh, không chuyển sang S1  
3. Nếu client không có campaign → B01 không chạy, không tạo IMC Plan

###### *Failure Behavior*

- LLM timeout/error → retry 2 lần → fail với `error_code: llm_timeout`  
- Nếu reject lần 2 vẫn fail → dead letter, Agency Admin quyết định

---

##### 7.4.3.3. B02 — Content Pillar *(C3)*

**Agent Code:** B02  
**Role:** Nghiên cứu insight, hành vi mạng xã hội và performance lịch sử để **tự sáng tạo content pillars** (trụ nội dung) cho tuần/tháng tiếp theo — không phải chỉ "chọn" giữa pillar có sẵn. Nếu có campaign, B02 dựa vào IMC Plan từ B01 để sáng tạo pillar phù hợp chiến dịch; nếu không có campaign, B02 vẫn phải tự nghĩ ra pillar phù hợp cho nội dung thường ngày (evergreen) — không bao giờ để trống. Output là Pillar Document được human review.

###### *Triggers*

- A01 dispatch sau S1 approve (nếu có campaign) hoặc trực tiếp đầu cycle (nếu không có campaign)

###### *Inputs*

- ClientConfig: `content_pillars` (chỉ dùng làm tham khảo lịch sử, không phải danh sách cố định để chọn), `posting_frequency`, `platform`, `vertical` (ngành — để tham chiếu insight đặc thù ngành)  
- IMC Plan (nếu có) từ `T16 read_imc_plan` — B02 đọc Big Idea, Insight, đối tượng mục tiêu của campaign để sáng tạo pillar ăn khớp  
- Performance patterns từ `T10 read_performance_patterns` — pillar/angle nào đang perform tốt/kém trong lịch sử  
- Episodic memory: các cycle gần nhất đã dùng pillar gì, kết quả ra sao  
- RAG: brand collection để đảm bảo pillar phù hợp brand voice và sản phẩm thật của client

###### *RAG Usage*

- `T01 query_brand_memory` → brand positioning, product range, để pillar không lệch khỏi thực tế client kinh doanh gì  
- `T02 recall_episodic_memory` → pillar/angle performance history  
- `T10 read_performance_patterns` → pattern nào đang trending với client

###### *LLM Calls*

Model tier cố định cho toàn bộ B02: **Power**. Lý do nâng từ Standard lên Power: B02 không chỉ chọn giữa các pillar có sẵn, mà phải **research insight và hành vi mạng xã hội** (xu hướng nội dung đang hoạt động tốt trên platform, tâm lý đối tượng mục tiêu) rồi tổng hợp thành pillar mới — đây là task reasoning/sáng tạo chiến lược, không phải task viết nội dung đơn thuần.

###### *Outputs*

- **Pillar Document** gồm: danh sách pillars được B02 **tự sáng tạo** cho tuần/tháng này (không phải chọn từ danh sách có sẵn), weight/tỉ lệ mỗi pillar, **insight/lý do đằng sau mỗi pillar** (vì sao pillar này phù hợp lúc này — dựa trên data nào), note liên kết với IMC Plan nếu có campaign  
- Ghi qua `T09 write_planning_artifact` → loại `pillar_doc`  
- Trạng thái: `pending_s2_review`

###### *HITL Gate: S2 — Strategy Gate (Content Pillars)*

- Agency Admin (hoặc Client Admin tùy cấu hình) review và approve  
- Có thể edit trực tiếp trên Portal  
- Approve → B03 được dispatch với Pillar Document

###### *Business Rules*

1. B02 **luôn phải tự sáng tạo pillar mỗi cycle** dựa trên insight và data — kể cả khi không có campaign, B02 vẫn phải nghĩ ra pillar phù hợp cho nội dung thường ngày, không được để trống hoặc copy y nguyên pillar tuần trước mà không có lý do  
2. Khi có campaign: B02 đọc Big Idea \+ Insight \+ đối tượng mục tiêu từ IMC Plan (B01) để sáng tạo pillar bám sát chiến dịch — B02 không nhận pillar có sẵn từ B01 (B01 không tạo pillar, xem C2)  
3. B02 không xóa pillar cũ mà không có lý do — phải ghi rõ "pillar X giảm weight vì performance kém (engagement \-30%)"  
4. Nếu có campaign: pillar liên quan campaign được ưu tiên, nhưng không chiếm quá 60% tổng content mix trừ khi client chỉ định khác  
5. B02 luôn ghi episodic memory sau khi pillar được approve (để cycle sau so sánh)

###### *Failure Behavior*

- Nếu performance pattern collection rỗng (client mới, chưa có data) → B02 vẫn phải tự sáng tạo pillar dựa trên brand RAG \+ kiến thức chung về ngành (vertical), ghi note "cold start — pillar created without historical performance data"

---

##### 7.4.3.4. B03 — Content Plan *(C4)*

**Agent Code:** B03  
**Role:** Lập kế hoạch content cụ thể cho từng ngày/platform trong tuần — bao nhiêu bài, loại gì, angle gì, platform nào, giờ nào. Output là Content Plan được approve trước khi D01/D02 chạy.

###### *Triggers*

- A01 dispatch sau S2 approve

###### *Inputs*

- Pillar Document đã approve  
- IMC Plan (nếu có)  
- ClientConfig: `posting_frequency`, `post_time_windows`, `platforms`  
- Episodic memory: bài nào từng perform tốt theo giờ/ngày/platform  
- Performance patterns: angle nào đang tốt

###### *RAG Usage*

- `T02 recall_episodic_memory` → lịch sử angle \+ timing performance  
- `T10 read_performance_patterns` → best posting time insights

###### *LLM Calls*

| Mục đích | Model Tier |
| :---- | :---- |
| Lập Content Plan theo tần suất, platform, pillar weight đã duyệt | Standard |

###### *Outputs*

- **Content Plan** gồm: danh sách content items cho tuần, mỗi item có: ngày đăng, platform, pillar, angle, visual brief sơ bộ, giờ đăng dự kiến  
- Ghi qua `T09 write_planning_artifact` → loại `content_plan`  
- Trạng thái: `pending_s3_review`

###### *HITL Gate: S3 — Strategy Gate (Content Plan)*

- Agency Admin review Content Plan trên Portal — có thể thêm/bớt item, đổi ngày, đổi angle  
- Approve → A01 dispatch D01 và D02 cho từng content item  
- Đây là gate cuối cùng trước khi production agent chạy

###### *Business Rules*

1. Content Plan phải tôn trọng đúng `posting_frequency` — không tạo thêm hoặc bớt bài tự ý  
2. Phân phối pillar trong Plan phải reflect đúng weight đã approve ở B02 (±10% là acceptable)  
3. Không schedule 2 bài cùng platform trong cùng 1 khung giờ đăng  
4. Nếu có campaign: tối thiểu 2 bài/tuần phải là campaign content

###### *Failure Behavior*

- Nếu không đủ angle ideas cho số lượng bài yêu cầu → ghi note trên từng item còn thiếu angle, để Agency Admin edit trước khi approve

---

##### 7.4.3.5. D01 — Caption Writer *(C5)*

**Agent Code:** D01  
**Role:** Viết caption và **image brief** cho từng content item đã được approve trong Content Plan. Caption được viết riêng cho từng platform; image brief là mô tả visual ngắn gọn để D02 dùng làm đầu vào — D02 luôn chạy **sau** D01, không chạy song song.

###### *Triggers*

- A01 dispatch per content item sau S3 approve → **D01 chạy trước, sau khi D01 xong mới dispatch D02**  
- Direct assign: client giao thẳng với brief cụ thể (bypass A01)

###### *Inputs*

- Content brief: pillar, angle, platform, campaign context (nếu có)  
- ClientConfig: brand voice, hashtag strategy, forbidden phrases  
- RAG: brand memory (tone examples, product info, approved captions mẫu)  
- Episodic memory: 5 caption được approve gần nhất \+ 5 caption bị reject (với lý do)  
- Previous failure report (nếu retry)

###### *RAG Usage*

- `T01 query_brand_memory` → product info, brand tone examples  
- `T02 recall_episodic_memory` → approved/rejected captions gần nhất

###### *LLM Calls*

Model tier cố định cho toàn bộ D01: **Standard** (áp dụng cho tất cả các lần gọi LLM bên trong agent này — viết caption Facebook, caption Instagram, và viết image brief).

###### *Outputs*

D01 trả về một object hoàn chỉnh, bao gồm **cả caption lẫn image brief** — đây là input trực tiếp cho D02:

{

"facebook\_caption": "...",

"instagram\_caption": "...",

"hashtags": \["\#bardinh", "\#cafe"\],

"cta": "Comment 'TẾT' để nhận ưu đãi nhé\!",

"image\_brief": {

"visual\\\_direction": "Ảnh ly bạc xỉu đá đặt trên bàn gỗ, ánh sáng buổi sáng, tone ấm...",

"content\\\_type": "product\\\_feature",

"real\\\_photo\\\_required": true,

"suggested\\\_asset\\\_tags": \\\["bac\\\_xiu", "morning", "warm\\\_light"\\\],

"overlay\\\_elements": \\\["logo nhỏ góc dưới phải", "text: 'Buổi sáng của bạn'"\\\],

"platform\\\_ratio": "1:1 cho Instagram, 4:5 cho Facebook"

}

}

- Trạng thái content item: `caption_and_brief_ready` → A01 dispatch D02  
- Ghi episodic memory sau khi caption được approve (bao gồm angle, tone, kết quả evaluate)

###### *Business Rules*

1. **Hashtag placement:** Tuân theo `hashtag_strategy` trong ClientConfig — `caption_end` (gắn cuối caption), `first_comment` (D01 ghi note để F01 xử lý), `none`  
2. **Forbidden phrases:** Không bao giờ dùng từ trong `avoid_phrases` của brand config  
3. **Platform adaptation — giới hạn thực tế:**  
   - **Facebook:** Không có giới hạn cứng; "See more" xuất hiện sau khoảng **477 ký tự** trên desktop và **309 ký tự** trên mobile. Caption nên có hook rõ ràng trong 1–2 dòng đầu để giữ người đọc trước khi bị cắt  
   - **Instagram:** Tổng caption tối đa 2.200 ký tự; "See more" xuất hiện sau khoảng **125 ký tự** (không phải 150 từ) trong feed. Nội dung quan trọng nhất phải nằm trong 125 ký tự đầu; hashtag và CTA có thể để sau dấu ngắt  
   - Không copy-paste caption từ platform này sang platform kia — tone, độ dài và cách dùng hashtag khác nhau  
4. **Image brief là bắt buộc:** D01 không được trả về output mà không có `image_brief` — đây là input bắt buộc cho D02 chạy tiếp. Nếu brief ảnh không đủ rõ, D02 sẽ không có đủ thông tin để xử lý visual  
5. **Avoid repetition:** So sánh với 5 caption gần nhất — không lặp cấu trúc câu mở đầu quá 3 lần trong tháng  
6. **Direct assign mode:** Khi client giao trực tiếp, D01 bỏ qua Brand RAG check nếu brief đã đủ; vẫn áp brand voice và forbidden phrases; vẫn bắt buộc có image\_brief trong output

###### *Failure Behavior*

- E01 fail, retry\_count \< 3 → nhận `fix_instructions` từ E01, viết lại với correction prompt (chỉ phần bị fail, không viết lại toàn bộ)  
- E01 fail, retry\_count \= 3 → trả về `eval_hard_fail`, alert Agency Admin  
- LLM timeout → retry 2 lần → dead letter

---

##### 7.4.3.6. D02 — Image Design *(C6)*

**Agent Code:** D02  
**Role:** Tạo visual (ảnh, poster, graphic) cho từng content item. Đọc caption và image brief từ D01 để tạo visual phù hợp về cả nội dung lẫn vibe. Quyết định dùng ảnh thật (xử lý từ Media Library) hay AI generate tùy theo content type trong image brief.

###### *Triggers*

- A01 dispatch **sau khi D01 hoàn thành** và trả về output `caption_and_brief_ready` — D02 chạy tuần tự sau D01, không chạy song song. Lý do: D02 cần đọc `image_brief` do D01 tạo ra (bao gồm visual direction, content\_type, suggested\_asset\_tags, overlay\_elements) để generate ảnh phù hợp với caption đã viết — nếu chạy song song D02 không có thông tin này  
- Direct assign: client giao cụ thể (ví dụ: "chỉnh sửa ảnh bài viết X" / "làm poster sự kiện Y")

###### *Inputs*

- **`caption`** từ D01 output: D02 đọc cả facebook\_caption và instagram\_caption để hiểu tone và nội dung bài viết, đảm bảo ảnh khớp với câu chuyện caption đang kể  
- **`image_brief`** từ D01 output (bắt buộc): `visual_direction`, `content_type`, `real_photo_required`, `suggested_asset_tags`, `overlay_elements`, `platform_ratio`  
- ClientConfig: `image_config` (real\_photo\_required\_types, ai\_generation\_allowed\_types), brand\_colors  
- Media Library: ảnh/video của client đã upload và approve

###### *RAG Usage*

- `T04 query_media_library` → tìm ảnh phù hợp dựa trên `suggested_asset_tags` từ image\_brief

###### *Image Strategy — Business Rule Cốt Lõi*

| Content Type | Chiến lược | Tool dùng |
| :---- | :---- | :---- |
| Ảnh sản phẩm thực tế (café, food, drink) | **Bắt buộc dùng ảnh thật** từ Media Library — ghép layout, thêm overlay/element | `T13 compose_image_from_assets` |
| Ảnh không gian quán, con người, team | **Bắt buộc dùng ảnh thật** — không AI generate người/quán | `T13 compose_image_from_assets` |
| Poster, meme, infographic, text graphic | **Cho phép AI generate hoàn toàn** | `T12 generate_image_ai` |
| Promotional banner (không có ảnh sản phẩm) | AI generate được nếu không dùng ảnh sản phẩm thật | `T12 generate_image_ai` |

**Rule quan trọng:** Nếu `real_photo_required = true` và **không tìm được ảnh phù hợp trong Media Library** → **không được AI generate thay thế** → tạo `asset_request` gửi cho client, content item chuyển sang `waiting_asset`.

###### *LLM Calls*

Model tier cố định cho toàn bộ D02: **Standard** (áp cho tất cả LLM call bên trong: phân tích image brief, quyết định chiến lược ảnh, viết image generation prompt nếu AI generate).

###### *Tool Calls (tùy content type)*

- `T04 query_media_library` → tìm ảnh thật theo `suggested_asset_tags` từ image\_brief  
- `T12 generate_image_ai` → AI generate (chỉ khi content type cho phép)  
- `T13 compose_image_from_assets` → xử lý/ghép ảnh thật \+ overlay elements  
- `T05 create_asset_request` → khi thiếu ảnh thật

###### *Outputs*

- **Image/visual** URL (lưu vào storage, link đính kèm content item)  
- Metadata: `source_type` (real\_photo / ai\_generated / composed), `asset_ids_used` (nếu dùng ảnh thật), `generation_prompt` (nếu AI generate)  
- Trạng thái: `visual_ready` → A01 dispatch E01 khi cả D01 lẫn D02 đều xong; hoặc `waiting_asset` nếu thiếu ảnh thật

###### *Business Rules*

1. D02 không tự chọn AI generate nếu content type yêu cầu ảnh thật — dù không có ảnh trong library, **bắt buộc tạo asset request**, không được generate thay thế  
2. Mọi ảnh AI generated phải qua E01 chấm điểm `image_design_quality` trước khi submit cho client  
3. Ảnh compose từ ảnh thật: sản phẩm chính không bị che khuất, text overlay đọc được trên mobile, màu overlay đúng `brand_colors`  
4. D02 luôn xuất đúng `platform_ratio` do D01 chỉ định trong image\_brief — không để hệ thống tự crop sau  
5. Direct assign: client giao thẳng thì D02 nhận brief trực tiếp từ client thay vì từ D01; E01 vẫn chạy sau

###### *Failure Behavior*

- `T12 generate_image_ai` fail → retry 1 lần với image model fallback (thứ tự theo `image_config`) → nếu vẫn fail → alert Agency Admin  
- Không tìm được ảnh thật \+ `real_photo_required = true` → `waiting_asset`, **không fail**

---

##### 7.4.3.7. E01 — Evaluator *(C7)*

**Agent Code:** E01  
**Role:** Chấm điểm chất lượng caption (từ D01) và visual (từ D02) trước khi đưa vào Content Approval Gate. E01 là quality control gate — không tạo content, chỉ đánh giá và ra quyết định pass/retry/fail.

###### *Triggers*

- A01 dispatch sau khi D01 và D02 đều xong cho cùng một content item  
- Có thể nhận riêng lẻ nếu chỉ caption hoặc chỉ visual cần evaluate

###### *Inputs*

- Caption draft từ D01  
- Visual URL từ D02  
- ClientConfig: brand voice, content pillar, platform  
- Content Plan item: pillar, angle, platform expected  
- Previous failure report (nếu retry)

###### *LLM Calls*

Model tier cố định cho toàn bộ E01: **Standard** (áp cho cả chấm caption và chấm visual trong cùng một lần gọi hoặc hai lần gọi liên tiếp — đều dùng cùng model đã config).

###### *Scoring Rubric*

**Caption (max 10 điểm):**

| Tiêu chí | Điểm tối đa |
| :---- | :---- |
| Brand voice alignment | 2.5 |
| Content accuracy (thông tin đúng) | 2.0 |
| Platform fit (format, length đúng platform) | 2.0 |
| Pillar/angle relevance | 2.0 |
| Originality (không lặp caption cũ) | 1.5 |

**Visual (max 5 điểm, đánh giá riêng):**

| Tiêu chí | Điểm tối đa |
| :---- | :---- |
| Visual asset fit (đúng sản phẩm/context đã brief) | 2.0 |
| Image design quality (bố cục, màu, mood) | 2.0 |
| Mobile readability (text đọc được, không bị crop) | 1.0 |

###### *Pass/Fail Logic*

| Score | Hành động |
| :---- | :---- |
| Caption ≥ 7.0 AND Visual ≥ 3.5 | **Pass** → `pending_content_approval` |
| Caption 5.0–6.9 OR Visual 2.5–3.4 | **Retry** → gửi fix\_instructions về D01/D02 (nếu retry\_count \< 3\) |
| Caption \< 5.0 OR Visual \< 2.5 | **Hard fail** → alert Agency Admin, không tiếp tục retry |
| Retry lần 3 vẫn fail | **Hard fail** → alert Agency Admin |

**Trường hợp đặc biệt — Visual trạng thái `waiting_asset`:** Nếu D02 không tìm được ảnh thật và content type yêu cầu ảnh thật (`real_photo_required = true`), D02 sẽ **không tạo ra visual URL** mà tạo `asset_request` và set state `waiting_asset`. Trường hợp này **E01 không được gọi** — A01 biết content item đang ở `waiting_asset` thì không dispatch E01, chỉ chờ client submit ảnh. Khi asset được submit, A01 dispatch lại D02 (không phải D01 — caption không thay đổi), sau đó D02 xong mới gọi E01 như bình thường.

###### *Outputs*

{

"overall\_status": "pass | retry | hard\_fail",

"caption\_score": 8.2,

"visual\_score": 4.1,

"failed\_criteria": \["visual\_asset\_fit"\],

"fix\_instructions": "Replace generic cup photo with real iced coffee asset from Bardinh library.",

"retry\_allowed": true,

"retry\_target": "D02"

}

###### *Business Rules*

1. E01 đánh giá caption và visual **độc lập** — pass caption nhưng fail visual → chỉ gửi `retry_target: "D02"`, không retry D01; và ngược lại  
2. E01 **không bao giờ được gọi** khi content item đang ở trạng thái `waiting_asset` — đây không phải lỗi chất lượng content mà là thiếu tài nguyên đầu vào; sau khi asset nộp xong và D02 chạy lại thành công thì mới gọi E01  
3. Evaluator score **không hiển thị cho client** trên Content Approval view — chỉ Agency Admin thấy ở Internal App

###### *Failure Behavior*

- E01 LLM error → retry 1 lần → nếu vẫn lỗi → pause content item, alert Agency Admin

---

##### 7.4.3.8. F01 — Meta Publisher *(C8)*

**Agent Code:** F01  
**Role:** Đăng bài lên Facebook và Instagram đúng giờ đã schedule, sau khi content được client approve. F01 là execution agent — không viết content, không phân tích, chỉ thực thi publish.

###### *Triggers*

- A01 dispatch khi `publish_due` (Celery Beat đúng giờ scheduled)

###### *Inputs*

- Content item đã approve: caption text, hashtags, image URL  
- `scheduled_at`: giờ đăng cụ thể  
- ClientConfig: Meta account refs (Page ID, Account ID), hashtag placement config  
- Không đọc RAG, không đọc brand memory

###### *Tool Calls*

- `T06 publish_to_meta` → gọi Meta Graph API để đăng bài lên Facebook Page / Instagram Business  
- `T17 schedule_publish_task` → tạo Celery task cho đúng giờ (nếu chưa schedule)  
- `T15 update_content_state` → chuyển state sang `published`

###### *Business Rules*

1. F01 chỉ publish item ở trạng thái `content_approved` hoặc `scheduled` — không bao giờ publish item chưa qua HITL gate  
2. **Hashtag placement:** Nếu `hashtag_strategy = "first_comment"` → sau khi đăng bài thành công, F01 tự động post comment đầu tiên với hashtags  
3. Nếu client reschedule giờ đăng → F01 revoke Celery task cũ và tạo task mới đúng giờ mới  
4. Đăng Facebook và Instagram là 2 task riêng biệt, fail 1 platform không cancel platform còn lại

###### *Outputs*

- Meta post ID (Facebook \+ Instagram riêng biệt)  
- Timestamp đăng thực tế  
- State transition: `published`  
- Ghi `published_at` và `post_id` vào DB để G01 dùng sau

###### *Failure Behavior*

- Meta API rate limit → retry exponential backoff (5 phút, 15 phút, 30 phút) → sau 3 lần fail → alert Agency Admin  
- Meta API auth error → alert ngay, không retry (cần Agency Admin xử lý credential)  
- Image upload fail → retry 1 lần với resized version → nếu vẫn fail → alert Agency Admin, giữ state `scheduled`

---

##### 7.4.3.9. G01 — Meta Data Collector & Cleaning *(C9)*

**Agent Code:** G01  
**Role:** Thu thập metrics từ Meta Graph API cho các bài đã đăng được T+7 ngày. Làm sạch dữ liệu và chuẩn hóa trước khi đưa vào G02 phân tích.

###### *Triggers*

- A01 dispatch `analytics_due` — T+7 ngày sau `published_at` của từng post

###### *Inputs*

- Danh sách post IDs (Facebook \+ Instagram) cần lấy metrics  
- Metric window: `T+7` mặc định  
- ClientConfig: platform list

###### *Metrics thu thập — Phân loại khả thi từ Meta Graph API*

Meta Graph API chia metrics thành 2 nhóm: **có thể lấy confirmed** (đã verified qua tài liệu API v18.0+) và **conditional** (phụ thuộc permission hoặc loại post). G01 phải log rõ từng field lấy được / không lấy được cho từng post, không được giả lập hoặc ước tính.

**✅ Lấy được — Confirmed (yêu cầu `pages_read_engagement` permission):**

| Field trong API | Metric ý nghĩa | Platform | Ghi chú |
| :---- | :---- | :---- | :---- |
| `reach` | Số người thực tế xem bài | Facebook, Instagram | Insight-level, per post |
| `impressions` | Tổng lần hiển thị (gồm repeat) | Facebook, Instagram | Per post insight |
| `likes` | Số like (không bao gồm reaction khác) | Facebook, Instagram | Basic engagement |
| `comments` | Tổng số comment | Facebook, Instagram | Per post |
| `shares` | Số lượt share | Facebook | Instagram không có field shares công khai per post qua API |
| `saved` | Số lượt save | Instagram | Field `saved` trong Instagram Insights — **Facebook không có** |
| `video_views` | Số lượt xem video (≥3 giây) | Facebook, Instagram | Chỉ có nếu media\_type \= VIDEO |
| `total_interactions` | Tổng tương tác (Meta tự tính) | Facebook | Dùng để cross-check, không dùng làm engagement\_rate chính |

### 7.5. Key Features — Tầng 4: Portal & External Interfaces

Tài liệu này hợp nhất các bản thiết kế Tầng 4 (Client Portal, Internal App, Notification & Meta Integration) thành **một nguồn duy nhất**, đối chiếu và đồng bộ hoàn toàn với kiến trúc tổng thể CrewLab.

> ⚠️ **Open Question chưa chốt (giữ nguyên từ PRD gốc, không tự resolve):** Threshold pass/fail của E01 đang **lệch giữa 2 tài liệu** — Tầng 2 ghi 7.0, Tầng 3 ghi 8.0. Badge pass/fail ở Debug View và mọi nơi hiển thị kết quả E01 cần chốt 1 giá trị trước khi build.

#### Mục lục Tầng 4

- [7.5.1 — Hạ Tầng & Deploy](#751-hạ-tầng--deploy)
- [7.5.2 — API & Auth Standard](#752-api--auth-standard)
- [7.5.3 — Client Portal](#753-client-portal)
  - [7.5.3.0 Information Architecture](#7530-information-architecture)
  - [7.5.3.1 Pixel Office ⭐ MỚI](#7531-pixel-office--màn-hình-chính-mới)
  - [7.5.3.2 Kanban Dashboard ⭐ MỚI](#7532-kanban-dashboard--bảng-quản-lý-task-mới)
  - [7.5.3.3 Content Hub ⭐ MỚI](#7533-content-hub-mới--gộp-campaign--pillar--angle--content-plan)
  - [7.5.3.4 Gate 3 — Báo cáo](#7534-analytics-acknowledgment-gate-gate-3--báo-cáo)
  - [7.5.3.5 Asset Request](#7535-asset-request--upload-flow)
  - [7.5.3.6 Direct Assign](#7536-direct-assign-task-ui-t20)
  - [7.5.3.7 Cài đặt (Settings)](#7537-cài-đặt-settings--gộp-thêm-thư-viện-ảnh)
  - [7.5.3.8 Notification Center](#7538-notification-center)
- [7.5.4 — Internal App (Agency Admin)](#754-internal-app-agency-admin)
  - [7.5.4.0 Information Architecture & Ghi chú phạm vi](#7540-information-architecture--ghi-chú-phạm-vi)
  - [7.5.4.1 Client List — Màn hình đầu tiên](#7541-client-list--màn-hình-đầu-tiên)
  - [7.5.4.2 Onboard Client Mới — Wizard 9 bước](#7542-onboard-client-mới--wizard-9-bước)
  - [7.5.4.3 Quản lý Chi phí AI](#7543-quản-lý-chi-phí-ai)
  - [7.5.4.4 Acceptance Criteria Internal App](#7544-acceptance-criteria-internal-app)
- [7.5.5 — Notification System](#755-notification-system)
- [7.5.6 — Meta Graph API Integration](#756-tích-hợp-meta-graph-api)
- [7.5.7 — NFR & Acceptance Criteria](#757-nfr--acceptance-criteria)

---

#### 7.5.1. Hạ Tầng & Deploy

*(Không đổi so với bản thiết kế chính — không có thay đổi kỹ thuật hạ tầng nào phát sinh từ Pixel Office/Kanban/Content Hub, vì đây thuần là thay đổi UI/UX trên cùng data layer và cùng topology 3 service.)*

##### Topology — 3 service độc lập

| Service | Vai trò | Người dùng | Deploy ở đâu |
|---------|---------|-----------|---------------|
| Backend API (FastAPI) | Toàn bộ business logic, endpoint `/api/v1/...`, Celery worker, webhook receiver | Cả 2 frontend gọi vào | PaaS có persistent process |
| Client Portal (Next.js) | UI cho `client_admin`/`client_staff` — Pixel Office, Kanban, Content Hub, duyệt bài, báo cáo, cấu hình | Khách hàng (Bardinh Coffee...) | Vercel, domain riêng trả phí |
| Internal App (Next.js) | UI cho `agency_admin` — debug, DLQ replay, LLM provider config, cross-client view | Nội bộ CrewLab | Vercel free tier, subdomain miễn phí |

**Lý do tách 2 frontend:** 2 audience khác nhau, tránh lộ surface area (DLQ, debug view, cross-client data) qua bundle JS; Internal App thay đổi nhanh, tách deploy để không ảnh hưởng uptime Portal khách trả tiền. Cả 2 vẫn gọi chung 1 Backend API — phân biệt bằng JWT role claim, không tách hạ tầng dữ liệu.

##### Domain Map

| Domain | Trỏ tới | Ghi chú |
|--------|---------|---------|
| crewlab.com | Client Portal (Vercel) | Domain trả phí |
| crewlab-admin.vercel.app | Internal App (Vercel free) | Subdomain mặc định cho MVP |
| api.crewlab.vn | Backend API (FastAPI) | Domain riêng cho backend |

Backend KHÔNG bao giờ phục vụ HTML/frontend — chỉ trả JSON theo response envelope (7.5.2).

##### Backend Hosting

Celery worker cần process chạy liên tục, webhook receiver cần endpoint luôn sẵn sàng → loại serverless thuần. **Railway** cho Backend API + Celery worker + Postgres trong giai đoạn pilot (chi phí <$20/tháng/client, tránh cold-sleep của free tier Render). ChromaDB chạy chung instance với backend cho pilot, tách riêng khi cần scale.

> **Ghi chú đồng bộ:** Changelog PRD gốc v1.1 ghi rằng hạ tầng đã **chốt lại về Hetzner VPS CAX31 + Coolify** (không dùng Railway/Render) — xem Section 7.6 Technology của PRD gốc. Bảng trên phản ánh quyết định ở thời điểm viết Tầng 4 ban đầu; **Hetzner + Coolify là quyết định cuối cùng, override phần Railway ở đây.** Nếu dev bắt đầu implement, dùng Hetzner CAX31 + Coolify, không dùng Railway.

##### CORS Policy

Whitelist rõ ràng, không wildcard: `https://crewlab.com`, `https://crewlab-admin.vercel.app`, `http://localhost:3000`, `http://localhost:3001` (dev). Không set `Access-Control-Allow-Origin: *` vì endpoint có side-effect + credential JWT.

##### Environment Separation

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| Local | uvicorn reload | `next dev` | Postgres local / Supabase dev |
| Staging | Staging service riêng | Vercel Preview | Supabase project staging riêng |
| Production | Production service | Vercel Production | Supabase production |

**Quy tắc cứng:** Staging và Production **không bao giờ share database**.

##### CI/CD Flow

- Backend: push `main` → auto deploy production; push `staging` → deploy staging service riêng.
- Client Portal (Vercel): mỗi PR có Preview Deployment; merge `main` → production tại crewlab.com.
- Internal App (Vercel free): merge `main` → production luôn, không cần Preview phức tạp.
- Migration: qua Supabase CLI/Alembic, chạy thủ công có review trước khi áp production.

##### Secrets & Config Management

Secret nhạy cảm (Meta App Secret, Telegram Bot Token, Supabase Service Role Key, LLM Provider API keys) không bao giờ xuất hiện ở frontend — chỉ tồn tại ở Backend env.

---

#### 7.5.2. API & Auth Standard

*(Không đổi. Mọi endpoint mới phục vụ Pixel Office/Kanban/Content Hub đều tuân theo chuẩn này, không tự phát minh format riêng.)*

##### API Convention

- Versioning: mọi endpoint dưới `/api/v1/...`. Breaking change → tăng version.
- Response envelope chuẩn:
```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "error_code": "...", "message": "...", "details": {} } }
```
- Pagination: cursor-based cho mọi list endpoint (Kanban board, Notification Center, Audit Log...) — không offset.
- Idempotency: mọi endpoint có side-effect (approve, publish trigger, direct assign, asset upload, **kéo-thả card đổi state**) bắt buộc nhận `idempotency_key`.

##### Authentication & Session

- MVP: email/password qua Supabase Auth. Magic link Post-MVP.
- JWT mang claims: `role`, `client_id`, `user_id`.
- Session refresh tự động khi còn hiệu lực < 5 phút.
- Remember me: giữ phiên 30 ngày, mặc định hết hạn cuối ngày.
- Password reset: email link, hết hạn 1 giờ, dùng 1 lần.

##### Authorization Middleware

- `require_role`, `require_client_match` (trừ `agency_admin` thao tác cross-client trong Internal App).
- Defense-in-depth layer 2: RLS ở DB chặn ở tầng dữ liệu; middleware chặn sớm ở tầng API, trả 403 rõ ràng.
- **3 role:** `agency_admin` (full access, Internal App), `client_admin` (full access trong client mình, có quyền Approve), `client_staff` (xem được nhưng **không có nút Approve/Reject** ở bất kỳ đâu — card Kanban, modal Content Plan, Gate 3).

##### Error Response Standard

| Nhóm error_code | HTTP Status | Khi nào dùng |
|-----------------|-------------|--------------|
| `auth_*` | 401 | Login sai, token hết hạn |
| `validation_*` | 422 | Request body sai schema |
| `not_found_*` | 404 | Resource không tồn tại/không thuộc user |
| `conflict_*` | 409 | Hành động xung đột state hiện tại (vd: approve 2 lần, **kéo card sang state không hợp lệ**) |
| `rate_limited` | 429 | Vượt rate limit |
| `upstream_*` | 502 | Lỗi từ Meta/Telegram |
| `server_error` | 500 | Lỗi không xác định |

`message` luôn user-facing: tiếng Việt cho Client Portal, tiếng Anh cho Internal App.

##### Rate Limiting & Webhook Signature

- Endpoint upload (Asset Request, ảnh Telegram): tối đa 50 request/giờ/user.
- Webhook: không rate limit kiểu user thường, dùng **signature verification** làm chốt chặn chính.
- Mọi webhook (Meta, Telegram) bắt buộc verify chữ ký trước khi xử lý field bất kỳ. Không verify được → reject 401, ghi audit log `SECURITY_BREACH`, không xử lý tiếp dù payload hợp lệ.

---

#### 7.5.3. Client Portal

##### 7.5.3.0. Information Architecture

```
┌─────────────────────────────────────────────┐
│  🏢 Văn phòng (Pixel Office)  ← màn hình chính sau login │
├─────────────────────────────────────────────┤
│  📋 Bảng công việc (Kanban Dashboard)        │
│  📁 Content Hub                              │
│      ├─ Tab: Campaign                        │
│      ├─ Tab: Pillar & Angle                  │
│      └─ Tab: Content Plan (Calendar)         │
│  📸 Yêu cầu ảnh (Asset Request)              │
│  ⚡ Giao việc nhanh (Direct Assign)           │
│  📊 Báo cáo (Analytics Gate)                 │
│  🔔 Thông báo                                │
│  ⚙️ Cài đặt (Settings)                       │
│      ├─ Model & Ngân sách                    │
│      ├─ Lịch đăng bài                        │
│      ├─ Brand Voice                          │
│      ├─ Thư viện ảnh (Media Library)         │
│      └─ Tích hợp (Telegram Pairing, Meta)    │
└─────────────────────────────────────────────┘
```

**Nguyên tắc điều hướng:**

| Màn hình | Trả lời câu hỏi gì |
|----------|---------------------|
| Pixel Office | "Đang có chuyện gì xảy ra?" (overview trực quan) |
| Kanban | "Việc gì đang ở đâu, tôi cần làm gì?" (tác vụ cụ thể) |
| Content Hub | "Kế hoạch nội dung của tôi trông như thế nào?" (planning/config) |
| Settings | Toàn bộ cấu hình ít thay đổi (bao gồm Media Library) |

**Sidebar/bottom-tab (mobile)** chỉ hiện **5 mục chính**: Văn phòng, Công việc, Content, Báo cáo, Cài đặt. Asset Request và Direct Assign **không có chỗ cố định trên sidebar** — truy cập qua notification/CTA nổi, tránh rối navigation.

---

##### 7.5.3.1. Pixel Office — Màn hình chính (MỚI)

###### Mục đích

Đây là màn hình đầu tiên sau khi login. Thay vì nhìn số liệu, chủ quán nhìn thấy **một văn phòng pixel-art isometric** nơi các nhóm AI agent (team desk) đang "làm việc" cho họ theo thời gian thực — cảm giác giống nhìn vào văn phòng qua camera, không phải đọc dashboard.

###### Nguyên tắc thiết kế

- Đây là lớp **visualization**, không phải nơi thao tác nghiệp vụ sâu. Mọi hành động thực sự (duyệt bài, sửa caption...) đều dẫn người dùng sang Kanban/Content Hub — Pixel Office chỉ là cổng vào + overview trạng thái.
- Không hiển thị số liệu kỹ thuật (eval_score, token usage...) ở đây — giữ đúng tinh thần "nhìn phát biết chuyện gì đang xảy ra" cho người không rành kỹ thuật.
- Animation nhẹ (idle loop, typing loop) — dùng sprite-sheet CSS animation để nhẹ tải trên mobile 3G.

###### Cấu trúc: 4 bàn làm việc (team desk)

| # | Bàn (Team Desk) | Agent trực thuộc | Vai trò hiển thị |
|---|------------------|------------------|------------------|
| 1 | 🧭 Bàn Chiến lược (Strategy Desk) | A01 Orchestrator, B01 IMC Planner, B02 Content Pillar, B03 Content Plan | Lên kế hoạch tuần/campaign |
| 2 | ✍️ Bàn Sáng tạo (Creative Desk) | D01 Caption Writer, D02 Image Designer | Viết caption, thiết kế ảnh |
| 3 | ✅ Bàn Kiểm duyệt & Xuất bản (QA & Publish Desk) | E01 Evaluator, F01 Publisher | Chấm chất lượng, đăng bài lên Meta |
| 4 | 📈 Bàn Phân tích (Analytics Desk) | G01 Metrics Collector, G02/G03 Insight, G04 Report, H01 Feedback Loop | Thu thập số liệu, viết báo cáo, học từ feedback |

###### Bố cục màn hình

```
┌────────────────────────────────────────────────────────┐
│  Bardinh Coffee — Văn phòng CrewLab      🔔 3   👤 Admin│
├────────────────────────────────────────────────────────┤
│                                                          │
│   [Pixel-art isometric office — 4 bàn làm việc]         │
│                                                          │
│    🧭 Strategy      ✍️ Creative     ✅ QA&Publish  📈 Analytics │
│    [nhân viên đang  [nhân viên đang  [ghế trống,   [nhân viên   │
│     gõ máy, bubble:  vẽ, bubble:      bubble: "Chờ   đang xem    │
│     "Đang lên kế     "Đang viết       bạn duyệt      biểu đồ,    │
│     hoạch tuần 25"]  caption..."]     3 bài"]        idle]       │
│                                                          │
│   Banner nổi (nếu có việc gấp):                         │
│   ⚠️ 3 bài đang chờ bạn duyệt — [Xem ngay →]            │
│                                                          │
│   Thanh trạng thái dưới cùng: Tuần 25 · 4/6 bài đã đăng│
└────────────────────────────────────────────────────────┘
```

###### Trạng thái hiển thị trên từng bàn

Mỗi bàn có **1 trong 5 trạng thái**, map từ FSM state thật:

| Trạng thái | Animation/Icon | Điều kiện kích hoạt |
|------------|----------------|---------------------|
| 💤 Idle (nghỉ) | Nhân viên ngồi yên, màn hình máy tính mờ | Không có task nào của nhóm agent này đang active |
| ⌨️ Working (đang làm) | Nhân viên gõ phím/vẽ, có hiệu ứng "..." nhấp nháy trên màn hình pixel | Có content item đang ở state do agent nhóm này xử lý (GENERATING, EVALUATING, PLANNING...) |
| ⏳ Waiting (chờ người) | Nhân viên ngồi quay ra nhìn người dùng, bubble hiện số lượng | Có item đang ở state cần **client action** (PENDING_PLAN_APPROVAL, PENDING_CONTENT_APPROVAL, ANALYTICS_ACK_PENDING) |
| ❗ Blocked/Error | Bàn có biển cảnh báo đỏ nhấp nháy, nhân viên đứng khoanh tay | Có item liên quan bị stale/error/vào DLQ (F01 fail, retry vượt giới hạn) |
| 🏖️ Waiting Asset | Bàn Creative có hộp ảnh trống với dấu hỏi | Có item ở state `waiting_asset` |

**Rule ưu tiên hiển thị:** `Blocked/Error > Waiting > Working > Idle`.

###### Tương tác & Nguồn dữ liệu

- **Click vào 1 bàn** → mở **side panel** hiển thị: Tên team + danh sách agent, Task hiện tại, nút CTA trực tiếp ("Duyệt ngay →"), hoặc thông báo lỗi đơn giản.
- **Click vào banner nổi** → nhảy thẳng tới Kanban Task Board, tự bật toggle "Chỉ hiện task cần tôi duyệt".
- Realtime cập nhật qua Supabase channel `office_status:{client_id}`.

---

##### 7.5.3.2. Kanban Dashboard — Bảng quản lý Task (MỚI, chuẩn Trello)

###### Mục đích

Đây KHÔNG PHẢI màn hình quản lý bài viết/lịch đăng (đó là Content Plan Calendar ở §7.5.3.3). Kanban Dashboard là **bảng quản lý TASK của cả văn phòng AI (agent) lẫn con người**: mỗi card = 1 công việc cụ thể ai đó đang/đã/sẽ làm.

###### Cột (Columns) & Swimlane

- **To Do:** Task đã được tạo, đang xếp hàng chờ.
- **In Progress:** Agent đang xử lý task (LLM call / generate ảnh).
- **Review:** Task cần xác nhận (task loại Người sinh ra ở đây, hoặc task loại Agent vừa xong đang chờ bước kế tiếp).
- **Done:** Task hoàn tất.

**4 Swimlane ngang:** 🧭 Strategy Desk, ✍️ Creative Desk, ✅ QA & Publish Desk, 📈 Analytics Desk.

```
┌───────────────────────────────────────────────────────────────┐
│  Bảng công việc                           [Lọc ▾]  [Tuần 25 ▾]│
├─────────────┬─────────────┬─────────────┬───────────────────┤
│    To Do    │ In Progress │   Review    │        Done         │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│ 🧭 STRATEGY DESK                                   (1·0·0·3)   │
│ [B02: Pillar│             │             │ [B01][B02][B03]     │
│  tuần 26]   │             │             │                      │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ ✍️ CREATIVE DESK                                   (0·2·1·4)   │
│             │[D01: Viết   │[D02: Ảnh    │ [...][...]           │
│             │ caption·Bài E]│ Cold Brew·  │                      │
│             │             │ chờ E01]    │                      │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ ✅ QA & PUBLISH DESK                          (0·1·2·5) 🔴     │
│             │[F01: Đăng   │[👤 Duyệt bài │                      │
│             │ bài·retry   │ Cold Brew·  │                      │
│             │ lần 2 🔴]   │ còn 18h]    │                      │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ 📈 ANALYTICS DESK                                  (0·0·1·2)   │
│             │             │[👤 Xác nhận  │                      │
│             │             │ báo cáo     │                      │
│             │             │ tuần 24]    │                      │
└─────────────┴─────────────┴─────────────┴───────────────────┘
│      │  ●   │      │  ○   │      │  ○   │      │  ◐ AI đang làm │

└──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────────────┘

- Mỗi ô \= 1 ngày, hiển thị **thumbnail nhỏ \+ dot trạng thái** cho từng bài đăng ngày đó (có thể nhiều bài/ngày → xếp chồng thumbnail, hiện "+2" nếu quá 2 bài).  
- Badge ⚠️ nhỏ trên thumbnail nếu bài đó `real_photo_required = true` và chưa có ảnh thật nộp — nhắc trực quan ngay trên lịch, không cần mở modal mới biết.  
- Chuyển đổi **Tuần / Tháng** ở góc trên — view Tháng thu nhỏ thumbnail thành dot màu thuần (giống lịch mini ở Dashboard v1.0) để đủ chỗ hiển thị cả tháng.

**Click vào 1 bài trên lịch → Modal chi tiết** (đây là nơi chứa toàn bộ thông tin trước kia nằm sẵn trên bảng):

┌──────────────────────────────────────────────────────┐

│  Bài: Cold Brew mùa hè                          \[✕\]  │

│  Platform: Instagram        Ngày đăng: Thứ 3, 08:00   │

│  Pillar: Product Spotlight   Góc khai thác: Hương vị  │

│                                                        │

│  Brief ý tưởng: "Cold Brew mùa hè — hương vị mát lạnh"│

│  Brief ảnh: AI generate / \[xem shot list nếu cần ảnh thật\] │

│  CTA: Ghé thử                                         │

│                                                        │

│  \[Đổi giờ\]  \[Đổi pillar ▾\]  \[Thêm ghi chú cho D01\]   │

│  \[Xóa bài này khỏi cycle\]                             │

└──────────────────────────────────────────────────────┘

Nếu bài đã qua bước tạo nội dung (đã có caption/ảnh thật) → modal này tự động hiển thị thêm caption/ảnh, và các action Duyệt/Từ chối — **modal này chính là component được tái sử dụng khi click vào task loại Người trên Kanban Task Board (7.5.3.2)**: cùng 1 component duyệt bài, mở từ 2 lối vào khác nhau (từ Calendar hoặc từ card task "👤 Bạn: Duyệt bài..." trên Kanban) để tránh xây 2 UI trùng lặp cho cùng 1 hành động duyệt.

**Nút "Duyệt tất cả tuần"** (góc trên, tương đương Gate 1 cũ — duyệt kế hoạch tổng trước khi AI bắt đầu viết caption/tạo ảnh):

Duyệt kế hoạch tuần 25 — 6 bài

Hệ thống sẽ bắt đầu viết caption và tạo ảnh cho toàn bộ 6 bài.

⚠️ Bài Thứ 5 cần ảnh thật — deadline nộp Thứ 4

\[Từ chối tất cả\]                    \[Xác nhận — bắt đầu tạo nội dung\]

Giữ đúng rule v1.0: đây là duyệt **kế hoạch tổng**, không duyệt nội dung cụ thể (nội dung cụ thể duyệt qua modal chi tiết ở trên, có thể mở từ đây hoặc từ card task "👤 Bạn: Duyệt bài..." trên Kanban — xem 7.5.3.2). Từ chối tất cả → modal nhập lý do text tự do, Agency Admin nhận alert.

### UX Decisions

- 3 tab dùng chung 1 URL pattern `/content-hub?tab=...` — chuyển tab không mất context (vd đang xem tuần nào ở Content Plan vẫn giữ khi quay lại từ tab khác).  
- Calendar là **entry point duyệt kế hoạch tuần và xem/duyệt từng bài theo lịch**; Kanban là **nơi theo dõi task của agent \+ task cần người duyệt nói chung** (không chỉ nội dung — còn có task chiến lược, phân tích...). Hai màn hình không trùng vai trò: Calendar trả lời "bài nào đăng ngày nào, nội dung ra sao", Kanban trả lời "ai (agent/tôi) đang làm gì, tôi đang bị chờ ở đâu".  
- Trên mobile, Calendar view Tuần là mặc định (view Tháng chỉ dùng desktop do cần nhiều không gian ngang).

---

## 7.5.3.4. Analytics Acknowledgment Gate (Gate 3 — Báo cáo)

*(Giữ nguyên business logic v1.0, truy cập qua mục "Báo cáo" ở sidebar.)*

- Hiển thị `human_report` (Markdown từ G04) dạng đọc được, không phải JSON thô.  
- 4 metric card tóm tắt (Reach, Engagement, Saves, Platform tốt hơn), bài làm tốt nhất/kém nhất, nhận xét narrative 2-4 câu, gợi ý tuần sau, ô ghi chú tự do.  
- Actions: Acknowledge / Acknowledge with comment / Request clarification (tạo annotation thread gắn vào report, không tạo content item/cycle mới).  
- Auto-acknowledge sau 7 ngày không phản hồi, log `auto_ack_timeout`, không block cycle tiếp theo.  
- Không hiện số liệu raw (impressions, reactions breakdown) cho client.  
- Nút "Hỏi thêm ↗" dùng `sendPrompt()` mở chat với Claude về báo cáo này.

---

## 7.5.3.5. Asset Request / Upload Flow (nộp ảnh cho 1 bài cụ thể)

*(Giữ nguyên business logic v1.0. Lưu ý: đây là màn hình **nộp ảnh cho 1 yêu cầu cụ thể** khi D02 cần ảnh thật — khác với **Thư viện ảnh** quản lý toàn bộ kho ảnh, nay đã dời vào Settings, xem 7.5.3.7.6.)*

- Trigger: D02 tạo `asset_request`, state → `waiting_asset` → notification.  
- Shot list cụ thể (tự generate từ content brief B03), hướng dẫn chụp (ánh sáng, nền, kích thước tối thiểu).  
- Upload: chọn/kéo thả/chụp trực tiếp, multi-upload, ghi chú riêng từng ảnh.  
- Sau nộp: "Đang chờ Agency Admin duyệt" — không tự động vào Media Library.  
- Kênh song song: gửi ảnh trực tiếp qua Telegram (bot tự map vào request đang chờ).

---

## 7.5.3.6. Direct Assign Task UI (T20)

*(Giữ nguyên business logic v1.0, truy cập nhanh từ nút nổi "⚡ Giao việc nhanh" hoặc từ Pixel Office khi click vào bàn Creative.)*

- 2 chế độ: Qua Orchestrator (mô tả tự nhiên, A01 tự route) / Giao thẳng agent cụ thể (MVP: D01 hoặc D02).  
- Form: chọn chế độ → (nếu giao thẳng) chọn agent → brief tự do → chọn content item tham chiếu (tùy chọn).  
- **Business rule bắt buộc:** dù giao thẳng D02 hay qua Orchestrator, E01 luôn chấm điểm visual trước khi trả kết quả (AC-T3-15) — không có đường tắt bỏ qua Evaluator.  
- Không tạo cycle mới (AC-T3-14), kết quả trả về ngay trong session.

---

## 7.5.3.7. Cài đặt (Settings) — gộp thêm Thư viện ảnh

### Cấu trúc tab

\[ Model & Ngân sách \]  \[ Lịch đăng bài \]  \[ Brand Voice \]  \[ Thư viện ảnh \]  \[ Tích hợp \]

### 7.5.3.7.1. Model & Ngân sách

*(Giữ nguyên v1.0.)* Dropdown model theo agent (12 agent, nhóm theo provider, gắn nhãn tier Fast/Standard/Power), chỉ hiện model thuộc provider Agency Admin đã enable \+ cấu hình key. Budget cap input per agent (USD/tháng), hiệu lực ≤ 5 phút. D02 có dropdown riêng cho image model.

### 7.5.3.7.2. Lịch đăng bài

*(Giữ nguyên v1.0.)* Sửa `weekly_cycle_day`/`weekly_cycle_time`, `analytics_delay_days`, override giờ chạy riêng từng agent (per\_agent\_schedule).

### 7.5.3.7.3. Brand Voice & Content Config

*(Giữ nguyên v1.0.)* Tone, personality keywords, avoid phrases, ví dụ caption tốt/tệ, posting frequency & time windows per platform.

### 7.5.3.7.4. Thư viện ảnh (Media Library) — MỚI dời vào đây

**Trước đây (v1.0):** mục riêng "Thư viện ảnh" ở sidebar chính. **Nay (v2.0):** trở thành 1 tab trong Settings, vì đây là thao tác quản lý tư liệu nền (upload ảnh gốc, xem lại ảnh đã dùng) — không phải tác vụ hằng ngày như duyệt bài.

┌────────────────────────────────────────────────────┐

│  Thư viện ảnh              \[Tìm kiếm...\] \[+ Upload\] │

│  \[Tất cả\] \[AI tạo\] \[Ảnh thật\] \[Chờ duyệt\]          │

│                                                      │

│  \[IMG✅\]\[IMG✅\]\[IMG✅\]\[IMG✅\]\[⏳Chờ\]\[IMG✅\]           │

│  Cold Brew Hậu trường Lifestyle Menu  Cold Brew ...  │

└────────────────────────────────────────────────────┘

- Upload trực tiếp ảnh mới vào kho chung (không gắn với 1 asset\_request cụ thể nào) — dùng khi chủ quán muốn chủ động bổ sung tư liệu cho D02 dùng dần, khác với 7.5.3.5 (nộp ảnh theo yêu cầu cụ thể).  
- Filter: Tất cả / AI tạo / Ảnh thật / Chờ duyệt.  
- Click ảnh → xem chi tiết: metadata (tên file, ngày tải, loại, kích thước), tag đã dùng cho bài nào, action Xóa / Đặt làm ảnh mặc định cho 1 pillar.  
- Ảnh chờ duyệt (client vừa upload) vẫn cần Agency Admin duyệt trước khi D02 dùng — giữ nguyên rule kiểm soát chất lượng ở v1.0.

### 7.5.3.7.5. Tích hợp (Telegram Pairing \+ Meta connection status)

*(Giữ nguyên business logic v1.0.)* QR code \+ deep link pairing Telegram (TTL 10 phút, dùng 1 lần), trạng thái Connected/Disconnected \+ nút Unlink. Hiển thị trạng thái kết nối Meta (đọc-only cho client — kết nối/refresh Meta chi tiết nằm ở Internal App, 7.5.4.8, vì đây là thao tác kỹ thuật nhạy cảm do Agency Admin phụ trách khi onboarding).

---

## 7.5.3.8. Notification Center

*(Giữ nguyên business logic v1.0.)*

- List, đánh dấu đã đọc, filter theo loại (chờ duyệt/asset/báo cáo/hệ thống).  
- Real-time qua Supabase Realtime, không polling.  
- Mỗi notification có `action_url` dẫn thẳng đến đúng nơi cần xử lý — với thông báo "chờ duyệt" trỏ vào đúng card task loại Người trên Kanban (hoặc thẳng vào modal duyệt tương ứng ở Content Plan Calendar), thay vì trang Gate riêng như v1.0.

---

# 7.5.4. Internal App (Agency Admin)

*(Bản PRD thu hẹp có chủ đích cho giai đoạn 1–3 client pilot. Thu hẹp vào 2 trọng tâm: Onboard client mới & Quản lý chi phí AI. Các tính năng mở rộng khác như Multi-Office Overview, Cycle Monitor/Debug View, Dead Letter Queue, Reopen/Override, Meta Account Management, Beat Schedule, Audit Log, Escalation Alert Center sẽ bổ sung ở giai đoạn sau khi quy mô mở rộng.)*

## 7.5.4.0. Information Architecture & Ghi chú phạm vi

┌─────────────────────┐
│  🔷 CrewLab Admin   │
├─────────────────────┤
│                     │
│  👥 Clients         │  ← Màn hình đầu tiên (danh sách client)
│  💰 Chi phí AI       │  ← Tổng quan chi phí tất cả client
│                     │
└─────────────────────┘

Chỉ 2 mục chính trên sidebar. Không có Dashboard alert-first, không có Multi-Office Overview — phù hợp quy mô pilot.

**Luồng sử dụng chính:**
Mở app → Client List → 
  ├─ Client mới chưa tồn tại → [+ Onboard Mới] → Wizard 9 bước
  └─ Client đã có → Click vào → Xem/sửa Chi phí AI của client đó

Hoặc: Mở app → Chi phí AI (sidebar) → Xem tổng quan TẤT CẢ client cùng lúc

---

## 7.5.4.1. Client List — Màn hình đầu tiên

### Mục đích
Landing screen đơn giản — chỉ đủ để biết đang có client nào, chi phí ra sao, và điều hướng vào đúng nơi cần.

### Layout
┌──────────────────────────────────────────────────────────┐
│  Clients                                  [+ Onboard Mới]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🟢  Bardinh Coffee                                  │  │
│  │      Cafe · FB + IG                                 │  │
│  │      Chi phí tháng này: $18.40 / $50 (36%)          │  │
│  │                                                    │  │
│  │      [Xem Chi Phí]  [Sửa Cấu Hình]                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🟡  Cafe XYZ                                        │  │
│  │      Cafe · FB only                                 │  │
│  │      Chi phí tháng này: $27/$30 (90% — sắp hết!)   │  │
│  │                                                    │  │
│  │      [Xem Chi Phí]  [Sửa Cấu Hình]                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘

### Client Card — Thông tin hiển thị
| Field | Nguồn | Ghi chú |
|---|---|---|
| Tên client \+ Vertical | `clients` table | |
| Platform | `client_config` | FB/IG/cả hai |
| Chi phí tháng này | Tổng hợp từ `llm_usage` | % so với budget cap tổng |
| Badge màu | Tính từ % chi phí | 🟢 \< 80% · 🟡 80-99% · 🔴 ≥ 100% (đã vượt) |

### Actions
| Nút | Dẫn tới |
|---|---|
| \+ Onboard Mới | Wizard 9 bước (§7.5.4.2) |
| Xem Chi Phí | Trang Chi phí AI, lọc sẵn theo client này (§7.5.4.3) |
| Sửa Cấu Hình | Form chỉnh sửa nhanh: tên, platform, trạng thái active/paused |

---

## 7.5.4.2. Onboard Client Mới — Wizard 9 bước

### Mục đích
Agency Admin đưa client mới vào hệ thống hoàn toàn trên UI — không cần chạy script/CLI. Tự động lưu draft tại mỗi bước.

### Progress bar
\[1\]━━\[2\]━━\[3\]━━\[4\]━━\[5\]━━\[6\]━━\[7\]━━\[8\]━━\[9\]

### Bước 1 — Thông tin cơ bản
- **Inputs:** Tên client (*bắt buộc, unique*), Vertical (*dropdown, vd: Cafe \& F\&B*), Timezone (*mặc định Asia/Ho\_Chi\_Minh*), Mô tả ngắn (internal).  
- **Validation:** Trùng tên → gợi ý thêm suffix.

### Bước 2 — Nền tảng & lịch đăng bài
- **Inputs:** Platform (*Facebook / Instagram / TikTok*), Số bài/tuần, Lịch đăng FB/IG (ngày trong tuần \& khung giờ), Analytics delay (*mặc định 7 ngày*).

### Bước 3 — Khởi tạo ChromaDB
- **Chức năng:** Khởi tạo 3 collections riêng cho client (`{client}_brand`, `{client}_content_history`, `{client}_tmp`).  
- **Idempotency:** Nếu đã tồn tại → "⟳ Đã tồn tại — bỏ qua" thay vì báo lỗi.

### Bước 4 — Khởi tạo Hindsight Memory Banks
- **Chức năng:** Khởi tạo 13 memory banks cho 12 agent (A01, B01-B03, D01-D02, E01, F01, G01-G04, H01).  
- **Trạng thái:** Hiển thị progress `13/13 banks sẵn sàng`.

### Bước 5 — Upload tài liệu brand
- **Inputs:** Drag \& drop file brand guidelines, menu, tone of voice (PDF, DOCX, TXT, MD).  
- **Chức năng:** Ingest qua Docling \+ Chonkie vào ChromaDB collection `{client}_brand`. Hiển thị số chunk đã split per file.

### Bước 6 — Tạo Client Admin User
- **Inputs:** Email client admin, Tên hiển thị. Role mặc định: `client_admin`.  
- **Chức năng:** Tạo tài khoản qua Supabase Auth \& gửi email thiết lập mật khẩu.

### Bước 7 — Kết nối Meta
- **Chức năng:** Popup OAuth Meta (Facebook Login for Business).  
- **Inputs:** Chọn Facebook Page ID và Instagram Account ID đã kết nối.  
- **Trạng thái:** Hiển thị thời hạn token, tự động refresh khi còn ≤ 7 ngày.

### Bước 8 — LLM Provider & API Key (⭐ Khởi tạo ban đầu)
- **Inputs:**
  - Bật/tắt Provider (Anthropic, OpenAI, Google...).  
  - Nhập API Key \+ Nút **Test Connection** (verify model availability).  
  - Ngân sách tổng/tháng (USD) cho client (*bắt buộc, tối thiểu $10*).  
  - Model mặc định theo nhóm agent (Strategy, Content, Image, Evaluator, Analytics).  
- **Validation:** Ít nhất 1 provider phải Test Connection thành công trước khi tiếp tục. Key được mã hóa ngay khi lưu (không bao giờ hiển thị lại full key).

### Bước 9 — Đăng ký lịch tự động & Smoke Test
- **Chức năng:** Đăng ký Celery Beat schedule (`weekly_cycle`, `reflect_job`, `h01_batch`, `stale_check`, `analytics_trigger`) \& Chạy 6 bài Smoke Test:
  1. ✅ ChromaDB collections — Accessible  
  2. ✅ Hindsight Memory Banks — 13/13 respond  
  3. ✅ Celery task dispatch — Test task thành công  
  4. ✅ Meta API token — Valid  
  5. ✅ Client Portal login — OK  
  6. ✅ LLM Provider — API test call thành công  
- **Xử lý lỗi:** Fail ở ChromaDB/Celery/LLM → block không cho qua. Fail ở Portal login/Meta token → cảnh báo và hỗ trợ fix nhanh.

---

## 7.5.4.3. Quản lý Chi phí AI

### Mục đích
Xem và điều chỉnh chi phí LLM — cả tổng quan tất cả client lẫn đi sâu từng client. Nơi duy nhất (ngoài Bước 8 Wizard) để sửa provider, API key, model, và ngân sách sau khi onboard.

### 4.1. Tổng quan tất cả client
- **Thanh tổng chi phí:** Hiển thị tổng $ đã dùng / $ tổng ngân sách của tất cả client, % đã dùng, breakdown theo Provider (Anthropic, OpenAI...).  
- **Danh sách Per-Client:** Mỗi client có tiến trình chi phí ($ đã dùng / cap), màu badge (🟢/🟡/🔴), nút "Xem chi tiết →".  
- **Cảnh báo vượt ngân sách:** Highlight client chạm 90%+ ngân sách kèm nút "Tăng ngân sách →".

### 4.2. Chi tiết per-client (Detail View)
- **Thông tin ngân sách:** Ngân sách tổng/tháng hiện tại ($), đã dùng ($ và %), nút \[Sửa ngân sách\]. Thay đổi ngân sách có hiệu lực trong ≤ 5 phút.  
- **Breakdown theo Agent:** Biểu đồ \& % chi phí phân bổ cho từng agent (D02 Image, D01 Caption, Analytics G01-G04...).  
- **Biểu đồ theo ngày trong tháng:** Chart thể hiện chi phí từng ngày (nhận biết ngày cao điểm T2 khi cycle khởi động).  
- **Quản lý Provider & API Key:**
  - Bật/tắt từng provider.  
  - Sửa API Key: ô nhập key mới → Test Connection → Lưu \& Cập nhật (hiển thị che `sk-***...4 ký tự cuối`).  
  - **Cảnh báo khi tắt provider đang dùng:** Hiện rõ danh sách agent bị ảnh hưởng và model fallback trước khi xác nhận.  
- **Phân bổ Model theo Agent:**
  - Dropdown chọn model cho từng agent (A01, B01-B03, D01, D02, E01, G01-G04, H01).  
  - **Logic lọc dropdown:** Chỉ hiển thị model thuộc provider **đã Test Connection thành công** (provider chưa bật/key invalid sẽ bị ẩn hẳn khỏi dropdown để tránh chọn nhầm).

---

## 7.5.4.4. Acceptance Criteria Internal App

| ID | Tiêu chí |
|---|---|
| IF-01 | Wizard bước 3 (ChromaDB) chạy lại lần 2 cho cùng client → hiện "⟳ Đã tồn tại", không tạo duplicate collection |
| IF-02 | Wizard bước 8: không Test Connection thành công cho bất kỳ provider nào → nút "Lưu \& Tiếp tục" bị disable |
| IF-03 | Wizard bước 9 (Smoke Test): ChromaDB/Celery fail → block; Portal login fail → cho phép bỏ qua |
| IF-04 | Sau khi lưu API Key → không bao giờ hiển thị lại full key, chỉ hiện `sk-***...4 ký tự cuối` |
| IF-05 | Tắt provider đang được ≥ 1 agent dùng → hiện rõ danh sách agent bị ảnh hưởng \+ model fallback trước khi confirm |
| IF-06 | Sửa ngân sách → có hiệu lực cho task tiếp theo trong ≤ 5 phút |
| IF-07 | Client đạt 100% ngân sách → badge chuyển 🔴 ở cả Client List lẫn trang Chi phí AI tổng quan |
| IF-08 | Model dropdown chỉ hiện model thuộc provider đã test thành công — provider chưa bật hoàn toàn không xuất hiện |
| IF-09 | Đổi model 1 agent ở trang Chi phí (ngoài wizard) → có hiệu lực trong ≤ 5 phút, client khác không bị ảnh hưởng |

---

# 7.5.5. Notification System (Notification System Implementation)

*(Giữ nguyên v1.0. `action_url` trong notification nay trỏ vào Kanban card/Content Plan modal thay vì trang Gate riêng — xem 7.5.3.8.)*

## 7.5.5.1. Supabase Realtime Wiring

Subscribe theo `recipient_user_id` trên bảng `notifications`. Không polling (NFR-T4-02).

## 7.5.5.2. Telegram Bot Architecture

1 bot dùng chung, route bằng `chat_id` mapping về `client_id`. Pairing flow: Portal sinh code (7.5.3.7.5) → verify `/start {code}` → map `chat_id ↔ client_id`. Asset intake: ảnh gửi trong chat → map vào `request_code` đang chờ gần nhất → tạo `brand_assets`. Post confirmation delivery: gửi permalink bài thật \+ ảnh đã dùng (không chụp screenshot cho MVP). Bổ sung Tool Registry T21 `deliver_post_confirmation` gọi bởi F01 sau publish thành công.

## 7.5.5.3. Channel Decision Matrix

| Trigger | Kênh chính | Kênh phụ | Lý do |
| :---- | :---- | :---- | :---- |
| Asset Request mới tạo | Telegram (push ngay) | Portal Notification Center | Chủ quán xem điện thoại nhanh hơn |
| Content Gate chờ duyệt | Portal Notification | Telegram (reminder nếu quá hạn) | Duyệt cần xem chi tiết, hợp màn lớn |
| Analytics Gate sẵn sàng | Portal Notification | Telegram (digest ngắn) | Báo cáo dài, đọc trên Portal tốt hơn |
| Escalation/lỗi hệ thống | Telegram (ngay lập tức) | Internal App Dashboard | Agency Admin cần phản ứng nhanh |

Upload ảnh: client được phép cả 2 cách bất cứ lúc nào (Telegram trực tiếp hoặc deep link vào Portal), không ép 1 cách duy nhất.

## 7.5.5.4. Failure Handling Implementation

Logic retry (`send_telegram_notification`) đã có ở Tầng 2 EXT.8 — Tầng 4 chỉ wire thật vào Telegram Bot API.

---

# 7.5.6. Tích Hợp Meta Graph API (Meta Graph API Integration)

*(Giữ nguyên toàn bộ v1.0.)*

## 7.5.6.1. OAuth Connect Flow

Facebook Login for Business, redirect xin quyền publish \+ đọc insight. Callback lưu token mã hóa (không plain text). Sau kết nối, hiển thị danh sách Page/IG account để chọn account dùng cho CrewLab.

## 7.5.6.2. Token Storage & Refresh

Long-lived token \~60 ngày, job refresh kích hoạt khi còn ≤ 7 ngày. Revoke detection qua polling định kỳ, alert Agency Admin ngay qua Telegram \+ Internal App Dashboard (7.5.4.10).

## 7.5.6.3. Endpoint Mapping

- T06 `publish_to_meta` → Facebook Page feed post \+ Instagram Business (publish 2 bước).  
- T07 `collect_meta_metrics` → bảng canonical Tầng 3 §7.5.4.9: reach, impressions, engagement\_rate, link\_clicks, saves, comments, reactions\_breakdown, shares, video\_views, follower\_delta.  
- Error code mapping: taxonomy Tầng 2 EXT.6 map 1-1 sang error\_code thật.

## 7.5.6.4. Webhook Handling

Comment moderation và page review webhook defer sang Post-MVP.

## 7.5.6.5. API Version & Rate Limit Policy

Pin version Graph API cụ thể (vd v21.0), quy trình review/upgrade khi Meta deprecate. Khi gần chạm rate limit, ưu tiên publish (F01) trước thu thập metric (G01).

## 7.5.6.6. Open Question — follower\_delta

Cần test thật với Meta Graph API để xác nhận support per-post hay chỉ per-page/ngày. Fallback: dùng follower delta per-page theo ngày đăng bài, gắn flag `data_quality: "page_level_proxy"`.

---

# 7.5.7. NFR & Acceptance Criteria

## 7.5.7.1. Non-Functional Requirements

| ID | Yêu cầu | Target | Scope |
| :---- | :---- | :---- | :---- |
| NFR-T4-01 | Pixel Office load lần đầu | ≤ 2s p90 | 7.5.3.1 |
| NFR-T4-02 | Notification Realtime latency | ≤ 5s | 7.5.5.1 |
| NFR-T4-03 | OAuth connect flow hoàn thành | ≤ 5 phút (KR3) | 7.5.6.1 |
| NFR-T4-04 | Mobile upload (Asset Request) trên 3G | ≤ 30s/ảnh | 7.5.3.5 |
| NFR-T4-05 | Internal App load Debug View | ≤ 1s | 7.5.4.3 |
| NFR-T4-06 | Telegram asset intake (nhận ảnh → tạo `brand_assets`) | ≤ 10s | 7.5.5.2 |
| NFR-T4-07 | DLQ replay action | ≤ 3s | 7.5.4.4 |
| NFR-T4-08 | Webhook signature verification overhead | ≤ 200ms | 7.5.2.6 |
| NFR-T4-09 *(mới)* | Kanban Task Board load (cycle hiện tại, ≤ 60 task trên cả 4 swimlane) | ≤ 1.5s p90 | 7.5.3.2 |
| NFR-T4-10 *(mới)* | Pixel Office desk status cập nhật sau khi 1 content item đổi state | ≤ 5s | 7.5.3.1 |
| NFR-T4-11 *(mới)* | Content Plan Calendar chuyển view Tuần ↔ Tháng | ≤ 500ms (không gọi lại API nếu data đã cache trong tháng đó) | 7.5.3.3 |

## 7.5.7.2. Acceptance Criteria

| ID | Acceptance Criteria |
| :---- | :---- |
| AC-T4-01 | Client Staff đăng nhập → không thấy nút Approve ở bất kỳ card/gate nào; chỉ Client Admin thấy |
| AC-T4-02 | Client Admin bôi đen text trong Campaign draft, thêm comment → lưu đúng `selected_text_hash`, hiển thị đúng vị trí khi reload |
| AC-T4-03 | Client Admin click Duyệt tất cả tuần ở Content Plan Calendar → toàn bộ item chuyển `PLAN_APPROVED`, A01 dispatch D01 đúng theo FSM |
| AC-T4-04 | Modal duyệt bài (mở từ Content Plan Calendar hoặc từ card task "👤 Bạn: Duyệt bài" trên Kanban) hiển thị đầy đủ caption \+ visual \+ giờ đăng nhưng `eval_score` không xuất hiện ở bất kỳ đâu trong response — xác nhận qua network inspector |
| AC-T4-05 | Client Reject 1 content item với lý do taxonomy dropdown → reason ghi vào `hitl_reviews`, item quay lại đúng agent theo retry logic Tầng 2; trên Kanban, task "👤 Bạn: Duyệt bài" chuyển Done (reject), đồng thời sinh task mới cho agent tương ứng (D01/D02) ở cột To Do, có badge `🔁 Lần 2` |
| AC-T4-06 | Client thay đổi model D01 ở Settings \> Model & Ngân sách → task D01 tiếp theo dùng đúng model mới trong ≤ 5 phút; client khác không bị ảnh hưởng |
| AC-T4-07 | Client dùng Direct Assign giao thẳng D02 sửa ảnh 1 content item cũ → không tạo cycle mới; E01 vẫn chấm visual trước khi trả kết quả |
| AC-T4-08 | Client pairing Telegram bằng code ở Settings \> Tích hợp → gửi `/start {code}` → map đúng `client_id`; Portal hiển thị "Connected" |
| AC-T4-09 | Token Meta sắp hết hạn trong 7 ngày → hệ thống tự refresh, F01 publish không gián đoạn |
| AC-T4-10 | Agency Admin trigger Reopen lần thứ 4 cho 1 content item → hệ thống từ chối, hiển thị đúng lý do đã chạm giới hạn 3 lần |
| AC-T4-11 | Agency Admin replay 1 DLQ record → task requeue, record chuyển `resolved`, audit log ghi actor \+ timestamp |
| AC-T4-12 | Webhook Meta/Telegram gửi request sai chữ ký → hệ thống reject 401, không xử lý payload, ghi audit log `SECURITY_BREACH` |
| AC-T4-13 | Escalation alert mới phát sinh → xuất hiện trong Internal App Dashboard ≤ 5s, đồng thời gửi Telegram — 2 kênh không phụ thuộc lẫn nhau |
| AC-T4-14 | Client "Request clarification" trên Gate 3 → tạo annotation thread gắn vào report G04, không tạo content item/cycle mới |
| AC-T4-15 | Agency Admin tắt provider OpenAI cho 1 client → dropdown model ở Settings client đó ẩn ngay model OpenAI; agent đang dùng fallback về `default_provider` |
| AC-T4-16 *(mới)* | Pixel Office: khi 1 content item chuyển sang `PENDING_CONTENT_APPROVAL`, bàn "QA & Publish" đổi trạng thái sang ⏳ Waiting trong ≤ 5s, không cần refresh trang |
| AC-T4-17 *(mới)* | Kanban: kéo card task loại Người ("👤 Bạn: Duyệt bài...") từ Review → Done → mở confirm dialog trước khi commit; kéo card task loại Agent (D01, D02, E01...) ở bất kỳ cột nào → card bounce về vị trí cũ ngay lập tức, không gọi API, hiện tooltip "Task của AI tự động cập nhật, không kéo được" |
| AC-T4-18 *(mới)* | Content Plan Calendar: click vào 1 ngày có 3 bài trở lên → hiển thị đúng "+N" và mở được list đầy đủ khi click vào badge đó |
| AC-T4-19 *(mới)* | Thư viện ảnh (Settings \> Thư viện ảnh): ảnh client tự upload vẫn ở trạng thái "Chờ duyệt", D02 không được dùng ảnh này cho tới khi Agency Admin duyệt |
| AC-T4-20 *(mới)* | Internal App Multi-Office Overview: client có content item ở DLQ hoặc F01 fail → ô văn phòng thu nhỏ của client đó hiển thị badge 🔴 ngay trên màn hình tổng quan, không cần vào từng client mới thấy |

### 7.6. Technology

| Layer | Lựa chọn | Vai trò | Ghi chú |
| :---- | :---- | :---- | :---- |
| Infra | Hetzner VPS **CAX31** (8 vCPU ARM, 16GB RAM, \~€15-16/tháng) | Host toàn bộ Docker Compose stack | Nâng từ CAX21 ở v3.0 — cần dư RAM cho Docling (200-400MB/task, NFR-IN-05) chạy song song ChromaDB \+ Hindsight \+ Langfuse. Scale roadmap ở Section 8\. Xem quyết định hạ tầng đầy đủ ở **Part A0 (Tầng 4\)** — không dùng PaaS serverless/Railway, lý do xem A0.3. |
| Deploy layer | **Coolify** (self-hosted, chạy trên chính VPS này) | Git-push deploy, quản lý env var theo service, auto SSL, log dashboard | Thay thế trải nghiệm PaaS (kiểu Railway) nhưng vẫn 1 VPS/1 hoá đơn duy nhất — xem A0.3 |
| App layer | FastAPI | API endpoints (upload, webhook, internal RPC) |  |
| Async | Celery Workers \+ Celery Beat \+ Redis | Task queue, scheduler, broker/result backend | 4 queues — xem C4 |
| Reverse proxy | Nginx (quản lý qua Coolify) | Routing, TLS termination | Docker Compose |
| Backup | Hetzner snapshot theo lịch \+ restic đẩy ra object storage | Backup VPS/DB định kỳ | Bù rủi ro "1 VPS duy nhất" so với PaaS managed backup |
| Database | Supabase Cloud (PostgreSQL \+ Auth \+ Realtime \+ Storage) | Source of truth quan hệ, identity, realtime push, file storage | RLS — xem C1, C6 |
| Vector store | ChromaDB (local) | Brand memory, campaign context, performance patterns, visual asset search | Per-client collections — xem C2/C7 |
| Media storage | Supabase Storage \+ PostgreSQL `brand_assets` | Lưu file ảnh/video/logo/template thật của client, metadata, approval, usage rights | Brand Asset / Media Library — xem C7 |
| Episodic memory | **Hindsight** (Docker sidecar external-DB) | Memory Banks per agent/client — Retain/Recall bằng strict tags, Mental Models | Thay SQLite — xem C3 |
| Ingest — extraction | **Docling** (IBM, pip) | PDF/DOCX/PPTX/XLSX → structured Markdown | Thay PyMuPDF \+ python-docx — xem C5 |
| Ingest — chunking | **Chonkie** (pip) | Semantic chunking, multilingual (tiếng Việt) | Thay RecursiveCharacterTextSplitter — xem C5 |
| Embedding | OpenAI `text-embedding-3-small` | Embed cho ChromaDB index \+ Chonkie similarity | dimensions=1536 |
| FSM enforcement | `python-transitions` (MIT, pip) | Enforce Content Item FSM, HITL gate FSM | Áp dụng từ Tầng 2 |
| Frontend | Next.js (Vercel, free tier) | Landing Page, Client Portal, Internal App | 3 surfaces — xem 7.1 |
| Observability | Langfuse (self-hosted, Docker) \+ Celery Flower | Trace LLM calls, monitor task queue |  |
| Alerting | Telegram Bot | Dead letter, security breach, quota, ingest failure |  |
| LLM — agent chính | Claude Opus 4 / Sonnet 4, Gemini Flash, DALL-E 3 | Content generation, evaluation, image | Theo agent config — Tầng 3 |
| LLM — memory extraction | Gemini Flash (riêng, qua Hindsight) | Tóm tắt, rút entity, Mental Models | Không tính vào quota client — FR-MEM-08 |
| Agent framework | CrewAI (Python) | Orchestration agent logic | Tầng 2/3 |
| HITL | Tự build trên Supabase Realtime \+ Celery signal | Approval Queue, gate FSM | Không dùng LangGraph |

**KHÔNG dùng:** N8N (đã loại khỏi stack), LangGraph (HITL tự build), fork bất kỳ OSS nào (chỉ pip install / Docker service).

### 7.7. Assumptions

**Cấp độ dự án:**

- Team 2 người, non-tech, dựa vào Antigravity để implement — mọi spec phải đủ chi tiết để Antigravity implement không cần hỏi lại nhiều.  
- 3-surface architecture (Landing, Client Portal, Internal App role-based) là quyết định cuối — không tách lại thành 5 surface trừ khi có lý do kỹ thuật rõ ràng phát sinh khi implement Tầng 4\.  
- Paid pilot đầu tiên ưu tiên **1 quán cafe**. Scope nhỏ nhưng phải chạy thật; không mở rộng sớm sang 10–30 clients trước khi pilot chứng minh được value.  
- **No manual fallback rule:** Không dùng thao tác tay để thay thế luồng automation đã promise với khách. Nếu automation chưa chắc, giảm scope offer thay vì vận hành thủ công phía sau.

**Cấp độ Tầng 1 (mang qua từ v2.0, vẫn đúng):**

- Supabase free tier đủ cho 1–10 clients (500MB DB, 2GB bandwidth); upgrade $25/tháng khi vượt ngưỡng.  
- `service_tier` enum thiết kế để ALTER TABLE thêm value mới dễ dàng, không hardcode nhiều nơi.  
- `reject_reason` giữ TEXT với application-level validation (không DB enum) để dễ thêm reason mới.  
- ChromaDB local đủ dùng đến \~300 clients trước khi cần managed service.  
- Chunk size \~500 tokens phù hợp brand docs dạng prose tiếng Việt — Chonkie semantic chunking cần validate thêm với sample thật (đặc biệt docs nhiều bảng/bullet).  
- ChromaDB không có built-in access control — isolation hoàn toàn application-level (C6); unit test coverage cho `get_collection()` và `get_memory_bank_id()` là critical.  
- C6 audit/security logging không phụ thuộc Hindsight metadata/tag implementation. `audit_log.metadata.client_id` là PostgreSQL application-level state do CrewLab tự ghi.  
- `celery-sqlalchemy-scheduler` (không phải `django-celery-beat`) — cần verify compatibility với FastAPI \+ SQLAlchemy.  
- `acks_late=True` có thể chạy task 2 lần nếu worker crash sau start nhưng trước ack — idempotency key giải quyết case này.

**Mới (từ quyết định OSS Tháng 6/2026):**

- Hindsight Recall dùng tags \+ `tags_match="all_strict"`; không dùng metadata filter theo `task_type`.  
- Hindsight delete theo `document_id` là hard requirement cho FR-MEM-09/offboarding; prune condition phức tạp được quyết định ở PostgreSQL application layer.  
- Docling \+ Chonkie tương thích Python version trong Docker image hiện tại — cần verify `pip install` thành công, không conflict dependency với CrewAI/FastAPI stack.  
- `do_ocr=True` mặc định cho PDF không làm vượt NFR-IN-01 (\< 3 phút) trong đa số trường hợp thực tế — cần test với sample PDF client thật.

---

## 8\. RELEASE

**Ghi chú v3.2 — reconcile với Phase Roadmap:** Section 7 ở trên mô tả **full vision** của CrewLab — kiến trúc đầy đủ 4 tầng, đủ 12 agent, khi hệ thống đã đi hết các phase. Đây **không phải** là scope build ngay ở Phase 1\. Bản v3.1 từng viết "Phase 1 ... đủ 12 agent ... Không có phiên bản rút gọn hơn" — điều này mâu thuẫn với quyết định thật đã chốt trong `CrewLab-MVP-Scope.md` và `CrewLab-Phase-Roadmap.md`: Phase 1 chỉ build **5 agent** (B02, B03, D01, D02, E01) \+ đăng tay, không auto-publish, không phân tích tự động. `CrewLab-Phase-Roadmap.md` là **tài liệu canonical** cho câu hỏi "phase nào build gì" — dưới đây chỉ tóm tắt lại, không lặp chi tiết.

Quyết định giảm scope Phase 1 xuống 5 agent **không đi ngược nguyên tắc "No manual fallback rule"** ở 7.7 — ngược lại, nó tuân thủ đúng tinh thần đó: thay vì giả vờ tự động hoá những phần chưa đủ chắc chắn (publish, phân tích), CrewLab chủ động **giảm lời hứa** ở Phase 1 (chỉ hứa đăng tay, không hứa auto-publish), rồi mở rộng lời hứa dần qua Phase 3 (auto-publish), Phase 4 (analytics \+ learning loop đầy đủ đúng KR1 gốc), Phase 5 (RAG/strategy layer đầy đủ). Full 12-agent stack như mô tả ở Section 7 chỉ thật sự đạt được khi hoàn thành Phase 5\.

**Phase 1 — MVP / Pilot (hiện tại):** Scope thật là **5 agent** (B02, B03, D01, D02, E01) \+ đăng tay \+ FSM/retry loop \+ Client Portal cơ bản (ẩn điểm E01) \+ Internal App cơ bản, theo `CrewLab-MVP-Scope.md`. Pilot 1 client (Bardinh Coffee), platform Facebook \+ Instagram, chạy trên 1 VPS (Hetzner CAX31). Đây là bước đầu của lộ trình đi tới full vision ở Section 7, không phải bản build đầy đủ ngay từ đầu.

**Phase 2 → Phase 7 — Mở rộng theo từng bước:** Xem chi tiết đầy đủ 7 phase (xây gì / cải thiện gì / vận hành gì / tiêu chí pass mỗi phase) tại `CrewLab-Phase-Roadmap.md`. Tóm tắt trình tự: Phase 2 (vận hành pilot dài hạn, tinh chỉnh, không xây mới) → Phase 3 (Meta auto-publish, F01) → Phase 4 (Analytics loop G01-G04, đạt KR1 đầy đủ đúng như định nghĩa gốc ở Section 4\) → Phase 5 (Strategy layer B01 \+ RAG thật, ChromaDB/Hindsight khôi phục) → Phase 6 (scale nhiều client) → Phase 7 (đa dạng ngành, tuỳ chọn kinh doanh, không có AC kỹ thuật cứng). Nguyên tắc xuyên suốt: mỗi phase chỉ mở khi phase trước đạt Tiêu chí Pass của nó — không nhảy cóc, đúng nguyên tắc "validate trước khi scale" đã nêu ở Assumptions (7.7). Ngưỡng hạ tầng cần theo dõi khi scale (đã có sẵn trong 7.6 Technology): Supabase free tier đủ cho 1–10 client; ChromaDB local đủ dùng đến khoảng 300 client trước khi cần managed service.

**Post-MVP (đã chủ động defer trong spec, liệt kê lại để dễ theo dõi khi lên roadmap):**

- Webhook comment moderation / page review (7.5.6.4 — Tầng 4 Part E4).  
- Screenshot xác nhận trang bài đăng thật, thay cho permalink hiện tại (7.5.5.2 — Tầng 4 Part D2).  
- Tách lại 5-surface architecture, chỉ nếu phát sinh lý do kỹ thuật rõ ràng khi implement (mặc định giữ nguyên 3-surface — 7.7 Assumptions).

**Khung thời gian:** Theo relative timeframe, không chốt ngày cụ thể — pilot chạy trước, quyết định mở rộng dựa trên kết quả pilot đạt Key Results ở Section 4 và Tiêu chí Pass của từng phase ở `CrewLab-Phase-Roadmap.md`, không theo deadline cố định.