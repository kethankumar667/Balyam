-- Account deletion that works for a member who has actually played.
--
-- ── The bug ───────────────────────────────────────────────────────────
-- `delete_account()` (20260816000000) deleted the member from auth.users and
-- relied on the cascade to take everything with it. But
-- `player_identities.auth_user_id` cascades from auth.users, and the identity
-- is referenced `on delete restrict` by the coin wallet (economy v1 — an
-- identity with coin history is NEVER physically deleted, on purpose: the
-- ledger is immutable) and by reviews, Mandali ownership, membership, messages
-- and coin requests. So the first member with a wallet to press "Delete my
-- account" got:
--   update or delete on table "player_identities" violates foreign key
--   constraint "coin_wallets_identity_id_fkey" on table "coin_wallets"
--
-- ── The fix, which is the documented policy (economy-v1 §5.2) ─────────
-- "Erasure is handled by anonymising the identity row in place, not deleting
-- it." This is that procedure, the same shape as the guest erase in
-- 20261028000000:
--   * an identity nothing depends on is deleted outright, exactly as before;
--   * an identity with history keeps its row, wallet and coin ledger — they
--     hold only a random id and no personal data — while everything that
--     CASCADES from it (progress, profile, friends, cosmetics, streaks, ...) is
--     deleted, the auth link is cleared and `erased_at` is set. The cascade list
--     is read from the catalogue, so a table added later is erased too.
-- Then the auth user is deleted, which removes `public.profiles` (the email,
-- name, date of birth and gender) and frees the email address.
--
-- A member's player id is their Supabase user id, so signing up again later is
-- a brand-new identity and can never collide with an erased one.
--
-- ── What this does NOT settle ─────────────────────────────────────────
-- Rows that reference the identity with RESTRICT stay, attached to a now
-- anonymous id: reviews, Mandali groups the member owned, their membership,
-- chat messages and coin requests. Free text inside those (a message, a review)
-- is not cleared here — that, and what should happen to a Mandali whose owner
-- has gone, are product decisions, not something to guess in a migration.
--
-- A child table that refuses deletion (an append-only audit table) is skipped
-- with a database-log warning rather than stopping the deletion: a member who
-- asked to be erased must never be left unable to leave.

-- A member row normally has an auth user. An erased one does not, and says so.
alter table public.player_identities drop constraint if exists identity_kind_matches_auth;
alter table public.player_identities
  add constraint identity_kind_matches_auth check (
    (kind = 'member' and (auth_user_id is not null or erased_at is not null))
    or (kind = 'guest' and auth_user_id is null)
  );

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_identity record;
  v_fk       record;
begin
  if v_uid is null then
    raise exception 'Unauthorized: Not signed in';
  end if;

  for v_identity in
    select pi.player_id
      from public.player_identities pi
     where pi.auth_user_id = v_uid
  loop
    begin
      -- Nothing depends on this identity: remove it for good.
      delete from public.player_identities where player_id = v_identity.player_id;
    exception when others then
      -- It has history (a wallet, a review, a Mandali). Keep the row, erase the person.
      for v_fk in
        select c.conrelid::regclass as child_table,
               a.attname            as child_column
          from pg_constraint c
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
         where c.contype = 'f'
           and c.confrelid = 'public.player_identities'::regclass
           and c.confdeltype = 'c'
           and array_length(c.conkey, 1) = 1
      loop
        begin
          execute format('delete from %s where %I = $1', v_fk.child_table, v_fk.child_column)
            using v_identity.player_id;
        exception when others then
          raise warning 'delete_account: kept rows in % (%)', v_fk.child_table, sqlerrm;
        end;
      end loop;

      update public.player_identities
         set auth_user_id = null,
             erased_at    = now()
       where player_id = v_identity.player_id;
    end;
  end loop;

  -- Removes public.profiles (email, name, date of birth, gender) and frees the email.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
