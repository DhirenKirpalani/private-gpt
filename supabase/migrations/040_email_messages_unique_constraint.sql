-- Add unique constraint on message_id + connection_id to prevent duplicate email rows
-- First, remove existing duplicates (keep the earliest created one)
delete from email_messages
where id not in (
  select distinct on (message_id, connection_id) id
  from email_messages
  order by message_id, connection_id, created_at asc
);

-- Then add the unique constraint
alter table email_messages add constraint email_messages_message_id_connection_id_key unique (message_id, connection_id);
