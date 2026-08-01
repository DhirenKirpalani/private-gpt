-- Add attachments column to email_messages for storing image attachments
alter table email_messages add column if not exists attachments jsonb default '[]';
comment on column email_messages.attachments is 'Array of {filename, mimeType, size, data (base64)} for image attachments';
