-- Add cache_hit_tokens column to chat_messages
-- Tracks how many prompt tokens hit DeepSeek's cache (charged at lower rate)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS cache_hit_tokens integer DEFAULT 0;
