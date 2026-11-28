-- One revive per invited friend.
--
-- WHY: a friend gets 30 days from joining to finish one match with another person. Real friends drift, so
-- the window often lapses, and the inviter was left with a grey "Window ended" card and nothing to do. This lets the
-- INVITER give that friend one more 30 days, once.
--
-- WHAT IT CHANGES (and what it does not):
--   * `referral_attributions.revived_at` records that the one revive was used (null = not yet).
--   * `referral_revive(referrer, ordinal)` moves `expires_at` to now + 30 days. It refuses unless the friend belongs
--     to that referrer, has not qualified, is expired, was never revived, and ended no more than 30 days ago.
--   * The old table check capped `expires_at` at `accepted_at + 720 hours`, which would reject a revived window.
--     It is replaced by a named check that allows up to 90 days (30 + the 30-day revive grace + 30 more).
--   * NOTHING about qualification changes: still one real match with another human, a verified member, the rolling
--     cap, and the reward gateway's hold. A revive only buys time, so it opens no new way to earn coins.
--   * Qualification reads the whole `[accepted_at, expires_at]` window, so a valid match the friend played AFTER the
--     first window closed and before the revive is counted by the next sweep. That is intended.
--   * `bonus_starts_at` is untouched: a friend who joined before the bonus started still earns pack progress but no coins.
--
-- The friend is addressed by the same ordinal `referral_overview` shows (accepted_at, then invitee id), because the
-- overview deliberately never exposes another member's id.
-- Operational rollback: supabase/rollbacks/20261117000000_referral_revive_rollback.sql

alter table public.referral_attributions
  add column if not exists revived_at timestamptz;

-- The original check is unnamed; find it by what it constrains rather than by a generated name.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.referral_attributions'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) like '%expires_at%' and pg_get_constraintdef(oid) like '%accepted_at%'
  loop
    execute format('alter table public.referral_attributions drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.referral_attributions
  add constraint referral_attributions_window_check
  check (expires_at > accepted_at and expires_at <= accepted_at + interval '2160 hours');

create or replace function public.referral_revive(p_referrer_id text, p_ordinal int)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c public.referral_campaign;
  v_invitee text;
  a public.referral_attributions;
  v_expires timestamptz;
begin
  if not public.referral_verified_member(p_referrer_id) then
    raise exception 'REFERRAL_VERIFIED_MEMBER_REQUIRED';
  end if;
  select * into c from public.referral_campaign where enabled limit 1;
  if not found then raise exception 'REFERRAL_UNAVAILABLE'; end if;

  select t.invitee_id into v_invitee from (
    select invitee_id, row_number() over (order by accepted_at, invitee_id) as ord
      from public.referral_attributions where referrer_id = p_referrer_id
  ) t where t.ord = p_ordinal;
  if v_invitee is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;

  -- Lock the row, then decide on what is really there: a sweep or a second tap may have changed it.
  select * into a from public.referral_attributions where invitee_id = v_invitee for update;
  if a.qualified_at is not null then return jsonb_build_object('ok', false, 'code', 'ALREADY_QUALIFIED'); end if;
  if a.expires_at > now() then return jsonb_build_object('ok', false, 'code', 'STILL_OPEN'); end if;
  if a.revived_at is not null then return jsonb_build_object('ok', false, 'code', 'ALREADY_REVIVED'); end if;
  if a.expires_at < now() - interval '30 days' then return jsonb_build_object('ok', false, 'code', 'TOO_LATE'); end if;

  v_expires := now() + interval '30 days';
  update public.referral_attributions set expires_at = v_expires, revived_at = now() where invitee_id = v_invitee;
  return jsonb_build_object('ok', true, 'expiresAt', (extract(epoch from v_expires) * 1000)::bigint);
end;
$$;

revoke all on function public.referral_revive(text, int) from public, anon, authenticated;
grant execute on function public.referral_revive(text, int) to service_role;

notify pgrst, 'reload schema';
