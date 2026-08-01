-- Remove duplicate telegram messages, keeping the oldest one
delete from telegram_messages
where id in (
  select id from (
    select id,
      row_number() over (
        partition by user_id, tg_message_id, chat_id
        order by created_at asc
      ) as rn
    from telegram_messages
  ) t
  where rn > 1
);

-- Add unique constraint to prevent future duplicates
create unique index if not exists telegram_messages_unique_idx
  on telegram_messages (user_id, tg_message_id, chat_id);
