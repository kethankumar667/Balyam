-- Drop the tournament records table.
--
-- Tournaments (the /tournaments page, /api/tournaments and the bracket engine) were removed from the product
-- on 2026-11-27. `tournament_records` held one row per player per tournament (registered, checked in, winner,
-- eliminated). The only code that wrote it is gone.
--
-- ORDER OF DEPLOY: ship the server build without the tournament code FIRST, then apply this. The old server
-- still wrote this table on registration and on a finished bracket, so dropping it under that server would make
-- those writes fail in the background sync queue.
--
-- WHAT THIS DELETES: every row of `tournament_records` (a player id, a tournament id and name, a game, a
-- placement, a status). The only tournaments that ever existed were three demo cups seeded at boot, and no
-- bracket could be played. The rows are NOT recoverable from the rollback file, which puts back the empty table.
--
-- WHAT THIS DELIBERATELY LEAVES ALONE:
--   * `season_stats.tournament_wins`. Seasons are a separate, dormant feature that is kept; the column stays so
--     the season code keeps reading and writing the shape it always did.
--   * The `'TOURNAMENT'` value in the reward-source CHECK constraints (20261012, 20261020, 20261025). Those are
--     deployed constraints on rows that may already hold the value; narrowing them could fail, and an applied
--     migration is never edited.
--   * Every earlier migration.
--
-- Safe to run on a database that never had the table: the drop is `if exists`. Dropping a table removes its
-- index, constraints, its `updated_at` trigger and its RLS policies with it.

drop table if exists public.tournament_records;

-- Make the API pick up the change immediately instead of on its next cache refresh.
notify pgrst, 'reload schema';
