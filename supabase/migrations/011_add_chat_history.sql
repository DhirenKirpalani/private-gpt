create table if not exists chat_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references chat_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_chat_conversations_user on chat_conversations(user_id, updated_at desc);
create index if not exists idx_chat_messages_conv on chat_messages(conversation_id, created_at);

-- RLS
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

-- Conversations: users see only their own
drop policy if exists chat_conversations_select on chat_conversations;
create policy chat_conversations_select
  on chat_conversations for select
  using (auth.uid() = user_id);

drop policy if exists chat_conversations_insert on chat_conversations;
create policy chat_conversations_insert
  on chat_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists chat_conversations_update on chat_conversations;
create policy chat_conversations_update
  on chat_conversations for update
  using (auth.uid() = user_id);

drop policy if exists chat_conversations_delete on chat_conversations;
create policy chat_conversations_delete
  on chat_conversations for delete
  using (auth.uid() = user_id);

-- Messages: users see messages for their own conversations only
drop policy if exists chat_messages_select on chat_messages;
create policy chat_messages_select
  on chat_messages for select
  using (
    conversation_id in (
      select id from chat_conversations where user_id = auth.uid()
    )
  );

drop policy if exists chat_messages_insert on chat_messages;
create policy chat_messages_insert
  on chat_messages for insert
  with check (
    conversation_id in (
      select id from chat_conversations where user_id = auth.uid()
    )
  );

drop policy if exists chat_messages_delete on chat_messages;
create policy chat_messages_delete
  on chat_messages for delete
  using (
    conversation_id in (
      select id from chat_conversations where user_id = auth.uid()
    )
  );

-- Auto-update updated_at on conversations
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chat_conversations_updated_at on chat_conversations;
create trigger trg_chat_conversations_updated_at
  before update on chat_conversations
  for each row execute function set_updated_at();
