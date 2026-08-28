-- ═══════════════════════════════════════════════════════════════════════
-- Economy V1 — seat-capacity contract fix (P0 incident, 2026-08-28)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Root cause: `commit_match_entry` hardcoded `p_seat_count not between 1
-- and 5` as its OWN upper-bound rejection, evaluated BEFORE the function
-- ever reached its existing, correct "does an approved prize schedule
-- exist for this seat count?" lookup a few lines later (which already
-- raises UNSUPPORTED_SEAT_COUNT on its own, precisely for this case).
-- `shared/catalog.ts` allows Indian Rummy up to 6 seats (and eight other
-- games up to 8, 10, or 12) — a fully-staffed, ready 6-seat Rummy table
-- hit this premature bound and was rejected with INVALID_SEAT_CONFIGURATION,
-- which the client mapped to a generic, false "try again" message.
--
-- This migration removes ONLY that redundant, premature upper-bound
-- check. The schedule-existence lookup — already present, already
-- correct, unchanged here — becomes the sole authority for "is this seat
-- count economically supported," exactly mirroring the equivalent fix
-- applied to `EconomyService.quoteMatchCheckout` / `commitMatchEntry` and
-- `InMemoryEconomyRepository.commitMatchEntryLocked` in this same change
-- (see server/src/economy/economyCapacityContract.ts).
--
-- ── What this migration deliberately does NOT do ─────────────────────────
-- It does not add any prize-schedule row above 5 seats, and it does not
-- relax the `seat_count between 1 and 5` CHECK constraints on
-- `economy_prize_schedules` or `match_economy_settlements`, nor the
-- `placement between 1 and 5` CHECK on `match_economy_participants`. No
-- approved payout values exist anywhere in this repository for 6+ seats
-- — inventing them is explicitly out of scope for this fix (see this
-- change's own completion report, "Financial-Policy Decisions"). Because
-- the schedule lookup for any seat count above 5 still finds nothing and
-- raises UNSUPPORTED_SEAT_COUNT before ever reaching an INSERT into
-- `match_economy_settlements`, those three CHECK constraints remain
-- correct and unreachable for now — they must be revisited together with
-- real schedule data once the product owner approves specific 6+ seat
-- payout numbers.
--
-- Additive, forward-only: this only replaces a function body (functions
-- are always safely replaceable — no table rewritten, no row touched, no
-- constraint dropped). Existing 1..5-seat behavior is byte-for-byte
-- unchanged: for any seat count already in range, this function's
-- observable behavior is identical before and after.

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

  -- Structural validity only — seat count must be a positive integer that
  -- matches human + bot counts. Deliberately NO upper bound here: whether
  -- p_seat_count is economically supported is decided entirely by the
  -- prize-schedule lookup immediately below, never a second hardcoded
  -- ceiling duplicating (and, as of the P0 this fixes, silently drifting
  -- from) the game catalog's own per-game maximums.
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

  select * into v_host_wallet from public.coin_wallets where identity_id = p_host_identity_id for update;

  -- Frozen-wallet policy: a frozen wallet cannot spend. Committing a match
  -- entry is a spend, so it is refused here.
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
