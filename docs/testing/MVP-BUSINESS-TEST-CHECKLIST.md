# Checklist test nghiệp vụ CrewLab MVP

Checklist này dành cho test local sau khi restart máy. Chỉ test 6 agent MVP: A01, B02, B03, D01, D02, E01.

## 0. Khởi động hệ thống

- [ ] Mở Docker Desktop và chờ biểu tượng báo Docker đã sẵn sàng.
- [ ] Nhấp đúp `Start CrewLab.cmd` ở thư mục gốc dự án.
- [ ] Xác nhận cửa sổ báo Portal, Internal App, Backend API, Celery Worker và Celery Beat đều `[OK]`.
- [ ] Mở Portal tại `http://localhost:3000/login`.
- [ ] Mở Internal App tại `http://localhost:3001/login`.
- [ ] Nếu backend chạy ở `8001`, đây là hành vi dự kiến khi một tiến trình cũ đang giữ cổng `8000`.

## 1. Đăng nhập Internal App

- [ ] Dùng tài khoản Agency Admin trong `LOCAL-TEST-CREDENTIALS.md`.
- [ ] Trang danh sách client hiển thị `CrewLab Test Cafe`.
- [ ] Client ban đầu ở trạng thái chưa kích hoạt nếu chưa có provider hợp lệ.
- [ ] Tài khoản Portal không thể đăng nhập Internal App với quyền Agency Admin.

## 2. Cấu hình provider và API key

- [ ] Mở onboarding/client `CrewLab Test Cafe`.
- [ ] Nhập một API key thật của OpenAI hoặc Google; hoặc chọn Anthropic kèm OpenAI/Google để D02 có model ảnh hợp lệ.
- [ ] Bấm lưu/kiểm tra và xác nhận key hợp lệ trước khi bật provider.
- [ ] Sau khi lưu, giao diện chỉ còn dạng che key; không hiển thị lại toàn bộ key.
- [ ] Thử nhập key sai để xác nhận hệ thống báo lỗi và không ghi đè key đang hoạt động.
- [ ] Bật tối đa hai provider; thử bật provider thứ ba và xác nhận bị chặn.
- [ ] Kích hoạt client và xác nhận hệ thống tạo cấu hình cho đủ 6 agent.

## 3. Kiểm tra quyền của Portal

- [ ] Đăng xuất Internal App, sau đó đăng nhập Portal bằng tài khoản Client Admin trong `LOCAL-TEST-CREDENTIALS.md`.
- [ ] Mở `Cài đặt → Model & Ngân sách`.
- [ ] Không có ô nhập API key và không có nút đổi/bật/tắt provider.
- [ ] Mỗi agent chỉ thấy model thuộc provider mà Agency Admin đã bật.
- [ ] Chọn model/tier/ngân sách cho cả A01, B02, B03, D01, D02, E01 và lưu.
- [ ] Tải lại trang; các lựa chọn vẫn được giữ nguyên.

## 4. Chuẩn bị dữ liệu thật cho D02

- [ ] Vào thư viện tài sản của Portal và tải lên ít nhất một ảnh đồ uống/quán thật.
- [ ] Thêm mô tả/tag đủ rõ để D02 có thể chọn ảnh phù hợp.
- [ ] Giữ `allow_ai_images=false` cho bài test MVP chuẩn.
- [ ] Biết trước: nếu không có ảnh phù hợp, workflow có thể chuyển sang `waiting_asset`; đây là kết quả đúng, không phải worker bị treo.

## 5. Giao việc qua A01 và chạy workflow sáu agent thật

- [ ] Quay lại Portal, mở `Trò chuyện A01`, hỏi một câu làm rõ rồi giao yêu cầu cụ thể cho `CrewLab Test Cafe`.
- [ ] A01 lưu được lịch sử hội thoại, nhận việc và tạo cycle hiện tại nếu client chưa có cycle active; không xuất hiện lỗi `No active workflow cycle`.
- [ ] A01 giao content item đã nhận cho D01. Portal không chọn/gọi thẳng agent con vì Direct Assign chưa thuộc Phase 1.
- [ ] Kiểm tra weekly cycle riêng bằng lịch Celery Beat: A01 giao task B02 khi tới lịch client; Internal App không có `Chạy workflow test`.
- [ ] B02 tạo content pillars bằng model/key của client.
- [ ] Portal hiển thị bước duyệt pillars; thử chỉnh sửa rồi phê duyệt.
- [ ] B03 tạo content plan từ pillars đã duyệt.
- [ ] Portal hiển thị bước duyệt plan; phê duyệt để tiếp tục.
- [ ] D01 viết caption; D02 phân tích/chọn asset; E01 đánh giá chất lượng.
- [ ] Nếu E01 fail, xác nhận workflow retry đúng giới hạn rồi quay lại bước duyệt hoặc báo lỗi có thể hiểu được.
- [ ] Xác nhận task log ghi đúng agent/model nhưng không chứa API key.

## 6. Kiểm tra HITL và FSM

- [ ] Thử `Approve` một nội dung và xác nhận trạng thái thành `approved_ready_to_post`.
- [ ] Thử `Edit` một nội dung, lưu sửa đổi và kiểm tra nội dung mới được giữ.
- [ ] Thử `Reject` một nội dung và kiểm tra lý do được lưu.
- [ ] Với nội dung đã duyệt, bấm `Mark as posted` và xác nhận trạng thái thành `posted`.
- [ ] Không có nút đăng tự động lên Meta trong MVP.

## 7. Thay/khóa provider an toàn

- [ ] Trong Internal App, thay key của provider bằng key hợp lệ khác; chỉ key mới được dùng cho task tiếp theo.
- [ ] Yêu cầu tắt provider đang được agent sử dụng; hệ thống phải liệt kê agent bị ảnh hưởng.
- [ ] Hủy xác nhận và kiểm tra provider vẫn hoạt động.
- [ ] Xác nhận tắt; Portal không còn cho chọn model của provider đó và agent bị ảnh hưởng cần cấu hình thay thế.

## 8. Kiểm tra cô lập client

- [ ] Tạo client thứ hai trong Internal App nhưng không nhập key.
- [ ] Xác nhận client thứ hai không thể kích hoạt và không thấy key/mô hình riêng của `CrewLab Test Cafe`.
- [ ] Tài khoản Portal của `CrewLab Test Cafe` không đọc hoặc sửa được dữ liệu client thứ hai.

## 9. Kết thúc và ghi lỗi

- [ ] Ghi lại bước, ảnh chụp, thời gian và nội dung lỗi nếu có.
- [ ] Kiểm tra `.crewlab/logs` theo đúng tên dịch vụ khi lỗi liên quan worker/Beat/backend.
- [ ] Nhấp đúp `Stop CrewLab.cmd` khi muốn dừng các tiến trình local; Redis vẫn tiếp tục chạy trong Docker.

## Tiêu chí đạt vòng smoke test

Vòng test đạt khi: hai role đăng nhập đúng; provider/key được quản lý chỉ trong Internal App; Portal chỉ đổi model/tier/ngân sách; chat A01 hoạt động nhiều lượt và giao được item cho D01; weekly cycle đi qua B02 → B03 → D01/D02 → E01 → HITL; không lộ key; và có thể đánh dấu nội dung đã đăng thủ công.
