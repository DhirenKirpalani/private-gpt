-- Add FastSpring columns to the subscriptions table.
-- This allows both Stripe and FastSpring to coexist during migration.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS fastspring_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS fastspring_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS fastspring_product_path TEXT;

-- Create an index for FastSpring subscription lookups (used by webhook)
CREATE INDEX IF NOT EXISTS idx_subscriptions_fastspring_sub_id
  ON subscriptions (fastspring_subscription_id)
  WHERE fastspring_subscription_id IS NOT NULL;
