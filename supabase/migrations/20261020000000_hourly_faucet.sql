-- Hourly coin faucet: allow a new kind of reward.
--
-- A faucet claim is an ordinary row in public.reward_ledger, so it needs no table
-- of its own. The only schema change is that reward_type's check constraint must
-- accept 'HOURLY_FAUCET'. 20261012000000_reward_gateway.sql is already applied and
-- is never edited; this migration replaces just the one constraint.
--
-- Re-runnable: it finds the constraint by what it checks, not by a name the
-- database generated, drops whatever it finds, and adds the widened one.
--
-- Apply BEFORE deploying the server that serves /api/faucet. Until it is applied a
-- claim is refused by the database and the player sees "temporarily unavailable";
-- nothing is paid and nothing is lost.

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
