-- Rollback for 20261025000000_guest_carryover.sql.
--
-- DESTRUCTIVE: drops the claim table, which is the only record of which guests were
-- absorbed, and deletes the GUEST_CARRYOVER / GUEST_UPGRADE_BONUS reward rows the
-- narrower constraint cannot hold. Coins already moved stay where they are. Roll back
-- only together with the server (it stops serving /api/carryover).

drop function if exists public.claim_guest_wallet(text, text);
drop table if exists public.guest_wallet_claims;

delete from public.reward_ledger where reward_type in ('GUEST_CARRYOVER', 'GUEST_UPGRADE_BONUS');

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
    'SEASONAL', 'REFERRAL', 'MANDALI'));

-- The GUEST_CARRYOVER_DEBIT rows stay in the coin ledger and so does the widened entry
-- type: removing a row would break its wallet's balance chain.
