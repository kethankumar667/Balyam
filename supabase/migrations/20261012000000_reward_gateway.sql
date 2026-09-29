-- BHALYAM reward gateway — vesting, risk states and an audit trail.
--
-- Run once (SQL Editor -> paste -> Run, or `supabase db push`). Re-runnable:
-- every statement is guarded, so applying it twice changes nothing. It depends on
-- 20260818000000_progression_persistence.sql (player_identities, owns_player_row).
--
-- ── What this is for ─────────────────────────────────────────────────────
-- Coins for playing (level milestones, daily streaks) used to be credited to a
-- wallet the instant they were earned, by whichever service earned them, with no
-- record of WHY beyond a ledger description. That made three things impossible:
--   * holding a reward for a day so abuse checks can look at it,
--   * pausing an account's rewards without touching its wallet, and
--   * answering "why did this player get, or not get, these coins?".
--
-- A reward is now a ROW here first (reward_ledger) and reaches the wallet only by
-- being released from that row. Risk decisions about an account live beside it
-- (account_risk) with an append-only history (risk_events).
--
-- ── What is deliberately NOT here ────────────────────────────────────────
-- * The wallet. Coins still live in the economy tables; a released reward
--   references the wallet ledger entry that paid it (ledger_entry_id) and is
--   paid through the same idempotent admin-credit path as before, keyed on the
--   reward id, so a redriven release can never credit twice.
-- * Any device, browser, IP or location signal. Risk here is computed from the
--   matches and rewards the server already holds. Adding such signals is a
--   privacy-notice and consent decision, not a schema one.
--
-- ── RLS posture ──────────────────────────────────────────────────────────
-- Same as progression: enabled AND forced, service role writes, no client
-- INSERT/UPDATE/DELETE policy. A signed-in member may read their OWN rewards
-- (so the app can show a pending reward and when it arrives). account_risk and
-- risk_events have NO client policy at all: an account's risk state is not
-- something a player reads directly, and it is not something they can write.

-- ═══════════════════════════ 1. reward_ledger ═══════════════════════════

create table if not exists public.reward_ledger (
  reward_id           text primary key,
  player_id           text not null references public.player_identities (player_id) on delete cascade,
  reward_type         text not null check (reward_type in (
                        'LEVEL_MILESTONE', 'DAILY_STREAK', 'ACHIEVEMENT', 'TOURNAMENT',
                        'SEASONAL', 'REFERRAL', 'MANDALI')),
  -- Why it was granted, as a code the app and an operator both read.
  reason_code         text not null,
  amount              integer not null check (amount > 0),
  -- What earned it (`level:5`, a streak day's UTC date). With reward_type and
  -- player_id it is the idempotency key: the database refuses a second grant.
  source_id           text not null,
  earned_at           timestamptz not null default now(),
  vesting_until       timestamptz not null,
  status              text not null default 'PENDING'
                        check (status in ('PENDING', 'RELEASING', 'RELEASED', 'VOIDED')),
  -- The player's risk state when it was earned. Evidence, not a live lookup.
  risk_state          text not null default 'NORMAL'
                        check (risk_state in ('NORMAL', 'WATCHLIST', 'RESTRICTED', 'UNDER_REVIEW')),
  -- The wallet ledger entry that paid it. Null until released.
  ledger_entry_id     bigint,
  release_started_at  timestamptz,
  released_at         timestamptz,
  voided_reason       text,
  description         text not null default '',

  constraint reward_source_unique unique (player_id, reward_type, source_id),
  constraint reward_reason_length check (char_length(reason_code) between 1 and 64),
  constraint reward_description_length check (char_length(description) <= 200),
  constraint reward_voided_reason_length check (voided_reason is null or char_length(voided_reason) <= 200),
  -- A state and its timestamp travel together; a row that says RELEASED without
  -- a release time (or VOIDED without a reason) is a bug worth failing on.
  constraint reward_releasing_has_start check (status <> 'RELEASING' or release_started_at is not null),
  constraint reward_released_has_time check (status <> 'RELEASED' or released_at is not null),
  constraint reward_voided_has_reason check (status <> 'VOIDED' or voided_reason is not null),
  -- Only a PENDING reward may still be unpaid; a VOIDED one was never paid.
  constraint reward_voided_never_paid check (status <> 'VOIDED' or ledger_entry_id is null)
);

comment on table public.reward_ledger is
  'Every coin reward, from earned to paid (or voided). A reward reaches the wallet only by being released from this table.';

-- The sweeper's question, asked every minute: what has finished vesting?
create index if not exists reward_due_idx
  on public.reward_ledger (vesting_until)
  where status = 'PENDING';

-- A payment that died mid-way is found by its claim time.
create index if not exists reward_releasing_idx
  on public.reward_ledger (release_started_at)
  where status = 'RELEASING';

create index if not exists reward_player_time_idx
  on public.reward_ledger (player_id, earned_at desc);

-- Rebuilding "already claimed" at boot reads one type at a time, oldest first.
create index if not exists reward_type_time_idx
  on public.reward_ledger (reward_type, earned_at, reward_id);

-- ═══════════════════════════ 2. account_risk ═══════════════════════════

create table if not exists public.account_risk (
  player_id     text primary key references public.player_identities (player_id) on delete cascade,
  state         text not null check (state in ('NORMAL', 'WATCHLIST', 'RESTRICTED', 'UNDER_REVIEW')),
  reason_codes  text[] not null default '{}',
  updated_at    timestamptz not null default now(),
  -- 'system' for the one automatic rule (repeated abnormal sessions -> WATCHLIST),
  -- otherwise the operator who made the decision.
  updated_by    text not null,

  constraint account_risk_actor_length check (char_length(updated_by) between 1 and 128)
);

comment on table public.account_risk is
  'Where each flagged account stands. Only the server reads or writes it; there is no client policy.';

create index if not exists account_risk_state_idx
  on public.account_risk (state, updated_at desc)
  where state <> 'NORMAL';

-- ═══════════════════════════ 3. risk_events ═══════════════════════════

create table if not exists public.risk_events (
  id           bigserial primary key,
  player_id    text not null references public.player_identities (player_id) on delete cascade,
  kind         text not null check (kind in ('STATE_CHANGED', 'ABNORMAL_SESSION', 'REWARD_VOIDED')),
  reason_code  text not null,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),

  constraint risk_event_reason_length check (char_length(reason_code) between 1 and 64)
);

comment on table public.risk_events is
  'Append-only. Who or what changed an account''s standing, when, and why — the answer to "why was my reward held?".';

create index if not exists risk_events_player_time_idx
  on public.risk_events (player_id, created_at desc);

-- Rebuilding today's abnormal-session counts at boot reads one kind since a time.
create index if not exists risk_events_kind_time_idx
  on public.risk_events (kind, created_at desc);

-- ═══════════════════════════ 4. RLS ═══════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['reward_ledger', 'account_risk', 'risk_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('drop policy if exists "own rows readable" on public.%I', t);
  end loop;

  -- A member may read their own rewards, so the app can show what is pending
  -- and when it arrives. Nothing else, and nobody may write.
  execute 'create policy "own rows readable" on public.reward_ledger for select to authenticated using (public.owns_player_row(player_id))';
  -- Column grant, not table grant: risk_state records the account's standing when the
  -- reward was earned, and a watch is never announced to the player.
  execute 'grant select (reward_id, player_id, reward_type, reason_code, amount, source_id, earned_at, vesting_until, status, released_at, description) on table public.reward_ledger to authenticated';
end;
$$;

-- The serial column's sequence follows the table's grants; keep it server-only too.
revoke all on sequence public.risk_events_id_seq from public, anon, authenticated;
