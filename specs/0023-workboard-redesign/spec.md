# Spec 0023: Work Board Redesign, Deduplication & Layout Alignment

## 1. Overview
Nâng cấp và chuẩn hóa giao diện Bảng công việc (Work Board) trong Portal theo đúng ngôn ngữ thiết kế tối giản, đồng bộ typography Inter và tối ưu hóa trải nghiệm khách hàng (Client HITL).

## 2. Requirements & Scope
- **Loại bỏ phân nhóm bàn (Desks Swimlanes)**: Chuyển sang bố cục 4 cột Kanban thống nhất (`Chờ thực hiện`, `Đang xử lý`, `Chờ bạn duyệt`, `Hoàn thành`).
- **Thanh tổng quan 6 AI Agents**: Hiển thị riêng biệt 6 agent (A01, B02, B03, D01, D02, E01) kèm chỉ số quota token và modal xem chi tiết Model/Quota/Task.
- **Khử trùng lặp & Chuyển đổi ngôn ngữ công việc (Deduplication & Humanization)**:
  - Ẩn toàn bộ log kỹ thuật ngầm (`worker_recovery`, heartbeat).
  - Thể hiện công việc thực tế theo chu kỳ tuần (B02 Pillar, B03 Plan, và từng bài viết cụ thể với Agent phụ trách, giờ đăng dự kiến, nhãn trụ cột).
- **Subtask Steps Modal**: Bấm vào bất kỳ thẻ nào sẽ mở modal tiến trình các bước nhỏ thực tế, kèm xem trước caption/ảnh/điểm thẩm định.
- **Điều chỉnh Header & Bố cục Profile**:
  - Chuyển khối thông tin tài khoản, cài đặt và nút đăng xuất từ góc dưới Sidebar sang góc trên bên phải (Header) dưới dạng dropdown menu.
- **Đồng bộ Typography**: Thiết lập `Inter` làm font chính thống theo `DESIGN.md`, đồng bộ in đậm `font-bold` cho tất cả các tiêu đề cột Kanban.

## 3. Acceptance Criteria
- [x] **AC1**: Bảng Kanban 4 cột rõ ràng, hiển thị đúng số lượng đầu việc marketing mà không có log rác hệ thống.
- [x] **AC2**: Thẻ công việc có đầy đủ mốc thời gian thực tế, thời lượng, nhãn trụ cột và kênh đăng (FB/IG).
- [x] **AC3**: Thanh 6 Agent phía trên hỗ trợ click-to-filter và mở modal chi tiết Model/Quota.
- [x] **AC4**: Modal chi tiết task hiển thị các bước thực thi (Subtasks Timeline) và cho phép thao tác duyệt/từ chối bài trực tiếp.
- [x] **AC5**: Nút Cài đặt và Đăng xuất chuyển lên dropdown ở Header góc trên bên phải; Sidebar bên trái được dọn sạch.
- [x] **AC6**: Typography toàn hệ thống đồng bộ chuẩn `Inter`, tiêu đề cả 4 cột Kanban đều in đậm đồng đều tuyệt đối.
- [x] **AC7**: `npm run lint` trên Portal vượt qua 0 lỗi.
