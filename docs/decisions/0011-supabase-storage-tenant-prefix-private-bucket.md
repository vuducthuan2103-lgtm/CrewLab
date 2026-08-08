# Decision 0011 — Một private bucket, tenant prefix cho Media Library

**Status:** Accepted  
**Date:** 2026-08-05  
**Scope:** MVP Phase 1

## Bối cảnh

Hiện có ba tên không đồng nhất: frontend từng gọi `crewlab-assets`, backend dùng `brand-assets`, còn bucket legacy `brand_assets` được tạo từ migration cũ. Portal cũng đang submit preview/blob hoặc URL trực tiếp thay vì object Storage thật.

## Quyết định

1. Dùng duy nhất bucket private `brand-assets` cho Media Library MVP.
2. Không tạo một bucket cho mỗi client. Mỗi object bắt đầu bằng `client_id` UUID để tenant isolation.
3. Backend là nơi upload và tạo signed URL. Portal không nhận service-role key và không dùng public URL.
4. Metadata nằm trong `brand_assets.storage_path`; cột `url` giữ path/fallback tương thích, còn API tạo signed URL động khi đọc.
5. Giữ nguyên bucket `brand_assets` legacy và object hiện có; không xoá hay tự động copy trong quyết định này.
6. Portal cho phép client upload ảnh từ tab Thư viện ảnh bất cứ lúc nào. Các upload này dùng path `<client_id>/originals/<asset_id>.<ext>` và không gắn `asset_request_id`; Asset Request vẫn dùng path request riêng.

## Lý do

Một bucket private với prefix giúp policy, backup, quota và vận hành đơn giản hơn nhiều so với hàng trăm bucket. Signed URL giữ quyền truy cập ngắn hạn và phù hợp với client-scoped API hiện tại.

## Hệ quả

- Cần kiểm tra `client_id` từ JWT `app_metadata` ở backend trước mọi thao tác.
- Cần giới hạn MIME/kích thước ở bucket và API.
- Nếu sau này cần direct-to-Storage upload, phải bổ sung signed upload intent và policy `storage.objects`; không mở bucket public.
- Không cần thay đổi schema cho MVP vì `storage_path` đã tồn tại.
- Thư viện ảnh trở thành nơi nhận asset chủ động từ client, không chỉ là kết quả của Asset Request do AI tạo.

## Rollback

Tắt endpoint upload mới và giữ lại metadata/object đã tạo; không xoá bucket/object.

## Tham chiếu

- `specs/0015-supabase-storage-media-library/spec.md`
- `docs/prd/CrewLab-MVP-Scope-v3.5.md`
