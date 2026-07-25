# CrewLab — Phase Roadmap Toàn Dự Án

**v1.4** | 25/07/2026 (cập nhật) | Đọc cùng: [PRD-CrewLab.md](file:///d:/CrewLab/docs/prd/PRD-CrewLab.md) (full vision), [MVP-Scope-v3.5.md](file:///d:/CrewLab/docs/prd/CrewLab-MVP-Scope-v3.5.md) (điểm khởi đầu thật + trình tự build Phase 1)

**Changelog v1 → v1.1:** (1) Bổ sung số liệu đề xuất cho các ô \[X] ở Tiêu chí Pass Phase 2 — đánh dấu 🔶 vì cần Trường xác nhận, chưa phải số chốt cuối. (2) Dời "Dead Letter Queue thật" từ Phase 6 → Phase 3 (lý do: automation nền không người canh xuất hiện từ Phase 3, không phải Phase 6). (3) Thêm mốc bắt đầu nộp Meta App Review song song từ Phase 2. (4) Thêm công thức định lượng cho nhánh rẽ Phase 2→Phase 6. Không có thay đổi cấu trúc phase nào khác.

**Changelog v1.1 → v1.2:** Đồng bộ số đếm agent ở Phase 1 theo `CrewLab-MVP-Scope.md` v3.3 — A01 Orchestrator giờ được tính là **agent thứ 6** của MVP (trước đây ghi tách "5 agent + Orchestrator", gây hiểu lầm A01 là phần phụ nhẹ trong khi nó được build đúng chất lượng contract đầy đủ). Đây chỉ là đổi cách đếm/gọi tên cho nhất quán giữa 2 tài liệu — **không đổi** scope, nội dung build, hay Tiêu chí Pass nào của Phase 1. Không có thay đổi cấu trúc phase nào khác.

**Changelog v1.2 → v1.3:** (1) Bỏ tham chiếu "CrewLab-Sprint-Plan-v4" ở Phase 1 — `MVP-Scope.md` v3.4 đã bỏ chia sprint (xem MVP-Scope §6), team quản lý theo trình tự build phụ thuộc, không theo sprint. (2) Thêm ghi chú minh bạch đăng tay ở Phase 1 — xác nhận Bardinh Coffee là quán nhà Trường nên "No manual fallback rule" của PRD không áp dụng ở giai đoạn này, kèm mốc cần áp dụng lại nghiêm túc (Phase 6, khi có khách trả phí thật). (3) Thêm tiêu chí định lượng còn để trống số cho Tiêu chí Pass Phase 1 (chất lượng output) và Phase 6 (chi phí biên/client) — trước đây chỉ ghi định tính ("đủ dùng thật", "thấp"), giờ có khung số cụ thể để team tự điền, tránh rubber-stamp hoặc mơ hồ không ai định nghĩa được khi cần dùng làm gate thật.

**Changelog v1.3 → v1.4 (đồng bộ MVP-Scope v3.5 + PRD-CrewLab v1.2):** (1) Cập nhật tham chiếu file: `PRD-Master-v3.2.md` → `PRD-CrewLab.md` (PRD mới gộp lại), `MVP-Scope-v3.4.md` → `MVP-Scope-v3.5.md`. (2) Phase 1 "Xây" — cập nhật mô tả Client Portal từ sơ sài ("ẩn điểm E01") thành chi tiết đồng bộ với MVP-Scope v3.5 §2a–2k: Kanban Dashboard (3 swimlane), Content Hub (3 tab), Content Approval (Gate 2), Asset Request, Settings (4 tab), Notification Center, nút "Đánh dấu đã đăng", placeholder pages (Báo cáo, Campaign tab). (3) Ghi rõ bỏ Pixel Office / virtual office khỏi Phase 1 (không build). (4) Không thay đổi cấu trúc phase, Tiêu chí Pass, hay scope của Phase 2–7.

**Cách đọc file này:** Đây là bức tranh toàn cảnh — MVP (6 agent) chỉ là Phase 1. PRD gốc (full vision) có đủ 12 agent + auto-publish + analytics, nhưng tụi tao chủ động đi từng bước, validate xong mới build tiếp bước sau. File này là **nguồn canonical cho câu hỏi "phase nào build gì"** — PRD-CrewLab §8 đã cập nhật để trỏ ngược về đây, không còn mâu thuẫn kiểu "Phase 1 phải đủ 12 agent" như PRD cũ. Mỗi phase dưới đây trả lời 4 câu: **Xây gì / Cải thiện gì / Vận hành gì / Tiêu chí Pass**.

\---

## PHASE 1 — MVP Build \& Pilot Rút Gọn

*(Trình tự build xem `MVP-Scope-v3.5.md` §6 — không chia sprint, xem changelog v1.3)*

**Xây:** State Architecture rút gọn (C1/C6/C7, agent\_memory thay Hindsight) · 6 agent (B02, B03, D01, D02, E01, và A01 Orchestrator — kiến trúc đầy đủ, 10 trigger active theo MVP-Scope v3.5 §1a) · FSM + retry loop · Client Portal (Kanban Dashboard 3 swimlane, Content Hub 3 tab, Content Approval Gate 2 ẩn điểm E01, Asset Request, Settings 4 tab, Notification Center, nút "Đánh dấu đã đăng", placeholder pages — chi tiết xem MVP-Scope v3.5 §2a–2k; không có Pixel Office/virtual office, không Direct Assign, không Telegram bot) · Internal App cơ bản (task\_logs + nút Chạy lại)

**Cải thiện:** N/A (đây là lần xây đầu, chưa có gì để cải thiện)

**Vận hành:** Đăng tay lên FB/IG cho Bardinh Coffee, Trường/Thuận approve thủ công qua Portal.

**Lưu ý minh bạch với khách (đã xác nhận, không phải vấn đề ở MVP):** Bardinh Coffee là quán của Trường, không phải khách trả phí độc lập — nên "No manual fallback rule" của PRD gốc (không giấu thao tác tay như thể đó là automation đã promise) không áp dụng ở giai đoạn này; đăng tay hay không tuỳ Trường, miễn output đủ tốt để muốn đăng. Quy tắc này **cần áp dụng lại nghiêm túc từ Phase 6**, khi có khách trả phí thật không phải người nhà — lúc đó nếu bước nào vẫn còn thao tác tay phía sau, phải nói rõ với khách đó là giai đoạn chưa auto-publish, hoặc chưa promise bước đó.

**Tiêu chí Pass (điều kiện để mở Phase 2):**

* Chạy ≥2 chu kỳ tuần liên tục không cần can thiệp tay ngoài approve
* `agent\_memory` Recall verify thật — cycle 2 dùng được bài học cycle 1
* Không crash worker/task treo >24h

Chất lượng output đủ dùng thật, đo bằng: lấy 10 bài gần nhất hệ thống generate (caption + ảnh) → tối thiểu 80% publish được ngay, không cần Trường/Thuận sửa tay caption hoặc đổi ảnh (chỉnh giờ đăng không tính là "sửa").

\---

## PHASE 2 — Vận Hành Pilot Dài Hạn \& Tinh Chỉnh

*(Không xây tính năng mới — đây là giai đoạn "sống thật" với hệ thống)*

**Xây:** Không xây mới. Chỉ vá lỗi phát sinh khi chạy thật.

**Cải thiện:**

* Tinh chỉnh prompt B02/B03/D01/D02 dựa trên feedback thật từ Bardinh Coffee
* Tinh chỉnh lại ngưỡng E01 (7.0/3.5) nếu thấy pass/fail không khớp đánh giá thật của người
* Rút gọn/mở rộng tag hệ thống Media Library nếu tag filter không đủ tìm đúng ảnh

**Vận hành:**

* Đăng tay liên tục, theo dõi KR rút gọn (không có publish/analytics tự động nên bỏ phần đó khỏi KR gốc PRD):

  * KR1-rút gọn: full loop generate → approve → đăng tay chạy liên tục **4 tuần** không lỗi
  * KR2: % content approve ngay lần đầu (không cần reject/retry) ≥ **80%**
  * KR4-rút gọn: thời gian generate → approve ≤ **1 giờ**
* Bắt đầu nộp **Meta Business Verification + App Review song song** ngay từ đầu Phase 2 — việc này chạy async, không phụ thuộc kết quả pass/fail của Phase 2, và lead time review của Meta thường kéo dài vài tuần ngoài kiểm soát của team. Nộp sớm để không mất thêm thời gian chờ thuần túy ở đầu Phase 3.

**Tiêu chí Pass (điều kiện để mở Phase 3 — build Meta Integration):**

* Đạt đủ KR rút gọn ở trên trong ít nhất **4 tuần liên tục**



\---

## PHASE 3 — Meta Integration (F01 Publisher)

*(Khôi phục phần đã cắt ở MVP v3 — OAuth, auto-publish)*

**Xây:**

* F01 Meta Publisher — auto-publish thay nút "Đánh dấu đã đăng"
* OAuth Connect Flow (setup, khác F01 publish) — theo NFR-T4-03: hoàn thành ≤5 phút
* Token storage \& refresh (Supabase Vault)
* Webhook signature verification (bảo mật, chưa cần xử lý nội dung webhook — đó là Phase 4)
* **Dead Letter Queue (DLQ) thật** (dời từ Phase 6 lên đây) — lý do: từ Phase 3 trở đi hệ thống bắt đầu chạy automation nền không có người canh trực tiếp (F01 tự publish theo lịch, không phải người bấm tay như Phase 1-2). Log lỗi đơn giản không đủ an toàn khi lỗi có thể xảy ra âm thầm (token hết hạn, rate limit, page bị khoá) — rủi ro này xuất hiện sớm hơn nhiều so với vấn đề nhiều-client ở Phase 6

**Cải thiện:**

* FSM thêm lại state `publishing` (đã bỏ ở MVP v3, giờ khôi phục)
* `workflow\_cycles` thêm lại phase `publishing`

**Vận hành:**

* Theo dõi rate limit Meta Graph API
* Xử lý lỗi publish (token hết hạn, page bị khoá, content vi phạm policy Meta...)

**Tiêu chí Pass:**

* KR3: OAuth connect flow ≤5 phút, đo thật không phải ước lượng
* ≥\[X]% content publish thành công không cần can thiệp tay
* KR4 đầy đủ: generate → publish (qua approval) ≤ \[X] giờ

\---

## PHASE 4 — Analytics Loop (G01-G04)

*(Đóng vòng lặp full-automation đúng như KR1 gốc trong PRD)*

**Xây:**

* G01 Meta Data Collector \& Cleaning
* G02 Descriptive Analysis
* G03 Diagnostic Analysis
* G04 Recommendation
* Analytics Acknowledgment Gate (Gate Family 3) trên Portal

**Cải thiện:**

* P01 Feedback Learning Pipeline — nối G04 Recommendation ngược vào input của B02/B03 (đây là chỗ hệ thống thật sự "tự học" từ số liệu, không chỉ từ feedback người)
* `agent\_memory` có thể cần nâng cấp lên Hindsight thật nếu volume dữ liệu tăng (xem Phase 7)

**Vận hành:**

* Theo dõi chi phí LLM cho phân tích (G02-G04 chạy định kỳ, tốn budget riêng)
* Client bắt đầu thấy Analytics Report trên Portal — cần theo dõi phản hồi client có hiểu/tin số liệu không

**Tiêu chí Pass:**

* **KR1 đầy đủ đạt được**: full loop generate → approve → publish → phân tích → learning chạy liên tục \[X] tuần, không thao tác tay ngoài approve — đây chính là mục tiêu gốc PRD Phase 1, giờ mới thật sự hoàn thành
* G04 Recommendation đo được có cải thiện chất lượng content ở cycle sau không (so sánh % approve-first-try trước/sau Phase 4)

\---

## PHASE 5 — Strategy Layer Đầy Đủ (B01 IMC Planner + RAG thật)

**Xây:**

* B01 IMC Planner + Gate S1 (Strategy Gate cho IMC Plan)
* Campaign/Event Branching + Campaign Template Schema
* C2 ChromaDB RAG thật (khôi phục — brand voice từ form ngắn B2 chuyển sang tài liệu dài + semantic search)
* C5 Ingest Pipeline (Docling + Chonkie) — cho phép client upload tài liệu dài (brand guideline PDF...)

**Cải thiện:**

* Strategy Co-pilot Editor (S1/S2/S3) trên Portal — client tự chỉnh chiến lược thay vì chỉ approve
* C7 Media Library nâng semantic search thay tag filter thuần (nếu tag filter bắt đầu không đủ khi thư viện ảnh lớn)

**Vận hành:**

* Client tự quản lý campaign/event qua Portal (Direct Assign Task UI - T20)
* Theo dõi chất lượng IMC Plan — đây là tầng chiến lược cao nhất, sai ở đây ảnh hưởng toàn bộ content phía dưới

**Tiêu chí Pass:**

* B01 tạo IMC Plan đúng brand, qua Gate S1 được client approve không cần sửa nhiều
* RAG (C2) trả kết quả đúng ngữ cảnh brand voice khi test thử với tài liệu dài thật

\---

## PHASE 6 — Scale Multi-Client

*(= PRD Section 8 Phase 2: "Mở rộng sau pilot", ưu tiên SME F\&B cùng ngành trước khi đa dạng ngành khác)*

**Xây:**

* LLM Provider \& API Key Management đa client
* LLM Usage \& Budget Dashboard (theo dõi chi phí per-client, tránh 1 client đốt budget agency)
* Telegram Bot Pairing — kênh thông báo quen thuộc cho chủ quán không rành tech
* *(DLQ thật đã build ở Phase 3 — xem ghi chú ở đó, không lặp lại ở đây. Phase 6 chỉ cần đảm bảo DLQ chịu tải tốt khi nhiều client chạy song song, không phải xây mới từ đầu)*

**Cải thiện:**

* Onboarding flow cho Agency Admin — phải nhanh hơn nhiều so với lúc chỉ có 1 client
* Notification Center (đủ kênh: Portal + Telegram)

**Vận hành:**

* Onboard thêm 2-5 SME F\&B **cùng ngành** trước (không đa dạng ngành ngay — theo assumption "validate trước khi scale")
* Theo dõi ngưỡng hạ tầng: Supabase free tier đủ 1-10 client, ChromaDB local đủ \~300 client trước khi cần managed service

**Tiêu chí Pass:**

* ≥3-5 client chạy song song ổn định cùng lúc, không cần tăng thêm người vận hành (Trường + Thuận vẫn quản được)
* Chi phí vận hành biên khi thêm 1 client mới ≤ 🔶\*\*\[Y]\*\* USD/tháng (tính LLM cost + hạ tầng chia đều; có thể cộng thêm giờ Agency Admin quy đổi ra tiền nếu muốn khắt khe hơn) — đúng value prop margin cao trong PRD Objective. *(Y để trống — team quyết định trước khi triển khai phase.)*

\---

## PHASE 7 — Đa Dạng Hoá Ngành \& Hindsight Thật

*(Chỉ làm khi Phase 6 đã ổn định, không có deadline cứng)*

**Xây:**

* Hindsight episodic memory thật, thay hẳn bảng `agent\_memory` Postgres đơn giản (nếu lúc này dữ liệu đủ lớn để cần retrieval thông minh hơn "5 bản ghi gần nhất")
* Mở rộng ngoài F\&B sang ngành SME dịch vụ khác (theo gợi ý ở PRD Market Segment)

**Cải thiện:** Tuỳ phát sinh thực tế lúc scale, chưa cố định được trước.

**Vận hành:** Chuyển dần từ "agency 2 người tự vận hành" sang có quy trình chuẩn hoá hơn nếu số client tăng đáng kể.

**Tiêu chí Pass:** Không có AC kỹ thuật cứng — đây là quyết định kinh doanh, dựa vào kết quả thật của Phase 6.

\---

## Post-MVP Defer (đã note sẵn trong PRD, nhắc lại để không quên khi lên roadmap)

* Webhook comment moderation / page review
* Screenshot xác nhận bài đăng thật (thay permalink)
* Tách lại 5-surface architecture — chỉ nếu phát sinh lý do kỹ thuật rõ ràng, mặc định giữ 3-surface

\---

## Tóm tắt trình tự

```
Phase 1 (Build MVP)  →  Phase 2 (Vận hành pilot, tinh chỉnh)
        ↓ đạt KR rút gọn
Phase 3 (Meta auto-publish)  →  Phase 4 (Analytics + learning loop thật — đạt KR1 gốc PRD)
        ↓ ổn định
Phase 5 (Strategy layer B01 + RAG thật)
        ↓ ổn định
Phase 6 (Scale nhiều client)  →  Phase 7 (Đa dạng ngành, tuỳ chọn)
```

Mỗi mũi tên = phải đạt Tiêu chí Pass của phase trước mới mở phase sau. Không nhảy cóc — đúng nguyên tắc "validate trước khi scale" đã chốt trong PRD Assumptions.

