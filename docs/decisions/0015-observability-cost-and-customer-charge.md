# Decision 0015 — Full observability, actual cost và customer charge tách biệt

**Ngày:** 2026-08-15
**Trạng thái:** Đã chốt
**Tham chiếu:** Spec 0024 — Full LLM Observability, Usage, Cost & Budget

## Bối cảnh

MVP hiện chỉ ghi `task_logs` tối giản gồm model, token, latency, status và metadata cơ bản. Cách này đủ tra lỗi ban đầu nhưng chưa đủ để:

- đối soát chi phí thực theo client/agent/model;
- theo dõi phần trăm ngân sách bằng USD;
- phân biệt chi phí CrewLab phải chịu với số tiền khách hàng phải trả;
- chặn usage khi vượt budget;
- quản lý chính sách tính phí mà không làm thay đổi lịch sử;
- cung cấp số liệu đơn giản cho khách hàng và đầy đủ cho Agency Admin.

Chủ sở hữu đã xác nhận đưa observability/cost/budget đầy đủ vào đặc tả hiện hành nhưng không mở rộng sang agent hoặc module full-vision khác.

## Quyết định

### 1. Nguồn dữ liệu chính thức

- Postgres usage/cost ledger là nguồn chính thức cho actual cost, customer charge, quota, budget và đối soát.
- Langfuse dùng cho trace/debug prompt, response, latency, retry và correlation.
- Langfuse không phải nguồn duy nhất quyết định quota hoặc số tiền khách hàng phải trả. Langfuse lỗi không được làm mất ledger hoặc bỏ qua budget check.

### 2. Tách actual cost và customer charge

- `actual_cost_usd` là chi phí thực CrewLab phải chịu cho từng usage event.
- `customer_charge_usd` là số tiền khách hàng phải trả.
- Công thức nội bộ:

  `customer_charge_usd = actual_cost_usd × charge_multiplier_snapshot`

- Hệ số mặc định toàn hệ thống là `1.10`.
- Agency Admin được thay đổi hệ số mặc định và thiết lập override riêng theo client.
- Override theo client ưu tiên hơn default toàn hệ thống.
- Hệ số được phép bằng 0 hoặc số thập phân dương; giá trị âm bị cấm.

### 3. Không sửa ngược lịch sử

- Mỗi usage event snapshot hệ số và nguồn hệ số có hiệu lực khi event được nhận chạy.
- Thay đổi hệ số chỉ áp dụng cho usage mới, không tự động tính lại usage cũ.
- Sai lệch, refund hoặc correction được ghi bằng adjustment append-only, không sửa/xóa số gốc.
- Mọi thay đổi hệ số phải có người thực hiện, thời gian, giá trị cũ/mới, phạm vi và lý do.

### 4. Budget dùng customer charge

- Phần trăm budget cấp client và agent được tính từ `customer_charge_usd`, không từ `actual_cost_usd`.
- Từ 80% đến dưới 100%: warning và notify Agency Admin.
- Từ 100%: chặn billable task mới trước khi gọi provider.
- Chỉ cần cap agent hoặc cap tổng client hết là task bị chặn.
- Internal non-billable usage vẫn cộng actual cost nội bộ nhưng không cộng customer charge hoặc budget khách hàng.

### 5. Ranh giới Portal và Internal App

Portal chỉ được hiển thị:

- số tiền khách hàng phải trả trong kỳ;
- budget, số còn lại và phần trăm đã dùng;
- breakdown customer-facing theo agent/thời gian;
- trạng thái normal/warning/exceeded bằng ngôn ngữ khách hàng.

Portal tuyệt đối không được hiển thị hoặc nhắc đến:

- actual cost;
- charge multiplier;
- markup, margin hoặc chênh lệch nội bộ;
- công thức tính;
- giá provider;
- token, prompt/response, `eval_score` hoặc trace kỹ thuật.

Lệnh cấm áp dụng cho UI, API response, bootstrap payload, export, notification, lỗi và mọi endpoint client có thể truy cập.

Internal App hiển thị đầy đủ:

- actual cost và customer charge theo từng khách hàng;
- tổng agency và breakdown theo client/agent/provider/model/task/category;
- chênh lệch actual cost với customer charge;
- token/unit usage, latency, retry, status, error, eval score và trace correlation;
- hệ số default/override, lịch sử thay đổi và công cụ chỉnh sửa dành riêng cho Agency Admin.

### 6. Cost source và độ chính xác

- Ưu tiên cost provider báo cáo trực tiếp.
- Nếu provider không trả cost, dùng pricing snapshot có version tại thời điểm gọi.
- Retry/repair/fallback bị provider tính phí phải được ghi riêng và cộng đủ.
- Mock/test call có customer charge bằng 0 và không được trộn production.
- Missing cost phải ở trạng thái provisional/reconciliation, không âm thầm coi là final zero.

## Hệ quả

### Tích cực

- Budget, số tiền Portal và số liệu Internal App dùng cùng ledger nên đối soát được.
- CrewLab theo dõi được actual cost và hiệu quả tài chính từng khách hàng.
- Agency điều chỉnh chính sách theo thời gian hoặc client mà không phá lịch sử.
- Khách hàng có số liệu chi tiêu rõ ràng nhưng không thấy pricing policy nội bộ.
- Trace debug và financial ledger vận hành độc lập, giảm rủi ro mất quota khi trace lỗi.

### Chi phí / hạn chế

- Cần migration từ `task_logs` tối giản sang ledger/event model đầy đủ.
- Cần pricing snapshot và reconciliation cho provider thiếu cost.
- Cần schema/API tests nghiêm ngặt để không rò actual cost hoặc multiplier sang Portal.
- Đổi hệ số giữa tháng tạo nhiều snapshot trong cùng kỳ; Internal App phải giải thích được nhưng Portal chỉ hiển thị tổng customer-facing.

## Quan hệ với quyết định và scope cũ

- Decision 0004 về `litellm` abstraction vẫn giữ nguyên.
- Decision 0007 về provider/API key theo client vẫn giữ nguyên.
- Decision 0016 khôi phục Langfuse self-hosted làm trace layer; Postgres ledger trong Decision 0015 vẫn là nguồn chính thức cho cost/quota.
- Quyết định này thay thế cách hiểu rằng `task_logs` tối giản là đủ cho usage/cost/budget production.
- Observability tối giản trong MVP Scope §1d trở thành nền dữ liệu cần migrate, không còn là đích cuối.
- Quyết định này không cấp quyền triển khai Hindsight, ChromaDB, F01, G01-G04, Meta automation hoặc agent ngoài sáu agent MVP.

## Phương án đã loại

| Phương án | Lý do loại |
|---|---|
| Dùng Langfuse làm nguồn quota/invoice duy nhất | Trace outage/retention có thể làm sai quota và mất bằng chứng tài chính |
| Chỉ lưu token, tính cost lại bằng giá hiện tại | Giá model thay đổi làm lịch sử biến động |
| Đổi multiplier rồi tính lại toàn bộ tháng | Sửa ngược lịch sử, khó audit/đối soát |
| Hiển thị actual cost hoặc multiplier trên Portal | Vi phạm bảo mật chính sách thương mại |
| Tính budget theo actual cost nhưng Portal hiển thị customer charge | Số tiền và phần trăm không cùng cơ sở |
