-- Operational rollback for 20261111000000_referral_bonus.sql.
-- Stops the coin bonuses and keeps every row: codes, attributions, reserved/issued markers and the reward_ledger rows
-- the gateway already wrote are audit evidence and may already be in wallets. Do not drop the columns or functions
-- while any bonus has been reserved. Bonuses already vesting in reward_ledger can still be voided from the admin
-- Risk & Rewards page before they are paid.
update public.referral_campaign set inviter_bonus = 0, invitee_bonus = 0;
