-- BHALYAM progression persistence — P0-3.
--
-- Run once (SQL Editor → paste → Run, or `supabase db push`). Re-runnable:
-- every statement is guarded, so applying it twice changes nothing.
--
-- ── What this is for ─────────────────────────────────────────────────────
-- Player progression, achievements, challenges, friends, parties, matches,
-- tournaments and seasons all lived in process-local `Map`s. A redeploy, a
-- crash, or a free-tier idle spin-down erased every one of them — including
-- the record of which rewards had already been claimed, which meant "already
-- claimed" was only true until the next restart.
--
-- ── The identity problem this schema solves first ────────────────────────
-- Not every player is an `auth.users` row. A guest gets a server-minted
-- `guest_<32 hex>` identity (server/src/auth/guestToken.ts) and is a real,
-- durable player who accumulates real progress. So the foreign key everything
-- hangs off is `player_identities.player_id text`, and `auth.users` is joined
-- to it OPTIONALLY. Hanging progression directly off `auth.users` would have
-- meant either no guest progression or a second parallel schema for guests.
--
-- ── What is deliberately NOT here ────────────────────────────────────────
-- Active room state. Rooms, seats, hands, boards and turn timers stay in
-- `RoomManager`'s memory. A room is a few minutes long, is read and written
-- many times a second by the realtime loop, and dies on purpose when the
-- process does; putting it in Postgres would add latency to every move to
-- protect state that is not worth protecting. Only the SUMMARY of a finished
-- match lands here.
--
-- Raw event timelines are also not here in full. `room_timelines` stores a
-- bounded summary with an expiry, not an unlimited append log — see §12.
--
-- ── RLS posture ──────────────────────────────────────────────────────────
-- Every table has RLS enabled AND forced. The server writes with the
-- service-role key, which bypasses RLS by design; that is what "keep
-- privileged mutations on the server" means in practice. The only policies
-- created are SELECT policies letting a signed-in player read their OWN rows,
-- so that a future direct-from-browser read is possible without a second
-- migration. There is deliberately no INSERT, UPDATE or DELETE policy for
-- `anon` or `authenticated` on any table in this file: a client cannot write
-- progression, only the server can.
--
-- Guest rows have no `auth.uid()` to match, so they are reachable only
-- through the server. That is correct and intended.

-- ═══════════════════════════ 1. Identities ═══════════════════════════

create table if not exists public.player_identities (
  -- Text, not uuid: `guest_<32 hex>` ids are not UUIDs and must not be
  -- coerced into one. The check keeps the two namespaces separable forever.
  player_id      text primary key,
  kind           text not null check (kind in ('member', 'guest')),
  -- Set for members, null for guests. `on delete cascade` makes account
  -- deletion reach progression without a checklist somebody has to remember.
  auth_user_id   uuid references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),

  constraint player_id_length check (char_length(player_id) between 1 and 128),
  -- A member row without its auth user, or a guest row with one, is a bug
  -- worth failing on rather than storing.
  constraint identity_kind_matches_auth check (
    (kind = 'member' and auth_user_id is not null) or
    (kind = 'guest'  and auth_user_id is null)
  ),
  constraint guest_id_namespace check (
    kind <> 'guest' or player_id like 'guest\_%'
  )
);

comment on table public.player_identities is
  'Every player the progression tables know about, member or guest. The one place auth.users is optional.';

create unique index if not exists player_identities_auth_user_idx
  on public.player_identities (auth_user_id)
  where auth_user_id is not null;

create index if not exists player_identities_last_seen_idx
  on public.player_identities (last_seen_at desc);

-- ═══════════════════════════ 2. Profiles ═══════════════════════════

create table if not exists public.player_profiles (
  player_id         text primary key references public.player_identities (player_id) on delete cascade,
  display_name      text not null default 'Player',
  avatar            text,
  level             integer not null default 1 check (level >= 1),
  experience_points bigint  not null default 0 check (experience_points >= 0),
  joined_at         timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint display_name_length check (char_length(display_name) <= 40),
  constraint avatar_length       check (avatar is null or char_length(avatar) <= 64)
);

comment on table public.player_profiles is
  'Name, avatar, level and lifetime XP. Level is derived from experience_points but stored so a leaderboard is one index scan.';

-- The leaderboard's ORDER BY. Without it every board read is a sort of the
-- whole table.
create index if not exists player_profiles_xp_idx
  on public.player_profiles (experience_points desc, player_id);

-- ═══════════════════════════ 3. XP ledger ═══════════════════════════

create table if not exists public.xp_ledger (
  id           bigserial primary key,
  player_id    text not null references public.player_identities (player_id) on delete cascade,
  amount       integer not null,
  reason       text not null,
  -- What caused this award: 'match', 'challenge', 'season_tier', 'manual'.
  source_kind  text not null,
  -- The id of that thing. Together with source_kind it is the idempotency key.
  source_id    text not null,
  created_at   timestamptz not null default now(),

  constraint xp_reason_length check (char_length(reason) <= 200)
);

comment on table public.xp_ledger is
  'Append-only record of every XP award. The profile total is a projection of this; the ledger is what makes a wrong total explainable rather than merely wrong.';

-- ── The idempotency constraint that matters most ───────────────────────
-- A retried request, a double-clicked button, or a client replaying an ack it
-- never saw must not award XP twice. The database refuses the second insert;
-- the application does not have to be careful, which is the point — being
-- careful is what fails under concurrency.
create unique index if not exists xp_ledger_source_idx
  on public.xp_ledger (player_id, source_kind, source_id);

create index if not exists xp_ledger_player_time_idx
  on public.xp_ledger (player_id, created_at desc);

-- ═══════════════════════════ 4. Achievements ═══════════════════════════

create table if not exists public.player_achievements (
  player_id      text not null references public.player_identities (player_id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  -- Progress toward achievements that are not yet unlocked is NOT stored: it
  -- is recomputed from stats, so a rule change re-derives it instead of
  -- leaving thousands of rows disagreeing with the new rule.
  primary key (player_id, achievement_id)
);

comment on table public.player_achievements is
  'Which achievements are unlocked, and when. Unlocks only — progress is derived.';

create index if not exists player_achievements_time_idx
  on public.player_achievements (player_id, unlocked_at desc);

-- ═══════════════════════ 5. Challenges & claims ═══════════════════════

create table if not exists public.challenge_claims (
  player_id    text not null references public.player_identities (player_id) on delete cascade,
  challenge_id text not null,
  -- Daily and weekly challenges reuse ids across periods; the period key is
  -- what makes "already claimed today" different from "already claimed ever".
  period_key   text not null,
  xp_awarded   integer not null check (xp_awarded >= 0),
  claimed_at   timestamptz not null default now(),

  primary key (player_id, challenge_id, period_key)
);

comment on table public.challenge_claims is
  'One row per claimed challenge reward. The primary key IS the idempotency guarantee — a replayed claim violates it and is refused by the database.';

create index if not exists challenge_claims_period_idx
  on public.challenge_claims (player_id, period_key);

-- ═══════════════════════════ 6. Friends ═══════════════════════════

create table if not exists public.friends (
  player_id        text not null references public.player_identities (player_id) on delete cascade,
  friend_player_id text not null references public.player_identities (player_id) on delete cascade,
  display_name     text,
  avatar           text,
  created_at       timestamptz not null default now(),

  primary key (player_id, friend_player_id),
  -- Friendship is stored as two rows, one per direction, so "my friends" is a
  -- single-column index scan. Self-friendship is a bug, not a feature.
  constraint no_self_friendship check (player_id <> friend_player_id)
);

comment on table public.friends is
  'Directed friendship edges. The application writes both directions; the constraint stops the degenerate one.';

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

-- One PENDING request per direction at a time. A partial index rather than a
-- plain unique: once a request is accepted or declined, the pair must be free
-- to start a new one.
create unique index if not exists friend_requests_pending_idx
  on public.friend_requests (sender_id, recipient_id)
  where status = 'PENDING';

create index if not exists friend_requests_recipient_idx
  on public.friend_requests (recipient_id, status, created_at desc);
create index if not exists friend_requests_sender_idx
  on public.friend_requests (sender_id, status, created_at desc);

-- ═══════════════════════ 7. Parties & invitations ═══════════════════════

create table if not exists public.parties (
  id                   text primary key,
  leader_id            text not null references public.player_identities (player_id) on delete cascade,
  max_members          integer not null default 4 check (max_members between 2 and 8),
  status               text not null default 'CREATED'
                         -- Same five values as shared/party/Party.ts. A sixth
                         -- here would be a state the application cannot read.
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
  -- Three values, matching PartyInvitationStatus. Expiry is a DELETE by the
  -- retention job below, not a fourth state nobody sets.
  status       text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at   timestamptz not null default now(),

  constraint no_self_invite check (inviter_id <> invitee_id)
);

create unique index if not exists party_invitations_pending_idx
  on public.party_invitations (party_id, invitee_id)
  where status = 'PENDING';

create index if not exists party_invitations_invitee_idx
  on public.party_invitations (invitee_id, status, created_at desc);

-- ═══════════════════════ 8. Match summaries ═══════════════════════

create table if not exists public.match_summaries (
  id                text primary key,
  room_code         text not null,
  game              text not null,
  started_at        timestamptz not null,
  finished_at       timestamptz not null,
  duration_ms       bigint not null check (duration_ms >= 0),
  winner_id         text references public.player_identities (player_id) on delete set null,
  participant_count integer not null check (participant_count >= 1),
  recorded_at       timestamptz not null default now(),

  constraint match_finishes_after_start check (finished_at >= started_at)
);

comment on table public.match_summaries is
  'One row per finished match. A SUMMARY, not a move log — the per-move timeline is bounded and expiring (see room_timelines).';

-- ── Match completion idempotency ───────────────────────────────────────
-- A room can emit its completion more than once: a host failover, a retry
-- after a dropped ack, a reconnecting client replaying the end of the match.
-- One match is one (room_code, started_at). The database refuses the second
-- write, so nobody's win count is inflated by a network hiccup.
create unique index if not exists match_summaries_natural_key_idx
  on public.match_summaries (room_code, started_at);

create index if not exists match_summaries_recent_idx
  on public.match_summaries (finished_at desc);

create table if not exists public.match_participants (
  match_id     text not null references public.match_summaries (id) on delete cascade,
  player_id    text not null references public.player_identities (player_id) on delete cascade,
  display_name text,
  avatar       text,
  is_winner    boolean not null default false,
  is_bot       boolean not null default false,
  -- NOT `placing`: that is a RESERVED keyword in PostgreSQL (it belongs to
  -- `overlay(… placing … from …)`), so an unquoted column of that name is a
  -- syntax error and this migration would not run — on Supabase either. Found
  -- by executing the file against a real PostgreSQL 17, not by reading it.
  placement    integer,

  primary key (match_id, player_id)
);

-- "My last 20 matches" — the profile screen's only query.
create index if not exists match_participants_player_idx
  on public.match_participants (player_id, match_id);

-- ═══════════════════════ 9. Tournament records ═══════════════════════

create table if not exists public.tournament_records (
  tournament_id   text not null,
  player_id       text not null references public.player_identities (player_id) on delete cascade,
  tournament_name text,
  game            text,
  placement       integer,
  status          text not null default 'REGISTERED'
                    check (status in ('REGISTERED', 'CHECKED_IN', 'ELIMINATED', 'WINNER', 'WITHDRAWN')),
  recorded_at     timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  primary key (tournament_id, player_id)
);

comment on table public.tournament_records is
  'A player''s outcome in one tournament. The composite primary key makes double registration impossible rather than merely unlikely.';

create index if not exists tournament_records_player_idx
  on public.tournament_records (player_id, recorded_at desc);

-- ═══════════════════ 10. Seasons, stats and snapshots ═══════════════════

create table if not exists public.season_stats (
  season_id        text not null,
  player_id        text not null references public.player_identities (player_id) on delete cascade,
  season_xp        bigint  not null default 0 check (season_xp >= 0),
  season_level     integer not null default 1 check (season_level >= 1),
  season_wins      integer not null default 0 check (season_wins >= 0),
  season_matches   integer not null default 0 check (season_matches >= 0),
  tournament_wins  integer not null default 0 check (tournament_wins >= 0),
  updated_at       timestamptz not null default now(),

  primary key (season_id, player_id),
  constraint wins_not_more_than_matches check (season_wins <= season_matches)
);

create index if not exists season_stats_board_idx
  on public.season_stats (season_id, season_xp desc, player_id);

create table if not exists public.season_reward_claims (
  season_id  text not null,
  player_id  text not null references public.player_identities (player_id) on delete cascade,
  tier_id    text not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  claimed_at timestamptz not null default now(),

  primary key (season_id, player_id, tier_id)
);

comment on table public.season_reward_claims is
  'One row per claimed season tier. Like challenge_claims, the primary key is the idempotency guarantee — a replayed claim is refused by the database, not by a Map that a restart empties.';

-- ── Season snapshots ───────────────────────────────────────────────────
-- A season ends and its board must stop moving. Recomputing a finished
-- season's standings from live stats gives a different answer every time
-- someone plays, so the standings are frozen into one row and read from
-- there afterwards.
create table if not exists public.season_snapshots (
  season_id   text not null,
  captured_at timestamptz not null default now(),
  reason      text not null default 'season_end',
  standings   jsonb not null,

  primary key (season_id, captured_at)
);

-- ═══════════════════════ 11. Reward audit ═══════════════════════

create table if not exists public.reward_audit (
  id              bigserial primary key,
  player_id       text not null references public.player_identities (player_id) on delete cascade,
  reward_kind     text not null check (reward_kind in ('challenge', 'season_tier', 'achievement', 'match')),
  reward_ref      text not null,
  xp_delta        integer not null default 0,
  -- The caller's idempotency key, or one derived from the reward's natural
  -- key. Unique across the whole table: two different reward kinds cannot
  -- collide, because the key includes the kind.
  idempotency_key text not null,
  outcome         text not null check (outcome in ('granted', 'duplicate', 'refused')),
  detail          text,
  created_at      timestamptz not null default now()
);

comment on table public.reward_audit is
  'Every reward decision, including the ones refused as duplicates. Answers "was this player paid twice, and if not why do they think so" without re-deriving it from application logs.';

create unique index if not exists reward_audit_idempotency_idx
  on public.reward_audit (idempotency_key)
  where outcome = 'granted';

create index if not exists reward_audit_player_idx
  on public.reward_audit (player_id, created_at desc);

-- ═══════════════ 12. Bounded timelines & telemetry, with retention ═══════

-- ── Why this is a summary and not the raw log ──────────────────────────
-- `ServerEventStore` holds every event of every room. Persisting that
-- verbatim would grow without bound and would store move-by-move records of
-- people's play sessions forever, which is both a storage problem and a data
-- protection one. What lands here is a bounded summary plus an expiry, and the
-- full timeline stays in memory where it is useful for the minutes after a
-- match and gone thereafter.
create table if not exists public.room_timelines (
  room_code    text not null,
  started_at   timestamptz not null,
  game         text not null,
  finished_at  timestamptz,
  event_count  integer not null default 0,
  -- Counts by event type and the handful of notable moments, NOT every move.
  summary      jsonb not null default '{}'::jsonb,
  expires_at   timestamptz not null default (now() + interval '30 days'),

  primary key (room_code, started_at)
);

create index if not exists room_timelines_expiry_idx on public.room_timelines (expires_at);

create table if not exists public.operational_telemetry (
  id          bigserial primary key,
  captured_at timestamptz not null default now(),
  kind        text not null,
  payload     jsonb not null,
  expires_at  timestamptz not null default (now() + interval '14 days')
);

create index if not exists operational_telemetry_expiry_idx on public.operational_telemetry (expires_at);
create index if not exists operational_telemetry_kind_idx   on public.operational_telemetry (kind, captured_at desc);

-- ── The retention job ──────────────────────────────────────────────────
-- Retention that exists only as a column nobody reads is not retention. This
-- function is the thing that actually deletes, and it returns what it deleted
-- so a scheduled run is verifiable rather than hopeful.
--
-- Schedule it with pg_cron once the extension is enabled on the project:
--   select cron.schedule('bhalyam-prune', '17 3 * * *', $$select public.prune_expired_records()$$);
-- Or call it from the server's own scheduler. Either way it must be
-- scheduled — see docs/runbooks/persistence.md.
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

  -- Requests and invitations that were never answered are noise after a
  -- month, and they hold two players' ids each.
  delete from public.friend_requests
    where status = 'PENDING' and created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  table_name := 'friend_requests'; deleted := n; return next;

  delete from public.party_invitations
    where status = 'PENDING' and created_at < now() - interval '7 days';
  get diagnostics n = row_count;
  table_name := 'party_invitations'; deleted := n; return next;

  -- A party nobody has touched in a day is not a party.
  delete from public.parties
    where status = 'DISBANDED' or updated_at < now() - interval '1 day';
  get diagnostics n = row_count;
  table_name := 'parties'; deleted := n; return next;

  return;
end;
$$;

revoke all on function public.prune_expired_records() from public, anon, authenticated;

-- ═══════════════════════ 13. RLS on every table ═══════════════════════
--
-- Enabled AND forced everywhere. The server holds the service-role key, which
-- bypasses RLS — that is how privileged mutations stay server-side. The
-- policies below grant SELECT on your OWN rows to a signed-in member, and
-- nothing else to anybody. No INSERT/UPDATE/DELETE policy exists for `anon`
-- or `authenticated` anywhere in this file.
--
-- `owns_player_row(text)` maps a progression `player_id` back to the caller's
-- auth user. Guests have no auth.uid(), so it returns false for them and their
-- rows are server-only — correct, since a guest has no Supabase session to
-- present in the first place.

create or replace function public.owns_player_row(pid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.player_identities
    where player_id = pid and auth_user_id = auth.uid()
  );
$$;

do $$
declare
  t text;
  owned_by_player_id text[] := array[
    'player_profiles', 'xp_ledger', 'player_achievements', 'challenge_claims',
    'friends', 'party_members', 'match_participants', 'tournament_records',
    'season_stats', 'season_reward_claims', 'reward_audit'
  ];
  server_only text[] := array[
    'parties', 'party_invitations', 'friend_requests', 'match_summaries',
    'season_snapshots', 'room_timelines', 'operational_telemetry',
    'player_identities'
  ];
begin
  foreach t in array (owned_by_player_id || server_only) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('drop policy if exists "own rows readable" on public.%I', t);
  end loop;

  -- Read your own progression. Nothing more.
  foreach t in array owned_by_player_id loop
    execute format(
      'create policy "own rows readable" on public.%I for select to authenticated using (public.owns_player_row(player_id))',
      t
    );
    execute format('grant select on table public.%I to authenticated', t);
  end loop;

  -- Rows with no single owner, or that describe the system rather than a
  -- player. Server-only: RLS is on, and no policy grants anyone anything, so
  -- only the service role can see them.
  foreach t in array server_only loop
    null;
  end loop;
end;
$$;

-- The leaderboard is public by product design, but `player_profiles` is not:
-- publishing the whole row would publish `last_seen_at` for everybody. A view
-- with only the board's columns is the thing that is public.
create or replace view public.leaderboard_public
with (security_invoker = false) as
  select
    p.player_id,
    p.display_name,
    p.avatar,
    p.level,
    p.experience_points
  from public.player_profiles p
  order by p.experience_points desc, p.player_id;

comment on view public.leaderboard_public is
  'The exact columns a leaderboard row shows, and no others. Definer-rights on purpose: the underlying table stays unreadable.';

grant select on public.leaderboard_public to anon, authenticated;

-- ═══════════════════════ 14. updated_at triggers ═══════════════════════

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'player_profiles', 'friend_requests', 'parties', 'tournament_records', 'season_stats'
  ] loop
    execute format('drop trigger if exists touch_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger touch_%s_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end;
$$;
