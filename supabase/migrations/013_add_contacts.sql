-- Create contacts table for CRM
-- Contacts are auto-imported from email messages and can be created manually

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  role text,
  phone text,
  location text,
  tags text[] default '{}',
  starred boolean default false,
  source text default 'manual',   -- 'manual', 'email_import', etc.
  last_contact timestamptz,
  deal_value integer default 0,
  deal_stage text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table contacts enable row level security;

-- RLS: users can only see their own contacts
-- Drop existing policies first (PostgreSQL doesn't support IF NOT EXISTS on CREATE POLICY)
drop policy if exists "Users can view own contacts" on contacts;
drop policy if exists "Users can insert own contacts" on contacts;
drop policy if exists "Users can update own contacts" on contacts;
drop policy if exists "Users can delete own contacts" on contacts;

-- Policy: select own contacts
create policy "Users can view own contacts" on contacts
  for select using (auth.uid() = user_id);

-- Policy: insert own contacts
create policy "Users can insert own contacts" on contacts
  for insert with check (auth.uid() = user_id);

-- Policy: update own contacts
create policy "Users can update own contacts" on contacts
  for update using (auth.uid() = user_id);

-- Policy: delete own contacts
create policy "Users can delete own contacts" on contacts
  for delete using (auth.uid() = user_id);

-- Unique index on user_id + email to prevent duplicate contacts per user
create unique index if not exists idx_contacts_user_email
  on contacts(user_id, email) where email is not null;

-- Index for fast lookups
create index if not exists idx_contacts_user_id on contacts(user_id);
create index if not exists idx_contacts_name on contacts(name);
create index if not exists idx_contacts_company on contacts(company);
