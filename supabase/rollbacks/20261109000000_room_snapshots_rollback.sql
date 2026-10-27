-- Destructive: drain active tables and preserve recovery snapshots first.
-- Never run while a server uses ROOM_SNAPSHOT_STORE=supabase.
BEGIN;
DROP FUNCTION IF EXISTS public.probe_room_snapshot_store();
DROP FUNCTION IF EXISTS public.purge_room_snapshots(bigint, bigint);
DROP TABLE IF EXISTS public.room_snapshots;
NOTIFY pgrst, 'reload schema';
COMMIT;
