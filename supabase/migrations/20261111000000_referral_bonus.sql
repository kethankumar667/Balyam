-- Referral bonus, shareable codes, and the overview read.
--
-- What this adds on top of 20261108000000_referrals.sql / 20261108000001_nostalgia_pack.sql (neither is edited):
--   1. Campaign settings (bonus amounts, cap, windows) as columns, so they can be tuned without a deploy.
--   2. A shareable `BHALYAM-XXXXX` code per inviter. It is drawn from digits and consonants only, so it can never
--      spell a word, and it holds nothing about the member. The long UUID in a link keeps working.
--   3. Typed-code redeem (`referral_redeem_code`) and its undo (`referral_detach`), for a new member who
--      enters a code at signup or in first-run onboarding instead of following a link.
--   4. Qualification that does not wait for the inviter to open a page (`referral_qualify_open`).
--   5. A cap-aware bonus reservation the server calls before it pays through the reward gateway. The coins
--      themselves are NOT written here: every coin reward goes through reward_ledger (the gateway), keyed by
--      `referral:<invitee>:<side>`, so a retry can never pay twice.
--   6. `referral_overview`: everything the member's referral page shows, in one read.
--
-- Existing attributions are never paid retroactively: `bonus_starts_at` is set to the moment this migration runs and
-- only attributions accepted after it are eligible.
-- Operational rollback: supabase/rollbacks/20261111000000_referral_bonus_rollback.sql

-- ═══════════ 1. campaign settings ═══════════
alter table public.referral_campaign
  add column if not exists inviter_bonus   integer     not null default 2000 check (inviter_bonus between 0 and 100000),
  add column if not exists invitee_bonus   integer     not null default 2000 check (invitee_bonus between 0 and 100000),
  add column if not exists rolling_cap     integer     not null default 10   check (rolling_cap between 0 and 1000),
  add column if not exists cap_window_days integer     not null default 30   check (cap_window_days between 1 and 365),
  add column if not exists code_window_days integer    not null default 7    check (code_window_days between 1 and 90),
  add column if not exists bonus_starts_at timestamptz not null default now();

-- ═══════════ 2. shareable codes ═══════════
alter table public.referral_invites add column if not exists share_code text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'referral_share_code_format') then
    alter table public.referral_invites add constraint referral_share_code_format
      check (share_code is null or share_code ~ '^BHALYAM-[2-9BCDFGHJKLMNPRSTVWXZ]{5}$');
  end if;
end
$$;
create unique index if not exists referral_invites_share_code_key on public.referral_invites (share_code);

create or replace function public.referral_new_share_code()
returns text language plpgsql volatile
set search_path = pg_catalog, public, pg_temp
as $$
declare
  alphabet constant text := '23456789BCDFGHJKLMNPRSTVWXZ';
  candidate text;
  i int;
begin
  loop
    candidate := 'BHALYAM-';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * 27)::int, 1);
    end loop;
    exit when not exists (select 1 from public.referral_invites where share_code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Whatever was typed, as the canonical code, or null. Mirrors normalizeReferralCode in shared/referrals.ts.
create or replace function public.referral_normalize_code(p_code text)
returns text language plpgsql immutable
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c text;
begin
  if p_code is null or char_length(p_code) > 64 then return null; end if;
  c := upper(regexp_replace(p_code, '[\s\-_.]', '', 'g'));
  if left(c, 7) = 'BHALYAM' then c := substr(c, 8); end if;
  if c ~ '^[2-9BCDFGHJKLMNPRSTVWXZ]{5}$' then return 'BHALYAM-' || c; end if;
  return null;
end;
$$;

do $$
declare
  r record;
begin
  for r in select referrer_id from public.referral_invites where share_code is null loop
    update public.referral_invites set share_code = public.referral_new_share_code() where referrer_id = r.referrer_id;
  end loop;
end
$$;

-- ═══════════ 3. attribution columns ═══════════
alter table public.referral_attributions
  add column if not exists via text not null default 'link' check (via in ('link', 'code')),
  add column if not exists bonus_reserved_at timestamptz,
  add column if not exists bonus_issued_at timestamptz,
  add column if not exists bonus_blocked text check (bonus_blocked in ('CAP', 'REVIEW'));

create index if not exists referral_attributions_open_idx
  on public.referral_attributions (expires_at) where qualified_at is null;
create index if not exists referral_attributions_bonus_due_idx
  on public.referral_attributions (qualified_at)
  where qualified_at is not null and bonus_issued_at is null and bonus_blocked is null;
create index if not exists referral_attributions_reserved_idx
  on public.referral_attributions (referrer_id, bonus_reserved_at) where bonus_reserved_at is not null;

-- ═══════════ 4. one definition of "a qualifying match" ═══════════
-- The invitee's first match that started after they accepted and finished inside the window, with at least one
-- other human in it. Bots and the invitee's own pass-and-play seats (not separate participants) never count.
create or replace function public.referral_qualifying_match(p_invitee text, p_accepted timestamptz, p_expires timestamptz)
returns table (id text, finished_at timestamptz)
language sql stable
set search_path = pg_catalog, public, pg_temp
as $$
  select s.id, s.finished_at
    from public.match_summaries s
    join public.match_participants mine on mine.match_id = s.id
   where mine.player_id = p_invitee and not mine.is_bot
     and s.started_at >= p_accepted and s.finished_at <= p_expires and s.duration_ms > 0
     and exists (
       select 1 from public.match_participants other
        where other.match_id = s.id and other.player_id <> p_invitee and not other.is_bot
     )
   order by s.finished_at, s.id
   limit 1;
$$;

create or replace function public.referral_qualify_open(p_limit int default 200, p_referrer text default null)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_referrers text[];
  v_referrer text;
begin
  with eligible as (
    select a.invitee_id, m.finished_at, m.id as match_id
      from public.referral_attributions a
      cross join lateral public.referral_qualifying_match(a.invitee_id, a.accepted_at, a.expires_at) m
     where a.qualified_at is null
       and (p_referrer is null or a.referrer_id = p_referrer)
       and public.referral_verified_member(a.invitee_id)
     limit greatest(p_limit, 1)
  ), done as (
    update public.referral_attributions a
       set qualified_at = e.finished_at, qualified_match_id = e.match_id
      from eligible e
     where a.invitee_id = e.invitee_id and a.qualified_at is null
    returning a.referrer_id
  )
  select coalesce(array_agg(distinct referrer_id), '{}') into v_referrers from done;
  -- The pack is earned the moment the third friend qualifies, not the next time the inviter opens a page.
  foreach v_referrer in array v_referrers loop
    perform public.referral_grant_pack_if_due(v_referrer);
  end loop;
  return jsonb_build_object('qualified', coalesce(array_length(v_referrers, 1), 0), 'referrers', to_jsonb(v_referrers));
end;
$$;

-- ═══════════ 5. the pack milestone, and sync ═══════════
create or replace function public.referral_grant_pack_if_due(p_player_id text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invite public.referral_invites;
  v_count int;
begin
  select * into v_invite from public.referral_invites where referrer_id = p_player_id for update;
  if not found or v_invite.rewarded_at is not null then return; end if;
  select count(*) into v_count from public.referral_attributions where referrer_id = p_player_id and qualified_at is not null;
  if v_count < 3 then return; end if;
  if (select count(*) from public.cosmetic_catalog where id in
      ('aura_nostalgia_gold', 'title_gang_leader', 'table_retro_school_slate')
      and unlock_method = 'REFERRAL_MILESTONE' and is_active) <> 3 then
    raise exception 'REFERRAL_PACK_UNAVAILABLE';
  end if;
  insert into public.user_cosmetics(user_id, cosmetic_id, source_type, source_reference)
    select p_player_id, id, 'REFERRAL_MILESTONE', 'nostalgia-v1:' || p_player_id
    from public.cosmetic_catalog where id in
      ('aura_nostalgia_gold', 'title_gang_leader', 'table_retro_school_slate')
    on conflict (user_id, cosmetic_id) do nothing;
  update public.referral_invites set rewarded_at = now() where referrer_id = p_player_id;
end;
$$;

create or replace function public.referral_sync(p_player_id text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invite public.referral_invites;
  v_count int;
  v_pending int;
begin
  if not exists (select 1 from public.referral_campaign where enabled) then
    raise exception 'REFERRAL_UNAVAILABLE';
  end if;
  if not public.referral_verified_member(p_player_id) then
    raise exception 'REFERRAL_VERIFIED_MEMBER_REQUIRED';
  end if;
  insert into public.referral_invites(referrer_id, share_code)
    values (p_player_id, public.referral_new_share_code()) on conflict (referrer_id) do nothing;
  select * into v_invite from public.referral_invites where referrer_id = p_player_id for update;
  if v_invite.share_code is null then
    update public.referral_invites set share_code = public.referral_new_share_code()
     where referrer_id = p_player_id returning * into v_invite;
  end if;

  perform public.referral_qualify_open(1000, p_player_id);
  perform public.referral_grant_pack_if_due(p_player_id);
  select * into v_invite from public.referral_invites where referrer_id = p_player_id;

  select count(*) filter (where qualified_at is not null),
         count(*) filter (where qualified_at is null and expires_at > now())
    into v_count, v_pending from public.referral_attributions where referrer_id = p_player_id;
  return jsonb_build_object('inviteCode', v_invite.code, 'shareCode', v_invite.share_code,
    'qualifiedFriends', case when v_invite.rewarded_at is not null then 3 else least(v_count, 3) end,
    'pendingFriends', v_pending, 'target', 3, 'rewardGranted', v_invite.rewarded_at is not null);
end;
$$;

-- ═══════════ 6. typed codes ═══════════
create or replace function public.referral_code_valid(p_code text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.referral_invites i
     where i.share_code = public.referral_normalize_code(p_code)
       and public.referral_verified_member(i.referrer_id)
       and exists (select 1 from public.referral_campaign where enabled)
  );
$$;

create or replace function public.referral_redeem_code(p_player_id text, p_code text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_code text := public.referral_normalize_code(p_code);
  v_referrer text;
  v_existing text;
  v_created timestamptz;
  v_window int;
begin
  if v_code is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  end if;
  select referrer_id into v_referrer from public.referral_invites where share_code = v_code for update;
  if v_referrer is null or not public.referral_code_valid(v_code) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  end if;
  if v_referrer = p_player_id then
    return jsonb_build_object('ok', false, 'code', 'SELF_REFERRAL');
  end if;
  if not public.referral_verified_member(p_player_id) then
    return jsonb_build_object('ok', false, 'code', 'VERIFY_EMAIL');
  end if;
  select referrer_id into v_existing from public.referral_attributions where invitee_id = p_player_id;
  if found then
    return case when v_existing = v_referrer then jsonb_build_object('ok', true)
      else jsonb_build_object('ok', false, 'code', 'ALREADY_ATTRIBUTED') end;
  end if;
  select code_window_days into v_window from public.referral_campaign where enabled limit 1;
  select u.created_at into v_created from auth.users u
    join public.player_identities p on p.auth_user_id = u.id where p.player_id = p_player_id;
  if v_created is null or v_created < now() - make_interval(days => coalesce(v_window, 7)) then
    return jsonb_build_object('ok', false, 'code', 'TOO_LATE');
  end if;
  -- A code is for someone who has not started playing with other people yet.
  if exists (
    select 1 from public.match_participants mine
      join public.match_summaries s on s.id = mine.match_id
     where mine.player_id = p_player_id and not mine.is_bot and s.duration_ms > 0
       and exists (select 1 from public.match_participants o
                    where o.match_id = s.id and o.player_id <> p_player_id and not o.is_bot)
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_PLAYED');
  end if;
  insert into public.referral_attributions(invitee_id, referrer_id, accepted_at, expires_at, via)
    values (p_player_id, v_referrer, now(), now() + interval '720 hours', 'code')
    on conflict (invitee_id) do nothing;
  select referrer_id into v_existing from public.referral_attributions where invitee_id = p_player_id;
  return case when v_existing = v_referrer then jsonb_build_object('ok', true)
    else jsonb_build_object('ok', false, 'code', 'ALREADY_ATTRIBUTED') end;
end;
$$;

-- Take a mistyped code back. Only until the first qualifying match, and never once a bonus has been reserved.
create or replace function public.referral_detach(p_player_id text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_gone int;
begin
  delete from public.referral_attributions
   where invitee_id = p_player_id and qualified_at is null and bonus_reserved_at is null;
  get diagnostics v_gone = row_count;
  return case when v_gone > 0 then jsonb_build_object('ok', true)
    else jsonb_build_object('ok', false, 'code', 'NOT_ATTACHED') end;
end;
$$;

-- ═══════════ 7. the bonus ═══════════
-- Who is owed a bonus: qualified, not yet issued, not blocked, accepted after the bonus started.
create or replace function public.referral_bonus_due(p_limit int default 50)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'inviteeId', a.invitee_id, 'referrerId', a.referrer_id,
           'inviterBonus', c.inviter_bonus, 'inviteeBonus', c.invitee_bonus)), '[]'::jsonb)
    from (
      select * from public.referral_attributions
       where qualified_at is not null and bonus_issued_at is null and bonus_blocked is null
       order by qualified_at limit greatest(p_limit, 1)
    ) a
    cross join (select * from public.referral_campaign where enabled limit 1) c
   where a.accepted_at >= c.bonus_starts_at and (c.inviter_bonus > 0 or c.invitee_bonus > 0);
$$;

-- Reserve the bonus for one attribution under the inviter's lock, so the cap can never be raced past.
-- Safe to call again: a reserved attribution answers with its amounts again, which is what lets the server
-- retry the payout after a crash. The coins are paid by the server through the reward gateway afterwards.
create or replace function public.referral_bonus_reserve(p_invitee_id text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  a public.referral_attributions;
  c public.referral_campaign;
  v_used int;
begin
  select * into a from public.referral_attributions where invitee_id = p_invitee_id;
  if not found or a.qualified_at is null then
    return jsonb_build_object('state', 'NOT_QUALIFIED');
  end if;
  perform 1 from public.referral_invites where referrer_id = a.referrer_id for update;
  select * into a from public.referral_attributions where invitee_id = p_invitee_id;
  select * into c from public.referral_campaign where enabled limit 1;
  if not found or a.accepted_at < c.bonus_starts_at then
    return jsonb_build_object('state', 'NOT_ELIGIBLE');
  end if;
  if a.bonus_issued_at is not null then return jsonb_build_object('state', 'ISSUED'); end if;
  if a.bonus_blocked is not null then return jsonb_build_object('state', 'BLOCKED', 'reason', a.bonus_blocked); end if;
  if a.bonus_reserved_at is null then
    select count(*) into v_used from public.referral_attributions
     where referrer_id = a.referrer_id and bonus_reserved_at is not null
       and bonus_reserved_at > now() - make_interval(days => c.cap_window_days);
    if v_used >= c.rolling_cap then
      update public.referral_attributions set bonus_blocked = 'CAP' where invitee_id = p_invitee_id;
      return jsonb_build_object('state', 'BLOCKED', 'reason', 'CAP');
    end if;
    update public.referral_attributions set bonus_reserved_at = now() where invitee_id = p_invitee_id;
  end if;
  return jsonb_build_object('state', 'RESERVED', 'referrerId', a.referrer_id,
    'inviterBonus', c.inviter_bonus, 'inviteeBonus', c.invitee_bonus);
end;
$$;

create or replace function public.referral_bonus_complete(p_invitee_id text)
returns void language sql security definer
set search_path = pg_catalog, public, pg_temp
as $$
  update public.referral_attributions set bonus_issued_at = now()
   where invitee_id = p_invitee_id and bonus_reserved_at is not null and bonus_issued_at is null;
$$;

-- ═══════════ 8. the overview ═══════════
-- One side's bonus, as the page shows it. The coins live in reward_ledger (paid by the gateway); this only reads.
create or replace function public.referral_bonus_json(p_att public.referral_attributions, p_side text, p_amount int)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_player text := case when p_side = 'inviter' then p_att.referrer_id else p_att.invitee_id end;
  r record;
begin
  if p_att.bonus_blocked is not null then
    return jsonb_build_object('state', 'BLOCKED', 'amount', p_amount, 'vestingUntil', null,
      'creditedAt', null, 'blockedReason', p_att.bonus_blocked);
  end if;
  if p_att.qualified_at is null then
    return jsonb_build_object('state', 'NONE', 'amount', p_amount, 'vestingUntil', null,
      'creditedAt', null, 'blockedReason', null);
  end if;
  select status, amount, vesting_until, released_at into r from public.reward_ledger
   where player_id = v_player and reward_type = 'REFERRAL'
     and source_id = 'referral:' || p_att.invitee_id || ':' || p_side;
  if not found then
    return jsonb_build_object('state', 'PENDING', 'amount', p_amount, 'vestingUntil', null,
      'creditedAt', null, 'blockedReason', null);
  end if;
  return jsonb_build_object(
    'state', case r.status when 'RELEASED' then 'CREDITED' when 'VOIDED' then 'VOIDED' else 'VESTING' end,
    'amount', r.amount,
    'vestingUntil', case when r.status in ('PENDING', 'RELEASING') then (extract(epoch from r.vesting_until) * 1000)::bigint end,
    'creditedAt', case when r.status = 'RELEASED' then (extract(epoch from r.released_at) * 1000)::bigint end,
    'blockedReason', null);
end;
$$;

create or replace function public.referral_overview(p_player_id text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c public.referral_campaign;
  v_invite public.referral_invites;
  v_friends jsonb;
  v_referrer jsonb;
  v_totals jsonb;
  v_joined int; v_qualified int; v_waiting int; v_expired int;
  v_created timestamptz;
  v_can_enter boolean;
begin
  if not public.referral_verified_member(p_player_id) then
    raise exception 'REFERRAL_VERIFIED_MEMBER_REQUIRED';
  end if;
  select * into c from public.referral_campaign where enabled limit 1;
  if not found then raise exception 'REFERRAL_UNAVAILABLE'; end if;

  insert into public.referral_invites(referrer_id, share_code)
    values (p_player_id, public.referral_new_share_code()) on conflict (referrer_id) do nothing;
  select * into v_invite from public.referral_invites where referrer_id = p_player_id;
  if v_invite.share_code is null then
    update public.referral_invites set share_code = public.referral_new_share_code()
     where referrer_id = p_player_id returning * into v_invite;
  end if;

  select coalesce(jsonb_agg(f.j order by f.ord), '[]'::jsonb) into v_friends from (
    select row_number() over (order by a.accepted_at, a.invitee_id) as ord,
      jsonb_build_object(
        'ordinal', row_number() over (order by a.accepted_at, a.invitee_id),
        'displayName', coalesce(nullif(btrim(pr.display_name), ''), 'New member'),
        'avatarId', pr.avatar_id,
        'joinedAt', (extract(epoch from a.accepted_at) * 1000)::bigint,
        'expiresAt', (extract(epoch from a.expires_at) * 1000)::bigint,
        'qualifiedAt', case when a.qualified_at is not null then (extract(epoch from a.qualified_at) * 1000)::bigint end,
        'status', case when a.qualified_at is not null then 'QUALIFIED' when a.expires_at > now() then 'JOINED' else 'EXPIRED' end,
        'via', a.via,
        'yourBonus', public.referral_bonus_json(a, 'inviter', c.inviter_bonus),
        'theirBonus', public.referral_bonus_json(a, 'invitee', c.invitee_bonus)
      ) as j
    from public.referral_attributions a
    join public.player_identities pi on pi.player_id = a.invitee_id
    left join public.profiles pr on pr.id = pi.auth_user_id
    where a.referrer_id = p_player_id
  ) f;

  select count(*), count(*) filter (where qualified_at is not null),
         count(*) filter (where qualified_at is null and expires_at > now()),
         count(*) filter (where qualified_at is null and expires_at <= now())
    into v_joined, v_qualified, v_waiting, v_expired
    from public.referral_attributions where referrer_id = p_player_id;

  v_totals := jsonb_build_object('joined', v_joined, 'qualified', v_qualified, 'waiting', v_waiting, 'expired', v_expired,
    'bonusCredited', coalesce((select sum((e->'yourBonus'->>'amount')::int) from jsonb_array_elements(v_friends) e
                                where e->'yourBonus'->>'state' = 'CREDITED'), 0),
    'bonusPending', coalesce((select sum((e->'yourBonus'->>'amount')::int) from jsonb_array_elements(v_friends) e
                               where e->'yourBonus'->>'state' in ('PENDING', 'VESTING')), 0));

  select jsonb_build_object(
      'displayName', coalesce(nullif(btrim(pr.display_name), ''), 'A BHALYAM member'),
      'avatarId', pr.avatar_id,
      'joinedAt', (extract(epoch from a.accepted_at) * 1000)::bigint,
      'qualifiedAt', case when a.qualified_at is not null then (extract(epoch from a.qualified_at) * 1000)::bigint end,
      'status', case when a.qualified_at is not null then 'QUALIFIED' when a.expires_at > now() then 'JOINED' else 'EXPIRED' end,
      'via', a.via,
      'yourBonus', public.referral_bonus_json(a, 'invitee', c.invitee_bonus),
      'canDetach', a.qualified_at is null and a.bonus_reserved_at is null)
    into v_referrer
    from public.referral_attributions a
    join public.player_identities ri on ri.player_id = a.referrer_id
    left join public.profiles pr on pr.id = ri.auth_user_id
   where a.invitee_id = p_player_id;

  select u.created_at into v_created from auth.users u
    join public.player_identities p on p.auth_user_id = u.id where p.player_id = p_player_id;
  v_can_enter := v_referrer is null
    and v_created is not null and v_created >= now() - make_interval(days => c.code_window_days)
    and not exists (
      select 1 from public.match_participants mine join public.match_summaries s on s.id = mine.match_id
       where mine.player_id = p_player_id and not mine.is_bot and s.duration_ms > 0
         and exists (select 1 from public.match_participants o
                      where o.match_id = s.id and o.player_id <> p_player_id and not o.is_bot));

  return jsonb_build_object(
    'shareCode', v_invite.share_code,
    'inviteCode', v_invite.code,
    'campaign', jsonb_build_object('inviterBonus', c.inviter_bonus, 'inviteeBonus', c.invitee_bonus,
      'windowDays', 30, 'rollingCap', c.rolling_cap, 'capWindowDays', c.cap_window_days,
      'codeWindowDays', c.code_window_days, 'target', 3),
    'totals', v_totals,
    'friends', v_friends,
    'referredBy', v_referrer,
    'pack', jsonb_build_object('granted', v_invite.rewarded_at is not null, 'qualifiedFriends', v_qualified, 'target', 3),
    'canEnterCode', v_can_enter,
    'serverNow', (extract(epoch from clock_timestamp()) * 1000)::bigint);
end;
$$;

-- ═══════════ 9. access ═══════════
revoke all on function public.referral_new_share_code(), public.referral_normalize_code(text),
  public.referral_qualifying_match(text, timestamptz, timestamptz), public.referral_qualify_open(int, text),
  public.referral_grant_pack_if_due(text), public.referral_code_valid(text), public.referral_redeem_code(text, text),
  public.referral_detach(text), public.referral_bonus_due(int), public.referral_bonus_reserve(text),
  public.referral_bonus_complete(text), public.referral_bonus_json(public.referral_attributions, text, int),
  public.referral_overview(text) from public, anon, authenticated;
grant execute on function public.referral_qualify_open(int, text), public.referral_code_valid(text),
  public.referral_redeem_code(text, text), public.referral_detach(text), public.referral_bonus_due(int),
  public.referral_bonus_reserve(text), public.referral_bonus_complete(text), public.referral_overview(text)
  to service_role;
