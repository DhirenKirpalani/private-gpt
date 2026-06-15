-- Migration: Create logos storage bucket and RLS policies
-- Step 1: Create bucket via Supabase Dashboard → Storage → New bucket
--   Name: logos
--   Public: YES (checked)
--
-- Step 2: Run this in Supabase SQL Editor

insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Users can upload own logo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own logo"
  on storage.objects for update
  with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can read logos"
  on storage.objects for select
  using (bucket_id = 'logos');
