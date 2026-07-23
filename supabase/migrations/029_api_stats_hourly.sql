-- Migration: API monitoring — aggregation table + error-only individual logs
-- Replaces raw per-request logging with:
--   1. api_stats_hourly: aggregated stats per endpoint per hour (analytics)
--   2. api_logs: individual logs ONLY for errors (debugging)

-- Aggregation table (1 row per endpoint per hour)
create table if not exists api_stats_hourly (
  id uuid default gen_random_uuid() primary key,
  endpoint text not null,
  method text not null,
  hour_bucket timestamptz not null,  -- truncated to the hour
  total_requests integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  total_duration_ms bigint not null default 0,
  created_at timestamptz default now() not null,
  unique(endpoint, method, hour_bucket)
);

create index if not exists idx_api_stats_hourly_bucket on api_stats_hourly(hour_bucket desc);
create index if not exists idx_api_stats_endpoint on api_stats_hourly(endpoint, hour_bucket desc);

-- RLS: only super_admin can read
alter table api_stats_hourly enable row level security;
create policy "Super admin can read api stats" on api_stats_hourly for select using (
  exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.role = 'super_admin'
  )
);

-- Allow inserts from service role
create policy "Service role can insert api stats" on api_stats_hourly for insert with check (true);
create policy "Service role can update api stats" on api_stats_hourly for update with check (true);

-- Update api_logs RLS to allow service role updates (for cleanup)
create policy "Service role can delete api logs" on api_logs for delete using (true);
