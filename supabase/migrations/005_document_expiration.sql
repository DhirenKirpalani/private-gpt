-- Migration: Document expiration and pinning
-- Adds expires_at, file_archived, pinned columns to documents table
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Add new columns
alter table documents add column if not exists expires_at timestamptz;
alter table documents add column if not exists file_archived boolean not null default false;
alter table documents add column if not exists pinned boolean not null default false;

-- Backfill: set expires_at to 30 days from now for all existing documents
update documents
  set expires_at = now() + interval '30 days'
  where expires_at is null;

-- Add index for expiration queries
create index if not exists idx_documents_expires_at
  on documents(expires_at);

-- Add index for pinned filter
create index if not exists idx_documents_pinned
  on documents(pinned);
