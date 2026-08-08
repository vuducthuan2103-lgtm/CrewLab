# Spec 0013 — Tài khoản Portal trong onboarding client

## Mục tiêu

Khi Agency Admin onboarding một client, họ phải tạo được tài khoản Portal đầu
tiên cho client đó. Tài khoản này đăng nhập Portal bằng email và mật khẩu, và
chỉ có quyền với đúng client đã onboarding.

## Flow Phase 1

1. Agency Admin tạo client, cấu hình provider và kích hoạt client như hiện tại.
2. Bước cuối **Tài khoản Portal** yêu cầu nhập email khách hàng, mật khẩu tạm
   thời và xác nhận mật khẩu.
3. Backend dùng Supabase Auth Admin API để tạo user với `app_metadata.role =
   client_admin` và `app_metadata.client_id = <client-id>`.
4. Mật khẩu chỉ được gửi một lần tới Supabase Auth; không lưu vào bảng CrewLab,
   audit log, API response hoặc hiển thị lại sau khi tạo.
5. Agency Admin gửi mật khẩu tạm thời cho khách qua kênh riêng. Khách có thể
   dùng “Quên mật khẩu” trong Portal để tự đặt lại mật khẩu.

## Phạm vi

- Một Portal Admin đầu tiên cho mỗi client ở Phase 1.
- Không tự gửi email/invite: luồng invite sẽ chỉ được bổ sung khi SMTP và URL
  redirect production đã được cấu hình, để tránh trạng thái nửa vời ở local.
- Không cho Portal xem hoặc sửa provider/API key.

## Acceptance Criteria

- [ ] Internal onboarding có bước 4 “Tài khoản Portal” sau bước kích hoạt.
- [ ] Email hợp lệ và mật khẩu tối thiểu 12 ký tự, có chữ hoa, chữ thường và số
  mới được gửi đi.
- [ ] Hai ô mật khẩu phải khớp trước khi gọi API.
- [ ] Endpoint chỉ Agency Admin mới gọi được và chỉ tạo tài khoản cho client
  đang tồn tại, đã kích hoạt.
- [ ] Supabase Auth user nhận `client_admin` và `client_id` trong
  `app_metadata`; không dùng `user_metadata` cho quyền.
- [ ] Một client không tạo trùng Portal Admin; lỗi không để mật khẩu lộ ra.
- [ ] Hệ thống lưu bản ghi liên kết user–client, bật RLS và chỉ Agency Admin có
  quyền truy cập trực tiếp bảng này.
- [ ] UI xóa mật khẩu khỏi state sau khi tạo thành công và chỉ hiện email + URL
  Portal cho Agency Admin.
- [ ] Có test backend cho quyền, metadata, không lộ mật khẩu và chặn tạo trùng.
