-- Rollback for 20261013000000_transfer_daily_cap.sql. transfer_wallet_coins is untouched.
drop function if exists public.transfer_wallet_coins_capped(text, text, bigint, text, text, bigint, timestamptz);
