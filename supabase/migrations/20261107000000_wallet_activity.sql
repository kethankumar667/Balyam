BEGIN;

CREATE FUNCTION public.wallet_activity_30_days(p_wallet_id text, p_now timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp SET timezone = 'UTC' AS $$
  WITH days AS (
    SELECT day FROM generate_series(
      date_trunc('day', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - interval '29 days',
      date_trunc('day', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
      interval '1 day'
    ) AS day
  )
  SELECT jsonb_agg(jsonb_build_object(
    'date', to_char(day AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
    'credited', coalesce(t.credited, 0)::text,
    'spent', coalesce(t.spent, 0)::text,
    'balance', coalesce(b.balance_after, 0)::text
  ) ORDER BY day)
  FROM days
  LEFT JOIN LATERAL (
    SELECT sum(greatest(amount, 0)) AS credited, sum(greatest(-amount, 0)) AS spent
    FROM public.coin_ledger_entries
    WHERE wallet_id = p_wallet_id AND created_at >= day
      AND created_at < day + interval '1 day' AND created_at <= p_now
  ) t ON true
  LEFT JOIN LATERAL (
    SELECT balance_after FROM public.coin_ledger_entries
    WHERE wallet_id = p_wallet_id AND created_at < day + interval '1 day' AND created_at <= p_now
    ORDER BY created_at DESC, id DESC LIMIT 1
  ) b ON true;
$$;

REVOKE ALL ON FUNCTION public.wallet_activity_30_days(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_activity_30_days(text, timestamptz) TO service_role;
COMMIT;
