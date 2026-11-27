-- A Gang join request now remembers who is asking.
--
-- WHY: `mandali_join_requests` stored only the requester's identity id. When a Gang has join approval on, an
-- admin opened "Join Requests" and saw a list of raw ids, with nothing to decide on. And once approved, the
-- membership was created with the literal name 'Member' and the default avatar, so even an approved person
-- appeared in the Gang as "Member". `create_join_request` already RECEIVED the name and avatar; it only used
-- them on the auto-approve path.
--
-- WHAT THIS CHANGES:
--   1. Two nullable columns on `mandali_join_requests`: `requester_display_name`, `requester_avatar`.
--      Nullable on purpose: requests made before this migration have no name, and the app shows them as
--      "Member" plus a short id rather than inventing one.
--   2. `create_join_request` stores the name and avatar on the pending request row.
--   3. `decide_join_request` gives an approved person the name and avatar they applied with (falling back to the
--      old 'Member' / 'avatar_1' only for a request that carries none).
--
-- WHAT IT DELIBERATELY LEAVES ALONE: the functions' signatures, grants, locking order, error codes and every
-- other branch are what 20261001000000 created (`create or replace` with the same argument lists).
-- No existing row is rewritten. The name is vetted by the server (shared/playerName.ts) before it reaches here;
-- the length check below is only a backstop so a bad caller cannot store an essay.
--
-- ORDER OF DEPLOY: either order works. The old server ignores the columns, and the new server treats a missing
-- value as "no name yet".

alter table public.mandali_join_requests
  add column if not exists requester_display_name text,
  add column if not exists requester_avatar text;

alter table public.mandali_join_requests
  drop constraint if exists mandali_join_requests_requester_name_len;
alter table public.mandali_join_requests
  add constraint mandali_join_requests_requester_name_len
  check (requester_display_name is null or char_length(requester_display_name) between 1 and 40);

create or replace function public.create_join_request(
  p_request_id text,
  p_mandali_id text,
  p_requester_identity_id text,
  p_requester_display_name text,
  p_requester_avatar text,
  p_invitation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mandali public.mandalis;
  v_existing public.mandali_memberships;
  v_invitation public.mandali_invitations;
  v_request public.mandali_join_requests;
begin
  select * into v_mandali from public.mandalis where id = p_mandali_id for update;
  if not found then
    raise exception 'MANDALI_NOT_FOUND: %', p_mandali_id;
  end if;

  select * into v_existing from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_requester_identity_id;
  if found and v_existing.state = 'ACTIVE' then
    raise exception 'ALREADY_MEMBER: already an active member';
  end if;
  if found and v_existing.state = 'BANNED' then
    raise exception 'BANNED: cannot rejoin a Mandali you were banned from';
  end if;

  if v_mandali.member_count >= v_mandali.max_members then
    raise exception 'MANDALI_FULL: at capacity (%/%)', v_mandali.member_count, v_mandali.max_members;
  end if;

  if p_invitation_id is not null then
    select * into v_invitation from public.mandali_invitations where id = p_invitation_id for update;
    if not found or v_invitation.status <> 'ACTIVE' or v_invitation.expires_at <= now()
       or v_invitation.use_count >= v_invitation.use_limit then
      raise exception 'INVALID_INVITATION: link is invalid, revoked, expired or exhausted';
    end if;
  end if;

  if not v_mandali.join_approval then
    -- Auto-approve: skip the request row, go straight to ACTIVE membership.
    insert into public.mandali_memberships (mandali_id, identity_id, role, state, display_name, avatar)
    values (p_mandali_id, p_requester_identity_id, 'MEMBER', 'ACTIVE', p_requester_display_name, p_requester_avatar)
    on conflict (mandali_id, identity_id) do update
      set state = 'ACTIVE', role = 'MEMBER', display_name = excluded.display_name,
          avatar = excluded.avatar, joined_at = now(), version = public.mandali_memberships.version + 1;

    update public.mandalis set member_count = member_count + 1, version = version + 1, updated_at = now()
      where id = p_mandali_id;

    if p_invitation_id is not null then
      update public.mandali_invitations set use_count = use_count + 1 where id = p_invitation_id;
    end if;

    return jsonb_build_object('autoApproved', true, 'mandaliId', p_mandali_id);
  end if;

  -- Join approval is on: keep a pending request that says WHO is asking. A repeat application while one is
  -- already pending refreshes the name and avatar (the person may have changed them) and keeps the same row.
  insert into public.mandali_join_requests
    (id, mandali_id, requester_identity_id, invitation_id, requester_display_name, requester_avatar)
  values
    (p_request_id, p_mandali_id, p_requester_identity_id, p_invitation_id,
     nullif(btrim(p_requester_display_name), ''), nullif(btrim(p_requester_avatar), ''))
  on conflict (mandali_id, requester_identity_id) where status = 'PENDING'
    do update set
      requester_display_name = coalesce(excluded.requester_display_name, public.mandali_join_requests.requester_display_name),
      requester_avatar = coalesce(excluded.requester_avatar, public.mandali_join_requests.requester_avatar)
  returning * into v_request;

  return jsonb_build_object('autoApproved', false, 'request', to_jsonb(v_request));
end;
$$;

revoke all on function public.create_join_request(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_join_request(text, text, text, text, text, text) to service_role;

create or replace function public.decide_join_request(
  p_request_id text,
  p_reviewer_identity_id text,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.mandali_join_requests;
  v_reviewer public.mandali_memberships;
  v_mandali public.mandalis;
begin
  select * into v_request from public.mandali_join_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND: %', p_request_id;
  end if;
  if v_request.status <> 'PENDING' then
    -- Idempotent-friendly: a second approve/reject on an already-decided
    -- request returns the recorded outcome rather than erroring.
    return jsonb_build_object('alreadyDecided', true, 'request', to_jsonb(v_request));
  end if;

  select * into v_reviewer from public.mandali_memberships
    where mandali_id = v_request.mandali_id and identity_id = p_reviewer_identity_id and state = 'ACTIVE';
  if not found or v_reviewer.role not in ('OWNER', 'ADMIN') then
    raise exception 'FORBIDDEN: only an active owner or admin may decide join requests';
  end if;

  if not p_approve then
    update public.mandali_join_requests
      set status = 'REJECTED', reviewer_identity_id = p_reviewer_identity_id, decided_at = now()
      where id = p_request_id
      returning * into v_request;
    return jsonb_build_object('request', to_jsonb(v_request));
  end if;

  select * into v_mandali from public.mandalis where id = v_request.mandali_id for update;
  if v_mandali.member_count >= v_mandali.max_members then
    raise exception 'MANDALI_FULL: at capacity (%/%)', v_mandali.member_count, v_mandali.max_members;
  end if;

  -- The person joins under the name and avatar they applied with. A request made before the identity columns
  -- existed carries neither, so it keeps the old placeholders.
  insert into public.mandali_memberships (mandali_id, identity_id, role, state, display_name, avatar)
  values (
    v_request.mandali_id, v_request.requester_identity_id, 'MEMBER', 'ACTIVE',
    coalesce(v_request.requester_display_name, 'Member'), coalesce(v_request.requester_avatar, 'avatar_1')
  )
  on conflict (mandali_id, identity_id) do update
    set state = 'ACTIVE', role = 'MEMBER', display_name = excluded.display_name, avatar = excluded.avatar,
        joined_at = now(), version = public.mandali_memberships.version + 1;

  update public.mandalis set member_count = member_count + 1, version = version + 1, updated_at = now()
    where id = v_request.mandali_id;

  if v_request.invitation_id is not null then
    update public.mandali_invitations set use_count = use_count + 1 where id = v_request.invitation_id;
  end if;

  update public.mandali_join_requests
    set status = 'APPROVED', reviewer_identity_id = p_reviewer_identity_id, decided_at = now()
    where id = p_request_id
    returning * into v_request;

  return jsonb_build_object('request', to_jsonb(v_request));
end;
$$;

revoke all on function public.decide_join_request(text, text, boolean) from public, anon, authenticated;
grant execute on function public.decide_join_request(text, text, boolean) to service_role;

notify pgrst, 'reload schema';
