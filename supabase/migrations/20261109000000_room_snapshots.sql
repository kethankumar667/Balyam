-- Recovery snapshots include private hands and player data: server access only.
BEGIN;

CREATE TABLE public.room_snapshots (
  code text PRIMARY KEY,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  saved_at bigint NOT NULL CHECK (saved_at >= 0),
  expires_at bigint NOT NULL CHECK (expires_at > saved_at)
);
CREATE INDEX room_snapshots_expiry_idx ON public.room_snapshots (expires_at);

ALTER TABLE public.room_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_snapshots FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.room_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.room_snapshots TO service_role;

-- A single transaction verifies writes, read-back and deletion. The temporary
-- row is never visible to another request and cannot be hydrated as a room.
CREATE FUNCTION public.probe_room_snapshot_store()
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_code text := '__probe__' || gen_random_uuid()::text;
  v_now bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_ready boolean;
BEGIN
  INSERT INTO public.room_snapshots VALUES (v_code, '{"probe":true}'::jsonb, v_now, v_now + 60000);
  SELECT snapshot = '{"probe":true}'::jsonb INTO v_ready FROM public.room_snapshots WHERE code = v_code;
  DELETE FROM public.room_snapshots WHERE code = v_code;
  RETURN coalesce(v_ready, false);
END;
$$;

CREATE FUNCTION public.purge_room_snapshots(p_now_ms bigint, p_max_age_ms bigint DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_now_ms IS NULL OR p_now_ms < 0 OR p_max_age_ms < 0 THEN
    RAISE EXCEPTION 'Invalid room snapshot retention bounds';
  END IF;
  DELETE FROM public.room_snapshots
    WHERE expires_at < p_now_ms
       OR (p_max_age_ms IS NOT NULL AND saved_at < p_now_ms - p_max_age_ms);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.probe_room_snapshot_store() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_room_snapshots(bigint, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.probe_room_snapshot_store() TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_room_snapshots(bigint, bigint) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
