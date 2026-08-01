-- Add from_phone column to telegram_messages
alter table telegram_messages add column if not exists from_phone text;
comment on column telegram_messages.from_phone is 'Phone number of the sender (if available from Telegram)';
