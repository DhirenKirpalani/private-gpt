-- Add OAuth token fields to email_connections for one-click Gmail/Outlook integration
alter table email_connections
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists oauth_provider text, -- 'google', 'microsoft'
  add column if not exists email_account text;  -- normalized email from OAuth profile

-- Index for fast lookups by user + provider
create index if not exists idx_email_connections_user_oauth
  on email_connections(user_id, oauth_provider, provider);
