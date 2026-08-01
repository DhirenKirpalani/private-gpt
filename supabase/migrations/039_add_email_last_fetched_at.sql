-- Add last_fetched_at column to email_connections
alter table email_connections add column if not exists last_fetched_at timestamptz;
comment on column email_connections.last_fetched_at is 'Timestamp of the last email fetch for incremental sync';
