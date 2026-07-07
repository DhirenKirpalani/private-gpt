-- Migration: Add cc_address column to email_messages table
-- Run this in Supabase Dashboard → SQL Editor → New query

ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS cc_address text;
