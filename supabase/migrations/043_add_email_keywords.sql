-- Add email_keywords column to profiles table
-- Stores an array of user-defined keywords for email filtering
-- If set, only emails whose subject contains at least one of these keywords will be fetched
-- If null/empty, falls back to the hardcoded BUSINESS_KEYWORDS list

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_keywords text[] DEFAULT NULL;
