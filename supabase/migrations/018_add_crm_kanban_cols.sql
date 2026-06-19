-- CRM Kanban column definitions (persisted per user per board)
create table if not exists crm_kanban_cols (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  board      text not null check (board in ('email', 'messages', 'calendar')),
  col_id     text not null,
  label      text not null,
  color      text not null,
  position   integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists crm_kanban_cols_user_board on crm_kanban_cols (user_id, board);

alter table crm_kanban_cols enable row level security;

create policy "Users manage their own kanban cols"
  on crm_kanban_cols for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
