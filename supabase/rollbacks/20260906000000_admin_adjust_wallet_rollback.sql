-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback: 20260906000000_admin_adjust_wallet_rollback.sql
-- Description: Drops public.admin_adjust_wallet(text, bigint, text, text, text).
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.admin_adjust_wallet(text, bigint, text, text, text);
