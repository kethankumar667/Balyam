-- BHALYAM Economy — Durable Terminal-Intent Recovery (Blocker 06)
--
-- Migration: 20260901000000_economy_terminal_intents.sql
-- Status: DRAFT — additive to 20260826000000_economy_v1.sql,
-- 20260828000000_economy_abandonment_forfeiture.sql, and
-- 20260830000000_economy_settlement_events.sql. Not yet applied or
-- runtime-verified against a live Postgres instance — see the Blocker 06
-- implementation report's "Real-PostgreSQL results" section for the exact
-- verification boundary.
--
-- ── The gap this closes (F-1, P1, Economy V1 certification audit) ────────
-- `EconomySettlementQueue` (server/src/rooms/economySettlementQueue.ts) is a
-- process-local `Promise` chain. If the server exits between a match
-- reaching a terminal gameplay outcome and that queued
-- settle/refund/forfeit RPC actually executing, the queued operation is
-- gone. The match's `match_economy_settlements` row is durable and stays
-- `COMMITTED` — money is not destroyed — but nothing automatically moves it
-- to a terminal accounting status, and `list_stale_committed_settlements`
-- (H1's own remediation, see that migration's header) is read-only: it can
-- SURFACE a stuck match, never resolve one.
--
-- ── Why not "guess from stale COMMITTED status" ───────────────────────────
-- This project already rejected exactly that approach once, in the H1
-- finding this migration's own predecessor documents: "an automatic refund
-- sweep was described in docs but does not exist... a human/ops process
-- decides." A stale `COMMITTED` row alone does not say whether the intended
-- outcome was a settlement (and if so, with which authoritative ranking),
-- a refund (with which reason), or a forfeiture (with which reason) — see
-- `economyPlacements.ts`'s own header for how much game-specific derivation
-- goes into a ranking before it ever reaches the economy layer. Guessing
-- risks paying the wrong participant or forfeiting a match that should have
-- refunded. This migration instead makes the ALREADY-DECIDED intent durable
-- — the complete, authoritative payload `RoomManager` already computed —
-- before it is ever handed to the (still in-memory, still not durable on
-- its own) queue for asynchronous processing.
--
-- ── Design summary ─────────────────────────────────────────────────────
-- One `economy_terminal_intents` row per match (`UNIQUE(match_id)`),
-- recording exactly which of SETTLEMENT/REFUND/FORFEITURE was selected and
-- the complete payload needed to replay it — never a bare match id. A
-- worker claims eligible rows via `FOR UPDATE SKIP LOCKED` (the standard,
-- safe Postgres job-queue primitive — deliberately NOT the
-- `pg_advisory_xact_lock` pattern the existing financial RPCs use, which
-- serializes concurrent CALLS for the SAME key; this is the opposite
-- problem, many workers competing for DIFFERENT rows), processes through
-- the EXISTING, already-idempotent `settle_match_economy` /
-- `refund_match_entry` / `forfeit_match_entry` RPCs unchanged, and marks the
-- intent completed only after that call returns successfully (including an
-- authoritative idempotent replay). If the worker dies after claiming but
-- before completing, the lease expires and another worker reclaims it; the
-- underlying financial RPC's own idempotency (unchanged by this migration)
-- makes that replay safe regardless of whether the first attempt actually
-- reached the database.
--
-- ── What this migration deliberately does NOT change ─────────────────────
-- No change to `commit_match_entry`, `settle_match_economy`,
-- `refund_match_entry`, `forfeit_match_entry`, `economy_apply_refund`, or
-- any prize/placement/wallet/voucher/world-bank calculation. This is a
-- durable dispatch layer in front of those functions, not a replacement for
-- any of them.

-- ═══════════════════════ 1. Table: economy_terminal_intents ══════════════

create table if not exists public.economy_terminal_intents (
  id                   uuid primary key default gen_random_uuid(),
  -- One authoritative active intent per match — see the header. A match
  -- that somehow needs a second recorded attempt (a genuine correction, not
  -- a routine replay) requires an explicit, audited, out-of-band DB
  -- intervention, exactly like `ADMIN_ADJUSTMENT`/`ADMIN_CORRECTION`
  -- elsewhere in this schema — never a second row silently created here.
  match_id             text not null references public.match_economy_settlements (match_id) on delete restrict,
  operation_kind       text not null check (operation_kind in ('SETTLEMENT', 'REFUND', 'FORFEITURE')),
  -- Bumped only if this payload's shape ever needs to change incompatibly.
  -- The worker must refuse to process a payload_version it does not
  -- recognize rather than guess at a migrated shape.
  payload_version      integer not null default 1 check (payload_version >= 1),
  -- The COMPLETE replay payload — see the TypeScript
  -- `TerminalIntentPayload` union this mirrors exactly (SettlementIntentPayload
  -- carries the authoritative ranked participants; Refund/ForfeitureIntentPayload
  -- carry the authoritative reason). Never just `{ matchId }` — see the
  -- header's "why not guess" section. Never a raw voucher code (voucher
  -- codes are generated fresh, inside `settle_match_economy`'s own call,
  -- at processing time — nothing about a voucher is ever persisted here).
  payload              jsonb not null,
  status               text not null default 'PENDING' check (
                          status in ('PENDING', 'PROCESSING', 'RETRYABLE', 'COMPLETED', 'FAILED')
                        ),
  attempt_count        integer not null default 0 check (attempt_count >= 0),
  next_attempt_at      timestamptz not null default now(),
  claim_owner          text,
  claimed_at           timestamptz,
  lease_expires_at     timestamptz,
  -- The stable `.code` from `EconomyServiceError`/`EconomyRepositoryError` —
  -- never a raw stack trace or a full error message (both may contain
  -- PostgREST/Postgres detail this schema does not want to retain
  -- unbounded, mirroring `EconomyService.wrapUnexpected`'s own existing
  -- "detail stays in the log, never on the object" discipline).
  last_error_code      text,
  last_error_category  text check (last_error_category is null or last_error_category in ('BUSINESS', 'INFRASTRUCTURE', 'UNKNOWN')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,

  constraint economy_terminal_intents_match_id_unique unique (match_id),
  constraint economy_terminal_intents_claim_consistency check (
    (status in ('PENDING', 'RETRYABLE', 'FAILED') and claim_owner is null and claimed_at is null and lease_expires_at is null) or
    (status = 'PROCESSING' and claim_owner is not null and claimed_at is not null and lease_expires_at is not null) or
    (status = 'COMPLETED')
  ),
  constraint economy_terminal_intents_completed_at_consistency check (
    (status = 'COMPLETED' and completed_at is not null) or
    (status <> 'COMPLETED' and completed_at is null)
  )
);

comment on table public.economy_terminal_intents is
  'Durable record of the ALREADY-DECIDED terminal economy operation for a match (Blocker 06) — never a bare match id. Recovery replays this recorded intent; it never infers settlement/refund/forfeiture from a stale COMMITTED match_economy_settlements row alone.';

create index if not exists economy_terminal_intents_claim_idx
  on public.economy_terminal_intents (status, next_attempt_at)
  where status in ('PENDING', 'RETRYABLE');

create index if not exists economy_terminal_intents_lease_idx
  on public.economy_terminal_intents (lease_expires_at)
  where status = 'PROCESSING';

create index if not exists economy_terminal_intents_status_idx
  on public.economy_terminal_intents (status, created_at desc);

drop trigger if exists touch_economy_terminal_intents_updated_at on public.economy_terminal_intents;
create trigger touch_economy_terminal_intents_updated_at
  before update on public.economy_terminal_intents
  for each row execute function public.touch_updated_at();

-- ═══════════════════════ 2. RLS & privilege hardening ═════════════════════
-- Same discipline as every other economy table in this schema (see
-- 20260826000000_economy_v1.sql §13's own comment): service_role gets SELECT
-- only, direct writes are revoked from every role including service_role,
-- and every mutation is RPC-only, `SECURITY DEFINER`, explicitly granted.

alter table public.economy_terminal_intents enable row level security;
alter table public.economy_terminal_intents force row level security;

revoke insert, update, delete, truncate, references, trigger on table public.economy_terminal_intents from public, anon, authenticated, service_role;
revoke select on table public.economy_terminal_intents from public, anon, authenticated;
grant select on table public.economy_terminal_intents to service_role;

-- No policy for `authenticated`/`anon` at all — unlike `coin_wallets`/
-- `coin_ledger_entries`, a terminal intent is never "the current player's
-- own data" the way a wallet or ledger row is; it is platform-internal
-- dispatch state. There is no player-facing read for this table.

-- ═══════════════════════ 3. create_terminal_intent ════════════════════════
--
-- Idempotent by `match_id` (the natural key here, not a synthetic
-- idempotency string — `UNIQUE(match_id)` already is the idempotency
-- mechanism). Three outcomes:
--   - no existing row: insert, return created:true, conflict:false
--   - existing row, SAME operation_kind, SAME payload_version, and SEMANTICALLY IDENTICAL payload:
--     idempotent no-op, created:false, conflict:false (a duplicate enqueue with the same
--     intended operation and authoritative payload is safe to replay)
--   - existing row, DIFFERENT operation_kind, DIFFERENT payload_version, or DIFFERENT payload:
--     refuse to mutate the authoritative row — created:false, conflict:true.
--     Two conflicting lifecycle paths or diverging payloads must never be allowed to silently
--     overwrite or masquerade as each other.
create or replace function public.create_terminal_intent(
  p_match_id        text,
  p_operation_kind  text,
  p_payload         jsonb,
  p_payload_version integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing    public.economy_terminal_intents;
  v_intent      public.economy_terminal_intents;
  v_lock_key    text := 'terminal-intent:' || p_match_id;
  v_version     integer := coalesce(p_payload_version, 1);
begin
  if p_match_id is null or length(trim(p_match_id)) = 0 then
    raise exception 'INVALID_MATCH_ID: match id must not be empty';
  end if;
  if p_operation_kind not in ('SETTLEMENT', 'REFUND', 'FORFEITURE') then
    raise exception 'INVALID_OPERATION_KIND: % is not a supported terminal operation', p_operation_kind;
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'INVALID_PAYLOAD: payload must be a non-null JSON object';
  end if;
  if v_version < 1 then
    raise exception 'INVALID_PAYLOAD_VERSION: payload version must be at least 1';
  end if;

  -- 1. Deliberate transaction-level advisory serialization per match_id.
  -- Serializes concurrent creations for a brand-new match_id before any row exists to lock with FOR UPDATE.
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  -- 2. Row-level lock on existing intent if already present.
  select * into v_existing from public.economy_terminal_intents where match_id = p_match_id for update;

  if found then
    if v_existing.operation_kind = p_operation_kind
       and v_existing.payload_version = v_version
       and v_existing.payload = p_payload then
      return jsonb_build_object('created', false, 'conflict', false, 'intent', to_jsonb(v_existing));
    end if;
    return jsonb_build_object('created', false, 'conflict', true, 'intent', to_jsonb(v_existing));
  end if;

  -- 3. Insert brand-new intent. Wrapped defensively so no raw unique-violation can escape
  -- even if invoked outside advisory locking.
  begin
    insert into public.economy_terminal_intents (
      match_id, operation_kind, payload_version, payload
    ) values (
      p_match_id, p_operation_kind, v_version, p_payload
    )
    returning * into v_intent;

    return jsonb_build_object('created', true, 'conflict', false, 'intent', to_jsonb(v_intent));
  exception
    when unique_violation then
      select * into v_existing from public.economy_terminal_intents where match_id = p_match_id for update;
      if found then
        if v_existing.operation_kind = p_operation_kind
           and v_existing.payload_version = v_version
           and v_existing.payload = p_payload then
          return jsonb_build_object('created', false, 'conflict', false, 'intent', to_jsonb(v_existing));
        end if;
        return jsonb_build_object('created', false, 'conflict', true, 'intent', to_jsonb(v_existing));
      end if;
      raise;
  end;
end;
$$;

revoke all on function public.create_terminal_intent(text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.create_terminal_intent(text, text, jsonb, integer) to service_role;

-- ═══════════════════════ 4. claim_terminal_intent ═════════════════════════
--
-- `FOR UPDATE SKIP LOCKED`, not an advisory lock — the correct primitive
-- for "many workers competing for different rows in a queue" (as opposed to
-- "serialize concurrent callers of the same key", which is what every other
-- advisory-locked RPC in this schema does). A single atomic UPDATE ... FROM
-- a locked candidate CTE: two concurrent callers can never claim the same
-- row, and a caller that finds nothing eligible gets claimed:false rather
-- than blocking.
create or replace function public.claim_terminal_intent(
  p_worker_id     text,
  p_lease_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'INVALID_WORKER_ID: worker id must not be empty';
  end if;
  if p_lease_seconds not between 1 and 3600 then
    raise exception 'INVALID_LEASE_SECONDS: lease must be between 1 and 3600 seconds';
  end if;

  with candidate as (
    select id
    from public.economy_terminal_intents
    where status = 'PENDING'
       or (status = 'RETRYABLE' and next_attempt_at <= now())
       or (status = 'PROCESSING' and lease_expires_at <= now())
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.economy_terminal_intents t
  set status           = 'PROCESSING',
      claim_owner      = p_worker_id,
      claimed_at       = now(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempt_count    = t.attempt_count + 1,
      last_error_code     = null,
      last_error_category = null
  from candidate
  where t.id = candidate.id
  returning t.* into v_intent;

  if not found then
    return jsonb_build_object('claimed', false, 'intent', null);
  end if;

  return jsonb_build_object('claimed', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.claim_terminal_intent(text, integer) from public, anon, authenticated;
grant execute on function public.claim_terminal_intent(text, integer) to service_role;

-- ═══════════════════════ 5. complete_terminal_intent ══════════════════════
--
-- Deliberately permissive about `claim_owner`: if this intent was reclaimed
-- by a DIFFERENT worker after the original owner's lease expired (the
-- "operation succeeded but acknowledgement failed" scenario Phase 6 Test D
-- requires), the reclaiming worker calls the underlying financial RPC
-- itself — which returns an authoritative idempotent `applied:false` no-op
-- — and then legitimately completes the SAME intent under ITS OWN worker
-- id. The safety net is the financial RPC's own idempotency, not a strict
-- claim-owner match here.
create or replace function public.complete_terminal_intent(
  p_intent_id uuid,
  p_worker_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  select * into v_intent from public.economy_terminal_intents where id = p_intent_id for update;
  if not found then
    raise exception 'INTENT_NOT_FOUND: terminal intent % does not exist', p_intent_id;
  end if;

  if v_intent.status = 'COMPLETED' then
    return jsonb_build_object('updated', false, 'intent', to_jsonb(v_intent));
  end if;

  update public.economy_terminal_intents
  set status           = 'COMPLETED',
      claim_owner      = p_worker_id,
      completed_at     = now(),
      lease_expires_at = null
  where id = p_intent_id
  returning * into v_intent;

  return jsonb_build_object('updated', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.complete_terminal_intent(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_terminal_intent(uuid, text) to service_role;

-- ═══════════════════════ 6. mark_terminal_intent_retryable ════════════════
--
-- For a classified `INFRASTRUCTURE` failure only (the SAME classification
-- `EconomyService.withRetry` already applies to every other economy call —
-- this migration does not invent a second policy). Releases the claim so
-- another worker (or this one, later) can pick it back up once
-- `next_attempt_at` arrives.
create or replace function public.mark_terminal_intent_retryable(
  p_intent_id      uuid,
  p_worker_id      text,
  p_error_code     text,
  p_error_category text,
  p_next_attempt_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  select * into v_intent from public.economy_terminal_intents where id = p_intent_id for update;
  if not found then
    raise exception 'INTENT_NOT_FOUND: terminal intent % does not exist', p_intent_id;
  end if;
  if v_intent.status = 'COMPLETED' then
    -- Never regress a completed intent — a stale worker's retry classification
    -- arriving after someone else already completed it is a safe no-op.
    return jsonb_build_object('updated', false, 'intent', to_jsonb(v_intent));
  end if;

  update public.economy_terminal_intents
  set status               = 'RETRYABLE',
      claim_owner          = null,
      claimed_at           = null,
      lease_expires_at     = null,
      next_attempt_at      = p_next_attempt_at,
      last_error_code      = p_error_code,
      last_error_category  = coalesce(p_error_category, 'UNKNOWN')
  where id = p_intent_id
  returning * into v_intent;

  return jsonb_build_object('updated', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.mark_terminal_intent_retryable(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_terminal_intent_retryable(uuid, text, text, text, timestamptz) to service_role;

-- ═══════════════════════ 7. mark_terminal_intent_failed ═══════════════════
--
-- Terminal, for a classified `BUSINESS` failure (never retried — retrying a
-- business rejection changes nothing about why it failed, same reasoning as
-- `EconomyService.withRetry`'s own policy) or a conflicting-terminal-state
-- discovery (Phase 8: "record a race-lost or permanent-conflict result...
-- do not overwrite it"). Requires operator action via
-- `retry_terminal_intent` to ever move again.
create or replace function public.mark_terminal_intent_failed(
  p_intent_id      uuid,
  p_worker_id      text,
  p_error_code     text,
  p_error_category text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  select * into v_intent from public.economy_terminal_intents where id = p_intent_id for update;
  if not found then
    raise exception 'INTENT_NOT_FOUND: terminal intent % does not exist', p_intent_id;
  end if;
  if v_intent.status = 'COMPLETED' then
    return jsonb_build_object('updated', false, 'intent', to_jsonb(v_intent));
  end if;

  update public.economy_terminal_intents
  set status               = 'FAILED',
      claim_owner          = null,
      claimed_at           = null,
      lease_expires_at     = null,
      last_error_code      = p_error_code,
      last_error_category  = coalesce(p_error_category, 'UNKNOWN')
  where id = p_intent_id
  returning * into v_intent;

  return jsonb_build_object('updated', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.mark_terminal_intent_failed(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_terminal_intent_failed(uuid, text, text, text) to service_role;

-- ═══════════════════════ 8. list_terminal_intents (read) ══════════════════
--
-- The operator inspection surface (Phase 11: "list terminal intents by
-- status"). `p_status` null lists every status.
create or replace function public.list_terminal_intents(
  p_status text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns setof public.economy_terminal_intents
language sql
security definer
stable
set search_path = pg_catalog, public, pg_temp
as $$
  select *
  from public.economy_terminal_intents
  where p_status is null or status = p_status
  order by created_at desc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.list_terminal_intents(text, integer, integer) from public, anon, authenticated;
grant execute on function public.list_terminal_intents(text, integer, integer) to service_role;

-- ═══════════════════════ 9. get_terminal_intent (read) ════════════════════

create or replace function public.get_terminal_intent(p_intent_id uuid)
returns public.economy_terminal_intents
language sql
security definer
stable
set search_path = pg_catalog, public, pg_temp
as $$
  select * from public.economy_terminal_intents where id = p_intent_id;
$$;

revoke all on function public.get_terminal_intent(uuid) from public, anon, authenticated;
grant execute on function public.get_terminal_intent(uuid) to service_role;

-- ═══════════════════════ 10. retry_terminal_intent (operator) ═════════════
--
-- Moves a FAILED intent back to PENDING for reprocessing — the same
-- recorded payload, never a replacement one (Phase 11: "never allow
-- arbitrary payload replacement"). Only legal from FAILED; rejects any
-- other source status deterministically rather than silently no-opping, so
-- an operator retrying an already-completed or still-in-flight intent gets
-- an explicit answer.
create or replace function public.retry_terminal_intent(
  p_intent_id  uuid,
  p_operator_id text,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  if p_operator_id is null or length(trim(p_operator_id)) = 0 then
    raise exception 'INVALID_OPERATOR: operator id is required for an audited retry';
  end if;

  select * into v_intent from public.economy_terminal_intents where id = p_intent_id for update;
  if not found then
    raise exception 'INTENT_NOT_FOUND: terminal intent % does not exist', p_intent_id;
  end if;
  if v_intent.status <> 'FAILED' then
    raise exception 'INVALID_STATE_TRANSITION: only a FAILED intent may be retried (current status %)', v_intent.status;
  end if;

  update public.economy_terminal_intents
  set status           = 'PENDING',
      next_attempt_at  = now(),
      last_error_code     = null,
      last_error_category = null
  where id = p_intent_id
  returning * into v_intent;

  perform public.emit_settlement_event(
    v_intent.match_id,
    'STALE_SETTLEMENT_DETECTED',
    null,
    (select status from public.match_economy_settlements where match_id = v_intent.match_id),
    'retry_terminal_intent',
    'terminal-intent-retry:' || v_intent.id::text,
    true,
    false,
    false,
    'operator',
    p_operator_id,
    coalesce(p_reason, 'Operator-initiated retry of a failed terminal intent'),
    jsonb_build_object('intent_id', v_intent.id::text, 'operation_kind', v_intent.operation_kind)
  );

  return jsonb_build_object('updated', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.retry_terminal_intent(uuid, text, text) from public, anon, authenticated;
grant execute on function public.retry_terminal_intent(uuid, text, text) to service_role;

-- ═══════════════════════ 11. requeue_expired_terminal_intent (operator) ═══
--
-- Operator-forced reclaim of a PROCESSING intent — for the case an operator
-- has independently confirmed a worker is gone (e.g. a deploy that will
-- never come back) and does not want to wait out the remaining lease.
-- Refuses if the lease has not actually expired AND the caller has not
-- explicitly overridden, to avoid accidentally racing a worker that is
-- still legitimately active.
create or replace function public.requeue_expired_terminal_intent(
  p_intent_id  uuid,
  p_operator_id text,
  p_force       boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_intent public.economy_terminal_intents;
begin
  if p_operator_id is null or length(trim(p_operator_id)) = 0 then
    raise exception 'INVALID_OPERATOR: operator id is required for an audited requeue';
  end if;

  select * into v_intent from public.economy_terminal_intents where id = p_intent_id for update;
  if not found then
    raise exception 'INTENT_NOT_FOUND: terminal intent % does not exist', p_intent_id;
  end if;
  if v_intent.status <> 'PROCESSING' then
    raise exception 'INVALID_STATE_TRANSITION: only a PROCESSING intent may be requeued (current status %)', v_intent.status;
  end if;
  if not p_force and v_intent.lease_expires_at > now() then
    raise exception 'LEASE_STILL_ACTIVE: intent % lease does not expire until % (pass p_force to override)', p_intent_id, v_intent.lease_expires_at;
  end if;

  update public.economy_terminal_intents
  set status           = 'PENDING',
      claim_owner      = null,
      claimed_at       = null,
      lease_expires_at = null,
      next_attempt_at  = now()
  where id = p_intent_id
  returning * into v_intent;

  return jsonb_build_object('updated', true, 'intent', to_jsonb(v_intent));
end;
$$;

revoke all on function public.requeue_expired_terminal_intent(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.requeue_expired_terminal_intent(uuid, text, boolean) to service_role;
