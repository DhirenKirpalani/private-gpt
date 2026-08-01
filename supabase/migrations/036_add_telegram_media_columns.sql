-- Add media support to telegram_messages
alter table telegram_messages add column if not exists media_url text;
alter table telegram_messages add column if not exists media_type text;
alter table telegram_messages add column if not exists caption text;

-- Allow media_url to be nullable (text messages won't have it)
comment on column telegram_messages.media_url is 'Supabase storage URL for downloaded media (photos, files)';
comment on column telegram_messages.media_type is 'Type of media: photo, document, video, etc.';
comment on column telegram_messages.caption is 'Caption for media messages';
