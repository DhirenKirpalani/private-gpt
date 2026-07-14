-- Add Lemon Squeezy columns to subscriptions table
alter table subscriptions
  add column if not exists lemonsqueezy_subscription_id text,
  add column if not exists lemonsqueezy_customer_id text;

-- Index for webhook lookups by subscription ID
create index if not exists idx_subscriptions_lemonsqueezy_subscription_id
  on subscriptions (lemonsqueezy_subscription_id);
