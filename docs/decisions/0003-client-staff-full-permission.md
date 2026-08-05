# 0003 — Quyền hạn Đầy đủ cho Client Staff (Cào bằng Quyền Admin và Staff)

**Ngày:** 2026-07-26  
**Người quyết:** Founders (Thuận / Trường) / Antigravity  

## Bối cảnh
Trong PRD ban đầu (và mô tả cũ tại MVP-Scope v3.5), có sự phân định quyền hạn giữa `client_admin` và `client_staff` trên Client Portal (ví dụ: `client_staff` chỉ được xem, không thấy nút Duyệt bài ở bất kỳ đâu; chỉ `client_admin` mới có thao tác phê duyệt hoặc điều chỉnh chiến lược).

Tuy nhiên, đối với khách hàng mục tiêu của CrewLab là các doanh nghiệp vừa và nhỏ (F&B SME), quy trình nội bộ giữa chủ quán và nhân viên quản lý thường rất linh hoạt và gắn kết. Việc hạn chế quyền thao tác của nhân viên có thể gây nghẽn cổ chai hành chính (bottleneck) khi chủ quán vắng mặt hoặc bận rộn, làm chậm trễ quy trình duyệt nội dung AI (Gate 2, Gate S2, Gate S3) và nộp ảnh (Asset Request).

## Quyết định
1. **Đồng nhất tính năng và quyền hạn giữa `client_admin` và `client_staff` trên Client Portal:**
   - Cả hai vai trò `client_admin` và `client_staff` đều có **đầy đủ tính năng và thao tác như nhau**.
   - Cả hai role đều có thể bấm nút "Duyệt bài", "Sửa caption", "Từ chối bài", "Duyệt tất cả tuần" (Gate S3), "Xác nhận Pillar" (Gate S2), nộp ảnh (Asset Request), và điều chỉnh các cấu hình trong Settings (Brand Voice, Ngân sách, Thư viện ảnh).
2. **Giao diện không ẩn bất kỳ nút thao tác nào với `client_staff`:**
   - Bỏ quy tắc ẩn nút Duyệt bài đối với `client_staff`.
   - Giữ lại phân quyền ở mức hệ thống nếu cần trong tương lai, nhưng cho MVP hiện tại, trải nghiệm trên Portal là 100% giống nhau cho mọi thành viên thuộc client.

## Trạng thái
**Đã duyệt (Approved)** và áp dụng làm tiêu chuẩn cho `SPEC-0003` (Client Portal MVP).
