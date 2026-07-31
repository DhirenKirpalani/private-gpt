-- Telegram User Sessions (Client API / MTProto)
-- Stores user's personal Telegram session for accessing contacts and personal chats

CREATE TABLE IF NOT EXISTS telegram_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  session_string TEXT NOT NULL,
  tg_user_id BIGINT,
  tg_username TEXT,
  tg_first_name TEXT,
  tg_last_name TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_user_sessions_user_id ON telegram_user_sessions(user_id);

ALTER TABLE telegram_user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to telegram user sessions"
  ON telegram_user_sessions FOR ALL
  USING (true);

CREATE POLICY "Users can read own telegram user sessions"
  ON telegram_user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION update_tg_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tg_user_sessions_updated_at ON telegram_user_sessions;
CREATE TRIGGER trg_tg_user_sessions_updated_at
  BEFORE UPDATE ON telegram_user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tg_user_sessions_updated_at();
