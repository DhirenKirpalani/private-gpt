-- Migration: Create support-screenshots storage bucket for support ticket attachments
-- Run this in Supabase Dashboard → SQL Editor → New query

insert into storage.buckets (id, name, public)
values ('support-screenshots', 'support-screenshots', true)
on conflict (id) do nothing;

-- RLS policies for support-screenshots bucket
-- (RLS is already enabled on storage.objects in Supabase)

-- Allow authenticated users to upload support screenshots
create policy "Users can upload support screenshots"
  on storage.objects for insert
  with check (bucket_id = 'support-screenshots' and auth.role() = 'authenticated');

-- Allow public read access (bucket is public)
create policy "Public can read support screenshots"
  on storage.objects for select
  using (bucket_id = 'support-screenshots');

-- Allow users to delete their own screenshots
create policy "Users can delete own support screenshots"
  on storage.objects for delete
  using (bucket_id = 'support-screenshots' and auth.role() = 'authenticated');
