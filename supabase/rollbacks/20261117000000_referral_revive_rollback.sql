-- Rollback of 20261117000000_referral_revive.sql.
--
-- Removes the revive function and the `revived_at` column, and puts back the original 720-hour limit on
-- `expires_at`. A friend whose window was revived has an `expires_at` beyond that limit, so those rows are first
-- set back to `accepted_at + 720 hours`: they show as expired again (or stay qualified, which is unchanged).
-- That resets only the displayed window; it does not undo a qualification that the revive made possible.

drop function if exists public.referral_revive(text, int);

alter table public.referral_attributions
  drop constraint if exists referral_attributions_window_check;

update public.referral_attributions
   set expires_at = accepted_at + interval '720 hours'
 where expires_at > accepted_at + interval '720 hours';

alter table public.referral_attributions
  add constraint referral_attributions_window_720h_check
  check (expires_at > accepted_at and expires_at <= accepted_at + interval '720 hours');

alter table public.referral_attributions
  drop column if exists revived_at;

notify pgrst, 'reload schema';
