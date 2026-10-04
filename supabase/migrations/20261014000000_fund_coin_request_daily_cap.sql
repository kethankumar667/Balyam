-- Migration: 20261014000000_fund_coin_request_daily_cap.sql
-- Description: Puts the per-sender daily transfer cap inside the transaction that
--   pays a Mandali coin request, the same way 20261013000000 did for plain sends.
--
--   fund_coin_request moves coins itself (through transfer_wallet_coins), so the
--   cap cannot be applied by wrapping transfer_wallet_coins_capped; it has to be
--   checked here, under the same locks. This wraps fund_coin_request
--   (20261011000000, unchanged and already applied); it does not replace it.
--
-- Lock order
--   request row first, then both wallet rows in identity order. That is the order
--   fund_coin_request and transfer_wallet_coins already take, so this cannot
--   deadlock with them or with a concurrent plain send.
--
-- Replays
--   A request that is already FUNDED is answered by the inner function, whatever
--   the day's total has become since. So a double-tap on a request that landed
--   reports "already paid", never "limit reached".
--
-- The amount checked is the request's own stored amount, not a figure the server
-- passes in, so it cannot drift from what actually moves. Re-runnable.

create or replace function public.fund_coin_request_capped(
  p_request_id text,
  p_payer_identity_id text,
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
  v_request public.mandali_coin_requests;
  v_first_id text;
  v_second_id text;
  v_sent_today bigint;
begin
  if p_daily_cap is null or p_daily_cap < 0 then
    raise exception 'INVALID_AMOUNT: daily cap must be zero or more';
  end if;

  select * into v_request from public.mandali_coin_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND: %', p_request_id;
  end if;

  -- Only an OPEN request moves coins; every other state is the inner function's to answer.
  if v_request.status = 'OPEN'
     and v_request.requester_identity_id <> p_payer_identity_id then

    perform public.ensure_wallet(p_payer_identity_id);
    perform public.ensure_wallet(v_request.requester_identity_id);

    if p_payer_identity_id < v_request.requester_identity_id then
      v_first_id := p_payer_identity_id; v_second_id := v_request.requester_identity_id;
    else
      v_first_id := v_request.requester_identity_id; v_second_id := p_payer_identity_id;
    end if;
    perform 1 from public.coin_wallets where identity_id = v_first_id for update;
    perform 1 from public.coin_wallets where identity_id = v_second_id for update;

    select coalesce(sum(-amount), 0) into v_sent_today
    from public.coin_ledger_entries
    where wallet_id = p_payer_identity_id
      and entry_type = 'P2P_TRANSFER_SEND'
      and created_at >= p_day_start;

    if v_sent_today + v_request.amount > p_daily_cap then
      raise exception 'TRANSFER_CAP_EXCEEDED: % sent today, % requested, cap %',
        v_sent_today, v_request.amount, p_daily_cap;
    end if;
  end if;

  return public.fund_coin_request(p_request_id, p_payer_identity_id, p_idempotency_key);
end;
$$;

revoke all on function public.fund_coin_request_capped(text, text, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.fund_coin_request_capped(text, text, text, bigint, timestamptz) to service_role;
