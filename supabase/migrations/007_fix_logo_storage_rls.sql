-- Migration: Fix logos storage RLS policies
-- Run this in Supabase Dashboard → SQL Editor → New query

-- 1. Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- 2. Drop ALL existing policies on storage.objects for logos bucket
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%logos%' or with_check like '%logos%')
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Also drop by exact names just in case
drop policy if exists "Users can upload own logo" on storage.objects;
drop policy if exists "Users can update own logo" on storage.objects;
drop policy if exists "Anyone can read logos" on storage.objects;
drop policy if exists "Users can delete own logo" on storage.objects;
drop policy if exists "Allow authenticated uploads to logos" on storage.objects;
drop policy if exists "Allow authenticated updates to logos" on storage.objects;
drop policy if exists "Allow authenticated deletes from logos" on storage.objects;
drop policy if exists "Allow public reads from logos" on storage.objects;

-- 3. Create fresh policies
create policy "Allow authenticated uploads to logos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "Allow authenticated updates to logos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');

create policy "Allow authenticated deletes from logos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

create policy "Allow public reads from logos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'logos');
