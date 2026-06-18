-- Migration: Email messages table for sent/received emails
-- Run this in Supabase Dashboard → SQL Editor → New query

create table if not exists email_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references email_connections(id) on delete cascade not null,
  provider text not null,
  direction text not null default 'sent'
    check (direction in ('sent', 'received')),
  from_address text,
  to_address text,
  subject text,
  body text,
  html_body text,
  message_id text,
  thread_id text,
  read boolean default false,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_email_messages_user_id on email_messages(user_id);
create index if not exists idx_email_messages_connection_id on email_messages(connection_id);
create index if not exists idx_email_messages_direction on email_messages(direction);
create index if not exists idx_email_messages_thread_id on email_messages(thread_id);
create index if not exists idx_email_messages_created_at on email_messages(created_at desc);

alter table email_messages enable row level security;

create policy "email_messages_select" on email_messages
  for select using (user_id = auth.uid());

create policy "email_messages_insert" on email_messages
  for insert with check (user_id = auth.uid());

create policy "email_messages_update" on email_messages
  for update using (user_id = auth.uid());

create policy "email_messages_delete" on email_messages
  for delete using (user_id = auth.uid());
