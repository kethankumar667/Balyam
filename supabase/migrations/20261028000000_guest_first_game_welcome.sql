-- Guest "first game on us", the welcome that follows it, and erasing a guest nobody came back for.
--
-- ── The problem ───────────────────────────────────────────────────────
-- A guest identity costs nothing to make and used to be born with the whole welcome grant, so making
-- guests was a way to print coins. This changes WHEN the grant is paid, not how much:
--
--   1. A new guest wallet is made with only a small "first game on us" amount (guest_first_game_coins,
--      100), enough to sit at one table. It is flagged welcome_pending.
--   2. After that guest has actually played (they have spent coins on a match), grant_guest_welcome()
--      adds the real welcome (guest_starter_coins, 2,000) once. The player asks for it by choosing to
--      "stay as a guest"; signing in instead sends them down the carry-over path.
--   3. A guest nobody came back for is erased after the idle period (purge_idle_guests below).
--
-- A guest who never plays is therefore worth 100 coins to a farmer, not 2,000.
--
-- ── Switched on by one value, reversible by the same value ────────────
-- economy_configurations.guest_first_game_coins is NULLABLE. NULL means "behave exactly as before"
-- (a guest gets guest_starter_coins when the wallet is made), so this migration changes nothing until
-- the active row is set, which it does at the bottom. Setting it back to NULL turns the feature off.
--
-- ── What this does NOT do ─────────────────────────────────────────────
--   * No new ledger entry type: both grants are STARTER_GRANT rows with different idempotency keys
--     ('starter-grant:<id>' for the first game, 'guest-welcome:<id>' for the welcome).
--   * Wallets that already exist are untouched (welcome_pending defaults to false).
--   * The ledger is never deleted or edited. Erasing a guest removes everything that cascades from the
--     identity (profile, progress, friends, cosmetics, ...) and keeps only the identity row, the wallet
--     and the coin ledger, which hold a random id and no personal data.
--   * `version` of the configuration is not bumped (prize schedules are keyed by it).
--
-- Re-runnable. Applied migrations are never edited.

-- ── 1. Configuration ────────────────────────────────────────────────────────
alter table public.economy_configurations
  add column if not exists guest_first_game_coins bigint
  check (guest_first_game_coins is null or guest_first_game_coins >= 0);

-- ── 2. Wallet and identity flags ────────────────────────────────────────────
-- welcome_pending: this guest has had only the first-game amount and the welcome is still to come.
alter table public.coin_wallets
  add column if not exists welcome_pending boolean not null default false;

-- erased_at: a guest nobody came back for, whose personal data has been erased but whose anonymous
-- wallet and ledger are kept. Stops the purge from visiting the same row every night.
alter table public.player_identities
  add column if not exists erased_at timestamptz;

-- ── 3. The grant made when a wallet is first created ────────────────────────
-- Same function as before, with one branch: a guest, while guest_first_game_coins is set, gets that
-- amount and is marked welcome_pending. Everything else is byte-for-byte the original behaviour.
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

  -- A configured first-game amount of 0 is legal (the guest then gets everything at the welcome);
  -- the ledger does not record a zero-coin credit.
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

-- ── 4. The welcome, once, after the first game ──────────────────────────────
create or replace function public.grant_guest_welcome(p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet         public.coin_wallets;
  v_config         public.economy_configurations;
  v_amount         bigint;
  v_key            text := 'guest-welcome:' || p_identity_id;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_identity_id for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;
  if v_wallet.identity_kind <> 'guest' then
    raise exception 'NOT_A_GUEST: % is not a guest wallet', p_identity_id;
  end if;

  -- Already welcomed, or never put on the first-game path (a wallet made before this existed): a
  -- repeat is a no-op, never a second grant.
  if not v_wallet.welcome_pending then
    return jsonb_build_object(
      'applied', false,
      'operation', 'grant_guest_welcome',
      'idempotencyKey', v_key,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  if v_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: guest wallet % is frozen', p_identity_id;
  end if;

  -- The welcome follows a game that was actually played: coins were spent on a match. Without this a
  -- script could create a guest and ask for the welcome straight away, which is the farm this closes.
  if v_wallet.lifetime_spent <= 0 then
    raise exception 'WELCOME_NEEDS_GAME: play your first game before the welcome is added';
  end if;

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  v_amount := coalesce(v_config.guest_starter_coins, 2000);

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
      'Guest welcome after the first game'
    );
  end if;

  return jsonb_build_object(
    'applied', true,
    'operation', 'grant_guest_welcome',
    'idempotencyKey', v_key,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.grant_guest_welcome(text) from public, anon, authenticated;
grant execute on function public.grant_guest_welcome(text) to service_role;

-- ── 5. Erasing a guest nobody came back for ─────────────────────────────────
-- Replaces purge_idle_guests (20261026000000). Before: a guest with a wallet was never touched. Now:
--   * no wallet                 -> the identity row is deleted outright (as before);
--   * a wallet                  -> everything that CASCADES from the identity is deleted (profile,
--                                  progress, friends, cosmetics, streaks, rewards, ...), and the identity
--                                  is marked erased_at. The identity row, wallet and coin ledger stay:
--                                  they hold a random id and no personal data, and the ledger is
--                                  permanent by design;
--   * absorbed into an account  -> left alone (the claim row points at it).
-- The cascade list is read from the catalogue, not written out, so a table added later that cascades
-- from the identity is erased too without anyone remembering to edit this function.
-- Each guest runs in its own sub-transaction: anything that cannot be erased is skipped and counted,
-- never half-erased and never able to stop the rest of the batch.
create or replace function public.purge_idle_guests(
  p_idle_days integer default 8,
  p_batch     integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_candidate record;
  v_fk        record;
  v_purged    integer := 0;
  v_erased    integer := 0;
  v_skipped   integer := 0;
begin
  if p_idle_days is null or p_idle_days < 7 then
    raise exception 'INVALID_RETENTION: idle days must be at least 7';
  end if;
  if p_batch is null or p_batch < 1 or p_batch > 5000 then
    raise exception 'INVALID_BATCH: batch must be between 1 and 5000';
  end if;

  for v_candidate in
    select pi.player_id,
           exists (select 1 from public.coin_wallets w where w.identity_id = pi.player_id) as has_wallet
      from public.player_identities pi
     where pi.kind = 'guest'
       and pi.erased_at is null
       and pi.last_seen_at < now() - make_interval(days => p_idle_days)
       -- never absorbed into an account
       and not exists (select 1 from public.guest_wallet_claims c where c.guest_id = pi.player_id)
     order by pi.last_seen_at
     limit p_batch
  loop
    begin
      if not v_candidate.has_wallet then
        delete from public.player_identities where player_id = v_candidate.player_id;
        v_purged := v_purged + 1;
      else
        for v_fk in
          select c.conrelid::regclass as child_table,
                 a.attname            as child_column
            from pg_constraint c
            join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
           where c.contype = 'f'
             and c.confrelid = 'public.player_identities'::regclass
             and c.confdeltype = 'c'
             and array_length(c.conkey, 1) = 1
        loop
          execute format('delete from %s where %I = $1', v_fk.child_table, v_fk.child_column)
            using v_candidate.player_id;
        end loop;
        update public.player_identities set erased_at = now() where player_id = v_candidate.player_id;
        v_erased := v_erased + 1;
      end if;
    exception when others then
      -- Something still references this guest, or a table refuses deletion (an append-only audit
      -- table). Keep them whole this time; say why in the database log, not to the caller.
      raise warning 'purge_idle_guests: kept guest % (%)', v_candidate.player_id, sqlerrm;
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object('purged', v_purged, 'erased', v_erased, 'skipped', v_skipped);
end;
$$;

revoke all on function public.purge_idle_guests(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_idle_guests(integer, integer) to service_role;

-- ── 6. Turn it on ───────────────────────────────────────────────────────────
update public.economy_configurations
   set guest_first_game_coins = 100,
       updated_at = now()
 where is_active = true
   and guest_first_game_coins is distinct from 100;
