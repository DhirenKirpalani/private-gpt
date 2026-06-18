-- Add message_id_header column for proper In-Reply-To threading
alter table email_messages add column if not exists message_id_header text;
