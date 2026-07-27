# Kế Hoạch Triển Khai (Implementation Plan) - 0004 Supabase Storage

## 1. Phương pháp khởi tạo Bucket
Supabase lưu thông tin bucket ở schema `storage.buckets` và thông tin file ở `storage.objects`. Thay vì setup bằng tay qua Supabase Dashboard, ta sẽ viết một **Alembic Migration** thủ công để thực thi các lệnh SQL DDL cần thiết. Điều này đảm bảo tính nhất quán giữa code và database (Spec-Driven).

## 2. Chi Tiết SQL Migration
Migration file sẽ thực thi các lệnh sau:
1. Đảm bảo extension `uuid-ossp` hoặc `pgcrypto` đã có.
2. INSERT bucket `brand_assets` vào `storage.buckets`:
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('brand_assets', 'brand_assets', true) 
   ON CONFLICT (id) DO NOTHING;
   ```
3. Tạo RLS policies trên `storage.objects`:
   - Drop policies cũ nếu có.
   - Thêm policy cho phép **Public** đọc file trong bucket (nếu bucket là public, phù hợp với ảnh sản phẩm hiển thị trên web). Hoặc, nếu yêu cầu bảo mật cao, chỉ cho phép user thuộc `client_id` tương ứng truy cập. Theo MVP, bucket nên là `public` để dễ dàng lấy ảnh render trên giao diện (ví dụ D02 lấy ảnh).
   - Backend service (Service Role) sẽ có toàn quyền Insert/Update/Delete.

## 3. Các bước thực hiện (Tasks)
1. Tạo một script Alembic (ví dụ: `0003_setup_storage.py`).
2. Viết DDL script vào hàm `upgrade()` và rollback vào hàm `downgrade()`.
3. Kiểm tra (review) script SQL.
