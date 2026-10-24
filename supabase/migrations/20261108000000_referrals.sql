-- Service-only referral attribution. Qualification reads authoritative completed-match
-- history, so a lost notification or server restart cannot lose an earned referral.
create table public.referral_campaign (
  id text primary key check (id = 'nostalgia-v1'),
  enabled boolean not null default false
);

create table public.referral_invites (
  referrer_id text primary key references public.player_identities(player_id) on delete cascade,
  code uuid not null unique default gen_random_uuid(),
  rewarded_at timestamptz
);

create table public.referral_attributions (
  invitee_id text primary key references public.player_identities(player_id) on delete cascade,
  referrer_id text not null references public.referral_invites(referrer_id) on delete cascade,
  accepted_at timestamptz not null,
  expires_at timestamptz not null,
  qualified_at timestamptz,
  qualified_match_id text,
  check (invitee_id <> referrer_id),
  check (expires_at > accepted_at and expires_at <= accepted_at + interval '720 hours')
);
create index referral_attributions_referrer_idx on public.referral_attributions(referrer_id);

alter table public.referral_campaign enable row level security;
alter table public.referral_invites enable row level security;
alter table public.referral_attributions enable row level security;
revoke all on public.referral_campaign, public.referral_invites, public.referral_attributions from public, anon, authenticated;
grant all on public.referral_campaign, public.referral_invites, public.referral_attributions to service_role;

alter table public.cosmetic_catalog drop constraint if exists cosmetic_catalog_unlock_method_check;
alter table public.cosmetic_catalog add constraint cosmetic_catalog_unlock_method_check
  check (unlock_method in ('COIN_PURCHASE', 'STREAK_MILESTONE', 'DEFAULT', 'REFERRAL_MILESTONE'));
alter table public.user_cosmetics drop constraint if exists user_cosmetics_source_type_check;
alter table public.user_cosmetics add constraint user_cosmetics_source_type_check
  check (source_type in ('COIN_PURCHASE', 'STREAK_MILESTONE', 'ADMIN_GRANT', 'REFERRAL_MILESTONE'));

-- The existing authenticated purchase RPC predates earned referral items.
-- Enforce the source here as well, so direct RPC calls cannot buy the pack.
create function public.enforce_cosmetic_purchase_source()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.source_type = 'COIN_PURCHASE' and exists (
    select 1 from public.cosmetic_catalog where id = new.cosmetic_id and unlock_method <> 'COIN_PURCHASE'
  ) then
    raise exception 'INVALID_COSMETIC: Default and earned cosmetics cannot be purchased.';
  end if;
  return new;
end;
$$;
create trigger enforce_cosmetic_purchase_source
before insert or update of cosmetic_id, source_type on public.user_cosmetics
for each row execute function public.enforce_cosmetic_purchase_source();
revoke all on function public.enforce_cosmetic_purchase_source() from public, anon, authenticated;

create function public.referral_verified_member(p_player_id text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.player_identities p join auth.users u on u.id = p.auth_user_id
    where p.player_id = p_player_id and p.kind = 'member' and p.erased_at is null
      and u.email_confirmed_at is not null
  );
$$;

create function public.referral_invite_valid(p_code uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.referral_invites i
    where i.code = p_code and public.referral_verified_member(i.referrer_id)
      and exists (select 1 from public.referral_campaign where enabled)
  );
$$;

create function public.referral_attribute(
  p_player_id text, p_code uuid, p_accepted_at bigint, p_expires_at bigint
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_referrer text;
  v_created timestamptz;
  v_existing text;
  v_accepted timestamptz := to_timestamp(p_accepted_at / 1000.0);
  v_expires timestamptz := to_timestamp(p_expires_at / 1000.0);
begin
  if not public.referral_invite_valid(p_code) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INVITE');
  end if;
  select referrer_id into v_referrer from public.referral_invites where code = p_code for update;
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
  if v_expires <= now() or v_accepted > now() or v_expires > v_accepted + interval '720 hours'
      or v_expires <= v_accepted then
    return jsonb_build_object('ok', false, 'code', 'EXPIRED_INVITE');
  end if;
  select u.created_at into v_created from auth.users u
    join public.player_identities p on p.auth_user_id = u.id where p.player_id = p_player_id;
  if v_created < v_accepted then
    return jsonb_build_object('ok', false, 'code', 'EXISTING_ACCOUNT');
  end if;
  insert into public.referral_attributions(invitee_id, referrer_id, accepted_at, expires_at)
    values (p_player_id, v_referrer, v_accepted, v_expires)
    on conflict (invitee_id) do nothing;
  select referrer_id into v_existing from public.referral_attributions where invitee_id = p_player_id;
  return case when v_existing = v_referrer then jsonb_build_object('ok', true)
    else jsonb_build_object('ok', false, 'code', 'ALREADY_ATTRIBUTED') end;
end;
$$;

create function public.referral_sync(p_player_id text)
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
  insert into public.referral_invites(referrer_id) values (p_player_id) on conflict do nothing;
  select * into v_invite from public.referral_invites where referrer_id = p_player_id for update;

  with eligible as (
    select a.invitee_id, m.finished_at, m.id
    from public.referral_attributions a cross join lateral (
      select s.id, s.finished_at from public.match_summaries s
      join public.match_participants mine on mine.match_id = s.id
      where mine.player_id = a.invitee_id and not mine.is_bot
        and s.started_at >= a.accepted_at and s.finished_at <= a.expires_at and s.duration_ms > 0
        and exists (
          select 1 from public.match_participants other
          where other.match_id = s.id and other.player_id <> a.invitee_id and not other.is_bot
        )
      order by s.finished_at, s.id limit 1
    ) m
    where a.referrer_id = p_player_id and a.qualified_at is null
      and public.referral_verified_member(a.invitee_id)
  )
  update public.referral_attributions a
     set qualified_at = e.finished_at, qualified_match_id = e.id
    from eligible e where a.invitee_id = e.invitee_id;

  select count(*) filter (where qualified_at is not null),
         count(*) filter (where qualified_at is null and expires_at > now())
    into v_count, v_pending from public.referral_attributions where referrer_id = p_player_id;
  if v_count >= 3 and v_invite.rewarded_at is null then
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
    update public.referral_invites set rewarded_at = now() where referrer_id = p_player_id
      returning * into v_invite;
  end if;
  return jsonb_build_object('inviteCode', v_invite.code, 'qualifiedFriends', case when v_invite.rewarded_at is not null then 3 else least(v_count, 3) end,
    'pendingFriends', v_pending, 'target', 3, 'rewardGranted', v_invite.rewarded_at is not null);
end;
$$;

revoke all on function public.referral_verified_member(text), public.referral_invite_valid(uuid),
  public.referral_attribute(text, uuid, bigint, bigint), public.referral_sync(text) from public, anon, authenticated;
grant execute on function public.referral_invite_valid(uuid),
  public.referral_attribute(text, uuid, bigint, bigint), public.referral_sync(text) to service_role;
