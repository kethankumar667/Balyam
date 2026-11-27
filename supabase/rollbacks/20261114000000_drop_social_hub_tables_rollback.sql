-- Rollback of 20261114000000_drop_social_hub_tables.sql.
--
-- Puts back the four EMPTY tables, with the shape, indexes, row-level security and
-- `updated_at` triggers they had in 20260818000000, and the original
-- `prune_expired_records()` that also pruned them. It cannot bring back the rows the
-- migration deleted; restore those from a backup taken before the migration if they matter.
--
-- Use it only together with a server build that still has the Social Hub code. The current
-- server never reads or writes these tables.

create table if not exists public.friend_requests (
  id            text primary key,
  sender_id     text not null references public.player_identities (player_id) on delete cascade,
  recipient_id  text not null references public.player_identities (player_id) on delete cascade,
  sender_name   text,
  sender_avatar text,
  status        text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint no_self_request check (sender_id <> recipient_id)
);

comment on table public.friend_requests is
  'Friend requests in every state. Historic rows are kept so an accept cannot be replayed as if it were new.';

create unique index if not exists friend_requests_pending_idx
  on public.friend_requests (sender_id, recipient_id)
  where status = 'PENDING';
create index if not exists friend_requests_recipient_idx
  on public.friend_requests (recipient_id, status, created_at desc);
create index if not exists friend_requests_sender_idx
  on public.friend_requests (sender_id, status, created_at desc);

create table if not exists public.parties (
  id                   text primary key,
  leader_id            text not null references public.player_identities (player_id) on delete cascade,
  max_members          integer not null default 4 check (max_members between 2 and 8),
  status               text not null default 'CREATED'
                         check (status in ('CREATED', 'INVITING', 'READY', 'IN_MATCH', 'DISBANDED')),
  target_game          text,
  target_room_code     text,
  target_tournament_id text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.party_members (
  party_id   text not null references public.parties (id) on delete cascade,
  player_id  text not null references public.player_identities (player_id) on delete cascade,
  display_name text,
  avatar     text,
  is_leader  boolean not null default false,
  is_ready   boolean not null default false,
  joined_at  timestamptz not null default now(),

  primary key (party_id, player_id)
);

comment on table public.party_members is
  'Who is in which party. The unique index below is the rule "one party at a time", enforced by the database rather than by a Map the application hopes it kept in step.';

create unique index if not exists party_members_one_party_idx
  on public.party_members (player_id);
create index if not exists parties_leader_idx on public.parties (leader_id);

create table if not exists public.party_invitations (
  id           text primary key,
  party_id     text not null references public.parties (id) on delete cascade,
  inviter_id   text not null references public.player_identities (player_id) on delete cascade,
  invitee_id   text not null references public.player_identities (player_id) on delete cascade,
  inviter_name text,
  status       text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at   timestamptz not null default now(),

  constraint no_self_invite check (inviter_id <> invitee_id)
);

create unique index if not exists party_invitations_pending_idx
  on public.party_invitations (party_id, invitee_id)
  where status = 'PENDING';
create index if not exists party_invitations_invitee_idx
  on public.party_invitations (invitee_id, status, created_at desc);

-- Row-level security, as in 20260818000000: enabled and forced everywhere, nothing readable
-- by anon, and a member may read only their own party membership.
do $$
declare
  t text;
begin
  foreach t in array array['party_members', 'parties', 'party_invitations', 'friend_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

drop policy if exists "own rows readable" on public.party_members;
create policy "own rows readable" on public.party_members
  for select to authenticated using (public.owns_player_row(player_id));
grant select on table public.party_members to authenticated;

drop trigger if exists touch_friend_requests_updated_at on public.friend_requests;
create trigger touch_friend_requests_updated_at before update on public.friend_requests
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_parties_updated_at on public.parties;
create trigger touch_parties_updated_at before update on public.parties
  for each row execute function public.touch_updated_at();

create or replace function public.prune_expired_records()
returns table (table_name text, deleted bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  delete from public.room_timelines where expires_at < now();
  get diagnostics n = row_count;
  table_name := 'room_timelines'; deleted := n; return next;

  delete from public.operational_telemetry where expires_at < now();
  get diagnostics n = row_count;
  table_name := 'operational_telemetry'; deleted := n; return next;

  delete from public.friend_requests
    where status = 'PENDING' and created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  table_name := 'friend_requests'; deleted := n; return next;

  delete from public.party_invitations
    where status = 'PENDING' and created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  table_name := 'party_invitations'; deleted := n; return next;

  delete from public.parties
    where status = 'DISBANDED' or updated_at < now() - interval '1 day';
  get diagnostics n = row_count;
  table_name := 'parties'; deleted := n; return next;

  return;
end;
$$;

revoke all on function public.prune_expired_records() from public, anon, authenticated;

notify pgrst, 'reload schema';
