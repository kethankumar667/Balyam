-- Undo 20261030000000_member_welcome_on_claim.sql.
--
--   * New members get the welcome when the wallet is made again (the configuration value goes back to
--     false, which is how the migration's own switch works), and grant_starter_coins is restored to
--     its 20261028000000 form (guest "first game on us", no member branch).
--   * grant_member_welcome and member_welcome_pending are dropped.
--   * The column the migration added (economy_configurations.member_welcome_on_claim) is LEFT in
--     place: it is additive, nothing reads it once the function above is restored, and dropping a
--     column discards data.
--   * Members created while the feature was on and still welcome_pending keep an empty wallet. They
--     are not paid automatically; that is a visible decision for an operator, e.g. after paying them
--     whatever you decide:
--       update public.coin_wallets set welcome_pending = false
--        where welcome_pending and identity_kind = 'member';

update public.economy_configurations
   set member_welcome_on_claim = false,
       updated_at = now()
 where is_active = true
   and member_welcome_on_claim;

drop function if exists public.grant_member_welcome(text);
drop function if exists public.member_welcome_pending(text);

-- grant_starter_coins as it was in 20261028000000_guest_first_game_welcome.sql.
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
