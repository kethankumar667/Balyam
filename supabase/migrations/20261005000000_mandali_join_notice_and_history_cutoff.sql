-- Mandali: tell the group when someone joins, and keep a newcomer out of the past.
--
-- 1. post_mandali_system_message
--    A line the SYSTEM says in the group's main chat ("Kethan joined the
--    Mandali"). It is attributed to the member it is about — the messages table
--    needs a sender, and "who this is about" is the honest one — and carries
--    kind 'SYSTEM', which the digest already leaves out of "what you missed".
--
-- 2. Join time is the start of a member's history.
--    joined_at is stamped by every join and rejoin (create_join_request and
--    decide_join_request both set it to now()), so it is the boundary: nothing
--    said before it is shown to that member. The application enforces that on
--    reads; here the digest and the read pointer honour it too, so a rejoiner
--    whose old read pointer predates their new join does not get the whole
--    previous conversation counted as "new".
--
-- Applied migrations are immutable, so the two functions below are re-created
-- (create or replace), not edited in place.

-- ── post_mandali_system_message ─────────────────────────────────────────────
create or replace function public.post_mandali_system_message(
  p_message_id text,
  p_mandali_id text,
  p_actor_identity_id text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_member public.mandali_memberships;
  v_channel public.mandali_channels;
  v_existing public.mandali_messages;
  v_message public.mandali_messages;
  v_sequence bigint;
begin
  if p_content is null or char_length(trim(p_content)) = 0 then
    raise exception 'EMPTY_MESSAGE: content cannot be empty';
  end if;

  -- Safe to repeat: the same notice is never posted twice.
  select * into v_existing from public.mandali_messages where message_id = p_message_id;
  if found then
    return jsonb_build_object('deduplicated', true, 'message', to_jsonb(v_existing));
  end if;

  select * into v_member from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_actor_identity_id;
  end if;

  -- The group's main conversation: its first open text channel.
  select * into v_channel from public.mandali_channels
    where mandali_id = p_mandali_id and type = 'TEXT' and not is_archived
    order by position asc, channel_id asc
    limit 1
    for update;
  if not found then
    raise exception 'CHANNEL_NOT_FOUND: this Mandali has no open text channel';
  end if;

  v_sequence := v_channel.next_sequence;
  update public.mandali_channels set next_sequence = next_sequence + 1 where channel_id = v_channel.channel_id;

  insert into public.mandali_messages (
    message_id, mandali_id, channel_id, sequence, sender_identity_id, sender_role, kind, content
  ) values (
    p_message_id, p_mandali_id, v_channel.channel_id, v_sequence, p_actor_identity_id, v_member.role,
    'SYSTEM', left(trim(p_content), 2000)
  )
  returning * into v_message;

  return jsonb_build_object('deduplicated', false, 'message', to_jsonb(v_message));
end;
$$;

revoke all on function public.post_mandali_system_message(text, text, text, text) from public, anon, authenticated;
grant execute on function public.post_mandali_system_message(text, text, text, text) to service_role;

-- ── mark_mandali_read ────────────────────────────────────────────────────────
-- As before, but "where you had read up to" can never be earlier than the
-- moment you joined.
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
  select greatest(last_read_at, joined_at) into v_previous from public.mandali_memberships
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

-- ── get_mandali_digests ──────────────────────────────────────────────────────
-- As before, with the read pointer clamped to the join time.
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
      select ms.mandali_id, ms.identity_id, greatest(ms.last_read_at, ms.joined_at) as last_read_at, ms.notification_level
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
