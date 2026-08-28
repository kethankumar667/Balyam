-- Rollback for 20260830000000_economy_settlement_events.sql
--
-- ADDITIVE-ONLY forward migration, so this rollback is additive-undo, not a
-- schema teardown: it drops the new settlement_events table (and everything
-- that depends on it — trigger, safe view, emit_settlement_event,
-- list_settlement_events), then restores the six modified functions
-- (commit_match_entry, economy_apply_refund, settle_match_economy,
-- refund_match_entry, forfeit_match_entry, reconcile_match_settlement) to
-- their exact pre-20260830 bodies, copied verbatim from
-- 20260829000000_economy_seat_capacity_contract.sql (commit_match_entry),
-- 20260826000000_economy_v1.sql (economy_apply_refund), and
-- 20260828000000_economy_abandonment_forfeiture.sql (the other four) — same
-- "restore to the immediately preceding migration's body" convention as
-- 20260828000000_economy_abandonment_forfeiture_rollback.sql. Never place
-- this in supabase/migrations/ — same version-collision reasoning as every
-- other rollback's own header. Run manually against the SQL Editor or psql.
--
-- Dropping settlement_events discards every audit event ever recorded —
-- this rollback does NOT attempt to export or preserve that data. Do not
-- run this against a database with real settlement_events history you need
-- to keep without a separate, deliberate export first.

begin;

-- ═══════════════════════ 1. Drop the new audit-event objects ═════════════
-- Dropping the table cascades the trigger and the view automatically; both
-- are also dropped explicitly first for clarity and so this script does not
-- depend on CASCADE behavior to be correct.

drop function if exists public.list_settlement_events(text);
drop function if exists public.emit_settlement_event(
  text, text, text, text, text, text, boolean, boolean, boolean, text, text, text, jsonb
);
drop trigger if exists guard_settlement_events_immutable on public.settlement_events;
drop view if exists public.settlement_events_safe;
drop table if exists public.settlement_events;

-- ═══════════════════════ 2. Restore modified functions to their ═════════
-- ═══════════════════════ pre-20260830 bodies ══════════════════════════════

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
declare
  v_settlement   public.match_economy_settlements;
  v_host_wallet  public.coin_wallets;
  v_config       public.economy_configurations;
  v_schedule     public.economy_prize_schedules;
  v_total_cost   bigint;
  v_entry_type   text;
  v_idempotency  text := 'match-entry:' || p_match_id;
  v_balance_before bigint;
  v_version_before bigint;
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

  select * into v_schedule
  from public.economy_prize_schedules
  where config_version = v_config.version and seat_count = p_seat_count limit 1;
  if not found then
    raise exception 'UNSUPPORTED_SEAT_COUNT: no prize schedule for % seats', p_seat_count;
  end if;

  v_total_cost := p_seat_count * v_config.seat_cost_coins;

  select * into v_host_wallet from public.coin_wallets where identity_id = p_host_identity_id for update;

  if v_host_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: host % cannot commit a match entry while frozen', p_host_identity_id;
  end if;

  if v_host_wallet.balance < v_total_cost then
    raise exception 'INSUFFICIENT_FUNDS: host balance % is less than required commitment %',
      v_host_wallet.balance, v_total_cost;
  end if;

  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

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

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) to service_role;

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
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_settlement.host_identity_id, p_settlement.total_collected, v_balance_before, v_wallet.balance,
    v_version_before, v_wallet.version, 'MATCH_REFUND', 'match', p_settlement.match_id, p_idempotency_key,
    'Refund match commitment: ' || coalesce(p_reason, 'Match aborted / invalid ranking')
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

  if v_settlement.status in ('SETTLED', 'REFUNDED', 'ABANDONMENT_FORFEITED') then
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
  v_1st_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'first_place_coins')::bigint, 0);
  v_2nd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'second_place_coins')::bigint, 0);
  v_3rd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'third_place_coins')::bigint, 0);
  v_base_wb_cut := coalesce((v_settlement.prize_schedule_snapshot->>'world_bank_coins')::bigint, 0);

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

revoke all on function public.settle_match_economy(text, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.settle_match_economy(text, boolean, jsonb, text) to service_role;

create or replace function public.refund_match_entry(
  p_match_id text,
  p_reason   text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement  public.match_economy_settlements;
  v_idempotency text := 'match-refund:' || p_match_id;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status = 'REFUNDED' then
    return jsonb_build_object(
      'applied', false,
      'operation', 'refund_match_entry',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if v_settlement.status = 'SETTLED' then
    raise exception 'MATCH_ALREADY_SETTLED: settled match % cannot be refunded', p_match_id;
  end if;

  if v_settlement.status = 'ABANDONMENT_FORFEITED' then
    raise exception 'MATCH_ALREADY_FORFEITED: forfeited match % cannot be refunded', p_match_id;
  end if;

  return public.economy_apply_refund(v_settlement, v_idempotency, p_reason);
end;
$$;

revoke all on function public.refund_match_entry(text, text) from public, anon, authenticated;
grant execute on function public.refund_match_entry(text, text) to service_role;

create or replace function public.forfeit_match_entry(
  p_match_id text,
  p_reason   text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement        public.match_economy_settlements;
  v_wb                public.world_bank_accounts;
  v_wb_balance_before  bigint;
  v_idempotency       text := 'match-forfeit:' || p_match_id;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status = 'ABANDONMENT_FORFEITED' then
    return jsonb_build_object(
      'applied', false,
      'operation', 'forfeit_match_entry',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if v_settlement.status = 'SETTLED' then
    raise exception 'MATCH_ALREADY_SETTLED: settled match % cannot be forfeited', p_match_id;
  end if;

  if v_settlement.status = 'REFUNDED' then
    raise exception 'MATCH_ALREADY_REFUNDED: refunded match % cannot be forfeited', p_match_id;
  end if;

  select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
  v_wb_balance_before := v_wb.abandonment_forfeiture_revenue;

  update public.world_bank_accounts
  set abandonment_forfeiture_revenue = abandonment_forfeiture_revenue + v_settlement.total_collected,
      updated_at = now()
  where id = 'primary'
  returning * into v_wb;

  insert into public.world_bank_ledger (
    account_id, affected_balance, amount, balance_before, balance_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    'primary', 'abandonment_forfeiture_revenue', v_settlement.total_collected, v_wb_balance_before, v_wb.abandonment_forfeiture_revenue,
    'ABANDONMENT_FORFEITURE', 'match', p_match_id, v_idempotency,
    coalesce(p_reason, 'Match abandoned after commitment — no eligible signed-in successor')
  );

  update public.match_economy_settlements
  set total_forfeited   = v_settlement.total_collected,
      status             = 'ABANDONMENT_FORFEITED',
      forfeiture_reason  = p_reason,
      settled_at         = now(),
      updated_at         = now()
  where match_id = p_match_id
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'forfeit_match_entry',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.forfeit_match_entry(text, text) from public, anon, authenticated;
grant execute on function public.forfeit_match_entry(text, text) to service_role;

create or replace function public.reconcile_match_settlement(p_match_id text)
returns table (
  match_id     text,
  status       text,
  is_balanced  boolean,
  collected    text,
  disbursed    text,
  delta        text,
  details      jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_s public.match_economy_settlements;
  v_disbursed bigint;
begin
  select * into v_s from public.match_economy_settlements mes where mes.match_id = p_match_id;
  if not found then
    raise exception 'MATCH_NOT_FOUND: match settlement % does not exist', p_match_id;
  end if;

  v_disbursed := v_s.total_wallet_rewarded + v_s.total_guest_escrow + v_s.total_bot_collection
    + v_s.total_world_bank_cut + v_s.total_refunded + v_s.total_forfeited;

  return query select
    v_s.match_id,
    v_s.status,
    ((v_s.status = 'COMMITTED' and v_disbursed = 0) or (v_s.status in ('SETTLED', 'REFUNDED', 'ABANDONMENT_FORFEITED') and v_s.total_collected = v_disbursed)),
    v_s.total_collected::text,
    v_disbursed::text,
    (v_s.total_collected - v_disbursed)::text,
    jsonb_build_object(
      'wallet_rewarded', v_s.total_wallet_rewarded::text,
      'guest_escrow', v_s.total_guest_escrow::text,
      'bot_collection', v_s.total_bot_collection::text,
      'world_bank_cut', v_s.total_world_bank_cut::text,
      'refunded', v_s.total_refunded::text,
      'forfeited', v_s.total_forfeited::text
    );
end;
$$;

revoke all on function public.reconcile_match_settlement(text) from public, anon, authenticated;
grant execute on function public.reconcile_match_settlement(text) to service_role;

commit;
