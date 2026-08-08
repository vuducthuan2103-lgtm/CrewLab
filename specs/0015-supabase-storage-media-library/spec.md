# Spec 0015 — Supabase Storage cho Media Library

## Mục tiêu

Kết nối Media Library và Asset Request của Portal với Supabase Storage thật. File ảnh phải được upload qua backend, lưu metadata vào `brand_assets`, và hiển thị bằng signed URL ngắn hạn.

## Phạm vi MVP

- Dùng một bucket private dùng chung: `brand-assets`.
- Cô lập tenant bằng prefix bắt đầu bằng `client_id` (UUID), không tạo bucket riêng cho từng client.
- Path chuẩn: `<client_id>/originals/<asset_id>.<ext>` hoặc `<client_id>/requests/<asset_request_id>/<asset_id>.<ext>`.
- Tab Thư viện ảnh có nút upload riêng để client có thể gửi ảnh bất cứ lúc nào, không cần đang có Asset Request.
- Portal upload ảnh qua API backend; backend kiểm tra client, MIME type, kích thước, ghi Storage và metadata.
- API danh sách asset tạo signed URL khi trả về Portal; không dùng public URL hoặc blob URL để submit.
- Asset Request submit bằng `asset_ids`, chỉ nhận asset thuộc đúng client và request.
- Giữ nguyên bucket legacy `brand_assets` và dữ liệu hiện có; không migrate dữ liệu trong scope này.

## Ngoài phạm vi

- Bucket riêng theo client, video/large-file pipeline, CDN hoặc image transformation.
- Xoá bucket/object legacy.
- Thay đổi schema PostgreSQL hiện có.

## Acceptance Criteria

- AC-0015-01: `brand-assets` private, giới hạn 50 MB, chỉ JPEG/PNG/WebP.
- AC-0015-02: File upload nằm dưới prefix UUID của client.
- AC-0015-03: Không đọc hoặc submit asset của client khác.
- AC-0015-04: Mỗi upload tạo `brand_assets` với `storage_path`, filename, MIME/format và request liên quan.
- AC-0015-05: GET `/api/v1/portal/assets` trả signed URL hoạt động; không trả public URL.
- AC-0015-06: Asset Request upload và submit dùng asset ID thật trong Storage.
- AC-0015-07: Portal không submit blob URL hay URL tuỳ ý.
- AC-0015-08: Backend tests, Portal lint/build và smoke flow upload/submit pass.
- AC-0015-09: Tab Thư viện ảnh có nút upload ảnh tự do; upload xong asset xuất hiện trong thư viện mà không gắn `asset_request_id`.
