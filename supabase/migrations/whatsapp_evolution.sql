-- WhatsApp Evolution API tables
-- Run this in Supabase SQL Editor
-- NOTE: whatsapp_messages table already exists from Meta Cloud API integration
-- We add session_id + media columns to it, and create whatsapp_sessions table

-- Sessions table (one per connected WhatsApp number via Evolution API)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  instance_name TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'connected', 'disconnected')),
  provider TEXT NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution', 'meta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add session_id column to existing whatsapp_messages table (nullable for backward compat with Meta API)
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE CASCADE;

-- Add media columns to existing whatsapp_messages table
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Make connection_id nullable (Evolution API messages use session_id instead)
ALTER TABLE whatsapp_messages ALTER COLUMN connection_id DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_session_id ON whatsapp_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- Enable RLS on sessions table
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions (users can only access their own data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_sessions' AND policyname = 'Users can view own WhatsApp sessions') THEN
    CREATE POLICY "Users can view own WhatsApp sessions" ON whatsapp_sessions
      FOR SELECT USING (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_sessions' AND policyname = 'Users can insert own WhatsApp sessions') THEN
    CREATE POLICY "Users can insert own WhatsApp sessions" ON whatsapp_sessions
      FOR INSERT WITH CHECK (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_sessions' AND policyname = 'Users can update own WhatsApp sessions') THEN
    CREATE POLICY "Users can update own WhatsApp sessions" ON whatsapp_sessions
      FOR UPDATE USING (auth.uid()::text = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_sessions' AND policyname = 'Users can delete own WhatsApp sessions') THEN
    CREATE POLICY "Users can delete own WhatsApp sessions" ON whatsapp_sessions
      FOR DELETE USING (auth.uid()::text = user_id);
  END IF;
END $$;
