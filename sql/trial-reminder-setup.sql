-- Trial Reminder Notification System
-- Run this in Supabase SQL Editor

-- 1. Create notification_log table to track sent emails (prevent duplicates)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup of recent notifications by user and type
CREATE INDEX IF NOT EXISTS idx_notification_log_user_type
  ON notification_log (user_id, type, created_at DESC);

-- 2. Enable pg_cron extension (required for scheduled jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Enable pg_net extension (required for HTTP calls from pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Create the scheduled function that calls the Next.js API route daily
--    Replace 'YOUR_CRON_SECRET' with the actual CRON_SECRET from your .env file
--    Replace 'https://exploro-os.com' with your actual domain if different

SELECT cron.schedule(
  'trial-reminder-daily',
  '0 9 * * *',  -- Runs at 9:00 AM UTC every day
  $$
    SELECT net.http_post(
      url := 'https://exploro-os.com/api/cron/trial-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer e909fdd5939aba3c5b908e3a8e7a5b75'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- NOTE: If you need to update the URL or secret later, unschedule first then reschedule:
-- SELECT cron.unschedule('trial-reminder-daily');
-- Then run the SELECT cron.schedule(...) again with updated values.
