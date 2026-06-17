-- Add parsed text storage for knowledge base documents
alter table documents add column if not exists parsed_text text;
