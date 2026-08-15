-- BHALYAM accounts, phase 1: a profile per player, and a way to erase one.
--
-- Run this once against a new Supabase project (SQL Editor → paste → Run, or
-- `supabase db push` if you use the CLI). It is written to be re-runnable:
-- every statement is guarded, so applying it twice changes nothing.
--
-- ── Scope, and what is deliberately absent ───────────────────────────────
-- Display name and avatar. That is all. Match history is NOT here, because
-- the ten game engines end in genuinely different shapes and the outcome
-- table that unified them would be guesswork today — see
-- docs/runbooks/supabase.md for what a second migration would have to settle
-- first. A table nobody can fill correctly is worse than no table.
--
-- ── Why every policy names auth.uid() ────────────────────────────────────
-- The browser holds the anon key, which is public by design: it identifies
-- the project, it does not authorise anything. Row Level Security is the only
-- thing standing between one player's row and another's, so a table without
-- it is readable by everybody who can read the JavaScript bundle. RLS is
-- enabled before the first row can exist.

-- ─────────────────────────── profiles ───────────────────────────

create table if not exists public.profiles (
  -- Same id as the auth user, and gone when they are. `on delete cascade` is
  -- what makes account deletion a single statement rather than a checklist
  -- somebody has to remember.
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_id    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A name long enough to be a paragraph is either a mistake or an attack on
  -- everyone else's seat labels. Matches the client's own validation.
  constraint display_name_length check (display_name is null or char_length(display_name) <= 40),
  constraint avatar_id_length    check (avatar_id    is null or char_length(avatar_id)    <= 64)
);

comment on table public.profiles is
  'Player display name and avatar, so they follow the account rather than the browser.';

alter table public.profiles enable row level security;

-- Own row only, for all three verbs. No policy grants anyone sight of another
-- player's row: names reach other players through the game server, which
-- already sends only what a table needs to show.
drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are insertable by their owner" on public.profiles;
create policy "profiles are insertable by their owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────── a row appears with the account ───────────────────

-- Without this, the first profile write is an insert from a browser that has
-- just signed up and may not come back for days. The trigger means the row
-- exists from the moment the account does, named from the signup form.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Explicit search_path: a `security definer` function that inherits the
-- caller's path can be pointed at a shadow `public` schema by anyone able to
-- create one. This is the standard hardening for the pattern, not paranoia.
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_id)
  values (
    new.id,
    -- `display_name` is what our signup form sends; `full_name` and `name`
    -- are what Google returns. Taking whichever exists means an OAuth player
    -- is not "Player 3" on their first table.
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_id'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────── keep updated_at honest ─────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────── erasure: DPDP Section 12, the server half ─────────────

-- Deleting a user normally needs the service-role key, and a service-role key
-- in a browser bundle is a full database bypass handed to everyone who opens
-- devtools. So instead: one `security definer` function that deletes exactly
-- `auth.uid()` — the caller, and nobody else — with no argument to get wrong.
--
-- The profile row follows via the cascade above. Sessions die with the user.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
