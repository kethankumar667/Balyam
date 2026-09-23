-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260930000000_mandali_p2p_wallet_transfer.sql
-- Description: Creates public.transfer_wallet_coins(...), an atomic peer-to-peer
--              wallet transfer used by Mandali's "Send Coins" feature.
--
--              Fixes a currency-duplication bug: the Mandali coin-transfer
--              feature previously called admin_adjust_wallet() (a credit-only
--              top-up primitive — it rejects amount <= 0) TWICE with the same
--              positive amount, once mislabeled "debit sender" — so a "send"
--              actually credited BOTH wallets instead of moving coins between
--              them. This RPC performs the debit and credit in ONE transaction
--              with deterministic wallet-row lock ordering (preventing deadlocks
--              between concurrent opposite-direction transfers) so the two legs
--              are strictly all-or-nothing, mirroring the same pattern already
--              used by commit_match_entry's participant debits and
--              refund_cosmetic_internal's atomic credit.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Expand coin_ledger_entries entry_type check to include the two new P2P
--    transfer types. Preserves all 11 existing values intact. Deliberately NOT
--    reusing ADMIN_ADJUSTMENT — see EconomyRepository.ts's own header comment on
--    why polluting that type breaks the Operational Audit Logs' "genuine manual
--    top-up" filter.
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
    'DAILY_REWARD_CREDIT',
    'COSMETIC_PURCHASE',
    'COSMETIC_REFUND',
    'P2P_TRANSFER_SEND',
    'P2P_TRANSFER_RECEIVE'
  ));

-- 2. Atomic transfer stored procedure.
create or replace function public.transfer_wallet_coins(
  p_from_identity_id text,
  p_to_identity_id text,
  p_amount bigint,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_from_wallet      public.coin_wallets;
  v_to_wallet        public.coin_wallets;
  v_from_bal_before  bigint;
  v_from_ver_before  bigint;
  v_to_bal_before    bigint;
  v_to_ver_before    bigint;
  v_existing_entry   public.coin_ledger_entries;
  v_first_id         text;
  v_second_id        text;
begin
  if p_from_identity_id is null or char_length(trim(p_from_identity_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: from_identity_id cannot be null or empty';
  end if;
  if p_to_identity_id is null or char_length(trim(p_to_identity_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: to_identity_id cannot be null or empty';
  end if;
  if p_from_identity_id = p_to_identity_id then
    raise exception 'INVALID_TRANSFER: cannot transfer coins to the same identity';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: transfer amount must be strictly greater than 0';
  end if;
  if p_idempotency_key is null or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'INVALID_IDEMPOTENCY_KEY: idempotency_key cannot be null or empty';
  end if;

  perform public.ensure_wallet(p_from_identity_id);
  perform public.ensure_wallet(p_to_identity_id);

  -- Idempotency: the SEND leg's ledger row is the marker for "already applied"
  -- — both legs are inserted in this same transaction, so if SEND exists,
  -- RECEIVE provably does too.
  select * into v_existing_entry
  from public.coin_ledger_entries
  where idempotency_key = p_idempotency_key || ':send'
  limit 1;

  if found then
    select * into v_from_wallet from public.coin_wallets where identity_id = p_from_identity_id;
    return jsonb_build_object(
      'applied', false,
      'operation', 'transfer_wallet_coins',
      'idempotencyKey', p_idempotency_key,
      'result', public.wallet_to_safe_jsonb(v_from_wallet)
    );
  end if;

  -- Deterministic lock ordering on both wallet rows prevents deadlocks between
  -- concurrent transfers that touch the same two wallets in opposite directions
  -- (A->B and B->A racing each other).
  if p_from_identity_id < p_to_identity_id then
    v_first_id := p_from_identity_id;
    v_second_id := p_to_identity_id;
  else
    v_first_id := p_to_identity_id;
    v_second_id := p_from_identity_id;
  end if;

  perform 1 from public.coin_wallets where identity_id = v_first_id for update;
  perform 1 from public.coin_wallets where identity_id = v_second_id for update;

  select * into v_from_wallet from public.coin_wallets where identity_id = p_from_identity_id;
  select * into v_to_wallet from public.coin_wallets where identity_id = p_to_identity_id;

  if v_from_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: sender wallet % is frozen', p_from_identity_id;
  end if;
  if v_to_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: recipient wallet % is frozen', p_to_identity_id;
  end if;
  if v_from_wallet.balance < p_amount then
    raise exception 'INSUFFICIENT_FUNDS: sender balance % is less than requested transfer %',
      v_from_wallet.balance, p_amount;
  end if;

  v_from_bal_before := v_from_wallet.balance;
  v_from_ver_before := v_from_wallet.version;
  v_to_bal_before := v_to_wallet.balance;
  v_to_ver_before := v_to_wallet.version;

  update public.coin_wallets
  set balance = balance - p_amount,
      lifetime_spent = lifetime_spent + p_amount,
      version = version + 1,
      updated_at = now()
  where identity_id = p_from_identity_id
  returning * into v_from_wallet;

  update public.coin_wallets
  set balance = balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount,
      version = version + 1,
      updated_at = now()
  where identity_id = p_to_identity_id
  returning * into v_to_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_from_identity_id, -p_amount, v_from_bal_before, v_from_wallet.balance, v_from_ver_before, v_from_wallet.version,
    'P2P_TRANSFER_SEND', 'mandali', p_to_identity_id, p_idempotency_key || ':send',
    coalesce(nullif(trim(p_reason), ''), 'Sent ' || p_amount || ' coins')
  );

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_to_identity_id, p_amount, v_to_bal_before, v_to_wallet.balance, v_to_ver_before, v_to_wallet.version,
    'P2P_TRANSFER_RECEIVE', 'mandali', p_from_identity_id, p_idempotency_key || ':receive',
    coalesce(nullif(trim(p_reason), ''), 'Received ' || p_amount || ' coins')
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'transfer_wallet_coins',
    'idempotencyKey', p_idempotency_key,
    'result', public.wallet_to_safe_jsonb(v_from_wallet)
  );
end;
$$;

revoke all on function public.transfer_wallet_coins(text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.transfer_wallet_coins(text, text, bigint, text, text) to service_role;
