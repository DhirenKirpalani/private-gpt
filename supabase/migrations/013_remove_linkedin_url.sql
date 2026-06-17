-- Remove linkedin_url column from profiles table
alter table profiles drop column if exists linkedin_url;
