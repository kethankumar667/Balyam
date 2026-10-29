-- Removes the live-notice name lookup. Nothing else reads it, and nothing is stored, so this loses no data:
-- the server simply stops sending the notices (it skips a notice it cannot name).
drop function if exists public.referral_event_context(text);
