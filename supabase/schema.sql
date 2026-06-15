-- Profiles table for Exploro OS (v2)
-- Run this in Supabase Dashboard → SQL Editor → New query

-- 1. Drop old table + trigger if re-running (dev only)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists profiles cascade;

-- 2. Create the profiles table
create table profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,

  -- Identity
  full_name text,
  job_title text,
  phone text,
  location text,
  linkedin_url text,

  -- Company
  company_name text,
  industry text default 'Consulting',
  company_size text default '1-10'
    check (company_size in ('1-10','11-50','51-200','201-500','500+')),
  year_founded text,
  website text,

  -- Contact (distinct from auth.users.email)
  contact_email text,

  -- Strategy / positioning
  business_description text,
  target_audience text,
  key_products text,
  competitors jsonb default '[]'::jsonb,

  -- AI personalization
  ai_name text,
  ai_role text,
  brand_voice text,
  communication_style text default 'Formal'
    check (communication_style in ('Formal','Professional','Friendly','Casual','Concise','Enthusiastic')),
  tone_examples text,
  words_to_avoid text,
  clarification_prompt text,
  response_length text default 'Standard',

  -- Multi-value fields as JSONB
  languages jsonb default '[]'::jsonb,
  avatar_url text,
  logo_url text,
  brand_colors jsonb default '[]'::jsonb,
  brand_style text default 'cinematic'
    check (brand_style in ('minimal','editorial','cinematic')),
  brand_mood text default 'futuristic'
    check (brand_mood in ('calm','bold','luxury','futuristic')),
  token_cap integer default 20000,
  slogan text,
  doc_categories jsonb default '[]'::jsonb,
  preferred_sources jsonb default '[]'::jsonb,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Enable Row Level Security
alter table profiles enable row level security;

-- 4. Users can read only their own profile
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = user_id);

-- 5. Users can insert their own profile
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = user_id);

-- 6. Users can update only their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id);

-- 7. Auto-update updated_at timestamp
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public;

create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function handle_updated_at();

-- 8. Auto-create a profile row when a new user signs up
-- Placed in 'private' schema so PostgREST does NOT expose it via REST API
create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, contact_email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- 9. Dynamic translations table (overrides hardcoded defaults)
create table translations (
  id uuid default gen_random_uuid() primary key,
  key text not null,
  lang text not null,
  value text not null,
  updated_at timestamp with time zone default now(),
  unique(key, lang)
);

alter table translations enable row level security;

create policy "Anyone can read translations"
  on translations for select
  to authenticated, anon
  using (true);

create policy "Authenticated users can upsert translations"
  on translations for all
  to authenticated
  using (true)
  with check (true);

-- To add/update translations, use the Supabase Dashboard SQL Editor:
-- insert into translations (key, lang, value) values ('pricingPageTitle', 'es', 'Elige tu Plan')
-- on conflict (key, lang) do update set value = excluded.value, updated_at = now();

-- 10. Storage bucket for avatar images
-- Create via Supabase Dashboard → Storage → New bucket → "avatars" → Public
-- Then run these policies in SQL Editor:

-- Allow users to upload their own avatar
-- create policy "Users can upload own avatar"
--   on storage.objects for insert
--   with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read any avatar
-- create policy "Anyone can read avatars"
--   on storage.objects for select
--   using (bucket_id = 'avatars');
