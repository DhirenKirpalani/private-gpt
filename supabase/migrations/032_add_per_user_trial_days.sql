-- Add per-user trial days override column to profiles
-- NULL = use global default from app_settings.trial_days
-- Non-NULL = use this custom value for this specific user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_days INTEGER;
