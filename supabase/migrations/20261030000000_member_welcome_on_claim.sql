-- A new member's welcome is paid when they accept the welcome popup, not when the wallet is made.
--
-- ── The problem ───────────────────────────────────────────────────────
-- ensure_wallet() calls grant_starter_coins() the first time anyone looks at a wallet, so a member
-- was handed the whole welcome (member_starter_coins, 5,000) the instant they signed in — before
-- they had finished setting up, and with nothing on screen to say so. The welcome is meant to be a
-- moment: after the privacy choice and the profile steps, the app shows a "Welcome to BHALYAM"
-- popup, and the coins arrive when the member taps its button.
--
--   1. A new MEMBER wallet is made empty (0 coins) and flagged welcome_pending.
--   2. grant_member_welcome() pays member_starter_coins once, when the popup is accepted.
--   3. member_welcome_pending() tells the app whether the popup is owed.
--
-- This is the member twin of the guest "first game on us" rule (20261028000000) and uses the same
-- coin_wallets.welcome_pending flag; a wallet's identity_kind tells the two apart.
--
-- ── Switched on by one value, reversible by the same value ────────────
-- economy_configurations.member_welcome_on_claim defaults to false, so this migration changes nothing
-- until the active row is set, which it does at the bottom. Setting it back to false restores "paid
-- when the wallet is made".
--
-- ── What this does NOT do ─────────────────────────────────────────────
--   * Wallets that already exist are untouched: welcome_pending defaults to false, so every member
--     who has already been paid stays exactly as they are and is never offered the popup.
--   * No new ledger entry type: the welcome is a STARTER_GRANT row with its own idempotency key
--     ('member-welcome:<id>'), so a repeat can never pay twice.
--   * The amount is unchanged (member_starter_coins). Only WHEN it is paid moves.
--
-- Re-runnable. Applied migrations are never edited.

-- ── 1. Configuration ────────────────────────────────────────────────────────
alter table public.economy_configurations
  add column if not exists member_welcome_on_claim boolean not null default false;

-- ── 2. The grant made when a wallet is first created ────────────────────────
-- Same function as 20261028000000, with one more branch: a member, while member_welcome_on_claim
-- is on, gets nothing now and is marked welcome_pending. Everything else is unchanged.
create or replace function public.grant_starter_coins(p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet         public.coin_wallets;
  v_config         public.economy_configurations;
  v_grant_amount   bigint;
  v_idempotency    text := 'starter-grant:' || p_identity_id;
  v_balance_before bigint;
  v_version_before bigint;
  v_pending        boolean := false;
  v_description    text;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_identity_id for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;

  if v_wallet.starter_granted then
    return jsonb_build_object(
      'applied', false,
      'operation', 'grant_starter_coins',
      'idempotencyKey', v_idempotency,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  if v_config is null then
    v_grant_amount := case when v_wallet.identity_kind = 'guest' then 2000 else 5000 end;
  elsif v_wallet.identity_kind = 'guest' and v_config.guest_first_game_coins is not null then
    v_grant_amount := v_config.guest_first_game_coins;
    v_pending := true;
    v_description := 'First game on us (guest)';
  elsif v_wallet.identity_kind = 'member' and v_config.member_welcome_on_claim then
    v_grant_amount := 0;
    v_pending := true;
  else
    v_grant_amount := case when v_wallet.identity_kind = 'guest' then v_config.guest_starter_coins else v_config.member_starter_coins end;
  end if;

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + v_grant_amount,
      version = version + 1,
      lifetime_granted = lifetime_granted + v_grant_amount,
      starter_granted = true,
      welcome_pending = v_pending,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  -- The ledger does not record a zero-coin credit.
  if v_grant_amount > 0 then
    insert into public.coin_ledger_entries (
      wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      p_identity_id, v_grant_amount, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
      'STARTER_GRANT', 'starter_grant', p_identity_id, v_idempotency,
      coalesce(v_description, 'Authoritative starter grant (' || v_wallet.identity_kind || ')')
    );
  end if;

  return jsonb_build_object(
    'applied', true,
    'operation', 'grant_starter_coins',
    'idempotencyKey', v_idempotency,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.grant_starter_coins(text) from public, anon, authenticated;
grant execute on function public.grant_starter_coins(text) to service_role;

-- ── 3. The welcome, once, when the popup is accepted ────────────────────────
create or replace function public.grant_member_welcome(p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet         public.coin_wallets;
  v_config         public.economy_configurations;
  v_amount         bigint;
  v_key            text := 'member-welcome:' || p_identity_id;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_identity_id for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;
  if v_wallet.identity_kind <> 'member' then
    raise exception 'NOT_A_MEMBER: % is not a member wallet', p_identity_id;
  end if;

  -- Already welcomed, or paid when the wallet was made (a wallet that predates this rule): a repeat
  -- is a no-op, never a second grant.
  if not v_wallet.welcome_pending then
    return jsonb_build_object(
      'applied', false,
      'operation', 'grant_member_welcome',
      'idempotencyKey', v_key,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  if v_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: member wallet % is frozen', p_identity_id;
  end if;

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  v_amount := coalesce(v_config.member_starter_coins, 5000);

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + v_amount,
      version = version + 1,
      lifetime_granted = lifetime_granted + v_amount,
      welcome_pending = false,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  if v_amount > 0 then
    insert into public.coin_ledger_entries (
      wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      p_identity_id, v_amount, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
      'STARTER_GRANT', 'starter_grant', p_identity_id, v_key,
      'Member welcome'
    );
  end if;

  return jsonb_build_object(
    'applied', true,
    'operation', 'grant_member_welcome',
    'idempotencyKey', v_key,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.grant_member_welcome(text) from public, anon, authenticated;
grant execute on function public.grant_member_welcome(text) to service_role;

-- ── 4. Is the popup owed? ───────────────────────────────────────────────────
-- A read of one flag, as a function, because the app reads wallets through the _safe view and the
-- flag is deliberately not in it. Returns false for a guest, and for a wallet that does not exist.
create or replace function public.member_welcome_pending(p_identity_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(
    (select w.welcome_pending and w.identity_kind = 'member'
       from public.coin_wallets w
      where w.identity_id = p_identity_id),
    false
  );
$$;

revoke all on function public.member_welcome_pending(text) from public, anon, authenticated;
grant execute on function public.member_welcome_pending(text) to service_role;

-- ── 5. Turn it on ───────────────────────────────────────────────────────────
update public.economy_configurations
   set member_welcome_on_claim = true,
       updated_at = now()
 where is_active = true
   and member_welcome_on_claim is distinct from true;
