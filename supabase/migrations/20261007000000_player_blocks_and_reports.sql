-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261007000000_player_blocks_and_reports.sql
-- Description: Social Graph v1, WP1 — blocking and reporting players.
--
--   player_blocks   One row per directed block ("blocker will not be reached by,
--                   or able to reach, blocked"). Enforcement is symmetric and
--                   lives in the application; the table records who blocked
--                   whom, so only the blocker can lift it.
--   player_reports  One row per report. The reason is a fixed list, and there is
--                   deliberately no free-text column: a note about another
--                   person is personal data a report does not need. Reports are
--                   deleted after a year by the server's retention job.
--
-- Server-only, like every other table written through the service role: RLS is
-- on and forced, and no policy grants the browser anything. Both tables cascade
-- from player_identities, so erasing an account erases its blocks and reports —
-- whether it was the one blocking/reporting or the one blocked/reported.
--
-- Applied migrations are immutable; this file only adds.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════ 1. Blocks ═══════════════════════════

create table if not exists public.player_blocks (
  blocker_id text        not null references public.player_identities (player_id) on delete cascade,
  blocked_id text        not null references public.player_identities (player_id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (blocker_id, blocked_id),
  constraint player_blocks_no_self check (blocker_id <> blocked_id)
);

comment on table public.player_blocks is
  'Directed blocks. A row means blocker_id has blocked blocked_id; the application enforces it in both directions.';

-- Reverse lookups, and the cascade when a blocked account is erased.
-- (The primary key already serves "everything blocker_id has blocked".)
create index if not exists player_blocks_blocked_idx
  on public.player_blocks (blocked_id);

-- ═══════════════════════════ 2. Reports ═══════════════════════════

create table if not exists public.player_reports (
  id          text        primary key,
  reporter_id text        not null references public.player_identities (player_id) on delete cascade,
  reported_id text        not null references public.player_identities (player_id) on delete cascade,
  reason      text        not null
    check (reason in ('HARASSMENT', 'SPAM', 'CHEATING', 'INAPPROPRIATE_NAME', 'IMPERSONATION', 'OTHER')),
  created_at  timestamptz not null default now(),

  constraint player_reports_no_self check (reporter_id <> reported_id)
);

comment on table public.player_reports is
  'Player reports. Fixed reasons, no free text. Deleted after 365 days by the retention job (server/src/social/ReportRetention.ts).';

-- "A reporter's own reports, newest first".
create index if not exists player_reports_reporter_idx
  on public.player_reports (reporter_id, created_at desc);

-- The retention sweep: "everything older than the window".
create index if not exists player_reports_created_idx
  on public.player_reports (created_at);

-- Moderator lookups by the reported player, and the cascade when they are erased.
create index if not exists player_reports_reported_idx
  on public.player_reports (reported_id);

-- ═══════════════════════════ 3. Row-level security ═══════════════════════════
--
-- On AND forced, with nothing granted: the service role bypasses RLS, which is
-- how the server reads and writes; the browser gets no access at all.

alter table public.player_blocks  enable row level security;
alter table public.player_blocks  force  row level security;
alter table public.player_reports enable row level security;
alter table public.player_reports force  row level security;

revoke all on table public.player_blocks  from public, anon, authenticated;
revoke all on table public.player_reports from public, anon, authenticated;
