-- Guest welcome: 2,000 coins instead of 3,000.
--
-- A guest's starter grant is read from the one active row of economy_configurations when
-- their wallet is first made (ensure_wallet / grant_starter_coins). So the whole change is
-- that row, plus the column's default for a fresh install. Same shape as
-- 20261022000000_guest_welcome_3000.sql, in the other direction.
--
-- Why: a guest identity costs nothing to make and is born with this grant, so the grant is what
-- a farm multiplies. 2,000 still funds twenty 100-coin matches, which is a real first session.
--
-- Deliberately NOT done:
--   * `version` is not bumped. economy_prize_schedules is keyed by config_version, so a new
--     version would orphan every prize schedule.
--   * Wallets that already exist keep what they were granted (3,000). The starter grant is
--     paid once per wallet, and clawing it back from existing guests would be a separate,
--     visible decision.
--   * The older migrations are not edited.
--
-- Re-runnable.

alter table public.economy_configurations
  alter column guest_starter_coins set default 2000;

update public.economy_configurations
   set guest_starter_coins = 2000,
       updated_at = now()
 where is_active = true
   and guest_starter_coins <> 2000;
