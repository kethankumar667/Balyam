-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260925000000_cosmetics_refund_capability.sql
-- Description: Self-service cosmetics refund. Closes the "purchase and
--              refund states are defined" Foundation exit-gate gap
--              documented in docs/cosmetics/REFUND_RULES.md — a coin-
--              purchased cosmetic can be refunded within a 15-minute
--              window of purchase, exactly once, atomically crediting the
--              wallet, revoking the entitlement, and unequipping the item
--              from every scope it was equipped in.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Expand coin_ledger_entries entry_type check to include COSMETIC_REFUND.
--    Preserves all 10 existing values intact.
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
    'COSMETIC_REFUND'
  ));

-- 2. Account-Scoped Idempotency Refund Requests Table
--    Mirrors cosmetic_purchase_requests exactly, for the same reason:
--    replaying a key for the same item returns the previous result, while
--    replaying the same key for a different item raises a conflict error.
create table if not exists public.cosmetic_refund_requests (
  user_id           text not null references public.player_identities (player_id) on delete cascade,
  idempotency_key   uuid not null,
  cosmetic_id       text not null references public.cosmetic_catalog (id) on delete restrict,
  ledger_entry_id   bigint references public.coin_ledger_entries (id) on delete set null,
  resulting_balance bigint not null,
  result            jsonb not null,
  created_at        timestamptz not null default now(),

  primary key (user_id, idempotency_key)
);

comment on table public.cosmetic_refund_requests is
  'Account-scoped idempotency log for cosmetic refunds with stored results.';

-- 3. Row Level Security
alter table public.cosmetic_refund_requests enable row level security;

create policy "own refund requests readable"
  on public.cosmetic_refund_requests for select
  to authenticated
  using (
    user_id = auth.uid()::text or
    user_id in (select player_id from public.player_identities where auth_user_id = auth.uid())
  );

revoke insert, update, delete on public.cosmetic_refund_requests from anon, authenticated;
grant select on public.cosmetic_refund_requests to authenticated;

-- 4. Secure Atomic Refund Stored Procedure
--    `refund_cosmetic_internal` executes the transaction under service role.
--    `refund_cosmetic` derives identity strictly from auth.uid() and never
--    accepts p_user_id from the client — same split as purchase_cosmetic(_internal).
create or replace function public.refund_cosmetic_internal(
  p_user_id text,
  p_cosmetic_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_req public.cosmetic_refund_requests;
  v_item         public.cosmetic_catalog;
  v_ownership    public.user_cosmetics;
  v_purchase     public.cosmetic_purchase_requests;
  v_wallet       public.coin_wallets;
  v_new_balance  bigint;
  v_ledger_id    bigint;
  v_result       jsonb;
begin
  if p_user_id is null or char_length(trim(p_user_id)) = 0 then
    raise exception using
      errcode = '28000',
      message = 'AUTHENTICATION_REQUIRED: A valid user identity is required.';
  end if;

  -- 1. Check account-scoped idempotency
  select * into v_existing_req
  from public.cosmetic_refund_requests
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

  if v_existing_req.user_id is not null then
    if v_existing_req.cosmetic_id <> p_cosmetic_id then
      raise exception using
        errcode = '23505',
        message = 'IDEMPOTENCY_MISMATCH: Idempotency key replayed with a different cosmetic ID.';
    end if;
    return jsonb_set(v_existing_req.result, '{applied}', 'false'::jsonb);
  end if;

  -- 2. Verify cosmetic exists (need its price even if since deactivated)
  select * into v_item
  from public.cosmetic_catalog
  where id = p_cosmetic_id;

  if v_item.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'INVALID_COSMETIC: Cosmetic item does not exist.';
  end if;

  -- 3. Verify ownership and that it was actually bought with coins —
  --    STREAK_MILESTONE and ADMIN_GRANT entitlements were never paid for
  --    and are never refundable.
  select * into v_ownership
  from public.user_cosmetics
  where user_id = p_user_id and cosmetic_id = p_cosmetic_id;

  if v_ownership.id is null then
    v_result := jsonb_build_object('applied', false, 'code', 'NOT_OWNED', 'cosmeticId', p_cosmetic_id);
    insert into public.cosmetic_refund_requests (user_id, idempotency_key, cosmetic_id, resulting_balance, result)
    values (p_user_id, p_idempotency_key, p_cosmetic_id, 0, v_result);
    return v_result;
  end if;

  if v_ownership.source_type <> 'COIN_PURCHASE' then
    v_result := jsonb_build_object('applied', false, 'code', 'NOT_REFUNDABLE', 'cosmeticId', p_cosmetic_id);
    insert into public.cosmetic_refund_requests (user_id, idempotency_key, cosmetic_id, resulting_balance, result)
    values (p_user_id, p_idempotency_key, p_cosmetic_id, 0, v_result);
    return v_result;
  end if;

  -- 4. Refund window: 15 minutes from the most recent successful purchase
  --    of this exact item by this user.
  select * into v_purchase
  from public.cosmetic_purchase_requests
  where user_id = p_user_id and cosmetic_id = p_cosmetic_id and result->>'code' = 'PURCHASED'
  order by created_at desc
  limit 1;

  if v_purchase.user_id is null or v_purchase.created_at < now() - interval '15 minutes' then
    v_result := jsonb_build_object('applied', false, 'code', 'WINDOW_EXPIRED', 'cosmeticId', p_cosmetic_id);
    insert into public.cosmetic_refund_requests (user_id, idempotency_key, cosmetic_id, resulting_balance, result)
    values (p_user_id, p_idempotency_key, p_cosmetic_id, 0, v_result);
    return v_result;
  end if;

  -- 5. Lock user wallet row for atomic credit
  select * into v_wallet
  from public.coin_wallets
  where identity_id = p_user_id
  for update;

  if v_wallet.identity_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'WALLET_NOT_FOUND: User coin wallet does not exist.';
  end if;

  if v_wallet.is_frozen then
    raise exception using
      errcode = '55000',
      message = 'WALLET_FROZEN: Wallet is frozen and cannot receive a refund.';
  end if;

  -- 6. Atomic wallet credit — lifetime_refunded, never lifetime_earned or
  --    lifetime_granted, so the wallet reconciliation invariant
  --    (balance = lifetime_granted + lifetime_earned + lifetime_refunded -
  --    lifetime_spent) keeps holding.
  v_new_balance := v_wallet.balance + v_item.price_coins;

  update public.coin_wallets
  set balance = v_new_balance,
      version = version + 1,
      lifetime_refunded = lifetime_refunded + v_item.price_coins,
      updated_at = now()
  where identity_id = p_user_id;

  -- 7. Insert ledger entry (positive amount — a credit)
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
    p_user_id,
    v_item.price_coins,
    v_wallet.balance,
    v_new_balance,
    v_wallet.version,
    v_wallet.version + 1,
    'COSMETIC_REFUND',
    'cosmetics',
    p_cosmetic_id,
    p_idempotency_key::text,
    'Refunded cosmetic: ' || v_item.name
  )
  returning id into v_ledger_id;

  -- 8. Revoke the entitlement
  delete from public.user_cosmetics
  where user_id = p_user_id and cosmetic_id = p_cosmetic_id;

  -- 9. Unequip from every (category, scope) slot it currently occupies —
  --    a refunded item must never remain equipped and rendering.
  delete from public.user_equipped_cosmetics
  where user_id = p_user_id and cosmetic_id = p_cosmetic_id;

  -- 10. Record in refund requests table
  v_result := jsonb_build_object(
    'applied', true,
    'code', 'REFUNDED',
    'cosmeticId', p_cosmetic_id,
    'balance', v_new_balance::text
  );

  insert into public.cosmetic_refund_requests (
    user_id,
    idempotency_key,
    cosmetic_id,
    ledger_entry_id,
    resulting_balance,
    result
  ) values (
    p_user_id,
    p_idempotency_key,
    p_cosmetic_id,
    v_ledger_id,
    v_new_balance,
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.refund_cosmetic_internal(text, text, uuid) from public;
revoke all on function public.refund_cosmetic_internal(text, text, uuid) from anon, authenticated;

-- Client-facing RPC deriving identity exclusively from auth.uid()
create or replace function public.refund_cosmetic(
  p_cosmetic_id text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_uid uuid;
  v_user_id  text;
begin
  v_auth_uid := auth.uid();
  if v_auth_uid is null then
    raise exception using
      errcode = '28000',
      message = 'AUTHENTICATION_REQUIRED: A valid authenticated session is required to refund cosmetics.';
  end if;

  select player_id into v_user_id
  from public.player_identities
  where auth_user_id = v_auth_uid;

  if v_user_id is null then
    v_user_id := v_auth_uid::text;
  end if;

  return public.refund_cosmetic_internal(v_user_id, p_cosmetic_id, p_idempotency_key);
end;
$$;

revoke all on function public.refund_cosmetic(text, uuid) from public;
grant execute on function public.refund_cosmetic(text, uuid) to authenticated;
