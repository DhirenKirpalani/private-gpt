-- Fix infinite recursion in workspace RLS policies.
--
-- Root cause: workspaces_select queries workspace_members,
-- and workspace_members_select queries workspaces → circular dependency.
--
-- Solution: use SECURITY DEFINER helper functions that bypass RLS,
-- breaking the recursion chain.

-- ── Drop old recursive policies ───────────────────────────────────────────
drop policy if exists workspaces_select        on workspaces;
drop policy if exists workspaces_insert        on workspaces;
drop policy if exists workspaces_update        on workspaces;
drop policy if exists workspaces_delete        on workspaces;

drop policy if exists workspace_members_select on workspace_members;
drop policy if exists workspace_members_insert on workspace_members;
drop policy if exists workspace_members_update on workspace_members;
drop policy if exists workspace_members_delete on workspace_members;

-- ── Security-definer helpers (bypass RLS — no recursion) ─────────────────

-- Returns true if the current user is a member of the given workspace
create or replace function auth_is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$;

-- Returns true if the current user owns the given workspace
create or replace function auth_is_workspace_owner(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspaces
    where id = ws_id
      and owner_id = auth.uid()
  );
$$;

-- ── Workspaces policies ───────────────────────────────────────────────────

create policy workspaces_select on workspaces for select
  using (
    owner_id = auth.uid()
    or auth_is_workspace_member(id)
  );

create policy workspaces_insert on workspaces for insert
  with check (owner_id = auth.uid());

create policy workspaces_update on workspaces for update
  using (owner_id = auth.uid());

create policy workspaces_delete on workspaces for delete
  using (owner_id = auth.uid());

-- ── Workspace members policies ────────────────────────────────────────────

create policy workspace_members_select on workspace_members for select
  using (
    user_id = auth.uid()
    or auth_is_workspace_owner(workspace_id)
  );

create policy workspace_members_insert on workspace_members for insert
  with check (
    auth_is_workspace_owner(workspace_id)
    or user_id = auth.uid()
  );

create policy workspace_members_update on workspace_members for update
  using (auth_is_workspace_owner(workspace_id));

create policy workspace_members_delete on workspace_members for delete
  using (auth_is_workspace_owner(workspace_id));
