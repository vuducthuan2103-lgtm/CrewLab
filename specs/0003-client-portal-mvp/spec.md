# SPEC-0003: Client Portal MVP (6 Agents AI Workspace & FSM Approval Flow)

## 1. Context & Business Goal
CrewLab là hệ thống AI Agency (multi-agent marketing automation) cung cấp dịch vụ quản lý nội dung tự động cho các doanh nghiệp F&B SME Việt Nam. Client Portal (`portal/` - Tầng 4) là bề mặt tương tác duy nhất giữa Chủ quán / Khách hàng và văn phòng AI 6 agents (A01 Orchestrator, B02 Content Pillar, B03 Content Plan, D01 Caption Writer, D02 Image Designer, E01 Evaluator).

Khách hàng thí điểm đầu tiên (Pilot Client) là **Bardinh Coffee** (tuần 25).

### Nguyên tắc nhận diện thương hiệu & UX (Theo CREWLAB-UI-BRAND-SYSTEM & Decision 0002)
- **Tập trung nền tảng Web Desktop:** Theo quyết định chốt từ Founders, giao diện tập trung tối ưu hiển thị trên màn hình Web Desktop máy tính.
- **Tông màu chủ đạo (Primary Accent):** **Electric Lime (`#D4FF00`)**, bắt buộc dùng cho các nút CTA chính ("Duyệt bài", "Xác nhận", "Lưu cấu hình", "Đánh dấu đã đăng") kèm hiệu ứng phát sáng (`shadow-glow-lime-sm`, `hover:shadow-glow-lime`).
- **2 Chế độ hiển thị:** Hỗ trợ chuyển đổi mượt mà giữa Dark Mode (Mặc định - nền Deep Obsidian `#09090B`, card Dark Charcoal `#141417`) và Light Mode (Nền `#FAFAFA`, card `#FFFFFF`).
- **Phông chữ (Typography):** Sử dụng phông **`Montserrat`** cho toàn bộ giao diện, menu, tiêu đề, nội dung; và **`JetBrains Mono`** cho dữ liệu log/thông số kỹ thuật.
- **Màu sắc 6 trạng thái FSM MVP:** `planned` (xám), `evaluating` (cyan pulse), `eval_failed` (amber), `pending_content_approval` (electric lime glow), `approved_ready_to_post` (emerald), `posted` (blue).

---

## 2. Features & Architecture (9 Core Modules)

### 2.1. Đăng nhập & Quên mật khẩu (Supabase Auth Static + Mock Login)
- **Màn hình `/login` & `/forgot-password`:** Thiết kế chuẩn High-Tech AI Cybernetic tối giản, hiện đại.
- **Tính năng Mock Login:** Hỗ trợ nhập Email bất kỳ (hoặc bấm nút "Trải nghiệm ngay với tài khoản Bardinh Coffee") để đăng nhập thẳng vào Client Portal mà không cần thiết lập backend Supabase Auth phức tạp trong giai đoạn demo UI.

### 2.2. Header & Trung tâm Điều khiển (Workspace Controls)
- Hiển thị Logo CrewLab và huy hiệu Quán thí điểm (**Bardinh Coffee - Tuần 25**).
- Nút chuyển đổi giao diện Sáng / Tối (Theme Toggle Sun/Moon).
- **Notification Center (Chuông thông báo 🔔):** Danh sách thông báo theo thời gian thực (chờ duyệt bài, AI xin ảnh, thông báo hệ thống) click trỏ thẳng tới modal bài viết tương ứng.
- **Nút đặc biệt "⚡ Demo Trigger AI Event":** Nút giả lập sự kiện AI dành riêng cho thuyết trình/pitching. Khi bấm vào, chuông thông báo tự động nhảy số `(+1)` và tạo sự kiện mới (Ví dụ: *"D01 vừa viết xong bài Bạc Xỉu Kem Trứng, chờ bạn duyệt!"* hoặc *"D02 đang cần 3 ảnh chụp không gian quán!"*) làm sống động trải nghiệm văn phòng AI thực thụ.

### 2.3. Bảng công việc (Kanban Dashboard MVP - 3 Swimlanes × 4 Columns)
- Bảng quản lý **TASK của cả văn phòng AI lẫn Con người** theo chuẩn Trello.
- **3 Swimlanes:**
  1. 🧭 **Strategy Desk:** A01 Orchestrator, B02 Content Pillar, B03 Content Plan.
  2. ✍️ **Creative Desk:** D01 Caption Writer, D02 Image Designer.
  3. ✅ **QA Desk:** E01 Evaluator + 👤 Human Review (Chủ quán duyệt bài).
- **4 Columns:** `To Do`, `In Progress`, `Review`, `Done`.
- **Card Task:** Avatar (AI/Người), Tiêu đề task, Huy hiệu thời gian SLA (`⏳ Còn 18h`), huy hiệu retry (`🔁 Lần 2`), và nhãn đỏ `🔴 Lỗi` (nếu có).
- **Tương tác:** Task của AI có tooltip *"Task của AI tự động cập nhật, không kéo thả được"*. Task của con người (Review) khi click vào sẽ mở ngay Modal Duyệt bài (Gate 2) hoặc Tab Trụ nội dung (Gate S2/S3).

### 2.4. Kế hoạch nội dung (Content Hub MVP - 3 Tabs `/content-hub?tab=...`)
- **Tab 1 — Campaign:** Hiển thị Placeholder *"Sắp ra mắt — Tính năng quản lý chiến dịch/sự kiện sẽ có trong phiên bản sau"* (do B01 IMC Planner chưa build ở Phase 1).
- **Tab 2 — Pillar & Angle (Gate S2 - Output từ B02):**
  - Hiển thị danh sách các Trụ nội dung (Product Spotlight, Behind the Scenes, Lifestyle...).
  - Thanh Slider phân bổ tỷ lệ % (tổng bắt buộc = 100%, nút Xác nhận disable nếu tổng ≠ 100%).
  - Banner AI Gợi ý (*"💡 AI gợi ý: Tăng Behind the Scenes lên 35% do engagement tuần trước đạt 4.2%"*). Nút Xác nhận và Đặt lại về đề xuất AI.
- **Tab 3 — Content Plan Calendar (Gate S3 - Output từ B03):**
  - Hiển thị Lịch nội dung theo Tuần / Tháng.
  - Các ô ngày hiển thị thumbnail bài viết, huy hiệu nền tảng (🟦 IG / 🟥 FB), giờ đăng, và cảnh báo ⚠️ nếu bài viết cần ảnh thật mà chưa nộp.
  - Nút CTA tổng: **"Duyệt tất cả tuần"** (Approve All Week - Gate S3) để xác nhận kế hoạch và kích hoạt pipeline tạo caption/ảnh.

### 2.5. Modal Duyệt bài (Content Approval - Gate 2 Shared Component)
- **Component dùng chung:** Được gọi ra khi bấm vào Card "👤 Bạn: Duyệt bài..." trên Kanban hoặc bấm vào bài viết trên Lịch Content Plan.
- **Hệ thống hiển thị 2 cột Preview:** Mô phỏng giao diện bài đăng thực tế trên Facebook và Instagram.
- **Quyền năng chỉnh sửa:** Cho phép chủ quán sửa trực tiếp nội dung Caption và chọn lại Giờ đăng dự kiến.
- **Bảo mật thông số AI:** **Ẩn hoàn toàn điểm số `eval_score`** của E01 đối với khách hàng (chỉ hiển thị nhãn "AI Đã thẩm định đạt chuẩn").
- **Hành động (Actions):**
  - **Approve:** Duyệt bài, chuyển trạng thái sang `approved_ready_to_post` (Nút màu Electric Lime `#D4FF00` glow).
  - **Approve with edit:** Lưu caption mới và duyệt.
  - **Reject with reason:** Dropdown chọn taxonomy lý do từ chối chuẩn PRD (`tone_wrong` - Sai tông giọng, `info_incorrect` - Sai thông tin, `visual_poor` - Ảnh chưa đẹp, `wrong_asset` - Dùng sai ảnh, `off_brand` - Lệch thương hiệu, `other` - Khác) kèm ô nhập ghi chú chi tiết.
- **Nút "Đánh dấu đã đăng" (Mark as Posted):** Khi bài ở trạng thái `approved_ready_to_post`, hiển thị nút này. Khi chủ quán tự đăng tay lên FB/IG xong, bấm vào nút để chuyển state sang `posted` và đóng bài khỏi danh sách chờ.

### 2.6. Yêu cầu & Thư viện ảnh (Asset Request Flow & Media Library)
- **Asset Request Flow (Nộp ảnh cho D02):** Khi D02 cần tư liệu ảnh thật, hệ thống tạo `asset_request`. Giao diện hiển thị Shot list yêu cầu (Ví dụ: *Chụp ly Cold Brew dưới ánh nắng sáng, cận cảnh lớp kem trứng...*), deadline, và khu vực Drag-and-Drop upload ảnh, ghi chú riêng từng ảnh.
- **Thư viện ảnh (Media Library trong Settings):** Kho ảnh chung của quán. Bộ lọc nhanh: *Tất cả*, *AI tạo*, *Ảnh thật*, *Chờ duyệt*. Bấm vào ảnh để xem chi tiết Metadata, thẻ tag (auto-tagged bởi AI), và trạng thái sử dụng trong các bài đăng.

### 2.7. Cài đặt thương hiệu (Settings MVP - 4 Tabs)
- **Tab 1 — Brand Voice:** Form ngắn no-code nhập Tông giọng (Thân thiện, trẻ trung...), Từ khóa thương hiệu, Từ cấm sử dụng, và Caption mẫu.
- **Tab 2 — Thư viện ảnh (Media Library):** Quản lý kho tư liệu ảnh như mô tả tại mục 2.6.
- **Tab 3 — Model & Ngân sách:** Cấu hình chọn model LLM cho **đúng 6 agent MVP** (A01, B02, B03, D01, D02, E01) gắn nhãn tier Standard/Power; và ô nhập giới hạn Ngân sách (USD/tháng).
- **Tab 4 — Tích hợp:** Hiển thị trạng thái kết nối Meta Graph API ở chế độ Read-only (Connected / Disconnected).

### 2.8. Phân quyền Hiển thị & Thao tác (Quyết định 0003)
- Cào bằng quyền hạn: Cả `client_admin` và `client_staff` đều có **đầy đủ quyền hạn như nhau** trên Client Portal MVP.
- Không ẩn bất kỳ nút thao tác hay nút Duyệt bài nào với `client_staff`, giúp đội ngũ quán F&B vận hành thông suốt.

### 2.9. Mock Data Store (Dữ liệu Bardinh Coffee Tuần 25)
- Xây dựng store dữ liệu cục bộ phong phú (sử dụng React State / Context / Zustand hoặc Mock Service) mô phỏng chính xác chu kỳ tuần 25 của Bardinh Coffee với 6-8 task chạy xuyên suốt từ Strategy, Creative đến QA.
- Đảm bảo tính tương tác thời gian thực: Bấm duyệt bài -> Task di chuyển sang Done -> Lịch đổi màu dot -> Thông báo cập nhật.

---

## 3. Acceptance Criteria (DoD - Definition of Done)

- [ ] **AC-PORTAL-01:** Màn hình Tổng quan (Kanban Dashboard) hiển thị đúng 3 swimlanes và 4 cột với dữ liệu mẫu Bardinh Coffee; phân biệt rõ task của AI (không kéo thả được) và task của con người (click mở modal duyệt).
- [ ] **AC-PORTAL-02:** Trang Kế hoạch (Content Hub) chuyển đổi mượt mà giữa 3 tab; Tab Pillar & Angle có thanh slider % hoạt động chính xác (tổng = 100%); Tab Calendar hiển thị lịch tuần/tháng với nút "Duyệt tất cả tuần".
- [ ] **AC-PORTAL-03:** Modal Duyệt bài (Gate 2) hiển thị 2 cột preview FB/IG, cho phép sửa caption, ẩn điểm số `eval_score`, và có dropdown từ chối với taxonomy lý do chuẩn.
- [ ] **AC-PORTAL-04:** Nút "Đánh dấu đã đăng" hoạt động khi bài ở trạng thái `approved_ready_to_post`, đổi trạng thái bài thành `posted`.
- [ ] **AC-PORTAL-05:** Trang Thư viện ảnh hiển thị danh sách ảnh lưới (grid), bộ lọc (Tất cả, AI tạo, Ảnh thật, Chờ duyệt), và màn hình nộp ảnh Asset Request gắn đúng với yêu cầu của AI.
- [ ] **AC-PORTAL-06:** Trang Cài đặt gồm đúng 4 tab (Brand Voice, Thư viện ảnh, Model & Ngân sách cho 6 agent, Tích hợp Meta read-only).
- [ ] **AC-PORTAL-07:** Trang Đăng nhập & Quên mật khẩu Supabase Auth static hoạt động mượt mà cùng nút "Mock Login" cho phép vào thẳng Portal trải nghiệm.
- [ ] **AC-PORTAL-08:** Phân quyền hiển thị tuân thủ Quyết định 0003: Cả `client_admin` và `client_staff` đều thấy đầy đủ tính năng và nút Duyệt bài.
- [ ] **AC-PORTAL-09:** Nút "⚡ Demo Trigger AI Event" trên Header khi bấm vào sẽ giả lập sự kiện AI thành công, tăng số lượng thông báo trên chuông 🔔 và tạo thông báo mới trong Notification Center.
- [ ] **AC-PORTAL-10:** Giao diện tuân thủ tuyệt đối bộ nhận diện thương hiệu CrewLab: màu nút Electric Lime `#D4FF00` glow, phông chữ `Montserrat`, hỗ trợ Dark/Light Theme Toggle mượt mà, zero lint/type errors.

---

## 4. Technical Architecture & Component Mapping

Toàn bộ mã nguồn nằm trong thư mục `portal/` thuộc monorepo:
```
portal/
├── app/
│   ├── globals.css         # CSS Variables (Dark Obsidian #09090B, Lime #D4FF00 glow)
│   ├── layout.tsx          # Root Layout với ThemeProvider & Montserrat font
│   ├── page.tsx            # Redirect / Dashboard Trang chủ (Kanban)
│   ├── login/page.tsx      # Màn hình Đăng nhập (Static + Mock Login)
│   ├── forgot-password/    # Màn hình Quên mật khẩu
│   ├── content-hub/        # Trang Kế hoạch (3 Tabs: Campaign, Pillar, Calendar)
│   ├── assets/             # Trang Nộp ảnh & Yêu cầu ảnh (Asset Request)
│   └── settings/           # Trang Cài đặt (4 Tabs)
├── components/
│   ├── layout/             # Header, Sidebar, ThemeToggle, NotificationCenter, DemoTriggerBtn
│   ├── kanban/             # KanbanBoard, Swimlane, TaskCard, TaskDetailModal
│   ├── content-hub/        # PillarSlider, ContentCalendar, CampaignPlaceholder
│   ├── approval/           # ContentApprovalModal (Gate 2 - Shared Preview FB/IG)
│   ├── assets/             # MediaLibraryGrid, AssetUploadDropzone
│   ├── settings/           # BrandVoiceForm, ModelBudgetConfig, MetaIntegrationTab
│   └── ui/                 # shadcn/ui primitives (Dialog, Sheet, Badge, Button, Tabs, Slider...)
└── lib/
    ├── mock-data.ts        # Dữ liệu mẫu Bardinh Coffee Tuần 25 & 6 Agents MVP
    ├── store.ts            # Local State management (Zustand / React Context cho interactive UI)
    └── types.ts            # TypeScript definitions (FSM States, Tasks, Content Items, Rejection Reasons)
```
