-- Retention for guests who did nothing.
--
-- A guest identity is created when someone first does something that needs one (see the client's
-- just-in-time identity). Some of those people never come back. A record of a person who played
-- nothing and left is data kept for no purpose, so it is purged after a quiet period. This is
-- storage limitation (DPDP) and ordinary hygiene for anonymous users in one.
--
-- ── What is purged, and what never is ─────────────────────────────────
-- Purged: a guest identity that has been idle for `p_idle_days`, that never got a wallet, and that
-- was never absorbed into an account. These are the leftovers of someone who showed up and did
-- nothing that touched coins.
-- Never touched, by construction: any guest with a wallet (the wallet ledger is immutable by design,
-- and its welcome-grant row is a permanent audit record, so a guest who got that far is kept whole),
-- any guest with a carry-over claim, and every member. This is also why the welcome grant belongs at
-- the first real action and not at arrival: it is the one thing that cannot be taken back.
--
-- ── Safe per row ──────────────────────────────────────────────────────
-- Each deletion runs in its own sub-transaction. If anything still points at the identity through a
-- restricting reference, that one guest is skipped (and counted), nothing partial is left behind, and
-- the rest carry on. So a table added later that references identities can make the purge skip a
-- guest, never break it or delete something it should not.
--
-- Apply BEFORE deploying the server that schedules it. Until it is applied the server logs that the
-- purge function is missing and does nothing.

create or replace function public.purge_idle_guests(
  p_idle_days integer default 45,
  p_batch     integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_candidate record;
  v_purged    integer := 0;
  v_skipped   integer := 0;
begin
  if p_idle_days is null or p_idle_days < 7 then
    raise exception 'INVALID_RETENTION: idle days must be at least 7';
  end if;
  if p_batch is null or p_batch < 1 or p_batch > 5000 then
    raise exception 'INVALID_BATCH: batch must be between 1 and 5000';
  end if;

  for v_candidate in
    select pi.player_id
      from public.player_identities pi
     where pi.kind = 'guest'
       and pi.last_seen_at < now() - make_interval(days => p_idle_days)
       -- never absorbed into an account
       and not exists (select 1 from public.guest_wallet_claims c where c.guest_id = pi.player_id)
       -- no wallet at all: the ledger is immutable, so a guest who has one is never purged
       and not exists (select 1 from public.coin_wallets w where w.identity_id = pi.player_id)
     order by pi.last_seen_at
     limit p_batch
  loop
    begin
      delete from public.player_identities where player_id = v_candidate.player_id;
      v_purged := v_purged + 1;
    exception when foreign_key_violation then
      -- Something still references this guest (a match, a review, a later table). Keep them whole.
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object('purged', v_purged, 'skipped', v_skipped);
end;
$$;

revoke all on function public.purge_idle_guests(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_idle_guests(integer, integer) to service_role;
