# 0016 — Khôi phục Langfuse làm trace layer cho observability

**Ngày:** 2026-08-15
**Người quyết:** Trường / Thuận

## Bối cảnh

MVP-Scope v3.4 §1d trước đây chủ động chọn observability tối giản: mỗi agent ghi một dòng vào bảng Postgres `task_logs` và chưa cần dựng Langfuse self-hosted. Quyết định đó phù hợp khi mục tiêu chỉ là biết task nào chạy, model nào được dùng, token/latency cơ bản và trạng thái thành công hay thất bại.

Spec 0024 mở rộng mục tiêu từ log tác vụ cơ bản sang full observability và cost control. Một bảng Postgres phẳng không còn đủ để làm tốt các nhu cầu mới:

- correlation một workflow với nhiều model call, retry, repair, fallback và evaluator attempt;
- xem chuỗi prompt/response theo trace để debug output sai;
- liên kết span cha/con và timing giữa các bước thay vì chỉ có từng dòng rời rạc;
- áp dụng redaction pipeline trước khi lưu hoặc hiển thị prompt/response;
- quản lý retention riêng cho raw trace payload mà không ảnh hưởng financial ledger;
- điều tra lỗi đa client mà không biến bảng cost/quota thành nơi chứa payload debug lớn và nhạy cảm.

Việc tự xây lại các khả năng trên trong `task_logs` sẽ làm schema phình lớn, trộn dữ liệu tài chính với dữ liệu debug, và tạo một trace system tự chế khó bảo trì.

## Quyết định

Khôi phục **Langfuse self-hosted** làm trace layer chính thức cho model-call observability.

- Langfuse lưu trace/span phục vụ correlation, prompt/response debug, latency, retry và evaluation metadata.
- Postgres usage/cost ledger vẫn là nguồn chính thức duy nhất cho actual cost, customer charge, quota, budget và reconciliation, đúng Decision 0015 mục 1.
- Mỗi usage event trong Postgres giữ correlation ID tới Langfuse; Langfuse không thay thế ledger.
- Trace delivery phải fail-soft: Langfuse lỗi không được làm mất usage/cost event hoặc cho phép bỏ qua budget check.
- Prompt/response phải qua redaction trước khi gửi sang Langfuse; API key, authorization header và credential material không bao giờ được trace.
- Portal không có quyền truy cập Langfuse hoặc bất kỳ trace payload nào. Chỉ Agency Admin được mở trace từ Internal App.

## Vì sao

Langfuse cung cấp sẵn mô hình trace/span, correlation, prompt/output inspection, evaluation metadata và retention-oriented observability phù hợp hơn việc mở rộng một bảng Postgres phẳng thành trace engine tự chế.

Các phương án đã cân nhắc:

| Phương án | Kết luận |
|---|---|
| Chỉ tiếp tục mở rộng `task_logs` | Loại: trộn workflow log, financial ledger và raw debug payload; correlation/redaction/retention khó làm đúng |
| Dùng Langfuse làm cả trace lẫn cost/quota source | Loại: trace outage hoặc retention change có thể làm sai quota và mất bằng chứng tài chính |
| Langfuse Cloud | Chưa chọn: tăng chi phí định kỳ và đưa prompt/response ra dịch vụ bên ngoài; self-hosted phù hợp quyền kiểm soát dữ liệu hiện tại |
| Langfuse self-hosted + Postgres ledger | Chọn: tách đúng trace concern khỏi financial source of truth |

## Ảnh hưởng

- `docs/prd/CrewLab-MVP-Scope-v3.5.md` §1d phải trỏ tới ADR này và không còn mô tả “không cần Langfuse Docker đầy đủ” như quyết định hiện hành.
- Spec 0024e chịu trách nhiệm Langfuse integration, redaction, trace security, retention và reconciliation; Spec 0024a chịu trách nhiệm canonical usage/cost ledger.
- Decision 0015 phải reference ADR này để làm rõ quan hệ Langfuse ↔ Postgres ledger.
- `task_logs` không còn là LLM usage/cost source; vai trò transition và schema mapping được chốt ở Spec 0024a.
- Internal App được phép link sang trace Langfuse sau khi Agency Admin authorization và tenant filter đã pass.

### Chi phí hạ tầng và staging

Langfuse self-hosted thêm một service/container set và làm tăng RAM, CPU, disk I/O, storage và công vận hành so với `task_logs` thuần Postgres. Đây là trade-off có chủ đích nhưng phải được kiểm soát vì staging hiện đang cân nhắc các máy tiết kiệm như Oracle Free hoặc Hetzner CAX11.

- Không được mặc định Langfuse sẽ vừa tài nguyên còn dư của staging.
- Trước khi bật lâu dài, plan 0024e phải chạy resource spike trên đúng shape staging được chọn, đo baseline và peak RAM/CPU/disk khi backend, Celery, Redis và Langfuse cùng chạy.
- Nếu Oracle Free/CAX11 không còn headroom an toàn, lựa chọn ưu tiên là chỉ bật Langfuse theo profile staging có giới hạn retention/concurrency hoặc nâng staging; không được làm backend/Celery mất ổn định để giữ Langfuse.
- Production sizing phải được quyết định từ số đo staging, không sao chép giả định tài nguyên của PRD full-stack CAX31.
- ADR này phê duyệt kiến trúc, chưa phê duyệt cài đặt hay pull image; bước triển khai phải tuân thủ quy tắc Docker data-root trên ổ D ở local và plan hạ tầng riêng trên VPS.
