-- Mandali: any active member can pay a coin request, not only the one it named.
--
-- Why this changes
--   20261001000000 modelled a coin request as a peer ask with ONE designated
--   payer ("like WhatsApp, not an open group collection"). In practice the
--   one-tap "Request coins" button never lets the requester choose: the client
--   picks the owner automatically. So every request was silently addressed to
--   the owner, and everyone else in the group saw a card they could not act on.
--   The product rule is now: a request is posted to the group, and whoever in
--   the group responds first pays it.
--
-- What stays the same
--   payer_identity_id keeps its column and its meaning at creation time — the
--   person the request was addressed to, who still gets the "asked you" banner.
--   It is no longer an authorisation rule. The coins move through the same
--   audited transfer_wallet_coins, under the same row lock and idempotency key.
--
-- What is new
--   funded_by_identity_id records who actually paid, so the card can say
--   "Paid by Geetha" and the ledger question "who covered this" has an answer
--   in the row rather than only in the wallet ledger.
--
-- Races
--   Two members tapping Pay at once both reach the `for update` below. The
--   second one waits, then sees status FUNDED and returns alreadyFunded with
--   the first payer recorded. The server tells that second person it was
--   already covered; their wallet is never touched because the transfer is
--   only reached on an OPEN row.
--
-- 20261001000000 is already applied to production, so it is left untouched;
-- this migration replaces the function with the same signature.

alter table public.mandali_coin_requests
  add column if not exists funded_by_identity_id text references public.player_identities (player_id) on delete restrict;

-- Every request funded before this migration was, by construction, paid by
-- its designated payer.
update public.mandali_coin_requests
  set funded_by_identity_id = payer_identity_id
  where status = 'FUNDED' and funded_by_identity_id is null;

create or replace function public.fund_coin_request(
  p_request_id text,
  p_payer_identity_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.mandali_coin_requests;
  v_transfer_result jsonb;
begin
  select * into v_request from public.mandali_coin_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND: %', p_request_id;
  end if;

  if v_request.status = 'FUNDED' then
    return jsonb_build_object('alreadyFunded', true, 'request', to_jsonb(v_request));
  end if;
  if v_request.status <> 'OPEN' then
    raise exception 'REQUEST_NOT_OPEN: status is %', v_request.status;
  end if;
  if v_request.expires_at <= now() then
    update public.mandali_coin_requests set status = 'EXPIRED', decided_at = now() where id = p_request_id;
    raise exception 'REQUEST_EXPIRED: %', p_request_id;
  end if;

  -- Opening payment to the group widens who can reach this function, so the
  -- membership checks that used to be implied by "you are the named payer"
  -- are now explicit.
  if v_request.requester_identity_id = p_payer_identity_id then
    raise exception 'INVALID_REQUEST: cannot pay your own coin request';
  end if;
  if not exists (
    select 1 from public.mandali_memberships
    where mandali_id = v_request.mandali_id and identity_id = p_payer_identity_id and state = 'ACTIVE'
  ) then
    raise exception 'NOT_ACTIVE_MEMBER: only members of this Mandali can pay its coin requests';
  end if;
  -- Someone who has left the group should not keep collecting from it.
  if not exists (
    select 1 from public.mandali_memberships
    where mandali_id = v_request.mandali_id and identity_id = v_request.requester_identity_id and state = 'ACTIVE'
  ) then
    raise exception 'REQUESTER_NOT_ACTIVE: the person who asked is no longer in this Mandali';
  end if;

  v_transfer_result := public.transfer_wallet_coins(
    p_from_identity_id => p_payer_identity_id,
    p_to_identity_id => v_request.requester_identity_id,
    p_amount => v_request.amount,
    p_reason => 'Mandali coin request',
    p_idempotency_key => p_idempotency_key
  );

  update public.mandali_coin_requests
    set status = 'FUNDED',
        funded_by_identity_id = p_payer_identity_id,
        transfer_idempotency_key = p_idempotency_key,
        decided_at = now()
    where id = p_request_id
    returning * into v_request;

  return jsonb_build_object('alreadyFunded', false, 'request', to_jsonb(v_request), 'transfer', v_transfer_result);
end;
$$;

revoke all on function public.fund_coin_request(text, text, text) from public, anon, authenticated;
grant execute on function public.fund_coin_request(text, text, text) to service_role;
