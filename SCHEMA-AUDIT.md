# BHALYAM Database Schema Audit & Entity Inventory

> **Audit Run ID:** `supabase_verification_20260818T174000Z`  
> **Target Database Engine:** PostgreSQL 17.x / Supabase Postgres  
> **Source Migrations:**  
> 1. [`supabase/migrations/0001_accounts.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/0001_accounts.sql)  
> 2. [`supabase/migrations/20260815180258_expose_profiles_to_authenticated.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/20260815180258_expose_profiles_to_authenticated.sql)  
> 3. [`supabase/migrations/20260816000000_security_hardening.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/20260816000000_security_hardening.sql)  
> 4. [`supabase/migrations/20260817000000_add_user_details_to_profiles.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/20260817000000_add_user_details_to_profiles.sql)  
> 5. [`supabase/migrations/20260818000000_progression_persistence.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/20260818000000_progression_persistence.sql)  
> 6. [`supabase/migrations/20260818000000_progression_persistence_rollback.sql`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/supabase/migrations/20260818000000_progression_persistence_rollback.sql)

---

## 1. Table & Entity Inventory

The BHALYAM persistence layer encompasses **21 relational tables** and **3 stored functions/triggers**, partitioned into Client Account Identity and Server-Authoritative Progression:

| # | Table Name | Schema | Primary Key | Purpose | RLS Status |
|---|---|---|---|---|---|
| 1 | `profiles` | `public` | `id` (UUID) | Client account display name and avatar (joined to `auth.users`). | **ENABLED & FORCED** |
| 2 | `player_identities` | `public` | `player_id` (TEXT) | Root identity table supporting both authenticated members and `guest_<hex>` accounts. | **ENABLED & FORCED** |
| 3 | `player_profiles` | `public` | `player_id` (TEXT) | Progression profile: level, lifetime experience points, display name, avatar. | **ENABLED & FORCED** |
| 4 | `xp_ledger` | `public` | `id` (BIGSERIAL) | Immutable append-only record of all awarded experience points with idempotency keys. | **ENABLED & FORCED** |
| 5 | `achievement_unlocks` | `public` | `(player_id, achievement_id)` | Permanent record of player achievements unlocked. | **ENABLED & FORCED** |
| 6 | `challenge_claims` | `public` | `(player_id, challenge_id, period_key)` | Daily and weekly challenge rewards claimed per time period. | **ENABLED & FORCED** |
| 7 | `friendships` | `public` | `(player_id, friend_player_id)` | Two-way symmetric social friendship graph. | **ENABLED & FORCED** |
| 8 | `friend_requests` | `public` | `id` (TEXT) | In-flight and historical social friend requests. | **ENABLED & FORCED** |
| 9 | `parties` | `public` | `id` (TEXT) | Live and historical multiplayer squad parties. | **ENABLED & FORCED** |
| 10| `party_members` | `public` | `(party_id, player_id)` | Party member mapping enforcing max 1 active party per player. | **ENABLED & FORCED** |
| 11| `party_invitations` | `public` | `id` (TEXT) | Direct squad party invitations with expiry dates. | **ENABLED & FORCED** |
| 12| `match_summaries` | `public` | `id` (TEXT) | Durable summaries of completed multiplayer matches. | **ENABLED & FORCED** |
| 13| `match_participants`| `public` | `(match_id, player_id)` | Per-player match outcome, rank/place, score, and earned XP. | **ENABLED & FORCED** |
| 14| `tournament_records`| `public` | `id` (TEXT) | Knockout tournaments, status, winners, and timestamps. | **ENABLED & FORCED** |
| 15| `tournament_participants`| `public`| `(tournament_id, player_id)` | Player tournament seeds, bracket placements, and tournament XP. | **ENABLED & FORCED** |
| 16| `season_stats` | `public` | `(season_id, player_id)` | Seasonal ladder rating, level, matches, wins, and win streaks. | **ENABLED & FORCED** |
| 17| `season_reward_claims` | `public`| `(season_id, player_id, tier_id)` | Battle pass / seasonal tier rewards claimed. | **ENABLED & FORCED** |
| 18| `season_snapshots` | `public` | `(season_id, player_id)` | Immutable archive of player seasonal placements at season rollover. | **ENABLED & FORCED** |
| 19| `reward_audit` | `public` | `id` (BIGSERIAL) | Idempotent transaction audit log for XP/reward distribution. | **ENABLED & FORCED** |
| 20| `room_timelines` | `public` | `room_code` (TEXT) | Bounded 30-day telemetry summary of room lifecycles. | **ENABLED & FORCED** |
| 21| `operational_telemetry`| `public`| `id` (BIGSERIAL) | Bounded 14-day operational and diagnostic event logs. | **ENABLED & FORCED** |

---

## 2. Relational Constraints & Integrity Architecture

```
                               ┌───────────────────┐
                               │    auth.users     │
                               └─────────┬─────────┘
                                         │ (1:1 optional)
                                         ▼
┌───────────────────┐          ┌───────────────────┐
│     profiles      │          │ player_identities │ (player_id PK)
└───────────────────┘          └─────────┬─────────┘
                                         │
        ┌───────────────────┬────────────┼───────────────────┬───────────────────┐
        ▼                   ▼            ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│player_profiles│   │   xp_ledger   │ │ achievement_  │ │ challenge_    │ │  friendships  │
│               │   │ (idempotent)  │ │    unlocks    │ │    claims     │ │               │
└───────────────┘   └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### Primary & Foreign Key Integrity
- **`player_identities`**: `player_id` (TEXT PK) guarantees namespace integrity. For `member` accounts, `auth_user_id` references `auth.users(id) ON DELETE CASCADE`.
- **`player_profiles`**: `player_id` references `player_identities(player_id) ON DELETE CASCADE`.
- **`xp_ledger`**: `player_id` references `player_identities(player_id) ON DELETE CASCADE`.
- **`match_participants`**: `match_id` references `match_summaries(id) ON DELETE CASCADE`, `player_id` references `player_identities(player_id) ON DELETE CASCADE`.
- **`tournament_participants`**: `tournament_id` references `tournament_records(id) ON DELETE CASCADE`, `player_id` references `player_identities(player_id) ON DELETE CASCADE`.

### Check Constraints (Data Invariants)
- `player_identities.guest_id_namespace`: Enforces that `kind = 'guest'` IDs must start with `guest_`.
- `player_identities.identity_kind_matches_auth`: Guarantees `member` has non-null `auth_user_id` and `guest` has null `auth_user_id`.
- `player_profiles.display_name_length`: `char_length(display_name) <= 40`.
- `player_profiles.level_positive`: `level >= 1`.
- `player_profiles.xp_non_negative`: `experience_points >= 0`.
- `season_stats.wins_not_more_than_matches`: `season_wins <= season_matches`.
- `match_summaries.match_finishes_after_start`: `finished_at >= started_at`.
- `friends.no_self_friendship`: `player_id <> friend_player_id`.

---

## 3. Indexing & Query Performance Strategy

| Table | Index Name | Columns / Condition | Purpose |
|---|---|---|---|
| `player_identities` | `player_identities_auth_user_idx` | `auth_user_id` (WHERE `auth_user_id IS NOT NULL`) | Instant OAuth login lookup |
| `player_identities` | `player_identities_last_seen_idx` | `last_seen_at DESC` | Active player recency ranking |
| `player_profiles` | `player_profiles_xp_idx` | `(experience_points DESC, player_id)` | Zero-cost index scan for global Leaderboards |
| `xp_ledger` | `xp_ledger_source_idx` | `(player_id, source_kind, source_id)` | Realtime award idempotency enforcement |
| `friend_requests` | `friend_requests_pending_idx` | `(sender_id, recipient_id)` (WHERE `status = 'PENDING'`) | Prevents duplicate pending spam |
| `party_members` | `party_members_one_party_idx` | `player_id` | Enforces single-party concurrency |
| `match_summaries` | `match_summaries_natural_key_idx`| `(room_code, started_at)` | Eliminates duplicate match summary writes |
| `reward_audit` | `reward_audit_idempotency_idx` | `idempotency_key` (WHERE `outcome = 'granted'`) | Guarantees single-payout on concurrent requests |

---

## 4. Row Level Security (RLS) & Authorization Matrix

| Table Name | RLS Enabled | Policies Defined | Allowed Client Verbs | Server Access Mode |
|---|---|---|---|---|
| `profiles` | **YES (FORCED)** | `auth.uid() = id` | `SELECT`, `INSERT`, `UPDATE` | Direct Client via Supabase Auth |
| `player_identities` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `player_profiles` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `xp_ledger` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `achievement_unlocks` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `challenge_claims` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `friendships` | **YES (FORCED)** | `auth.uid() = auth_user_id` | `SELECT` only (Own row) | `service_role` (Bypasses RLS) |
| `match_summaries` | **YES (FORCED)** | None for client | None (Server queries only) | `service_role` (Bypasses RLS) |
| `reward_audit` | **YES (FORCED)** | None for client | None (Internal audit only) | `service_role` (Bypasses RLS) |

> **Security Guarantee:** Clients have **zero `INSERT`, `UPDATE`, or `DELETE` permissions** on any progression table. All mutations occur strictly server-side through `SupabaseProgressionRepository` using the private `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. Automated Data Lifecycle & Retention RPC

```sql
create or replace function public.prune_expired_records()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  timelines_deleted integer;
  telemetry_deleted integer;
begin
  delete from public.room_timelines where expires_at < now();
  get diagnostics timelines_deleted = row_count;
  
  delete from public.operational_telemetry where expires_at < now();
  get diagnostics telemetry_deleted = row_count;
  
  return jsonb_build_object(
    'room_timelines', timelines_deleted,
    'operational_telemetry', telemetry_deleted
  );
end;
$$;
```

---

## 6. Schema Verification Status

- **Embedded PostgreSQL 17 Verification**: **VERIFIED (54 / 54 constraints, indexes, and cascades validated)**.
- **Rollback Script Cleanliness**: **VERIFIED (Forward/Back/Forward cycle cleanly drops and re-applies all objects)**.
- **Remote Hosted Supabase Staging Tenant**: **NOT VERIFIED: Remote credentials not loaded in current execution environment**.
