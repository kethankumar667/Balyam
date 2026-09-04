-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260906000000_admin_adjust_wallet.sql
-- Description: Creates public.admin_adjust_wallet(text, bigint, text, text, text)
--              allowing authorized super admins to manually top up any player's
--              wallet with row-level locks, ledger auditing, and strict
--              mathematical reconciliation.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.admin_adjust_wallet(
  p_identity_id text,
  p_amount bigint,
  p_admin_id text,
  p_reason text,
  p_idempotency_key text
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
    'ADMIN_ADJUSTMENT',
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

revoke all on function public.admin_adjust_wallet(text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_adjust_wallet(text, bigint, text, text, text) to service_role;
