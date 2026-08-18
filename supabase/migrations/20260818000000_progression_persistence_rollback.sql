-- Rollback for 20260818000000_progression_persistence.sql
--
-- DESTRUCTIVE. This drops the progression tables and everything in them. It
-- exists so the migration is reversible in the sense that matters — the schema
-- can be removed — not so that anyone runs it casually on a database with real
-- progression in it.
--
-- Take a backup first. On Supabase: Database → Backups, or
--   pg_dump --schema=public --table='player_*' --table='season_*' … > backup.sql
--
-- Order matters: children before parents, because the foreign keys are real.

begin;

drop view if exists public.leaderboard_public;

/*
 * Functions are dropped AFTER the tables, not before.
 *
 * `owns_player_row(text)` is referenced by the RLS policy on every owned
 * table, and Postgres refuses to drop a function those policies still depend
 * on:
 *
 *   ERROR: cannot drop function owns_player_row(text) because other objects
 *          depend on it
 *
 * The first version of this file dropped it first and failed there, aborting
 * the transaction and leaving every table in place — a rollback script that
 * did not roll back. Found by running it against a real PostgreSQL 17, not by
 * reading it. Dropping the tables first removes their policies, which removes
 * the dependency.
 */

do $$
declare
  t text;
begin
  foreach t in array array[
    'player_profiles', 'friend_requests', 'parties', 'tournament_records', 'season_stats'
  ] loop
    execute format('drop trigger if exists touch_%s_updated_at on public.%I', t, t);
  end loop;
end;
$$;

-- Leaves, then trunks.
drop table if exists public.operational_telemetry;
drop table if exists public.room_timelines;
drop table if exists public.reward_audit;
drop table if exists public.season_snapshots;
drop table if exists public.season_reward_claims;
drop table if exists public.season_stats;
drop table if exists public.tournament_records;
drop table if exists public.match_participants;
drop table if exists public.match_summaries;
drop table if exists public.party_invitations;
drop table if exists public.party_members;
drop table if exists public.parties;
drop table if exists public.friend_requests;
drop table if exists public.friends;
drop table if exists public.challenge_claims;
drop table if exists public.player_achievements;
drop table if exists public.xp_ledger;
drop table if exists public.player_profiles;
drop table if exists public.player_identities;

-- Now that no policy references them.
drop function if exists public.prune_expired_records();
drop function if exists public.owns_player_row(text);
drop function if exists public.touch_updated_at();

commit;

-- `public.profiles` from 0001_accounts.sql is deliberately untouched: it
-- predates this migration, holds the signed-in display name and avatar, and is
-- read by the client directly.
