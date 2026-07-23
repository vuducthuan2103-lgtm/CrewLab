# Glossary — Thuật Ngữ CrewLab

Tài liệu này giải thích các thuật ngữ cốt lõi được sử dụng xuyên suốt hệ thống CrewLab để đảm bảo sự thống nhất giữa đội ngũ sáng lập (non-tech) và Antigravity.

---

## 1. Thuật ngữ Workflow & Trạng thái

### FSM (Finite State Machine)
- **Định nghĩa:** Máy trạng thái hữu hạn.
- **Ý nghĩa trong CrewLab:** Là mô hình quản lý vòng đời của một nội dung (Content Item) từ lúc lập kế hoạch, sinh bài, chấm điểm, đến lúc duyệt và đăng bài. Mỗi nội dung chỉ được ở một trạng thái duy nhất tại một thời điểm (ví dụ: `planned`, `evaluating`, `pending_content_approval`).

### HITL (Human-in-the-Loop)
- **Định nghĩa:** Tích hợp con người vào quy trình tự động.
- **Ý nghĩa trong CrewLab:** Hệ thống không tự động làm hết 100%. Luôn có những "Cổng" (Gate) bắt buộc phải có sự phê duyệt hoặc chỉnh sửa từ người dùng (Agency Admin hoặc Chủ quán) mới được đi tiếp.

### Gate (Cổng kiểm soát)
- **Định nghĩa:** Các chốt chặn HITL trong quy trình.
- **Ví dụ:** 
  - `Gate S2`: Duyệt Trụ nội dung (Pillar).
  - `Gate S3`: Duyệt Kế hoạch nội dung (Content Plan).
  - `Content Approval Gate`: Khách hàng hoặc Admin duyệt bài viết hoàn chỉnh (Caption + Ảnh) trước khi đăng.

### Cycle (Chu kỳ sản xuất)
- **Định nghĩa:** Một vòng tuần hoàn làm việc của hệ thống (thường tính theo tuần).
- **Ý nghĩa trong CrewLab:** Trong MVP, một chu kỳ gồm 2 giai đoạn: `strategy` (Lập chiến lược & Pillar/Plan) -> `content_production` (Viết bài & Chấm điểm/Duyệt) -> kết thúc bằng trạng thái `done`.

---

## 2. Thuật ngữ Kỹ thuật & AI

### Episodic Memory (Trí nhớ phân đoạn)
- **Định nghĩa:** Khả năng ghi nhớ và tái hiện lại các sự kiện/tương tác trong quá khứ.
- **Ý nghĩa trong CrewLab:** Lưu lại các lượt phê duyệt, nhận xét (feedback) hoặc chỉnh sửa của con người sau mỗi bài đăng. Trong MVP, trí nhớ này được lưu dưới dạng một bảng PostgreSQL đơn giản tên là `agent_memory`, giúp các agent học hỏi từ các chu kỳ trước.

### ADR (Architecture Decision Record)
- **Định nghĩa:** Hồ sơ ghi nhận các quyết định kiến trúc.
- **Ý nghĩa trong CrewLab:** Mỗi khi có thay đổi lớn về công nghệ hoặc luật nghiệp vụ (ví dụ: đổi ngưỡng pass/fail của E01, đổi cấu trúc bảng), team sẽ tạo 1 file nhỏ trong thư mục `docs/decisions/` để lưu lại lý do và nội dung quyết định.

### Ingest Pipeline
- **Định nghĩa:** Luồng tiếp nhận và xử lý dữ liệu đầu vào.
- **Ý nghĩa trong CrewLab:** Tải tài liệu dài (PDF hướng dẫn thương hiệu, menu quán) lên và phân tích tự động. (Tính năng này được **cắt bỏ** trong MVP để đơn giản hóa).

### RAG (Retrieval-Augmented Generation)
- **Định nghĩa:** Cơ chế truy xuất thông tin từ cơ sở dữ liệu tri thức bên ngoài để hỗ trợ LLM sinh câu trả lời chính xác hơn.
- **Ý nghĩa trong CrewLab:** Giúp agent tìm kiếm thông tin thương hiệu phù hợp từ kho tài liệu. (Tính năng này **chưa dùng** ở MVP, brand voice được định nghĩa qua form ngắn lưu trong Postgres).
