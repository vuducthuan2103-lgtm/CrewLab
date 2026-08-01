# CrewLab — PRD Internal App (Agency Admin)
**Phiên bản:** 1.0 — Focused Scope  
**Cập nhật:** Tháng 7/2026  
**Dành cho:** Designer, Frontend Dev, Founder  
**Phạm vi:** Chỉ 2 trọng tâm — **Onboard client mới** và **Quản lý chi phí AI**

---

## Ghi chú phạm vi

Đây là bản PRD **thu hẹp có chủ đích**. Internal App đầy đủ (theo PRD gốc dự án) còn có thêm: Multi-Office Overview, Cycle Monitor/Debug View, Dead Letter Queue, Reopen/Override, Meta Account Management, Beat Schedule, Audit Log, Escalation Alert Center. **Những phần này KHÔNG nằm trong bản PRD lần này** — sẽ viết ở giai đoạn sau khi cần.

Lý do thu hẹp: giai đoạn hiện tại (1-3 client pilot), việc quan trọng nhất với Thuận + team là **(1) đưa được client mới vào hệ thống nhanh, không cần code** và **(2) kiểm soát chi phí AI không vượt ngân sách** — 2 việc này xảy ra thường xuyên nhất, còn debug/DLQ/audit chỉ cần khi có sự cố (tần suất thấp hơn nhiều ở quy mô nhỏ).

---

## Mục lục

1. [Information Architecture](#1-information-architecture)
2. [Client List — Màn hình đầu tiên](#2-client-list--màn-hình-đầu-tiên)
3. [Onboard Client Mới — Wizard 9 bước](#3-onboard-client-mới--wizard-9-bước)
4. [Quản lý Chi phí AI](#4-quản-lý-chi-phí-ai)
5. [Acceptance Criteria](#5-acceptance-criteria)

---

## 1. Information Architecture

```
┌─────────────────────┐
│  🔷 CrewLab Admin   │
├─────────────────────┤
│                     │
│  👥 Clients         │  ← Màn hình đầu tiên (danh sách)
│  💰 Chi phí AI       │  ← Tổng quan chi phí tất cả client
│                     │
└─────────────────────┘
```

Chỉ 2 mục chính trên sidebar. Không có Dashboard alert-first, không có Multi-Office Overview — vì phạm vi hiện tại không cần.

**Luồng sử dụng chính:**

```
Mở app → Client List → 
  ├─ Client mới chưa tồn tại → [+ Onboard Mới] → Wizard 9 bước
  └─ Client đã có → Click vào → Xem/sửa Chi phí AI của client đó

Hoặc: Mở app → Chi phí AI (sidebar) → Xem tổng quan TẤT CẢ client cùng lúc
```

---

## 2. Client List — Màn hình đầu tiên

### Mục đích

Landing screen. Đơn giản — chỉ đủ để biết đang có client nào, trạng thái ra sao, và điều hướng vào đúng nơi cần.

### Layout

```
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
```

### Client card — thông tin hiển thị

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| Tên client + Vertical | `clients` table | |
| Platform | `client_config` | FB/IG/cả hai |
| Chi phí tháng này | Tổng hợp từ `llm_usage` | % so với budget cap tổng |
| Badge màu | Tính từ % chi phí | 🟢 < 80% · 🟡 80-99% · 🔴 ≥ 100% (đã vượt) |

**Không có trạng thái "Active/Paused/Error" phức tạp** ở bản này — chỉ cần biết chi phí đang ở đâu, vì đó là 2 việc quan tâm chính. Nếu cần pause/offboard client, đây là việc hiếm — làm trực tiếp qua Sửa Cấu Hình (form đơn giản, không cần quy trình 2 bước phức tạp ở bản MVP thu hẹp này).

### Actions

| Nút | Dẫn tới |
|-----|---------|
| + Onboard Mới | Wizard 9 bước (Section 3) |
| Xem Chi Phí | Trang Chi phí AI, lọc sẵn theo client này (Section 4) |
| Sửa Cấu Hình | Form chỉnh sửa nhanh: tên, platform, trạng thái active/paused |

---

## 3. Onboard Client Mới — Wizard 9 bước

### Mục đích

Agency Admin đưa client mới vào hệ thống hoàn toàn trên UI — không cần chạy script/CLI. Mỗi bước có thể lưu và quay lại sau (draft tự động lưu).

### Progress bar

```
[1]━━[2]━━[3]━━[4]━━[5]━━[6]━━[7]━━[8]━━[9]
```

---

### Bước 1 — Thông tin cơ bản

```
Tên client *          [Bardinh Coffee                    ]
Vertical *             [Cafe & F&B ▼]
Timezone *              [Asia/Ho_Chi_Minh ▼]
Mô tả ngắn (internal)   [textarea]

                                    [Lưu & Tiếp tục →]
```

Validation: tên bắt buộc, unique. Trùng tên → gợi ý thêm suffix.

---

### Bước 2 — Nền tảng & lịch đăng bài

```
Platform *              [☑ Facebook] [☑ Instagram] [☐ TikTok]
Số bài/tuần *            [6]
Lịch Facebook:           Ngày [☑T3][☐T4][☑T5][☐T6][☑T7][☐CN]  Giờ [08:00][18:00]
Lịch Instagram:          Ngày [☑T2][☐T3][☑T4][☐T5][☑T6][☐T7]  Giờ [17:00]
Analytics delay:         [7] ngày sau khi đăng

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

---

### Bước 3 — Khởi tạo ChromaDB

```
Hệ thống sẽ tạo 3 collections riêng cho client này.

[▶ Khởi tạo ChromaDB]

✅ bardinh-coffee_brand — OK
✅ bardinh-coffee_content_history — OK
✅ bardinh-coffee_tmp — OK

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

Idempotent: nếu đã tồn tại → "⟳ Đã tồn tại — bỏ qua" thay vì lỗi.

---

### Bước 4 — Khởi tạo Hindsight Memory Banks

```
[▶ Khởi tạo Memory Banks]

✅ A01 · B01 · B02 · B03 · D01 · D02 · E01 · F01
✅ G01 · G02 · G03 · G04 · H01

13/13 banks sẵn sàng

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

---

### Bước 5 — Upload tài liệu brand

```
[+ Kéo thả file hoặc click để chọn]   PDF, DOCX, TXT, MD

File đã upload:
📄 menu_bardinh_2026.pdf         [Xóa]
📄 brand_guideline.docx          [Xóa]

[▶ Ingest vào ChromaDB]

✅ menu_bardinh_2026.pdf — 47 chunks
✅ brand_guideline.docx — 23 chunks

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

---

### Bước 6 — Tạo Client Admin User

```
Email *                [hungbardinh@gmail.com]
Tên hiển thị *          [Anh Hùng — Bardinh]
Role: client_admin (mặc định)

[▶ Tạo tài khoản]

✅ User đã tạo · Email đặt mật khẩu đã gửi

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

---

### Bước 7 — Kết nối Meta

```
[▶ Kết nối tài khoản Meta]  → mở popup OAuth Facebook Login for Business

✅ Đã xác thực

Chọn Facebook Page:        [● Bardinh Coffee (ID: 123456789)]
Chọn Instagram Account:    [● @bardinhcoffee (ID: 987654321)]

Token hết hạn: 15/8/2026 · Tự động refresh khi còn ≤ 7 ngày

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

---

### Bước 8 — LLM Provider & API Key ⭐ (liên kết trực tiếp tới Section 4)

*Đây là lần đầu cấu hình provider/key cho client này. Sau bước này, mọi thay đổi provider/key/budget đều thực hiện lại ở trang **Chi phí AI** (Section 4) — không cần quay lại wizard.*

```
Bước 8/9 — Provider & Ngân sách ban đầu

ANTHROPIC                              [🟢 Bật]
API Key: [sk-ant-...........................] 👁
[Test Connection]  ✅ Hợp lệ — Sonnet 4.6, Haiku 4.5 available

OPENAI                                 [🟢 Bật]
API Key: [sk-...........................] 👁
[Test Connection]  ✅ Hợp lệ — GPT-Image-2 available

Ngân sách tổng/tháng cho client này *   [$50]

Model mặc định theo nhóm agent:
  Strategy (A01,B01-B03):    [Claude Sonnet ▼]
  Content (D01):              [Claude Sonnet ▼]
  Image (D02):                 [GPT-Image-2 ▼]
  Evaluator (E01):             [Claude Haiku ▼]
  Analytics (G01-G04, H01):    [Claude Sonnet ▼]

                                    [← Quay lại]  [Lưu & Tiếp tục →]
```

**Validation:** ít nhất 1 provider phải Test Connection thành công trước khi qua bước 9. Ngân sách tổng bắt buộc nhập, tối thiểu $10 (cảnh báo nếu quá thấp: "Ngân sách này có thể không đủ cho D02 tạo ảnh — khuyến nghị tối thiểu $30").

**Key được mã hóa ngay khi lưu** — không bao giờ hiển thị lại full key sau khi rời khỏi trường nhập, kể cả trong wizard.

---

### Bước 9 — Đăng ký lịch tự động & Smoke Test

```
Các task tự động sẽ tạo: weekly_cycle (T2 06:00), reflect_job (T2 04:00),
h01_batch (T2 04:00), stale_check (mỗi 4h), analytics_trigger (daily)

[▶ Kích hoạt & Chạy Smoke Test]

✅ ChromaDB collections — Accessible
✅ Hindsight Memory Banks — 13/13 respond
✅ Celery task dispatch — Test task thành công
✅ Meta API token — Valid
✅ Client Portal login — OK
✅ LLM Provider — Anthropic + OpenAI test call thành công

6/6 checks passed

🎉 Bardinh Coffee đã sẵn sàng!
Cycle đầu tiên: Thứ 2, 16/6/2026 lúc 06:00

                    [Về Client List]    [Xem Chi Phí AI của client này]
```

**Nếu 1 check fail (vd Meta token invalid):** hiện lỗi cụ thể + nút "Fix ngay" dẫn đúng tới bước liên quan (vd quay lại Bước 7). Check ChromaDB/Celery fail → block, không cho qua. Check Portal login fail (do email chưa verify) → cho phép bỏ qua, không block.

---

## 4. Quản lý Chi phí AI

### Mục đích

Xem và điều chỉnh chi phí LLM — cả tổng quan tất cả client lẫn đi sâu từng client. Đây là nơi **duy nhất** (ngoài Bước 8 wizard) để sửa provider, API key, model, và ngân sách sau khi client đã onboard xong.

### 4.1. Tổng quan tất cả client

```
┌──────────────────────────────────────────────────────────┐
│  Chi phí AI                          Tháng 6/2026 [▼]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  TỔNG CHI PHÍ TẤT CẢ CLIENT                             │
│  $45.40 / $80.00 (56.7%)                                │
│  [████████████░░░░░░░░]                                 │
│                                                          │
│  Theo provider:                                          │
│  Anthropic  $32.20 (71%)   OpenAI  $13.20 (29%)         │
│                                                          │
│  PER CLIENT                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Bardinh Coffee              $18.40 / $50 (37%) 🟢   │  │
│  │ [████████░░░░░░░░░░░░░░░░]           [Xem chi tiết →]│  │
│  ├────────────────────────────────────────────────────┤  │
│  │ Cafe XYZ                    $27.00 / $30 (90%) 🟡   │  │
│  │ [██████████████████░░░░]             [Xem chi tiết →]│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  CẢNH BÁO                                                │
│  🟡 Cafe XYZ — đã dùng 90% ngân sách tháng này          │
│      Còn $3.00 · [Tăng ngân sách →]                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2. Chi tiết per-client (click "Xem chi tiết")

```
┌──────────────────────────────────────────────────────────┐
│  ← Chi phí AI     Bardinh Coffee — Chi tiết chi phí      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Ngân sách tổng/tháng: $50.00        [Sửa ngân sách]     │
│  Đã dùng: $18.40 (36.8%)                                 │
│                                                          │
│  BREAKDOWN THEO AGENT                                    │
│  D02 Image Design    $8.20 (45%) ← tốn nhất              │
│  D01 Caption Writer  $4.10 (22%)                         │
│  G01-G04 Analytics   $3.20 (17%)                         │
│  Khác (A01,B01-B03,E01,H01) $2.90 (16%)                 │
│                                                          │
│  BIỂU ĐỒ THEO NGÀY TRONG THÁNG                          │
│  [Chart đơn giản: cột theo ngày, thấy rõ ngày nào tốn   │
│   nhất — thường là T2 khi A01 khởi động cycle]           │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  PROVIDER & API KEY                                      │
│                                                          │
│  ANTHROPIC                              [🟢 Bật]          │
│  Key: sk-ant-***...4a2f              [Test] [Sửa key]    │
│                                                          │
│  OPENAI                                 [🟢 Bật]          │
│  Key: sk-***...9c1d                  [Test] [Sửa key]    │
│                                                          │
│  GOOGLE                                 [⚪ Chưa bật]     │
│  [+ Nhập API Key để bật]                                 │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  MODEL THEO AGENT                                        │
│                                                          │
│  A01 Orchestrator     [Claude Haiku ▼]                   │
│  B01-B03 Strategy     [Claude Sonnet ▼]                  │
│  D01 Caption          [Claude Sonnet ▼]                  │
│  D02 Image            [GPT-Image-2 ▼]                    │
│  E01 Evaluator        [Claude Haiku ▼]                   │
│  G01-G04 Analytics    [Claude Sonnet ▼]                  │
│  H01 Feedback         [Claude Haiku ▼]                   │
│                                                          │
│                                          [Lưu thay đổi]  │
└──────────────────────────────────────────────────────────┘
```

### Sửa ngân sách

```
Ngân sách hiện tại: $50.00/tháng
Ngân sách mới:      [65.00        ]
Có hiệu lực: Ngay lập tức (task tiếp theo trong ≤ 5 phút)

[Hủy]  [Lưu]
```

### Sửa API Key

```
API Key mới: [sk-ant-...                      ] 👁

[Test Connection]
✅ Key hợp lệ — Sonnet 4.6, Haiku 4.5 available

[Hủy]  [Lưu & Cập nhật]
```

Sau lưu: hiển thị dạng che `sk-ant-***...4 ký tự cuối`, không bao giờ hiện lại full key.

### Tắt 1 provider đang được dùng

```
⚠️ Tắt Anthropic sẽ ảnh hưởng 8 agent đang dùng model Anthropic.

Các agent sẽ fallback về: OpenAI

D01 Caption Writer: claude-sonnet-4-6 → gpt-4o (fallback)
A01, B01-B03, E01, H01: tương tự

[Hủy]  [Xác nhận tắt Anthropic]
```

### Model dropdown — logic hiển thị

Chỉ hiện model thuộc provider **đã Test Connection thành công**. Nếu provider chưa bật/key invalid → model đó **không xuất hiện** trong dropdown (không phải disable, mà ẩn hẳn để tránh chọn nhầm).

---

## 5. Acceptance Criteria

| ID | Tiêu chí |
|----|---------|
| IF-01 | Wizard bước 3 (ChromaDB) chạy lại lần 2 cho cùng client → hiện "⟳ Đã tồn tại", không tạo duplicate collection |
| IF-02 | Wizard bước 8: không Test Connection thành công cho bất kỳ provider nào → nút "Lưu & Tiếp tục" bị disable |
| IF-03 | Wizard bước 9 (Smoke Test): ChromaDB/Celery fail → block, không cho qua; Portal login fail → cho phép bỏ qua |
| IF-04 | Sau khi lưu API Key → không bao giờ hiển thị lại full key, chỉ hiện `sk-***...4 ký tự cuối` |
| IF-05 | Tắt provider đang được ≥ 1 agent dùng → hiện rõ danh sách agent bị ảnh hưởng + model fallback trước khi confirm |
| IF-06 | Sửa ngân sách → có hiệu lực cho task tiếp theo trong ≤ 5 phút |
| IF-07 | Client đạt 100% ngân sách → badge chuyển 🔴 ở cả Client List lẫn trang Chi phí AI tổng quan |
| IF-08 | Model dropdown chỉ hiện model thuộc provider đã test thành công — provider chưa bật hoàn toàn không xuất hiện trong dropdown |
| IF-09 | Đổi model 1 agent ở trang Chi phí (ngoài wizard) → có hiệu lực trong ≤ 5 phút, client khác không bị ảnh hưởng |

---

*PRD-CrewLab-InternalApp-Focused-v1.0 · Tháng 7/2026 · Owner: Thuận · Status: Draft — phạm vi thu hẹp theo định hướng hiện tại*
