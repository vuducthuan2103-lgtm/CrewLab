# CrewLab — PRD Tầng 4 (Bản Tổng Hợp): Portal & External Interfaces
**Phiên bản:** 2.0 — Consolidated  
**Cập nhật:** Tháng 7/2026  
**Dành cho:** Designer, Frontend Dev, Founder  
**Nguồn sự thật:** PRD-CrewLab.md v1.2 (25/7/2026) — Section 7.5

---

## Ghi chú về bản gộp này

Tài liệu này hợp nhất 3 bản nháp Tầng 4 viết trước đó (Client Portal, Internal App, Notification & Meta) thành **một nguồn duy nhất**, đối chiếu và đồng bộ hoàn toàn với PRD gốc chính thức của dự án (`PRD-CrewLab.md` v1.2, Section 7.5).

**3 thay đổi quan trọng so với bản nháp cũ — đọc kỹ trước khi dùng tài liệu này:**

1. **Màn hình chính không còn là "Dashboard dạng list"** — mà là **Pixel Office**, một văn phòng pixel-art isometric hiển thị 4 nhóm agent đang "làm việc" theo thời gian thực.
2. **"Gate 1/Gate 2" không còn là 2 trang riêng biệt** — chúng được gộp vào **Kanban Dashboard** (bảng Trello quản lý task của cả AI lẫn con người) và **Content Hub > Content Plan Calendar** (lịch tháng/tuần). Cùng 1 component duyệt bài được tái sử dụng ở cả 2 lối vào.
3. **Agent Evaluator chính thức là `E01`** (không phải E05 như bản nháp cũ) — theo changelog v1.1 của PRD gốc. Tổng số agent chính thức: **12**, bao gồm H01 Feedback Loop thuộc Bàn Phân tích.

Cấu trúc tài liệu này bám sát đúng thứ tự PRD gốc: 7.5.1 (Hạ tầng) → 7.5.2 (API/Auth) → 7.5.3 (Client Portal) → 7.5.4 (Internal App) → 7.5.5 (Notification) → 7.5.6 (Meta Integration) → 7.5.7 (NFR/AC). Phần **mới nhất và ít người hình dung ra nhất** (Pixel Office, Kanban, Content Hub, Multi-Office Overview) được viết chi tiết kèm wireframe. Phần **giữ nguyên logic từ bản v1.0** được viết gọn nhưng đủ đầy đủ để dev code trực tiếp không cần hỏi lại.

> ⚠️ **Open Question chưa chốt (giữ nguyên từ PRD gốc, không tự resolve):** Threshold pass/fail của E01 đang **lệch giữa 2 tài liệu** — Tầng 2 ghi 7.0, Tầng 3 ghi 8.0. Badge pass/fail ở Debug View (7.5.4.3) và mọi nơi hiển thị kết quả E01 cần chốt 1 giá trị trước khi build. Xem lại Tầng 2 và Tầng 3 gốc để đối chiếu và quyết định trước khi giao cho dev.

---

## Mục lục

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
  - [7.5.4.0 Multi-Office Overview ⭐ MỚI](#7540-mới-multi-office-overview)
  - [7.5.4.1 → 7.5.4.11](#7541--75411-các-màn-hình-quản-trị)
- [7.5.5 — Notification System](#755-notification-system)
- [7.5.6 — Meta Graph API Integration](#756-tích-hợp-meta-graph-api)
- [7.5.7 — NFR & Acceptance Criteria](#757-nfr--acceptance-criteria)

---

## 7.5.1. Hạ Tầng & Deploy

*(Không đổi so với bản nháp trước — không có thay đổi kỹ thuật hạ tầng nào phát sinh từ Pixel Office/Kanban/Content Hub, vì đây thuần là thay đổi UI/UX trên cùng data layer và cùng topology 3 service.)*

### Topology — 3 service độc lập

| Service | Vai trò | Người dùng | Deploy ở đâu |
|---------|---------|-----------|---------------|
| Backend API (FastAPI) | Toàn bộ business logic, endpoint `/api/v1/...`, Celery worker, webhook receiver | Cả 2 frontend gọi vào | PaaS có persistent process |
| Client Portal (Next.js) | UI cho `client_admin`/`client_staff` — Pixel Office, Kanban, Content Hub, duyệt bài, báo cáo, cấu hình | Khách hàng (Bardinh Coffee...) | Vercel, domain riêng trả phí |
| Internal App (Next.js) | UI cho `agency_admin` — debug, DLQ replay, LLM provider config, cross-client view | Nội bộ CrewLab | Vercel free tier, subdomain miễn phí |

**Lý do tách 2 frontend:** 2 audience khác nhau, tránh lộ surface area (DLQ, debug view, cross-client data) qua bundle JS; Internal App thay đổi nhanh, tách deploy để không ảnh hưởng uptime Portal khách trả tiền. Cả 2 vẫn gọi chung 1 Backend API — phân biệt bằng JWT role claim, không tách hạ tầng dữ liệu.

### Domain Map

| Domain | Trỏ tới | Ghi chú |
|--------|---------|---------|
| crewlab.com | Client Portal (Vercel) | Domain trả phí |
| crewlab-admin.vercel.app | Internal App (Vercel free) | Subdomain mặc định cho MVP |
| api.crewlab.vn | Backend API (FastAPI) | Domain riêng cho backend |

Backend KHÔNG bao giờ phục vụ HTML/frontend — chỉ trả JSON theo response envelope (7.5.2).

### Backend Hosting

Celery worker cần process chạy liên tục, webhook receiver cần endpoint luôn sẵn sàng → loại serverless thuần. **Railway** cho Backend API + Celery worker + Postgres trong giai đoạn pilot (chi phí <$20/tháng/client, tránh cold-sleep của free tier Render). ChromaDB chạy chung instance với backend cho pilot, tách riêng khi cần scale.

> **Ghi chú đồng bộ:** Changelog PRD gốc v1.1 ghi rằng hạ tầng đã **chốt lại về Hetzner VPS CAX31 + Coolify** (không dùng Railway/Render) — xem Section 7.6 Technology của PRD gốc. Bảng trên phản ánh quyết định ở thời điểm viết Tầng 4 ban đầu; **Hetzner + Coolify là quyết định cuối cùng, override phần Railway ở đây.** Nếu dev bắt đầu implement, dùng Hetzner CAX31 + Coolify, không dùng Railway.

### CORS Policy

Whitelist rõ ràng, không wildcard: `https://crewlab.com`, `https://crewlab-admin.vercel.app`, `http://localhost:3000`, `http://localhost:3001` (dev). Không set `Access-Control-Allow-Origin: *` vì endpoint có side-effect + credential JWT.

### Environment Separation

| Environment | Backend | Frontend | Database |
|-------------|---------|----------|----------|
| Local | uvicorn reload | `next dev` | Postgres local / Supabase dev |
| Staging | Staging service riêng | Vercel Preview | Supabase project staging riêng |
| Production | Production service | Vercel Production | Supabase production |

**Quy tắc cứng:** Staging và Production **không bao giờ share database**.

### CI/CD Flow

- Backend: push `main` → auto deploy production; push `staging` → deploy staging service riêng.
- Client Portal (Vercel): mỗi PR có Preview Deployment; merge `main` → production tại crewlab.com.
- Internal App (Vercel free): merge `main` → production luôn, không cần Preview phức tạp.
- Migration: qua Supabase CLI/Alembic, chạy thủ công có review trước khi áp production.

### Secrets & Config Management

Secret nhạy cảm (Meta App Secret, Telegram Bot Token, Supabase Service Role Key, LLM Provider API keys) không bao giờ xuất hiện ở frontend — chỉ tồn tại ở Backend env.

---

## 7.5.2. API & Auth Standard

*(Không đổi. Mọi endpoint mới phục vụ Pixel Office/Kanban/Content Hub đều tuân theo chuẩn này, không tự phát minh format riêng.)*

### API Convention

- Versioning: mọi endpoint dưới `/api/v1/...`. Breaking change → tăng version.
- Response envelope chuẩn:
```json
{ "success": true, "data": { }, "error": null }
{ "success": false, "data": null, "error": { "error_code": "...", "message": "...", "details": {} } }
```
- Pagination: cursor-based cho mọi list endpoint (Kanban board, Notification Center, Audit Log...) — không offset.
- Idempotency: mọi endpoint có side-effect (approve, publish trigger, direct assign, asset upload, **kéo-thả card đổi state**) bắt buộc nhận `idempotency_key`.

### Authentication & Session

- MVP: email/password qua Supabase Auth. Magic link Post-MVP.
- JWT mang claims: `role`, `client_id`, `user_id`.
- Session refresh tự động khi còn hiệu lực < 5 phút.
- Remember me: giữ phiên 30 ngày, mặc định hết hạn cuối ngày.
- Password reset: email link, hết hạn 1 giờ, dùng 1 lần.

### Authorization Middleware

- `require_role`, `require_client_match` (trừ `agency_admin` thao tác cross-client trong Internal App).
- Defense-in-depth layer 2: RLS ở DB chặn ở tầng dữ liệu; middleware chặn sớm ở tầng API, trả 403 rõ ràng.
- **3 role:** `agency_admin` (full access, Internal App), `client_admin` (full access trong client mình, có quyền Approve), `client_staff` (xem được nhưng **không có nút Approve/Reject** ở bất kỳ đâu — card Kanban, modal Content Plan, Gate 3).

### Error Response Standard

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

### Rate Limiting & Webhook Signature

- Endpoint upload (Asset Request, ảnh Telegram): tối đa 50 request/giờ/user.
- Webhook: không rate limit kiểu user thường, dùng **signature verification** làm chốt chặn chính.
- Mọi webhook (Meta, Telegram) bắt buộc verify chữ ký trước khi xử lý field bất kỳ. Không verify được → reject 401, ghi audit log `SECURITY_BREACH`, không xử lý tiếp dù payload hợp lệ.

---
## 7.5.3. Client Portal

### 7.5.3.0. Information Architecture

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

### 7.5.3.1. Pixel Office — Màn hình chính (MỚI)

#### Mục đích

Màn hình đầu tiên sau khi login. Thay vì nhìn số liệu, chủ quán nhìn thấy **một văn phòng pixel-art isometric** nơi các nhóm AI agent (team desk) đang "làm việc" cho họ theo thời gian thực — cảm giác giống nhìn vào văn phòng qua camera, không phải đọc dashboard.

#### Nguyên tắc thiết kế

- Đây là lớp **visualization**, không phải nơi thao tác nghiệp vụ sâu. Mọi hành động thực sự (duyệt bài, sửa caption...) đều dẫn sang Kanban/Content Hub — Pixel Office chỉ là cổng vào + overview trạng thái.
- Không hiển thị số liệu kỹ thuật (`eval_score`, token usage...) ở đây — giữ đúng tinh thần "nhìn phát biết chuyện gì đang xảy ra" cho người không rành kỹ thuật.
- Animation nhẹ (idle loop, typing loop) — sprite-sheet CSS animation, không video/GIF nặng, để nhẹ tải trên mobile 3G.

#### Cấu trúc: 4 bàn làm việc (team desk)

Mỗi bàn đại diện **1 nhóm agent**, map trực tiếp từ 12 agent chính thức:

| # | Bàn (Team Desk) | Agent trực thuộc | Vai trò hiển thị |
|---|------------------|-------------------|---------------------|
| 1 | 🧭 Bàn Chiến lược (Strategy Desk) | A01 Orchestrator, B01 IMC Planner, B02 Content Pillar, B03 Content Plan | Lên kế hoạch tuần/campaign |
| 2 | ✍️ Bàn Sáng tạo (Creative Desk) | D01 Caption Writer, D02 Image Designer | Viết caption, thiết kế ảnh |
| 3 | ✅ Bàn Kiểm duyệt & Xuất bản (QA & Publish Desk) | **E01** Evaluator, F01 Publisher | Chấm chất lượng, đăng bài lên Meta |
| 4 | 📈 Bàn Phân tích (Analytics Desk) | G01 Metrics Collector, G02/G03 Insight, G04 Report, **H01 Feedback Loop** | Thu thập số liệu, viết báo cáo, học từ feedback |

#### Bố cục màn hình

```
┌────────────────────────────────────────────────────────┐
│  Bardinh Coffee — Văn phòng CrewLab      🔔 3   👤 Admin│
├────────────────────────────────────────────────────────┤
│                                                          │
│   [ Pixel-art isometric office — 4 bàn làm việc ]       │
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

#### Trạng thái hiển thị trên từng bàn

Mỗi bàn có **1 trong 5 trạng thái**, map từ FSM state thật của content item/cycle liên quan đến agent nhóm đó — không phải trạng thái giả lập:

| Trạng thái | Animation/Icon | Điều kiện kích hoạt |
|------------|-----------------|------------------------|
| 💤 Idle (nghỉ) | Nhân viên ngồi yên, màn hình mờ | Không có task nào của nhóm agent này đang active |
| ⌨️ Working (đang làm) | Nhân viên gõ phím/vẽ, hiệu ứng "..." nhấp nháy | Có content item đang ở state do agent nhóm này xử lý (GENERATING, EVALUATING, PLANNING...) |
| ⏳ Waiting (chờ người) | Nhân viên quay ra nhìn người dùng, bubble hiện số lượng | Có item ở state cần **client action** (PENDING_PLAN_APPROVAL, PENDING_CONTENT_APPROVAL, ANALYTICS_ACK_PENDING) |
| ❗ Blocked/Error | Biển cảnh báo đỏ nhấp nháy, nhân viên đứng khoanh tay | Có item liên quan bị stale/error/vào DLQ (F01 fail, retry vượt giới hạn) |
| 🏖️ Waiting Asset | Bàn Creative có hộp ảnh trống dấu hỏi | Có item ở state `waiting_asset` |

**Rule ưu tiên hiển thị:** nếu 1 bàn có nhiều item ở nhiều trạng thái khác nhau cùng lúc, hiển thị theo độ ưu tiên **`Blocked/Error > Waiting > Working > Idle`** — luôn cho người dùng thấy vấn đề nghiêm trọng nhất trước.

#### Tương tác

| Hành động | Kết quả |
|-----------|---------|
| Click vào 1 bàn | Mở **side panel** (không chuyển trang): tên team + agent, task hiện tại (tên item, bước nào, chạy bao lâu), nút CTA "Duyệt ngay →" nếu có action chờ, hoặc thông báo ngắn không kỹ thuật nếu blocked ("Bài này đang gặp trục trặc khi đăng, Agency đang xử lý") |
| Click vào banner nổi | Nhảy thẳng tới Kanban Task Board, tự bật toggle "Chỉ hiện task cần tôi duyệt" |
| Hover (desktop) | Tooltip ngắn: tên bàn + số task đang chạy |

#### Nguồn dữ liệu & Endpoint

```
GET /api/v1/office/status
→ trả về desk_status cho cả 4 team desk:
  { desk_id, status, active_item_count,
    top_item: {id, title, state}, waiting_count }
```

Realtime cập nhật qua Supabase channel `office_status:{client_id}` — subscribe trên `content_items` + `workflow_cycles`, không polling.

#### UX Decisions

- Pixel Office **không thay thế** Kanban/Content Hub — nó là "cổng vào cảm xúc", mọi hành động sâu đều điều hướng sang màn hình chuyên biệt.
- Mobile: layout đổi thành carousel ngang 4 bàn (swipe qua lại) thay vì hiển thị cùng lúc.
- Không có sound effect mặc định (tránh làm phiền môi trường quán cà phê) — có thể bật tùy chọn Post-MVP.
- Internal App có phiên bản riêng gọi là **Multi-Office Overview** (7.5.4.0) — nhiều văn phòng thu nhỏ, mỗi văn phòng = 1 client.

---

### 7.5.3.2. Kanban Dashboard — Bảng quản lý Task (MỚI)

#### Mục đích và khái niệm quan trọng — đọc kỹ trước khi build

**Đây KHÔNG PHẢI màn hình quản lý trạng thái duyệt bài viết.** Màn hình quản lý bài viết/lịch đăng đã có riêng ở Content Hub > Content Plan Calendar (7.5.3.3). Kanban Dashboard là **bảng quản lý TASK của cả văn phòng AI (agent) lẫn con người**, đúng tinh thần 1 board Trello quản lý dự án thật: mỗi card = 1 công việc cụ thể ai đó (agent hoặc người) đang/đã/sẽ làm, không phải 1 bài đăng.

**Định nghĩa Task:** mỗi bước xử lý trong pipeline là **1 task riêng biệt**, không gộp chung thành 1 task xuyên suốt cho cả vòng đời 1 bài viết. Task sau chỉ được tạo khi task trước Done, đúng theo workflow đã định nghĩa ở Tầng 2 — Kanban Dashboard là lớp hiển thị, không tự phát minh luồng xử lý nào mới.

**Ví dụ:** bài "Cold Brew mùa hè" khi chạy hết pipeline sẽ sinh ra một chuỗi task nối tiếp:

```
Task 1  [🧭 Strategy]   B03 — Lên content plan tuần 25          → Done
Task 2  [✍️ Creative]   D01 — Viết caption "Cold Brew mùa hè"   → Done
Task 3  [✍️ Creative]   D02 — Thiết kế ảnh "Cold Brew mùa hè"   → Done
Task 4  [✅ QA&Publish] E01 — Chấm điểm nội dung                → Done (pass)
Task 5  [✅ QA&Publish] 👤 Bạn — Duyệt bài "Cold Brew mùa hè"    → Review (đang chờ bạn)
Task 6  [✅ QA&Publish] F01 — Đăng bài lên Instagram             → To Do (chờ Task 5 xong)
Task 7  [📈 Analytics]  G01 — Thu thập số liệu (T+7)             → To Do (chờ Task 6 xong)
```

Mỗi task có:
- **assignee:** 1 trong 12 agent (D01, D02, E01, F01...) hoặc **"Bạn"** nếu là bước cần con người quyết định (Gate — HITL)
- **team_desk:** suy ra từ assignee, khớp đúng 4 bàn ở Pixel Office — 1 trong Strategy / Creative / QA&Publish / Analytics
- **linked_item** (tuỳ chọn): content item, campaign, hoặc cycle mà task này thuộc về — có task **không gắn bài viết nào** (vd "G04 — Viết báo cáo tuần 24" là task cấp cycle, không phải 1 bài cụ thể)

#### Cột (Columns) — chuẩn Trello, áp dụng chung mọi loại task

| Cột | Ý nghĩa |
|-----|---------|
| **To Do** | Task đã được tạo, đang xếp hàng chờ tới lượt xử lý hoặc chờ task đứng trước (dependency) hoàn tất |
| **In Progress** | Agent đang xử lý task này (LLM call / xử lý ảnh đang chạy thật) |
| **Review** | Task đã có kết quả, cần xác nhận trước khi tính là xong. 2 trường hợp: **(a)** task loại **Người** (Gate — HITL) luôn sinh ra ở cột này, nằm chờ tới khi bạn hành động; **(b)** task loại **Agent** vừa chạy xong, đang chờ bước kiểm tra tự động kế tiếp (vd D01 vừa viết xong, đang chờ E01 chấm điểm) |
| **Done** | Task hoàn tất, kết quả đã bàn giao cho task kế tiếp trong chuỗi (hoặc kết thúc chuỗi) |

**Không có cột riêng cho lỗi/chặn.** Task gặp lỗi (agent fail, đang retry, vào DLQ...) vẫn nằm ở cột phù hợp với trạng thái xử lý thật (thường là **To Do** — đang chờ retry, hoặc **In Progress** — đang thử lại) nhưng có **label đỏ 🔴 Lỗi** nổi bật trên card kèm số lần retry — đúng tinh thần Trello dùng label thay vì đẻ thêm cột.

#### Swimlane — theo Team Desk, khớp Pixel Office

Board chia thành **4 swimlane ngang**, mỗi swimlane = 1 team desk, đúng 4 bàn ở Pixel Office, giúp người dùng liên kết trực quan giữa 2 màn hình:

```
┌───────────────────────────────────────────────────────────────┐
│  Bảng công việc                           [Lọc ▾]  [Tuần 25 ▾]│
├─────────────┬─────────────┬─────────────┬───────────────────┤
│    To Do    │ In Progress │   Review    │        Done        │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│ 🧭 STRATEGY DESK                                   (1·0·0·3)   │
│ [B02: Pillar│             │             │ [B01][B02][B03]     │
│  tuần 26]   │             │             │                     │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ ✍️ CREATIVE DESK                                   (0·2·1·4)   │
│             │[D01: Viết   │[D02: Ảnh    │ [...][...]          │
│             │ caption·Bài E]│ Cold Brew·  │                    │
│             │             │ chờ E01]    │                     │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ ✅ QA & PUBLISH DESK                          (0·1·2·5) 🔴     │
│             │[F01: Đăng   │[👤 Duyệt bài │                     │
│             │ bài·retry   │ Cold Brew·  │                     │
│             │ lần 2 🔴]   │ còn 18h]    │                     │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ 📈 ANALYTICS DESK                                  (0·0·1·2)   │
│             │             │[👤 Xác nhận  │                     │
│             │             │ báo cáo     │                     │
│             │             │ tuần 24]    │                     │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

Số trong ngoặc ở đầu mỗi swimlane = số task theo từng cột (To Do·In Progress·Review·Done); badge 🔴 xuất hiện ở tên swimlane nếu desk đó có ít nhất 1 task lỗi — đồng bộ đúng thứ tự ưu tiên hiển thị lỗi đã có ở Pixel Office (`Blocked/Error > Waiting > Working > Idle`).

Swimlane có thể **thu gọn (collapse)** riêng từng dòng để tập trung vào 1 team đang cần chú ý.

#### Card task — thông tin hiển thị

- **Avatar:** icon pixel nhỏ của agent (đồng bộ sprite với Pixel Office), hoặc avatar **"👤 Bạn"** nếu là task cần người duyệt
- **Tên task:** `{Agent/Bạn}: {hành động} — {tên bài/campaign nếu có}` (vd "D01: Viết caption — Cold Brew mùa hè", "👤 Bạn: Duyệt bài — Cold Brew mùa hè")
- Thumbnail nhỏ nếu task có `linked_item` là content item có ảnh; task không gắn bài viết nào hiển thị icon 📄 thay thumbnail
- Badge phụ: `🔁 Lần 2` (retry), `⏳ Còn 18h` (SLA cho task loại người), `🔴 Lỗi`

#### Click vào card → Task Detail Panel

Mở panel bên phải (desktop) / modal full-screen (mobile):

- **Task loại Agent** (D01, D02, E01, F01, G01...): hiển thị **read-only** — tên task, agent phụ trách, đã chạy bao lâu, vị trí trong chuỗi (mini timeline dọc: task nào trước/sau). Nếu có lỗi: mô tả ngắn không kỹ thuật ("Agent gặp trục trặc khi đăng bài, đang thử lại"). **Không hiện `eval_score`, token usage, prompt/response thô** cho client — chi tiết kỹ thuật này chỉ có ở Internal App Debug View (7.5.4.3).
- **Task loại Người** (Gate — HITL): mở đúng **component duyệt đã có sẵn**, không xây UI riêng — modal duyệt bài mở preview 2 cột (mockup FB/IG) + Duyệt/Sửa caption/Từ chối, **giống hệt** modal mở từ Content Plan Calendar (7.5.3.3); duyệt báo cáo mở report reader (7.5.3.4); duyệt kế hoạch tuần dẫn sang Content Hub > Content Plan > "Duyệt tất cả tuần". Card task người duyệt trên Kanban chỉ là **lối vào nhanh**, dùng chung 1 component với các màn hình kia để tránh trùng lặp UI.

#### Kéo-thả (drag & drop) — chỉ áp dụng cho task loại Người

| Loại task | Có kéo-thả được không? | Chi tiết |
|-----------|--------------------------|----------|
| **Agent** (D01, D02, E01, F01...) | ❌ Không | Agent tự động chuyển trạng thái theo pipeline thật, người dùng không có quyền tự ý dời task (tránh hiểu nhầm là có thể "ép" AI chạy nhanh/chậm bằng tay). Thử kéo → tooltip "Task của AI tự động cập nhật, không kéo được" |
| **Người** (Gate — HITL) | ✅ Có, trong phạm vi hợp lệ | Kéo **Review → Done** = tương đương bấm Duyệt (mở confirm dialog nhỏ trước khi commit). Kéo **Review → To Do** = tương đương Từ chối (bắt buộc mở form chọn lý do taxonomy trước khi commit). Kéo sang **In Progress** không hợp lệ → card bounce về vị trí cũ + toast lỗi |

Đây là lớp UI gọi lại đúng endpoint approve/reject đã có — kéo-thả không tạo transition mới ngoài FSM Tầng 2 đã định nghĩa.

#### Filter & View options

- Filter theo: Team Desk, Loại task (Agent / Người), Có lỗi hay không, Có gắn bài viết hay không.
- Toggle **"Chỉ hiện task cần tôi duyệt"** — thu gọn board về đúng các task loại Người đang ở cột Review.
- Chọn "Tuần 25 ▾" để xem task thuộc cycle nào — mặc định luôn hiện cycle đang active.

#### Mobile

Swimlane chuyển thành **accordion** (mỗi team desk mở/đóng được), trong mỗi nhóm hiển thị task theo 4 cột dạng tab ngang thay vì hiển thị song song. **Không hỗ trợ kéo-thả trên mobile** — chỉ tap card → action trong Task Detail Panel.

#### Nguồn dữ liệu & Endpoint

Task không phải bảng hoàn toàn mới trong DB — được **tổng hợp (derived)** từ nguồn đã có ở Tầng 1/2: `content_item_state_log` (mỗi lần chuyển state = 1 task tương ứng bước agent xử lý), `hitl_reviews` (task loại Người), và các job cấp cycle (`workflow_cycles`, job định kỳ của G04...). Tầng 4 chỉ định nghĩa 1 lớp aggregation ở backend, không đổi schema gốc Tầng 1/2.

```
GET /api/v1/tasks/board?cycle_id=...&team_desk=...&filter=...
→ trả list task, group theo swimlane (team_desk) × column (status)
  mỗi task: { task_id, title, assignee_type: agent|human, assignee_code,
              team_desk, status, linked_item: {id, type, title, thumbnail} | null,
              retry_count, has_error, sla_deadline, created_at, started_at, completed_at }

PATCH /api/v1/tasks/{id}/transition
→ CHỈ áp dụng task loại human, dùng chung logic approve/reject/schedule đã có,
  idempotency_key bắt buộc
```

Cập nhật real-time qua Supabase Realtime channel `tasks_board:{client_id}` — không polling.

#### UX Decisions

- Đây là bảng quản lý **công việc của cả văn phòng AI + con người**, không phải bảng quản lý bài viết. 2 màn hình bổ trợ nhau: **Kanban** trả lời "ai đang làm gì, tôi đang bị chờ ở đâu"; **Content Hub** (7.5.3.3) trả lời "bài nào đăng ngày nào, nội dung ra sao".
- Không tạo state machine mới — 4 cột Trello chỉ là **lớp hiển thị** nhóm từ state thật đã có ở Tầng 2.
- Card task loại Agent giữ tinh thần "xem cho biết" (read-only), card task loại Người mới là nơi thao tác thật.
- Badge 🔴 ở tên swimlane đồng bộ với trạng thái Blocked/Error ở bàn tương ứng trên Pixel Office — 2 màn hình luôn kể cùng 1 câu chuyện, không lệch nhau.

---
### 7.5.3.3. Content Hub (MỚI — gộp Campaign + Pillar & Angle + Content Plan)

#### Mục đích

Gộp 3 màn hình trước đây tách rời (Campaign Management, Pillar & Angle điều chỉnh, Content Plan dạng bảng/Gate 1) vào **1 khu vực chia 3 tab**, vì cả 3 đều thuộc nhóm "lên kế hoạch nội dung" và người dùng thường cần qua lại giữa chúng khi cấu hình 1 tuần/1 campaign.

```
┌────────────────────────────────────────────────────────┐
│  Content Hub                                            │
│  [ Campaign ]   [ Pillar & Angle ]   [ Content Plan ]   │
└────────────────────────────────────────────────────────┘
```

---

#### Tab 1 — Campaign

**List view:**

```
[Đang chạy (1)] [Sắp tới (2)] [Đã kết thúc (5)]      [+ Tạo mới]

🟢 ĐANG CHẠY — Menu Mùa Hè
1/6 → 30/6/2026 · Seasonal · "Làm mới menu với đồ uống lạnh mùa hè"
                                      [Xem kế hoạch AI] [Kết thúc sớm]
```

**Khi có campaign mới cần xác nhận kế hoạch (trigger từ B01):** hiện banner ở đầu tab dẫn vào Co-pilot editor:

```
📋 Kế hoạch AI đề xuất — Menu Mùa Hè      [Version: AI Draft]  Còn 48h

Tên campaign:     [Menu Mùa Hè ✏️]
Tagline:          [Mát lạnh - Đậm vị ✏️]
Thông điệp chính: [textarea]
Tone đặc biệt:    [dropdown + text override]
Đừng nhắc đến:    [chips]
CTA gợi ý:        [checkbox 3-5 option]
Facebook focus / Instagram focus: [textarea]

💡 Gợi ý AI: Campaign tương tự tháng 4 đạt reach 6,200 nhờ "mát lạnh"

[Xem version gốc AI]   [Từ chối]   [Xác nhận ✓]
```

**Field, validation, action:** 3 action Xác nhận/Từ chối/Xem diff, lock sau khi xác nhận, diff tracking tự động, timeout reminder < 12h.

**Form tạo campaign thủ công:** tên, loại (Seasonal/Product Launch/Promotion/Local Event/Anniversary), ngày bắt đầu/kết thúc, offer, thông điệp chính, target audience, pillar bổ sung, mức ưu tiên.

**Kết thúc sớm:** dialog confirm, dừng dispatch B01 từ chu kỳ tiếp theo, bài đã approve vẫn đăng theo lịch.

---

#### Tab 2 — Pillar & Angle

```
Chủ đề tuần #25                                    Còn 72h

Tổng phân bổ: [████████░░] 100%

┌─ 🔵 Product Spotlight ──────────────── [40%] ◄─ slider ─┐
│ Giới thiệu đồ uống, combo                                │
│ Góc khai thác: [Hương vị đặc trưng] [Ảnh flat lay] [+Thêm]│
│ Platform: FB [60%] / IG [40%]                             │
│                                          [✏️ Sửa] [🗑 Xóa] │
└────────────────────────────────────────────────────────┘

[+ Thêm chủ đề mới]

💡 AI gợi ý: Tăng Behind the Scenes (engagement 4.2% — cao nhất 3 tuần qua)

[Đặt lại về đề xuất AI]   [Từ chối]   [Xác nhận ✓]
```

**Validation rules:** tổng % phải = 100 (nút Xác nhận disable nếu khác), mỗi pillar tối thiểu 5%, tối thiểu 2 – tối đa 5 pillar, live counter đổi màu đỏ/xanh, slider + input số đồng bộ, rebalance tự động khi xóa 1 pillar (cộng vào pillar cao nhất), không cho xóa xuống dưới 2 pillar.

Khi pillar/angle đã confirm ở tab này, chúng trở thành **nguồn dữ liệu** cho dropdown "Pillar" khi xem/sửa từng bài ở Tab 3 (Content Plan) — không cho chọn pillar ngoài danh sách đã chốt.

---

#### Tab 3 — Content Plan (dạng Calendar — thay đổi lớn nhất)

**Thay đổi so với thiết kế cũ:** Trước đây Content Plan trình bày dạng **bảng** (cột: stt, pillar, angle, brief ý tưởng, brief ảnh, caption, ngày...). Nay hiển thị dạng **Calendar (lịch tháng/tuần)** — chỉ hiện tổng quan trên lịch, **bấm vào từng bài mới mở ra chi tiết đầy đủ** (bảng thông tin cũ chuyển thành nội dung của modal chi tiết, không hiển thị sẵn ngoài lịch).

**Bố cục — Calendar view (mặc định: tuần; có thể chuyển tháng):**

```
┌────────────────────────────────────────────────────────────────┐
│  Content Plan            [Tuần ▼]  ◄  Tuần 25 (16–22/6)  ►      │
│                                            [Duyệt tất cả tuần]   │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────────────┤
│  T2  │  T3  │  T4  │  T5  │  T6  │  T7  │  CN  │               │
│ 17/6 │ 18/6 │ 19/6 │ 20/6 │ 21/6 │ 22/6 │ 23/6 │               │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼───────────────┤
│      │ 🟦IG │      │ 🟥FB │      │ 🟦IG │      │  Chú thích:    │
│      │08:00 │      │18:00 │      │17:00 │      │  🟦 IG  🟥 FB  │
│      │[thumb│      │[thumb│      │[thumb│      │  ● đã đăng     │
│      │ nhỏ] │      │ nhỏ ⚠│      │ nhỏ] │      │  ○ chờ duyệt   │
│      │  ●   │      │  ○   │      │  ○   │      │  ◐ AI đang làm │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────────────┘
```

- Mỗi ô = 1 ngày, hiển thị **thumbnail nhỏ + dot trạng thái** cho từng bài đăng ngày đó (có thể nhiều bài/ngày → xếp chồng thumbnail, hiện "+2" nếu quá 2 bài).
- Badge ⚠️ nhỏ trên thumbnail nếu bài đó `real_photo_required = true` và chưa có ảnh thật nộp — nhắc trực quan ngay trên lịch, không cần mở modal mới biết.
- Chuyển đổi **Tuần / Tháng** ở góc trên — view Tháng thu nhỏ thumbnail thành dot màu thuần để đủ chỗ hiển thị cả tháng.

**Click vào 1 bài trên lịch → Modal chi tiết** (nơi chứa toàn bộ thông tin trước kia nằm sẵn trên bảng):

```
┌──────────────────────────────────────────────────────┐
│  Bài: Cold Brew mùa hè                          [✕]  │
│  Platform: Instagram        Ngày đăng: Thứ 3, 08:00   │
│  Pillar: Product Spotlight   Góc khai thác: Hương vị  │
│                                                        │
│  Brief ý tưởng: "Cold Brew mùa hè — hương vị mát lạnh"│
│  Brief ảnh: AI generate / [xem shot list nếu cần ảnh thật] │
│  CTA: Ghé thử                                         │
│                                                        │
│  [Đổi giờ]  [Đổi pillar ▾]  [Thêm ghi chú cho D01]   │
│  [Xóa bài này khỏi cycle]                             │
└──────────────────────────────────────────────────────┘
```

Nếu bài đã qua bước tạo nội dung (đã có caption/ảnh thật) → modal này tự động hiển thị thêm caption/ảnh, và các action Duyệt/Từ chối — **modal này chính là component được tái sử dụng khi click vào task loại Người trên Kanban Task Board (7.5.3.2)**: cùng 1 component duyệt bài, mở từ 2 lối vào khác nhau (từ Calendar hoặc từ card task "👤 Bạn: Duyệt bài..." trên Kanban) để tránh xây 2 UI trùng lặp cho cùng 1 hành động duyệt.

**Reject reason taxonomy (khi từ chối 1 bài cụ thể):**

| Lý do | Mô tả |
|-------|-------|
| Tone không đúng brand voice | |
| Thông tin sai (giá, giờ, tên món) | |
| Ảnh không phù hợp / không đẹp | |
| Không đúng định vị thương hiệu | |
| Không phù hợp thời điểm | |
| Lý do khác | Bắt buộc kèm ghi chú text |

**Nút "Duyệt tất cả tuần"** (góc trên, tương đương duyệt kế hoạch tổng trước khi AI bắt đầu viết caption/tạo ảnh):

```
Duyệt kế hoạch tuần 25 — 6 bài

Hệ thống sẽ bắt đầu viết caption và tạo ảnh cho toàn bộ 6 bài.

⚠️ Bài Thứ 5 cần ảnh thật — deadline nộp Thứ 4

[Từ chối tất cả]                    [Xác nhận — bắt đầu tạo nội dung]
```

Đây là duyệt **kế hoạch tổng**, không duyệt nội dung cụ thể (nội dung cụ thể duyệt qua modal chi tiết ở trên, có thể mở từ đây hoặc từ card task "👤 Bạn: Duyệt bài..." trên Kanban). Từ chối tất cả → modal nhập lý do text tự do, Agency Admin nhận alert.

#### UX Decisions

- 3 tab dùng chung 1 URL pattern `/content-hub?tab=...` — chuyển tab không mất context (vd đang xem tuần nào ở Content Plan vẫn giữ khi quay lại từ tab khác).
- Calendar là **entry point duyệt kế hoạch tuần và xem/duyệt từng bài theo lịch**; Kanban là **nơi theo dõi task của agent + task cần người duyệt nói chung** (không chỉ nội dung — còn có task chiến lược, phân tích...). Hai màn hình không trùng vai trò: Calendar trả lời "bài nào đăng ngày nào, nội dung ra sao", Kanban trả lời "ai (agent/tôi) đang làm gì, tôi đang bị chờ ở đâu".
- Trên mobile, Calendar view Tuần là mặc định (view Tháng chỉ dùng desktop do cần nhiều không gian ngang).

---

### 7.5.3.4. Analytics Acknowledgment Gate (Gate 3 — Báo cáo)

*(Truy cập qua mục "Báo cáo" ở sidebar.)*

```
┌──────────────────────────────────────────────────────┐
│  Báo cáo tuần #24                     Tuần 3-9/6    │
├──────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ Reach  │ │ Engage │ │ Saves  │ │ Top    │         │
│  │ 4,820  │ │  3.2%  │ │   48   │ │  IG ✓  │         │
│  │ +14%   │ │  +0.4% │ │  +12   │ │        │         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
│                                                        │
│  🏆 Bài làm tốt nhất — "Hậu trường pha Cold Brew"     │
│     1,240 reach · 58 like · 12 comment                │
│                                                        │
│  Nhận xét: [2-4 câu narrative tiếng Việt]              │
│  Gợi ý tuần sau: [2-3 bullet points]                  │
│                                                        │
│  Ghi chú cho tuần sau: [________________]              │
│                                                        │
│  [Hỏi thêm ↗]    [Yêu cầu giải thích]  [✓ Đã đọc]    │
└──────────────────────────────────────────────────────┘
```

- Hiển thị `human_report` (Markdown từ G04) dạng đọc được, không phải JSON thô.
- 4 metric card tóm tắt (Reach, Engagement, Saves, Platform tốt hơn), bài làm tốt nhất/kém nhất, nhận xét narrative 2-4 câu, gợi ý tuần sau, ô ghi chú tự do.
- **Actions:** Acknowledge / Acknowledge with comment / Request clarification (tạo annotation thread gắn vào report, **không tạo content item/cycle mới**).
- Auto-acknowledge sau 7 ngày không phản hồi, log `auto_ack_timeout`, không block cycle tiếp theo.
- **Không hiện số liệu raw** (impressions, reactions breakdown) cho client.
- Nút "Hỏi thêm ↗" dùng `sendPrompt()` mở chat về báo cáo này.

---

### 7.5.3.5. Asset Request / Upload Flow

*(Đây là màn hình **nộp ảnh cho 1 yêu cầu cụ thể** khi D02 cần ảnh thật — khác với **Thư viện ảnh** quản lý toàn bộ kho ảnh, nay ở Settings §7.5.3.7.4.)*

```
┌──────────────────────────────────────────────────────┐
│  📸 Yêu cầu ảnh — Cold Brew sản phẩm               │
│  Deadline nộp: Thứ 4, 12:00 (còn 28 giờ)           │
├──────────────────────────────────────────────────────┤
│  CẦN 3 ẢNH: [shot list tự generate từ content brief B03]│
│  HƯỚNG DẪN CHỤP: ánh sáng, nền, kích thước tối thiểu │
│                                                        │
│  [+ Kéo thả ảnh hoặc tap để chọn]                    │
│  📱 Hoặc gửi ảnh qua Telegram — nhanh hơn!           │
│                                                        │
│  [Nộp ảnh →]                                         │
└──────────────────────────────────────────────────────┘
```

- Trigger: D02 tạo `asset_request`, state → `waiting_asset` → notification.
- Upload: chọn/kéo thả/chụp trực tiếp, multi-upload, ghi chú riêng từng ảnh.
- Sau nộp: "Đang chờ Agency Admin duyệt" — **không tự động vào Media Library**.
- Kênh song song: gửi ảnh trực tiếp qua Telegram (bot tự map vào request đang chờ gần nhất).

---

### 7.5.3.6. Direct Assign Task UI (T20)

*(Truy cập nhanh từ nút nổi "⚡ Giao việc nhanh" hoặc từ Pixel Office khi click vào bàn Creative.)*

```
┌──────────────────────────────────────────────────────┐
│  ⚡ Giao việc nhanh                                  │
│  [🤖 Qua Orchestrator]  [🎯 Chọn agent cụ thể]       │
│  Mô tả việc cần làm: [textarea]                      │
│  Tham chiếu bài có sẵn (tuỳ chọn): [dropdown]        │
│  ✅ E01 sẽ kiểm tra chất lượng trước khi trả kết quả │
│  [Giao việc ngay →]                                  │
└──────────────────────────────────────────────────────┘
```

- 2 chế độ: Qua Orchestrator (mô tả tự nhiên, A01 tự route) / Giao thẳng agent cụ thể (MVP: D01 hoặc D02).
- Form: chọn chế độ → (nếu giao thẳng) chọn agent → brief tự do → chọn content item tham chiếu (tùy chọn).
- **Business rule bắt buộc:** dù giao thẳng D02 hay qua Orchestrator, **E01 luôn chấm điểm visual trước khi trả kết quả** — không có đường tắt bỏ qua Evaluator.
- **Không tạo cycle mới**, kết quả trả về ngay trong session.

---

### 7.5.3.7. Cài đặt (Settings) — gộp thêm Thư viện ảnh

#### Cấu trúc tab

```
[ Model & Ngân sách ]  [ Lịch đăng bài ]  [ Brand Voice ]  [ Thư viện ảnh ]  [ Tích hợp ]
```

#### 7.5.3.7.1. Model & Ngân sách

Dropdown model theo agent (12 agent, nhóm theo provider, gắn nhãn tier Fast/Standard/Power), chỉ hiện model thuộc provider Agency Admin đã enable + cấu hình key. Budget cap input per agent (USD/tháng), hiệu lực ≤ 5 phút. D02 có dropdown riêng cho image model.

#### 7.5.3.7.2. Lịch đăng bài

Sửa `weekly_cycle_day`/`weekly_cycle_time`, `analytics_delay_days`, override giờ chạy riêng từng agent (`per_agent_schedule`).

#### 7.5.3.7.3. Brand Voice & Content Config

Tone, personality keywords, avoid phrases, ví dụ caption tốt/tệ, posting frequency & time windows per platform.

#### 7.5.3.7.4. Thư viện ảnh (Media Library) — dời vào Settings

**Trước đây:** mục riêng ở sidebar chính. **Nay:** trở thành 1 tab trong Settings, vì đây là thao tác quản lý tư liệu nền (upload ảnh gốc, xem lại ảnh đã dùng) — không phải tác vụ hằng ngày như duyệt bài.

```
┌────────────────────────────────────────────────────┐
│  Thư viện ảnh              [Tìm kiếm...] [+ Upload] │
│  [Tất cả] [AI tạo] [Ảnh thật] [Chờ duyệt]          │
│  [IMG✅][IMG✅][IMG✅][IMG✅][⏳Chờ][IMG✅]           │
└────────────────────────────────────────────────────┘
```

- Upload trực tiếp ảnh mới vào kho chung (không gắn với 1 asset_request cụ thể) — dùng khi chủ quán muốn chủ động bổ sung tư liệu cho D02 dùng dần, khác với §7.5.3.5 (nộp ảnh theo yêu cầu cụ thể).
- Filter: Tất cả / AI tạo / Ảnh thật / Chờ duyệt.
- Click ảnh → xem chi tiết: metadata (tên file, ngày tải, loại, kích thước), tag đã dùng cho bài nào, action Xóa / Đặt làm ảnh mặc định cho 1 pillar.
- **Ảnh chờ duyệt (client vừa upload) vẫn cần Agency Admin duyệt trước khi D02 dùng** — giữ nguyên rule kiểm soát chất lượng.

#### 7.5.3.7.5. Tích hợp (Telegram Pairing + Meta connection status)

QR code + deep link pairing Telegram (TTL 10 phút, dùng 1 lần), trạng thái Connected/Disconnected + nút Unlink. Hiển thị trạng thái kết nối Meta (**đọc-only cho client** — kết nối/refresh Meta chi tiết nằm ở Internal App §7.5.4.8, vì đây là thao tác kỹ thuật nhạy cảm do Agency Admin phụ trách khi onboarding).

---

### 7.5.3.8. Notification Center

- List, đánh dấu đã đọc, filter theo loại (chờ duyệt/asset/báo cáo/hệ thống).
- Real-time qua Supabase Realtime, không polling.
- Mỗi notification có `action_url` dẫn thẳng đến đúng nơi cần xử lý — với thông báo "chờ duyệt" trỏ vào đúng card task loại Người trên Kanban (hoặc thẳng vào modal duyệt tương ứng ở Content Plan Calendar), **không phải trang Gate riêng**.

---
## 7.5.4. Internal App (Agency Admin)

*(Giữ nguyên phần lớn business logic từ bản nháp trước. Bổ sung mục 7.5.4.0 — Multi-Office Overview, tương ứng khái niệm Pixel Office ở Client Portal nhưng cho phép xem nhiều client cùng lúc.)*

### 7.5.4.0. (MỚI) Multi-Office Overview

Landing screen của Internal App, đặt trước Client List trong điều hướng:

```
┌────────────────────────────────────────────────────────┐
│  Tổng quan văn phòng — 5 client active                 │
├───────────────────┬───────────────────┬────────────────┤
│ 🏢 Bardinh Coffee  │ 🏢 Cafe XYZ        │ 🏢 Client 3    │
│ [mini pixel office]│ [mini pixel office]│ [mini office]  │
│ 🟢 Bình thường     │ 🔴 1 lỗi cần xử lý │ 🟡 Chờ duyệt   │
│ [Vào Client →]     │ [Vào Client →]     │ [Vào Client →] │
└───────────────────┴───────────────────┴────────────────┘
```

Mỗi ô là bản thu nhỏ của Pixel Office client đó (4 bàn, không animation phức tạp, chỉ icon trạng thái tổng hợp) — giúp Agency Admin quét nhanh client nào đang gặp vấn đề mà không cần mở từng client. Click "Vào Client →" → chuyển sang Debug View/Cycle Monitor của đúng client đó.

**Rule badge trạng thái tổng hợp:**

| Badge | Điều kiện |
|-------|-----------|
| 🟢 Bình thường | Không có DLQ unresolved, không có F01 fail, cycle không stale |
| 🟡 Chờ duyệt | Có item ở PENDING_*_APPROVAL nhưng chưa quá hạn |
| 🔴 Lỗi cần xử lý | Có content item ở DLQ hoặc F01 fail — **hiển thị ngay trên màn hình tổng quan, không cần vào từng client mới thấy** |

### 7.5.4.1. Client Lifecycle Management

Onboarding form (9 bước — thay CLI), bước tư vấn provider ghi lại kết quả trao đổi trước khi activate, Pause/Resume (`is_active`), Offboarding có dialog xác nhận 2 bước (gõ đúng tên client mới cho xác nhận).

**9 bước onboarding (tóm tắt):**

| # | Bước | Idempotency |
|---|------|-------------|
| 1 | Thông tin cơ bản (tên, vertical, timezone) | Check tên unique |
| 2 | Platform & lịch đăng bài | — |
| 3 | Khởi tạo ChromaDB collections | Check tồn tại trước khi tạo |
| 4 | Khởi tạo Hindsight Memory Banks (12 agent) | Check bank existence |
| 5 | Ingest Brand Documents (Docling + Chonkie) | Check doc hash, skip nếu đã ingest |
| 6 | Tạo Client Admin User (Supabase Auth) | Check email existence |
| 7 | Kết nối Meta (OAuth) | — |
| 8 | Đăng ký Celery Beat Schedule | Check schedule_id tồn tại |
| 9 | Smoke Test (6 checks) | Fail fast nếu ChromaDB/Celery fail |

### 7.5.4.2. Cycle & Content Monitoring Dashboard

*(Bản kỹ thuật/cross-client của Task Board ở §7.5.3.2.)* Agency Admin dùng cùng model Task Board (swimlane theo team desk, cột To Do/In Progress/Review/Done) nhưng có thêm:
- Filter theo **client**
- Hiển thị **mã agent kỹ thuật thật** (D01, D02, E01...) thay vì tên thân thiện
- Mở được chi tiết lỗi/log ngay trên card (không cần vòng qua Debug View cho lỗi đơn giản)

List `workflow_cycles` theo client, drill-down vào item kèm FSM state, highlight cycle stale (từ `maintenance.check_stale_cycles`).

### 7.5.4.3. Debug View (Internal Only)

`eval_score`/`eval_feedback` đầy đủ, retry history timeline, LLM usage trace (link Langfuse).

```
┌──────────────────────────────────────────────────────┐
│  Debug: "Cold Brew mùa hè" · Bardinh #25            │
│                                                        │
│  E01 SCORE (không hiện cho client)                   │
│  Caption: 8.2/10  ·  Visual: 4.1/5.0                 │
│  [Breakdown từng tiêu chí]                            │
│                                                        │
│  RETRY HISTORY                                        │
│  Lần 1: E01 fail (caption 6.2) → D01 retry           │
│  Lần 2: E01 pass (caption 8.2) → Review              │
│                                                        │
│  LLM USAGE — tokens in/out, model dùng                │
│  [Xem trace Langfuse →]                               │
│                                                        │
│  [Reopen item] [Manual state override]                │
└──────────────────────────────────────────────────────┘
```

> ⚠️ **Lưu ý phụ thuộc:** threshold E01 (pass/fail badge) hiện **lệch giữa Tầng 2 (7.0) và Tầng 3 (8.0)** — cần chốt 1 giá trị trước khi build badge này. Xem Open Question ở đầu tài liệu này.

### 7.5.4.4. Dead Letter Queue Management

List record DLQ chưa resolve, **Replay** (requeue + log actor/timestamp), **Resolve without replay** (ghi chú lý do bắt buộc).

```
🔴 F01.publish_to_meta
   Client: Bardinh Coffee · Lỗi: Meta API auth error (Error 190)
   Fail lúc: 08:05 hôm nay · Đã fail 3 lần
   [Xem Log]  [Replay]  [Đóng không replay]
```

### 7.5.4.5. Reopen / Override Actions

- **Reopen content item:** hiển thị `reopened_count/3`, từ chối nếu chạm giới hạn ("Đã hết lượt reopen — dùng Direct Assign để tạo bài mới").
- **Manual state override:** quyền chặt, chỉ hiện state hợp lệ để chuyển sang, bắt buộc nhập lý do text, ghi audit log đầy đủ với tên actor + timestamp.

### 7.5.4.6. Beat Schedule Management

*(Post-MVP/defer.)* View/edit schedule per client ở cấp Internal Admin; không block MVP vì §7.5.3.7.2 đã cho client tự sửa mức cần thiết.

### 7.5.4.7. LLM Usage & Budget Dashboard

Cross-client view tổng chi phí theo provider/agent, per-client budget status, alert log `quota_warning`/`quota_exceeded`. Đơn vị USD client-facing, quy đổi nội bộ từ token theo bảng giá per-model.

### 7.5.4.8. Meta Account Connection Management

List client + trạng thái kết nối (Page ID, IG Account ID, token expiry), Force refresh token, Connect mới (chi tiết flow §7.5.6.1).

### 7.5.4.9. Audit Log Viewer

Filter theo client/loại hành động/actor, filter riêng `SECURITY_BREACH` (kèm IP, endpoint, chữ ký nhận được — partially masked).

### 7.5.4.10. Escalation Alert Dashboard

Mirror toàn bộ Telegram alert (Tầng 2 EXT.9) vào UI, nút Acknowledge nối vào flag `re_alerted` (ngăn nhắc lại). Ghi chú hành động khi acknowledge, lưu vào audit log.

### 7.5.4.11. LLM Provider & API Key Management

*(Bắt buộc để §7.5.4.1/§7.5.3.7.1 có dữ liệu chạy.)* Per client: bật/tắt provider, nhập API key (mã hóa, hiển thị che `sk-***...xxxx`), nút Test Connection, khi tắt provider → agent đang dùng tự fallback về `default_provider` (hiện rõ danh sách agent bị ảnh hưởng trước khi confirm).

---

## 7.5.5. Notification System

*(`action_url` trong notification nay trỏ vào Kanban card/Content Plan modal thay vì trang Gate riêng.)*

### 7.5.5.1. Supabase Realtime Wiring

Subscribe theo `recipient_user_id` trên bảng `notifications`. Không polling.

### 7.5.5.2. Telegram Bot Architecture

1 bot dùng chung cho tất cả client, route bằng `chat_id ↔ client_id` mapping.

**Pairing flow:** Portal sinh code (§7.5.3.7.5, TTL 10 phút) → verify `/start {code}` → tạo `telegram_bindings` map `chat_id ↔ client_id` → Portal cập nhật trạng thái real-time không cần F5.

**Asset intake:** ảnh gửi trong chat → map vào `asset_request` đang chờ **gần nhất** của client đó → tạo `brand_assets` với `status: pending_review`. Nếu có 2+ request đang chờ cùng lúc, bot cảnh báo rõ đã map vào request nào.

**Post confirmation delivery:** gửi permalink bài thật + ảnh đã dùng (không chụp screenshot cho MVP). Tool Registry bổ sung **T21 `deliver_post_confirmation`** gọi bởi F01 sau publish thành công.

### 7.5.5.3. Channel Decision Matrix

| Trigger | Kênh chính | Kênh phụ | Lý do |
|---------|-----------|---------|-------|
| Asset Request mới tạo | Telegram (push ngay) | Portal Notification Center | Chủ quán xem điện thoại nhanh hơn |
| Content Gate chờ duyệt | Portal Notification | Telegram (reminder nếu quá hạn) | Duyệt cần xem chi tiết, hợp màn lớn |
| Analytics Gate sẵn sàng | Portal Notification | Telegram (digest ngắn) | Báo cáo dài, đọc trên Portal tốt hơn |
| Escalation/lỗi hệ thống | Telegram (ngay lập tức) | Internal App Dashboard | Agency Admin cần phản ứng nhanh |

Upload ảnh: client được phép cả 2 cách bất cứ lúc nào (Telegram trực tiếp hoặc deep link vào Portal), không ép 1 cách duy nhất.

**Mẫu tin nhắn Telegram (client_admin):**

```
🔔 Bài mới cần bạn duyệt
📌 Cold Brew mùa hè · Instagram · Dự kiến: Thứ 3, 08:00
[Xem & Duyệt →]

✅ Đã đăng thành công!
📌 Cold Brew mùa hè · 08:00:05 · Thứ 3, 14/6
🔗 [Xem bài đã đăng]

📸 Cần bạn gửi ảnh thật
Bài: Cold Brew sản phẩm · Cần: 3 ảnh · Deadline: Thứ 4, 12:00
```

**Mẫu tin nhắn Telegram (agency_admin):**

```
🔴 KHẨN — Đăng bài thất bại
Client: Bardinh Coffee · Lỗi: Meta API auth error (Error 190)
💡 Có thể cần refresh token
[Xem chi tiết →]
```

### 7.5.5.4. Failure Handling Implementation

Logic retry (`send_telegram_notification`) đã có ở Tầng 2 EXT.8 — Tầng 4 chỉ wire thật vào Telegram Bot API. Gửi thất bại 3 lần → notification vẫn hiển thị trên Portal (kênh phụ hoạt động độc lập). User block bot → tự động set `status='blocked'`, ngừng gửi Telegram, Portal hiển thị cảnh báo cần kết nối lại.

---

## 7.5.6. Tích Hợp Meta Graph API

### 7.5.6.1. OAuth Connect Flow

Facebook Login for Business, redirect xin quyền publish + đọc insight (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`). Callback verify `state` (CSRF token) trước khi đổi code lấy token. Đổi short-lived → long-lived token (60 ngày), lưu mã hóa (AES-256), không bao giờ plain text. Sau kết nối, hiển thị danh sách Page/IG account để Agency Admin chọn account dùng cho client này (vì 1 tài khoản Meta có thể quản lý nhiều Page).

### 7.5.6.2. Token Storage & Refresh

Long-lived token ~60 ngày, job refresh kích hoạt khi còn ≤ 7 ngày (chạy daily, âm thầm nếu thành công). **Revoke detection** qua polling định kỳ (mỗi 6 giờ gọi API nhẹ kiểm tra token còn hợp lệ không) — không dùng webhook Meta vì không đáng tin cậy. Refresh thất bại (revoke) → alert Agency Admin ngay qua Telegram + Internal App Dashboard (§7.5.4.10).

### 7.5.6.3. Endpoint Mapping

- **T06 `publish_to_meta`** → Facebook Page feed post + Instagram Business (publish 2 bước: tạo container → publish).
- **T07 `collect_meta_metrics`** → bảng canonical: reach, impressions, engagement_rate, link_clicks, saves, comments, reactions_breakdown, shares, video_views, follower_delta.
- Error code mapping: taxonomy Tầng 2 EXT.6 map 1-1 sang `error_code` thật từ Graph API.

### 7.5.6.4. Webhook Handling

Comment moderation và page review webhook **defer sang Post-MVP** — không phải nhu cầu cấp thiết của pilot café.

### 7.5.6.5. API Version & Rate Limit Policy

Pin version Graph API cụ thể (vd v21.0), quy trình review/upgrade khi Meta deprecate. Khi gần chạm rate limit, **ưu tiên publish (F01) trước thu thập metric (G01)** — đăng đúng giờ quan trọng hơn đọc số liệu trễ vài phút.

### 7.5.6.6. Open Question — follower_delta

Cần test thật với Meta Graph API để xác nhận support per-post hay chỉ per-page/ngày. Fallback: dùng follower delta per-page theo ngày đăng bài, gắn flag `data_quality: "page_level_proxy"` để G02/G03 không hiểu nhầm đây là số chính xác riêng cho bài đăng.

---

## 7.5.7. NFR & Acceptance Criteria

### Non-Functional Requirements

| ID | Yêu cầu | Target | Scope |
|----|---------|--------|-------|
| NFR-T4-01 | Pixel Office load lần đầu | ≤ 2s p90 | §7.5.3.1 |
| NFR-T4-02 | Notification Realtime latency | ≤ 5s | §7.5.5.1 |
| NFR-T4-03 | OAuth connect flow hoàn thành | ≤ 5 phút | §7.5.6.1 |
| NFR-T4-04 | Mobile upload (Asset Request) trên 3G | ≤ 30s/ảnh | §7.5.3.5 |
| NFR-T4-05 | Internal App load Debug View | ≤ 1s | §7.5.4.3 |
| NFR-T4-06 | Telegram asset intake (nhận ảnh → tạo `brand_assets`) | ≤ 10s | §7.5.5.2 |
| NFR-T4-07 | DLQ replay action | ≤ 3s | §7.5.4.4 |
| NFR-T4-08 | Webhook signature verification overhead | ≤ 200ms | §7.5.2 |
| NFR-T4-09 *(mới)* | Kanban Task Board load (cycle hiện tại, ≤ 60 task trên cả 4 swimlane) | ≤ 1.5s p90 | §7.5.3.2 |
| NFR-T4-10 *(mới)* | Pixel Office desk status cập nhật sau khi 1 content item đổi state | ≤ 5s | §7.5.3.1 |
| NFR-T4-11 *(mới)* | Content Plan Calendar chuyển view Tuần ↔ Tháng | ≤ 500ms (không gọi lại API nếu data đã cache trong tháng đó) | §7.5.3.3 |

### Acceptance Criteria

| ID | Tiêu chí |
|----|---------|
| AC-T4-01 | Client Staff đăng nhập → không thấy nút Approve ở bất kỳ card/gate nào; chỉ Client Admin thấy |
| AC-T4-02 | Client Admin bôi đen text trong Campaign draft, thêm comment → lưu đúng `selected_text_hash`, hiển thị đúng vị trí khi reload |
| AC-T4-03 | Client Admin click Duyệt tất cả tuần ở Content Plan Calendar → toàn bộ item chuyển `PLAN_APPROVED`, A01 dispatch D01 đúng theo FSM |
| AC-T4-04 | Modal duyệt bài (mở từ Content Plan Calendar hoặc từ card task "👤 Bạn: Duyệt bài" trên Kanban) hiển thị đầy đủ caption + visual + giờ đăng nhưng `eval_score` không xuất hiện ở bất kỳ đâu trong response — xác nhận qua network inspector |
| AC-T4-05 | Client Reject 1 content item với lý do taxonomy dropdown → reason ghi vào `hitl_reviews`, item quay lại đúng agent theo retry logic Tầng 2; trên Kanban, task "👤 Bạn: Duyệt bài" chuyển Done (reject), đồng thời sinh task mới cho agent tương ứng (D01/D02) ở cột To Do, có badge `🔁 Lần 2` |
| AC-T4-06 | Client thay đổi model D01 ở Settings > Model & Ngân sách → task D01 tiếp theo dùng đúng model mới trong ≤ 5 phút; client khác không bị ảnh hưởng |
| AC-T4-07 | Client dùng Direct Assign giao thẳng D02 sửa ảnh 1 content item cũ → không tạo cycle mới; E01 vẫn chấm visual trước khi trả kết quả |
| AC-T4-08 | Client pairing Telegram bằng code ở Settings > Tích hợp → gửi `/start {code}` → map đúng `client_id`; Portal hiển thị "Connected" |
| AC-T4-09 | Token Meta sắp hết hạn trong 7 ngày → hệ thống tự refresh, F01 publish không gián đoạn |
| AC-T4-10 | Agency Admin trigger Reopen lần thứ 4 cho 1 content item → hệ thống từ chối, hiển thị đúng lý do đã chạm giới hạn 3 lần |
| AC-T4-11 | Agency Admin replay 1 DLQ record → task requeue, record chuyển `resolved`, audit log ghi actor + timestamp |
| AC-T4-12 | Webhook Meta/Telegram gửi request sai chữ ký → hệ thống reject 401, không xử lý payload, ghi audit log `SECURITY_BREACH` |
| AC-T4-13 | Escalation alert mới phát sinh → xuất hiện trong Internal App Dashboard ≤ 5s, đồng thời gửi Telegram — 2 kênh không phụ thuộc lẫn nhau |
| AC-T4-14 | Client "Request clarification" trên Gate 3 → tạo annotation thread gắn vào report G04, không tạo content item/cycle mới |
| AC-T4-15 | Agency Admin tắt provider OpenAI cho 1 client → dropdown model ở Settings client đó ẩn ngay model OpenAI; agent đang dùng fallback về `default_provider` |
| AC-T4-16 *(mới)* | Pixel Office: khi 1 content item chuyển sang `PENDING_CONTENT_APPROVAL`, bàn "QA & Publish" đổi trạng thái sang ⏳ Waiting trong ≤ 5s, không cần refresh trang |
| AC-T4-17 *(mới)* | Kanban: kéo card task loại Người ("👤 Bạn: Duyệt bài...") từ Review → Done → mở confirm dialog trước khi commit; kéo card task loại Agent (D01, D02, E01...) ở bất kỳ cột nào → card bounce về vị trí cũ ngay lập tức, không gọi API, hiện tooltip "Task của AI tự động cập nhật, không kéo được" |
| AC-T4-18 *(mới)* | Content Plan Calendar: click vào 1 ngày có 3 bài trở lên → hiển thị đúng "+N" và mở được list đầy đủ khi click vào badge đó |
| AC-T4-19 *(mới)* | Thư viện ảnh (Settings > Thư viện ảnh): ảnh client tự upload vẫn ở trạng thái "Chờ duyệt", D02 không được dùng ảnh này cho tới khi Agency Admin duyệt |
| AC-T4-20 *(mới)* | Internal App Multi-Office Overview: client có content item ở DLQ hoặc F01 fail → ô văn phòng thu nhỏ của client đó hiển thị badge 🔴 ngay trên màn hình tổng quan, không cần vào từng client mới thấy |

---

## Phụ lục — Open Questions cần chốt trước khi giao dev

| # | Vấn đề | Ảnh hưởng | Đề xuất hành động |
|---|--------|-----------|---------------------|
| 1 | **E01 threshold pass/fail lệch 7.0 (Tầng 2) vs 8.0 (Tầng 3)** | Debug View badge (§7.5.4.3), mọi nơi hiển thị kết quả E01 pass/fail | Đối chiếu lại 2 tài liệu gốc, chốt 1 giá trị, cập nhật cả 2 nơi đồng thời |
| 2 | Backend hosting: Railway (theo bản Tầng 4 gốc) vs Hetzner VPS + Coolify (theo changelog v1.1 + Section 7.6) | Ảnh hưởng deploy pipeline, CI/CD flow ở §7.5.1 | **Đã note trong tài liệu này: Hetzner + Coolify là quyết định cuối, override Railway** — dev cần đọc kỹ ghi chú ở §7.5.1 Backend Hosting |
| 3 | `follower_delta` per-post hay per-page | Độ chính xác báo cáo G02/G03 | Test thật với Meta Graph API trước khi build G01 |

---

*PRD-CrewLab-Tang4-Consolidated-v2.0 · Tháng 7/2026 · Nguồn: PRD-CrewLab.md v1.2 Section 7.5 · Owner: Trường, Thuận · Status: Draft — sẵn sàng giao dev sau khi chốt Open Question #1*
