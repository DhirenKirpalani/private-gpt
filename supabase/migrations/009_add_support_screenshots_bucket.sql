-- Migration: Create support-screenshots storage bucket for support ticket attachments
-- Run this in Supabase Dashboard → SQL Editor → New query

insert into storage.buckets (id, name, public)
values ('support-screenshots', 'support-screenshots', true)
on conflict (id) do nothing;
