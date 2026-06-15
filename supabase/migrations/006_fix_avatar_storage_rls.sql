-- Migration: Fix avatars storage RLS policies
-- Run this in Supabase Dashboard → SQL Editor → New query

-- 1. Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Drop ALL existing policies on storage.objects for avatars bucket
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%avatars%' or with_check like '%avatars%')
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Also drop by exact names just in case
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Anyone can read avatars" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects;
drop policy if exists "Allow authenticated uploads to avatars" on storage.objects;
drop policy if exists "Allow authenticated updates to avatars" on storage.objects;
drop policy if exists "Allow authenticated deletes from avatars" on storage.objects;
drop policy if exists "Allow public reads from avatars" on storage.objects;

-- 4. Create fresh policies
create policy "Allow authenticated uploads to avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "Allow authenticated updates to avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "Allow authenticated deletes from avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');

create policy "Allow public reads from avatars"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');
