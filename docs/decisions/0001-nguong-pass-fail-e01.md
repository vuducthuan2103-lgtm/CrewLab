# 0001 — Ngưỡng Pass/Fail và Logic Retry của Evaluator (E01)

**Ngày:** 2026-07-18
**Người quyết:** Trường / Thuận / Antigravity

## Bối cảnh
Trước đây có sự mâu thuẫn trong tài liệu PRD cũ về ngưỡng đánh giá của E01 (giữa Tầng 2 và Tầng 3). PRD v3.2 đã đồng bộ hóa kỹ thuật, tuy nhiên cần ghi nhận quyết định chính thức của người sáng lập để khóa tham số này lại trước khi code agent Evaluator.

## Quyết định
Thống nhất áp dụng ngưỡng đánh giá tách riêng cho Caption (thang điểm 10) và Visual (thang điểm 5) như sau:
1. **Pass (Đạt):** `Caption Score >= 7.0/10` AND `Visual Score >= 3.5/5`.
   - Hành động: Chuyển trạng thái sang `pending_content_approval` để chờ người duyệt.
2. **Retry (Thử lại):** `Caption Score` nằm trong khoảng `5.0 - 6.9` OR `Visual Score` nằm trong khoảng `2.5 - 3.4`.
   - Hành động: Gửi yêu cầu sửa đổi nhắm mục tiêu (D01 nếu caption lỗi, D02 nếu ảnh lỗi). Cho phép thử lại tối đa 3 lần.
3. **Hard Fail (Lỗi nghiêm trọng):** `Caption Score < 5.0` OR `Visual Score < 2.5`.
   - Hành động: Chuyển sang trạng thái thất bại nghiêm trọng, dừng FSM và gửi thông báo khẩn cấp cho Agency Admin.

## Vì sao
- Tách riêng hai tiêu chí giúp chạy tối ưu tài nguyên LLM (chỉ cần chạy lại agent bị lỗi, không cần generate lại toàn bộ nội dung bài viết).
- Việc đặt ngưỡng thử lại giúp tự động hóa khâu tinh chỉnh bài viết ở mức chấp nhận được trước khi hiển thị cho người duyệt cuối, giảm tải công việc cho admin.

## Ảnh hưởng
- Agent E01 và FSM kiểm soát trạng thái của Content Item sẽ được code theo logic phân nhánh này.
- Bảng database schema cần hỗ trợ ghi nhận điểm số chi tiết của caption và visual.
