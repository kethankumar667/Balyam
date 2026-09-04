-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Add Per-Participant Debits Support to commit_match_entry
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260906000001_economy_participant_debits.sql
-- Status: Additive to 20260829000000_economy_seat_capacity_contract.sql and
-- 20260905000000_economy_expand_prize_schedules_6_to_12.sql.
--
-- Purpose:
-- Allows commit_match_entry to optionally accept p_participant_debits (jsonb),
-- deducting seat entry fees from individual identified participants' wallets
-- while preserving backward-compatible single host-wallet debit when omitted.
-- Supports seat counts from 1 up to 12.

create or replace function public.commit_match_entry(
  p_match_id          text,
  p_room_code         text,
  p_host_identity_id  text,
  p_seat_count        integer,
  p_human_seat_count  integer,
  p_bot_seat_count    integer,
  p_is_solo           boolean,
  p_participant_debits jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement     public.match_economy_settlements;
  v_host_wallet    public.coin_wallets;
  v_config         public.economy_configurations;
  v_schedule       public.economy_prize_schedules;
  v_total_cost     bigint;
  v_entry_type     text;
  v_idempotency    text := 'match-entry:' || p_match_id;
  v_balance_before bigint;
  v_version_before bigint;
  v_elem           jsonb;
  v_p_id           text;
  v_p_amount       bigint;
  v_p_wallet       public.coin_wallets;
  v_p_bal_before   bigint;
  v_p_ver_before   bigint;
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

  v_total_cost := p_seat_count * v_config.seat_cost_coins;

  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

  -- ── Multi-wallet per-participant debit ──
  if p_participant_debits is not null and jsonb_typeof(p_participant_debits) = 'array' and jsonb_array_length(p_participant_debits) > 0 then
    for v_elem in select * from jsonb_array_elements(p_participant_debits)
    loop
      v_p_id := v_elem->>'identityId';
      v_p_amount := (v_elem->>'amountCoins')::bigint;

      if v_p_id is null or trim(v_p_id) = '' then
        raise exception 'INVALID_PARTICIPANT_IDENTITY: identityId cannot be null or empty in participantDebits';
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
        entry_type, source_kind, source_id, idempotency_key, description
      ) values (
        v_p_id, -v_p_amount, v_p_bal_before, v_p_wallet.balance, v_p_ver_before, v_p_wallet.version,
        v_entry_type, 'match', p_match_id, v_idempotency || ':' || v_p_id,
        'Match commitment: ' || v_p_amount || ' coins (' || coalesce(p_room_code, 'SOLO') || ')'
      );
    end loop;
  else
    -- ── Single host wallet debit fallback ──
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
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      p_host_identity_id, -v_total_cost, v_balance_before, v_host_wallet.balance, v_version_before, v_host_wallet.version,
      v_entry_type, 'match', p_match_id, v_idempotency,
      'Match commitment: ' || p_seat_count || ' seats (' || coalesce(p_room_code, 'SOLO') || ')'
    );
  end if;

  insert into public.match_economy_settlements (
    match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
    cost_per_seat, total_collected, status, config_snapshot, prize_schedule_snapshot
  ) values (
    p_match_id, coalesce(p_room_code, 'SOLO'), p_host_identity_id, p_seat_count, p_human_seat_count, p_bot_seat_count,
    v_config.seat_cost_coins, v_total_cost, 'COMMITTED', to_jsonb(v_config), to_jsonb(v_schedule)
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

-- Overload with original 7 parameters for backward compatibility
create or replace function public.commit_match_entry(
  p_match_id          text,
  p_room_code         text,
  p_host_identity_id  text,
  p_seat_count        integer,
  p_human_seat_count  integer,
  p_bot_seat_count    integer,
  p_is_solo           boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return public.commit_match_entry(
    p_match_id,
    p_room_code,
    p_host_identity_id,
    p_seat_count,
    p_human_seat_count,
    p_bot_seat_count,
    p_is_solo,
    null
  );
end;
$$;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) to service_role;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) to service_role;
