-- Migration: Add input_style column to profiles for chat input box theme
-- Run this in Supabase Dashboard → SQL Editor → New query

alter table profiles
  add column if not exists input_style text default 'dark'
    check (input_style in ('dark', 'light'));
