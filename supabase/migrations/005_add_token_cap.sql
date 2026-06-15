-- Migration: Add token_cap column to profiles table
-- Run this in Supabase Dashboard → SQL Editor → New query

alter table if exists profiles
  add column if not exists token_cap integer default 20000;
