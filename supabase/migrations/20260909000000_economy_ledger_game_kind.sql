-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — Game Kind on Ledger Entries
-- ═══════════════════════════════════════════════════════════════════════
--
-- Migration: 20260909000000_economy_ledger_game_kind.sql
-- Status: Additive to 20260908000000_economy_custom_entry_stake.sql.
--
-- Purpose:
-- The wallet ledger (coin_ledger_entries) shows every debit/credit as a
-- bare "Room Entry" / "Match Prize" / "Refund" label with no indication of
-- WHICH GAME the room was for — a player with several matches in their
-- history has no way to tell them apart at a glance. This migration lets
-- every match-related ledger row carry the game kind (e.g. "handcricket"),
-- purely as display metadata — it never affects any amount, balance, or
-- business rule.
--
-- Design:
-- 1. `match_economy_settlements` gains a genuine `game_kind text` column,
--    set once by `commit_match_entry` (the only place that knows it, via
--    a new optional `p_game_kind` argument supplied by the application
--    layer, which already tracks `room.game`). Every later function that
--    touches this match (`settle_match_economy`, `economy_apply_refund`,
--    reached via `refund_match_entry`) already loads the full settlement
--    row (`select * into v_settlement` / receives `p_settlement` as a
--    parameter of that composite row type) — so once the column exists on
--    the table, those functions see `v_settlement.game_kind` /
--    `p_settlement.game_kind` automatically, with NO signature change.
-- 2. `coin_ledger_entries` is NOT given a new column. It already has an
--    unused `metadata jsonb not null default '{}'::jsonb` field that no
--    existing insert populates — exactly what this is for. Every
--    match-related ledger insert now sets
--    `metadata = jsonb_build_object('gameKind', <game kind or null>)`.
-- 3. `coin_ledger_entries_safe` (the view the application actually reads)
--    is extended with `metadata->>'gameKind' as game_kind` — a flat text
--    column, matching this view's existing "one scalar per column" style,
--    rather than exposing the raw jsonb blob.
--
-- This is purely cosmetic (a nicer ledger label) — unlike the custom-stake
-- migration, there is no money-correctness reason to force a hard
-- PGRST202 error on a stale database. `commit_match_entry` still gets a
-- genuinely new trailing parameter (so a stale deploy simply omits it via
-- the preserved legacy overload below, falling back to `game_kind = null`
-- — a slightly less descriptive ledger row, never a wrong amount).

-- ── 1. New column ─────────────────────────────────────────────────────

alter table public.match_economy_settlements add column if not exists game_kind text;

-- ── 2. commit_match_entry: accept and persist the game kind ─────────────

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
  v_settlement     public.match_economy_settlements;
  v_host_wallet    public.coin_wallets;
  v_config         public.economy_configurations;
  v_schedule       public.economy_prize_schedules;
  v_total_cost     bigint;
  v_cost_per_seat  bigint;
  v_entry_type     text;
  v_metadata       jsonb := jsonb_build_object('gameKind', p_game_kind);
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
      entry_type, source_kind, source_id, idempotency_key, description, metadata
    ) values (
      p_host_identity_id, -v_total_cost, v_balance_before, v_host_wallet.balance, v_version_before, v_host_wallet.version,
      v_entry_type, 'match', p_match_id, v_idempotency,
      'Match commitment: ' || p_seat_count || ' seats (' || coalesce(p_room_code, 'SOLO') || ')',
      v_metadata
    );
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

-- Overload with the previous 8 parameters, for any caller not yet
-- redeployed — delegates through with game_kind = null.
create or replace function public.commit_match_entry(
  p_match_id           text,
  p_room_code          text,
  p_host_identity_id   text,
  p_seat_count         integer,
  p_human_seat_count   integer,
  p_bot_seat_count     integer,
  p_is_solo            boolean,
  p_participant_debits jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return public.commit_match_entry(
    p_match_id, p_room_code, p_host_identity_id, p_seat_count,
    p_human_seat_count, p_bot_seat_count, p_is_solo, p_participant_debits, null
  );
end;
$$;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb, text) to service_role;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean, jsonb) to service_role;

-- ── 3. settle_match_economy: tag the prize-credit row with the match's game kind ──
-- Same 6-parameter signature as 20260908000000 — body-only change, so no
-- new overload or grant is needed; the existing 4-parameter legacy wrapper
-- keeps delegating straight through to this body unmodified.

create or replace function public.settle_match_economy(
  p_match_id             text,
  p_is_valid_ranking     boolean,
  p_participants         jsonb,
  p_refund_reason        text default null,
  p_prize_by_placement   jsonb default null,
  p_world_bank_cut_coins bigint default null
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
  v_metadata              jsonb;
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
  v_metadata := jsonb_build_object('gameKind', v_settlement.game_kind);

  if p_prize_by_placement is not null then
    if p_world_bank_cut_coins is null then
      raise exception 'INVALID_SETTLEMENT_CREDITS: p_world_bank_cut_coins is required whenever p_prize_by_placement is provided';
    end if;
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
          entry_type, source_kind, source_id, idempotency_key, description, metadata
        ) values (
          v_identity_id, v_prize, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
          'MATCH_PRIZE_CREDIT', 'match', p_match_id, v_idempotency || ':credit:' || v_identity_id,
          'Match placement ' || v_placement || ' prize', v_metadata
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

-- ── 4. economy_apply_refund: tag the refund row with the match's game kind ──
-- Same signature as the original (20260826000000) — body-only change.
-- `p_settlement` is the full row, so `p_settlement.game_kind` is already
-- available the moment the column above exists; no new parameter needed.

create or replace function public.economy_apply_refund(
  p_settlement public.match_economy_settlements,
  p_idempotency_key text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet public.coin_wallets;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_settlement.host_identity_id for update;
  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + p_settlement.total_collected,
      version = version + 1,
      lifetime_refunded = lifetime_refunded + p_settlement.total_collected,
      updated_at = now()
  where identity_id = p_settlement.host_identity_id
  returning * into v_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description, metadata
  ) values (
    p_settlement.host_identity_id, p_settlement.total_collected, v_balance_before, v_wallet.balance,
    v_version_before, v_wallet.version, 'MATCH_REFUND', 'match', p_settlement.match_id, p_idempotency_key,
    'Refund match commitment: ' || coalesce(p_reason, 'Match aborted / invalid ranking'),
    jsonb_build_object('gameKind', p_settlement.game_kind)
  );

  update public.match_economy_settlements
  set total_refunded = p_settlement.total_collected,
      status = 'REFUNDED',
      refund_reason = p_reason,
      settled_at = now(),
      updated_at = now()
  where match_id = p_settlement.match_id
  returning * into p_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'refund_match_entry',
    'idempotencyKey', p_idempotency_key,
    'result', public.settlement_to_safe_jsonb(p_settlement)
  );
end;
$$;

revoke all on function public.economy_apply_refund(public.match_economy_settlements, text, text) from public, anon, authenticated, service_role;

-- ── 5. Expose game_kind through the safe ledger view ─────────────────────
-- `game_kind` is appended AFTER `created_at`, not before it — `create or
-- replace view` only allows a new column at the very END of the column
-- list; inserting it anywhere else makes Postgres read the shift as an
-- attempt to RENAME the column that used to sit in that position (here,
-- "cannot change name of view column created_at to game_kind"), which
-- `create or replace view` refuses outright.

create or replace view public.coin_ledger_entries_safe as
select
  id, wallet_id,
  amount::text as amount,
  balance_before::text as balance_before,
  balance_after::text as balance_after,
  wallet_version_before, wallet_version_after,
  entry_type, source_kind, source_id, idempotency_key, description,
  created_at,
  metadata->>'gameKind' as game_kind
from public.coin_ledger_entries;
