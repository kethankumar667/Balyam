-- BHALYAM Security Hardening Rollback Script
-- Reverts policies and grants to previous state if needed.

drop policy if exists "profiles are deletable by their owner" on public.profiles;
drop policy if exists "profiles are updatable by their owner" on public.profiles;
drop policy if exists "profiles are insertable by their owner" on public.profiles;
drop policy if exists "profiles are readable by their owner" on public.profiles;

-- Recreate basic policies
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

revoke delete on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;
