-- Undo 20261028000000_guest_first_game_welcome.sql.
--
--   * New guests get the full welcome when the wallet is made again (the configuration value goes
--     back to NULL, which is how the migration's own switch works), and the original
--     grant_starter_coins and purge_idle_guests are restored.
--   * grant_guest_welcome is dropped.
--   * The three columns the migration added (economy_configurations.guest_first_game_coins,
--     coin_wallets.welcome_pending, player_identities.erased_at) are LEFT in place: they are additive,
--     nothing reads them once the functions above are restored, and dropping a column discards data.
--   * Guests created while the feature was on and still welcome_pending keep their small balance. They
--     are not topped up automatically; that would be a visible decision for an operator, e.g.
--       update public.coin_wallets set welcome_pending = false where welcome_pending;
--     (to stop treating them as pending) after paying them whatever you decide.
--   * Guests already erased stay erased: erasure cannot be undone.

update public.economy_configurations
   set guest_first_game_coins = null,
       updated_at = now()
 where is_active = true
   and guest_first_game_coins is not null;

drop function if exists public.grant_guest_welcome(text);

-- grant_starter_coins as it was in 20260826000000_economy_v1.sql.
create or replace function public.grant_starter_coins(p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet        public.coin_wallets;
  v_config        public.economy_configurations;
  v_grant_amount  bigint;
  v_idempotency   text := 'starter-grant:' || p_identity_id;
  v_balance_before bigint;
  v_version_before bigint;
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
  v_grant_amount := case
    when v_config is null then (case when v_wallet.identity_kind = 'guest' then 2000 else 5000 end)
    else (case when v_wallet.identity_kind = 'guest' then v_config.guest_starter_coins else v_config.member_starter_coins end)
  end;

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + v_grant_amount,
      version = version + 1,
      lifetime_granted = lifetime_granted + v_grant_amount,
      starter_granted = true,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_identity_id, v_grant_amount, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
    'STARTER_GRANT', 'starter_grant', p_identity_id, v_idempotency,
    'Authoritative starter grant (' || v_wallet.identity_kind || ')'
  );

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

-- purge_idle_guests as it was in 20261026000000_purge_idle_guests.sql: wallet-less guests only.
create or replace function public.purge_idle_guests(
  p_idle_days integer default 45,
  p_batch     integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_candidate record;
  v_purged    integer := 0;
  v_skipped   integer := 0;
begin
  if p_idle_days is null or p_idle_days < 7 then
    raise exception 'INVALID_RETENTION: idle days must be at least 7';
  end if;
  if p_batch is null or p_batch < 1 or p_batch > 5000 then
    raise exception 'INVALID_BATCH: batch must be between 1 and 5000';
  end if;

  for v_candidate in
    select pi.player_id
      from public.player_identities pi
     where pi.kind = 'guest'
       and pi.last_seen_at < now() - make_interval(days => p_idle_days)
       and not exists (select 1 from public.guest_wallet_claims c where c.guest_id = pi.player_id)
       and not exists (select 1 from public.coin_wallets w where w.identity_id = pi.player_id)
     order by pi.last_seen_at
     limit p_batch
  loop
    begin
      delete from public.player_identities where player_id = v_candidate.player_id;
      v_purged := v_purged + 1;
    exception when foreign_key_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object('purged', v_purged, 'skipped', v_skipped);
end;
$$;

revoke all on function public.purge_idle_guests(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_idle_guests(integer, integer) to service_role;
