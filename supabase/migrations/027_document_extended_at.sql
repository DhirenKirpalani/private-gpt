-- Migration: Track when document retention was extended
-- Adds extended_at column to documents table

alter table documents add column if not exists extended_at timestamptz;

-- Backfill: estimate extended_at for docs that were clearly extended
-- (expiry is more than 31 days after upload, meaning retention was reset)
update documents
  set extended_at = expires_at - interval '30 days'
  where extended_at is null
    and pinned = false
    and expires_at is not null
    and expires_at > created_at + interval '31 days';
