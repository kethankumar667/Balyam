-- Rollback for 20260901000000_economy_terminal_intents.sql
--
-- ADDITIVE-ONLY forward migration, so this rollback cleanly undoes the additions:
-- 1. Drops the 9 terminal-intent RPC functions.
-- 2. Drops the touch_economy_terminal_intents_updated_at trigger.
-- 3. Drops the economy_terminal_intents table and its indexes.
-- 4. Notifies PostgREST to reload its schema cache.
--
-- Warning: Dropping economy_terminal_intents discards all recorded terminal
-- intents. Do not run if active recovery depends on unprocessed intents.
-- Never place this in supabase/migrations/. Run manually in SQL Editor if needed.

begin;

-- ═══════════════════════ 1. Drop terminal-intent RPC functions ═══════════════

drop function if exists public.requeue_expired_terminal_intent(uuid, text, boolean);
drop function if exists public.retry_terminal_intent(uuid, text, text);
drop function if exists public.get_terminal_intent(uuid);
drop function if exists public.list_terminal_intents(text, integer, integer);
drop function if exists public.mark_terminal_intent_failed(uuid, text, text, text);
drop function if exists public.mark_terminal_intent_retryable(uuid, text, text, text, timestamptz);
drop function if exists public.complete_terminal_intent(uuid, text);
drop function if exists public.claim_terminal_intent(text, integer);
drop function if exists public.create_terminal_intent(text, text, jsonb, integer);

-- ═══════════════════════ 2. Drop trigger and table ═════════════════════════

drop trigger if exists touch_economy_terminal_intents_updated_at on public.economy_terminal_intents;
drop table if exists public.economy_terminal_intents;

-- ═══════════════════════ 3. Reload PostgREST Schema Cache ═══════════════════

notify pgrst, 'reload schema';

commit;
