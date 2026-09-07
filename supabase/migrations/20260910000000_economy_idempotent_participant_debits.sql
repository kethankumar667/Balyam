-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Idempotent Per-Participant Debits Under Retry
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260910000000_economy_idempotent_participant_debits.sql
-- Status: Additive to 20260909000000_economy_ledger_game_kind.sql — same
-- 9-parameter commit_match_entry signature, body-only fix. No new
-- overload, no new grants (the signature is unchanged).
--
-- Purpose:
-- Production incident (2026-09-07): a real 2-human paid match failed to
-- start with `EconomyServiceInfrastructureError`, root-caused from server
-- logs to
--
--   PostgREST 409 on commit_match_entry: 23505 duplicate key value
--   violates unique constraint "coin_ledger_entries_idempotency_key_key"
--   Key (idempotency_key)=(match-entry:<matchId>:<identityId>) already exists.
--
-- on `EconomyService`'s OWN automatic single retry (see
-- `EconomyService.withRetry` — every `EconomyInfrastructureError` gets
-- exactly one retry of the identical call, same matchId, ~250ms later).
-- The first attempt logged `"durationCategory":"slow"` — consistent with
-- a slow/cold connection-pooler request that the CLIENT gave up on and
-- reported as failed, while the underlying transaction kept running
-- server-side and actually committed moments later. The retry then
-- collided with rows the "failed" first attempt had, in fact, written.
--
-- `commit_match_entry` was already idempotent at the WHOLE-FUNCTION level
-- (`select ... where match_id = p_match_id for update; if found then
-- return early`) — but that only protects a retry arriving AFTER the
-- first attempt's settlement row is fully committed. A retry landing
-- while the first attempt is still mid-transaction (exactly this race)
-- sails past that check, since the settlement row does not exist YET, and
-- proceeds to re-debit and re-insert — the participant-loop's per-row
-- `coin_ledger_entries` insert has no such guard.
--
-- Fix: before debiting each participant (loop branch) or the host (legacy
-- single-payer branch), check whether an entry with this exact
-- idempotency key already exists. If so, skip re-debiting that
-- payer entirely (their money was already moved by an earlier, still-
-- committing attempt) but still count their amount toward
-- v_total_cost — so a retry that lands after EVERY payer has already
-- been (invisibly, from the client's perspective) charged now correctly
-- falls through to inserting the settlement row and returning
-- successfully, instead of erroring a second time.

create or replace function public.commit_match_entry(
  p_match_id           text,
  p_room_code          text,
  p_host_identity_id   text,
  p_seat_count         integer,
  p_human_seat_count   integer,
  p_bot_seat_count     integer,
  p_is_solo            boolean,
  p_participant_debits jsonb default null,
  p_game_kind          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement       public.match_economy_settlements;
  v_host_wallet      public.coin_wallets;
  v_config           public.economy_configurations;
  v_schedule         public.economy_prize_schedules;
  v_total_cost       bigint;
  v_cost_per_seat    bigint;
  v_entry_type       text;
  v_metadata         jsonb := jsonb_build_object('gameKind', p_game_kind);
  v_idempotency      text := 'match-entry:' || p_match_id;
  v_balance_before   bigint;
  v_version_before   bigint;
  v_elem             jsonb;
  v_p_id             text;
  v_p_amount         bigint;
  v_p_wallet         public.coin_wallets;
  v_p_bal_before     bigint;
  v_p_ver_before     bigint;
  v_already_debited  boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if found then
    return jsonb_build_object(
      'applied', false,
      'operation', 'commit_match_entry',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if p_seat_count < 1 or
     p_human_seat_count < 0 or
     p_bot_seat_count < 0 or
     p_seat_count <> (p_human_seat_count + p_bot_seat_count) then
    raise exception 'INVALID_SEAT_CONFIGURATION: seat_count must be a positive integer matching human + bot counts';
  end if;

  perform public.ensure_wallet(p_host_identity_id);

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  if not found then
    raise exception 'CONFIG_NOT_FOUND: no active economy configuration';
  end if;

  select * into v_schedule from public.economy_prize_schedules
  where config_version = v_config.version and seat_count = p_seat_count limit 1;
  if not found then
    raise exception 'UNSUPPORTED_SEAT_COUNT: no prize schedule for % seats', p_seat_count;
  end if;

  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

  -- ── Multi-wallet per-participant debit ──
  if p_participant_debits is not null and jsonb_typeof(p_participant_debits) = 'array' and jsonb_array_length(p_participant_debits) > 0 then
    v_total_cost := 0;

    for v_elem in select * from jsonb_array_elements(p_participant_debits)
    loop
      v_p_id := v_elem->>'identityId';
      v_p_amount := (v_elem->>'amountCoins')::bigint;

      if v_p_id is null or trim(v_p_id) = '' then
        raise exception 'INVALID_PARTICIPANT_IDENTITY: identityId cannot be null or empty in participantDebits';
      end if;

      -- Always counted toward the total regardless of whether this exact
      -- payer was already debited by an earlier, still-committing attempt
      -- — the settlement row's own total must reflect every seat either way.
      v_total_cost := v_total_cost + v_p_amount;

      -- Idempotency at the PER-PARTICIPANT level, not just the whole-function
      -- level above: a retry landing while an earlier attempt is still
      -- mid-transaction reaches this loop before that attempt's settlement
      -- row exists yet. Detecting this payer's own ledger row directly (by
      -- the same idempotency key the insert below uses) means a retry never
      -- re-debits someone the "failed" first attempt actually already charged.
      select exists(
        select 1 from public.coin_ledger_entries where idempotency_key = v_idempotency || ':' || v_p_id
      ) into v_already_debited;
      if v_already_debited then
        continue;
      end if;

      perform public.ensure_wallet(v_p_id);
      select * into v_p_wallet from public.coin_wallets where identity_id = v_p_id for update;

      if v_p_wallet.is_frozen then
        raise exception 'WALLET_FROZEN: participant % cannot commit while frozen', v_p_id;
      end if;

      if v_p_wallet.balance < v_p_amount then
        raise exception 'INSUFFICIENT_FUNDS: participant % balance % is less than required %',
          v_p_id, v_p_wallet.balance, v_p_amount;
      end if;

      v_p_bal_before := v_p_wallet.balance;
      v_p_ver_before := v_p_wallet.version;

      update public.coin_wallets
      set balance = balance - v_p_amount,
          version = version + 1,
          lifetime_spent = lifetime_spent + v_p_amount,
          updated_at = now()
      where identity_id = v_p_id
      returning * into v_p_wallet;

      insert into public.coin_ledger_entries (
        wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
        entry_type, source_kind, source_id, idempotency_key, description, metadata
      ) values (
        v_p_id, -v_p_amount, v_p_bal_before, v_p_wallet.balance, v_p_ver_before, v_p_wallet.version,
        v_entry_type, 'match', p_match_id, v_idempotency || ':' || v_p_id,
        'Match commitment: ' || v_p_amount || ' coins (' || coalesce(p_room_code, 'SOLO') || ')',
        v_metadata
      );
    end loop;

    if v_total_cost % p_seat_count <> 0 then
      raise exception 'NON_UNIFORM_SEAT_COST: total debits % do not divide evenly across % seats',
        v_total_cost, p_seat_count;
    end if;
    v_cost_per_seat := v_total_cost / p_seat_count;
  else
    -- ── Single host wallet debit fallback ──
    v_total_cost := p_seat_count * v_config.seat_cost_coins;
    v_cost_per_seat := v_config.seat_cost_coins;

    select exists(
      select 1 from public.coin_ledger_entries where idempotency_key = v_idempotency
    ) into v_already_debited;

    if not v_already_debited then
      select * into v_host_wallet from public.coin_wallets where identity_id = p_host_identity_id for update;

      if v_host_wallet.is_frozen then
        raise exception 'WALLET_FROZEN: host % cannot commit a match entry while frozen', p_host_identity_id;
      end if;

      if v_host_wallet.balance < v_total_cost then
        raise exception 'INSUFFICIENT_FUNDS: host balance % is less than required commitment %',
          v_host_wallet.balance, v_total_cost;
      end if;

      v_balance_before := v_host_wallet.balance;
      v_version_before := v_host_wallet.version;

      update public.coin_wallets
      set balance = balance - v_total_cost,
          version = version + 1,
          lifetime_spent = lifetime_spent + v_total_cost,
          updated_at = now()
      where identity_id = p_host_identity_id
      returning * into v_host_wallet;

      insert into public.coin_ledger_entries (
        wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
        entry_type, source_kind, source_id, idempotency_key, description, metadata
      ) values (
        p_host_identity_id, -v_total_cost, v_balance_before, v_host_wallet.balance, v_version_before, v_host_wallet.version,
        v_entry_type, 'match', p_match_id, v_idempotency,
        'Match commitment: ' || p_seat_count || ' seats (' || coalesce(p_room_code, 'SOLO') || ')',
        v_metadata
      );
    end if;
  end if;

  insert into public.match_economy_settlements (
    match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
    cost_per_seat, total_collected, status, config_snapshot, prize_schedule_snapshot, game_kind
  ) values (
    p_match_id, coalesce(p_room_code, 'SOLO'), p_host_identity_id, p_seat_count, p_human_seat_count, p_bot_seat_count,
    v_cost_per_seat, v_total_cost, 'COMMITTED', to_jsonb(v_config), to_jsonb(v_schedule), p_game_kind
  )
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'commit_match_entry',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;
