-- Add table to persist kanban card-to-column mappings
create table if not exists crm_kanban_card_cols (
  user_id uuid not null,
  board text not null,
  card_id text not null,
  col_id text not null,
  updated_at timestamptz default now(),
  primary key (user_id, board, card_id)
);

alter table crm_kanban_card_cols enable row level security;
create policy "Users can manage their own card cols" on crm_kanban_card_cols
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
