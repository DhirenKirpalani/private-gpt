-- Workspaces: a company can have multiple workspaces (e.g. Marketing, Finance)
create table if not exists workspaces (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text,
  icon        text default '🏢',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Workspace members: who has access and at what role
create table if not exists workspace_members (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text not null default 'editor'
                 check (role in ('owner', 'editor', 'viewer')),
  invited_by   uuid references auth.users(id),
  created_at   timestamptz default now() not null,
  unique(workspace_id, user_id)
);

-- Scope documents to a workspace (nullable for backward compat)
alter table documents
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- Scope knowledge categories to a workspace
alter table knowledge_categories
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- Scope chat conversations to a workspace
alter table chat_conversations
  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- Indexes
create index if not exists idx_workspaces_owner on workspaces(owner_id);
create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_documents_workspace on documents(workspace_id);
create index if not exists idx_knowledge_categories_workspace on knowledge_categories(workspace_id);
create index if not exists idx_chat_conversations_workspace on chat_conversations(workspace_id);

-- RLS: workspaces
alter table workspaces enable row level security;

create policy workspaces_select on workspaces for select
  using (
    owner_id = auth.uid() or
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy workspaces_insert on workspaces for insert
  with check (owner_id = auth.uid());

create policy workspaces_update on workspaces for update
  using (owner_id = auth.uid());

create policy workspaces_delete on workspaces for delete
  using (owner_id = auth.uid());

-- RLS: workspace_members
alter table workspace_members enable row level security;

create policy workspace_members_select on workspace_members for select
  using (
    user_id = auth.uid() or
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy workspace_members_insert on workspace_members for insert
  with check (
    workspace_id in (select id from workspaces where owner_id = auth.uid()) or
    user_id = auth.uid()
  );

create policy workspace_members_update on workspace_members for update
  using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy workspace_members_delete on workspace_members for delete
  using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- Auto-update updated_at on workspaces
create or replace function set_workspace_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workspaces_updated_at on workspaces;
create trigger trg_workspaces_updated_at
  before update on workspaces
  for each row execute function set_workspace_updated_at();
