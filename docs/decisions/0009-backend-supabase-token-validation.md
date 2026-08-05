# 0009 — Backend xác minh token qua Supabase Auth

- **Ngày:** 2026-08-05
- **Quyết định:** Backend dùng `SUPABASE_URL` và `SUPABASE_KEY` ở môi trường server để gọi Supabase Auth xác minh access token hiện tại.
- **Thay thế:** Không còn yêu cầu `SUPABASE_JWT_SECRET` cục bộ để tự xác minh JWT HS256.
- **Lý do:** JWT secret chưa được cấu hình local; lưu shared signing secret ở nhiều máy tăng rủi ro lộ khóa. Supabase khuyến nghị xác minh token HS256 trực tiếp với Auth server.
- **Bảo mật:** `SUPABASE_KEY` chỉ nằm trong backend environment; không được đưa vào `NEXT_PUBLIC_*`, source code, log, hoặc tài liệu test.
