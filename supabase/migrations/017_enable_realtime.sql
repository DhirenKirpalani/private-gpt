-- Enable Realtime for CRM tables
-- Run this in Supabase Dashboard → SQL Editor

-- Realtime requires replica identity full for UPDATE/DELETE tracking
alter table email_messages replica identity full;
alter table calendar_events replica identity full;
alter table contacts replica identity full;

-- Note: You also need to enable Realtime for these tables in the Supabase Dashboard:
-- Database → Realtime → Toggle ON for: email_messages, calendar_events, contacts
