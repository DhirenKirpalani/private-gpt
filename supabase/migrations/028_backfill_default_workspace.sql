-- Backfill legacy data (workspace_id IS NULL) into each user's oldest workspace.
--
-- This ensures all documents, knowledge categories, and chat conversations that
-- existed before the workspace feature was introduced are visible in the Default workspace.
--
-- Run AFTER 027_rename_workspace_roles.sql

-- Documents: assign to the user's oldest workspace
update documents d
set workspace_id = (
  select w.id from workspaces w
  where w.owner_id = d.user_id
  order by w.created_at asc
  limit 1
)
where d.workspace_id is null
  and exists (
    select 1 from workspaces w where w.owner_id = d.user_id
  );

-- Knowledge categories: assign to the user's oldest workspace
update knowledge_categories kc
set workspace_id = (
  select w.id from workspaces w
  where w.owner_id = kc.user_id
  order by w.created_at asc
  limit 1
)
where kc.workspace_id is null
  and exists (
    select 1 from workspaces w where w.owner_id = kc.user_id
  );

-- Chat conversations: assign to the user's oldest workspace
update chat_conversations cc
set workspace_id = (
  select w.id from workspaces w
  where w.owner_id = cc.user_id
  order by w.created_at asc
  limit 1
)
where cc.workspace_id is null
  and exists (
    select 1 from workspaces w where w.owner_id = cc.user_id
  );
