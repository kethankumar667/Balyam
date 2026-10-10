-- Guest welcome: 3,000 coins instead of 2,000.
--
-- A guest's starter grant is read from the one active row of economy_configurations when
-- their wallet is first made (ensure_wallet / grant_starter_coins). So the whole change is
-- that row, plus the column's default for a fresh install.
--
-- Deliberately NOT done:
--   * `version` is not bumped. economy_prize_schedules is keyed by config_version, so a new
--     version would orphan every prize schedule.
--   * Wallets that already exist keep what they were granted (2,000). The starter grant is
--     paid once per wallet, and topping up old guests would be a separate, visible decision.
--   * The older migrations are not edited. 20260826000000 also holds a hard-coded 2,000 that
--     is used only if the active row is missing altogether; with this row present it never is.
--
-- Re-runnable.

alter table public.economy_configurations
  alter column guest_starter_coins set default 3000;

update public.economy_configurations
   set guest_starter_coins = 3000,
       updated_at = now()
 where is_active = true
   and guest_starter_coins <> 3000;
