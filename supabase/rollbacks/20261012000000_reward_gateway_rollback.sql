-- Rollback for 20261012000000_reward_gateway.sql
--
-- DESTRUCTIVE. Drops the reward ledger, the risk states and the risk audit trail
-- with everything in them. Any reward still PENDING is lost with its row, so
-- release or void them first. Take a backup before running this against a database
-- that has real rewards in it.
--
-- Nothing else depends on these tables (the wallet and progression are untouched),
-- so the order below is only for tidiness.

begin;

drop table if exists public.risk_events;
drop table if exists public.account_risk;
drop table if exists public.reward_ledger;

commit;
