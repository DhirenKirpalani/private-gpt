-- Enable RLS on slack_connections table
-- Policies already exist but RLS was not enabled
ALTER TABLE public.slack_connections ENABLE ROW LEVEL SECURITY;
