# SPEC-0012: Portal Supabase Auth thay thế Mock Login

## Mục tiêu

Thay toàn bộ cơ chế đăng nhập giả lập trong `portal/` bằng Supabase Auth dùng email và mật khẩu thật. Người dùng chưa đăng nhập không thể truy cập các trang Portal.

## Phạm vi được duyệt

- Chỉ áp dụng cho `portal/`.
- Đăng nhập bằng email/mật khẩu Supabase; không có nút hoặc đường tắt Mock Login.
- Dùng session cookie Supabase để bảo vệ route ở phía server/middleware.
- Backend xác minh access token với Supabase Auth, không yêu cầu shared `SUPABASE_JWT_SECRET` cục bộ.
- Hỗ trợ quên mật khẩu bằng email của Supabase và đăng xuất.
- Hướng dẫn tạo tài khoản test thủ công trên Supabase Dashboard.

`internal-app/`, gán vai trò nghiệp vụ vào `app_metadata`, và ánh xạ user sang client là phạm vi riêng, không thuộc Spec này.

## Acceptance Criteria

- [ ] AC-AUTH-01: Không còn `crewlab_auth`, `handleMockLogin`, nút Mock Login hoặc cơ chế chuyển trang giả lập trong `portal/`.
- [ ] AC-AUTH-02: Form `/login` gọi Supabase `signInWithPassword`, hiển thị lỗi đăng nhập an toàn và chỉ chuyển vào Portal sau khi thành công.
- [ ] AC-AUTH-03: Người chưa đăng nhập truy cập bất kỳ route Portal nào ngoài `/login` và `/forgot-password` bị chuyển về `/login`; người đã đăng nhập truy cập `/login` được chuyển về `/`.
- [ ] AC-AUTH-04: `/forgot-password` gửi email đặt lại mật khẩu bằng Supabase, với redirect về Portal local.
- [ ] AC-AUTH-05: Đăng xuất xóa session Supabase và đưa người dùng về `/login`.
- [ ] AC-AUTH-06: Có hướng dẫn vận hành tạo tài khoản test thật, không lưu mật khẩu trong repository, và liên kết đến checklist kiểm thử nghiệp vụ.
- [ ] AC-AUTH-07: Portal build thành công.
