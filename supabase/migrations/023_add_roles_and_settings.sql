-- Add role column to profiles for RBAC
alter table profiles add column role text check (role in ('user', 'manager', 'admin', 'super_admin')) default 'user';

-- Create app_settings table for global configuration (e.g., trial period)
create table app_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS on app_settings
alter table app_settings enable row level security;

-- All authenticated users can read app settings
create policy "Authenticated users can read app settings"
  on app_settings for select
  to authenticated
  using (true);

-- Only super admins can update app settings
create policy "Super admins can update app settings"
  on app_settings for update
  to authenticated
  using (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'super_admin')
  )
  with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'super_admin')
  );

-- Only super admins can insert app settings
create policy "Super admins can insert app settings"
  on app_settings for insert
  to authenticated
  with check (
    exists (select 1 from profiles where user_id = auth.uid() and role = 'super_admin')
  );

-- Default trial period: 15 days
insert into app_settings (key, value) values ('trial_days', '15') on conflict (key) do nothing;

-- Grant super_admin role to the owner account
update profiles
set role = 'super_admin'
where user_id = (
  select id from auth.users where email = 'dhirenkirpalani2308@gmail.com' limit 1
);
