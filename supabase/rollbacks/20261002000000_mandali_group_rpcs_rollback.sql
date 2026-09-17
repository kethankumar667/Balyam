-- Rollback for 20261002000000_mandali_group_rpcs.sql

revoke all on function public.mandali_create_group(text, text, text, integer) from service_role;
drop function if exists public.mandali_create_group(text, text, text, integer);
