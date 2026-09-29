-- Migration: 20261013000000_transfer_daily_cap.sql
-- Description: Enforces a per-sender daily cap INSIDE the transfer's own
--   transaction. The server used to read the day's total from the ledger and
--   then transfer, which lets parallel sends (or two server instances) all read
--   the same total and all pass. Here both wallet rows are locked first, so
--   concurrent sends queue and each one sees the sends before it.
--
--   Wraps transfer_wallet_coins (20260930000000, unchanged and already applied);
--   it does not replace it. Re-runnable.

create or replace function public.transfer_wallet_coins_capped(
  p_from_identity_id text,
  p_to_identity_id text,
  p_amount bigint,
  p_reason text,
  p_idempotency_key text,
  p_daily_cap bigint,
  p_day_start timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_first_id text;
  v_second_id text;
  v_sent_today bigint;
begin
  if p_daily_cap is null or p_daily_cap < 0 then
    raise exception 'INVALID_AMOUNT: daily cap must be zero or more';
  end if;
  if p_from_identity_id is null or p_to_identity_id is null or p_from_identity_id = p_to_identity_id then
    raise exception 'INVALID_TRANSFER: sender and recipient must be two different identities';
  end if;

  perform public.ensure_wallet(p_from_identity_id);
  perform public.ensure_wallet(p_to_identity_id);

  -- The same deterministic order transfer_wallet_coins uses, so a capped send
  -- racing an uncapped or opposite-direction one cannot deadlock with it.
  if p_from_identity_id < p_to_identity_id then
    v_first_id := p_from_identity_id; v_second_id := p_to_identity_id;
  else
    v_first_id := p_to_identity_id; v_second_id := p_from_identity_id;
  end if;
  perform 1 from public.coin_wallets where identity_id = v_first_id for update;
  perform 1 from public.coin_wallets where identity_id = v_second_id for update;

  -- A replay of a send that already landed is not a new send: let the inner
  -- function answer it, whatever the day's total has become since.
  if not exists (
    select 1 from public.coin_ledger_entries where idempotency_key = p_idempotency_key || ':send'
  ) then
    select coalesce(sum(-amount), 0) into v_sent_today
    from public.coin_ledger_entries
    where wallet_id = p_from_identity_id
      and entry_type = 'P2P_TRANSFER_SEND'
      and created_at >= p_day_start;

    if v_sent_today + p_amount > p_daily_cap then
      raise exception 'TRANSFER_CAP_EXCEEDED: % sent today, % requested, cap %',
        v_sent_today, p_amount, p_daily_cap;
    end if;
  end if;

  return public.transfer_wallet_coins(
    p_from_identity_id, p_to_identity_id, p_amount, p_reason, p_idempotency_key
  );
end;
$$;

revoke all on function public.transfer_wallet_coins_capped(text, text, bigint, text, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.transfer_wallet_coins_capped(text, text, bigint, text, text, bigint, timestamptz) to service_role;
