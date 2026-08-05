# 0008 — Supabase Auth thật thay thế Mock Login Portal

- **Ngày:** 2026-08-04
- **Quyết định:** Bỏ toàn bộ Mock Login khỏi Client Portal và dùng Supabase Auth email/mật khẩu thật.
- **Phạm vi:** `portal/` và các route của Portal. Không thay đổi auth của `internal-app/` trong quyết định này.
- **Lý do:** Founders cần tự tạo tài khoản test thật và kiểm tra luồng vận hành trên staging/local thay vì đi qua cơ chế demo.
- **Hệ quả:** Acceptance Criterion AC-PORTAL-07 trong Spec 0003 không còn phần Mock Login. Quy định thay thế nằm trong Spec 0012.
