-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261002000000_mandali_coin_request_cooldown.sql
-- Description: One coin request per requester per cooldown window (4 hours,
--              passed in by the server so the policy number lives in one
--              place — shared/mandali/coinRules.ts — not duplicated here).
--
--              The cooldown is enforced INSIDE create_coin_request rather than
--              in the Node service because "check the last request, then
--              insert" is a race in application code: two taps in flight from
--              the same user would both read "no recent request" and both
--              insert. A per-requester advisory lock serialises them so the
--              second sees the first's row.
--
--              The window is GLOBAL per user (across every Mandali) on purpose:
--              a per-Mandali window would let one account ask once per group
--              they belong to and defeat the point. Cancelled and expired
--              requests still count — the limit is on asking, not on being
--              paid.
--
--              20261001000000 is already applied to production, so it is left
--              untouched; this migration replaces the function instead. The
--              old 7-argument signature is dropped because the new function
--              adds a defaulted 8th argument, and leaving both would make a
--              7-argument PostgREST call ambiguous.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists mandali_coin_requests_requester_idx
  on public.mandali_coin_requests (requester_identity_id, created_at desc);

drop function if exists public.create_coin_request(text, text, text, text, text, bigint, timestamptz);

create or replace function public.create_coin_request(
  p_request_id text,
  p_mandali_id text,
  p_channel_id text,
  p_requester_identity_id text,
  p_payer_identity_id text,
  p_amount bigint,
  p_expires_at timestamptz,
  p_cooldown_seconds integer default 14400
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_requester public.mandali_memberships;
  v_payer public.mandali_memberships;
  v_request public.mandali_coin_requests;
  v_message_id text;
  v_last_request_at timestamptz;
  v_retry_after_seconds integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: must be a positive integer';
  end if;
  if p_requester_identity_id = p_payer_identity_id then
    raise exception 'INVALID_REQUEST: cannot request coins from yourself';
  end if;

  select * into v_requester from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_requester_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: requester must be an active member';
  end if;
  select * into v_payer from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_payer_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: designated payer must be an active member';
  end if;

  -- Serialise this requester's requests so the cooldown check below cannot be
  -- raced by a second in-flight call. Released automatically at commit.
  perform pg_advisory_xact_lock(hashtextextended('mandali_coin_request:' || p_requester_identity_id, 0));

  select max(created_at) into v_last_request_at
    from public.mandali_coin_requests
    where requester_identity_id = p_requester_identity_id;

  -- clock_timestamp(), not now(): now() is frozen at transaction START, so a
  -- request that waited on the lock above would compare against a stale clock.
  if v_last_request_at is not null
     and v_last_request_at + make_interval(secs => p_cooldown_seconds) > clock_timestamp() then
    v_retry_after_seconds := ceil(extract(epoch from (
      v_last_request_at + make_interval(secs => p_cooldown_seconds) - clock_timestamp()
    )))::integer;
    raise exception 'COOLDOWN: retry_after_seconds=%', v_retry_after_seconds;
  end if;

  v_message_id := p_request_id || '_card';
  perform public.send_mandali_message(
    v_message_id, p_mandali_id, p_channel_id, p_requester_identity_id,
    'Requested ' || p_amount || ' coins', null, null
  );
  update public.mandali_messages set kind = 'COIN_REQUEST' where message_id = v_message_id;

  insert into public.mandali_coin_requests (
    id, mandali_id, message_id, requester_identity_id, payer_identity_id, amount, expires_at
  ) values (
    p_request_id, p_mandali_id, v_message_id, p_requester_identity_id, p_payer_identity_id, p_amount, p_expires_at
  )
  returning * into v_request;

  return to_jsonb(v_request);
end;
$$;

revoke all on function public.create_coin_request(text, text, text, text, text, bigint, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.create_coin_request(text, text, text, text, text, bigint, timestamptz, integer) to service_role;
