-- Migration: Add token usage columns to chat_messages table
-- Run this in Supabase Dashboard → SQL Editor → New query

alter table chat_messages
  add column if not exists prompt_tokens integer default 0,
  add column if not exists completion_tokens integer default 0,
  add column if not exists total_tokens integer default 0;
