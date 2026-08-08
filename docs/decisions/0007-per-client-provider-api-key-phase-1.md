# Decision 0007 — Quản lý provider và API key theo từng client ở Phase 1

**Ngày:** 2026-08-03  
**Trạng thái:** Đã chốt

## Bối cảnh

Scope MVP trước đây dùng một bộ API key chung của Agency qua biến môi trường và để quản lý provider/key theo client ở Phase 6. Điều đó mâu thuẫn với luồng vận hành đã được founders xác nhận: Agency tư vấn provider khi onboarding, còn client chỉ tự chọn model/tier.

## Quyết định

Đưa quản lý provider và API key theo từng client lên **Phase 1**.

- Agency Admin chọn từ 1 đến tối đa 2 provider cho mỗi client lúc onboarding.
- Agency Admin thêm, thay hoặc tắt API key/provider của từng client trong Internal App.
- Mỗi API key được lưu an toàn, chỉ hiển thị dạng che và không bao giờ được trả về Portal hoặc nhật ký.
- Portal chỉ hiển thị model/tier thuộc các provider đang bật cho client. Client không thể đổi provider, thêm provider hay xem/sửa API key.
- Khi Admin tắt provider đang được agent sử dụng, hệ thống phải nêu rõ các agent bị ảnh hưởng và yêu cầu xác nhận trước khi áp dụng cấu hình mới.
- Cấu hình mới áp dụng từ task kế tiếp; thay đổi không làm gián đoạn task đang chạy.

## Hệ quả

- Thay thế quyết định Phase 1 dùng API key chung theo provider qua biến môi trường trong `AGENTS.md` và Spec 0006.
- Tính năng “LLM Provider & API Key Management đa client” không còn là hạng mục xây mới của Phase 6.
- Spec 0010 xác định acceptance criteria trước khi thay đổi schema, backend hoặc hai giao diện.
- Decision 0004 về việc dùng `litellm` và interface `call_llm()` vẫn giữ nguyên; chỉ nguồn credential/config provider thay đổi.
