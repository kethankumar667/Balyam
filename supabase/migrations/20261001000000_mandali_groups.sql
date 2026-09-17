-- BHALYAM Mandali — private player circles (P2 schema foundation)
-- Migration: 20261001000000_mandali_groups.sql
--
-- ── Purpose ─────────────────────────────────────────────────────────────
-- Durable storage for private groups: the group row and its membership
-- episodes. Creation establishes the owner atomically; every later membership
-- arrives through a PENDING row that an owner/admin approves. Nothing here
-- admits a member by itself — approval is a server transaction, not a table.
--
-- ── Identity ────────────────────────────────────────────────────────────
-- user_id references public.player_identities(player_id): the same stable
-- identity the rest of the platform uses. Mandali authorization additionally
-- requires a current eligible verified account at the API layer
-- (server/src/mandali/); the FK guarantees the identity row exists, never
-- that the account is currently eligible — that is always a live check.
--
-- ── RLS posture ─────────────────────────────────────────────────────────
-- Enabled and FORCED with NO policy for anon/authenticated: a direct browser
-- query returns zero rows regardless of any future client. All access flows
-- through the server's service credential, whose every action is authorized
-- in server code first. The default-deny is the point.
--
-- ── Ownership integrity ─────────────────────────────────────────────────
-- "Exactly one eligible owner for a live group" is enforced at COMMIT time
-- by DEFERRED constraint triggers, not merely by an index that permits zero:
-- two transactions racing to leave a group ownerless cannot both commit.
-- The immediate membership guard additionally forces the pointer-first
-- discipline on owner transfer (move mandalis.owner_id, then re-role rows).
--
-- Operational consequence, deliberate: deleting a user who still owns a live
-- group aborts the cascade (the integrity check fires at commit). Succession
-- or archive must happen first, in the server workflow — an explicit error
-- beats a silently ownerless group.
--
-- ── Episodes and the visibility floor ───────────────────────────────────
-- Memberships are append-only episodes (left_at closes one). A rejoining
-- member's read access starts at their latest approved episode's joined_at.
-- Unban does not restore membership; rejoining creates a fresh episode row.

create table if not exists public.mandalis (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  owner_id     text not null references public.player_identities (player_id),
  -- Pilot default 32; the application layer reads this per row, so a future
  -- per-tier change is data, not a migration. (The plan's 2-owned-groups
  -- account limit is application logic, deliberately not a unique index —
  -- one owner may legitimately hold two active groups.)
  max_members  integer not null default 32 check (max_members between 2 and 128),
  version      integer not null default 1,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint mandali_name_length check (char_length(btrim(name)) between 1 and 64),
  constraint mandali_description_length check (description is null or char_length(description) <= 280)
);

comment on table public.mandalis is
  'A private group. Exactly one live owner, established at creation and enforced at commit; archived groups are read-only tombstones, never deleted.';

create index if not exists mandalis_owner_idx
  on public.mandalis (owner_id)
  where archived_at is null;

-- ═══════════════════════════ Memberships ═══════════════════════════

create table if not exists public.mandali_memberships (
  id          uuid primary key default gen_random_uuid(),
  mandali_id  uuid not null references public.mandalis (id) on delete cascade,
  user_id     text not null references public.player_identities (player_id) on delete cascade,
  role        text not null check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  status      text not null check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  -- Visibility floor: chat reads start no earlier than the current approved
  -- episode's joined_at. Null until approval.
  joined_at   timestamptz,
  left_at     timestamptz,
  requested_at timestamptz not null default now(),
  decided_by  text references public.player_identities (player_id),
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint mandali_membership_episode_shape check (
    -- Approved: has joined (a closed episode keeps both timestamps).
    (status = 'APPROVED' and joined_at is not null)
    -- PENDING: never joined, never decided, never left.
    or (status = 'PENDING' and joined_at is null and decided_at is null and left_at is null)
    -- Decided-away: the request was answered without membership.
    or (status in ('REJECTED', 'WITHDRAWN') and decided_at is not null and joined_at is null and left_at is null)
  )
);

comment on table public.mandali_memberships is
  'Append-only membership episodes and join requests. Approval creates the APPROVED episode; leave/rejection closes it. Rejoin is a fresh episode with a fresh visibility floor.';

-- One live episode per (group, user): at most one of PENDING or APPROVED.
-- A second request while one is open is impossible; a rejoin after a closed
-- episode is a new row.
create unique index if not exists mandali_membership_live_episode_idx
  on public.mandali_memberships (mandali_id, user_id)
  where status in ('PENDING', 'APPROVED') and left_at is null;

-- Query patterns: pending approvals queue; a user's memberships; group roster.
create index if not exists mandali_membership_pending_idx
  on public.mandali_memberships (mandali_id, requested_at)
  where status = 'PENDING';
create index if not exists mandali_membership_user_idx
  on public.mandali_memberships (user_id, status);
create index if not exists mandali_membership_roster_idx
  on public.mandali_memberships (mandali_id, status);

-- ═══════════════════════════ Row Level Security ═══════════════════════════

alter table public.mandalis enable row level security;
alter table public.mandalis force row level security;
alter table public.mandali_memberships enable row level security;
alter table public.mandali_memberships force row level security;

-- No policy for anon/authenticated exists, so forced RLS already denies them
-- everything; the explicit revocation keeps future default-grant drift from
-- quietly reopening a read path.
revoke all on public.mandalis from anon, authenticated;
revoke all on public.mandali_memberships from anon, authenticated;

-- ═══════════════════════════ Integrity functions ═══════════════════════════
--
-- One shared check, two callers. An empty search_path with fully qualified
-- names keeps the functions immune to search_path hijacking, which is the
-- standard posture for anything a trigger runs on server data.

create or replace function public.mandali_assert_live_owner_integrity(p_mandali_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_archived timestamptz;
  v_owner_id text;
  v_owner_user text;
  v_live_owners integer;
begin
  select archived_at, owner_id into v_archived, v_owner_id
  from public.mandalis where id = p_mandali_id;

  -- No group (already gone) or archived tombstone: nothing to assert.
  if v_archived is not null or v_owner_id is null then
    return true;
  end if;

  select count(*) into v_live_owners
  from public.mandali_memberships m
  where m.mandali_id = p_mandali_id
    and m.role = 'OWNER'
    and m.status = 'APPROVED'
    and m.left_at is null;

  if v_live_owners <> 1 then
    raise exception 'mandali % must have exactly one live OWNER membership, found %', p_mandali_id, v_live_owners;
  end if;

  if not exists (
    select 1 from public.mandali_memberships m
    where m.mandali_id = p_mandali_id
      and m.role = 'OWNER'
      and m.status = 'APPROVED'
      and m.left_at is null
      and m.user_id = v_owner_id
  ) then
    raise exception 'mandali % owner pointer (%) does not match its live OWNER membership', p_mandali_id, v_owner_id;
  end if;

  return true;
end;
$$;

-- Immediate guard: cheap, early, precise errors on the membership row itself.
-- Owner rows must be approved, live, and name exactly the group's owner
-- pointer — which forces owner transfer to move the pointer FIRST.
create or replace function public.mandali_membership_owner_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_archived timestamptz;
  v_owner_id text;
begin
  select archived_at, owner_id into v_archived, v_owner_id
  from public.mandalis where id = new.mandali_id;

  if v_owner_id is null or v_archived is not null then
    -- Group gone, or archived tombstone: no owner invariant to hold.
    return new;
  end if;

  if new.role = 'OWNER' then
    if new.status <> 'APPROVED' or new.left_at is not null then
      raise exception 'the OWNER membership of mandali % must be APPROVED and live', new.mandali_id;
    end if;
    if new.user_id <> v_owner_id then
      raise exception 'the OWNER membership of mandali % must name its owner (%) — move the pointer first', new.mandali_id, v_owner_id;
    end if;
  end if;

  return new;
end;
$$;

-- Constraint triggers need a row-shaped wrapper: the shared check takes an
-- id, the trigger supplies it from NEW or OLD depending on the operation.
create or replace function public.mandali_assert_live_owner_integrity_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_TABLE_NAME = 'mandalis' then
    perform public.mandali_assert_live_owner_integrity(new.id);
  else
    perform public.mandali_assert_live_owner_integrity(coalesce(new.mandali_id, old.mandali_id));
  end if;
  return null;
end;
$$;

-- ═══════════════════════════ Commit-time enforcement ═══════════════════════════
--
-- DEFERRABLE INITIALLY DEFERRED, so the atomic creation sequence
-- (insert group → insert owner membership) is legal inside one transaction
-- and the invariant is still checked before COMMIT. Two racing transactions
-- that each try to end with zero owners cannot both commit.

-- CREATE CONSTRAINT TRIGGER has no IF NOT EXISTS, so re-runnability is done
-- the way the roles block above does it: conditionally, in a DO block.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'mandali_membership_integrity'
                 and tgrelid = 'public.mandali_memberships'::regclass) then
    create constraint trigger mandali_membership_integrity
      after insert or update or delete on public.mandali_memberships
      deferrable initially deferred
      for each row
      execute function public.mandali_assert_live_owner_integrity_trigger();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'mandalis_owner_integrity'
                 and tgrelid = 'public.mandalis'::regclass) then
    create constraint trigger mandalis_owner_integrity
      after insert or update of owner_id, archived_at on public.mandalis
      deferrable initially deferred
      for each row
      execute function public.mandali_assert_live_owner_integrity_trigger();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'mandali_membership_owner_guard'
                 and tgrelid = 'public.mandali_memberships'::regclass) then
    create trigger mandali_membership_owner_guard
      before insert or update of role, status, left_at on public.mandali_memberships
      for each row
      execute function public.mandali_membership_owner_guard();
  end if;
end $$;

-- ═══════════════════════════ Server-role grants ═══════════════════════════
--
-- Only the server's service credential works these tables; there is no
-- per-user RPC surface yet, so there is nothing for authenticated roles to
-- execute. When RPCs arrive (P3/P4), they are created with constrained
-- search_path and granted explicitly, one by one.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.mandalis to service_role;
grant select, insert, update, delete on public.mandali_memberships to service_role;
