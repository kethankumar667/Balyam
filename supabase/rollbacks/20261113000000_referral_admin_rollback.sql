-- Removes the referral operator console's database functions. The audit log table is KEPT on purpose: it is the
-- record of who changed the campaign and who withdrew a bonus, and a rollback must not erase evidence.
-- Campaign settings already changed through the console stay as they are; to put them back, run the bonus rollback
-- (supabase/rollbacks/20261111000000_referral_bonus_rollback.sql) or update `referral_campaign` by hand.
drop function if exists public.referral_admin_events_list(int);
drop function if exists public.referral_admin_log(text, text, jsonb, text);
drop function if exists public.referral_admin_set_campaign(text, text, jsonb);
drop function if exists public.referral_admin_pending_rewards(int);
drop function if exists public.referral_admin_overview();
drop function if exists public.referral_admin_campaign_json(public.referral_campaign);
