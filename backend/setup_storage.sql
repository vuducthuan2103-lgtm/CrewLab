-- Idempotent setup for the MVP Media Library.
-- Run in Supabase SQL Editor. An empty legacy `brand_assets` bucket is removed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets', 'brand-assets', false, 52428800,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CrewLab service role manages brand-assets" on storage.objects;
create policy "CrewLab service role manages brand-assets"
on storage.objects for all to service_role
using (bucket_id = 'brand-assets')
with check (bucket_id = 'brand-assets');

delete from storage.buckets as bucket
where bucket.id = 'brand_assets'
  and not exists (select 1 from storage.objects where bucket_id = bucket.id);
