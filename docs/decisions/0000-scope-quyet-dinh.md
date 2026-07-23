# 0000 — Chốt Phạm vi Xây dựng Phase 1 (MVP)

**Ngày:** 2026-07-18
**Người quyết:** Trường / Thuận / Antigravity

## Bối cảnh
Dự án có hai tài liệu đặc tả phạm vi chính:
1. `docs/prd/PRD-Master-v3.2.md` (Tài liệu tổng thể, 12 agents, ChromaDB RAG, Hindsight Memory, Meta API auto-publish, Analytics).
2. `docs/prd/MVP-Scope-v3.md` (Tài liệu MVP rút gọn, 5 agents, Postgres Memory, không ChromaDB RAG, không Meta API).

Để đảm bảo tiến độ triển khai nhanh chóng (3.5 - 4 tháng) và tránh rủi ro kỹ thuật cho đội ngũ sáng lập (non-tech), cần chốt cứng phạm vi của Phase 1.

## Quyết định
Phase 1 của dự án CrewLab sẽ xây dựng **chặt chẽ và duy nhất** theo phạm vi được mô tả trong [MVP-Scope-v3.md](file:///d:/docs/prd/MVP-Scope-v3.md). 
Tài liệu [PRD-Master-v3.2.md](file:///d:/docs/prd/PRD-Master-v3.2.md) chỉ mang tính chất tham khảo tầm nhìn dài hạn cho các Phase tiếp theo, tuyệt đối không dùng để lấy yêu cầu code trực tiếp cho Phase 1.

## Vì sao
- Giảm thiểu rủi ro tích hợp API của bên thứ ba (Meta Graph API) trong giai đoạn sơ khởi.
- Đơn giản hóa kiến trúc lưu trữ dữ liệu (sử dụng PostgreSQL thuần thay vì ChromaDB cho brand voice và memory).
- Tập trung vào tính năng cốt lõi: 5 agents tạo và đánh giá nội dung với con người ở trung tâm (HITL).

## Ảnh hưởng
- Mọi prompt phát triển, file `spec.md` và mã nguồn trong Phase 1 phải tuân thủ nghiêm ngặt giới hạn 5 agents.
- Antigravity sẽ dừng lại và hỏi ý kiến người dùng nếu có bất kỳ yêu cầu nào vi phạm nguyên tắc này.
