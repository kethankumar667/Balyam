-- Roll the application back FIRST. This intentionally deletes the new account record archive.
BEGIN;
DROP FUNCTION IF EXISTS public.commit_player_scorecard(text, bigint, text, jsonb, jsonb);
DROP TABLE IF EXISTS public.player_scorecard_receipts;
DROP TABLE IF EXISTS public.player_scorecard_archives;
COMMIT;
