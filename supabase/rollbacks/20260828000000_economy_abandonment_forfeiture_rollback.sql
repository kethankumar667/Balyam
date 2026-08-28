-- Rollback for 20260828000000_economy_abandonment_forfeiture.sql
--
-- ADDITIVE-ONLY forward migration, so this rollback is additive-undo, not a
-- schema teardown like 20260826000000_economy_v1_rollback.sql: it removes
-- exactly what the forward migration added and restores the three modified
-- functions and two views to their pre-forfeiture bodies (copied verbatim
-- from 20260826000000_economy_v1.sql), then drops the new columns/RPC/
-- constraint values. Never place this in supabase/migrations/ — same
-- version-collision reasoning as the economy_v1 rollback's own header. Run
-- manually against the SQL Editor or psql.
--
-- Any settlement already in ABANDONMENT_FORFEITED status at rollback time
-- becomes unreadable through the restored status CHECK constraint's set of
-- allowed values — this rollback does NOT attempt to reinterpret or migrate
-- that data. Do not run this against a database with real forfeited
-- settlements without a separate, deliberate data migration first.

begin;

-- ═══════════════════════ 1. Drop the new RPC ════════════════════════════

drop function if exists public.forfeit_match_entry(text, text);

-- ═══════════════════════ 1a. Drop the function whose return type depends ═
-- ═══════════════════════ on match_economy_settlements_safe's composite ═══
-- ═══════════════════════ type, and the view itself ═══════════════════════
-- `CREATE OR REPLACE VIEW` can only ADD trailing columns, never remove
-- them — restoring the pre-forfeiture (narrower) column set requires a real
-- DROP + CREATE, which in turn requires dropping
-- `list_stale_committed_settlements` first (it `returns setof
-- match_economy_settlements_safe`, so it holds a dependency on the view's
-- composite type), then recreating both, unchanged, afterward. Same
-- ordering constraint the forward economy_v1 rollback's own header
-- documents for the identical reason.

drop function if exists public.list_stale_committed_settlements(interval);
drop view if exists public.match_economy_settlements_safe;
drop view if exists public.world_bank_accounts_safe;

-- ═══════════════════════ 2. Restore modified functions to their ═════════
-- ═══════════════════════ pre-forfeiture bodies ═══════════════════════════

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

  v_disbursed := v_s.total_wallet_rewarded + v_s.total_guest_escrow + v_s.total_bot_collection + v_s.total_world_bank_cut + v_s.total_refunded;

  return query select
    v_s.match_id,
    v_s.status,
    ((v_s.status = 'COMMITTED' and v_disbursed = 0) or (v_s.status in ('SETTLED', 'REFUNDED') and v_s.total_collected = v_disbursed)),
    v_s.total_collected::text,
    v_disbursed::text,
    (v_s.total_collected - v_disbursed)::text,
    jsonb_build_object(
      'wallet_rewarded', v_s.total_wallet_rewarded::text,
      'guest_escrow', v_s.total_guest_escrow::text,
      'bot_collection', v_s.total_bot_collection::text,
      'world_bank_cut', v_s.total_world_bank_cut::text,
      'refunded', v_s.total_refunded::text
    );
end;
$$;

revoke all on function public.reconcile_match_settlement(text) from public, anon, authenticated;
grant execute on function public.reconcile_match_settlement(text) to service_role;

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

  return public.economy_apply_refund(v_settlement, v_idempotency, p_reason);
end;
$$;

revoke all on function public.refund_match_entry(text, text) from public, anon, authenticated;
grant execute on function public.refund_match_entry(text, text) to service_role;

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

-- ═══════════════════════ 3. Restore views/jsonb helper ═══════════════════

create or replace function public.settlement_to_safe_jsonb(s public.match_economy_settlements)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'match_id', s.match_id,
    'room_code', s.room_code,
    'host_identity_id', s.host_identity_id,
    'seat_count', s.seat_count,
    'human_seat_count', s.human_seat_count,
    'bot_seat_count', s.bot_seat_count,
    'cost_per_seat', s.cost_per_seat::text,
    'total_collected', s.total_collected::text,
    'total_wallet_rewarded', s.total_wallet_rewarded::text,
    'total_guest_escrow', s.total_guest_escrow::text,
    'total_bot_collection', s.total_bot_collection::text,
    'total_world_bank_cut', s.total_world_bank_cut::text,
    'total_refunded', s.total_refunded::text,
    'refund_reason', s.refund_reason,
    'status', s.status,
    'settled_at', s.settled_at,
    'created_at', s.created_at
  );
$$;

create view public.match_economy_settlements_safe as
select
  match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
  cost_per_seat::text as cost_per_seat,
  total_collected::text as total_collected,
  total_wallet_rewarded::text as total_wallet_rewarded,
  total_guest_escrow::text as total_guest_escrow,
  total_bot_collection::text as total_bot_collection,
  total_world_bank_cut::text as total_world_bank_cut,
  total_refunded::text as total_refunded,
  refund_reason, status, settled_at, created_at, updated_at
from public.match_economy_settlements;

revoke all on public.match_economy_settlements_safe from public, anon, authenticated;
grant select on public.match_economy_settlements_safe to service_role;
revoke insert, update, delete, truncate on public.match_economy_settlements_safe from service_role;

create view public.world_bank_accounts_safe as
select
  id, name,
  base_fee_revenue::text as base_fee_revenue,
  bot_prize_revenue::text as bot_prize_revenue,
  guest_escrow_liability::text as guest_escrow_liability,
  total_voucher_redeemed::text as total_voucher_redeemed,
  created_at, updated_at
from public.world_bank_accounts;

revoke all on public.world_bank_accounts_safe from public, anon, authenticated;
grant select on public.world_bank_accounts_safe to service_role;
revoke insert, update, delete, truncate on public.world_bank_accounts_safe from service_role;

-- ═══════════════════════ 3a. Restore list_stale_committed_settlements ═══
-- Dropped in step 1a because its return type depended on the view above;
-- unchanged body, now re-declared against the just-restored (narrower) view.

create function public.list_stale_committed_settlements(
  p_older_than interval default interval '1 hour'
)
returns setof public.match_economy_settlements_safe
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select * from public.match_economy_settlements_safe
  where status = 'COMMITTED' and created_at < now() - p_older_than
  order by created_at asc;
$$;

revoke all on function public.list_stale_committed_settlements(interval) from public, anon, authenticated;
grant execute on function public.list_stale_committed_settlements(interval) to service_role;

-- ═══════════════════════ 4. Revert extended CHECK constraints ═══════════
-- Only safe if no row currently has status = 'ABANDONMENT_FORFEITED' — see
-- the header warning. Fails loudly (constraint violation) rather than
-- silently dropping forfeited rows' data if any exist.

alter table public.match_economy_settlements
  drop constraint if exists settlement_balance_conservation;
alter table public.match_economy_settlements
  add constraint settlement_balance_conservation check (
    status = 'COMMITTED' or
    (
      status = 'REFUNDED' and
      total_refunded = total_collected and
      total_wallet_rewarded = 0 and
      total_guest_escrow = 0 and
      total_bot_collection = 0 and
      total_world_bank_cut = 0
    ) or
    (
      status = 'SETTLED' and
      total_collected = (total_wallet_rewarded + total_guest_escrow + total_bot_collection + total_world_bank_cut) and
      total_refunded = 0
    )
  );

alter table public.match_economy_settlements
  drop constraint if exists match_economy_settlements_status_check;
alter table public.match_economy_settlements
  add constraint match_economy_settlements_status_check
  check (status in ('COMMITTED', 'SETTLED', 'REFUNDED'));

alter table public.world_bank_ledger
  drop constraint if exists world_bank_ledger_entry_type_check;
alter table public.world_bank_ledger
  add constraint world_bank_ledger_entry_type_check
  check (entry_type in (
    'BASE_FEE_REVENUE', 'SOLO_ENTRY_COLLECTION', 'BOT_PRIZE_REVENUE',
    'GUEST_ESCROW_DEPOSIT', 'GUEST_ESCROW_REDEMPTION', 'ADMIN_CORRECTION'
  ));

alter table public.world_bank_ledger
  drop constraint if exists world_bank_ledger_affected_balance_check;
alter table public.world_bank_ledger
  add constraint world_bank_ledger_affected_balance_check
  check (affected_balance in (
    'base_fee_revenue', 'bot_prize_revenue', 'guest_escrow_liability', 'total_voucher_redeemed'
  ));

-- ═══════════════════════ 5. Drop the new columns ═════════════════════════

alter table public.world_bank_accounts drop column if exists abandonment_forfeiture_revenue;
alter table public.match_economy_settlements drop column if exists forfeiture_reason;
alter table public.match_economy_settlements drop column if exists total_forfeited;

commit;
