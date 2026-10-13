begin;

create table if not exists public.player_moderation (
  player_id text primary key references public.player_identities(player_id) on delete cascade,
  is_suspended boolean not null default false,
  reason text not null check (char_length(reason) between 3 and 500),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.player_moderation_audit (
  id bigint generated always as identity primary key,
  player_id text not null references public.player_identities(player_id) on delete cascade,
  actor_id text references public.player_identities(player_id) on delete set null,
  action text not null check (action in ('suspend','resume')),
  reason text not null check (char_length(reason) between 3 and 500),
  revision integer not null,
  created_at timestamptz not null default now(),
  unique(player_id, revision)
);
alter table public.player_moderation enable row level security;
alter table public.player_moderation_audit enable row level security;
revoke all on public.player_moderation, public.player_moderation_audit from public, anon, authenticated;
grant all on public.player_moderation, public.player_moderation_audit to service_role;
grant usage, select on sequence public.player_moderation_audit_id_seq to service_role;
create index if not exists player_moderation_suspended_idx on public.player_moderation(player_id) where is_suspended;

alter table public.match_summaries add column if not exists winner_kind text not null default 'unknown'
  check (winner_kind in ('human','bot','local','unverified','draw','unknown'));

create or replace function public.register_canonical_admin_identity() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  insert into public.player_identities(player_id,kind,auth_user_id,created_at,last_seen_at)
    values(new.id::text,'member',new.id,new.created_at,coalesce(new.last_sign_in_at,new.created_at))
    on conflict(player_id) do nothing;
  return new;
end;
$$;
revoke all on function public.register_canonical_admin_identity() from public, anon, authenticated;
drop trigger if exists register_canonical_admin_identity on auth.users;
create trigger register_canonical_admin_identity after insert on auth.users
  for each row execute function public.register_canonical_admin_identity();
insert into public.player_identities(player_id,kind,auth_user_id,created_at,last_seen_at)
  select id::text,'member',id,created_at,coalesce(last_sign_in_at,created_at) from auth.users
  on conflict(player_id) do nothing;

create or replace view public.admin_player_summary_rows as
select identity.player_id,
  jsonb_build_object(
    'id',identity.player_id,'name',coalesce(nullif(profile.display_name,''),nullif(account.display_name,''),identity.player_id),
    'email',case when identity.kind='member' then coalesce(account_auth.email,'') else '' end,
    'avatar',coalesce(profile.avatar,account.avatar_id),'role','member','accountKind',identity.kind,
    'joinedAt',extract(epoch from coalesce(account_auth.created_at,identity.created_at))*1000,
    'lastActiveAt',extract(epoch from greatest(identity.last_seen_at,account_auth.last_sign_in_at))*1000,
    'matchesPlayed',stats.matches,'winRate',stats.win_rate::text||'%',
    'rating',case when stats.matches=0 then 400 else greatest(100,400+stats.wins*25-stats.losses*8+round(stats.win_rate*6)) end,
    'favoriteGame',coalesce(favorite.game,'none'),
    'suspension',jsonb_build_object('isSuspended',coalesce(moderation.is_suspended,false),
      'reason',moderation.reason,'updatedAt',extract(epoch from moderation.updated_at)*1000,'revision',coalesce(moderation.revision,0))
  ) as summary
from public.player_identities identity
left join auth.users account_auth on account_auth.id=identity.auth_user_id
left join public.profiles account on account.id=identity.auth_user_id
left join public.player_profiles profile on profile.player_id=identity.player_id
left join public.player_moderation moderation on moderation.player_id=identity.player_id
cross join lateral (
  select count(*) as matches, count(*) filter(where participant.is_winner) as wins,
    count(*) filter(where not participant.is_winner and (match.winner_id is not null or match.winner_kind in ('bot','local','unverified'))) as losses,
    coalesce(round(100.0*count(*) filter(where participant.is_winner)/nullif(count(*),0)),0) as win_rate
  from public.match_participants participant join public.match_summaries match on match.id=participant.match_id
  where participant.player_id=identity.player_id and not participant.is_bot
) stats
left join lateral (
  select match.game from public.match_participants participant join public.match_summaries match on match.id=participant.match_id
  where participant.player_id=identity.player_id and not participant.is_bot
  group by match.game order by count(*) desc,match.game limit 1
) favorite on true
where identity.erased_at is null and
  ((identity.kind='guest' and left(identity.player_id,6)='guest_') or
   (identity.kind='member' and account_auth.id::text=identity.player_id));
revoke all on public.admin_player_summary_rows from public, anon, authenticated;
grant select on public.admin_player_summary_rows to service_role;

create or replace function public.admin_player_summary(p_id text) returns jsonb
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select summary from public.admin_player_summary_rows where player_id=p_id;
$$;

create or replace function public.admin_player_directory(p_page integer,p_page_size integer,p_search text,p_kind text,p_role text,p_roles jsonb)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare result jsonb;
begin
  if p_page not between 1 and 1000000 or p_page_size not between 1 and 100 or
    p_kind not in ('all','member','guest') or p_role not in ('all','member','admin','super_admin') or length(p_search)>100 then
    raise exception 'Invalid directory query';
  end if;
  with assigned as (
    select player_id,summary||jsonb_build_object('role',case when summary->>'accountKind'='guest' then 'member'
      else coalesce(p_roles->>player_id,'member') end) as item from public.admin_player_summary_rows
  ), filtered as (
    select * from assigned where (p_kind='all' or item->>'accountKind'=p_kind) and
      (p_role='all' or item->>'role'=p_role) and
      (position(lower(p_search) in lower(player_id))>0 or position(lower(p_search) in lower(item->>'name'))>0 or
       position(lower(p_search) in lower(item->>'email'))>0)
  ), page as (select item from filtered order by player_id limit p_page_size offset (p_page-1)*p_page_size)
  select jsonb_build_object('users',coalesce((select jsonb_agg(item) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),'page',p_page,'pageSize',p_page_size) into result;
  return result;
end;
$$;

create or replace function public.admin_suspended_players(p_offset integer,p_limit integer) returns jsonb
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select coalesce(jsonb_agg(row),'[]'::jsonb) from (
    select jsonb_build_object('id',status.player_id,'suspension',jsonb_build_object('isSuspended',true,
      'reason',status.reason,'revision',status.revision,'updatedAt',extract(epoch from status.updated_at)*1000)) as row
    from public.player_moderation status join public.player_identities identity on identity.player_id=status.player_id
    where status.is_suspended and identity.erased_at is null order by status.player_id
    limit least(greatest(p_limit,1),250) offset greatest(p_offset,0)
  ) loaded;
$$;

create or replace function public.admin_moderate_player(p_actor text,p_id text,p_action text,p_reason text,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare current_revision integer; new_state jsonb;
begin
  if p_actor=p_id or not exists(select 1 from public.player_identities where player_id=p_actor and kind='member' and erased_at is null) then
    return jsonb_build_object('status',403);
  end if;
  if p_action not in ('suspend','resume') or length(trim(p_reason)) not between 3 and 500 or
    p_reason ~ '[[:cntrl:]]' or p_expected_revision<0 then return jsonb_build_object('status',400); end if;
  perform 1 from public.player_identities where player_id=p_id and erased_at is null for update;
  if not found then return jsonb_build_object('status',404); end if;
  select revision into current_revision from public.player_moderation where player_id=p_id;
  current_revision:=coalesce(current_revision,0);
  if current_revision<>p_expected_revision then return jsonb_build_object('status',409); end if;
  insert into public.player_moderation(player_id,is_suspended,reason,revision,updated_at)
    values(p_id,p_action='suspend',trim(p_reason),current_revision+1,now())
    on conflict(player_id) do update set is_suspended=excluded.is_suspended,reason=excluded.reason,
      revision=excluded.revision,updated_at=excluded.updated_at;
  insert into public.player_moderation_audit(player_id,actor_id,action,reason,revision)
    values(p_id,p_actor,p_action,trim(p_reason),current_revision+1);
  select jsonb_build_object('isSuspended',is_suspended,'reason',reason,'revision',revision,
    'updatedAt',extract(epoch from updated_at)*1000) into new_state from public.player_moderation where player_id=p_id;
  return jsonb_build_object('status',200,'suspension',new_state);
end;
$$;

create or replace function public.admin_player_records(p_id text,p_section text,p_page integer,p_page_size integer)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare source text; fields text[]; predicate text; ordering text; projection text; rows jsonb; total bigint; result jsonb;
begin
  if p_page not between 1 and 1000000 or p_page_size not between 1 and 100 then raise exception 'Invalid record page'; end if;
  if not exists(select 1 from public.admin_player_summary_rows where player_id=p_id) then raise exception 'Identity not found'; end if;
  predicate:='player_id=$1'; ordering:='player_id';
  case p_section
    when 'account' then source:='public.profiles'; fields:=array['id','display_name','avatar_id','first_name','last_name','email','dob','gender','bio','region','created_at','updated_at']; predicate:='id::text=$1'; ordering:='id';
    when 'profile' then source:='public.player_profiles'; fields:=array['player_id','display_name','avatar','level','experience_points','joined_at','last_seen_at','updated_at'];
    when 'matches' then source:='public.match_summaries'; fields:=array['id','room_code','game','started_at','finished_at','duration_ms','winner_id','winner_kind','participant_count','recorded_at']; predicate:='id in (select match_id from public.match_participants where player_id=$1)'; ordering:='finished_at desc,id';
    when 'participants' then source:='public.match_participants'; fields:=array['match_id','player_id','display_name','avatar','is_winner','is_bot','placement']; ordering:='match_id,player_id';
    when 'xp' then source:='public.xp_ledger'; fields:=array['id','player_id','amount','reason','source_kind','source_id','created_at']; ordering:='created_at desc,id';
    when 'achievements' then source:='public.player_achievements'; fields:=array['player_id','achievement_id','unlocked_at']; ordering:='unlocked_at desc,achievement_id';
    when 'challenges' then source:='public.challenge_claims'; fields:=array['player_id','challenge_id','period_key','xp_awarded','claimed_at']; ordering:='claimed_at desc,challenge_id,period_key';
    when 'progression' then source:='public.season_stats'; fields:=array['player_id','season_id','season_matches','season_wins','season_xp','season_level','tournament_wins','updated_at']; ordering:='season_id,player_id';
    when 'wallet' then source:='public.coin_wallets'; fields:=array['identity_id','identity_kind','balance','version','lifetime_granted','lifetime_earned','lifetime_spent','lifetime_refunded','is_frozen','created_at','updated_at']; predicate:='identity_id=$1'; ordering:='identity_id';
    when 'ledger' then source:='public.coin_ledger_entries'; fields:=array['id','wallet_id','amount','balance_before','balance_after','wallet_version_before','wallet_version_after','entry_type','source_kind','source_id','description','created_at']; predicate:='wallet_id=$1'; ordering:='created_at desc,id';
    when 'rewards' then source:='public.reward_ledger'; fields:=array['reward_id','player_id','reward_type','reason_code','amount','source_id','earned_at','vesting_until','status','risk_state','ledger_entry_id','released_at','voided_reason']; ordering:='earned_at desc,reward_id';
    when 'reward_audit' then source:='public.reward_audit'; fields:=array['id','player_id','reward_kind','reward_ref','xp_delta','outcome','detail','created_at']; ordering:='created_at desc,id';
    when 'friends' then source:='public.friends'; fields:=array['player_id','friend_player_id','display_name','avatar','created_at']; ordering:='created_at desc,friend_player_id';
    when 'friend_requests' then source:='public.friend_requests'; fields:=array['id','sender_id','recipient_id','sender_name','sender_avatar','status','created_at','updated_at']; predicate:='sender_id=$1 or recipient_id=$1'; ordering:='created_at desc,id';
    when 'mandali' then source:='public.mandali_memberships'; fields:=array['mandali_id','identity_id','role','state','display_name','avatar','joined_at','version']; predicate:='identity_id=$1'; ordering:='joined_at desc,mandali_id';
    when 'moderation' then source:='public.player_moderation_audit'; fields:=array['id','player_id','actor_id','action','reason','revision','created_at']; ordering:='revision desc';
    else raise exception 'Unknown record section';
  end case;
  result:=jsonb_build_object('key',p_section,'title',replace(p_section,'_',' '),'page',p_page,'pageSize',p_page_size,'records','[]'::jsonb,'total',null,'hasMore',false);
  if to_regclass(source) is null then return result||jsonb_build_object('unavailable','This source is not present in the installed schema.'); end if;
  select string_agg(format('%I',field),',') into projection from unnest(fields) field
    where exists(select 1 from pg_attribute where attrelid=to_regclass(source) and attname=field and attnum>0 and not attisdropped);
  if projection is null then return result||jsonb_build_object('unavailable','No supported recorded fields in this source.'); end if;
  execute format('select count(*) from %s where %s',source,predicate) into total using p_id;
  execute format('select coalesce(jsonb_agg(to_jsonb(record)),''[]''::jsonb) from (select %s from %s where %s order by %s limit $2 offset $3) record',projection,source,predicate,ordering)
    into rows using p_id,p_page_size,(p_page-1)*p_page_size;
  return result||jsonb_build_object('records',rows,'total',total,'hasMore',total>p_page*p_page_size);
end;
$$;

create or replace function public.admin_identity_active() returns boolean
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
  select not exists(select 1 from public.player_moderation where player_id=auth.uid()::text and is_suspended);
$$;
revoke all on function public.admin_identity_active() from public, anon;
grant execute on function public.admin_identity_active() to authenticated;
drop policy if exists admin_active_profile_select on public.profiles;
drop policy if exists admin_active_profile_insert on public.profiles;
drop policy if exists admin_active_profile_update on public.profiles;
create policy admin_active_profile_select on public.profiles as restrictive for select to authenticated using(public.admin_identity_active());
create policy admin_active_profile_insert on public.profiles as restrictive for insert to authenticated with check(public.admin_identity_active());
create policy admin_active_profile_update on public.profiles as restrictive for update to authenticated using(public.admin_identity_active()) with check(public.admin_identity_active());

revoke all on function public.admin_player_summary(text), public.admin_player_directory(integer,integer,text,text,text,jsonb),
  public.admin_suspended_players(integer,integer), public.admin_moderate_player(text,text,text,text,integer),
  public.admin_player_records(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_player_summary(text), public.admin_player_directory(integer,integer,text,text,text,jsonb),
  public.admin_suspended_players(integer,integer), public.admin_moderate_player(text,text,text,text,integer),
  public.admin_player_records(text,text,integer,integer) to service_role;
commit;