-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20261001000000_mandali_persistence_foundation.sql
-- Description: Durable Postgres backing for Mandali groups — memberships,
--              roles, invite links, join requests, chat, and coin requests.
--
--              Everything Mandali currently owns (MandaliRepository.ts) lives
--              in a plain in-memory Map and is lost on every server restart
--              or redeploy. This migration is the foundation the rest of the
--              WhatsApp-parity work (invite links, promote/demote/kick/ban,
--              durable chat, in-chat coin requests) is built on, following
--              this project's established pattern: Postgres owns state,
--              security-definer RPCs enforce every invariant transactionally,
--              RLS denies the browser direct table access, and the existing
--              server-side PostgREST/RPC adapter (server/src/persistence/
--              postgrest.ts) is the only path in — no new ORM, no Redis.
--
--              Financial mutation (fund_coin_request) does not reimplement
--              wallet debit/credit — it calls the existing, already-audited
--              public.transfer_wallet_coins(...) from
--              20260930000000_mandali_p2p_wallet_transfer.sql inside the same
--              transaction, exactly as that migration's own header describes
--              reusing commit_match_entry's and refund_cosmetic_internal's
--              atomic patterns.
--
--              Role model is intentionally OWNER/ADMIN/MEMBER — simpler than
--              the seven-value MandaliRole the in-memory scaffolding shipped
--              with (OWNER/LEADER/OFFICER/EVENT_HOST/MODERATOR/MEMBER/TRIAL).
--              That collapse is a deliberate scope decision for this release,
--              made explicit here rather than left to be discovered later.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════ 1. Mandalis ═══════════════════════════

create table if not exists public.mandalis (
  id                text primary key,
  handle            text not null unique,
  name              text not null,
  emblem            text not null default 'pawn_amber',
  description       text not null default '',
  rules             text not null default '',
  -- Discovery/display fields, matching shared/mandali/types.ts's Mandali
  -- interface exactly — kept here (not split into a second table) so
  -- MandaliRepository's durable read path can serve search/browse straight
  -- off this one row, the same shape the in-memory seed data already used.
  banner_gradient   text,
  language          text not null default 'English',
  region            text not null default 'All India',
  tags              text[] not null default array['Lounge', 'Casual'],
  visibility        text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'DISCOVERABLE', 'INVITE_ONLY', 'HIDDEN')),
  level             integer not null default 1 check (level >= 1),
  xp                integer not null default 0 check (xp >= 0),
  owner_identity_id text not null references public.player_identities (player_id) on delete restrict,
  -- Group settings, per the "Group Settings & Permissions" spec: who may
  -- edit group info and who may send messages/announcements.
  edit_permission   text not null default 'ADMIN' check (edit_permission in ('ADMIN', 'ALL')),
  send_permission   text not null default 'ALL' check (send_permission in ('ADMIN', 'ALL')),
  join_approval     boolean not null default false,
  member_count      integer not null default 1 check (member_count >= 0),
  max_members       integer not null default 50 check (max_members > 0),
  version           bigint not null default 0 check (version >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint mandali_handle_format check (handle ~ '^[a-z0-9_-]{3,24}$'),
  constraint mandali_name_length check (char_length(name) between 1 and 60)
);

create index if not exists mandalis_owner_idx on public.mandalis (owner_identity_id);
create index if not exists mandalis_visibility_idx on public.mandalis (visibility) where visibility <> 'HIDDEN';

-- ═══════════════════════════ 2. Memberships ═══════════════════════════

create table if not exists public.mandali_memberships (
  mandali_id   text not null references public.mandalis (id) on delete cascade,
  identity_id  text not null references public.player_identities (player_id) on delete restrict,
  role         text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  state        text not null default 'ACTIVE' check (state in ('ACTIVE', 'LEFT', 'REMOVED', 'BANNED')),
  display_name text not null,
  avatar       text not null default 'avatar_1',
  joined_at    timestamptz not null default now(),
  version      bigint not null default 0 check (version >= 0),

  primary key (mandali_id, identity_id)
);

create index if not exists mandali_memberships_identity_idx on public.mandali_memberships (identity_id, state);

-- A unique index proves at most one ACTIVE owner, never zero — "at least
-- one" is guaranteed by transfer_mandali_ownership always demoting the old
-- owner and promoting the new one inside a single transaction, never leaving
-- a window with none. See MANDALI_ARCHITECTURE.md §3 "Exactly one owner".
create unique index if not exists mandali_memberships_one_owner_idx
  on public.mandali_memberships (mandali_id)
  where role = 'OWNER' and state = 'ACTIVE';

-- ═══════════════════════════ 3. Invitations & join requests ═══════════════════════════

create table if not exists public.mandali_invitations (
  id                 text primary key,
  mandali_id         text not null references public.mandalis (id) on delete cascade,
  -- Only the hash is ever persisted — the raw token is returned once, to the
  -- issuer, and never stored. Mirrors the guest/seat token pattern already
  -- used elsewhere in this codebase (HMAC-derived, not looked up by value).
  token_hash         text not null unique,
  issuer_identity_id text not null references public.player_identities (player_id) on delete restrict,
  status             text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED', 'EXPIRED')),
  use_count          integer not null default 0 check (use_count >= 0),
  use_limit          integer not null default 100 check (use_limit > 0),
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now()
);

create index if not exists mandali_invitations_mandali_idx on public.mandali_invitations (mandali_id, status);

create table if not exists public.mandali_join_requests (
  id                    text primary key,
  mandali_id            text not null references public.mandalis (id) on delete cascade,
  requester_identity_id text not null references public.player_identities (player_id) on delete restrict,
  invitation_id         text references public.mandali_invitations (id) on delete set null,
  status                text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')),
  reviewer_identity_id  text references public.player_identities (player_id),
  created_at            timestamptz not null default now(),
  decided_at            timestamptz
);

create index if not exists mandali_join_requests_mandali_idx on public.mandali_join_requests (mandali_id, status);

-- One pending request per requester per mandali — a second apply while one
-- is already pending is a no-op conflict, not a second row.
create unique index if not exists mandali_join_requests_one_pending_idx
  on public.mandali_join_requests (mandali_id, requester_identity_id)
  where status = 'PENDING';

-- ═══════════════════════════ 4. Channels & messages ═══════════════════════════

create table if not exists public.mandali_channels (
  channel_id    text primary key,
  mandali_id    text not null references public.mandalis (id) on delete cascade,
  name          text not null,
  type          text not null default 'TEXT' check (type in ('TEXT', 'ANNOUNCEMENT', 'PARTY_FINDING')),
  is_archived   boolean not null default false,
  position      integer not null default 0,
  -- Monotonic per-channel counter, incremented under FOR UPDATE inside
  -- send_mandali_message — message order is this, never arrival time.
  next_sequence bigint not null default 1,

  unique (mandali_id, name)
);

create table if not exists public.mandali_messages (
  message_id             text primary key,
  mandali_id             text not null references public.mandalis (id) on delete cascade,
  channel_id             text not null references public.mandali_channels (channel_id) on delete cascade,
  sequence               bigint not null,
  sender_identity_id     text not null references public.player_identities (player_id) on delete restrict,
  sender_role            text not null check (sender_role in ('OWNER', 'ADMIN', 'MEMBER')),
  kind                   text not null default 'TEXT' check (kind in ('TEXT', 'SYSTEM', 'COIN_REQUEST')),
  content                text not null,
  reply_to_id            text references public.mandali_messages (message_id),
  pinned                 boolean not null default false,
  -- Tombstone, never a hard delete — "delete for everyone"/"delete as admin"
  -- both hide content, they do not erase the row.
  deleted_at             timestamptz,
  deleted_by_identity_id text references public.player_identities (player_id),
  -- Client-generated retry key: same sender + same channel + same key
  -- returns the already-recorded message instead of a duplicate send.
  client_request_id      text,
  created_at             timestamptz not null default now(),

  unique (channel_id, sequence),
  constraint mandali_message_content_length check (char_length(content) <= 2000)
);

create index if not exists mandali_messages_channel_idx on public.mandali_messages (channel_id, sequence desc);
create unique index if not exists mandali_messages_idempotency_idx
  on public.mandali_messages (channel_id, sender_identity_id, client_request_id)
  where client_request_id is not null;

create table if not exists public.mandali_message_reactions (
  message_id  text not null references public.mandali_messages (message_id) on delete cascade,
  identity_id text not null references public.player_identities (player_id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),

  primary key (message_id, identity_id, emoji)
);

-- ═══════════════════════════ 5. Coin requests ═══════════════════════════

create table if not exists public.mandali_coin_requests (
  id                    text primary key,
  mandali_id            text not null references public.mandalis (id) on delete cascade,
  message_id            text references public.mandali_messages (message_id) on delete set null,
  -- The person asking for coins — they RECEIVE the transfer once funded.
  requester_identity_id text not null references public.player_identities (player_id) on delete restrict,
  -- The one specific "designated recipient" of the ASK — they PAY. Fixed at
  -- creation (this is a peer request, like WhatsApp, not an open group
  -- collection any member can fulfill), so there is no multi-donor race to
  -- guard against — only the single named payer retrying/double-tapping,
  -- which fund_coin_request's idempotency key and OPEN-status check cover.
  payer_identity_id     text not null references public.player_identities (player_id) on delete restrict,
  amount                bigint not null check (amount > 0),
  status                text not null default 'OPEN' check (status in ('OPEN', 'FUNDED', 'CANCELLED', 'EXPIRED')),
  transfer_idempotency_key text unique,
  expires_at            timestamptz not null,
  created_at            timestamptz not null default now(),
  decided_at            timestamptz,

  constraint mandali_coin_request_not_self check (requester_identity_id <> payer_identity_id)
);

create index if not exists mandali_coin_requests_mandali_idx on public.mandali_coin_requests (mandali_id, status);
create index if not exists mandali_coin_requests_payer_idx on public.mandali_coin_requests (payer_identity_id, status);

-- ═══════════════════════════ 6. Notifications & audit ═══════════════════════════

create table if not exists public.mandali_notifications (
  id                     text primary key,
  mandali_id             text not null references public.mandalis (id) on delete cascade,
  recipient_identity_id  text not null references public.player_identities (player_id) on delete cascade,
  kind                   text not null,
  payload                jsonb not null default '{}'::jsonb,
  read_at                timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists mandali_notifications_recipient_idx
  on public.mandali_notifications (recipient_identity_id, read_at, created_at desc);

create table if not exists public.mandali_audit_log (
  id                text primary key,
  mandali_id        text not null references public.mandalis (id) on delete cascade,
  actor_identity_id text not null references public.player_identities (player_id),
  action            text not null,
  details           text not null default '',
  created_at        timestamptz not null default now()
);

create index if not exists mandali_audit_log_mandali_idx on public.mandali_audit_log (mandali_id, created_at desc);

-- ═══════════════════════════ 7. RLS — deny direct browser access ═══════════════════════════
-- Every Mandali table is reached only through the RPCs below, called by the
-- server's service-role PostgREST adapter — never directly by anon/
-- authenticated browser roles. service_role bypasses RLS by Supabase design,
-- so enabling RLS with no policies is what makes "deny everyone else"
-- unconditional rather than something a future policy could accidentally
-- loosen.

alter table public.mandalis enable row level security;
alter table public.mandali_memberships enable row level security;
alter table public.mandali_invitations enable row level security;
alter table public.mandali_join_requests enable row level security;
alter table public.mandali_channels enable row level security;
alter table public.mandali_messages enable row level security;
alter table public.mandali_message_reactions enable row level security;
alter table public.mandali_coin_requests enable row level security;
alter table public.mandali_notifications enable row level security;
alter table public.mandali_audit_log enable row level security;

revoke all on public.mandalis from public, anon, authenticated;
revoke all on public.mandali_memberships from public, anon, authenticated;
revoke all on public.mandali_invitations from public, anon, authenticated;
revoke all on public.mandali_join_requests from public, anon, authenticated;
revoke all on public.mandali_channels from public, anon, authenticated;
revoke all on public.mandali_messages from public, anon, authenticated;
revoke all on public.mandali_message_reactions from public, anon, authenticated;
revoke all on public.mandali_coin_requests from public, anon, authenticated;
revoke all on public.mandali_notifications from public, anon, authenticated;
revoke all on public.mandali_audit_log from public, anon, authenticated;

-- ═══════════════════════════ 8. RPCs ═══════════════════════════
-- Every RPC below: security definer, restricted search_path, revoke-then-
-- grant-service_role-only — the same shape as transfer_wallet_coins. IDs are
-- generated server-side (nanoid, matching the rest of this codebase's ID
-- convention) and passed in, rather than generated in SQL, so Mandali keeps
-- one ID strategy end to end instead of splitting it across languages.

-- ── 8.1 create_mandali_with_owner ──
create or replace function public.create_mandali_with_owner(
  p_mandali_id text,
  p_handle text,
  p_name text,
  p_emblem text,
  p_description text,
  p_owner_identity_id text,
  p_owner_display_name text,
  p_owner_avatar text,
  p_banner_gradient text default null,
  p_language text default 'English',
  p_region text default 'All India',
  p_tags text[] default array['Lounge', 'Casual'],
  p_visibility text default 'PUBLIC'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mandali public.mandalis;
begin
  if p_handle is null or p_handle !~ '^[a-z0-9_-]{3,24}$' then
    raise exception 'INVALID_HANDLE: handle must be 3-24 lowercase letters, digits, hyphens or underscores';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'INVALID_NAME: name cannot be empty';
  end if;

  insert into public.mandalis (
    id, handle, name, emblem, description, owner_identity_id,
    banner_gradient, language, region, tags, visibility
  )
  values (
    p_mandali_id, p_handle, trim(p_name), coalesce(p_emblem, 'pawn_amber'), coalesce(p_description, ''), p_owner_identity_id,
    p_banner_gradient, coalesce(p_language, 'English'), coalesce(p_region, 'All India'),
    coalesce(p_tags, array['Lounge', 'Casual']), coalesce(p_visibility, 'PUBLIC')
  )
  returning * into v_mandali;

  insert into public.mandali_memberships (mandali_id, identity_id, role, state, display_name, avatar)
  values (p_mandali_id, p_owner_identity_id, 'OWNER', 'ACTIVE', p_owner_display_name, p_owner_avatar);

  insert into public.mandali_channels (channel_id, mandali_id, name, type, position)
  values
    (p_mandali_id || '_announcements', p_mandali_id, 'announcements', 'ANNOUNCEMENT', 0),
    (p_mandali_id || '_lounge-chat', p_mandali_id, 'lounge-chat', 'TEXT', 1),
    (p_mandali_id || '_squad-formation', p_mandali_id, 'squad-formation', 'PARTY_FINDING', 2);

  insert into public.mandali_audit_log (id, mandali_id, actor_identity_id, action, details)
  values (p_mandali_id || '_created', p_mandali_id, p_owner_identity_id, 'MANDALI_CREATED', 'Created Mandali with handle @' || p_handle);

  return to_jsonb(v_mandali);
end;
$$;

revoke all on function public.create_mandali_with_owner(text, text, text, text, text, text, text, text, text, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.create_mandali_with_owner(text, text, text, text, text, text, text, text, text, text, text, text[], text) to service_role;

-- ── 8.1b update_mandali_settings ──
-- "Group Info & Details" + "Group Settings & Permissions" from the product
-- spec: name/emblem/description/rules plus the edit/send/join-approval
-- toggles. Gated by the mandali's OWN edit_permission setting (ADMIN-only
-- by default, or ALL members if the owner opens it up) rather than a fixed
-- role check — the setting governs itself.
create or replace function public.update_mandali_settings(
  p_mandali_id text,
  p_actor_identity_id text,
  p_name text default null,
  p_emblem text default null,
  p_description text default null,
  p_rules text default null,
  p_edit_permission text default null,
  p_send_permission text default null,
  p_join_approval boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mandali public.mandalis;
  v_actor public.mandali_memberships;
begin
  select * into v_mandali from public.mandalis where id = p_mandali_id for update;
  if not found then
    raise exception 'MANDALI_NOT_FOUND: %', p_mandali_id;
  end if;

  select * into v_actor from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_actor_identity_id;
  end if;

  -- Permission/settings changes are always owner-only, regardless of
  -- edit_permission — opening THAT setting up is itself an owner decision.
  if (p_edit_permission is not null or p_send_permission is not null or p_join_approval is not null)
     and v_actor.role <> 'OWNER' then
    raise exception 'FORBIDDEN: only the owner may change group settings';
  end if;

  if (p_name is not null or p_emblem is not null or p_description is not null or p_rules is not null)
     and v_actor.role = 'MEMBER' and v_mandali.edit_permission = 'ADMIN' then
    raise exception 'FORBIDDEN: only owners and admins may edit group info';
  end if;

  if p_edit_permission is not null and p_edit_permission not in ('ADMIN', 'ALL') then
    raise exception 'INVALID_SETTING: edit_permission must be ADMIN or ALL';
  end if;
  if p_send_permission is not null and p_send_permission not in ('ADMIN', 'ALL') then
    raise exception 'INVALID_SETTING: send_permission must be ADMIN or ALL';
  end if;

  update public.mandalis set
    name = coalesce(nullif(trim(p_name), ''), name),
    emblem = coalesce(p_emblem, emblem),
    description = coalesce(p_description, description),
    rules = coalesce(p_rules, rules),
    edit_permission = coalesce(p_edit_permission, edit_permission),
    send_permission = coalesce(p_send_permission, send_permission),
    join_approval = coalesce(p_join_approval, join_approval),
    version = version + 1,
    updated_at = now()
  where id = p_mandali_id
  returning * into v_mandali;

  return to_jsonb(v_mandali);
end;
$$;

revoke all on function public.update_mandali_settings(text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.update_mandali_settings(text, text, text, text, text, text, text, text, boolean) to service_role;

-- ── 8.2 create_join_request ──
-- If the mandali's join_approval setting is off, this directly creates an
-- ACTIVE membership (auto-approve) instead of a pending request — matching
-- the per-Mandali "Join Approval toggle" from the product spec: approval is
-- opt-in per group, not mandatory for every group the way an earlier, purely
-- internal planning draft assumed.
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

  insert into public.mandali_join_requests (id, mandali_id, requester_identity_id, invitation_id)
  values (p_request_id, p_mandali_id, p_requester_identity_id, p_invitation_id)
  on conflict (mandali_id, requester_identity_id) where status = 'PENDING'
    do update set id = public.mandali_join_requests.id -- no-op: surfaces the existing pending request
  returning * into v_request;

  return jsonb_build_object('autoApproved', false, 'request', to_jsonb(v_request));
end;
$$;

revoke all on function public.create_join_request(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_join_request(text, text, text, text, text, text) to service_role;

-- ── 8.3 decide_join_request (approve/reject) ──
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

  insert into public.mandali_memberships (mandali_id, identity_id, role, state, display_name, avatar)
  values (v_request.mandali_id, v_request.requester_identity_id, 'MEMBER', 'ACTIVE', 'Member', 'avatar_1')
  on conflict (mandali_id, identity_id) do update
    set state = 'ACTIVE', role = 'MEMBER', joined_at = now(), version = public.mandali_memberships.version + 1;

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

-- ── 8.4 transition_membership (promote / demote / kick / ban / leave) ──
create or replace function public.transition_membership(
  p_mandali_id text,
  p_actor_identity_id text,
  p_target_identity_id text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor public.mandali_memberships;
  v_target public.mandali_memberships;
begin
  if p_action not in ('PROMOTE', 'DEMOTE', 'KICK', 'BAN', 'LEAVE') then
    raise exception 'INVALID_ACTION: %', p_action;
  end if;

  select * into v_target from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_target_identity_id for update;
  if not found or v_target.state <> 'ACTIVE' then
    raise exception 'TARGET_NOT_ACTIVE_MEMBER: %', p_target_identity_id;
  end if;

  if p_action = 'LEAVE' then
    if p_actor_identity_id <> p_target_identity_id then
      raise exception 'FORBIDDEN: LEAVE may only be performed by the member themself';
    end if;
    if v_target.role = 'OWNER' then
      raise exception 'OWNER_MUST_TRANSFER: transfer ownership before leaving';
    end if;

    update public.mandali_memberships set state = 'LEFT', version = version + 1
      where mandali_id = p_mandali_id and identity_id = p_target_identity_id;
    update public.mandalis set member_count = member_count - 1, version = version + 1, updated_at = now()
      where id = p_mandali_id;
    return jsonb_build_object('action', p_action, 'targetIdentityId', p_target_identity_id);
  end if;

  select * into v_actor from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'ACTOR_NOT_ACTIVE_MEMBER: %', p_actor_identity_id;
  end if;

  if p_action in ('PROMOTE', 'DEMOTE') then
    if v_actor.role <> 'OWNER' then
      raise exception 'FORBIDDEN: only the owner may promote or demote';
    end if;
    if v_target.role = 'OWNER' then
      raise exception 'FORBIDDEN: use transfer_mandali_ownership to change the owner';
    end if;
    update public.mandali_memberships
      set role = case when p_action = 'PROMOTE' then 'ADMIN' else 'MEMBER' end, version = version + 1
      where mandali_id = p_mandali_id and identity_id = p_target_identity_id;
    return jsonb_build_object('action', p_action, 'targetIdentityId', p_target_identity_id);
  end if;

  -- KICK / BAN: owner can act on anyone but themself; admin can act on
  -- ordinary members only — never the owner, never a peer admin.
  if v_target.identity_id = v_actor.identity_id then
    raise exception 'FORBIDDEN: cannot % yourself, use LEAVE', p_action;
  end if;
  if v_target.role = 'OWNER' then
    raise exception 'FORBIDDEN: the owner cannot be removed';
  end if;
  if v_actor.role = 'MEMBER' or (v_actor.role = 'ADMIN' and v_target.role = 'ADMIN') then
    raise exception 'FORBIDDEN: insufficient role to % this member', p_action;
  end if;

  update public.mandali_memberships
    set state = case when p_action = 'KICK' then 'REMOVED' else 'BANNED' end, version = version + 1
    where mandali_id = p_mandali_id and identity_id = p_target_identity_id;
  update public.mandalis set member_count = member_count - 1, version = version + 1, updated_at = now()
    where id = p_mandali_id;

  insert into public.mandali_audit_log (id, mandali_id, actor_identity_id, action, details)
  values (p_mandali_id || '_' || p_action || '_' || p_target_identity_id || '_' || extract(epoch from now())::text,
          p_mandali_id, p_actor_identity_id, 'MEMBER_' || p_action, 'Target: ' || p_target_identity_id);

  return jsonb_build_object('action', p_action, 'targetIdentityId', p_target_identity_id);
end;
$$;

revoke all on function public.transition_membership(text, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_membership(text, text, text, text) to service_role;

-- ── 8.5 transfer_mandali_ownership ──
create or replace function public.transfer_mandali_ownership(
  p_mandali_id text,
  p_current_owner_identity_id text,
  p_new_owner_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_mandali public.mandalis;
  v_new_owner public.mandali_memberships;
begin
  select * into v_mandali from public.mandalis where id = p_mandali_id for update;
  if not found then
    raise exception 'MANDALI_NOT_FOUND: %', p_mandali_id;
  end if;
  if v_mandali.owner_identity_id <> p_current_owner_identity_id then
    raise exception 'FORBIDDEN: caller is not the current owner';
  end if;
  if p_current_owner_identity_id = p_new_owner_identity_id then
    raise exception 'INVALID_TRANSFER: already the owner';
  end if;

  select * into v_new_owner from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_new_owner_identity_id and state = 'ACTIVE' for update;
  if not found then
    raise exception 'TARGET_NOT_ACTIVE_MEMBER: new owner must be an active member';
  end if;

  -- Demote old owner and promote new owner inside the SAME transaction as
  -- the pointer update, so there is never a moment with zero or two owners.
  update public.mandali_memberships set role = 'ADMIN', version = version + 1
    where mandali_id = p_mandali_id and identity_id = p_current_owner_identity_id;
  update public.mandali_memberships set role = 'OWNER', version = version + 1
    where mandali_id = p_mandali_id and identity_id = p_new_owner_identity_id;
  update public.mandalis set owner_identity_id = p_new_owner_identity_id, version = version + 1, updated_at = now()
    where id = p_mandali_id
    returning * into v_mandali;

  insert into public.mandali_audit_log (id, mandali_id, actor_identity_id, action, details)
  values (p_mandali_id || '_ownership_' || extract(epoch from now())::text, p_mandali_id, p_current_owner_identity_id,
          'OWNERSHIP_TRANSFERRED', 'New owner: ' || p_new_owner_identity_id);

  return to_jsonb(v_mandali);
end;
$$;

revoke all on function public.transfer_mandali_ownership(text, text, text) from public, anon, authenticated;
grant execute on function public.transfer_mandali_ownership(text, text, text) to service_role;

-- ── 8.6 create_invitation / resolve_invitation ──
create or replace function public.create_invitation(
  p_invitation_id text,
  p_mandali_id text,
  p_issuer_identity_id text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_use_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_issuer public.mandali_memberships;
  v_invitation public.mandali_invitations;
begin
  select * into v_issuer from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_issuer_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'FORBIDDEN: only an active member may create an invite link';
  end if;

  insert into public.mandali_invitations (id, mandali_id, token_hash, issuer_identity_id, expires_at, use_limit)
  values (p_invitation_id, p_mandali_id, p_token_hash, p_issuer_identity_id, p_expires_at, coalesce(p_use_limit, 100))
  returning * into v_invitation;

  return to_jsonb(v_invitation);
end;
$$;

revoke all on function public.create_invitation(text, text, text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.create_invitation(text, text, text, text, timestamptz, integer) to service_role;

-- Read-only preview by token hash — deliberately returns only what an
-- unauthenticated invite page may show (name/emblem/description), never
-- member lists or chat. Does not consume a use; that happens on committed
-- membership inside create_join_request / decide_join_request.
create or replace function public.resolve_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_invitation public.mandali_invitations;
  v_mandali public.mandalis;
begin
  select * into v_invitation from public.mandali_invitations where token_hash = p_token_hash;
  if not found or v_invitation.status <> 'ACTIVE' or v_invitation.expires_at <= now()
     or v_invitation.use_count >= v_invitation.use_limit then
    return jsonb_build_object('valid', false);
  end if;

  select * into v_mandali from public.mandalis where id = v_invitation.mandali_id;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'invitationId', v_invitation.id,
    'mandaliId', v_mandali.id,
    'name', v_mandali.name,
    'emblem', v_mandali.emblem,
    'description', v_mandali.description
  );
end;
$$;

revoke all on function public.resolve_invitation(text) from public, anon, authenticated;
grant execute on function public.resolve_invitation(text) to service_role;

-- ── 8.7 send_mandali_message ──
create or replace function public.send_mandali_message(
  p_message_id text,
  p_mandali_id text,
  p_channel_id text,
  p_sender_identity_id text,
  p_content text,
  p_reply_to_id text default null,
  p_client_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_sender public.mandali_memberships;
  v_channel public.mandali_channels;
  v_existing public.mandali_messages;
  v_message public.mandali_messages;
  v_sequence bigint;
begin
  if p_content is null or char_length(trim(p_content)) = 0 then
    raise exception 'EMPTY_MESSAGE: content cannot be empty';
  end if;

  if p_client_request_id is not null then
    select * into v_existing from public.mandali_messages
      where channel_id = p_channel_id and sender_identity_id = p_sender_identity_id
        and client_request_id = p_client_request_id;
    if found then
      return jsonb_build_object('deduplicated', true, 'message', to_jsonb(v_existing));
    end if;
  end if;

  select * into v_sender from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_sender_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: must be an active member to post messages';
  end if;

  select * into v_channel from public.mandali_channels where channel_id = p_channel_id for update;
  if not found or v_channel.mandali_id <> p_mandali_id or v_channel.is_archived then
    raise exception 'CHANNEL_NOT_FOUND: channel not found or archived';
  end if;
  if v_channel.type = 'ANNOUNCEMENT' and v_sender.role not in ('OWNER', 'ADMIN') then
    raise exception 'FORBIDDEN: only owners and admins can post in announcements';
  end if;

  v_sequence := v_channel.next_sequence;
  update public.mandali_channels set next_sequence = next_sequence + 1 where channel_id = p_channel_id;

  insert into public.mandali_messages (
    message_id, mandali_id, channel_id, sequence, sender_identity_id, sender_role,
    content, reply_to_id, client_request_id
  ) values (
    p_message_id, p_mandali_id, p_channel_id, v_sequence, p_sender_identity_id, v_sender.role,
    left(trim(p_content), 2000), p_reply_to_id, p_client_request_id
  )
  returning * into v_message;

  return jsonb_build_object('deduplicated', false, 'message', to_jsonb(v_message));
end;
$$;

revoke all on function public.send_mandali_message(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.send_mandali_message(text, text, text, text, text, text, text) to service_role;

-- ── 8.8 set_message_pin ──
create or replace function public.set_message_pin(
  p_message_id text,
  p_actor_identity_id text,
  p_pinned boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_message public.mandali_messages;
  v_actor public.mandali_memberships;
begin
  select * into v_message from public.mandali_messages where message_id = p_message_id;
  if not found then
    raise exception 'MESSAGE_NOT_FOUND: %', p_message_id;
  end if;

  select * into v_actor from public.mandali_memberships
    where mandali_id = v_message.mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found or v_actor.role not in ('OWNER', 'ADMIN') then
    raise exception 'FORBIDDEN: only owners and admins may pin messages';
  end if;

  update public.mandali_messages set pinned = p_pinned where message_id = p_message_id
    returning * into v_message;

  return to_jsonb(v_message);
end;
$$;

revoke all on function public.set_message_pin(text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_message_pin(text, text, boolean) to service_role;

-- ── 8.9 delete_mandali_message ──
create or replace function public.delete_mandali_message(
  p_message_id text,
  p_actor_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_message public.mandali_messages;
  v_actor public.mandali_memberships;
begin
  select * into v_message from public.mandali_messages where message_id = p_message_id for update;
  if not found then
    raise exception 'MESSAGE_NOT_FOUND: %', p_message_id;
  end if;
  if v_message.deleted_at is not null then
    return jsonb_build_object('alreadyDeleted', true, 'message', to_jsonb(v_message));
  end if;

  select * into v_actor from public.mandali_memberships
    where mandali_id = v_message.mandali_id and identity_id = p_actor_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: %', p_actor_identity_id;
  end if;

  if v_message.sender_identity_id <> p_actor_identity_id and v_actor.role not in ('OWNER', 'ADMIN') then
    raise exception 'FORBIDDEN: can only delete your own messages, or any message as an owner/admin';
  end if;

  update public.mandali_messages
    set deleted_at = now(), deleted_by_identity_id = p_actor_identity_id
    where message_id = p_message_id
    returning * into v_message;

  return jsonb_build_object('alreadyDeleted', false, 'message', to_jsonb(v_message));
end;
$$;

revoke all on function public.delete_mandali_message(text, text) from public, anon, authenticated;
grant execute on function public.delete_mandali_message(text, text) to service_role;

-- ── 8.10 create_coin_request ──
-- Posts the request as an actual chat message (kind COIN_REQUEST) in the
-- same transaction as the request row — "a rich, interactive card in the
-- channel" is the literal product ask, not a side-channel notice the chat
-- feed never shows. Reuses send_mandali_message for the message insert
-- (sequencing, membership/channel checks, idempotency) rather than
-- duplicating that logic, then reclassifies the row's kind.
create or replace function public.create_coin_request(
  p_request_id text,
  p_mandali_id text,
  p_channel_id text,
  p_requester_identity_id text,
  p_payer_identity_id text,
  p_amount bigint,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_requester public.mandali_memberships;
  v_payer public.mandali_memberships;
  v_request public.mandali_coin_requests;
  v_message_id text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: must be a positive integer';
  end if;
  if p_requester_identity_id = p_payer_identity_id then
    raise exception 'INVALID_REQUEST: cannot request coins from yourself';
  end if;

  select * into v_requester from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_requester_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: requester must be an active member';
  end if;
  select * into v_payer from public.mandali_memberships
    where mandali_id = p_mandali_id and identity_id = p_payer_identity_id and state = 'ACTIVE';
  if not found then
    raise exception 'NOT_ACTIVE_MEMBER: designated payer must be an active member';
  end if;

  v_message_id := p_request_id || '_card';
  perform public.send_mandali_message(
    v_message_id, p_mandali_id, p_channel_id, p_requester_identity_id,
    'Requested ' || p_amount || ' coins', null, null
  );
  update public.mandali_messages set kind = 'COIN_REQUEST' where message_id = v_message_id;

  insert into public.mandali_coin_requests (
    id, mandali_id, message_id, requester_identity_id, payer_identity_id, amount, expires_at
  ) values (
    p_request_id, p_mandali_id, v_message_id, p_requester_identity_id, p_payer_identity_id, p_amount, p_expires_at
  )
  returning * into v_request;

  return to_jsonb(v_request);
end;
$$;

revoke all on function public.create_coin_request(text, text, text, text, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.create_coin_request(text, text, text, text, text, bigint, timestamptz) to service_role;

-- ── 8.11 fund_coin_request ──
-- Reuses transfer_wallet_coins for the actual debit/credit rather than
-- reimplementing wallet mutation here — one atomic-transfer primitive, not
-- two independently-maintained ones.
create or replace function public.fund_coin_request(
  p_request_id text,
  p_payer_identity_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.mandali_coin_requests;
  v_transfer_result jsonb;
begin
  select * into v_request from public.mandali_coin_requests where id = p_request_id for update;
  if not found then
    raise exception 'REQUEST_NOT_FOUND: %', p_request_id;
  end if;

  if v_request.status = 'FUNDED' then
    return jsonb_build_object('alreadyFunded', true, 'request', to_jsonb(v_request));
  end if;
  if v_request.status <> 'OPEN' then
    raise exception 'REQUEST_NOT_OPEN: status is %', v_request.status;
  end if;
  if v_request.expires_at <= now() then
    update public.mandali_coin_requests set status = 'EXPIRED', decided_at = now() where id = p_request_id;
    raise exception 'REQUEST_EXPIRED: %', p_request_id;
  end if;
  if v_request.payer_identity_id <> p_payer_identity_id then
    raise exception 'FORBIDDEN: only the designated payer may fund this request';
  end if;

  v_transfer_result := public.transfer_wallet_coins(
    p_from_identity_id => v_request.payer_identity_id,
    p_to_identity_id => v_request.requester_identity_id,
    p_amount => v_request.amount,
    p_reason => 'Mandali coin request',
    p_idempotency_key => p_idempotency_key
  );

  update public.mandali_coin_requests
    set status = 'FUNDED', transfer_idempotency_key = p_idempotency_key, decided_at = now()
    where id = p_request_id
    returning * into v_request;

  return jsonb_build_object('alreadyFunded', false, 'request', to_jsonb(v_request), 'transfer', v_transfer_result);
end;
$$;

revoke all on function public.fund_coin_request(text, text, text) from public, anon, authenticated;
grant execute on function public.fund_coin_request(text, text, text) to service_role;
