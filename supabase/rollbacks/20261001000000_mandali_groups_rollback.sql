-- Rollback for 20261001000000_mandali_groups.sql
-- Drops the Mandali group/membership foundation. No financial records exist
-- in these tables; groups and their episodes are removed whole.

drop trigger if exists mandali_membership_owner_guard on public.mandali_memberships;
drop function if exists public.mandali_assert_membership_matches_owner();
drop trigger if exists mandalis_owner_integrity on public.mandalis;
drop function if exists public.mandali_assert_owner_integrity();

revoke all on public.mandali_memberships from service_role;
revoke all on public.mandalis from service_role;

drop table if exists public.mandali_memberships;
drop table if exists public.mandalis;
