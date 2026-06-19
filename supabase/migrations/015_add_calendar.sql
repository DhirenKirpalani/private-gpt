-- Calendar connections and events

create table if not exists calendar_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null default 'google',
  status text not null default 'connected',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  calendar_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references calendar_connections(id) on delete cascade not null,
  event_id text not null,
  summary text,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  attendees jsonb default '[]'::jsonb,
  location text,
  event_link text,
  is_online boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_calendar_connections_user_id on calendar_connections(user_id);
create index if not exists idx_calendar_events_user_id on calendar_events(user_id);
create index if not exists idx_calendar_events_start_time on calendar_events(start_time);
create index if not exists idx_calendar_events_event_id on calendar_events(event_id);

-- RLS
alter table calendar_connections enable row level security;
alter table calendar_events enable row level security;

drop policy if exists calendar_connections_select on calendar_connections;
drop policy if exists calendar_connections_insert on calendar_connections;
drop policy if exists calendar_connections_update on calendar_connections;
drop policy if exists calendar_connections_delete on calendar_connections;

create policy "calendar_connections_select" on calendar_connections for select using (user_id = auth.uid());
create policy "calendar_connections_insert" on calendar_connections for insert with check (user_id = auth.uid());
create policy "calendar_connections_update" on calendar_connections for update using (user_id = auth.uid());
create policy "calendar_connections_delete" on calendar_connections for delete using (user_id = auth.uid());

drop policy if exists calendar_events_select on calendar_events;
drop policy if exists calendar_events_insert on calendar_events;
drop policy if exists calendar_events_delete on calendar_events;

create policy "calendar_events_select" on calendar_events for select using (user_id = auth.uid());
create policy "calendar_events_insert" on calendar_events for insert with check (user_id = auth.uid());
create policy "calendar_events_delete" on calendar_events for delete using (user_id = auth.uid());
