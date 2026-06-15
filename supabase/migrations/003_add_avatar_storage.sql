-- Migration: Create avatars storage bucket and RLS policies
-- Step 1: Create bucket via Supabase Dashboard → Storage → New bucket
--   Name: avatars
--   Public: YES (checked)
--
-- Step 2: Run this in Supabase SQL Editor

-- Allow authenticated users to upload their own avatar
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar"
  on storage.objects for update
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
