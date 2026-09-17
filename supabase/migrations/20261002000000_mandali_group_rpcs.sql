-- BHALYAM Mandali — atomic creation RPC (P2)
-- Migration: 20261002000000_mandali_group_rpcs.sql
--
-- ── Why an RPC and not two PostgREST calls ──────────────────────────────
-- Creation must establish group + owner membership in ONE transaction — the
-- commit-time owner triggers make that a hard requirement, not a preference:
-- a group row inserted alone cannot commit. PostgREST cannot span two tables
-- in one transaction; a Postgres function can.
--
-- ── Security posture ────────────────────────────────────────────────────
-- Invoker rights: the server's service_role (bypassrls) calls this; there is
-- no per-user surface. Execute is revoked from public/anon/authenticated and
-- granted to service_role only. search_path is pinned empty — the function
-- only touches fully qualified names, so it cannot be hijacked by a hostile
-- schema placement.

create or replace function public.mandali_create_group(
  p_name        text,
  p_description text,
  p_owner_id    text,
  p_max_members integer
)
returns public.mandalis
language plpgsql
as $$
declare
  g public.mandalis;
begin
  -- Pilot limit: 2 live owned groups per account.
  --
  -- The count alone is not race-proof under READ COMMITTED: two concurrent
  -- creations can each count one other group and both commit (observed in
  -- scripts/persistence/verifyMandaliSchema.mjs's concurrency check — the
  -- check found the defect, do not weaken the test to match). The advisory
  -- lock serializes creations per owner for the transaction's duration; the
  -- count then reads a settled state. xact-scoped: it releases at commit or
  -- rollback with no cleanup path to forget.
  perform pg_advisory_xact_lock(hashtextextended('mandali_owned_limit:' || p_owner_id, 0));

  if (
    select count(*) from public.mandalis m
    where m.owner_id = p_owner_id and m.archived_at is null
  ) >= 2 then
    raise exception 'owned-group limit reached' using errcode = 'MN001';
  end if;

  insert into public.mandalis (name, description, owner_id, max_members)
  values (p_name, p_description, p_owner_id, p_max_members)
  returning * into g;

  insert into public.mandali_memberships (mandali_id, user_id, role, status, joined_at)
  values (g.id, p_owner_id, 'OWNER', 'APPROVED', now());

  return g;
end;
$$;

revoke all on function public.mandali_create_group(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.mandali_create_group(text, text, text, integer) to service_role;
