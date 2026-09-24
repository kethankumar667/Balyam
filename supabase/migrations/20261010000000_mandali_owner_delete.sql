-- Mandali: the owner can delete their Mandali.
--
-- delete_mandali(p_mandali_id, p_actor_identity_id)
--   Checks the caller is the CURRENT owner, then deletes the Mandali in one
--   transaction. Every table that points at a Mandali (memberships, invitations,
--   join requests, channels, messages, reactions, coin requests, notifications,
--   the audit log) is `on delete cascade`, so this one statement removes all of it.
--
--   It returns the Mandali's name and the ids of its ACTIVE members, read in the
--   same transaction as the delete, so the server tells exactly the people who
--   lost the group — not a list that may already be stale.
--
-- What is deliberately NOT touched: wallets and the coin ledger. A coin transfer
-- between two members is an entry between their wallets; it never held a
-- reference to the Mandali, so deleting the group cannot alter anyone's balance
-- or history. Open coin requests hold no escrow — coins move only when a request
-- is paid — so they simply disappear with the group.
--
-- The deletion is permanent. There is no soft-delete flag, because keeping a
-- deleted group's private conversation on the server would defeat the point.

create or replace function public.delete_mandali(
  p_mandali_id text,
  p_actor_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mandali public.mandalis;
  v_member_ids text[];
begin
  -- Lock the row first: a concurrent ownership transfer must finish (and change
  -- who is allowed) before this decides, and a second delete finds nothing.
  select * into v_mandali from public.mandalis where id = p_mandali_id for update;
  if not found then
    raise exception 'MANDALI_NOT_FOUND: %', p_mandali_id;
  end if;
  if v_mandali.owner_identity_id <> p_actor_identity_id then
    raise exception 'FORBIDDEN: caller is not the current owner';
  end if;

  select coalesce(array_agg(identity_id order by identity_id), '{}')
    into v_member_ids
    from public.mandali_memberships
    where mandali_id = p_mandali_id and state = 'ACTIVE';

  delete from public.mandalis where id = p_mandali_id;

  return jsonb_build_object(
    'mandali_id', p_mandali_id,
    'name', v_mandali.name,
    'member_ids', to_jsonb(v_member_ids)
  );
end;
$$;

revoke all on function public.delete_mandali(text, text) from public, anon, authenticated;
grant execute on function public.delete_mandali(text, text) to service_role;

-- Make the API pick the new function up immediately.
notify pgrst, 'reload schema';
