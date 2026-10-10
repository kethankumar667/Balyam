-- Undo 20261024000000_remove_vouchers.sql: put the (empty) voucher structure back.
--
-- This restores the table, its indexes, its trigger, the participant link column, the read view and
-- the three functions exactly as 20260826000000 defined them, plus the table's locked-down grants.
-- It cannot bring back the rows that migration discarded. Roll back 20261023000000 afterwards if
-- guests should be paid in vouchers again. Re-runnable.

create table if not exists public.reward_vouchers (
  id                      text primary key,
  -- Exactly 64 hex characters: a SHA-256 or HMAC-SHA256 digest, hex-encoded.
  -- Not merely "long enough" — a specific expected shape, so a malformed or
  -- truncated hash is rejected at the schema level rather than accepted and
  -- discovered broken later. The RAW CODE THIS IS A HASH OF IS NEVER SEEN BY
  -- THIS MIGRATION — see the header comment and
  -- docs/economy/economy-v1.md §voucher-security for what future server code
  -- is required to guarantee about how that raw code is generated. This
  -- schema can enforce hash SHAPE; it cannot and does not claim to enforce
  -- entropy.
  code_hash               text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  coin_amount             bigint not null check (coin_amount > 0),
  match_id                text not null,
  issued_to_guest_id      text not null references public.player_identities (player_id) on delete restrict,
  status                  text not null default 'ACTIVE' check (status in ('ACTIVE', 'REDEEMED', 'CANCELLED')),
  redeemed_by_member_id   text references public.player_identities (player_id) on delete restrict,
  redeemed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint voucher_redemption_binding check (
    (status = 'REDEEMED' and redeemed_by_member_id is not null and redeemed_at is not null) or
    (status <> 'REDEEMED' and redeemed_by_member_id is null and redeemed_at is null)
  )
);

comment on table public.reward_vouchers is
  'Bearer vouchers for guest winnings, held in escrow. code_hash is the ONLY stored form of the code — this table (and this migration) never sees the raw code. A code_hash collision on INSERT is a hard failure (real unique-violation exception), never a silent update — see issue_guest_voucher.';

create index if not exists reward_vouchers_guest_idx on public.reward_vouchers (issued_to_guest_id, status);
create index if not exists reward_vouchers_redeemer_idx on public.reward_vouchers (redeemed_by_member_id) where redeemed_by_member_id is not null;
create index if not exists reward_vouchers_match_idx on public.reward_vouchers (match_id);

drop trigger if exists touch_reward_vouchers_updated_at on public.reward_vouchers;
create trigger touch_reward_vouchers_updated_at before update on public.reward_vouchers
  for each row execute function public.touch_updated_at();

alter table public.reward_vouchers enable row level security;
alter table public.reward_vouchers force row level security;
revoke insert, update, delete, truncate, references, trigger on table public.reward_vouchers from public, anon, authenticated, service_role;
revoke select on table public.reward_vouchers from public, anon, authenticated;
grant select on table public.reward_vouchers to service_role;

alter table public.match_economy_participants
  add column if not exists voucher_id text references public.reward_vouchers (id) on delete set null;

create or replace view public.reward_vouchers_safe as
select
  id, code_hash,
  coin_amount::text as coin_amount,
  match_id, issued_to_guest_id, status, redeemed_by_member_id, redeemed_at, created_at, updated_at
from public.reward_vouchers;

revoke all on public.reward_vouchers_safe from public, anon, authenticated;
grant select on public.reward_vouchers_safe to service_role;

create or replace function public.voucher_to_safe_jsonb(v public.reward_vouchers)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', v.id,
    'code_hash', v.code_hash,
    'coin_amount', v.coin_amount::text,
    'match_id', v.match_id,
    'issued_to_guest_id', v.issued_to_guest_id,
    'status', v.status,
    'redeemed_by_member_id', v.redeemed_by_member_id,
    'redeemed_at', v.redeemed_at,
    'created_at', v.created_at
  );
$$;

create or replace function public.issue_guest_voucher(
  p_voucher_id         text,
  p_code_hash          text,
  p_coin_amount        bigint,
  p_match_id           text,
  p_issued_to_guest_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_voucher public.reward_vouchers;
  v_idempotency text := 'voucher-issue:' || p_voucher_id;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_VOUCHER_HASH: code hash must be exactly 64 hex characters';
  end if;
  if p_coin_amount <= 0 then
    raise exception 'INVALID_VOUCHER_AMOUNT: voucher coin amount must be greater than zero';
  end if;

  select * into v_voucher from public.reward_vouchers where id = p_voucher_id;
  if found then
    return jsonb_build_object(
      'applied', false,
      'operation', 'issue_guest_voucher',
      'idempotencyKey', v_idempotency,
      'result', public.voucher_to_safe_jsonb(v_voucher)
    );
  end if;

  -- No `on conflict` — a code_hash collision fails loudly (Phase 7).
  insert into public.reward_vouchers (id, code_hash, coin_amount, match_id, issued_to_guest_id, status)
  values (p_voucher_id, p_code_hash, p_coin_amount, p_match_id, p_issued_to_guest_id, 'ACTIVE')
  returning * into v_voucher;

  return jsonb_build_object(
    'applied', true,
    'operation', 'issue_guest_voucher',
    'idempotencyKey', v_idempotency,
    'result', public.voucher_to_safe_jsonb(v_voucher)
  );
end;
$$;

revoke all on function public.issue_guest_voucher(text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.issue_guest_voucher(text, text, bigint, text, text) to service_role;

create or replace function public.redeem_reward_voucher(
  p_code_hash          text,
  p_member_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_voucher       public.reward_vouchers;
  v_member_kind   text;
  v_member_wallet public.coin_wallets;
  v_idempotency   text;
  v_balance_before bigint;
  v_version_before bigint;
  v_wb            public.world_bank_accounts;
  v_wb_balance_before bigint;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'VOUCHER_INVALID: malformed code hash';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('voucher-redemption:' || p_code_hash, 0));

  select kind into v_member_kind from public.player_identities where player_id = p_member_identity_id;
  if v_member_kind is null or v_member_kind <> 'member' then
    raise exception 'ONLY_MEMBERS_CAN_REDEEM_VOUCHERS: identity % is not a registered member', p_member_identity_id;
  end if;

  select * into v_voucher from public.reward_vouchers where code_hash = p_code_hash for update;
  if not found then
    raise exception 'VOUCHER_NOT_FOUND: no active voucher matches code hash';
  end if;

  v_idempotency := 'voucher-redeem:' || v_voucher.id || ':' || p_member_identity_id;

  if v_voucher.status = 'REDEEMED' then
    if v_voucher.redeemed_by_member_id = p_member_identity_id then
      return jsonb_build_object(
        'applied', false,
        'operation', 'redeem_reward_voucher',
        'idempotencyKey', v_idempotency,
        'result', public.voucher_to_safe_jsonb(v_voucher)
      );
    else
      raise exception 'VOUCHER_ALREADY_REDEEMED: voucher has already been claimed by another member';
    end if;
  end if;

  if v_voucher.status <> 'ACTIVE' then
    raise exception 'VOUCHER_NOT_ACTIVE: voucher status is %', v_voucher.status;
  end if;

  perform public.ensure_wallet(p_member_identity_id);
  select * into v_member_wallet from public.coin_wallets where identity_id = p_member_identity_id for update;

  -- Frozen-wallet policy: a frozen wallet cannot redeem a voucher (this is a
  -- discretionary action the wallet owner initiates, unlike passively
  -- receiving a match reward or refund).
  if v_member_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: member % cannot redeem a voucher while frozen', p_member_identity_id;
  end if;

  v_balance_before := v_member_wallet.balance;
  v_version_before := v_member_wallet.version;

  update public.coin_wallets
  set balance = balance + v_voucher.coin_amount, version = version + 1, lifetime_earned = lifetime_earned + v_voucher.coin_amount, updated_at = now()
  where identity_id = p_member_identity_id
  returning * into v_member_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_member_identity_id, v_voucher.coin_amount, v_balance_before, v_member_wallet.balance, v_version_before, v_member_wallet.version,
    'VOUCHER_REDEMPTION', 'voucher', v_voucher.id, v_idempotency,
    'Redeemed guest reward voucher (' || v_voucher.id || ')'
  );

  select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
  v_wb_balance_before := v_wb.guest_escrow_liability;

  update public.world_bank_accounts
  set guest_escrow_liability = guest_escrow_liability - v_voucher.coin_amount,
      total_voucher_redeemed = total_voucher_redeemed + v_voucher.coin_amount,
      updated_at = now()
  where id = 'primary'
  returning * into v_wb;

  insert into public.world_bank_ledger (
    account_id, affected_balance, amount, balance_before, balance_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    'primary', 'guest_escrow_liability', -v_voucher.coin_amount, v_wb_balance_before, v_wb.guest_escrow_liability,
    'GUEST_ESCROW_REDEMPTION', 'voucher', v_voucher.id, v_idempotency || ':escrow',
    'Escrow liability released on redemption'
  );

  update public.reward_vouchers
  set status = 'REDEEMED', redeemed_by_member_id = p_member_identity_id, redeemed_at = now(), updated_at = now()
  where id = v_voucher.id
  returning * into v_voucher;

  return jsonb_build_object(
    'applied', true,
    'operation', 'redeem_reward_voucher',
    'idempotencyKey', v_idempotency,
    'result', public.voucher_to_safe_jsonb(v_voucher)
  );
end;
$$;

revoke all on function public.redeem_reward_voucher(text, text) from public, anon, authenticated;
grant execute on function public.redeem_reward_voucher(text, text) to service_role;

-- Internal-only helper, like the other *_to_safe_jsonb functions: callable by no one directly.
revoke all on function public.voucher_to_safe_jsonb(public.reward_vouchers) from public, anon, authenticated, service_role;
