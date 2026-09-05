-- Reviews & Testimonials V1
--
-- ── Scope ────────────────────────────────────────────────────────────────
-- A review is either platform-wide (`game_id is null`) or scoped to one
-- game. Both members and guests may submit one; because guest identities
-- are throwaway, the anti-abuse control here is a database-level uniqueness
-- constraint (§2), not a client-side check. Every review starts `pending`
-- and is never shown anywhere until an operator moves it to `approved` —
-- `is_featured` (the Testimonials feed) is a flag on an approved review,
-- not a separate content type.
--
-- ── Why no SECURITY DEFINER RPCs, unlike Economy V1 ────────────────────
-- Economy V1's RPCs exist because money has business rules that must be
-- enforced under real concurrency (sufficient balance, single-use vouchers,
-- settlement conservation). A review has exactly one invariant — "this
-- identity has not already reviewed this scope" — and that is what the two
-- partial unique indexes below enforce directly. Moderation actions are
-- single-row updates gated by the caller already holding the service-role
-- key (see server/src/security/operationalAuth.ts) — there is no
-- concurrent-mutation hazard heavy enough to justify a second layer here.
--
-- ── Feedback is NOT in this migration ───────────────────────────────────
-- The general "leave us feedback" inbox stays in-memory in Phase 1,
-- extending `server/src/support/SupportController.ts`'s existing
-- `/reports`/`/tickets` pattern. If it ever needs to survive a restart, its
-- eventual table shape is sketched in this project's implementation plan,
-- not created here — no reason to add a table nothing writes to yet.

create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  -- Matches player_identities.player_id's own type exactly (text, not
  -- uuid) — guest ids are `guest_<hex>`, never coerced to uuid anywhere
  -- else in this schema (see coin_wallets.identity_id for the precedent).
  identity_id       text not null references public.player_identities (player_id) on delete restrict,
  identity_kind     text not null check (identity_kind in ('member', 'guest')),
  -- NULL = platform-wide. Non-null = a BHALYAM game slug (shared/catalog.ts).
  -- Deliberately NOT a foreign key: the game catalog is static application
  -- code, not a database table — same treatment room_code/game fields get
  -- elsewhere in Economy V1.
  game_id           text,
  rating            smallint not null check (rating between 1 and 5),
  body              text not null check (char_length(body) between 1 and 2000),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_featured       boolean not null default false,
  moderator_id      text,
  moderated_at      timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint reviews_featured_requires_approved
    check (not is_featured or status = 'approved'),
  constraint reviews_rejection_reason_only_when_rejected
    check (status = 'rejected' or rejection_reason is null)
);

comment on table public.reviews is
  'Player-submitted star rating + text, platform-wide or per-game. Pending until an operator approves it; approved+is_featured is the Testimonials feed. Server-mediated only — see the RLS section below.';

-- ── §2: the authoritative anti-abuse control ──────────────────────────────
-- Two PARTIAL unique indexes, not one composite unique constraint on
-- (identity_id, game_id): in a plain unique constraint, NULL <> NULL, so a
-- composite (identity_id, game_id) unique would silently allow the same
-- identity to submit unlimited platform-wide (game_id is null) reviews.
create unique index reviews_one_platform_wide_per_identity
  on public.reviews (identity_id)
  where game_id is null;

create unique index reviews_one_per_identity_per_game
  on public.reviews (identity_id, game_id)
  where game_id is not null;

-- ── Query-shape indexes ────────────────────────────────────────────────────
create index reviews_approved_for_game
  on public.reviews (game_id, created_at desc)
  where status = 'approved';

create index reviews_approved_platform_wide
  on public.reviews (created_at desc)
  where status = 'approved' and game_id is null;

create index reviews_featured_feed
  on public.reviews (created_at desc)
  where status = 'approved' and is_featured;

create index reviews_pending_queue
  on public.reviews (created_at asc)
  where status = 'pending';

create index reviews_by_identity
  on public.reviews (identity_id);

-- ── updated_at bookkeeping ─────────────────────────────────────────────────
create or replace function public.reviews_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_touch_updated_at
  before update on public.reviews
  for each row
  execute function public.reviews_set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Same posture as Economy V1's policy-free tables (e.g. reward_vouchers,
-- match_economy_settlements): service_role's default RLS-bypass is not
-- treated as the boundary (this project's own documented reasoning — see
-- 20260826000000_economy_v1.sql's §13 header). The real gate is the table
-- GRANT: anon/authenticated get nothing at all, service_role gets exactly
-- the operations the server actually performs (no DELETE — reviews are
-- never physically removed, only transitioned to `rejected`).
alter table public.reviews enable row level security;
alter table public.reviews force row level security;

revoke all on table public.reviews from public, anon, authenticated, service_role;
grant select, insert, update on table public.reviews to service_role;

-- No policies: anon/authenticated have zero table-level grants, so no
-- policy could ever apply to them. All reads (including "approved reviews
-- for game X") are server-mediated through this same service-role
-- connection, filtering on `status = 'approved'` in application code —
-- never bypassable from the client because the client never reaches this
-- table directly.
