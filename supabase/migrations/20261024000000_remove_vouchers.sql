-- Remove vouchers.
--
-- 20261023000000_guest_prizes_to_wallet.sql stopped the settlement function from ever making a
-- voucher: a guest winner is credited to their wallet. After it, nothing in the application issues
-- or redeems one, and the server no longer exposes the routes. This removes what is left behind:
--
--   * issue_guest_voucher(...) and redeem_reward_voucher(...) — the two functions that created and
--     spent a voucher;
--   * voucher_to_safe_jsonb(...) and the reward_vouchers_safe view — the read side;
--   * match_economy_participants.voucher_id — the link from a participant to its voucher;
--   * the reward_vouchers table itself.
--
-- Kept on purpose, because they describe money that already moved and must still read the same:
--   * world_bank_accounts.guest_escrow_liability and total_voucher_redeemed, and the world bank
--     ledger rows that moved them;
--   * the 'VOUCHER_REDEMPTION' ledger entry type and the 'ESCROWED_VOUCHER' payout status, so old
--     wallet history and old settlement rows still pass their check constraints and still display;
--   * match_economy_settlements.total_guest_escrow (0 for every match since the previous migration).
--
-- Vouchers issued before the previous migration and never redeemed are discarded with the table.
-- That was decided: the product is pre-production, and no player holds one that matters. The count
-- is written to the migration log below so the number is on record rather than silent.
--
-- Re-runnable (every drop is `if exists`). Not reversible for the data: the rollback puts the empty
-- structure back, not the rows.

do $$
declare
  v_active bigint := 0;
  v_coins  numeric := 0;
begin
  if to_regclass('public.reward_vouchers') is not null then
    execute $q$select count(*), coalesce(sum(coin_amount), 0)
                 from public.reward_vouchers where status = 'ACTIVE'$q$
       into v_active, v_coins;
  end if;
  raise notice 'remove_vouchers: discarding % unredeemed voucher(s) worth % coins', v_active, v_coins;
end
$$;

drop function if exists public.issue_guest_voucher(text, text, bigint, text, text);
drop function if exists public.redeem_reward_voucher(text, text);
drop view if exists public.reward_vouchers_safe;

alter table public.match_economy_participants drop column if exists voucher_id;

do $$
begin
  if to_regclass('public.reward_vouchers') is not null then
    drop function if exists public.voucher_to_safe_jsonb(public.reward_vouchers);
  end if;
end
$$;

drop table if exists public.reward_vouchers;
