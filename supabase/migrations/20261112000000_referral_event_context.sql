-- Referral live notices: who is on each side of an invitation, by name.
--
-- When a friend joins, plays their first match, or a bonus lands, the server tells the member who
-- should hear about it ("Meera joined with your code"). It needs the two display names and the
-- referrer's id for one invitee, and nothing else. This is the same pair of names `referral_overview`
-- already shows each side (privacy notice 7), read for one attribution: no email, birthday or match
-- detail, and nothing is written.
--
-- Service-role only, like every other referral function: the browser never calls it.

create or replace function public.referral_event_context(p_invitee_id text)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'referrerId', a.referrer_id,
    'inviteeName', coalesce(nullif(btrim(ip.display_name), ''), 'A new member'),
    'referrerName', coalesce(nullif(btrim(rp.display_name), ''), 'A BHALYAM member'))
    from public.referral_attributions a
    left join public.player_identities ii on ii.player_id = a.invitee_id
    left join public.profiles ip on ip.id = ii.auth_user_id
    left join public.player_identities ri on ri.player_id = a.referrer_id
    left join public.profiles rp on rp.id = ri.auth_user_id
   where a.invitee_id = p_invitee_id;
$$;

revoke all on function public.referral_event_context(text) from public, anon, authenticated;
grant execute on function public.referral_event_context(text) to service_role;
