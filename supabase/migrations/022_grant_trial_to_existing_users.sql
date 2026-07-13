-- Grant a 15-day trial to all existing users who do not have a subscription row.
-- This is idempotent: running it again will only insert rows for users who still don't have one.

insert into subscriptions (user_id, status, current_period_start, current_period_end, plan, cancel_at_period_end)
select
  id,
  'trialing',
  now(),
  now() + interval '15 days',
  null,
  false
from auth.users
where not exists (
  select 1 from subscriptions s where s.user_id = auth.users.id
);
