-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Custom Per-Room Entry Stake
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260908000000_economy_custom_entry_stake.sql
-- Status: Additive to 20260906000001_economy_participant_debits.sql and
-- 20260906000002_economy_prize_schedules_ranked_payout_2_to_5.sql.
--
-- Purpose:
-- Lets a host choose a per-room entry stake (100/200/500/1000/custom,
-- validated application-side) instead of the single global
-- economy_configurations.seat_cost_coins. Two independent fixes:
--
-- 1. commit_match_entry: today, when p_participant_debits is supplied,
--    v_total_cost (which becomes cost_per_seat/total_collected on the
--    settlement row) is STILL computed from
--    p_seat_count * economy_configurations.seat_cost_coins — completely
--    ignoring what the debits array actually summed to. This is a real,
--    pre-existing correctness gap independent of custom stakes (the
--    settlement row can already misrepresent actual money moved today);
--    fixed here by deriving v_total_cost from the debits themselves.
--
-- 2. settle_match_economy: gains two new OPTIONAL trailing parameters,
--    p_prize_by_placement (a jsonb array of bigint-as-text, index 0 = 1st
--    place, index 1 = 2nd, index 2 = 3rd) and p_world_bank_cut_coins. When
--    both are supplied, they replace the frozen prize_schedule_snapshot as
--    the source of v_1st_prize/v_2nd_prize/v_3rd_prize/v_base_wb_cut —
--    nothing else in the function changes. This lets the caller (economy
--    service) compute a percentage-of-actual-pool payout for an arbitrary
--    stake instead of being limited to a fixed table of absolute amounts.
--    Genuinely NEW trailing parameters (not extra keys inside the existing
--    p_participants array) are required so that a database still running
--    the OLD 4-parameter function raises a real, catchable
--    "Could not find the function" / PGRST202 error — the caller's own
--    fallback then retries on the old signature AND logs loudly, rather
--    than a same-signature call silently paying out the wrong amount with
--    no error at all.
--
-- The economy_prize_schedules table and its lookup/freeze into
-- prize_schedule_snapshot are UNCHANGED — they remain the seat-count
-- approval gate at commit time and the legacy settlement fallback when the
-- new parameters are absent.

-- ── 1. commit_match_entry: derive cost from actual debits, not the global rate ──

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
  v_cost_per_seat  bigint;
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

  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

  -- ── Multi-wallet per-participant debit ──
  if p_participant_debits is not null and jsonb_typeof(p_participant_debits) = 'array' and jsonb_array_length(p_participant_debits) > 0 then
    -- v_total_cost is now the ACTUAL sum of what gets debited below, never
    -- a value independently recomputed from the global seat_cost_coins —
    -- the fix this migration exists to make. cost_per_seat/total_collected
    -- on the settlement row will therefore always match real money moved.
    v_total_cost := 0;

    for v_elem in select * from jsonb_array_elements(p_participant_debits)
    loop
      v_p_id := v_elem->>'identityId';
      v_p_amount := (v_elem->>'amountCoins')::bigint;

      if v_p_id is null or trim(v_p_id) = '' then
        raise exception 'INVALID_PARTICIPANT_IDENTITY: identityId cannot be null or empty in participantDebits';
      end if;

      v_total_cost := v_total_cost + v_p_amount;

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

    if v_total_cost % p_seat_count <> 0 then
      -- Fail loud rather than truncate silently — every seat is meant to
      -- cost exactly the same amount (RoomManager.buildParticipantDebits'
      -- own invariant), so debits that don't divide evenly across seats
      -- mean a caller bug upstream, not a value to approximate.
      raise exception 'NON_UNIFORM_SEAT_COST: total debits % do not divide evenly across % seats',
        v_total_cost, p_seat_count;
    end if;
    v_cost_per_seat := v_total_cost / p_seat_count;
  else
    -- ── Single host wallet debit fallback — unchanged from before this migration ──
    v_total_cost := p_seat_count * v_config.seat_cost_coins;
    v_cost_per_seat := v_config.seat_cost_coins;

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
    v_cost_per_seat, v_total_cost, 'COMMITTED', to_jsonb(v_config), to_jsonb(v_schedule)
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

-- ── 2. settle_match_economy: optional percentage-of-pool prize override ──

create or replace function public.settle_match_economy(
  p_match_id             text,
  p_is_valid_ranking     boolean,
  p_participants         jsonb,
  p_refund_reason        text default null,
  p_prize_by_placement   jsonb default null,   -- ["<1st place coins>", "<2nd>", "<3rd>"], bigint-as-text, missing/short = 0
  p_world_bank_cut_coins bigint default null    -- required together with p_prize_by_placement
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement            public.match_economy_settlements;
  v_wb                    public.world_bank_accounts;
  v_participant           jsonb;
  v_identity_id           text;
  v_identity_kind         text;
  v_placement             integer;
  v_voucher_hash          text;
  v_prize                 bigint;
  v_voucher_id            text;
  v_wallet                public.coin_wallets;
  v_1st_prize             bigint;
  v_2nd_prize             bigint;
  v_3rd_prize             bigint;
  v_base_wb_cut           bigint;
  v_total_wallet_rewarded bigint := 0;
  v_total_guest_escrow    bigint := 0;
  v_total_bot_collection  bigint := 0;
  v_total_world_bank_cut  bigint := 0;
  v_idempotency           text := 'match-settlement:' || p_match_id;
  v_balance_before        bigint;
  v_version_before        bigint;
  v_wb_balance_before     bigint;
  v_solo                  boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status in ('SETTLED', 'REFUNDED') then
    return jsonb_build_object(
      'applied', false,
      'operation', 'settle_match_economy',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if not coalesce(p_is_valid_ranking, false) then
    return public.economy_apply_refund(v_settlement, v_idempotency, coalesce(p_refund_reason, 'Invalid or tied authoritative result'));
  end if;

  v_solo := v_settlement.seat_count = 1;

  if p_prize_by_placement is not null then
    if p_world_bank_cut_coins is null then
      raise exception 'INVALID_SETTLEMENT_CREDITS: p_world_bank_cut_coins is required whenever p_prize_by_placement is provided';
    end if;
    -- Percentage-of-actual-pool amounts, computed by the caller (EconomyService.computePrizePool)
    -- against this match's REAL total_collected — replaces the fixed
    -- prize_schedule_snapshot lookup below. Everything downstream of these
    -- four variables (dispatch, world-bank crediting, the final
    -- conservation check) is completely unaware of where they came from.
    v_1st_prize   := coalesce((p_prize_by_placement->>0)::bigint, 0);
    v_2nd_prize   := coalesce((p_prize_by_placement->>1)::bigint, 0);
    v_3rd_prize   := coalesce((p_prize_by_placement->>2)::bigint, 0);
    v_base_wb_cut := p_world_bank_cut_coins;
  else
    -- ── Legacy fixed-schedule path — unchanged from before this migration ──
    v_1st_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'first_place_coins')::bigint, 0);
    v_2nd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'second_place_coins')::bigint, 0);
    v_3rd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'third_place_coins')::bigint, 0);
    v_base_wb_cut := coalesce((v_settlement.prize_schedule_snapshot->>'world_bank_coins')::bigint, 0);
  end if;

  for v_participant in select * from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) loop
    v_identity_id   := v_participant->>'identityId';
    v_identity_kind := v_participant->>'identityKind';
    v_placement     := (v_participant->>'placement')::integer;
    v_voucher_hash  := v_participant->>'voucherCodeHash';

    v_prize := case
      when v_placement = 1 then v_1st_prize
      when v_placement = 2 then v_2nd_prize
      when v_placement = 3 then v_3rd_prize
      else 0
    end;

    if v_identity_kind = 'member' then
      if v_prize > 0 then
        perform public.ensure_wallet(v_identity_id);
        select * into v_wallet from public.coin_wallets where identity_id = v_identity_id for update;
        v_balance_before := v_wallet.balance;
        v_version_before := v_wallet.version;

        update public.coin_wallets
        set balance = balance + v_prize, version = version + 1, lifetime_earned = lifetime_earned + v_prize, updated_at = now()
        where identity_id = v_identity_id
        returning * into v_wallet;

        insert into public.coin_ledger_entries (
          wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          v_identity_id, v_prize, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
          'MATCH_PRIZE_CREDIT', 'match', p_match_id, v_idempotency || ':credit:' || v_identity_id,
          'Match placement ' || v_placement || ' prize'
        );

        v_total_wallet_rewarded := v_total_wallet_rewarded + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'member', v_placement, v_prize, 'PAID_WALLET');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'member', v_placement, 0, 'NO_PRIZE');
      end if;

    elsif v_identity_kind = 'guest' then
      if v_prize > 0 then
        if v_voucher_hash is null or v_voucher_hash !~ '^[0-9a-f]{64}$' then
          raise exception 'INVALID_VOUCHER_HASH: guest prize requires a 64-hex-character voucher code hash';
        end if;

        v_voucher_id := 'vch_' || replace(gen_random_uuid()::text, '-', '');

        insert into public.reward_vouchers (id, code_hash, coin_amount, match_id, issued_to_guest_id, status)
        values (v_voucher_id, v_voucher_hash, v_prize, p_match_id, v_identity_id, 'ACTIVE');

        select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
        v_wb_balance_before := v_wb.guest_escrow_liability;

        update public.world_bank_accounts
        set guest_escrow_liability = guest_escrow_liability + v_prize, updated_at = now()
        where id = 'primary'
        returning * into v_wb;

        insert into public.world_bank_ledger (
          account_id, affected_balance, amount, balance_before, balance_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          'primary', 'guest_escrow_liability', v_prize, v_wb_balance_before, v_wb.guest_escrow_liability,
          'GUEST_ESCROW_DEPOSIT', 'match', p_match_id, v_idempotency || ':escrow:' || v_identity_id,
          'Guest match prize placed in bearer voucher escrow'
        );

        v_total_guest_escrow := v_total_guest_escrow + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status, voucher_id)
        values (p_match_id, v_identity_id, 'guest', v_placement, v_prize, 'ESCROWED_VOUCHER', v_voucher_id);
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'guest', v_placement, 0, 'NO_PRIZE');
      end if;

    elsif v_identity_kind = 'bot' then
      if v_prize > 0 then
        select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
        v_wb_balance_before := v_wb.bot_prize_revenue;

        update public.world_bank_accounts
        set bot_prize_revenue = bot_prize_revenue + v_prize, updated_at = now()
        where id = 'primary'
        returning * into v_wb;

        insert into public.world_bank_ledger (
          account_id, affected_balance, amount, balance_before, balance_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          'primary', 'bot_prize_revenue', v_prize, v_wb_balance_before, v_wb.bot_prize_revenue,
          'BOT_PRIZE_REVENUE', 'match', p_match_id, v_idempotency || ':bot:' || v_placement,
          'Bot placement ' || v_placement || ' prize collection'
        );

        v_total_bot_collection := v_total_bot_collection + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, v_prize, 'BOT_TO_WORLD_BANK');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, 0, 'NO_PRIZE');
      end if;
    else
      raise exception 'INVALID_IDENTITY_KIND: participant identityKind must be member, guest, or bot (got %)',
        coalesce(v_identity_kind, 'null');
    end if;
  end loop;

  if v_base_wb_cut > 0 then
    select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
    v_wb_balance_before := v_wb.base_fee_revenue;

    update public.world_bank_accounts
    set base_fee_revenue = base_fee_revenue + v_base_wb_cut, updated_at = now()
    where id = 'primary'
    returning * into v_wb;

    insert into public.world_bank_ledger (
      account_id, affected_balance, amount, balance_before, balance_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      'primary', 'base_fee_revenue', v_base_wb_cut, v_wb_balance_before, v_wb.base_fee_revenue,
      case when v_solo then 'SOLO_ENTRY_COLLECTION' else 'BASE_FEE_REVENUE' end,
      'match', p_match_id, v_idempotency || ':world-bank',
      case when v_solo then 'Solo session fee collection' else 'Base room house cut (' || v_settlement.seat_count || ' seats)' end
    );

    v_total_world_bank_cut := v_base_wb_cut;
  end if;

  if v_settlement.total_collected <> (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut) then
    raise exception 'SETTLEMENT_CONSERVATION_VIOLATION: collected % does not equal disbursed %',
      v_settlement.total_collected, (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut);
  end if;

  update public.match_economy_settlements
  set total_wallet_rewarded = v_total_wallet_rewarded,
      total_guest_escrow    = v_total_guest_escrow,
      total_bot_collection  = v_total_bot_collection,
      total_world_bank_cut  = v_total_world_bank_cut,
      status                = 'SETTLED',
      settled_at            = now(),
      updated_at            = now()
  where match_id = p_match_id
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'settle_match_economy',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

-- Overload with the original 4 parameters, for any caller that has not
-- been redeployed yet — delegates straight through with both new
-- parameters null, i.e. the legacy fixed-schedule path.
create or replace function public.settle_match_economy(
  p_match_id           text,
  p_is_valid_ranking   boolean,
  p_participants       jsonb,
  p_refund_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return public.settle_match_economy(p_match_id, p_is_valid_ranking, p_participants, p_refund_reason, null, null);
end;
$$;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) to service_role;

revoke all on function public.settle_match_economy(text, boolean, jsonb, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.settle_match_economy(text, boolean, jsonb, text, jsonb, bigint) to service_role;

revoke all on function public.settle_match_economy(text, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.settle_match_economy(text, boolean, jsonb, text) to service_role;
