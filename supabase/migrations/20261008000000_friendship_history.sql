-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261008000000_friendship_history.sql
-- Description: Social Graph v1, WP5 — what each pair of players has shared.
--
--   friendship_pairs             One row per pair who ever finished a match
--                                together: how many matches, wins and
--                                tournaments, the first and last match, and the
--                                daily streak. Recorded for ANY two verified
--                                players, friends or not, so the history is
--                                already there the day they become friends; the
--                                server only ever SHOWS it to the two friends.
--   friendship_milestones        The moments worth marking (became friends, first
--                                match, tenth match…). One row per kind per pair.
--   friendship_processed_matches One row per match already counted. The primary
--                                key is what stops a replayed match — a host
--                                failover, a retry, a restart — from being
--                                counted twice, across processes and restarts.
--
-- Server-only, like every table written through the service role: RLS on and
-- forced, nothing granted to the browser. Both player columns cascade from
-- player_identities, so erasing an account erases its shared history.
--
-- Applied migrations are immutable; this file only adds.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════ 1. Pairs ═══════════════════════════
--
-- A pair is stored ONCE, smaller id first, so (a, b) and (b, a) are one row.
-- The order check names the "C" collation on purpose: the server orders ids by
-- byte value, and a database whose default collation is locale-aware (as most
-- are) would otherwise disagree with it about which id is "smaller" — and
-- refuse rows the server considers correctly ordered.

create table if not exists public.friendship_pairs (
  player_low           text        not null references public.player_identities (player_id) on delete cascade,
  player_high          text        not null references public.player_identities (player_id) on delete cascade,
  matches_together     integer     not null default 0 check (matches_together >= 0),
  wins_together        integer     not null default 0 check (wins_together >= 0),
  tournaments_together integer     not null default 0 check (tournaments_together >= 0),
  first_match_at       timestamptz,
  last_match_at        timestamptz,
  current_daily_streak integer     not null default 0 check (current_daily_streak >= 0),
  best_daily_streak    integer     not null default 0 check (best_daily_streak >= 0),
  -- The IST calendar day the streak last advanced on. A DATE, not a timestamp:
  -- a streak is counted in whole IST days, and the server decides which day.
  streak_last_day      date,

  primary key (player_low, player_high),
  constraint friendship_pairs_ordered
    check (player_low collate "C" < player_high collate "C"),
  -- Wins and tournaments are matches, so neither can outnumber them; and the
  -- best streak is by definition at least the current one.
  constraint friendship_pairs_wins_within_matches check (wins_together <= matches_together),
  constraint friendship_pairs_tournaments_within_matches check (tournaments_together <= matches_together),
  constraint friendship_pairs_best_streak check (best_daily_streak >= current_daily_streak)
);

comment on table public.friendship_pairs is
  'Shared match history per pair of players (smaller id first). Recorded for any two verified players; shown only to the two friends.';

-- "Everything involving this player" from the high side, and the cascade when
-- an account is erased. (The primary key already serves the low side.)
create index if not exists friendship_pairs_high_idx
  on public.friendship_pairs (player_high);

-- ═══════════════════════════ 2. Milestones ═══════════════════════════

create table if not exists public.friendship_milestones (
  player_low  text        not null references public.player_identities (player_id) on delete cascade,
  player_high text        not null references public.player_identities (player_id) on delete cascade,
  -- The closed list mirrors shared/social/Friendship.ts. Nothing here is user text.
  kind        text        not null
    check (kind in (
      'FRIENDS_SINCE', 'FIRST_MATCH', 'FIRST_WIN',
      'MATCHES_10', 'MATCHES_50', 'MATCHES_100', 'MATCHES_500', 'MATCHES_1000',
      'FIRST_TOURNAMENT'
    )),
  reached_at  timestamptz not null,
  -- The match that reached it. Null for FRIENDS_SINCE, which no match causes.
  match_id    text,

  -- One row per kind per pair: a milestone is reached once.
  primary key (player_low, player_high, kind),
  constraint friendship_milestones_ordered
    check (player_low collate "C" < player_high collate "C")
);

comment on table public.friendship_milestones is
  'The moments worth marking in a friendship. One row per kind per pair; the kind list is closed.';

create index if not exists friendship_milestones_high_idx
  on public.friendship_milestones (player_high);

-- ═══════════════════════════ 3. Matches already counted ═══════════════════════════
--
-- The idempotency guard. The server INSERTs a match id here first; if the row
-- is new the match is counted, and if it already existed nothing is. It holds
-- no personal data (a match id is a room code and a start time) and grows by one
-- small row per finished match.

create table if not exists public.friendship_processed_matches (
  match_id     text        primary key,
  processed_at timestamptz not null default now()
);

comment on table public.friendship_processed_matches is
  'Matches already counted toward friendship_pairs. The primary key makes counting a match idempotent.';

-- ═══════════════════════════ 4. Row-level security ═══════════════════════════
--
-- On AND forced, with nothing granted: the service role bypasses RLS, which is
-- how the server reads and writes; the browser gets no access at all.

alter table public.friendship_pairs             enable row level security;
alter table public.friendship_pairs             force  row level security;
alter table public.friendship_milestones        enable row level security;
alter table public.friendship_milestones        force  row level security;
alter table public.friendship_processed_matches enable row level security;
alter table public.friendship_processed_matches force  row level security;

revoke all on table public.friendship_pairs             from public, anon, authenticated;
revoke all on table public.friendship_milestones        from public, anon, authenticated;
revoke all on table public.friendship_processed_matches from public, anon, authenticated;
