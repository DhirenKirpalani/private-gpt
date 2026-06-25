-- Subscriptions table for Stripe integration

create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,

  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  status text check (status in ('active','canceled','incomplete','incomplete_expired','past_due','paused','trialing','unpaid')),
  plan text check (plan in ('solo','team','enterprise')),

  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table subscriptions enable row level security;

-- Users can read only their own subscription
create policy "Users can read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Server-side webhook handler can insert/update (via service role key)
-- No insert/update policies for authenticated users — server manages this
create policy "Service role can manage subscriptions"
  on subscriptions for all
  to service_role
  using (true)
  with check (true);

-- Auto-update updated_at
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row
  execute function handle_updated_at();
