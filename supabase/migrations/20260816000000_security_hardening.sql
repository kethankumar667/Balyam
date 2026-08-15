-- BHALYAM Security Hardening: Row Level Security & Access Control
-- Strict RLS for public.profiles, explicit DELETE policy, and locked down API roles.

-- 1. Ensure table exists with correct constraints
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_id    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint display_name_length check (display_name is null or char_length(display_name) <= 40),
  constraint avatar_id_length    check (avatar_id    is null or char_length(avatar_id)    <= 64)
);

-- 2. Force and Enable RLS
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- 3. Drop any stale / permissive policies
drop policy if exists "profiles are readable by their owner" on public.profiles;
drop policy if exists "profiles are insertable by their owner" on public.profiles;
drop policy if exists "profiles are updatable by their owner" on public.profiles;
drop policy if exists "profiles are deletable by their owner" on public.profiles;
drop policy if exists "public_profiles_select" on public.profiles;
drop policy if exists "public_profiles_insert" on public.profiles;
drop policy if exists "public_profiles_update" on public.profiles;
drop policy if exists "public_profiles_delete" on public.profiles;

-- 4. Create Strict, Isolated Owner-Only Policies (auth.uid() = id)
create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are insertable by their owner"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles are deletable by their owner"
  on public.profiles for delete
  using (auth.uid() = id);

-- 5. Privileges & Grants: Authenticated Only, No Anon/Public
revoke all on table public.profiles from public, anon;
grant select, insert, update, delete on table public.profiles to authenticated;

-- 6. Hardened Account Deletion Procedure (Security Definer)
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
    raise exception 'Unauthorized: Not signed in';
  end if;

  -- Delete from auth.users (cascades to public.profiles via foreign key)
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
