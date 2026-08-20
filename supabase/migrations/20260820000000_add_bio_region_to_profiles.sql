-- Migration: add bio and region to public.profiles.
--
-- Both fields were already collected in the Personal Information page, but
-- only ever written to this browser's localStorage — never to the account,
-- so they did not follow a player across devices the way display_name and
-- avatar_id already do. This closes that gap using the exact same table and
-- RLS policies (own row only, from 0001_accounts.sql) — no new policy is
-- needed, since RLS is table-level, not per-column.

alter table public.profiles
  add column if not exists bio    text,
  add column if not exists region text;

-- Matches the existing display_name/avatar_id guards from 0001_accounts.sql:
-- a length cap on free text a browser controls is cheap insurance against a
-- malformed or hostile client, not a UX limit (the client's own textarea
-- already caps input well under this). Postgres has no `ADD CONSTRAINT IF
-- NOT EXISTS`, so the existence check is done by hand to keep this file
-- re-runnable like the rest of the migrations here.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bio_length' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint bio_length check (bio is null or char_length(bio) <= 500);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'region_length' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint region_length check (region is null or char_length(region) <= 60);
  end if;
end $$;
