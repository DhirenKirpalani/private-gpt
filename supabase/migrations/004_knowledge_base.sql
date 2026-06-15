-- Migration: Simplified Knowledge Base (no workspaces)
-- Run this in Supabase Dashboard → SQL Editor → New query

-- ============================================================
-- 0. Clean up old schema if it exists
-- ============================================================
drop table if exists document_embeddings cascade;
drop table if exists document_chunks cascade;
drop table if exists document_contents cascade;
drop table if exists documents cascade;
drop table if exists knowledge_categories cascade;
drop table if exists workspace_members cascade;
drop table if exists workspaces cascade;
drop function if exists is_workspace_member(uuid) cascade;
drop function if exists create_default_categories() cascade;
drop function if exists match_document_chunks(vector(1536), uuid, float, int) cascade;

-- ============================================================
-- 1. documents table (simple, per-user)
-- ============================================================
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  category text not null default 'Uncategorized',
  filename text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  status text not null default 'INDEXED'
    check (status in ('PROCESSING','INDEXING','INDEXED','FAILED')),
  page_count integer default 0,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_documents_user
  on documents(user_id);
create index if not exists idx_documents_category
  on documents(category);
create index if not exists idx_documents_created
  on documents(user_id, created_at desc);

-- RLS
alter table documents enable row level security;

create policy "documents_user_select"
  on documents for select
  using (user_id = auth.uid());

create policy "documents_user_insert"
  on documents for insert
  with check (user_id = auth.uid());

create policy "documents_user_update"
  on documents for update
  using (user_id = auth.uid());

create policy "documents_user_delete"
  on documents for delete
  using (user_id = auth.uid());

-- ============================================================
-- 2. knowledge_categories (per-user, persisted)
-- ============================================================

create table knowledge_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),

  unique(user_id, name)
);

-- RLS
alter table knowledge_categories enable row level security;

create policy "knowledge_categories_user_select"
  on knowledge_categories for select
  using (user_id = auth.uid());

create policy "knowledge_categories_user_insert"
  on knowledge_categories for insert
  with check (user_id = auth.uid());

create policy "knowledge_categories_user_delete"
  on knowledge_categories for delete
  using (user_id = auth.uid());

-- ============================================================
-- 3. Storage Policies for knowledge-base bucket
-- ============================================================

-- Drop existing policies first
drop policy if exists "kb_user_upload" on storage.objects;
drop policy if exists "kb_user_select" on storage.objects;
drop policy if exists "kb_user_delete" on storage.objects;

-- Users can upload to their own folder
create policy "kb_user_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
create policy "kb_user_select"
  on storage.objects for select
  using (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "kb_user_delete"
  on storage.objects for delete
  using (
    bucket_id = 'knowledge-base'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
