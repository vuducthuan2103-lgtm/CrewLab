# Spec 0015 — Supabase Storage cho Media Library

## Mục tiêu

Kết nối Media Library của Portal với Supabase Storage thật. File ảnh phải được upload qua backend, lưu metadata vào `brand_assets`, và hiển thị bằng signed URL ngắn hạn. Phần Asset Request của bản spec ban đầu đã bị Decision 0014 thay thế và không còn thuộc hệ thống.

## Phạm vi MVP

- Dùng một bucket private dùng chung: `brand-assets`.
- Cô lập tenant bằng prefix bắt đầu bằng `client_id` (UUID), không tạo bucket riêng cho từng client.
- Path source chuẩn: `<client_id>/originals/<asset_id>.<ext>`.
- Tab Thư viện ảnh có nút upload để client chủ động bổ sung ảnh bất cứ lúc nào.
- Portal upload ảnh qua API backend; backend kiểm tra client, MIME type, kích thước, ghi Storage và metadata.
- API danh sách asset tạo signed URL khi trả về Portal; không dùng public URL hoặc blob URL để submit.
- Asset upload được semantic-index bất đồng bộ; chỉ source đã sẵn sàng, approved và đủ quyền sử dụng mới được D02 chọn.
- Bucket/prefix legacy và dữ liệu thử cũ được loại bỏ theo migration được ủy quyền; client upload lại vào prefix `originals` chuẩn.

## Ngoài phạm vi

- Bucket riêng theo client, video/large-file pipeline, CDN hoặc image transformation.
- Thay đổi schema PostgreSQL hiện có.

## Acceptance Criteria

- AC-0015-01: `brand-assets` private, giới hạn 50 MB, chỉ JPEG/PNG/WebP.
- AC-0015-02: File upload nằm dưới prefix UUID của client.
- AC-0015-03: Không đọc hoặc submit asset của client khác.
- AC-0015-04: Mỗi upload tạo `brand_assets` với `storage_path`, filename, MIME/format, content fingerprint và đúng client; không có `asset_request_id`.
- AC-0015-05: GET `/api/v1/portal/assets` trả signed URL hoạt động; không trả public URL.
- AC-0015-06: Upload hợp lệ tạo semantic-indexing task và hiển thị lifecycle `processing`, `ready`, `needs_attention` hoặc `failed`.
- AC-0015-07: Portal không submit blob URL hay URL tuỳ ý.
- AC-0015-08: Backend tests, Portal lint/build và smoke flow upload/index/list pass.
- AC-0015-09: Tab Thư viện ảnh có nút upload ảnh tự do; upload xong asset xuất hiện trong thư viện và không có luồng Asset Request.
