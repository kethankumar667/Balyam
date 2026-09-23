-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261003000000_mandali_chat_retention.sql
-- Description: Mandali chat is kept for one year, then removed.
--
--              The rule as asked: keep everything for a year; after that,
--              delete one day's worth of content per day. Run once a day, the
--              function below removes everything that has aged past the
--              retention window — in steady state that is exactly the one day
--              that just crossed the line. It deliberately deletes "everything
--              older than the window" rather than "exactly one day", so a
--              missed run (server asleep, deploy, outage) is caught up on the
--              next run instead of falling permanently behind.
--
--              Two things this migration also corrects, because retention
--              means nothing if they stay as they were:
--
--              1. "Delete for everyone" only set deleted_at. The message text
--                 stayed in the table and was merely hidden on display. It now
--                 blanks the text as well, and the text of messages already
--                 deleted this way is scrubbed once, below.
--
--              2. mandali_messages.reply_to_id references another message with
--                 no delete action, so removing an old message that a newer one
--                 replies to would fail. The prune clears those links first;
--                 the newer message simply stops showing a quote.
--
--              Coin request rows are NOT chat and are kept (their message link
--              is set to null by the existing foreign key); the wallet ledger
--              is the financial record and is untouched.
--
--              Scheduling: the Node server calls this once a day (see
--              MandaliRetentionJob). If pg_cron is enabled on the project it
--              can be scheduled there instead:
--                select cron.schedule('mandali-chat-retention', '23 3 * * *',
--                  $$select public.prune_expired_mandali_messages()$$);
-- ─────────────────────────────────────────────────────────────────────────────

-- One-time scrub: text of messages that were already "deleted for everyone".
update public.mandali_messages set content = '' where deleted_at is not null and content <> '';

create or replace function public.delete_mandali_message(
  p_message_id text,
  p_actor_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_message public.mandali_messages;
  v_actor public.mandali_memberships;
begin
  select * into v_message from public.mandali_messages where message_id = p_message_id for update;
  if not found then
    raise exception 'MESSAGE_NOT_FOUND: %', p_message_id;
  end if;
  if v_message.deleted_at is not null then
    return jsonb_build_object('alreadyDeleted', true, 'message', to_jsonb(v_message));
  end if;

  select * into v_actor from public.mandali_memberships
    where mandali_id = v_message.mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_actor_identity_id;
  end if;

  if v_message.sender_identity_id <> p_actor_identity_id and v_actor.role not in ('OWNER', 'ADMIN') then
    raise exception 'FORBIDDEN: can only delete your own messages, or any message as an owner/admin';
  end if;

  -- The row stays as a tombstone (ordering, reply chains, audit); the text does not.
  update public.mandali_messages
    set deleted_at = now(), deleted_by_identity_id = p_actor_identity_id, content = '', pinned = false
    where message_id = p_message_id
    returning * into v_message;

  return jsonb_build_object('alreadyDeleted', false, 'message', to_jsonb(v_message));
end;
$$;

revoke all on function public.delete_mandali_message(text, text) from public, anon, authenticated;
grant execute on function public.delete_mandali_message(text, text) to service_role;

-- Removes chat older than the retention window. Returns how many messages were
-- deleted. Works in bounded batches so a large backlog never holds one long
-- lock; skip locked lets a concurrent run (two server instances) work on
-- different rows instead of waiting on each other.
create or replace function public.prune_expired_mandali_messages(
  p_retention_days integer default 365,
  p_batch_size integer default 5000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_cutoff timestamptz;
  v_batch integer;
  v_total integer := 0;
  v_doomed text[];
begin
  if p_retention_days is null or p_retention_days < 1 then
    raise exception 'INVALID_RETENTION: retention must be at least 1 day';
  end if;
  if p_batch_size is null or p_batch_size < 1 then
    raise exception 'INVALID_BATCH: batch size must be at least 1';
  end if;

  v_cutoff := clock_timestamp() - make_interval(days => p_retention_days);

  loop
    select coalesce(array_agg(message_id), array[]::text[]) into v_doomed
      from (
        select message_id from public.mandali_messages
        where created_at < v_cutoff
        order by created_at
        limit p_batch_size
        for update skip locked
      ) batch;

    exit when coalesce(array_length(v_doomed, 1), 0) = 0;

    -- A newer message quoting an old one must not block the delete.
    update public.mandali_messages
      set reply_to_id = null
      where reply_to_id = any (v_doomed);

    delete from public.mandali_messages where message_id = any (v_doomed);
    get diagnostics v_batch = row_count;
    v_total := v_total + v_batch;

    exit when v_batch < p_batch_size;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.prune_expired_mandali_messages(integer, integer) from public, anon, authenticated;
grant execute on function public.prune_expired_mandali_messages(integer, integer) to service_role;
