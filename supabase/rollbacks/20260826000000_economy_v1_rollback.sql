-- Rollback for 20260826000000_economy_v1.sql (remediated version)
--
-- DESTRUCTIVE. This drops all Economy V1 tables, ledgers, functions, and
-- triggers. It exists so the migration is reversible in the sense that
-- matters — the schema can be cleanly removed in reverse dependency order,
-- including when real transaction history exists (verified by
-- scripts/economy/verifyEconomySchema.mjs's populated-database rollback
-- test, which the audited draft's rollback test did not actually exercise).
--
-- Kept outside supabase/migrations/ deliberately: a rollback script sharing
-- its forward migration's version timestamp collides with the CLI's own
-- migration-history table the moment `supabase db push` tries to apply it as
-- the very next migration — this exact failure already happened once on this
-- project (see docs/runbooks/persistence.md). Run this manually against the
-- SQL Editor or psql; never place it in supabase/migrations/.
--
-- Order of destruction:
-- 1. Triggers (immutability guards, updated_at hooks)
-- 2. Functions — NOW a hard ordering requirement, not just readability:
--    `ensure_wallet` returns `coin_wallets_safe` and
--    `list_stale_committed_settlements` returns `setof
--    match_economy_settlements_safe` (bigint-transport remediation, §11a of
--    the forward migration) — both depend on a VIEW's composite type, so
--    they must be dropped before step 3 drops the views.
-- 3. Bigint-safe serialization views (§11a) — each depends on its base
--    table, so must be dropped before step 4 drops the tables, and after
--    step 2 removes the functions that depend on two of these views' types.
-- 4. Child tables (participants, vouchers, ledgers)
-- 5. Parent tables (settlements, wallets, accounts, prize schedules, configurations)

begin;

-- ═══════════════════════ 1. Drop Triggers ════════════════════════════════

drop trigger if exists guard_coin_ledger_immutable on public.coin_ledger_entries;
drop trigger if exists guard_world_bank_ledger_immutable on public.world_bank_ledger;

do $$
declare
  t text;
begin
  foreach t in array array[
    'economy_configurations', 'world_bank_accounts', 'coin_wallets',
    'reward_vouchers', 'match_economy_settlements'
  ] loop
    execute format('drop trigger if exists touch_%s_updated_at on public.%I', t, t);
  end loop;
end;
$$;

-- ═══════════════════════ 2. Drop RPC Functions ════════════════════════════

drop function if exists public.list_stale_committed_settlements(interval);
drop function if exists public.reconcile_match_settlement(text);
drop function if exists public.redeem_reward_voucher(text, text);
drop function if exists public.issue_guest_voucher(text, text, bigint, text, text);
drop function if exists public.refund_match_entry(text, text);
drop function if exists public.settle_match_economy(text, boolean, jsonb, text);
drop function if exists public.economy_apply_refund(public.match_economy_settlements, text, text);
drop function if exists public.commit_match_entry(text, text, text, integer, integer, integer, boolean);
drop function if exists public.grant_starter_coins(text);
drop function if exists public.ensure_wallet(text);
drop function if exists public.prevent_ledger_mutation();
drop function if exists public.wallet_to_safe_jsonb(public.coin_wallets);
drop function if exists public.settlement_to_safe_jsonb(public.match_economy_settlements);
drop function if exists public.voucher_to_safe_jsonb(public.reward_vouchers);

-- ═══════════════════════ 3. Drop Bigint-Safe Serialization Views ══════════

drop view if exists public.coin_wallets_safe;
drop view if exists public.coin_ledger_entries_safe;
drop view if exists public.match_economy_settlements_safe;
drop view if exists public.world_bank_accounts_safe;
drop view if exists public.reward_vouchers_safe;
drop view if exists public.economy_configurations_safe;
drop view if exists public.economy_prize_schedules_safe;

-- ═══════════════════════ 4. Drop Tables (Leaves then Trunks) ══════════════

drop table if exists public.match_economy_participants;
drop table if exists public.reward_vouchers;
drop table if exists public.match_economy_settlements;
drop table if exists public.coin_ledger_entries;
drop table if exists public.coin_wallets;
drop table if exists public.world_bank_ledger;
drop table if exists public.world_bank_accounts;
drop table if exists public.economy_prize_schedules;
drop table if exists public.economy_configurations;

commit;
