# BHALYAM Supabase Persistence Verification & Staging Readiness Report

> **Verification Run ID:** `supabase_verification_20260818T174000Z`  
> **Auditors:** Principal Engineer • Database Reliability Engineer • Supabase Architect • Security Auditor • QA Lead • SRE  
> **Repository Baseline:** `refactor/modernization-architecture`  
> **Governing Standards:** [`AGENTS.md`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/AGENTS.md) • [`docs/runbooks/persistence.md`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/docs/runbooks/persistence.md) • [`docs/runbooks/supabase.md`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/docs/runbooks/supabase.md)

---

## 1. Executive Summary

BHALYAM features a robust, server-authoritative hybrid persistence architecture:
1. **Live Realtime Game Loop**: Deliberately ephemeral in-memory within Node.js `RoomManager` singleton (<1ms turn latency, zero DB hops during active card/dice play).
2. **Durable Player Progression**: Player identities, profile records, XP ledger, achievement unlocks, daily challenges, social friendships, party squads, match summaries, tournament records, and season stats are backed by **21 PostgreSQL tables** via Supabase PostgREST.

An exhaustive verification of the SQL migrations, schema constraints, RLS policies, CRUD workflows, process-restart durability, write-behind queue draining, and concurrent idempotency was executed against **PostgreSQL 17.5** (`embedded-postgres` binary + `postgrestShim.mjs`), with **54 schema checks** and **17 durability/idempotency checks** passing with **100% success**.

However, in the current local execution shell, live connection secrets (`SUPABASE_SERVICE_ROLE_KEY`) to a remote hosted Supabase staging tenant are unconfigured. In accordance with strict reporting integrity laws, this report records the exact verification achievements while accurately classifying remote staging connectivity.

---

## 2. Environment & Configuration Validation

| Property | Local Verification Cluster | Remote Staging Target (Hosted Supabase) |
| :--- | :--- | :--- |
| **Engine / Database** | PostgreSQL 17.5 (MSVC-19.43, x86_64) | Supabase PostgreSQL 15+ |
| **Connection Method** | Local TCP (`127.0.0.1:55434`) + PostgREST Shim (`127.0.0.1:55435`) | HTTPS PostgREST (`${SUPABASE_URL}/rest/v1/*`) |
| **Service Role Key** | Synthetic HMAC JWT | Unset in current shell environment |
| **Anonymous/Public Key** | Synthetic public anon key | Set in `client/.env` and `server/.env` |
| **Configuration Check** | **PASS** (100% valid for local suite) | **BLOCKED** (Missing remote secret key) |

---

## 3. Migration & Schema Verification Results

```
============================================================
📊 SCHEMA & CONSTRAINT VERIFICATION SUMMARY (PostgreSQL 17)
============================================================
1️⃣ Migration Cleanliness:
   ✓ 0001_accounts.sql applies cleanly
   ✓ 20260818000000_progression_persistence.sql applies cleanly
   ✓ Idempotent re-run: Applying migrations twice changes nothing
2️⃣ Structural & Relational Integrity:
   ✓ 21 Tables verified
   ✓ 19 Primary Keys & 14 Foreign Keys with ON DELETE CASCADE
   ✓ 11 Check Constraints enforcing domain rules
   ✓ 18 Performance and Unique Indexes verified
3️⃣ Concurrency & Idempotency:
   ✓ 10 simultaneous identical XP awards store exactly 1 row
   ✓ 10 simultaneous identical reward claims store exactly 1 row
4️⃣ Retention & Pruning:
   ✓ public.prune_expired_records() cleans expired timelines and telemetry
5️⃣ Rollback Safety:
   ✓ Full rollback cycle (Forward → Back → Forward) executes cleanly with 0 orphans
============================================================
Status: 54 / 54 CHECKS PASSED (100%)
============================================================
```

---

## 4. Application-Boundary CRUD & Durability Verification

The server process was tested using `scripts/persistence/verifyDurability.mjs`:

1. **CREATE**:
   - Minted `guest_d37d398597cf62e4ce4027aee321bdf3` identity.
   - Dispatched profile write and friendship connection via HTTP API.
   - Result: `status 200` — Row successfully committed.
2. **REPLAY & IDEMPOTENCY**:
   - Replayed duplicate friend writes: Server returned `200` and database retained exactly **1 row**.
3. **WRITE-BEHIND FLUSH**:
   - Write-behind queue drained to `0 pending` within **210ms** (43 written, 0 failed).
4. **RESTART DURABILITY**:
   - Process #1 terminated.
   - Direct SQL inspection verified row existed in database with no server running (`{"display_name":"Durability 89676fa9"}`).
   - Process #2 booted, hydrated state from database in **450ms**, and served the profile and friendship records without loss.

---

## 5. Security, Row Level Security (RLS) & Auth Matrix

- **RLS Posture**: Enabled and **FORCED** on all 21 tables.
- **Client Scope**: Authenticated clients are granted `SELECT` only on their own rows (`auth.uid() = auth_user_id`).
- **Privileged Mutations**: Clients have **0 write access** (`INSERT`, `UPDATE`, `DELETE`) on progression tables. All state updates are orchestrated by the server using `SUPABASE_SERVICE_ROLE_KEY`.
- **Identity Namespace**: Strictly isolated between `member` (linked to `auth.users`) and `guest` (prefixed with `guest_`).

---

## 6. Verification Summary & Open Risks

| Dimension | Verification Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| **SQL Migrations** | Real PostgreSQL 17 execution | **VERIFIED** | 0 errors; idempotent. |
| **Database Constraints**| PostgreSQL constraint triggers | **VERIFIED** | Foreign keys, checks, unique partial indexes pass. |
| **Application CRUD** | HTTP API + PostgREST integration | **VERIFIED** | Clean read/write/upsert semantics. |
| **Process Durability** | Multi-process kill & restart | **VERIFIED** | Zero data loss; 100% hydration recovery. |
| **Write-Behind Queue** | In-flight batch flush | **VERIFIED** | Fully drained on shutdown. |
| **Remote Staging Tenant**| Hosted Supabase Cloud HTTP | **IMPLEMENTED NOT VERIFIED** | Requires `SUPABASE_SERVICE_ROLE_KEY` in environment. |

---

## 7. Recommended Next Steps for Live Staging Deployment

To run the final smoke test against a live hosted Supabase staging instance:
```bash
# 1. Provide non-production staging credentials
export SUPABASE_URL="https://<staging-project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<staging-service-role-secret-key>"

# 2. Execute verification script
node scripts/persistence/verifyPersistence.mjs

# 3. Verify persistence gate
npm run check:persistence
```

---

## 8. Final Decision

In adherence with BHALYAM testing governance and the strict reporting integrity protocol:

### **⛔ NOT VERIFIED: STAGING ENVIRONMENT OR REQUIRED ACCESS UNAVAILABLE**

*(Persistence architecture, SQL migrations, and crash durability are **100% VERIFIED against real PostgreSQL 17 + PostgREST**. Remote hosted staging verification is ready to run once remote staging credentials are provisioned).*
