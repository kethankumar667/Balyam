-- Account records, shared by every device. New tables only; no legacy device data is imported.
BEGIN;

CREATE TABLE public.player_scorecard_archives (
  player_id text PRIMARY KEY REFERENCES public.player_identities(player_id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  archive jsonb
);

CREATE TABLE public.player_scorecard_receipts (
  player_id text NOT NULL REFERENCES public.player_scorecard_archives(player_id) ON DELETE CASCADE,
  event_key text NOT NULL,
  result jsonb NOT NULL,
  PRIMARY KEY (player_id, event_key)
);

ALTER TABLE public.player_scorecard_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_scorecard_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_scorecard_archives, public.player_scorecard_receipts FROM anon, authenticated;
GRANT ALL ON public.player_scorecard_archives, public.player_scorecard_receipts TO service_role;

-- The archive and its idempotency receipt commit together. A revision conflict causes the server
-- to read the winning archive and recompute, so two devices cannot overwrite each other's best.
CREATE FUNCTION public.commit_player_scorecard(
  p_player_id text, p_expected_revision bigint, p_event_key text, p_archive jsonb, p_result jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  current_revision bigint;
  previous_result jsonb;
BEGIN
  IF p_archive->>'playerId' IS DISTINCT FROM p_player_id THEN
    RAISE EXCEPTION 'Scorecard identity mismatch';
  END IF;
  INSERT INTO public.player_scorecard_archives(player_id) VALUES (p_player_id)
    ON CONFLICT (player_id) DO NOTHING;
  SELECT revision INTO current_revision FROM public.player_scorecard_archives
    WHERE player_id = p_player_id FOR UPDATE;
  SELECT result INTO previous_result FROM public.player_scorecard_receipts
    WHERE player_id = p_player_id AND event_key = p_event_key;
  IF FOUND THEN
    RETURN jsonb_build_object('committed', true, 'result', previous_result);
  END IF;
  IF current_revision <> p_expected_revision THEN
    RETURN jsonb_build_object('committed', false);
  END IF;
  UPDATE public.player_scorecard_archives SET archive = p_archive, revision = revision + 1
    WHERE player_id = p_player_id;
  INSERT INTO public.player_scorecard_receipts(player_id, event_key, result)
    VALUES (p_player_id, p_event_key, p_result);
  RETURN jsonb_build_object('committed', true, 'result', p_result);
END;
$$;

REVOKE ALL ON FUNCTION public.commit_player_scorecard(text, bigint, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_player_scorecard(text, bigint, text, jsonb, jsonb) TO service_role;
COMMIT;
