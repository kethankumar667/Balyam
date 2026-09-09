-- BHALYAM 30-Day Daily Login Streak & Rewards System Migration
-- Migration: 20260915000000_login_streaks.sql
--
-- ── Purpose ─────────────────────────────────────────────────────────────
-- Provides server-authoritative persistence for player login streaks,
-- milestone progress, claim history, and protection shields across sessions.
--
-- ── Identity Architecture ────────────────────────────────────────────────
-- References `public.player_identities(player_id)` directly, supporting both
-- authenticated Supabase members and signed durable guest identities.

create table if not exists public.login_streaks (
  player_id         text primary key references public.player_identities (player_id) on delete cascade,
  current_streak    integer not null default 0 check (current_streak >= 0),
  longest_streak    integer not null default 0 check (longest_streak >= 0),
  cycle_count       integer not null default 0 check (cycle_count >= 0),
  last_claimed_date date,
  last_claimed_at   timestamptz,
  shields_remaining integer not null default 0 check (shields_remaining >= 0),
  claim_history     jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.login_streaks is
  'Tracks authoritative 30-day daily login streak progression, claim dates, and cycle statistics.';

comment on column public.login_streaks.current_streak is
  'Current consecutive login streak count (1..30 in active cycle, resets to 1 if missed without shield).';

comment on column public.login_streaks.last_claimed_date is
  'UTC calendar date (YYYY-MM-DD) on which the latest streak reward was claimed.';

comment on column public.login_streaks.claim_history is
  'Append-only JSON array of recent claim events for audit, idempotency, and history inspection.';

create index if not exists login_streaks_last_claimed_date_idx
  on public.login_streaks (last_claimed_date desc);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.login_streaks enable row level security;
alter table public.login_streaks force row level security;

-- Members can inspect their own streak status
create policy "Players can view own login streak"
  on public.login_streaks
  for select
  using (
    player_id = auth.uid()::text or
    player_id in (select player_id from public.player_identities where auth_user_id = auth.uid())
  );

-- All mutations (streak claims, rewards, shield consumption) are executed exclusively
-- by the server engine using the elevated service-role key.
