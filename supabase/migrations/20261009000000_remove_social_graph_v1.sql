-- Remove the Social Graph v1 tables.
--
-- The social-graph work (blocks, reports, friendship history) was taken out of the
-- product. Its three migrations (20261006 – 20261008) were deleted from this
-- folder; this one exists for databases that had already applied them, so the
-- schema goes back to what the code expects.
--
-- Safe to run on a database that never applied them: every statement is
-- `if exists`. Dropping a table removes its indexes, constraints and RLS with it.
--
-- WHAT THIS DELETES: every row in these five tables. They held only data created
-- by the removed feature (a player's block list, submitted reports, per-pair
-- play counts and milestones). Nothing else references them.
--
-- WHAT THIS DELIBERATELY LEAVES ALONE: the widened `friend_requests_status_check`
-- from 20261006 (it also allows CANCELLED and EXPIRED). The restored code only
-- writes PENDING / ACCEPTED / DECLINED, so the wider check is harmless, and
-- narrowing it would FAIL if any row already holds one of the extra statuses.

drop table if exists public.friendship_processed_matches;
drop table if exists public.friendship_milestones;
drop table if exists public.friendship_pairs;
drop table if exists public.player_reports;
drop table if exists public.player_blocks;

-- Make the API pick up the change immediately instead of on its next cache refresh.
notify pgrst, 'reload schema';
