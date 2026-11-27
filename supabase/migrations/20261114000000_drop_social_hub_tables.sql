-- Drop the tables of the removed Social Hub: friend requests and parties.
--
-- The Social Hub (the /social page, /api/social and /api/parties) was removed from the
-- product on 2026-11-27. Its server code, and the repository methods that wrote these four
-- tables, are gone. This migration removes the tables themselves.
--
-- ORDER OF DEPLOY: ship the server build that no longer touches these tables FIRST, then apply
-- this. The old server still read `parties` and `friend_requests` at boot (`hydrateProgression`),
-- so dropping them under it would stop it from starting.
--
-- WHAT THIS DELETES: every row in `friend_requests`, `parties`, `party_members` and
-- `party_invitations`. They held only what the removed feature created (a sender and
-- recipient id with display names and avatars, party membership, party invitations).
-- Nothing else references them. The rows are NOT recoverable from the rollback file, which
-- puts back the empty tables only.
--
-- WHAT THIS REPLACES: `prune_expired_records()`, the daily retention job. Its body deleted
-- from three of these tables, so leaving it alone would make it fail at the first of those
-- statements and roll back the retention of `room_timelines` and `operational_telemetry`
-- with it. The replacement keeps those two deletes and returns the same shape.
--
-- WHAT THIS DELIBERATELY LEAVES ALONE:
--   * `public.friends`. The leaderboard's own friend list (Recent Opponents) still reads and
--     writes it; the Social Hub never owned it alone.
--   * The `friend_requests` branch inside `admin_player_records` (20261101000000). The admin
--     console no longer asks for that section, so the branch is unreachable; editing an
--     applied function to remove a dead branch is not worth the risk to the other sections.
--   * Every earlier migration. Applied migrations are never edited.
--
-- Safe to run on a database that never had the tables: every drop is `if exists`. Dropping a
-- table removes its indexes, constraints, triggers and RLS policies with it.

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

  return;
end;
$$;

revoke all on function public.prune_expired_records() from public, anon, authenticated;

-- Children first: party_members and party_invitations reference parties.
drop table if exists public.party_invitations;
drop table if exists public.party_members;
drop table if exists public.parties;
drop table if exists public.friend_requests;

-- Make the API pick up the change immediately instead of on its next cache refresh.
notify pgrst, 'reload schema';
