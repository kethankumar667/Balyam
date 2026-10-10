-- Undo 20261021000000_email_uniqueness_guard.sql.
--
-- Removes the trigger first so signups stop being checked, then the functions and the two
-- tables. Accounts are untouched: this only forgets which mailbox each one claimed, so after
-- it a look-alike address can register again. Safe to run twice.

drop trigger if exists guard_account_email on auth.users;
drop function if exists public.guard_account_email();
drop table if exists public.account_emails;
drop table if exists public.blocked_email_domains;
drop function if exists public.canonical_email(text);
