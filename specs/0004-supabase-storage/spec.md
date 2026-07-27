# Tính Năng (Spec) - 0004 Supabase Storage cho Brand Assets

## 1. Tóm Tắt (Overview)
Thiết lập cơ sở hạ tầng lưu trữ file (Supabase Storage) cho hệ thống quản lý Media Library (Brand Assets) theo yêu cầu từ `PRD-CrewLab.md` (mục C7). File gốc (ảnh, video, logo) sẽ được lưu trong Storage của Supabase, không lưu binary trong PostgreSQL.

## 2. Yêu Cầu Cụ Thể (Requirements)

### 2.1. Cấu trúc thư mục (Bucket & Path)
- **Bucket**: `brand_assets` (hoặc `crewlab-media` tùy quyết định).
- **Cấu trúc Path**:
  - `/clients/{client_id}/assets/raw_uploads/`: Thư mục lưu ảnh upload ban đầu.
  - `/clients/{client_id}/assets/products/`: Thư mục lưu ảnh đã phân loại/sản phẩm.

### 2.2. Row Level Security (RLS)
Cần định nghĩa RLS policies cho bảng `storage.objects` (nơi quản lý file của Supabase):
- **Service Role**: Có toàn quyền (để API backend xử lý).
- **Authenticated Users (Users qua Supabase Auth)**:
  - Có quyền read/write các file thuộc về `client_id` của họ (so khớp `client_id` trong path với `client_id` của user).

### 2.3. Cập Nhật Model `BrandAsset` (Database)
Đối chiếu với PRD mục C7, model `BrandAsset` hiện tại trong PostgreSQL còn thiếu các trường dữ liệu quan trọng sau:
- `storage_path` (String, nullable=False): Đường dẫn file gốc trên Supabase Storage.
- `format` (String, nullable=True): image, video, logo, template.
- `usage_count` (Integer, default=0): Số lần asset được sử dụng.
- `last_used_at` (DateTime, nullable=True): Thời điểm dùng gần nhất.
- `campaign_id` (UUID, nullable=True): Liên kết với chiến dịch cụ thể.
- `campaign_restricted` (Boolean, default=False): Đánh dấu không dùng lại cho evergreen.

Cần tạo thêm một file Migration (ví dụ `0004_update_brand_asset_model.py`) bằng lệnh Alembic để tự động thêm các cột này.

### 2.4. Quy trình tự động hóa Database (Migration)
- Không tạo bằng tay qua giao diện Supabase.
- Sử dụng SQL (qua Alembic migration) để tự động tạo bucket và thiết lập RLS (Idempotent - chạy nhiều lần không lỗi).

## 3. Tiêu Chí Chấp Nhận (Acceptance Criteria)
| ID | Tiêu Chí (Acceptance Criteria) |
|---|---|
| AC-STO-01 | File migration SQL được sinh ra hợp lệ để insert bucket `brand_assets` vào schema `storage`. |
| AC-STO-02 | RLS policies được thiết lập đảm bảo an toàn truy cập (client_id isolation). |
| AC-STO-03 | Quá trình chạy migration không gặp lỗi trên Supabase Cloud hoặc Local. |
