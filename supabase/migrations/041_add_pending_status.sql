-- Migration: Add 'pending' status to email_connections check constraint
-- The CRM now saves connections as 'pending' until SMTP verification passes

alter table email_connections drop constraint if exists email_connections_status_check;

alter table email_connections add constraint email_connections_status_check
  check (status in ('connected', 'error', 'disconnected', 'pending'));
