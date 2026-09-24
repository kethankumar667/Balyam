-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261004000000_mandali_room_invites_and_digests.sql
-- Description: (1) A room shared into Mandali chat as a joinable card.
--              (2) Per-member read state and notification level, and a single
--                  digest query that summarises what someone missed.
--
-- Room invites
--   A chat message with kind 'ROOM_INVITE', carrying the room code and a small
--   metadata blob (game, seat count, host, table name). The text content is a
--   readable fallback ("🎮 Ludo room ABC234 — tap Join to play") so a client
--   that does not know the new kind still shows something sensible.
--   Posting is atomic with two guards that would be racy in application code:
--     - the same room shared again inside the dedupe window returns the
--       existing card instead of a second one, and
--     - a per-sender-per-Mandali hourly cap, both serialised by an advisory
--       lock so two taps in flight cannot both pass.
--
-- Read state
--   mandali_memberships.last_read_at is the read pointer. Unread is derived
--   from it (messages newer than the pointer, from other people, not deleted,
--   not system chatter), never stored as a counter that can drift. Existing
--   members start "caught up" as of this migration so nobody is greeted with a
--   year of unread history.
--
-- Digest
--   get_mandali_digests returns ONE row per Mandali the person belongs to: the
--   unread count, how many different people wrote, the top three by volume,
--   the latest message, and any unread room invites. This is what turns
--   "47 messages from 7 people" into a single notification. The unread scan is
--   capped at 1000 rows per Mandali so a very busy chat cannot make it slow.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.mandali_messages drop constraint if exists mandali_messages_kind_check;
alter table public.mandali_messages
  add constraint mandali_messages_kind_check check (kind in ('TEXT', 'SYSTEM', 'COIN_REQUEST', 'ROOM_INVITE'));

alter table public.mandali_messages add column if not exists room_code text;
alter table public.mandali_messages add column if not exists metadata jsonb;
alter table public.mandali_messages
  drop constraint if exists mandali_message_metadata_size;
alter table public.mandali_messages
  add constraint mandali_message_metadata_size check (metadata is null or pg_column_size(metadata) <= 2000);

create index if not exists mandali_messages_room_code_idx
  on public.mandali_messages (room_code) where room_code is not null;
create index if not exists mandali_messages_mandali_created_idx
  on public.mandali_messages (mandali_id, created_at desc);

alter table public.mandali_memberships add column if not exists last_read_at timestamptz not null default now();
alter table public.mandali_memberships add column if not exists notification_level text not null default 'ALL';
alter table public.mandali_memberships drop constraint if exists mandali_membership_notification_level_check;
alter table public.mandali_memberships
  add constraint mandali_membership_notification_level_check
  check (notification_level in ('ALL', 'INVITES_ONLY', 'MUTED'));

-- ── post_mandali_room_invite ─────────────────────────────────────────────────
create or replace function public.post_mandali_room_invite(
  p_message_id text,
  p_mandali_id text,
  p_channel_id text,
  p_sender_identity_id text,
  p_room_code text,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_seconds integer default 600,
  p_max_per_hour integer default 6
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_existing public.mandali_messages;
  v_recent integer;
  v_oldest timestamptz;
  v_content text;
  v_result jsonb;
  v_message public.mandali_messages;
begin
  if p_room_code is null or p_room_code !~ '^[A-Z0-9]{4,10}$' then
    raise exception 'INVALID_ROOM_CODE: that does not look like a room code';
  end if;

  -- Serialise one sender's invites into one Mandali so the dedupe and the cap
  -- below cannot both be passed by two taps in flight.
  perform pg_advisory_xact_lock(hashtextextended('mandali_room_invite:' || p_mandali_id || ':' || p_sender_identity_id, 0));

  select * into v_existing from public.mandali_messages
    where mandali_id = p_mandali_id and kind = 'ROOM_INVITE' and room_code = p_room_code
      and deleted_at is null
      and created_at > clock_timestamp() - make_interval(secs => p_dedupe_seconds)
    order by created_at desc limit 1;
  if found then
    return jsonb_build_object('deduplicated', true, 'message', to_jsonb(v_existing));
  end if;

  select count(*), min(created_at) into v_recent, v_oldest from public.mandali_messages
    where mandali_id = p_mandali_id and sender_identity_id = p_sender_identity_id
      and kind = 'ROOM_INVITE' and created_at > clock_timestamp() - interval '1 hour';
  if v_recent >= p_max_per_hour then
    raise exception 'RATE_LIMITED: retry_after_seconds=%',
      greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - clock_timestamp())))::integer);
  end if;

  v_content := '🎮 ' || coalesce(nullif(p_metadata ->> 'gameName', ''), 'Game') || ' room ' || p_room_code || ' — tap Join to play';

  v_result := public.send_mandali_message(p_message_id, p_mandali_id, p_channel_id, p_sender_identity_id, v_content, null, null);

  update public.mandali_messages
    set kind = 'ROOM_INVITE', room_code = p_room_code, metadata = coalesce(p_metadata, '{}'::jsonb)
    where message_id = p_message_id
    returning * into v_message;

  return jsonb_build_object('deduplicated', false, 'message', to_jsonb(v_message));
end;
$$;

revoke all on function public.post_mandali_room_invite(text, text, text, text, text, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.post_mandali_room_invite(text, text, text, text, text, jsonb, integer, integer) to service_role;

-- ── mark_mandali_read ────────────────────────────────────────────────────────
-- Moves the read pointer to now and returns where it was, so the client can
-- draw a "new messages" line at the previous position.
create or replace function public.mark_mandali_read(p_mandali_id text, p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_previous timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  select last_read_at into v_previous from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_identity_id and state = 'ACTIVE' for update;
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_identity_id;
  end if;

  update public.mandali_memberships set last_read_at = greatest(last_read_at, v_now)
    where mandali_id = p_mandali_id and identity_id = p_identity_id;

  return jsonb_build_object('previous', v_previous, 'current', v_now);
end;
$$;

revoke all on function public.mark_mandali_read(text, text) from public, anon, authenticated;
grant execute on function public.mark_mandali_read(text, text) to service_role;

-- ── set_mandali_notification_level ───────────────────────────────────────────
create or replace function public.set_mandali_notification_level(p_mandali_id text, p_identity_id text, p_level text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_level is null or p_level not in ('ALL', 'INVITES_ONLY', 'MUTED') then
    raise exception 'INVALID_LEVEL: must be ALL, INVITES_ONLY or MUTED';
  end if;

  update public.mandali_memberships set notification_level = p_level
    where mandali_id = p_mandali_id and identity_id = p_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_identity_id;
  end if;

  return p_level;
end;
$$;

revoke all on function public.set_mandali_notification_level(text, text, text) from public, anon, authenticated;
grant execute on function public.set_mandali_notification_level(text, text, text) to service_role;

-- ── get_mandali_digests ──────────────────────────────────────────────────────
create or replace function public.get_mandali_digests(p_identity_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return coalesce((
    with mine as (
      select ms.mandali_id, ms.identity_id, ms.last_read_at, ms.notification_level
      from public.mandali_memberships ms
      where ms.identity_id = p_identity_id and ms.state = 'ACTIVE'
    ),
    unread as (
      select x.mandali_id, x.message_id, x.sender_identity_id, x.kind, x.content, x.room_code, x.metadata, x.created_at,
             row_number() over (partition by x.mandali_id order by x.created_at desc) as rn
      from mine
      join public.mandali_messages x on x.mandali_id = mine.mandali_id
       and x.created_at > mine.last_read_at
       and x.sender_identity_id <> mine.identity_id
       and x.deleted_at is null
       and x.kind in ('TEXT', 'ROOM_INVITE', 'COIN_REQUEST')
    ),
    capped as (select * from unread where rn <= 1000),
    totals as (
      select mandali_id, count(*)::integer as unread_count, count(distinct sender_identity_id)::integer as sender_count
      from capped group by mandali_id
    ),
    senders as (
      select mandali_id, sender_identity_id, count(*) as c from capped group by mandali_id, sender_identity_id
    ),
    top_senders as (
      select mandali_id,
             jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc, name) as top
      from (
        select s.mandali_id, coalesce(mm.display_name, 'Member') as name, s.c,
               row_number() over (partition by s.mandali_id order by s.c desc, mm.display_name) as rk
        from senders s
        left join public.mandali_memberships mm on mm.mandali_id = s.mandali_id and mm.identity_id = s.sender_identity_id
      ) ranked
      where rk <= 3
      group by mandali_id
    ),
    latest as (
      select c.mandali_id,
             jsonb_build_object(
               'senderName', coalesce(mm.display_name, 'Member'),
               'kind', c.kind,
               'preview', left(c.content, 120),
               'at', c.created_at
             ) as msg
      from capped c
      left join public.mandali_memberships mm on mm.mandali_id = c.mandali_id and mm.identity_id = c.sender_identity_id
      where c.rn = 1
    ),
    invites as (
      select mandali_id,
             jsonb_agg(jsonb_build_object(
               'messageId', message_id,
               'roomCode', room_code,
               'senderName', sender_name,
               'metadata', coalesce(metadata, '{}'::jsonb),
               'at', created_at
             ) order by created_at desc) as items
      from (
        select c.mandali_id, c.message_id, c.room_code, c.metadata, c.created_at,
               coalesce(mm.display_name, 'Member') as sender_name,
               row_number() over (partition by c.mandali_id order by c.created_at desc) as irk
        from capped c
        left join public.mandali_memberships mm on mm.mandali_id = c.mandali_id and mm.identity_id = c.sender_identity_id
        where c.kind = 'ROOM_INVITE'
      ) i
      where irk <= 5
      group by mandali_id
    )
    select jsonb_agg(row_data order by latest_at desc nulls last)
    from (
      select
        (l.msg ->> 'at')::timestamptz as latest_at,
        jsonb_build_object(
          'mandaliId', m.id,
          'handle', m.handle,
          'name', m.name,
          'emblem', m.emblem,
          'level', mine.notification_level,
          'lastReadAt', mine.last_read_at,
          'unreadCount', coalesce(t.unread_count, 0),
          'senderCount', coalesce(t.sender_count, 0),
          'topSenders', coalesce(ts.top, '[]'::jsonb),
          'latest', l.msg,
          'invites', coalesce(i.items, '[]'::jsonb)
        ) as row_data
      from mine
      join public.mandalis m on m.id = mine.mandali_id
      left join totals t on t.mandali_id = mine.mandali_id
      left join top_senders ts on ts.mandali_id = mine.mandali_id
      left join latest l on l.mandali_id = mine.mandali_id
      left join invites i on i.mandali_id = mine.mandali_id
    ) rows
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_mandali_digests(text) from public, anon, authenticated;
grant execute on function public.get_mandali_digests(text) to service_role;
