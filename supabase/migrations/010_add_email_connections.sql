-- Migration: Email connections table for CRM channel integrations
-- Run this in Supabase Dashboard → SQL Editor → New query

create table if not exists email_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  email_address text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean default true,
  smtp_user text,
  smtp_pass text,
  imap_host text,
  imap_port integer,
  status text not null default 'connected'
    check (status in ('connected', 'error', 'disconnected')),
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

alter table email_connections enable row level security;

create policy "email_connections_select" on email_connections
  for select using (user_id = auth.uid());

create policy "email_connections_insert" on email_connections
  for insert with check (user_id = auth.uid());

create policy "email_connections_update" on email_connections
  for update using (user_id = auth.uid());

create policy "email_connections_delete" on email_connections
  for delete using (user_id = auth.uid());

create or replace function handle_email_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger email_connections_updated_at
  before update on email_connections
  for each row execute function handle_email_connections_updated_at();
