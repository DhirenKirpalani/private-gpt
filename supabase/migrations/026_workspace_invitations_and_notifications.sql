-- Workspace invitations: token-based invite system
create table if not exists workspace_invitations (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade not null,
  invited_email text not null,
  role          text not null default 'member'
                  check (role in ('owner', 'admin', 'manager', 'member')),
  invited_by    uuid references auth.users(id) on delete set null,
  token         uuid default gen_random_uuid() not null unique,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at    timestamptz default now() not null,
  expires_at    timestamptz default (now() + interval '7 days') not null
);

create index if not exists idx_ws_invitations_token on workspace_invitations(token);
create index if not exists idx_ws_invitations_workspace on workspace_invitations(workspace_id);
create index if not exists idx_ws_invitations_email on workspace_invitations(invited_email);
create index if not exists idx_ws_invitations_status on workspace_invitations(status);

-- Notifications: in-app notification system
create table if not exists notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null default 'system'
               check (type in ('workspace_invite', 'system', 'announcement')),
  title      text not null,
  body       text,
  data       jsonb,
  read       boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_read on notifications(user_id, read);

-- RLS: workspace_invitations
alter table workspace_invitations enable row level security;

create policy ws_invitations_select on workspace_invitations for select
  using (
    invited_by = auth.uid() or
    workspace_id in (select id from workspaces where owner_id = auth.uid()) or
    invited_email in (
      select contact_email from profiles where user_id = auth.uid()
    )
  );

create policy ws_invitations_insert on workspace_invitations for insert
  with check (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

create policy ws_invitations_update on workspace_invitations for update
  using (
    invited_by = auth.uid() or
    workspace_id in (select id from workspaces where owner_id = auth.uid()) or
    invited_email in (
      select contact_email from profiles where user_id = auth.uid()
    )
  );

-- RLS: notifications
alter table notifications enable row level security;

create policy notifications_select on notifications for select
  using (user_id = auth.uid());

create policy notifications_insert on notifications for insert
  with check (true); -- allow server-side inserts via service role

create policy notifications_update on notifications for update
  using (user_id = auth.uid());

create policy notifications_delete on notifications for delete
  using (user_id = auth.uid());
