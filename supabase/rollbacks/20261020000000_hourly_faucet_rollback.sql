-- Rollback for 20261020000000_hourly_faucet.sql.
--
-- DESTRUCTIVE: deletes every HOURLY_FAUCET reward row, because the narrower
-- constraint below cannot hold them. Roll back only together with the server (it
-- stops serving /api/faucet), and release or void pending faucet rewards first if
-- they matter. Coins already paid stay in wallets; this removes only the ledger
-- rows that explain them.

delete from public.reward_ledger where reward_type = 'HOURLY_FAUCET';

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
    'LEVEL_MILESTONE', 'DAILY_STREAK', 'ACHIEVEMENT', 'TOURNAMENT',
    'SEASONAL', 'REFERRAL', 'MANDALI'));
