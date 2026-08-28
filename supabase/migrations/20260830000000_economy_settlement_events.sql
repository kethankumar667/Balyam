-- BHALYAM Economy — Durable Settlement Event Auditing, Phase 6A
--
-- Migration: 20260830000000_economy_settlement_events.sql
-- Status: DRAFT — additive to 20260826000000_economy_v1.sql and 20260828000000_economy_abandonment_forfeiture.sql
--
-- ── Intent & Invariants ───────────────────────────────────────────────────
-- Creates a durable, append-only audit trail (public.settlement_events) for
-- every Economy V1 settlement state transition and operational attempt.
--
-- 1. Financial state remains authoritative in existing economy tables:
--    `match_economy_settlements`, `coin_wallets`, `coin_ledger_entries`,
--    `world_bank_accounts`, `world_bank_ledger`, `reward_vouchers`.
-- 2. `settlement_events` records evidence about financial operations.
-- 3. An audit-event failure inside an economy RPC rolls back the entire transaction.
-- 4. An event never claims that a financial operation succeeded unless that
--    operation actually succeeded in the exact same transaction.

-- ═══════════════════════ 1. Table: settlement_events ═════════════════════

create table if not exists public.settlement_events (
  id               bigserial primary key,
  match_id         text not null references public.match_economy_settlements(match_id) on delete restrict,
  sequence_number  integer not null check (sequence_number >= 1),
  event_type       text not null check (
    event_type in (
      'MATCH_COMMITTED',
      'MATCH_COMMITMENT_REPLAYED',
      'MATCH_SETTLED',
      'MATCH_SETTLEMENT_REPLAYED',
      'MATCH_REFUNDED',
      'MATCH_REFUND_REPLAYED',
      'MATCH_FORFEITED',
      'MATCH_FORFEITURE_REPLAYED',
      'SETTLEMENT_RACE_LOST',
      'RECONCILIATION_AUDITED',
      'STALE_SETTLEMENT_DETECTED'
    )
  ),
  previous_status  text check (
    previous_status is null or
    previous_status in ('COMMITTED', 'SETTLED', 'REFUNDED', 'ABANDONMENT_FORFEITED')
  ),
  current_status   text not null check (
    current_status in ('COMMITTED', 'SETTLED', 'REFUNDED', 'ABANDONMENT_FORFEITED')
  ),
  operation        text not null,
  idempotency_key  text not null,
  applied          boolean not null,
  is_replay        boolean not null default false,
  race_lost        boolean not null default false,
  initiator_kind   text not null default 'system' check (
    initiator_kind in ('system', 'operator', 'player')
  ),
  initiator_id     text,
  reason           text,
  payload          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),

  constraint settlement_events_match_seq_unique unique (match_id, sequence_number)
);

comment on table public.settlement_events is
  'Append-only, immutable audit trail of all settlement lifecycle state transitions, idempotent replays, race losses, and reconciliation checks for BHALYAM Economy V1.';

create index if not exists settlement_events_match_id_seq_idx
  on public.settlement_events (match_id, sequence_number);

create index if not exists settlement_events_type_created_idx
  on public.settlement_events (event_type, created_at);

-- ═══════════════════════ 2. Security & Privilege Hardening ═══════════════

alter table public.settlement_events enable row level security;
alter table public.settlement_events force row level security;

revoke all on table public.settlement_events from public, anon, authenticated;
revoke insert, update, delete on table public.settlement_events from service_role;
grant select on table public.settlement_events to service_role;

-- REVOKE alone only restricts the roles it names — it does not bind the
-- table owner, and does not survive a future migration re-granting the
-- privilege. `coin_ledger_entries` and `world_bank_ledger` both back their
-- own "immutable" claim with a trigger that raises unconditionally on
-- UPDATE/DELETE, regardless of who or what role attempts it; this table's
-- own comment makes the same claim, so it gets the same real guarantee,
-- reusing the existing prevent_ledger_mutation() function rather than a
-- second copy of it.
drop trigger if exists guard_settlement_events_immutable on public.settlement_events;
create trigger guard_settlement_events_immutable
  before update or delete on public.settlement_events
  for each row execute function public.prevent_ledger_mutation();

-- ═══════════════════════ 3. Safe View & Helpers ══════════════════════════

create or replace view public.settlement_events_safe as
  select
    id,
    match_id,
    sequence_number,
    event_type,
    previous_status,
    current_status,
    operation,
    idempotency_key,
    applied,
    is_replay,
    race_lost,
    initiator_kind,
    initiator_id,
    reason,
    payload,
    created_at
  from public.settlement_events;

comment on view public.settlement_events_safe is
  'Read-only view of settlement audit events.';

grant select on public.settlement_events_safe to service_role;

-- ═══════════════════════ 4. emit_settlement_event helper ═════════════════

create or replace function public.emit_settlement_event(
  p_match_id          text,
  p_event_type        text,
  p_previous_status   text,
  p_current_status    text,
  p_operation         text,
  p_idempotency_key   text,
  p_applied           boolean,
  p_is_replay         boolean,
  p_race_lost         boolean,
  p_initiator_kind    text default 'system',
  p_initiator_id      text default null,
  p_reason            text default null,
  p_payload           jsonb default '{}'::jsonb
)
returns public.settlement_events
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_next_seq integer;
  v_event    public.settlement_events;
begin
  select coalesce(max(sequence_number), 0) + 1 into v_next_seq
  from public.settlement_events
  where match_id = p_match_id;

  insert into public.settlement_events (
    match_id,
    sequence_number,
    event_type,
    previous_status,
    current_status,
    operation,
    idempotency_key,
    applied,
    is_replay,
    race_lost,
    initiator_kind,
    initiator_id,
    reason,
    payload,
    created_at
  ) values (
    p_match_id,
    v_next_seq,
    p_event_type,
    p_previous_status,
    p_current_status,
    p_operation,
    p_idempotency_key,
    p_applied,
    p_is_replay,
    p_race_lost,
    coalesce(p_initiator_kind, 'system'),
    p_initiator_id,
    p_reason,
    coalesce(p_payload, '{}'::jsonb),
    now()
  )
  returning * into v_event;

  return v_event;
end;
$$;

revoke all on function public.emit_settlement_event from public, anon, authenticated;
grant execute on function public.emit_settlement_event to service_role;

-- ═══════════════════════ 5. Updated commit_match_entry ═══════════════════

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
    perform public.emit_settlement_event(
      p_match_id,
      'MATCH_COMMITMENT_REPLAYED',
      v_settlement.status,
      v_settlement.status,
      'commit_match_entry',
      v_idempotency,
      false,
      true,
      false,
      'system',
      p_host_identity_id,
      'Idempotent match commitment replay',
      jsonb_build_object(
        'seat_count', v_settlement.seat_count,
        'total_collected', v_settlement.total_collected::text
      )
    );

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
  where config_version = v_config.version and seat_count = p_seat_count;
  if not found then
    raise exception 'UNSUPPORTED_SEAT_COUNT: no prize schedule for seat count %', p_seat_count;
  end if;

  -- Unconditional, matching 20260826000000_economy_v1.sql and
  -- 20260829000000_economy_seat_capacity_contract.sql byte-for-byte — this
  -- migration's only job is settlement-event instrumentation, not a new
  -- is_solo cost carve-out. See this migration's own header for why.
  v_total_cost := p_seat_count * v_config.seat_cost_coins;

  select * into v_host_wallet from public.coin_wallets where identity_id = p_host_identity_id for update;
  if v_host_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: wallet % is frozen', p_host_identity_id;
  end if;

  if v_host_wallet.balance < v_total_cost then
    raise exception 'INSUFFICIENT_FUNDS: wallet balance % is less than required commitment %',
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

  -- Matching 20260826000000_economy_v1.sql /
  -- 20260829000000_economy_seat_capacity_contract.sql byte-for-byte — see
  -- the note above.
  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_host_identity_id, -v_total_cost, v_balance_before, v_host_wallet.balance,
    v_version_before, v_host_wallet.version, v_entry_type, 'match', p_match_id, v_idempotency,
    case
      when p_is_solo then 'Solo match entry fee'
      else 'Room entry fee commitment (' || p_seat_count || ' seats)'
    end
  );

  insert into public.match_economy_settlements (
    match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
    cost_per_seat, total_collected, status, config_snapshot, prize_schedule_snapshot
  ) values (
    p_match_id, p_room_code, p_host_identity_id, p_seat_count, p_human_seat_count, p_bot_seat_count,
    v_config.seat_cost_coins, v_total_cost, 'COMMITTED', to_jsonb(v_config), to_jsonb(v_schedule)
  )
  returning * into v_settlement;

  perform public.emit_settlement_event(
    p_match_id,
    'MATCH_COMMITTED',
    null,
    'COMMITTED',
    'commit_match_entry',
    v_idempotency,
    true,
    false,
    false,
    'system',
    p_host_identity_id,
    null,
    jsonb_build_object(
      'room_code', p_room_code,
      'host_identity_id', p_host_identity_id,
      'seat_count', p_seat_count,
      'human_seat_count', p_human_seat_count,
      'bot_seat_count', p_bot_seat_count,
      'cost_per_seat', v_config.seat_cost_coins::text,
      'total_collected', v_total_cost::text,
      'is_solo', p_is_solo
    )
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'commit_match_entry',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.commit_match_entry from public, anon, authenticated;
grant execute on function public.commit_match_entry to service_role;

-- ═══════════════════════ 6. Updated economy_apply_refund ═════════════════

-- Parameter names below are byte-for-byte identical to the original
-- 20260826000000_economy_v1.sql declaration (p_settlement, p_idempotency_key,
-- p_reason) — CREATE OR REPLACE FUNCTION cannot rename an existing
-- parameter (PostgreSQL raises "cannot change name of input parameter"),
-- so this is a hard requirement for the migration to apply at all, not a
-- style choice.
create or replace function public.economy_apply_refund(
  p_settlement      public.match_economy_settlements,
  p_idempotency_key text,
  p_reason          text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_host_wallet    public.coin_wallets;
  v_settlement     public.match_economy_settlements;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_host_wallet
  from public.coin_wallets
  where identity_id = p_settlement.host_identity_id for update;

  v_balance_before := v_host_wallet.balance;
  v_version_before := v_host_wallet.version;

  update public.coin_wallets
  set balance = balance + p_settlement.total_collected,
      version = version + 1,
      lifetime_refunded = lifetime_refunded + p_settlement.total_collected,
      updated_at = now()
  where identity_id = p_settlement.host_identity_id
  returning * into v_host_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_settlement.host_identity_id, p_settlement.total_collected, v_balance_before, v_host_wallet.balance,
    v_version_before, v_host_wallet.version, 'MATCH_REFUND', 'match', p_settlement.match_id,
    p_idempotency_key,
    coalesce(p_reason, 'Match entry fee refund')
  );

  update public.match_economy_settlements
  set total_refunded = p_settlement.total_collected,
      refund_reason  = p_reason,
      status         = 'REFUNDED',
      settled_at     = now(),
      updated_at     = now()
  where match_id = p_settlement.match_id
  returning * into v_settlement;

  perform public.emit_settlement_event(
    p_settlement.match_id,
    'MATCH_REFUNDED',
    p_settlement.status,
    'REFUNDED',
    'economy_apply_refund',
    p_idempotency_key,
    true,
    false,
    false,
    'system',
    p_settlement.host_identity_id,
    p_reason,
    jsonb_build_object(
      'total_refunded', p_settlement.total_collected::text,
      'host_identity_id', p_settlement.host_identity_id
    )
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'refund_match_entry',
    'idempotencyKey', p_idempotency_key,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.economy_apply_refund from public, anon, authenticated;
grant execute on function public.economy_apply_refund to service_role;

-- ═══════════════════════ 7. Updated settle_match_economy ═════════════════

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
    if v_settlement.status = 'SETTLED' then
      perform public.emit_settlement_event(
        p_match_id,
        'MATCH_SETTLEMENT_REPLAYED',
        'SETTLED',
        'SETTLED',
        'settle_match_economy',
        v_idempotency,
        false,
        true,
        false,
        'system',
        v_settlement.host_identity_id,
        'Idempotent match settlement replay',
        jsonb_build_object(
          'total_wallet_rewarded', v_settlement.total_wallet_rewarded::text,
          'total_guest_escrow', v_settlement.total_guest_escrow::text,
          'total_bot_collection', v_settlement.total_bot_collection::text,
          'total_world_bank_cut', v_settlement.total_world_bank_cut::text
        )
      );
    else
      perform public.emit_settlement_event(
        p_match_id,
        'SETTLEMENT_RACE_LOST',
        v_settlement.status,
        v_settlement.status,
        'settle_match_economy',
        v_idempotency,
        false,
        false,
        true,
        'system',
        v_settlement.host_identity_id,
        'Settlement attempt arrived after match had already reached terminal state: ' || v_settlement.status,
        jsonb_build_object(
          'terminal_status', v_settlement.status,
          'total_collected', v_settlement.total_collected::text
        )
      );
    end if;

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

  perform public.emit_settlement_event(
    p_match_id,
    'MATCH_SETTLED',
    'COMMITTED',
    'SETTLED',
    'settle_match_economy',
    v_idempotency,
    true,
    false,
    false,
    'system',
    v_settlement.host_identity_id,
    null,
    jsonb_build_object(
      'total_wallet_rewarded', v_total_wallet_rewarded::text,
      'total_guest_escrow', v_total_guest_escrow::text,
      'total_bot_collection', v_total_bot_collection::text,
      'total_world_bank_cut', v_total_world_bank_cut::text,
      'total_collected', v_settlement.total_collected::text
    )
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'settle_match_economy',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.settle_match_economy from public, anon, authenticated;
grant execute on function public.settle_match_economy to service_role;

-- ═══════════════════════ 8. Updated refund_match_entry ═══════════════════

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
    perform public.emit_settlement_event(
      p_match_id,
      'MATCH_REFUND_REPLAYED',
      'REFUNDED',
      'REFUNDED',
      'refund_match_entry',
      v_idempotency,
      false,
      true,
      false,
      'system',
      v_settlement.host_identity_id,
      'Idempotent match refund replay',
      jsonb_build_object(
        'total_refunded', v_settlement.total_refunded::text,
        'refund_reason', v_settlement.refund_reason
      )
    );

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

revoke all on function public.refund_match_entry from public, anon, authenticated;
grant execute on function public.refund_match_entry to service_role;

-- ═══════════════════════ 9. Updated forfeit_match_entry ══════════════════

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
  v_wb_balance_before bigint;
  v_idempotency       text := 'match-forfeit:' || p_match_id;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status = 'ABANDONMENT_FORFEITED' then
    perform public.emit_settlement_event(
      p_match_id,
      'MATCH_FORFEITURE_REPLAYED',
      'ABANDONMENT_FORFEITED',
      'ABANDONMENT_FORFEITED',
      'forfeit_match_entry',
      v_idempotency,
      false,
      true,
      false,
      'system',
      v_settlement.host_identity_id,
      'Idempotent match forfeiture replay',
      jsonb_build_object(
        'total_forfeited', v_settlement.total_forfeited::text,
        'forfeiture_reason', v_settlement.forfeiture_reason
      )
    );

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

  perform public.emit_settlement_event(
    p_match_id,
    'MATCH_FORFEITED',
    'COMMITTED',
    'ABANDONMENT_FORFEITED',
    'forfeit_match_entry',
    v_idempotency,
    true,
    false,
    false,
    'system',
    v_settlement.host_identity_id,
    p_reason,
    jsonb_build_object(
      'total_forfeited', v_settlement.total_collected::text,
      'host_identity_id', v_settlement.host_identity_id,
      'forfeiture_reason', p_reason
    )
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'forfeit_match_entry',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.forfeit_match_entry from public, anon, authenticated;
grant execute on function public.forfeit_match_entry to service_role;

-- ═══════════════════════ 10. Updated reconcile_match_settlement ══════════

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
volatile
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_s           public.match_economy_settlements;
  v_disbursed   bigint;
  v_is_bal      boolean;
  v_details     jsonb;
  v_idempotency text := 'reconcile:' || p_match_id;
begin
  -- Same serialization style as commit/settle/refund/forfeit above: the
  -- advisory lock plus `for update` on the settlement row is what makes
  -- emit_settlement_event's `max(sequence_number) + 1` allocation below
  -- safe. Without a lock held across both the read and the eventual
  -- insert, two concurrent reconcile calls for the same match_id can both
  -- compute the same next sequence_number and race on the
  -- settlement_events_match_seq_unique constraint. This was audited as a
  -- genuine gap (reconcile previously used a bare, unlocked SELECT) and is
  -- fixed here rather than left as a "read-only, so it's fine" exception —
  -- emitting an audit event is itself a write, and needs the same
  -- discipline as every other writer of this table.
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_s from public.match_economy_settlements mes where mes.match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_FOUND: match settlement % does not exist', p_match_id;
  end if;

  v_disbursed := v_s.total_wallet_rewarded + v_s.total_guest_escrow + v_s.total_bot_collection
    + v_s.total_world_bank_cut + v_s.total_refunded + v_s.total_forfeited;

  v_is_bal := ((v_s.status = 'COMMITTED' and v_disbursed = 0) or
               (v_s.status in ('SETTLED', 'REFUNDED', 'ABANDONMENT_FORFEITED') and v_s.total_collected = v_disbursed));

  v_details := jsonb_build_object(
    'wallet_rewarded', v_s.total_wallet_rewarded::text,
    'guest_escrow', v_s.total_guest_escrow::text,
    'bot_collection', v_s.total_bot_collection::text,
    'world_bank_cut', v_s.total_world_bank_cut::text,
    'refunded', v_s.total_refunded::text,
    'forfeited', v_s.total_forfeited::text
  );

  perform public.emit_settlement_event(
    p_match_id,
    'RECONCILIATION_AUDITED',
    v_s.status,
    v_s.status,
    'reconcile_match_settlement',
    v_idempotency,
    true,
    false,
    false,
    'operator',
    null,
    'Settlement balance reconciliation audit executed',
    jsonb_build_object(
      'is_balanced', v_is_bal,
      'collected', v_s.total_collected::text,
      'disbursed', v_disbursed::text,
      'delta', (v_s.total_collected - v_disbursed)::text,
      'details', v_details
    )
  );

  return query select
    v_s.match_id,
    v_s.status,
    v_is_bal,
    v_s.total_collected::text,
    v_disbursed::text,
    (v_s.total_collected - v_disbursed)::text,
    v_details;
end;
$$;

revoke all on function public.reconcile_match_settlement from public, anon, authenticated;
grant execute on function public.reconcile_match_settlement to service_role;

-- ═══════════════════════ 11. Read RPC: list_settlement_events ════════════

create or replace function public.list_settlement_events(p_match_id text)
returns setof public.settlement_events_safe
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select *
  from public.settlement_events_safe
  where match_id = p_match_id
  order by sequence_number asc, id asc;
$$;

revoke all on function public.list_settlement_events from public, anon, authenticated;
grant execute on function public.list_settlement_events to service_role;

-- ═══════════════════════ 12. Function access governance ══════════════════

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'ensure_wallet', 'grant_starter_coins', 'commit_match_entry', 'settle_match_economy',
        'refund_match_entry', 'forfeit_match_entry', 'issue_guest_voucher', 'redeem_reward_voucher',
        'reconcile_match_settlement', 'list_stale_committed_settlements', 'emit_settlement_event',
        'list_settlement_events'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end;
$$;
