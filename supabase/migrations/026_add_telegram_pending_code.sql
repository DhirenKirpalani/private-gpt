-- Add pending code hash and session columns for auth flow
ALTER TABLE telegram_user_sessions
  ADD COLUMN IF NOT EXISTS pending_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS pending_session TEXT,
  ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ;
