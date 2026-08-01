-- Add UPDATE policy for chat_messages so users can update their own messages
-- (needed for action button state persistence after sending email/WhatsApp/Telegram)

drop policy if exists chat_messages_update on chat_messages;
create policy chat_messages_update
  on chat_messages for update
  using (
    conversation_id in (
      select id from chat_conversations where user_id = auth.uid()
    )
  );
