-- Migration: Add user_id tracking to api_stats_hourly for per-user analytics
-- Also add user_id index to api_logs for filtering

-- Add user_id column to api_stats_hourly (nullable for backward compat)
alter table api_stats_hourly add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Update unique constraint to include user_id so different users get separate stat rows
alter table api_stats_hourly drop constraint if exists api_stats_hourly_endpoint_method_hour_bucket_key;
alter table api_stats_hourly add constraint api_stats_hourly_endpoint_method_hour_bucket_user_key unique(endpoint, method, hour_bucket, user_id);

-- Index for querying by user
create index if not exists idx_api_stats_user_id on api_stats_hourly(user_id, hour_bucket desc);

-- Add index on api_logs user_id for faster per-user queries
create index if not exists idx_api_logs_user_id on api_logs(user_id, created_at desc);
