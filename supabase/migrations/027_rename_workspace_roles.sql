-- Rename workspace member roles to align with platform role language:
--   editor → admin
--   viewer → member
--
-- Run AFTER 026_fix_workspace_rls.sql

-- Update any existing rows (safe if table is empty)
update workspace_members set role = 'admin'  where role = 'editor';
update workspace_members set role = 'member' where role = 'viewer';

-- Drop the old check constraint and default, add the new ones
alter table workspace_members
  alter column role set default 'admin';

alter table workspace_members
  drop constraint if exists workspace_members_role_check;

alter table workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner', 'admin', 'member'));
