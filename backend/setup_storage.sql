-- Script này được chạy trên Supabase SQL Editor (không qua Alembic backend) 
-- để thiết lập storage bucket cho CrewLab.

-- 1. Create the bucket
insert into storage.buckets
  (id, name, public)
values
  ('crewlab-assets', 'crewlab-assets', true);

-- 2. Setup RLS Policies cho phép public read
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'crewlab-assets' );

-- 3. Cho phép upload (Tạm thời cho phép mọi người insert cho mục đích MVP - Cần thêm Auth rule sau này)
CREATE POLICY "Anon/Auth Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'crewlab-assets' );

CREATE POLICY "Anon/Auth Update Access" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'crewlab-assets' );

CREATE POLICY "Anon/Auth Delete Access" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'crewlab-assets' );
