-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260916000000_economy_daily_reward_ledger_type.sql
-- Description: Gives the 30-day daily login streak's coin payout its own
--              `coin_ledger_entries.entry_type` ('DAILY_REWARD_CREDIT')
--              instead of reusing 'ADMIN_ADJUSTMENT'. That reuse made every
--              streak claim render as a generic "Adjustment" in the client
--              wallet drawer, and also polluted the Operational Audit Logs'
--              "Wallet Adjustment" trail — `AuditController.ts` filters
--              `coin_ledger_entries` on `entry_type = 'ADMIN_ADJUSTMENT'`
--              specifically to surface genuine MANUAL operator top-ups, not
--              routine automated per-player-per-day payouts.
--
--              `admin_adjust_wallet` gains an OPTIONAL trailing parameter,
--              `p_entry_type`, defaulting to 'ADMIN_ADJUSTMENT' — every
--              existing caller (the real admin console) is unaffected.
--              `StreakService` is the one caller that passes
--              'DAILY_REWARD_CREDIT' explicitly.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Expand the entry_type CHECK constraint to allow the new value.
--    Same drop-and-recreate-by-default-name pattern already used by
--    20260905000000_economy_expand_prize_schedules_6_to_12.sql.
alter table public.coin_ledger_entries
  drop constraint if exists coin_ledger_entries_entry_type_check;

alter table public.coin_ledger_entries
  add constraint coin_ledger_entries_entry_type_check check (entry_type in (
                            'STARTER_GRANT',
                            'ROOM_ENTRY_DEBIT',
                            'SOLO_ENTRY_DEBIT',
                            'BOT_ENTRY_DEBIT',
                            'MATCH_PRIZE_CREDIT',
                            'VOUCHER_REDEMPTION',
                            'MATCH_REFUND',
                            'ADMIN_ADJUSTMENT',
                            'DAILY_REWARD_CREDIT'
                          ));

-- 2. Replace admin_adjust_wallet with a 6-arg overload (the new trailing
--    p_entry_type param). The old 5-arg overload is dropped explicitly —
--    `create or replace` cannot widen a function's argument list, it can
--    only replace a function with the IDENTICAL argument types, so leaving
--    the old signature in place would create a second, redundant overload
--    instead of upgrading the one that PostgREST/the app actually calls.
drop function if exists public.admin_adjust_wallet(text, bigint, text, text, text);

create function public.admin_adjust_wallet(
  p_identity_id text,
  p_amount bigint,
  p_admin_id text,
  p_reason text,
  p_idempotency_key text,
  p_entry_type text default 'ADMIN_ADJUSTMENT'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet         public.coin_wallets;
  v_balance_before bigint;
  v_version_before bigint;
  v_existing_entry public.coin_ledger_entries;
  v_entry_type     text;
begin
  -- 1. Argument validation
  if p_identity_id is null or char_length(trim(p_identity_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: identity_id cannot be null or empty';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: top-up amount must be strictly greater than 0';
  end if;

  if p_admin_id is null or char_length(trim(p_admin_id)) = 0 then
    raise exception 'INVALID_ADMIN_ID: admin_id cannot be null or empty';
  end if;

  if p_idempotency_key is null or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: idempotency_key cannot be null or empty';
  end if;

  -- Falls back to the same default the OLD function hardcoded, so a caller
  -- that passes null/blank (or predates this migration's TS callers) keeps
  -- today's behavior exactly.
  v_entry_type := coalesce(nullif(trim(p_entry_type), ''), 'ADMIN_ADJUSTMENT');
  if v_entry_type not in (
    'STARTER_GRANT', 'ROOM_ENTRY_DEBIT', 'SOLO_ENTRY_DEBIT', 'BOT_ENTRY_DEBIT',
    'MATCH_PRIZE_CREDIT', 'VOUCHER_REDEMPTION', 'MATCH_REFUND',
    'ADMIN_ADJUSTMENT', 'DAILY_REWARD_CREDIT'
  ) then
    raise exception 'INVALID_ENTRY_TYPE: % is not a recognized ledger entry type', v_entry_type;
  end if;

  -- 2. Ensure wallet exists (provisions starter grant if new identity)
  perform public.ensure_wallet(p_identity_id);

  -- 3. Idempotency check: has this idempotency_key already been applied?
  select * into v_existing_entry
  from public.coin_ledger_entries
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    select * into v_wallet from public.coin_wallets where identity_id = p_identity_id;
    return jsonb_build_object(
      'applied', false,
      'operation', 'admin_adjust_wallet',
      'idempotencyKey', p_idempotency_key,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  -- 4. Lock the wallet row
  select * into v_wallet
  from public.coin_wallets
  where identity_id = p_identity_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;

  if v_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: wallet for % is frozen', p_identity_id;
  end if;

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  -- 5. Atomic balance update
  update public.coin_wallets
  set balance = balance + p_amount,
      lifetime_granted = lifetime_granted + p_amount,
      version = version + 1,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  -- 6. Insert audit ledger row
  insert into public.coin_ledger_entries (
    wallet_id,
    amount,
    balance_before,
    balance_after,
    wallet_version_before,
    wallet_version_after,
    entry_type,
    source_kind,
    source_id,
    idempotency_key,
    description
  ) values (
    p_identity_id,
    p_amount,
    v_balance_before,
    v_wallet.balance,
    v_version_before,
    v_wallet.version,
    v_entry_type,
    'admin',
    p_admin_id,
    p_idempotency_key,
    coalesce(nullif(trim(p_reason), ''), 'Admin manual top-up')
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'admin_adjust_wallet',
    'idempotencyKey', p_idempotency_key,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.admin_adjust_wallet(text, bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_wallet(text, bigint, text, text, text, text) to service_role;
