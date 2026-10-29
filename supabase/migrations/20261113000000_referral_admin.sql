-- Referral operator console: what an operator can see and change, and the record of who changed it.
--
-- Everything here is service-role only. The console reaches it through /api/admin/referrals, behind the
-- operational-auth guard (super admins), and never from a browser session.
--
--   referral_admin_overview()          the funnel (invited -> joined -> played -> paid), the coins waiting to be paid,
--                                       the current campaign settings, and the accounts with the most invitees
--   referral_admin_pending_rewards()   referral bonuses still in their hold, oldest first, so one can be withdrawn
--   referral_admin_set_campaign()      change the amounts, the friend cap and the windows: bounded, needs a written
--                                       note, and records before/after
--   referral_admin_log()               a record of any other operator action (a withdrawn bonus)
--   referral_admin_events_list()       that record, newest first
--
-- The log is append-only: there is no update or delete function, and the table grants nothing to the browser roles.
-- Operational rollback: supabase/rollbacks/20261113000000_referral_admin_rollback.sql

create table if not exists public.referral_admin_events (
  id         bigserial primary key,
  actor      text        not null check (length(btrim(actor)) > 0),
  action     text        not null check (action in ('CAMPAIGN_UPDATED', 'REWARD_VOIDED')),
  detail     jsonb       not null default '{}'::jsonb,
  note       text        not null check (length(btrim(note)) > 0 and length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists referral_admin_events_created_idx on public.referral_admin_events (created_at desc);

alter table public.referral_admin_events enable row level security;
revoke all on public.referral_admin_events from public, anon, authenticated;
grant select, insert on public.referral_admin_events to service_role;
grant usage on sequence public.referral_admin_events_id_seq to service_role;

-- ═══════════ the campaign, as the console shows and edits it ═══════════
create or replace function public.referral_admin_campaign_json(c public.referral_campaign)
returns jsonb language sql immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'enabled', c.enabled,
    'inviterBonus', c.inviter_bonus,
    'inviteeBonus', c.invitee_bonus,
    'rollingCap', c.rolling_cap,
    'capWindowDays', c.cap_window_days,
    'codeWindowDays', c.code_window_days,
    'bonusStartsAt', (extract(epoch from c.bonus_starts_at) * 1000)::bigint);
$$;

-- ═══════════ the overview ═══════════
create or replace function public.referral_admin_overview()
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c public.referral_campaign;
  v_funnel jsonb;
  v_liability jsonb;
  v_top jsonb;
begin
  select * into c from public.referral_campaign where id = 'nostalgia-v1';
  if not found then raise exception 'REFERRAL_UNAVAILABLE'; end if;

  select jsonb_build_object(
      'invitesCreated', (select count(*) from public.referral_invites),
      'joined', count(*),
      'viaCode', count(*) filter (where via = 'code'),
      'viaLink', count(*) filter (where via = 'link'),
      'qualified', count(*) filter (where qualified_at is not null),
      'waiting', count(*) filter (where qualified_at is null and expires_at > now()),
      'expired', count(*) filter (where qualified_at is null and expires_at <= now()),
      'bonusReserved', count(*) filter (where bonus_reserved_at is not null and bonus_issued_at is null),
      'bonusIssued', count(*) filter (where bonus_issued_at is not null),
      'bonusBlockedCap', count(*) filter (where bonus_blocked = 'CAP'))
    into v_funnel
    from public.referral_attributions;

  -- Coins, from the reward ledger the gateway writes: what is still in its hold, what has reached wallets, what was withdrawn.
  select jsonb_build_object(
      'pendingCoins', coalesce(sum(amount) filter (where status in ('PENDING', 'RELEASING')), 0),
      'pendingCount', count(*) filter (where status in ('PENDING', 'RELEASING')),
      'releasedCoins', coalesce(sum(amount) filter (where status = 'RELEASED'), 0),
      'releasedCount', count(*) filter (where status = 'RELEASED'),
      'voidedCoins', coalesce(sum(amount) filter (where status = 'VOIDED'), 0),
      'voidedCount', count(*) filter (where status = 'VOIDED'))
    into v_liability
    from public.reward_ledger where reward_type = 'REFERRAL';

  -- The accounts with the most invitees, with how many of them played. A number to read, not a verdict.
  select coalesce(jsonb_agg(t.j order by t.joined desc, t.qualified desc), '[]'::jsonb) into v_top from (
    select a.referrer_id, count(*) as joined, count(*) filter (where a.qualified_at is not null) as qualified,
      jsonb_build_object(
        'playerId', a.referrer_id,
        'displayName', coalesce(nullif(btrim(pr.display_name), ''), 'Unnamed member'),
        'joined', count(*),
        'qualified', count(*) filter (where a.qualified_at is not null)) as j
      from public.referral_attributions a
      left join public.player_identities pi on pi.player_id = a.referrer_id
      left join public.profiles pr on pr.id = pi.auth_user_id
     group by a.referrer_id, pr.display_name
     order by count(*) desc, count(*) filter (where a.qualified_at is not null) desc
     limit 5
  ) t;

  return jsonb_build_object(
    'campaign', public.referral_admin_campaign_json(c),
    'funnel', v_funnel,
    'liability', v_liability,
    'topReferrers', v_top,
    'serverNow', (extract(epoch from clock_timestamp()) * 1000)::bigint);
end;
$$;

-- ═══════════ bonuses still in their hold ═══════════
create or replace function public.referral_admin_pending_rewards(p_limit int default 50)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(r.j order by r.vesting_until, r.reward_id), '[]'::jsonb) from (
    select l.reward_id, l.vesting_until,
      jsonb_build_object(
        'rewardId', l.reward_id,
        'playerId', l.player_id,
        'displayName', coalesce(nullif(btrim(pr.display_name), ''), 'Unnamed member'),
        'side', case when split_part(l.source_id, ':', 3) = 'inviter' then 'inviter' else 'invitee' end,
        'inviteeId', split_part(l.source_id, ':', 2),
        'amount', l.amount,
        'status', l.status,
        'earnedAt', (extract(epoch from l.earned_at) * 1000)::bigint,
        'vestingUntil', (extract(epoch from l.vesting_until) * 1000)::bigint) as j
      from public.reward_ledger l
      left join public.player_identities pi on pi.player_id = l.player_id
      left join public.profiles pr on pr.id = pi.auth_user_id
     where l.reward_type = 'REFERRAL' and l.status in ('PENDING', 'RELEASING')
     order by l.vesting_until, l.reward_id
     limit greatest(least(p_limit, 200), 1)
  ) r;
$$;

-- ═══════════ editing the campaign ═══════════
-- Tighter than the table's own limits on purpose: a typo of 20000 instead of 2000 must be refused, not paid out.
create or replace function public.referral_admin_set_campaign(p_actor text, p_note text, p_patch jsonb)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  c public.referral_campaign;
  v_before jsonb;
  v_after jsonb;
  k text;
  v numeric;
  v_min numeric;
  v_max numeric;
begin
  if coalesce(btrim(p_actor), '') = '' then raise exception 'ACTOR_REQUIRED'; end if;
  if coalesce(btrim(p_note), '') = '' or length(p_note) > 200 then raise exception 'NOTE_REQUIRED'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then raise exception 'EMPTY_CHANGE'; end if;

  for k in select jsonb_object_keys(p_patch) loop
    case k
      when 'inviterBonus'   then v_min := 0; v_max := 10000;
      when 'inviteeBonus'   then v_min := 0; v_max := 10000;
      when 'rollingCap'     then v_min := 0; v_max := 100;
      when 'capWindowDays'  then v_min := 1; v_max := 365;
      when 'codeWindowDays' then v_min := 1; v_max := 60;
      else raise exception 'INVALID_CAMPAIGN_FIELD:%', k;
    end case;
    if jsonb_typeof(p_patch -> k) <> 'number' then raise exception 'INVALID_CAMPAIGN_VALUE:%', k; end if;
    v := (p_patch ->> k)::numeric;
    if v <> trunc(v) or v < v_min or v > v_max then raise exception 'INVALID_CAMPAIGN_VALUE:%', k; end if;
  end loop;

  select * into c from public.referral_campaign where id = 'nostalgia-v1' for update;
  if not found then raise exception 'REFERRAL_UNAVAILABLE'; end if;
  v_before := public.referral_admin_campaign_json(c);

  update public.referral_campaign set
    inviter_bonus    = coalesce((p_patch ->> 'inviterBonus')::int, inviter_bonus),
    invitee_bonus    = coalesce((p_patch ->> 'inviteeBonus')::int, invitee_bonus),
    rolling_cap      = coalesce((p_patch ->> 'rollingCap')::int, rolling_cap),
    cap_window_days  = coalesce((p_patch ->> 'capWindowDays')::int, cap_window_days),
    code_window_days = coalesce((p_patch ->> 'codeWindowDays')::int, code_window_days)
   where id = 'nostalgia-v1'
   returning * into c;
  v_after := public.referral_admin_campaign_json(c);

  insert into public.referral_admin_events(actor, action, detail, note)
    values (btrim(p_actor), 'CAMPAIGN_UPDATED', jsonb_build_object('before', v_before, 'after', v_after), btrim(p_note));
  return v_after;
end;
$$;

-- ═══════════ the record ═══════════
create or replace function public.referral_admin_log(p_actor text, p_action text, p_detail jsonb, p_note text)
returns void language plpgsql volatile security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_action <> 'REWARD_VOIDED' then raise exception 'INVALID_ACTION'; end if;
  insert into public.referral_admin_events(actor, action, detail, note)
    values (btrim(coalesce(p_actor, '')), p_action, coalesce(p_detail, '{}'::jsonb), btrim(coalesce(p_note, '')));
end;
$$;

create or replace function public.referral_admin_events_list(p_limit int default 30)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(jsonb_agg(e.j order by e.created_at desc, e.id desc), '[]'::jsonb) from (
    select id, created_at, jsonb_build_object(
        'id', id, 'actor', actor, 'action', action, 'detail', detail, 'note', note,
        'at', (extract(epoch from created_at) * 1000)::bigint) as j
      from public.referral_admin_events
     order by created_at desc, id desc
     limit greatest(least(p_limit, 100), 1)
  ) e;
$$;

revoke all on function
  public.referral_admin_campaign_json(public.referral_campaign), public.referral_admin_overview(),
  public.referral_admin_pending_rewards(int), public.referral_admin_set_campaign(text, text, jsonb),
  public.referral_admin_log(text, text, jsonb, text), public.referral_admin_events_list(int)
  from public, anon, authenticated;
grant execute on function
  public.referral_admin_overview(), public.referral_admin_pending_rewards(int),
  public.referral_admin_set_campaign(text, text, jsonb), public.referral_admin_log(text, text, jsonb, text),
  public.referral_admin_events_list(int)
  to service_role;
