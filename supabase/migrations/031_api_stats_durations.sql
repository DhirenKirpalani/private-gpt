-- Migration: Add durations array to api_stats_hourly for percentile calculation
-- Stores individual request durations per stat row for p50/p95/p99 computation

alter table api_stats_hourly add column if not exists durations integer[] default '{}';

-- Allow service role to update durations
-- (already covered by existing RLS policy for updates)
