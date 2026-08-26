-- BHALYAM Economy V1 — Authoritative Virtual Currency & Match Settlements
--
-- Migration: 20260826000000_economy_v1.sql
-- Status: REMEDIATED DRAFT — NOT APPROVED OR APPLIED. This is a rewrite that
-- resolves every BLOCKER and HIGH finding from the independent NO-GO audit of
-- the previous draft. It has not itself been re-audited. Do not run
-- `supabase db push` against this file until that re-audit happens.
--
-- ── What changed since the NO-GO audit, and why ────────────────────────────
-- Each numbered item names the audit finding it resolves.
--
-- B1/B2 (service_role had blanket table access; the local test environment
--   could not detect it because it never reproduced the real project's
--   inherited default privileges): every table now explicitly REVOKEs
--   INSERT/UPDATE/DELETE from service_role too, not just anon/authenticated —
--   see §7. This project's own history is why: `alter default privileges in
--   schema public grant select, insert, update, delete on tables to
--   service_role;` was run against the real project on 2026-08-26 to unblock
--   the progression migration, and that default privilege silently reaches
--   every table any future migration creates unless it is explicitly undone.
--   scripts/economy/verifyEconomySchema.mjs now reproduces that exact grant
--   in its local test database BEFORE applying this migration, specifically
--   so a passing test means something.
--
-- B3 (player_identities -> coin_wallets was ON DELETE CASCADE, but
--   coin_wallets -> coin_ledger_entries was ON DELETE RESTRICT, so deleting
--   any identity that ever transacted — which is every identity, because of
--   the starter grant — always failed): Economy V1's identity-deletion
--   policy is now explicit (§4a): an identity with economy history is never
--   physically deleted. Both foreign keys are RESTRICT. Personal-data erasure
--   is a `player_profiles` anonymization concern (a different table, already
--   owned by 20260818000000_progression_persistence.sql), not something this
--   migration performs or blocks.
--
-- B4 (world_bank_accounts had one `balance` column, so guest escrow liability
--   had no balance at all and bot-collection revenue was merged into base fee
--   revenue): replaced with four explicit balances — base_fee_revenue,
--   bot_prize_revenue, guest_escrow_liability, total_voucher_redeemed. See §5.
--
-- B5 (the admin plan documented balance-adjustment and wallet-freeze
--   endpoints, directly contradicting "do not add admin balance adjustment in
--   V1"): removed from every doc under docs/economy/. The read-only admin
--   plan may display `is_frozen`; it has no mutation endpoint for it.
--
-- B6 (the RoomManager integration plan proposed `await`ing economy calls
--   inside `startGame()`/`finalizeMatch()`, both of which return `void` today,
--   not `Promise<void>`): RoomManager is untouched by this remediation, as
--   instructed. A separate design proposal —
--   docs/economy/roommanager-async-boundary-proposal.md — evaluates the
--   sync/async boundary question without implementing it.
--
-- H1 (an "automatic refund sweep" was described in docs but does not exist):
--   replaced with a READ-ONLY `list_stale_committed_settlements()` function
--   (§9) and the documentation now says plainly that no automatic sweep
--   exists — a human/ops process decides whether to call `refund_match_entry`
--   for anything it lists.
-- H2 (`quote_match_checkout` was silently absent from the 9 required
--   functions): documented explicitly as an application-level, non-RPC
--   concern in docs/economy/economy-v1.md §6a, not implemented here.
-- H3 (`is_frozen` existed but nothing enforced it): now enforced in
--   `commit_match_entry` and `redeem_reward_voucher` — see §6/frozen-wallet
--   matrix in the remediation report.
-- H4 (the documented `{applied, ...}` idempotency contract did not match any
--   function's actual return type): every mutating RPC below now returns
--   `jsonb` shaped `{applied, operation, idempotencyKey, result}` — see §8.
-- H5 (voucher raw-code entropy was a promise about code that doesn't exist):
--   this migration still never generates or sees a raw code — that has not
--   changed, and cannot change here, because the generator is future server
--   code. What changed is the documentation no longer implies the database
--   guarantees entropy it cannot see.
--
-- M1 (`lifetime_spent` was decremented on refund, breaking its own meaning
--   as a monotonic counter): refunds now credit a separate, also-monotonic
--   `lifetime_refunded` column. `lifetime_spent` never decreases.
-- M2 (no constraint tied the lifetime_* columns to `balance`): added
--   `coin_wallets_balance_reconciles`, a declarative CHECK.
-- M3 (`ensure_wallet` wrote directly into `player_identities`, a table this
--   migration doesn't own — auto-provisioning a guest identity on demand for
--   any p_identity_id matching `guest\_%`): RESOLVED in this pass, not
--   deferred. `ensure_wallet` now REQUIRES an existing `player_identities`
--   row and raises `IDENTITY_NOT_FOUND` otherwise, for guests and members
--   alike — it no longer creates identity rows under any condition. Identity
--   provisioning is entirely the calling system's responsibility; the
--   economy schema only ever reads that table, never writes to it. See §1a.
-- M5 (`hashtext()`, 32-bit, for advisory lock keys): replaced everywhere with
--   `hashtextextended(key, 0)`, 64-bit — see §10.
-- M6 (`settle_match_economy` had no way to know a ranking was invalid, so
--   "invalid ranking -> refund" was entirely the unwritten caller's
--   responsibility): `settle_match_economy` now takes `p_is_valid_ranking`
--   and refunds internally, via the same helper `refund_match_entry` uses,
--   when it is false.
--
-- Ledger model (Phase 2): `coin_ledger_entries` gained `balance_before`,
--   `wallet_version_before`, `wallet_version_after`, and two CHECK
--   constraints enforcing `balance_after = balance_before + amount` and
--   `wallet_version_after = wallet_version_before + 1`. `GUEST_PRIZE_ESCROW`
--   is REMOVED from `coin_ledger_entries.entry_type` — a guest's wallet never
--   changes when they win, so it never belonged on the WALLET ledger. The
--   guest-prize event is now recorded only where money actually moved:
--   `world_bank_ledger` (GUEST_ESCROW_DEPOSIT), `reward_vouchers` (the
--   liability instrument itself), and `match_economy_participants` /
--   `match_economy_settlements` (the per-match record).
--
-- Voucher hardening (Phase 7): `issue_guest_voucher` no longer has an
--   `on conflict (code_hash) do update` — a hash collision is now a hard
--   failure (a real unique-violation exception), never a silent overwrite.
--   `code_hash` must be exactly 64 hex characters (a SHA-256/HMAC-SHA256
--   digest), not merely ">= 32".
--
-- Final certification pass (2026-08-26, second remediation round):
-- (a) settle_match_economy's participant loop previously had no `else`
--   branch — an unrecognized identityKind was silently skipped (no row, no
--   error), surfacing only indirectly via SETTLEMENT_CONSERVATION_VIOLATION
--   if the dropped participant had a nonzero prize, or with no trace at all
--   if it did not. Now raises INVALID_IDENTITY_KIND explicitly — see §12.4.
-- (b) ensure_wallet's guest auto-provisioning is removed (see M3 above) —
--   every caller must now supply an identity_id that already has a
--   player_identities row, for both guests and members.
-- (c) Because a PL/pgSQL function has no exception handler here, any raised
--   exception (including the two above) aborts the enclosing transaction in
--   full — a settlement that fails partway through never leaves a partial
--   wallet credit, ledger row, or participant row behind. Verified directly
--   in scripts/economy/verifyEconomySchema.mjs rather than only assumed from
--   Postgres semantics.
--
-- Bigint transport remediation (2026-08-26, Phase 4 finding, closed here —
-- see docs/economy/economy-v1-bigint-transport-remediation-proposal.md):
-- PostgREST's own to_jsonb()/row_to_json() emit every `bigint` column as a
-- bare JSON number, which a standard JSON.parse() (SupabaseEconomyRepository's
-- transport) parses as an IEEE-754 double — losing precision past 2^53,
-- before any application code runs. Storage remains `bigint` throughout;
-- only the SERIALIZED representation changes. Two mechanisms, see §11a:
-- (a) one read-only `*_safe` view per table SupabaseEconomyRepository reads
--     directly, every bigint column cast `::text`; `ensure_wallet` and
--     `list_stale_committed_settlements` now return the view's composite
--     type instead of the base table's;
-- (b) three internal-only helpers (`wallet_to_safe_jsonb`,
--     `settlement_to_safe_jsonb`, `voucher_to_safe_jsonb`) replacing every
--     `to_jsonb(row)` call inside the jsonb-envelope-returning RPCs;
--     `reconcile_match_settlement`'s TABLE-returning columns are `text`,
--     not `bigint`, for the same reason a `to_jsonb` fix alone would not
--     touch a function's own declared output column types.
-- This migration has never been applied anywhere outside ephemeral local
-- verification harnesses (no `supabase db push` has ever run against it,
-- local or remote) — modified in place rather than via a follow-up
-- migration, since there is no live deployment history to preserve.
--
-- Tie-breaking (Phase 12): the previous drafts' documentation described
--   per-game secondary tie-breakers (join time, card count, ...) for
--   non-winning placements. That was never actually approved — Decision 6
--   only approved "no valid ranked result -> refund, no splitting." Every
--   doc referencing engine-specific tie-breaking has been corrected: ANY
--   placement ambiguity at a paid position is, for V1, "not a valid ranked
--   result," full stop.
--
-- ── What this migration still does NOT do (unchanged, by design) ──────────
-- No repository, no API route, no RoomManager wiring, no UI, no automatic
-- crash-recovery sweep, no admin balance-adjustment capability, no voucher
-- code generation. Every one of those is explicitly out of scope for this
-- remediation pass — see CONSTRAINTS in the remediation request this
-- migration was written to satisfy.

-- ═══════════════════════ 1. Economy Configurations ═══════════════════════

create table if not exists public.economy_configurations (
  id                    text primary key default 'active',
  version               integer not null default 1,
  guest_starter_coins   bigint not null default 2000 check (guest_starter_coins >= 0),
  member_starter_coins  bigint not null default 5000 check (member_starter_coins >= 0),
  seat_cost_coins       bigint not null default 100 check (seat_cost_coins > 0),
  is_active             boolean not null default true,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint economy_config_version_positive check (version >= 1)
);

comment on table public.economy_configurations is
  'Active and historical global economy parameters for BHALYAM. Selection rule: the single row with is_active = true. A settlement snapshots the row it used (see match_economy_settlements.config_snapshot); later changes here never alter a past settlement.';

create unique index if not exists economy_configurations_active_idx
  on public.economy_configurations ((1))
  where is_active = true;

-- ═══════════════════════ 2. Economy Prize Schedules ═══════════════════════

create table if not exists public.economy_prize_schedules (
  id                 serial primary key,
  config_version     integer not null default 1,
  seat_count         integer not null check (seat_count between 1 and 5),
  collected_coins    bigint not null check (collected_coins >= 0),
  first_place_coins  bigint not null default 0 check (first_place_coins >= 0),
  second_place_coins bigint not null default 0 check (second_place_coins >= 0),
  third_place_coins  bigint not null default 0 check (third_place_coins >= 0),
  world_bank_coins   bigint not null check (world_bank_coins >= 0),
  created_at         timestamptz not null default now(),

  constraint prize_schedule_conservation check (
    collected_coins = first_place_coins + second_place_coins + third_place_coins + world_bank_coins
  )
);

comment on table public.economy_prize_schedules is
  'Deterministic payout schedules per seat count. A seat count with no row here is UNSUPPORTED — checkout is rejected, never a dynamically invented schedule.';

create unique index if not exists economy_prize_schedules_version_seats_idx
  on public.economy_prize_schedules (config_version, seat_count);

-- ═══════════════════════ 3. World Bank Treasury Account ═══════════════════
--
-- Four separate balances, not one. This is the direct fix for audit finding
-- B4/B5(World Bank): the previous draft's single `balance` column merged
-- base match-fee revenue with bot-placement revenue (contradicting decision
-- 5's "do not silently merge it into the base match fee") and had NO column
-- at all for guest escrow liability (contradicting decision 9's "guest
-- escrow is a liability, not revenue" and "maintain separate balances").

create table if not exists public.world_bank_accounts (
  id                      text primary key default 'primary',
  name                    text not null default 'BHALYAM World Bank Treasury',
  -- Money BHALYAM has earned from the base per-seat fee (multiplayer rooms)
  -- and from paid solo sessions (tagged separately in the ledger, see §4,
  -- but pooled into this same revenue balance — a solo session is still
  -- BHALYAM's own money, just labeled distinctly for reporting).
  base_fee_revenue        bigint not null default 0 check (base_fee_revenue >= 0),
  -- Money BHALYAM has earned because a bot occupied a rewarded placement.
  -- Also BHALYAM's own money, kept apart from base_fee_revenue so "how much
  -- of our revenue came from bots winning" is a column read, not a re-derived
  -- ledger query.
  bot_prize_revenue       bigint not null default 0 check (bot_prize_revenue >= 0),
  -- Money BHALYAM is HOLDING for a guest, not money BHALYAM HAS. Increases
  -- when a guest prize is escrowed, decreases when the matching voucher is
  -- redeemed. Never counted toward revenue anywhere in this schema.
  guest_escrow_liability  bigint not null default 0 check (guest_escrow_liability >= 0),
  -- Lifetime total of escrow that has actually been redeemed (paid out to a
  -- registered member). A running total, never decreases.
  total_voucher_redeemed  bigint not null default 0 check (total_voucher_redeemed >= 0),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint world_bank_singleton check (id = 'primary')
);

comment on table public.world_bank_accounts is
  'Singleton platform treasury (id = ''primary'' is the only row the check constraint allows). Four balances, not one: base_fee_revenue and bot_prize_revenue are BHALYAM''s own money; guest_escrow_liability is money BHALYAM is holding, not money BHALYAM has.';

-- ═══════════════════════ 4. World Bank Ledger ═════════════════════════════

create table if not exists public.world_bank_ledger (
  id                     bigserial primary key,
  account_id             text not null references public.world_bank_accounts (id) on delete restrict,
  -- Which of the four balances this row moved, and by how much. Exactly one
  -- of base_fee_revenue / bot_prize_revenue / guest_escrow_liability /
  -- total_voucher_redeemed changes per row — see the trigger in §11.
  affected_balance       text not null check (affected_balance in (
                            'base_fee_revenue', 'bot_prize_revenue',
                            'guest_escrow_liability', 'total_voucher_redeemed'
                          )),
  amount                 bigint not null check (amount <> 0),
  balance_before         bigint not null check (balance_before >= 0),
  balance_after          bigint not null check (balance_after >= 0),
  entry_type             text not null check (entry_type in (
                            'BASE_FEE_REVENUE',
                            'SOLO_ENTRY_COLLECTION',
                            'BOT_PRIZE_REVENUE',
                            'GUEST_ESCROW_DEPOSIT',
                            'GUEST_ESCROW_REDEMPTION',
                            'ADMIN_CORRECTION'
                          )),
  source_kind            text not null,
  source_id              text not null,
  idempotency_key        text not null unique,
  description            text not null,
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),

  constraint world_bank_ledger_balance_transition check (balance_after = balance_before + amount),
  constraint world_bank_ledger_description_length check (char_length(description) <= 255)
);

comment on table public.world_bank_ledger is
  'Immutable. SOLO_ENTRY_COLLECTION is its own entry_type (a solo session''s fee is still base_fee_revenue, but tagged distinctly from a multiplayer room''s BASE_FEE_REVENUE for reporting — Phase 12 correction). ADMIN_CORRECTION exists for a documented, manual, human-operator SQL intervention ONLY — no function in this migration ever writes it; there is no admin-adjustment endpoint in Economy V1.';

create index if not exists world_bank_ledger_time_idx on public.world_bank_ledger (created_at desc);
create index if not exists world_bank_ledger_source_idx on public.world_bank_ledger (source_kind, source_id);
create index if not exists world_bank_ledger_balance_idx on public.world_bank_ledger (affected_balance, created_at desc);

-- ═══════════════════════ 5. Player Coin Wallets ═══════════════════════════

create table if not exists public.coin_wallets (
  -- ON DELETE RESTRICT, not CASCADE (audit finding B3): Economy V1's identity
  -- deletion policy is that an identity with economy history is never
  -- physically deleted (see the migration header and
  -- docs/economy/economy-v1.md §4a for the full erasure strategy). Making
  -- this RESTRICT is what actually enforces that policy at the database
  -- level, rather than merely documenting it.
  identity_id       text primary key references public.player_identities (player_id) on delete restrict,
  identity_kind     text not null check (identity_kind in ('member', 'guest')),
  balance           bigint not null default 0 check (balance >= 0),
  -- Optimistic-concurrency / audit counter. Every mutation increments this by
  -- exactly 1 in the SAME transaction as its ledger row — see
  -- coin_ledger_entries.wallet_version_before/after below.
  version           bigint not null default 0 check (version >= 0),
  lifetime_granted  bigint not null default 0 check (lifetime_granted >= 0),
  lifetime_earned   bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_spent    bigint not null default 0 check (lifetime_spent >= 0),
  -- Separate from lifetime_spent (audit finding M1): a refund must not
  -- decrease lifetime_spent, or that counter stops meaning "total ever
  -- spent" and silently becomes "net spent." Refunds credit THIS column.
  lifetime_refunded bigint not null default 0 check (lifetime_refunded >= 0),
  starter_granted   boolean not null default false,
  -- Frozen-wallet policy (approved): a frozen wallet cannot spend (commit a
  -- match entry) or redeem a voucher. It CAN still receive match rewards and
  -- refunds — freezing is about stopping outbound risk, not punishing a
  -- player out of money they're owed. Enforced in commit_match_entry and
  -- redeem_reward_voucher; NOT enforced (deliberately) in
  -- settle_match_economy's credit paths or refund_match_entry.
  is_frozen         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Ties every lifetime counter to the spendable balance declaratively
  -- (audit finding M2) rather than trusting application code to keep them in
  -- sync. granted + earned + refunded - spent must always equal balance.
  constraint coin_wallets_balance_reconciles check (
    balance = lifetime_granted + lifetime_earned + lifetime_refunded - lifetime_spent
  )
);

comment on table public.coin_wallets is
  'Authoritative coin balances per player identity. Zero float, non-negative enforced, and every lifetime_* counter is tied to balance by a single CHECK constraint rather than trusted to stay in sync on its own.';

create index if not exists coin_wallets_kind_balance_idx on public.coin_wallets (identity_kind, balance desc);
create index if not exists coin_wallets_frozen_idx on public.coin_wallets (is_frozen) where is_frozen = true;

-- ═══════════════════════ 6. Coin Ledger Entries ═══════════════════════════
--
-- Represents WALLET mutations only (audit finding, Phase 2). A guest winning
-- a prize does NOT produce a row here, because a guest's wallet balance does
-- not change when they win — see world_bank_ledger (GUEST_ESCROW_DEPOSIT),
-- reward_vouchers, and match_economy_participants for where that event is
-- actually recorded.

create table if not exists public.coin_ledger_entries (
  id                     bigserial primary key,
  wallet_id              text not null references public.coin_wallets (identity_id) on delete restrict,
  amount                 bigint not null check (amount <> 0),
  balance_before         bigint not null check (balance_before >= 0),
  balance_after          bigint not null check (balance_after >= 0),
  wallet_version_before  bigint not null check (wallet_version_before >= 0),
  wallet_version_after   bigint not null check (wallet_version_after >= 0),
  entry_type             text not null check (entry_type in (
                            'STARTER_GRANT',
                            'ROOM_ENTRY_DEBIT',
                            'SOLO_ENTRY_DEBIT',
                            'BOT_ENTRY_DEBIT',
                            'MATCH_PRIZE_CREDIT',
                            'VOUCHER_REDEMPTION',
                            'MATCH_REFUND',
                            'ADMIN_ADJUSTMENT'
                          )),
  source_kind            text not null,
  source_id              text not null,
  idempotency_key        text not null unique,
  description            text not null,
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),

  -- The two invariants that make this an explanation, not just a log.
  constraint coin_ledger_balance_transition check (balance_after = balance_before + amount),
  constraint coin_ledger_version_transition check (wallet_version_after = wallet_version_before + 1),
  constraint coin_ledger_description_length check (char_length(description) <= 255)
);

comment on table public.coin_ledger_entries is
  'Immutable. Every row explains a real wallet balance AND version transition — balance_after = balance_before + amount and wallet_version_after = wallet_version_before + 1 are both enforced, not just documented. ADMIN_ADJUSTMENT exists for a documented, manual, human-operator intervention ONLY; no function in this migration writes it.';

create index if not exists coin_ledger_wallet_time_idx on public.coin_ledger_entries (wallet_id, created_at desc);
create index if not exists coin_ledger_source_idx on public.coin_ledger_entries (source_kind, source_id);

-- ═══════════════════════ 7. Reward Vouchers (Guest Escrow) ════════════════

create table if not exists public.reward_vouchers (
  id                      text primary key,
  -- Exactly 64 hex characters: a SHA-256 or HMAC-SHA256 digest, hex-encoded.
  -- Not merely "long enough" — a specific expected shape, so a malformed or
  -- truncated hash is rejected at the schema level rather than accepted and
  -- discovered broken later. The RAW CODE THIS IS A HASH OF IS NEVER SEEN BY
  -- THIS MIGRATION — see the header comment and
  -- docs/economy/economy-v1.md §voucher-security for what future server code
  -- is required to guarantee about how that raw code is generated. This
  -- schema can enforce hash SHAPE; it cannot and does not claim to enforce
  -- entropy.
  code_hash               text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  coin_amount             bigint not null check (coin_amount > 0),
  match_id                text not null,
  issued_to_guest_id      text not null references public.player_identities (player_id) on delete restrict,
  status                  text not null default 'ACTIVE' check (status in ('ACTIVE', 'REDEEMED', 'CANCELLED')),
  redeemed_by_member_id   text references public.player_identities (player_id) on delete restrict,
  redeemed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint voucher_redemption_binding check (
    (status = 'REDEEMED' and redeemed_by_member_id is not null and redeemed_at is not null) or
    (status <> 'REDEEMED' and redeemed_by_member_id is null and redeemed_at is null)
  )
);

comment on table public.reward_vouchers is
  'Bearer vouchers for guest winnings, held in escrow. code_hash is the ONLY stored form of the code — this table (and this migration) never sees the raw code. A code_hash collision on INSERT is a hard failure (real unique-violation exception), never a silent update — see issue_guest_voucher.';

create index if not exists reward_vouchers_guest_idx on public.reward_vouchers (issued_to_guest_id, status);
create index if not exists reward_vouchers_redeemer_idx on public.reward_vouchers (redeemed_by_member_id) where redeemed_by_member_id is not null;
create index if not exists reward_vouchers_match_idx on public.reward_vouchers (match_id);

-- ═══════════════════════ 8. Match Economy Settlements ═════════════════════

create table if not exists public.match_economy_settlements (
  match_id                text primary key,
  room_code               text not null,
  host_identity_id        text not null references public.player_identities (player_id) on delete restrict,
  seat_count              integer not null check (seat_count between 1 and 5),
  human_seat_count        integer not null check (human_seat_count >= 0),
  bot_seat_count          integer not null check (bot_seat_count >= 0),
  cost_per_seat           bigint not null check (cost_per_seat > 0),
  total_collected         bigint not null check (total_collected >= 0),
  total_wallet_rewarded   bigint not null default 0 check (total_wallet_rewarded >= 0),
  total_guest_escrow      bigint not null default 0 check (total_guest_escrow >= 0),
  total_bot_collection    bigint not null default 0 check (total_bot_collection >= 0),
  total_world_bank_cut    bigint not null default 0 check (total_world_bank_cut >= 0),
  total_refunded          bigint not null default 0 check (total_refunded >= 0),
  status                  text not null default 'COMMITTED' check (status in ('COMMITTED', 'SETTLED', 'REFUNDED')),
  config_snapshot         jsonb not null default '{}'::jsonb,
  prize_schedule_snapshot jsonb not null default '{}'::jsonb,
  -- Set true by settle_match_economy when it refunds internally because
  -- p_is_valid_ranking was false (audit finding M6) — distinguishes "refunded
  -- because the ranking was invalid" from "refunded via refund_match_entry
  -- for an unrelated reason (cancellation, abandonment)" in the historical
  -- record, without needing a second status value.
  refund_reason           text,
  settled_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint seat_count_sum check (seat_count = human_seat_count + bot_seat_count),
  constraint total_collected_calc check (total_collected = seat_count * cost_per_seat),
  constraint settlement_balance_conservation check (
    status = 'COMMITTED' or
    (
      status = 'REFUNDED' and
      total_refunded = total_collected and
      total_wallet_rewarded = 0 and
      total_guest_escrow = 0 and
      total_bot_collection = 0 and
      total_world_bank_cut = 0
    ) or
    (
      status = 'SETTLED' and
      total_collected = (total_wallet_rewarded + total_guest_escrow + total_bot_collection + total_world_bank_cut) and
      total_refunded = 0
    )
  )
);

comment on table public.match_economy_settlements is
  'Authoritative financial lifecycle record of room entry funding, prize distribution, and reconciliation. The declarative settlement_balance_conservation CHECK is enforced by Postgres itself, not only asserted at runtime inside a function body.';

create index if not exists match_economy_settlements_host_idx on public.match_economy_settlements (host_identity_id, created_at desc);
create index if not exists match_economy_settlements_status_idx on public.match_economy_settlements (status, created_at desc);
-- Supports list_stale_committed_settlements (§9) without a sequential scan.
create index if not exists match_economy_settlements_committed_age_idx
  on public.match_economy_settlements (created_at) where status = 'COMMITTED';

-- ═══════════════════════ 9. Match Economy Participants ════════════════════

create table if not exists public.match_economy_participants (
  match_id        text not null references public.match_economy_settlements (match_id) on delete cascade,
  -- NOT a foreign key to player_identities: a bot participant's identity_id
  -- never has a player_identities row. A real member/guest identity_id here
  -- is still expected to be valid; that is the settlement function's
  -- responsibility, not a constraint that would otherwise have to accept
  -- fabricated bot rows.
  identity_id     text not null,
  identity_kind   text not null check (identity_kind in ('member', 'guest', 'bot')),
  placement       integer not null check (placement between 1 and 5),
  prize_coins     bigint not null default 0 check (prize_coins >= 0),
  payout_status   text not null check (payout_status in (
                    'PAID_WALLET',
                    'ESCROWED_VOUCHER',
                    'BOT_TO_WORLD_BANK',
                    'NO_PRIZE',
                    'REFUNDED'
                  )),
  voucher_id      text references public.reward_vouchers (id) on delete set null,
  created_at      timestamptz not null default now(),

  primary key (match_id, identity_id)
);

comment on table public.match_economy_participants is
  'Per-seat financial distribution outcome for a match settlement. For a guest with payout_status=ESCROWED_VOUCHER, this row plus reward_vouchers plus world_bank_ledger together are the complete record of the event — coin_ledger_entries deliberately has no row for it, because the guest wallet never changed.';

create index if not exists match_economy_participants_identity_idx on public.match_economy_participants (identity_id, created_at desc);

-- ═══════════════════════ 10. Seed Data Initialization ═════════════════════

insert into public.economy_configurations (
  id, version, guest_starter_coins, member_starter_coins, seat_cost_coins, is_active, metadata
)
values (
  'active', 1, 2000, 5000, 100, true, '{"description": "Economy V1 Standard Configuration"}'::jsonb
)
on conflict (id) do nothing;

insert into public.economy_prize_schedules (
  config_version, seat_count, collected_coins, first_place_coins, second_place_coins, third_place_coins, world_bank_coins
)
values
  (1, 1, 100, 0,   0,   0,   100), -- Solo: 100% to World Bank (tagged SOLO_ENTRY_COLLECTION, see §4)
  (1, 2, 200, 150, 0,   0,   50),
  (1, 3, 300, 150, 100, 0,   50),
  (1, 4, 400, 175, 125, 50,  50),
  (1, 5, 500, 200, 150, 100, 50)
on conflict (config_version, seat_count) do nothing;

insert into public.world_bank_accounts (id, name)
values ('primary', 'BHALYAM World Bank Treasury')
on conflict (id) do nothing;

-- ═══════════════════════ 11. Immutability & Updated_at Triggers ═══════════

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'LEDGER_IS_IMMUTABLE: % rows cannot be updated or deleted', tg_table_name;
end;
$$;

revoke all on function public.prevent_ledger_mutation() from public, anon, authenticated, service_role;

drop trigger if exists guard_coin_ledger_immutable on public.coin_ledger_entries;
create trigger guard_coin_ledger_immutable
  before update or delete on public.coin_ledger_entries
  for each row execute function public.prevent_ledger_mutation();

drop trigger if exists guard_world_bank_ledger_immutable on public.world_bank_ledger;
create trigger guard_world_bank_ledger_immutable
  before update or delete on public.world_bank_ledger
  for each row execute function public.prevent_ledger_mutation();

do $$
declare
  t text;
begin
  foreach t in array array[
    'economy_configurations', 'world_bank_accounts', 'coin_wallets',
    'reward_vouchers', 'match_economy_settlements'
  ] loop
    execute format('drop trigger if exists touch_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger touch_%s_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ═══════════════════════ 11a. Bigint-Safe Serialization ═══════════════════
--
-- Remediates the Phase 4 bigint-transport finding
-- (docs/economy/economy-v1-bigint-transport-remediation-proposal.md):
-- PostgREST's own to_jsonb()/row_to_json() emit `bigint` as a bare JSON
-- number, and a bare JSON number loses precision past 2^53 the moment a
-- standard JSON.parse() reads it — before any application code runs. Every
-- bigint-bearing value this migration exposes over PostgREST, whether via a
-- plain table read or an RPC's jsonb return, is remediated here by casting
-- to `text` at the boundary. Postgres storage remains `bigint` throughout —
-- only the SERIALIZED representation changes. `::text` on a bigint produces
-- exact base-10 digits, a leading `-` for negative values, no decimals, no
-- scientific notation, no locale formatting — precisely the wire format
-- `SupabaseEconomyRepository.ts` requires after this remediation.

-- ── Read-side: one text-casting view per table SupabaseEconomyRepository
-- reads directly (not through an RPC). A view built from a cast expression
-- is not auto-updatable in Postgres — no INSERT/UPDATE/DELETE path exists
-- through any of these without an INSTEAD OF trigger, and none is defined
-- here, so this adds no new mutation surface. The explicit revokes below
-- are defense-in-depth, matching this migration's existing style, not a
-- functional requirement.

create or replace view public.coin_wallets_safe as
select
  identity_id, identity_kind,
  balance::text as balance,
  version,
  lifetime_granted::text as lifetime_granted,
  lifetime_earned::text as lifetime_earned,
  lifetime_spent::text as lifetime_spent,
  lifetime_refunded::text as lifetime_refunded,
  starter_granted, is_frozen, updated_at
from public.coin_wallets;

create or replace view public.coin_ledger_entries_safe as
select
  id, wallet_id,
  amount::text as amount,
  balance_before::text as balance_before,
  balance_after::text as balance_after,
  wallet_version_before, wallet_version_after,
  entry_type, source_kind, source_id, idempotency_key, description, created_at
from public.coin_ledger_entries;

create or replace view public.match_economy_settlements_safe as
select
  match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
  cost_per_seat::text as cost_per_seat,
  total_collected::text as total_collected,
  total_wallet_rewarded::text as total_wallet_rewarded,
  total_guest_escrow::text as total_guest_escrow,
  total_bot_collection::text as total_bot_collection,
  total_world_bank_cut::text as total_world_bank_cut,
  total_refunded::text as total_refunded,
  refund_reason, status, settled_at, created_at, updated_at
from public.match_economy_settlements;

create or replace view public.world_bank_accounts_safe as
select
  id, name,
  base_fee_revenue::text as base_fee_revenue,
  bot_prize_revenue::text as bot_prize_revenue,
  guest_escrow_liability::text as guest_escrow_liability,
  total_voucher_redeemed::text as total_voucher_redeemed,
  created_at, updated_at
from public.world_bank_accounts;

create or replace view public.reward_vouchers_safe as
select
  id, code_hash,
  coin_amount::text as coin_amount,
  match_id, issued_to_guest_id, status, redeemed_by_member_id, redeemed_at, created_at, updated_at
from public.reward_vouchers;

create or replace view public.economy_configurations_safe as
select
  id, version,
  guest_starter_coins::text as guest_starter_coins,
  member_starter_coins::text as member_starter_coins,
  seat_cost_coins::text as seat_cost_coins,
  is_active, metadata, created_at, updated_at
from public.economy_configurations;

create or replace view public.economy_prize_schedules_safe as
select
  id, config_version, seat_count,
  collected_coins::text as collected_coins,
  first_place_coins::text as first_place_coins,
  second_place_coins::text as second_place_coins,
  third_place_coins::text as third_place_coins,
  world_bank_coins::text as world_bank_coins,
  created_at
from public.economy_prize_schedules;

do $$
declare
  v text;
begin
  foreach v in array array[
    'coin_wallets_safe', 'coin_ledger_entries_safe', 'match_economy_settlements_safe',
    'world_bank_accounts_safe', 'reward_vouchers_safe', 'economy_configurations_safe',
    'economy_prize_schedules_safe'
  ] loop
    execute format('revoke all on public.%I from public, anon, authenticated', v);
    execute format('grant select on public.%I to service_role', v);
    execute format('revoke insert, update, delete, truncate on public.%I from service_role', v);
  end loop;
end;
$$;

-- ── Write-side (RPC envelopes): three internal-only helpers, each the
-- text-safe equivalent of to_jsonb(row) for one composite type. Revoked
-- from everyone including service_role in §13, mirroring
-- economy_apply_refund/prevent_ledger_mutation exactly — callable only from
-- within another SECURITY DEFINER function's own execution context.
-- Deliberately narrower than to_jsonb(row): each includes only the columns
-- the actual RPC responses have ever exposed (config_snapshot and
-- prize_schedule_snapshot, for example, are internal settlement bookkeeping
-- never returned to a caller, so settlement_to_safe_jsonb omits them).

create or replace function public.wallet_to_safe_jsonb(w public.coin_wallets)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'identity_id', w.identity_id,
    'identity_kind', w.identity_kind,
    'balance', w.balance::text,
    'version', w.version,
    'lifetime_granted', w.lifetime_granted::text,
    'lifetime_earned', w.lifetime_earned::text,
    'lifetime_spent', w.lifetime_spent::text,
    'lifetime_refunded', w.lifetime_refunded::text,
    'starter_granted', w.starter_granted,
    'is_frozen', w.is_frozen,
    'updated_at', w.updated_at
  );
$$;

create or replace function public.settlement_to_safe_jsonb(s public.match_economy_settlements)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'match_id', s.match_id,
    'room_code', s.room_code,
    'host_identity_id', s.host_identity_id,
    'seat_count', s.seat_count,
    'human_seat_count', s.human_seat_count,
    'bot_seat_count', s.bot_seat_count,
    'cost_per_seat', s.cost_per_seat::text,
    'total_collected', s.total_collected::text,
    'total_wallet_rewarded', s.total_wallet_rewarded::text,
    'total_guest_escrow', s.total_guest_escrow::text,
    'total_bot_collection', s.total_bot_collection::text,
    'total_world_bank_cut', s.total_world_bank_cut::text,
    'total_refunded', s.total_refunded::text,
    'refund_reason', s.refund_reason,
    'status', s.status,
    'settled_at', s.settled_at,
    'created_at', s.created_at
  );
$$;

create or replace function public.voucher_to_safe_jsonb(v public.reward_vouchers)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'id', v.id,
    'code_hash', v.code_hash,
    'coin_amount', v.coin_amount::text,
    'match_id', v.match_id,
    'issued_to_guest_id', v.issued_to_guest_id,
    'status', v.status,
    'redeemed_by_member_id', v.redeemed_by_member_id,
    'redeemed_at', v.redeemed_at,
    'created_at', v.created_at
  );
$$;

-- ═══════════════════════ 12. Atomic RPC Functions ═════════════════════════
--
-- Every mutating RPC returns jsonb shaped exactly:
--   { "applied": boolean, "operation": text, "idempotencyKey": text, "result": <row as jsonb> }
-- A replay (the idempotency key already has a matching effect) returns
-- applied=false and the ORIGINAL result — never a second effect, and never a
-- bare row indistinguishable from a fresh success (audit finding H4).
--
-- Advisory lock keys use hashtextextended(key, 0), a 64-bit hash, not
-- hashtext()'s 32-bit one (audit finding M5) — lower collision probability
-- under real concurrency, at zero cost.

-- ── 1. ensure_wallet ──────────────────────────────────────────────────────
-- Internal composition helper, not a top-level business operation — it has
-- no idempotency key of its own (its effect IS idempotent, via
-- ON CONFLICT DO NOTHING plus grant_starter_coins' own row-locked check), so
-- it is NOT wrapped in the {applied, operation, ...} contract. Every
-- function below that needs a wallet to exist calls this first.
--
-- §1a — Identity provisioning boundary (final certification correction):
-- this function NEVER writes to player_identities, for guests or members.
-- An earlier draft auto-created a minimal guest row for any p_identity_id
-- matching `guest\_%`, which let economy code silently make an
-- identity-management decision it does not own. p_identity_id must now name
-- a row that already exists in player_identities — created by whatever
-- system is authoritative for identity (the auth/guest-session layer), not
-- by this migration. A missing identity is IDENTITY_NOT_FOUND, full stop,
-- regardless of what the id string looks like.
--
-- Return type is coin_wallets_safe (text-cast bigints), not coin_wallets —
-- see §11a. ensure_wallet is the one function in this file that returns a
-- single row directly rather than a jsonb envelope, so it needs its own
-- text-safe composite type rather than the wallet_to_safe_jsonb() helper
-- the jsonb-returning functions use.
create or replace function public.ensure_wallet(p_identity_id text)
returns public.coin_wallets_safe
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet public.coin_wallets;
  v_safe   public.coin_wallets_safe;
  v_kind   text;
begin
  if p_identity_id is null or char_length(trim(p_identity_id)) = 0 then
    raise exception 'INVALID_IDENTITY_ID: identity_id cannot be null or empty';
  end if;

  select kind into v_kind from public.player_identities where player_id = p_identity_id;
  if v_kind is null then
    raise exception 'IDENTITY_NOT_FOUND: player identity % is not registered', p_identity_id;
  end if;

  select * into v_wallet from public.coin_wallets where identity_id = p_identity_id;
  if not found then
    insert into public.coin_wallets (identity_id, identity_kind, balance, version, lifetime_granted, lifetime_earned, lifetime_spent, lifetime_refunded, starter_granted)
    values (p_identity_id, v_kind, 0, 0, 0, 0, 0, 0, false)
    on conflict (identity_id) do nothing;

    -- grant_starter_coins now returns jsonb (Phase 6 idempotency contract),
    -- not a wallet row — its side effect (the credit + ledger row) is what's
    -- needed here; the wallet is re-read fresh from the table afterward.
    perform public.grant_starter_coins(p_identity_id);
    select * into v_wallet from public.coin_wallets where identity_id = p_identity_id;
  end if;

  select * into v_safe from public.coin_wallets_safe where identity_id = v_wallet.identity_id;
  return v_safe;
end;
$$;

revoke all on function public.ensure_wallet(text) from public, anon, authenticated;
grant execute on function public.ensure_wallet(text) to service_role;

-- ── 2. grant_starter_coins ────────────────────────────────────────────────
create or replace function public.grant_starter_coins(p_identity_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet        public.coin_wallets;
  v_config        public.economy_configurations;
  v_grant_amount  bigint;
  v_idempotency   text := 'starter-grant:' || p_identity_id;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_identity_id for update;
  if not found then
    raise exception 'WALLET_NOT_FOUND: wallet for % does not exist', p_identity_id;
  end if;

  if v_wallet.starter_granted then
    return jsonb_build_object(
      'applied', false,
      'operation', 'grant_starter_coins',
      'idempotencyKey', v_idempotency,
      'result', public.wallet_to_safe_jsonb(v_wallet)
    );
  end if;

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  v_grant_amount := case
    when v_config is null then (case when v_wallet.identity_kind = 'guest' then 2000 else 5000 end)
    else (case when v_wallet.identity_kind = 'guest' then v_config.guest_starter_coins else v_config.member_starter_coins end)
  end;

  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + v_grant_amount,
      version = version + 1,
      lifetime_granted = lifetime_granted + v_grant_amount,
      starter_granted = true,
      updated_at = now()
  where identity_id = p_identity_id
  returning * into v_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_identity_id, v_grant_amount, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
    'STARTER_GRANT', 'starter_grant', p_identity_id, v_idempotency,
    'Authoritative starter grant (' || v_wallet.identity_kind || ')'
  );

  return jsonb_build_object(
    'applied', true,
    'operation', 'grant_starter_coins',
    'idempotencyKey', v_idempotency,
    'result', public.wallet_to_safe_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.grant_starter_coins(text) from public, anon, authenticated;
grant execute on function public.grant_starter_coins(text) to service_role;

-- ── internal: economy_apply_refund ─────────────────────────────────────
-- Shared by refund_match_entry and settle_match_economy's invalid-ranking
-- path (audit finding M6), so "refund the host" has exactly one
-- implementation. Not directly callable — both public entry points lock and
-- validate settlement status themselves before calling this.
create or replace function public.economy_apply_refund(
  p_settlement public.match_economy_settlements,
  p_idempotency_key text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_wallet public.coin_wallets;
  v_balance_before bigint;
  v_version_before bigint;
begin
  select * into v_wallet from public.coin_wallets where identity_id = p_settlement.host_identity_id for update;
  v_balance_before := v_wallet.balance;
  v_version_before := v_wallet.version;

  update public.coin_wallets
  set balance = balance + p_settlement.total_collected,
      version = version + 1,
      lifetime_refunded = lifetime_refunded + p_settlement.total_collected,
      updated_at = now()
  where identity_id = p_settlement.host_identity_id
  returning * into v_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_settlement.host_identity_id, p_settlement.total_collected, v_balance_before, v_wallet.balance,
    v_version_before, v_wallet.version, 'MATCH_REFUND', 'match', p_settlement.match_id, p_idempotency_key,
    'Refund match commitment: ' || coalesce(p_reason, 'Match aborted / invalid ranking')
  );

  update public.match_economy_settlements
  set total_refunded = p_settlement.total_collected,
      status = 'REFUNDED',
      refund_reason = p_reason,
      settled_at = now(),
      updated_at = now()
  where match_id = p_settlement.match_id
  returning * into p_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'refund_match_entry',
    'idempotencyKey', p_idempotency_key,
    'result', public.settlement_to_safe_jsonb(p_settlement)
  );
end;
$$;

revoke all on function public.economy_apply_refund(public.match_economy_settlements, text, text) from public, anon, authenticated, service_role;

-- ── 3. commit_match_entry ─────────────────────────────────────────────────
create or replace function public.commit_match_entry(
  p_match_id          text,
  p_room_code         text,
  p_host_identity_id  text,
  p_seat_count        integer,
  p_human_seat_count  integer,
  p_bot_seat_count    integer,
  p_is_solo           boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement   public.match_economy_settlements;
  v_host_wallet  public.coin_wallets;
  v_config       public.economy_configurations;
  v_schedule     public.economy_prize_schedules;
  v_total_cost   bigint;
  v_entry_type   text;
  v_idempotency  text := 'match-entry:' || p_match_id;
  v_balance_before bigint;
  v_version_before bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if found then
    return jsonb_build_object(
      'applied', false,
      'operation', 'commit_match_entry',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if p_seat_count not between 1 and 5 or
     p_human_seat_count < 0 or
     p_bot_seat_count < 0 or
     p_seat_count <> (p_human_seat_count + p_bot_seat_count) then
    raise exception 'INVALID_SEAT_CONFIGURATION: seat_count must be between 1 and 5 and match human + bot counts';
  end if;

  perform public.ensure_wallet(p_host_identity_id);

  select * into v_config from public.economy_configurations where is_active = true limit 1;
  if not found then
    raise exception 'CONFIG_NOT_FOUND: no active economy configuration';
  end if;

  select * into v_schedule from public.economy_prize_schedules
  where config_version = v_config.version and seat_count = p_seat_count limit 1;
  if not found then
    raise exception 'UNSUPPORTED_SEAT_COUNT: no prize schedule for % seats', p_seat_count;
  end if;

  v_total_cost := p_seat_count * v_config.seat_cost_coins;

  select * into v_host_wallet from public.coin_wallets where identity_id = p_host_identity_id for update;

  -- Frozen-wallet policy: a frozen wallet cannot spend. Committing a match
  -- entry is a spend, so it is refused here.
  if v_host_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: host % cannot commit a match entry while frozen', p_host_identity_id;
  end if;

  if v_host_wallet.balance < v_total_cost then
    raise exception 'INSUFFICIENT_FUNDS: host balance % is less than required commitment %',
      v_host_wallet.balance, v_total_cost;
  end if;

  v_entry_type := case
    when p_is_solo then 'SOLO_ENTRY_DEBIT'
    when p_bot_seat_count > 0 and p_human_seat_count <= 1 then 'BOT_ENTRY_DEBIT'
    else 'ROOM_ENTRY_DEBIT'
  end;

  v_balance_before := v_host_wallet.balance;
  v_version_before := v_host_wallet.version;

  update public.coin_wallets
  set balance = balance - v_total_cost,
      version = version + 1,
      lifetime_spent = lifetime_spent + v_total_cost,
      updated_at = now()
  where identity_id = p_host_identity_id
  returning * into v_host_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_host_identity_id, -v_total_cost, v_balance_before, v_host_wallet.balance, v_version_before, v_host_wallet.version,
    v_entry_type, 'match', p_match_id, v_idempotency,
    'Match commitment: ' || p_seat_count || ' seats (' || coalesce(p_room_code, 'SOLO') || ')'
  );

  insert into public.match_economy_settlements (
    match_id, room_code, host_identity_id, seat_count, human_seat_count, bot_seat_count,
    cost_per_seat, total_collected, status, config_snapshot, prize_schedule_snapshot
  ) values (
    p_match_id, coalesce(p_room_code, 'SOLO'), p_host_identity_id, p_seat_count, p_human_seat_count, p_bot_seat_count,
    v_config.seat_cost_coins, v_total_cost, 'COMMITTED', to_jsonb(v_config), to_jsonb(v_schedule)
  )
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'commit_match_entry',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.commit_match_entry(text, text, text, integer, integer, integer, boolean) to service_role;

-- ── 4. settle_match_economy ───────────────────────────────────────────────
-- p_is_valid_ranking (audit finding M6): when false, this function refunds
-- the host via the SAME internal helper refund_match_entry uses, rather than
-- requiring the (not-yet-written) caller to separately detect invalidity and
-- call a different function. Whether a given engine result IS valid is still
-- entirely the caller's determination — this function only guarantees that,
-- once told it is not, the outcome is a refund, never a partial or
-- best-effort settlement.
create or replace function public.settle_match_economy(
  p_match_id           text,
  p_is_valid_ranking   boolean,
  p_participants       jsonb,
  p_refund_reason      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement            public.match_economy_settlements;
  v_wb                    public.world_bank_accounts;
  v_participant           jsonb;
  v_identity_id           text;
  v_identity_kind         text;
  v_placement             integer;
  v_voucher_hash          text;
  v_prize                 bigint;
  v_voucher_id            text;
  v_wallet                public.coin_wallets;
  v_1st_prize             bigint;
  v_2nd_prize             bigint;
  v_3rd_prize             bigint;
  v_base_wb_cut           bigint;
  v_total_wallet_rewarded bigint := 0;
  v_total_guest_escrow    bigint := 0;
  v_total_bot_collection  bigint := 0;
  v_total_world_bank_cut  bigint := 0;
  v_idempotency           text := 'match-settlement:' || p_match_id;
  v_balance_before        bigint;
  v_version_before        bigint;
  v_wb_balance_before     bigint;
  v_solo                  boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status in ('SETTLED', 'REFUNDED') then
    return jsonb_build_object(
      'applied', false,
      'operation', 'settle_match_economy',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if not coalesce(p_is_valid_ranking, false) then
    return public.economy_apply_refund(v_settlement, v_idempotency, coalesce(p_refund_reason, 'Invalid or tied authoritative result'));
  end if;

  v_solo := v_settlement.seat_count = 1;
  v_1st_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'first_place_coins')::bigint, 0);
  v_2nd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'second_place_coins')::bigint, 0);
  v_3rd_prize   := coalesce((v_settlement.prize_schedule_snapshot->>'third_place_coins')::bigint, 0);
  v_base_wb_cut := coalesce((v_settlement.prize_schedule_snapshot->>'world_bank_coins')::bigint, 0);

  for v_participant in select * from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) loop
    v_identity_id   := v_participant->>'identityId';
    v_identity_kind := v_participant->>'identityKind';
    v_placement     := (v_participant->>'placement')::integer;
    v_voucher_hash  := v_participant->>'voucherCodeHash';

    v_prize := case
      when v_placement = 1 then v_1st_prize
      when v_placement = 2 then v_2nd_prize
      when v_placement = 3 then v_3rd_prize
      else 0
    end;

    if v_identity_kind = 'member' then
      if v_prize > 0 then
        perform public.ensure_wallet(v_identity_id);
        select * into v_wallet from public.coin_wallets where identity_id = v_identity_id for update;
        v_balance_before := v_wallet.balance;
        v_version_before := v_wallet.version;

        update public.coin_wallets
        set balance = balance + v_prize, version = version + 1, lifetime_earned = lifetime_earned + v_prize, updated_at = now()
        where identity_id = v_identity_id
        returning * into v_wallet;

        insert into public.coin_ledger_entries (
          wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          v_identity_id, v_prize, v_balance_before, v_wallet.balance, v_version_before, v_wallet.version,
          'MATCH_PRIZE_CREDIT', 'match', p_match_id, v_idempotency || ':credit:' || v_identity_id,
          'Match placement ' || v_placement || ' prize'
        );

        v_total_wallet_rewarded := v_total_wallet_rewarded + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'member', v_placement, v_prize, 'PAID_WALLET');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'member', v_placement, 0, 'NO_PRIZE');
      end if;

    elsif v_identity_kind = 'guest' then
      if v_prize > 0 then
        if v_voucher_hash is null or v_voucher_hash !~ '^[0-9a-f]{64}$' then
          raise exception 'INVALID_VOUCHER_HASH: guest prize requires a 64-hex-character voucher code hash';
        end if;

        -- gen_random_uuid() is core Postgres (13+), not a pgcrypto function —
        -- deliberately avoids any dependency on which schema pgcrypto is
        -- installed in on the real project (an uncertainty this migration
        -- previously would have inherited had it used gen_random_bytes()).
        v_voucher_id := 'vch_' || replace(gen_random_uuid()::text, '-', '');

        -- No `on conflict` clause (audit finding, Phase 7): a code_hash
        -- collision is a hard failure, never a silent update of an existing
        -- voucher. In practice a collision means the caller reused a hash or
        -- generated one with insufficient entropy — either way, refusing
        -- loudly is correct.
        insert into public.reward_vouchers (id, code_hash, coin_amount, match_id, issued_to_guest_id, status)
        values (v_voucher_id, v_voucher_hash, v_prize, p_match_id, v_identity_id, 'ACTIVE');

        -- coin_ledger_entries deliberately gets NO row here (Phase 2 fix):
        -- the guest's wallet balance does not change. The liability is
        -- recorded on world_bank_accounts / world_bank_ledger only.
        select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
        v_wb_balance_before := v_wb.guest_escrow_liability;

        update public.world_bank_accounts
        set guest_escrow_liability = guest_escrow_liability + v_prize, updated_at = now()
        where id = 'primary'
        returning * into v_wb;

        insert into public.world_bank_ledger (
          account_id, affected_balance, amount, balance_before, balance_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          'primary', 'guest_escrow_liability', v_prize, v_wb_balance_before, v_wb.guest_escrow_liability,
          'GUEST_ESCROW_DEPOSIT', 'match', p_match_id, v_idempotency || ':escrow:' || v_identity_id,
          'Guest match prize placed in bearer voucher escrow'
        );

        v_total_guest_escrow := v_total_guest_escrow + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status, voucher_id)
        values (p_match_id, v_identity_id, 'guest', v_placement, v_prize, 'ESCROWED_VOUCHER', v_voucher_id);
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'guest', v_placement, 0, 'NO_PRIZE');
      end if;

    elsif v_identity_kind = 'bot' then
      if v_prize > 0 then
        select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
        v_wb_balance_before := v_wb.bot_prize_revenue;

        update public.world_bank_accounts
        set bot_prize_revenue = bot_prize_revenue + v_prize, updated_at = now()
        where id = 'primary'
        returning * into v_wb;

        insert into public.world_bank_ledger (
          account_id, affected_balance, amount, balance_before, balance_after,
          entry_type, source_kind, source_id, idempotency_key, description
        ) values (
          'primary', 'bot_prize_revenue', v_prize, v_wb_balance_before, v_wb.bot_prize_revenue,
          'BOT_PRIZE_REVENUE', 'match', p_match_id, v_idempotency || ':bot:' || v_placement,
          'Bot placement ' || v_placement || ' prize collection'
        );

        v_total_bot_collection := v_total_bot_collection + v_prize;

        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, v_prize, 'BOT_TO_WORLD_BANK');
      else
        insert into public.match_economy_participants (match_id, identity_id, identity_kind, placement, prize_coins, payout_status)
        values (p_match_id, v_identity_id, 'bot', v_placement, 0, 'NO_PRIZE');
      end if;
    else
      -- Final certification correction: an unrecognized identityKind used to
      -- be silently skipped here (no row written, no error raised) — a
      -- caller bug could vanish without a trace, or surface only indirectly
      -- via SETTLEMENT_CONSERVATION_VIOLATION if the dropped participant had
      -- a nonzero prize. Reject it outright instead. Because this function
      -- has no exception handler, raising here aborts the WHOLE transaction
      -- — any wallet credits or ledger rows already written earlier in this
      -- same loop iteration are rolled back too, not left half-applied.
      raise exception 'INVALID_IDENTITY_KIND: participant identityKind must be member, guest, or bot (got %)',
        coalesce(v_identity_kind, 'null');
    end if;
  end loop;

  if v_base_wb_cut > 0 then
    select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
    v_wb_balance_before := v_wb.base_fee_revenue;

    update public.world_bank_accounts
    set base_fee_revenue = base_fee_revenue + v_base_wb_cut, updated_at = now()
    where id = 'primary'
    returning * into v_wb;

    insert into public.world_bank_ledger (
      account_id, affected_balance, amount, balance_before, balance_after,
      entry_type, source_kind, source_id, idempotency_key, description
    ) values (
      'primary', 'base_fee_revenue', v_base_wb_cut, v_wb_balance_before, v_wb.base_fee_revenue,
      -- Phase 12 correction: solo sessions are tagged SOLO_ENTRY_COLLECTION,
      -- not BASE_FEE_REVENUE — still base_fee_revenue as a BALANCE, but a
      -- distinct entry_type for reporting.
      case when v_solo then 'SOLO_ENTRY_COLLECTION' else 'BASE_FEE_REVENUE' end,
      'match', p_match_id, v_idempotency || ':world-bank',
      case when v_solo then 'Solo session fee collection' else 'Base room house cut (' || v_settlement.seat_count || ' seats)' end
    );

    v_total_world_bank_cut := v_base_wb_cut;
  end if;

  if v_settlement.total_collected <> (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut) then
    raise exception 'SETTLEMENT_CONSERVATION_VIOLATION: collected % does not equal disbursed %',
      v_settlement.total_collected, (v_total_wallet_rewarded + v_total_guest_escrow + v_total_bot_collection + v_total_world_bank_cut);
  end if;

  update public.match_economy_settlements
  set total_wallet_rewarded = v_total_wallet_rewarded,
      total_guest_escrow    = v_total_guest_escrow,
      total_bot_collection  = v_total_bot_collection,
      total_world_bank_cut  = v_total_world_bank_cut,
      status                = 'SETTLED',
      settled_at            = now(),
      updated_at            = now()
  where match_id = p_match_id
  returning * into v_settlement;

  return jsonb_build_object(
    'applied', true,
    'operation', 'settle_match_economy',
    'idempotencyKey', v_idempotency,
    'result', public.settlement_to_safe_jsonb(v_settlement)
  );
end;
$$;

revoke all on function public.settle_match_economy(text, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.settle_match_economy(text, boolean, jsonb, text) to service_role;

-- ── 5. refund_match_entry ─────────────────────────────────────────────────
-- Standalone entry point for cancellation/abandonment BEFORE any settlement
-- attempt. Frozen-wallet policy does NOT apply here — a frozen wallet may
-- still receive a refund.
create or replace function public.refund_match_entry(
  p_match_id text,
  p_reason   text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_settlement  public.match_economy_settlements;
  v_idempotency text := 'match-refund:' || p_match_id;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_idempotency, 0));

  select * into v_settlement from public.match_economy_settlements where match_id = p_match_id for update;
  if not found then
    raise exception 'MATCH_NOT_COMMITTED: match settlement % not found', p_match_id;
  end if;

  if v_settlement.status = 'REFUNDED' then
    return jsonb_build_object(
      'applied', false,
      'operation', 'refund_match_entry',
      'idempotencyKey', v_idempotency,
      'result', public.settlement_to_safe_jsonb(v_settlement)
    );
  end if;

  if v_settlement.status = 'SETTLED' then
    raise exception 'MATCH_ALREADY_SETTLED: settled match % cannot be refunded', p_match_id;
  end if;

  return public.economy_apply_refund(v_settlement, v_idempotency, p_reason);
end;
$$;

revoke all on function public.refund_match_entry(text, text) from public, anon, authenticated;
grant execute on function public.refund_match_entry(text, text) to service_role;

-- ── 6. issue_guest_voucher ────────────────────────────────────────────────
-- Standalone entry point, kept for parity with the required function list —
-- settle_match_economy above does NOT call this; it inserts reward_vouchers
-- directly for the same reason ensure_wallet is composed rather than
-- indirected. Exposed separately in case a future caller needs to issue a
-- voucher outside a settlement (none does today).
create or replace function public.issue_guest_voucher(
  p_voucher_id         text,
  p_code_hash          text,
  p_coin_amount        bigint,
  p_match_id           text,
  p_issued_to_guest_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_voucher public.reward_vouchers;
  v_idempotency text := 'voucher-issue:' || p_voucher_id;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_VOUCHER_HASH: code hash must be exactly 64 hex characters';
  end if;
  if p_coin_amount <= 0 then
    raise exception 'INVALID_VOUCHER_AMOUNT: voucher coin amount must be greater than zero';
  end if;

  select * into v_voucher from public.reward_vouchers where id = p_voucher_id;
  if found then
    return jsonb_build_object(
      'applied', false,
      'operation', 'issue_guest_voucher',
      'idempotencyKey', v_idempotency,
      'result', public.voucher_to_safe_jsonb(v_voucher)
    );
  end if;

  -- No `on conflict` — a code_hash collision fails loudly (Phase 7).
  insert into public.reward_vouchers (id, code_hash, coin_amount, match_id, issued_to_guest_id, status)
  values (p_voucher_id, p_code_hash, p_coin_amount, p_match_id, p_issued_to_guest_id, 'ACTIVE')
  returning * into v_voucher;

  return jsonb_build_object(
    'applied', true,
    'operation', 'issue_guest_voucher',
    'idempotencyKey', v_idempotency,
    'result', public.voucher_to_safe_jsonb(v_voucher)
  );
end;
$$;

revoke all on function public.issue_guest_voucher(text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.issue_guest_voucher(text, text, bigint, text, text) to service_role;

-- ── 7. redeem_reward_voucher ──────────────────────────────────────────────
create or replace function public.redeem_reward_voucher(
  p_code_hash          text,
  p_member_identity_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_voucher       public.reward_vouchers;
  v_member_kind   text;
  v_member_wallet public.coin_wallets;
  v_idempotency   text;
  v_balance_before bigint;
  v_version_before bigint;
  v_wb            public.world_bank_accounts;
  v_wb_balance_before bigint;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'VOUCHER_INVALID: malformed code hash';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('voucher-redemption:' || p_code_hash, 0));

  select kind into v_member_kind from public.player_identities where player_id = p_member_identity_id;
  if v_member_kind is null or v_member_kind <> 'member' then
    raise exception 'ONLY_MEMBERS_CAN_REDEEM_VOUCHERS: identity % is not a registered member', p_member_identity_id;
  end if;

  select * into v_voucher from public.reward_vouchers where code_hash = p_code_hash for update;
  if not found then
    raise exception 'VOUCHER_NOT_FOUND: no active voucher matches code hash';
  end if;

  v_idempotency := 'voucher-redeem:' || v_voucher.id || ':' || p_member_identity_id;

  if v_voucher.status = 'REDEEMED' then
    if v_voucher.redeemed_by_member_id = p_member_identity_id then
      return jsonb_build_object(
        'applied', false,
        'operation', 'redeem_reward_voucher',
        'idempotencyKey', v_idempotency,
        'result', public.voucher_to_safe_jsonb(v_voucher)
      );
    else
      raise exception 'VOUCHER_ALREADY_REDEEMED: voucher has already been claimed by another member';
    end if;
  end if;

  if v_voucher.status <> 'ACTIVE' then
    raise exception 'VOUCHER_NOT_ACTIVE: voucher status is %', v_voucher.status;
  end if;

  perform public.ensure_wallet(p_member_identity_id);
  select * into v_member_wallet from public.coin_wallets where identity_id = p_member_identity_id for update;

  -- Frozen-wallet policy: a frozen wallet cannot redeem a voucher (this is a
  -- discretionary action the wallet owner initiates, unlike passively
  -- receiving a match reward or refund).
  if v_member_wallet.is_frozen then
    raise exception 'WALLET_FROZEN: member % cannot redeem a voucher while frozen', p_member_identity_id;
  end if;

  v_balance_before := v_member_wallet.balance;
  v_version_before := v_member_wallet.version;

  update public.coin_wallets
  set balance = balance + v_voucher.coin_amount, version = version + 1, lifetime_earned = lifetime_earned + v_voucher.coin_amount, updated_at = now()
  where identity_id = p_member_identity_id
  returning * into v_member_wallet;

  insert into public.coin_ledger_entries (
    wallet_id, amount, balance_before, balance_after, wallet_version_before, wallet_version_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    p_member_identity_id, v_voucher.coin_amount, v_balance_before, v_member_wallet.balance, v_version_before, v_member_wallet.version,
    'VOUCHER_REDEMPTION', 'voucher', v_voucher.id, v_idempotency,
    'Redeemed guest reward voucher (' || v_voucher.id || ')'
  );

  select * into v_wb from public.world_bank_accounts where id = 'primary' for update;
  v_wb_balance_before := v_wb.guest_escrow_liability;

  update public.world_bank_accounts
  set guest_escrow_liability = guest_escrow_liability - v_voucher.coin_amount,
      total_voucher_redeemed = total_voucher_redeemed + v_voucher.coin_amount,
      updated_at = now()
  where id = 'primary'
  returning * into v_wb;

  insert into public.world_bank_ledger (
    account_id, affected_balance, amount, balance_before, balance_after,
    entry_type, source_kind, source_id, idempotency_key, description
  ) values (
    'primary', 'guest_escrow_liability', -v_voucher.coin_amount, v_wb_balance_before, v_wb.guest_escrow_liability,
    'GUEST_ESCROW_REDEMPTION', 'voucher', v_voucher.id, v_idempotency || ':escrow',
    'Escrow liability released on redemption'
  );

  update public.reward_vouchers
  set status = 'REDEEMED', redeemed_by_member_id = p_member_identity_id, redeemed_at = now(), updated_at = now()
  where id = v_voucher.id
  returning * into v_voucher;

  return jsonb_build_object(
    'applied', true,
    'operation', 'redeem_reward_voucher',
    'idempotencyKey', v_idempotency,
    'result', public.voucher_to_safe_jsonb(v_voucher)
  );
end;
$$;

revoke all on function public.redeem_reward_voucher(text, text) from public, anon, authenticated;
grant execute on function public.redeem_reward_voucher(text, text) to service_role;

-- ── 8. reconcile_match_settlement ─────────────────────────────────────────
-- Read-only. `collected`/`disbursed`/`delta` are declared `text`, not
-- `bigint` — see §11a. A TABLE-returning function's declared output column
-- TYPE is what PostgREST serializes by, independent of any RPC-envelope
-- fix; a `bigint` output column here would still emit a JSON number
-- regardless of what wallet_to_safe_jsonb()/settlement_to_safe_jsonb() do
-- elsewhere. The nested `details` jsonb also has every value explicitly
-- cast — jsonb_build_object() on a bare bigint argument produces the exact
-- same bare-number problem `to_jsonb(row)` does.
create or replace function public.reconcile_match_settlement(p_match_id text)
returns table (
  match_id     text,
  status       text,
  is_balanced  boolean,
  collected    text,
  disbursed    text,
  delta        text,
  details      jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_s public.match_economy_settlements;
  v_disbursed bigint;
begin
  select * into v_s from public.match_economy_settlements mes where mes.match_id = p_match_id;
  if not found then
    raise exception 'MATCH_NOT_FOUND: match settlement % does not exist', p_match_id;
  end if;

  v_disbursed := v_s.total_wallet_rewarded + v_s.total_guest_escrow + v_s.total_bot_collection + v_s.total_world_bank_cut + v_s.total_refunded;

  return query select
    v_s.match_id,
    v_s.status,
    ((v_s.status = 'COMMITTED' and v_disbursed = 0) or (v_s.status in ('SETTLED', 'REFUNDED') and v_s.total_collected = v_disbursed)),
    v_s.total_collected::text,
    v_disbursed::text,
    (v_s.total_collected - v_disbursed)::text,
    jsonb_build_object(
      'wallet_rewarded', v_s.total_wallet_rewarded::text,
      'guest_escrow', v_s.total_guest_escrow::text,
      'bot_collection', v_s.total_bot_collection::text,
      'world_bank_cut', v_s.total_world_bank_cut::text,
      'refunded', v_s.total_refunded::text
    );
end;
$$;

revoke all on function public.reconcile_match_settlement(text) from public, anon, authenticated;
grant execute on function public.reconcile_match_settlement(text) to service_role;

-- ── 9. list_stale_committed_settlements ────────────────────────────────────
-- Read-only crash-recovery REPORT, not a recovery action (audit finding H1 /
-- Phase 9). Nothing calls this automatically, and it never mutates anything.
-- A human or an explicit, separately-triggered ops process reads this list
-- and decides — per settlement, with whatever authoritative room-state
-- evidence is available — whether to call refund_match_entry. There is no
-- automatic sweep in Economy V1.
--
-- Returns setof match_economy_settlements_safe, not match_economy_settlements
-- — see §11a. Reusing the same read-side view here, rather than a bespoke
-- jsonb reshaping, since a SETOF-of-a-view is exactly what this already-
-- read-only, already-`language sql` function needs.
create or replace function public.list_stale_committed_settlements(
  p_older_than interval default interval '1 hour'
)
returns setof public.match_economy_settlements_safe
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select * from public.match_economy_settlements_safe
  where status = 'COMMITTED' and created_at < now() - p_older_than
  order by created_at asc;
$$;

revoke all on function public.list_stale_committed_settlements(interval) from public, anon, authenticated;
grant execute on function public.list_stale_committed_settlements(interval) to service_role;

-- ═══════════════════════ 13. Function Access Governance ═══════════════════
--
-- The individual revoke/grant pairs above are the actual governance; this
-- section is a single defense-in-depth pass re-asserting the same posture,
-- so a reviewer can audit function privileges in one place without hunting
-- through §12. Re-running it changes nothing if §12 is already correct.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'ensure_wallet', 'grant_starter_coins', 'commit_match_entry', 'settle_match_economy',
        'refund_match_entry', 'issue_guest_voucher', 'redeem_reward_voucher',
        'reconcile_match_settlement', 'list_stale_committed_settlements'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;

  -- Internal-only helpers: EXECUTE granted to no one, including service_role.
  -- Callable only from inside another SECURITY DEFINER function, which runs
  -- as the function owner regardless of table/function grants.
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'economy_apply_refund', 'prevent_ledger_mutation',
      'wallet_to_safe_jsonb', 'settlement_to_safe_jsonb', 'voucher_to_safe_jsonb'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', r.sig);
  end loop;
end;
$$;

-- ═══════════════════════ 14. Table Privileges & RLS Posture ═══════════════
--
-- Audit finding B1/B2, resolved: service_role is now explicitly revoked from
-- every economy table's INSERT/UPDATE/DELETE, undoing whatever this project's
-- own `alter default privileges ... grant ... to service_role` (run
-- 2026-08-26 to unblock the progression migration) would otherwise silently
-- hand it. RLS is still enabled and forced, but it is NOT the only control —
-- table-level grants are, independently, because service_role bypasses RLS
-- by design in this project (as it must, to write progression data) and so
-- RLS alone was never going to be sufficient here.
--
-- Read access: narrow and explicit, not "service_role gets everything since
-- it needs SOME reads." SELECT is granted per-table only where a documented
-- future read path needs it (GET /api/economy/wallet, GET /api/economy/ledger,
-- and the read-only admin views). Every write path is RPC-only.

do $$
declare
  t text;
  all_economy_tables text[] := array[
    'economy_configurations',
    'economy_prize_schedules',
    'world_bank_accounts',
    'world_bank_ledger',
    'coin_wallets',
    'coin_ledger_entries',
    'reward_vouchers',
    'match_economy_settlements',
    'match_economy_participants'
  ];
begin
  foreach t in array all_economy_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- The critical line: service_role is named explicitly, not omitted.
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from public, anon, authenticated, service_role', t);
    execute format('revoke select on table public.%I from public, anon, authenticated', t);
    -- service_role keeps read access — writes are RPC-only, reads are not.
    execute format('grant select on table public.%I to service_role', t);
  end loop;

  drop policy if exists "own wallet readable" on public.coin_wallets;
  create policy "own wallet readable" on public.coin_wallets
    for select to authenticated using (public.owns_player_row(identity_id));
  grant select on table public.coin_wallets to authenticated;

  drop policy if exists "own coin ledger readable" on public.coin_ledger_entries;
  create policy "own coin ledger readable" on public.coin_ledger_entries
    for select to authenticated using (public.owns_player_row(wallet_id));
  grant select on table public.coin_ledger_entries to authenticated;

  -- economy_configurations, economy_prize_schedules, world_bank_accounts,
  -- world_bank_ledger, reward_vouchers, match_economy_settlements, and
  -- match_economy_participants have NO authenticated or anon policy.
  -- service_role reaches them for reads via the explicit SELECT grant above,
  -- not via RLS bypass alone being trusted as the boundary.
end;
$$;
