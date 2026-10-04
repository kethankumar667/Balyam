-- Rollback for 20261014000000_fund_coin_request_daily_cap.sql. fund_coin_request is untouched.
drop function if exists public.fund_coin_request_capped(text, text, text, bigint, timestamptz);
