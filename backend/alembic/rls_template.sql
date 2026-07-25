-- RLS Template for CrewLab MVP
-- Run this template for any new table that contains 'client_id'

-- 1. Enable RLS on the table
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- 2. Policy for Agency Admin (Full Access)
-- Giả định auth.users có role 'agency_admin' lưu trong raw_user_meta_data hoặc bảng profiles
CREATE POLICY "Agency Admin has full access to {table_name}"
    ON {table_name}
    FOR ALL
    USING (
        (auth.jwt() ->> 'role')::text = 'agency_admin' 
        OR 
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'agency_admin'
    );

-- 3. Policy for Client Users (Isolate by client_id)
-- Giả định auth.jwt chứa client_id của người dùng hiện tại
CREATE POLICY "Clients can only access their own {table_name}"
    ON {table_name}
    FOR ALL
    USING (
        client_id::text = (auth.jwt() ->> 'client_id')::text
    )
    WITH CHECK (
        client_id::text = (auth.jwt() ->> 'client_id')::text
    );

-- Ghi chú: 
-- Template này cần được nhúng vào file migration alembic (op.execute(...))
-- hoặc chạy trực tiếp trên Supabase SQL Editor sau khi Alembic autogenerate tạo bảng xong.
