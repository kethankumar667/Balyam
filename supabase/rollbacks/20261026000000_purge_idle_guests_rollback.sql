-- Rollback for 20261026000000_purge_idle_guests.sql.
--
-- Drops the purge function. It deletes nothing itself: guests already purged stay purged (they were
-- idle and had played nothing), and the server job simply logs that the function is missing.

drop function if exists public.purge_idle_guests(integer, integer);
