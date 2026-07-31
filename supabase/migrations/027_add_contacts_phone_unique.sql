-- Add unique index on user_id + phone for Telegram contact dedup
create unique index if not exists idx_contacts_user_phone
  on contacts(user_id, phone) where phone is not null;
