-- Migration: Add brand style and mood columns to profiles
-- Run this in Supabase Dashboard → SQL Editor → New query

alter table profiles
  add column if not exists brand_style text default 'cinematic'
    check (brand_style in ('minimal','editorial','cinematic')),
  add column if not exists brand_mood text default 'futuristic'
    check (brand_mood in ('calm','bold','luxury','futuristic'));
