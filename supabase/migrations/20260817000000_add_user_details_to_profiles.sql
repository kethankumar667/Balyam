-- Migration: Add extra profile columns and sync trigger for all user details
-- Adds first_name, last_name, email, dob, gender, account_id to public.profiles

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists dob date,
  add column if not exists gender text,
  add column if not exists account_id text;

-- Update trigger function to populate all fields from auth.users.raw_user_meta_data upon signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    display_name,
    dob,
    gender,
    account_id,
    avatar_id
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    case
      when (new.raw_user_meta_data ->> 'dob') is not null and (new.raw_user_meta_data ->> 'dob') ~ '^\d{4}-\d{2}-\d{2}$'
      then (new.raw_user_meta_data ->> 'dob')::date
      else null
    end,
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'account_id',
    new.raw_user_meta_data ->> 'avatar_id'
  )
  on conflict (id) do update set
    email        = coalesce(excluded.email, profiles.email),
    first_name   = coalesce(excluded.first_name, profiles.first_name),
    last_name    = coalesce(excluded.last_name, profiles.last_name),
    display_name = coalesce(excluded.display_name, profiles.display_name),
    dob          = coalesce(excluded.dob, profiles.dob),
    gender       = coalesce(excluded.gender, profiles.gender),
    account_id   = coalesce(excluded.account_id, profiles.account_id),
    avatar_id    = coalesce(excluded.avatar_id, profiles.avatar_id),
    updated_at   = now();
  return new;
end;
$$;
