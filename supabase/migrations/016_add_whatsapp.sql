-- WhatsApp Business Cloud API integration

create table if not exists whatsapp_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  phone_number_id text not null,
  access_token text not null,
  phone_number text,
  display_name text,
  status text not null default 'connected',
  webhook_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists whatsapp_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  connection_id uuid references whatsapp_connections(id) on delete cascade not null,
  direction text not null check (direction in ('sent', 'received')),
  from_number text,
  to_number text,
  wa_message_id text,
  body text,
  timestamp timestamptz,
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_whatsapp_connections_user_id on whatsapp_connections(user_id);
create index if not exists idx_whatsapp_messages_user_id on whatsapp_messages(user_id);
create index if not exists idx_whatsapp_messages_connection_id on whatsapp_messages(connection_id);
create index if not exists idx_whatsapp_messages_timestamp on whatsapp_messages(timestamp desc);

-- RLS
alter table whatsapp_connections enable row level security;
alter table whatsapp_messages enable row level security;

drop policy if exists whatsapp_connections_select on whatsapp_connections;
drop policy if exists whatsapp_connections_insert on whatsapp_connections;
drop policy if exists whatsapp_connections_update on whatsapp_connections;
drop policy if exists whatsapp_connections_delete on whatsapp_connections;

create policy "whatsapp_connections_select" on whatsapp_connections for select using (user_id = auth.uid());
create policy "whatsapp_connections_insert" on whatsapp_connections for insert with check (user_id = auth.uid());
create policy "whatsapp_connections_update" on whatsapp_connections for update using (user_id = auth.uid());
create policy "whatsapp_connections_delete" on whatsapp_connections for delete using (user_id = auth.uid());

drop policy if exists whatsapp_messages_select on whatsapp_messages;
drop policy if exists whatsapp_messages_insert on whatsapp_messages;
drop policy if exists whatsapp_messages_update on whatsapp_messages;
drop policy if exists whatsapp_messages_delete on whatsapp_messages;

create policy "whatsapp_messages_select" on whatsapp_messages for select using (user_id = auth.uid());
create policy "whatsapp_messages_insert" on whatsapp_messages for insert with check (user_id = auth.uid());
create policy "whatsapp_messages_update" on whatsapp_messages for update using (user_id = auth.uid());
create policy "whatsapp_messages_delete" on whatsapp_messages for delete using (user_id = auth.uid());
