-- Guest -> member carry-over.
--
-- A guest who signs up brings their coins with them. Three things are added:
--
--   1. public.guest_wallet_claims   one row per absorbed guest. guest_id is the
--                                   primary key and member_id is UNIQUE, so one guest
--                                   can be absorbed once and one account can absorb
--                                   one guest. The database enforces both; the server
--                                   does not get to forget.
--   2. public.claim_guest_wallet()  the atomic step: refuses an unconfirmed email,
--                                   debits the guest's whole balance, records the claim.
--                                   It does NOT credit the member. The credit is a
--                                   GUEST_CARRYOVER reward through the reward gateway
--                                   (24 h hold, risk checks, one idempotent payment).
--   3. Widened check constraints    one new ledger entry type for the debit and two new
--                                   reward types (the carried-over coins, and the
--                                   5,000-coin upgrade bonus released after a first real
--                                   match).
--
-- Applied migrations are never edited; this one only widens constraints it finds by
-- what they check, so it is safe to re-run.
--
-- Apply BEFORE deploying the server that serves /api/carryover. Until it is applied
-- a claim is refused as "temporarily unavailable"; nothing is debited or paid.

-- ── 1. The ledger can describe the debit ────────────────────────────────────
do $$
declare
  existing record;
  def text;
begin
  for existing in
    select c.conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
     where c.conrelid = 'public.coin_ledger_entries'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%P2P_TRANSFER_SEND%'
  loop
    if existing.def like '%GUEST_CARRYOVER_DEBIT%' then
      continue;
    end if;
    def := replace(existing.def, '''P2P_TRANSFER_RECEIVE''', '''P2P_TRANSFER_RECEIVE'', ''GUEST_CARRYOVER_DEBIT''');
    execute format('alter table public.coin_ledger_entries drop constraint %I', existing.conname);
    execute format('alter table public.coin_ledger_entries add constraint %I %s', existing.conname, def);
  end loop;
end
$$;

-- ── 2. The reward ledger can hold the two new reward types ──────────────────
do $$
declare
  existing record;
begin
  for existing in
    select c.conname
      from pg_constraint c
     where c.conrelid = 'public.reward_ledger'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%reward_type%'
       and pg_get_constraintdef(c.oid) like '%LEVEL_MILESTONE%'
  loop
    execute format('alter table public.reward_ledger drop constraint %I', existing.conname);
  end loop;
end
$$;

alter table public.reward_ledger
  add constraint reward_ledger_reward_type_check check (reward_type in (
    'LEVEL_MILESTONE', 'DAILY_STREAK', 'HOURLY_FAUCET', 'ACHIEVEMENT', 'TOURNAMENT',
    'SEASONAL', 'REFERRAL', 'MANDALI', 'GUEST_CARRYOVER', 'GUEST_UPGRADE_BONUS'));

-- ── 3. The claim table ──────────────────────────────────────────────────────
create table if not exists public.guest_wallet_claims (
  guest_id   text primary key,
  member_id  text not null unique,
  -- What the guest's wallet held when it was absorbed. The member is paid this, once,
  -- through the reward gateway; it is kept here so a payment that failed can be retried.
  amount     bigint not null check (amount >= 0),
  claimed_at timestamptz not null default now(),
  constraint guest_wallet_claims_distinct check (guest_id <> member_id)
);

alter table public.guest_wallet_claims enable row level security;
revoke all on public.guest_wallet_claims from public, anon, authenticated;
grant select on public.guest_wallet_claims to service_role;

comment on table public.guest_wallet_claims is
  'One row per guest wallet absorbed into an account. guest_id PK and member_id UNIQUE make "one guest per account, one account per guest" a database fact. No row is ever updated or deleted by the application.';

-- ── 4. The atomic claim ─────────────────────────────────────────────────────
create or replace function public.claim_guest_wallet(
  p_guest_id  text,
  p_member_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_guest        public.coin_wallets;
  v_claim        public.guest_wallet_claims;
  v_confirmed    timestamptz;
  v_before       bigint;
  v_version      bigint;
  v_exists       boolean;
  v_has_auth     boolean := to_regclass('auth.users') is not null;
begin
  if p_guest_id is null or char_length(trim(p_guest_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: guest id cannot be null or empty';
  end if;
  if p_member_id is null or char_length(trim(p_member_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: member id cannot be null or empty';
  end if;
  if p_guest_id = p_member_id then
    raise exception 'INVALID_CLAIM: a wallet cannot absorb itself';
  end if;

  -- The account must own a mailbox it has proved. Google sign-in arrives confirmed; an
  -- email sign-up only once the link has been opened. A missing row is as bad as an
  -- unconfirmed one: the id came from a token, and a token can name anything.
  if v_has_auth then
    -- EXECUTE ... INTO never sets FOUND, so existence and confirmation are asked separately.
    execute 'select exists (select 1 from auth.users where id::text = $1)' into v_exists using p_member_id;
    if not v_exists then
      raise exception 'MEMBER_NOT_FOUND: no account %', p_member_id;
    end if;
    execute 'select email_confirmed_at from auth.users where id::text = $1' into v_confirmed using p_member_id;
    if v_confirmed is null then
      raise exception 'EMAIL_NOT_CONFIRMED: confirm your email before bringing guest coins over';
    end if;
  end if;

  -- Serialise on the account first (two different guests racing into one account), then
  -- on the guest wallet (one guest racing into two accounts).
  perform pg_advisory_xact_lock(hashtextextended('guest_claim_member:' || p_member_id, 0));

  select * into v_claim from public.guest_wallet_claims where member_id = p_member_id;
  if found then
    if v_claim.guest_id = p_guest_id then
      return jsonb_build_object('status', 'REPLAY', 'amount', v_claim.amount::text);
    end if;
    raise exception 'MEMBER_ALREADY_CLAIMED: this account has already brought a guest over';
  end if;

  select * into v_guest from public.coin_wallets where identity_id = p_guest_id for update;
  if not found then
    raise exception 'GUEST_WALLET_NOT_FOUND: no guest wallet %', p_guest_id;
  end if;
  if v_guest.identity_kind <> 'guest' then
    raise exception 'NOT_A_GUEST: % is not a guest wallet', p_guest_id;
  end if;

  select * into v_claim from public.guest_wallet_claims where guest_id = p_guest_id;
  if found then
    raise exception 'GUEST_ALREADY_CLAIMED: this guest has already been brought over';
  end if;

  -- A frozen wallet is one an operator stopped; it is not moved to a fresh account.
  if v_guest.is_frozen then
    raise exception 'WALLET_FROZEN: guest wallet % is frozen', p_guest_id;
  end if;

  v_before  := v_guest.balance;
  v_version := v_guest.version;

  if v_before > 0 then
    update public.coin_wallets
       set balance = 0,
           lifetime_spent = lifetime_spent + v_before,
           version = version + 1,
           updated_at = now()
     where identity_id = p_guest_id
     returning * into v_guest;

    insert into public.coin_ledger_entries (
      wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      p_guest_id, -v_before, v_before, 0, v_version, v_guest.version,
      'GUEST_CARRYOVER_DEBIT', 'guest_carryover', p_member_id,
      'guest_carryover:' || p_guest_id,
      'Brought over to your account'
    );
  end if;

  insert into public.guest_wallet_claims (guest_id, member_id, amount)
  values (p_guest_id, p_member_id, v_before);

  return jsonb_build_object('status', 'CLAIMED', 'amount', v_before::text);
end;
$$;

revoke all on function public.claim_guest_wallet(text, text) from public, anon, authenticated;
grant execute on function public.claim_guest_wallet(text, text) to service_role;
