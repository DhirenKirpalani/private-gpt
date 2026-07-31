-- Replace Lemon Squeezy columns with Polar columns on subscriptions table

-- Add new Polar columns
alter table subscriptions
  add column if not exists polar_subscription_id text,
  add column if not exists polar_customer_id text;

-- Migrate existing data from lemonsqueezy columns to polar columns
update subscriptions
  set polar_subscription_id = lemonsqueezy_subscription_id,
      polar_customer_id = lemonsqueezy_customer_id
  where lemonsqueezy_subscription_id is not null
    and polar_subscription_id is null;

-- Drop old Lemon Squeezy columns
alter table subscriptions
  drop column if exists lemonsqueezy_subscription_id,
  drop column if exists lemonsqueezy_customer_id;

-- Index for webhook lookups by Polar subscription ID
create index if not exists idx_subscriptions_polar_subscription_id
  on subscriptions (polar_subscription_id);

-- Drop FastSpring columns (integration removed)
alter table subscriptions
  drop column if exists fastspring_subscription_id,
  drop column if exists fastspring_customer_id,
  drop column if exists fastspring_product_path;
