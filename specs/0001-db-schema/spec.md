# Spec: 0001 - Database Schema MVP (Phase 1)

## Objective
Xây dựng nền tảng Database Schema (PostgreSQL) cho CrewLab MVP (Phase 1). Database phải phục vụ đầy đủ 6 Agents (bao gồm Orchestrator A01), quản lý chu trình sản xuất nội dung (FSM), lưu vết hoạt động (memory, observability) mà không dùng ChromaDB hay Hindsight.

## Tech Stack
- **Database**: PostgreSQL (Supabase)
- **ORM**: SQLAlchemy / SQLModel (Python)
- **Migration Tool**: Alembic
- **Kiến trúc**: Multi-tenant với Row Level Security (RLS) ở tầng Database kết hợp Query Filtering ở tầng Ứng dụng.
- **Thư mục code**: `backend/app/models/`, `backend/alembic/`

## Cấu trúc Bảng (Schema Design)

### 1. Quản lý Khách hàng & Thương hiệu
- **`clients`**: Quản lý tenant.
  - `id` (UUID, PK)
  - `name` (String)
  - `brand_name` (String)
  - `is_active` (Boolean, default: True)
  - `industry` (String, nullable)
  - `timezone` (String, default: "Asia/Ho_Chi_Minh")
  - `platforms` (JSONB, nullable)
  - `created_at`, `updated_at` (Timestamp)
- **`brand_settings`**: Lưu Brand Voice (thay thế RAG).
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `brand_voice_short` (Text)
  - `tone_of_voice` (String)
  - `target_audience` (Text)
  - `avoid_phrases` (JSONB) - Các từ cấm D01 không được dùng
  - `brand_colors` (JSONB) - D02 dùng để check màu
  - `personality_keywords` (JSONB, nullable)
  - `writing_style` (Text, nullable)
  - `sample_captions` (JSONB, nullable)
  - `logo_url` (String, nullable)
  - `created_at`, `updated_at` (Timestamp)

- **`brand_settings_history`**: Lưu lịch sử thay đổi cấu hình thương hiệu.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `brand_setting_id` (UUID, FK -> brand_settings.id)
  - (Các fields copy y hệt bảng brand_settings)
  - `created_at` (Timestamp)

### 2. Kế hoạch & Sản xuất Nội dung
- **`workflow_cycles`**: Chu kỳ sản xuất (hàng tuần).
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `phase` (Enum: `strategy`, `content_production`, `done`)
  - `start_date`, `end_date` (Date)
  - `status` (Enum: `active`, `completed`)
  - `created_at` (Timestamp)
- **`content_pillars`**: Trụ nội dung cho B02, được versioning theo cycle.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `cycle_id` (UUID, FK -> workflow_cycles.id)
  - `name` (String)
  - `description` (Text)
  - `weight` (Integer)
  - `updated_reason` (Text, nullable) - Lý do thay đổi weight/pillar
  - `created_at` (Timestamp)
- **`content_items`**: Bảng lõi quản lý FSM và kết quả của các Agents.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `cycle_id` (UUID, FK -> workflow_cycles.id)
  - `pillar_id` (UUID, FK -> content_pillars.id, nullable)
  - `topic` (String) - Ý tưởng bài viết chính
  - `platform` (String) - Mạng xã hội mục tiêu (Facebook, Instagram, etc.)
  - `status` (Enum: `planned`, `ready_for_generation`, `caption_generating`, `visual_matching`, `waiting_asset`, `asset_blocked`, `visual_generating`, `evaluating`, `eval_failed`, `pending_content_approval`, `approved_ready_to_post`, `posted`, `rejected`, `archived`)
  - `caption` (Text, nullable)
  - `image_brief` (JSONB, nullable) - Cấu trúc gồm `real_photo_required` (boolean), `content_type` (string), `suggested_asset_tags`, `narrative_text`
  - `image_url` (String, nullable)
  - `eval_score_caption` (Float, nullable)
  - `eval_score_visual` (Float, nullable)
  - `eval_retry_count` (Integer, default: 0)
  - `failed_criteria` (JSONB, nullable) - Danh sách các lỗi để A01 route retry (D01 hay D02)
  - `fix_instructions` (Text, nullable) - E01 dặn dò cách sửa
  - `client_edited_caption` (Text, nullable)
  - `posted_at` (Timestamp, nullable)
  - `created_at`, `updated_at` (Timestamp)

### 3. Media & Assets
- **`brand_assets`**: Thư viện ảnh (C7).
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `asset_request_id` (UUID, FK -> asset_requests.id, nullable) - Để A01 trigger `asset_submitted`
  - `url` (String)
  - `file_name` (String)
  - `tags` (JSONB)
  - `asset_type` (String, nullable)
  - `source` (String, nullable)
  - `status` (String, default: "approved")
  - `usage_rights` (String, nullable)
  - `dimensions` (String, nullable)
  - `created_at`, `updated_at` (Timestamp)
- **`asset_requests`**: Yêu cầu nộp ảnh từ chủ quán.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `content_item_id` (UUID, FK -> content_items.id)
  - `note` (Text)
  - `status` (Enum: `pending`, `fulfilled`, `expired`)
  - `priority` (Enum: `low`, `normal`, `high`, `urgent`)
  - `expires_at` (Timestamp)
  - `created_at`, `updated_at` (Timestamp)

### 4. Phản hồi & Lịch sử
- **`hitl_reviews`**: Lịch sử duyệt gate (S2 Pillar, S3 Plan, Content).
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `gate_type` (Enum: `pillar`, `plan`, `content`)
  - `target_id` (UUID) - ID của content_pillars, workflow_cycles, hoặc content_items
  - `reviewer_id` (UUID) - Map với bảng auth.users
  - `action` (Enum: `approved`, `rejected`, `edited`)
  - `reject_reason` (String) - Taxonomy lý do reject
  - `feedback_text` (Text, nullable)
  - `edited_caption` (Text, nullable) - Dùng khi action=edited ở content gate
  - `created_at` (Timestamp)
- **`agent_memory`**: Episodic memory (C3 MVP) được P01 ghi lại.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `content_item_id` (UUID, nullable) - Link với item bị reject
  - `agent_code` (String)
  - `task_type` (String)
  - `input_summary` (Text)
  - `output_summary` (Text)
  - `human_feedback` (Text, nullable)
  - `eval_score` (Float, nullable)
  - `created_at` (Timestamp)

### 5. Hệ thống & Logging
- **`task_logs`**: Observability log (thay Langfuse).
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `agent_code` (String)
  - `task_type` (String)
  - `model_used` (String)
  - `tokens_in` (Integer)
  - `tokens_out` (Integer)
  - `latency_ms` (Integer)
  - `status` (String)
  - `eval_score` (Float, nullable)
  - `wake_reason` (String)
  - `created_at` (Timestamp)
- **`audit_log`**: Nhật ký truy vết.
  - `id` (UUID, PK)
  - `client_id` (UUID, FK -> clients.id)
  - `user_id` (UUID) - Map với bảng auth.users
  - `action` (String)
  - `details` (JSONB)
  - `created_at` (Timestamp)

## Boundaries / Row Level Security (RLS)
- **Bắt buộc (RLS)**: Row Level Security là MUST. Mọi bảng dữ liệu có `client_id` phải được cài đặt policy RLS ở Postgres. 
  - Agency Admin: Full access.
  - Client Users: Chỉ thấy dữ liệu nơi `client_id = mình`. 
  - Ứng dụng Backend cũng phải áp dụng Query Filtering (`.where(client_id == x)`) như một lớp phòng ngự thứ 2 (Defense-in-depth).
- **UUID**: Tất cả ID (`reviewer_id`, `user_id`) phải dùng chuẩn UUID (chuẩn bị kết nối Supabase Auth sau này).
- **Automation**: Mọi thao tác ghi dữ liệu update phải tự động thay đổi field `updated_at`.

## Khởi tạo Project Backend
Cấu trúc sẽ dựa trên:
```text
backend/
├── alembic/
├── app/
│   ├── models/        # Chứa SQLAlchemy schema models
│   ├── core/          # Chứa DB connection/config
│   ├── schemas/       # Pydantic schemas (nếu cần sau)
│   └── api/           # API endpoints (sau này)
├── pyproject.toml / requirements.txt
└── alembic.ini
```
Tạo template file `.sql` để enable RLS cho toàn bộ các bảng trong migration.
