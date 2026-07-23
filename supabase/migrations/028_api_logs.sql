-- Migration: API monitoring logs
-- Stores request logs for all API routes for monitoring in super admin

create table if not exists api_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  method text not null,
  endpoint text not null,
  status_code integer not null,
  duration_ms integer,
  error text,
  user_agent text,
  ip_address text,
  created_at timestamptz default now() not null
);

-- Indexes for efficient querying
create index if not exists idx_api_logs_created_at on api_logs(created_at desc);
create index if not exists idx_api_logs_endpoint on api_logs(endpoint, created_at desc);
create index if not exists idx_api_logs_status on api_logs(status_code, created_at desc);

-- RLS: only super_admin can read
alter table api_logs enable row level security;
create policy "Super admin can read api logs" on api_logs for select using (
  exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.role = 'super_admin'
  )
);

-- Allow inserts from the service role (server-side API routes)
create policy "Service role can insert api logs" on api_logs for insert with check (true);
