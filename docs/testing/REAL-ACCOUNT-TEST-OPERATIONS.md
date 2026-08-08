# Hướng dẫn vận hành test bằng tài khoản Supabase thật

Tài liệu này dùng cho local và staging CrewLab. Không ghi mật khẩu,
publishable key, secret key hoặc API key LLM vào Git, ảnh chụp màn hình hay chat.

## 1. Chuẩn bị

1. Khởi động Docker Desktop.
2. Chạy `Start CrewLab.cmd` tại thư mục gốc dự án.
3. Mở Internal App tại `http://localhost:3001/login` và Portal tại
   `http://localhost:3000/login`.
4. Đảm bảo cả hai frontend đang dùng Supabase staging và có publishable key.
   Tuyệt đối không đặt `sb_secret_...` ở frontend.

## 2. Onboard client và tạo tài khoản Portal

1. Đăng nhập Internal App bằng Agency Admin thật.
2. Vào **Onboarding & Provider**, nhập thông tin client.
3. Nhập và kiểm tra API key cho tối đa hai provider, bật provider hợp lệ, rồi
   kích hoạt client.
4. Ở bước **Tài khoản Portal**, nhập email thật của khách hoặc email test do
   đội sở hữu.
5. Đặt mật khẩu tạm thời từ 12 ký tự trở lên, gồm chữ hoa, chữ thường và số;
   nhập lại để xác nhận.
6. Chọn **Tạo tài khoản Portal**. CrewLab tạo user thật trong Supabase Auth và
   gắn cứng quyền `client_admin` với đúng client đó.
7. Gửi email và mật khẩu tạm thời cho khách qua kênh riêng. Ngay sau khi đăng
   nhập, khách có thể dùng **Quên mật khẩu** ở Portal để tự đổi mật khẩu.

Mật khẩu không được lưu, không được hiển thị lại và không xuất hiện trong audit
log. Nếu cần tạo lại tài khoản, hãy dùng quy trình quản trị riêng; Phase 1 chỉ
cho một Portal Admin đầu tiên trên mỗi client.

## 3. Kiểm tra đăng nhập Portal

1. Mở `http://localhost:3000/login` ở cửa sổ ẩn danh hoặc đăng xuất Agency.
2. Đăng nhập bằng email và mật khẩu vừa tạo ở bước onboarding.
3. Xác nhận Portal chỉ hiển thị dữ liệu của client vừa onboard.
4. Dùng **Quên mật khẩu** để kiểm tra luồng khách tự quản lý mật khẩu.

## 4. Vận hành workflow thật

1. Tại Portal, chỉnh model/tier/ngân sách cho sáu agent. Không thể đổi provider
   hoặc xem API key.
2. Tải ảnh thật lên Asset Library.
3. Tại Portal, mở **Trò chuyện A01**, trao đổi rồi giao một yêu cầu nội dung đủ rõ. Xác nhận A01 nhận việc mà không báo lỗi khi client chưa có cycle active.
4. Xác nhận A01 tạo item và điều phối D01 → D02 → E01 → HITL → **Đánh dấu đã đăng**.
5. Luồng weekly chuẩn vẫn được kiểm tra riêng bằng Celery Beat theo lịch client; Internal App không có nút workflow-test.

## 5. Checklist nghiệm thu

Thực hiện đầy đủ [MVP Business Test Checklist](MVP-BUSINESS-TEST-CHECKLIST.md)
và ghi lại kết quả, lỗi, cùng thời điểm xảy ra. Không đính kèm thông tin bí mật
vào bằng chứng test.

## 6. Khi có lỗi

- Không tạo được Portal account: kiểm tra client đã kích hoạt và email chưa được
  dùng cho user Supabase khác.
- Không đăng nhập được: xác nhận đang vào đúng Portal staging/local và dùng
  email/mật khẩu vừa tạo; thử **Quên mật khẩu** nếu cần.
- Workflow không chạy: kiểm tra Redis, Celery Worker/Beat, client active và ít
  nhất một provider hợp lệ.
- A01 chat nhận việc nhưng báo đang chờ xử lý: kiểm tra Redis/Celery Worker; không dùng nút chạy lại vì Phase 1 không có manual retry.
- Không kết nối được database: kiểm tra trạng thái Supabase/MCP; không dán
  connection string có mật khẩu vào chat hoặc Git.
