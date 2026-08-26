# Economy V1 — Remediation Report

> **This is a remediation report, not a production deployment record.** No migration was applied
> to any Supabase project (local or production). No commits were made. This report documents the
> resolution of the 2026-08-26 hostile NO-GO audit findings, verified against a real local
> PostgreSQL 17.5 instance only.

---

## 1. Every Audit Finding and Its Resolution

### BLOCKER

| ID | Finding | Resolution |
|---|---|---|
| B1 | `service_role` retained blanket table-level `INSERT`/`UPDATE`/`DELETE` on every Economy V1 table because RLS was treated as the security boundary; `service_role` bypasses RLS by design. | Migration §14 explicitly `REVOKE`s `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` from `PUBLIC, anon, authenticated, service_role` (service_role named explicitly) on all 9 tables, then grants narrow `SELECT` only. All mutation routed exclusively through `SECURITY DEFINER` RPCs. Verified: 5 direct service-role mutation attempts all denied (`verifyEconomySchema.mjs` §3). |
| B2 | The prior test environment never reproduced the real project's pre-existing `ALTER DEFAULT PRIVILEGES ... GRANT ... TO service_role`, so it could never have caught B1. | `verifyEconomySchema.mjs` §0b reproduces that exact grant *before* applying the economy migration. B1's revokes are verified against this production-like starting state, not a clean schema. |
| B3 | Contradictory `CASCADE`/`RESTRICT` FK chain between `player_identities → coin_wallets → coin_ledger_entries` could silently make root-row deletion impossible or, worse, silently cascade-delete financial history. | Both hops now `ON DELETE RESTRICT`. Verified: deleting an identity with economy history is rejected with FK violation `23503` (§13); anonymizing `player_profiles` in place while the FK reference stays valid is separately verified. |
| B4 | Single aggregate `world_bank_accounts.balance` merged platform revenue with guest escrow liability — a liability, not revenue. | Replaced with four columns: `base_fee_revenue`, `bot_prize_revenue`, `guest_escrow_liability`, `total_voucher_redeemed`, each moved by a distinct `world_bank_ledger.entry_type`. Verified independently correct after a real 5-seat settlement (§8-§9). |
| B5 | Admin dashboard plan included `POST .../wallets/:id/adjust`, `POST .../wallets/:id/freeze`, a "Privileged Action" UI control, and `WalletAdjustmentModal.tsx` — violating "no admin adjustment in V1." | `docs/economy/economy-admin-dashboard-plan.md` rewritten to strictly read-only: both `POST` routes removed, the UI control and modal component removed, `is_frozen` display-only. The migration itself never implemented an adjustment RPC, so no SQL change was needed — only the docs were wrong. |
| B6 | `roommanager-integration-map.md` proposed `await economyService.commitMatchEntry(...)` / `settleMatchEconomy(...)` inside confirmed-synchronous `startGame(): void` (line 1138) and `finalizeMatch(): void` (line 1349) — not valid TypeScript as written. | `RoomManager.ts` was not touched (out of scope). `roommanager-integration-map.md` corrected to remove the `await`-inline snippets and point to the new `docs/economy/roommanager-async-boundary-proposal.md`, which evaluates the sync/async boundary as a design proposal without implementing it. |

### HIGH

| ID | Finding | Resolution |
|---|---|---|
| H1 | Docs claimed an "automatic refund sweep" / "startup reconciliation job" with a specific 1-hour threshold that did not exist anywhere in the migration. | Claim removed from `economy-edge-cases.md` and `economy-v1.md`. Replaced with the actual, deliberately-scoped policy: read-only `list_stale_committed_settlements(interval)`, called by nothing automatically. §9 of `economy-v1.md` documents why (the DB alone cannot distinguish a crash from an in-progress match) and what the intended human/admin-triggered flow is. |
| H2 | `quote_match_checkout` treated ambiguously between "database RPC" and "application concern." | Explicitly documented as application-level only (`economy-v1.md` §6b) — not a database function, informational only, always revalidated by `commit_match_entry` at commit time. |
| H3 | Frozen-wallet semantics not consistently enforced across RPCs. | `commit_match_entry` and `redeem_reward_voucher` now check `is_frozen` and raise `WALLET_FROZEN`. Credit/refund paths (`settle_match_economy` prize credit, `refund_match_entry`) deliberately do **not** check it — frozen wallets may still receive rewards/refunds. Verified: commit blocked for a frozen host wallet; voucher redemption blocked for a frozen member wallet against a *real* previously-issued voucher, which remains `ACTIVE` (not partially consumed) after the rejection (§ frozen-wallet tests). |
| H4 | No standardized RPC response contract; a caller could not distinguish a fresh application from a replay. | Every mutating RPC now returns `{applied, operation, idempotencyKey, result}`. A replay of an already-applied key returns `applied=false` with the *original* `result`. Verified via explicit shape assertions (§5-6 of the verification script) and reconciled in `economy-implementation-plan.md`. |
| H5 | (Design-scope item folded into B6/Phase 11 — RoomManager's synchronous lifecycle was never reconciled with async economy calls.) | Addressed by the new `roommanager-async-boundary-proposal.md` — see B6. |
| H6 | Rollback script was only ever tested against an empty schema, so it never proved it could tear down a schema with real transaction history. | `verifyEconomySchema.mjs` §15 populates starter grants, a committed+settled match, an issued+redeemed voucher, and a refund *before* running the rollback; confirms non-zero pre-rollback row counts, a clean teardown, and a clean re-application of the forward migration afterward. |

### MEDIUM

| ID | Finding | Resolution |
|---|---|---|
| M1 | `lifetime_spent` conflated original spend with refund restitution, risking it decreasing on refund. | Added `lifetime_refunded`, separate from `lifetime_spent`. `lifetime_spent` verified to never decrease across a refund. |
| M2 | No declarative check tying `balance` to the granted/earned/refunded/spent components. | `coin_wallets_balance_reconciles` CHECK added. Verified: a deliberately-inconsistent update is rejected. |
| M3 | (Folded into B4 — see World Bank model above.) | See B4. |
| M4 | `game-settlement-map.md` and `economy-edge-cases.md` proposed unapproved secondary tie-breaker heuristics (e.g. "earliest join time," "fewest rolls taken," "lowest unmelded card count") for non-1st placements beyond what was actually decided. | All such heuristics removed from both documents. Replaced with: any ambiguity at *any* paid position (not only 1st) is not a valid ranked result and triggers a full refund via `settle_match_economy(..., p_is_valid_ranking := false, ...)` — no heuristic is applied, ever. |
| M5 | 32-bit `hashtext()` used for advisory lock keys — a narrower, more collision-prone keyspace than necessary for a financial locking strategy. | All advisory locks now use 64-bit `pg_advisory_xact_lock(hashtextextended(key, 0))`. Verified absent: no `hashtext(` call remains outside the explanatory comment noting the change; verified present: `hashtextextended` used exclusively (structural test). |
| M6 | `settle_match_economy` required the caller to separately detect an invalid ranking and call a different refund path, an easy-to-miss caller responsibility. | Added `p_is_valid_ranking boolean` parameter. When false, the function internally delegates to `economy_apply_refund` — no second call, no caller-side branching required. |

### LOW

| ID | Finding | Resolution |
|---|---|---|
| L1-L2 | (Minor documentation/comment issues folded into the general documentation rewrite.) | Addressed across all six `docs/economy/*` files during this pass. |
| L3 | `CoinWalletRecord.balance: number` / `CoinLedgerEntryRecord.amount: number` — JS `number` loses precision above 2^53 for bigint-backed columns. | All coin-amount fields in `economy-implementation-plan.md` §3 changed to `string`. Added `walletVersion`/`walletVersionBefore`/`walletVersionAfter` fields to match the new schema columns. |

---

## 2. Files Changed

- `supabase/migrations/20260826000000_economy_v1.sql` — rewritten (privilege boundary, ledger model, World Bank model, frozen-wallet enforcement, idempotency contract, voucher hardening, advisory-lock upgrade, reconciliation query, FK strategy).
- `supabase/rollbacks/20260826000000_economy_v1_rollback.sql` — rewritten to match the new function/table set.
- `scripts/economy/verifyEconomySchema.mjs` — rewritten and expanded to 62 checks against a real local PostgreSQL 17.5 instance, including privilege-boundary, concurrency, and populated-rollback tests.
- `server/src/persistence/__tests__/economyMigrationStructure.test.ts` — rewritten to 25 static structural tests, each traceable to a specific audit finding.
- `docs/economy/economy-v1.md` — fully rewritten to describe the remediated design.
- `docs/economy/roommanager-integration-map.md` — corrected to remove the invalid `await`-inside-synchronous-function proposal; RoomManager.ts itself untouched.
- `docs/economy/game-settlement-map.md` — unapproved tie-breaker heuristics removed.
- `docs/economy/economy-edge-cases.md` — false auto-sweep claim removed; advisory-lock and ledger-type references corrected; tie-breaker section aligned with the settlement map.
- `docs/economy/economy-admin-dashboard-plan.md` — all mutation capability (adjust/freeze) removed; made strictly read-only; balance model updated to the four-column treasury.
- `docs/economy/economy-implementation-plan.md` — bigint-unsafe types corrected to strings; idempotency contract description reconciled with the actual implementation.
- `docs/economy/roommanager-async-boundary-proposal.md` — **new**, Phase 11 design proposal (no implementation).
- `docs/remediation/economy-v1-remediation-report.md` — this report.

No file outside these paths was modified. `RoomManager.ts` was not edited. No admin adjustment capability was implemented anywhere.

---

## 3. Revised Privilege Matrix

See `docs/economy/economy-v1.md` §7 for the full table. Summary: direct `INSERT/UPDATE/DELETE` revoked from `PUBLIC`, `anon`, `authenticated`, **and `service_role`** on all 9 tables; narrow `SELECT` granted to `service_role` only, plus existing `owns_player_row` RLS `SELECT` policies for `authenticated` on `coin_wallets`/`coin_ledger_entries`. All mutation flows exclusively through 7 top-level `SECURITY DEFINER` RPCs, each individually granted `EXECUTE` to `service_role` only. Two internal helpers (`economy_apply_refund`, `prevent_ledger_mutation`) are revoked from every role including `service_role`. Verified against a reproduction of the real project's pre-existing default-privilege grant, not a clean schema.

---

## 4. Revised Ledger Model

`coin_ledger_entries` represents wallet mutations only. Added `balance_before`/`balance_after` and `wallet_version_before`/`wallet_version_after`, each enforced by a `CHECK` tying the transition to `amount`. `GUEST_PRIZE_ESCROW` removed as a wallet-ledger type — a guest's wallet never changes on prize escrow, so no wallet-ledger row is written for it (see §5, World Bank model). Corrections are compensating entries only; no `UPDATE`/`DELETE` path exists on the ledger (enforced by the pre-existing `prevent_ledger_mutation` trigger, unchanged in this pass). Full taxonomy in `docs/economy/economy-v1.md` §4.

---

## 5. Revised World Bank Model

Single aggregate `balance` replaced with four columns — `base_fee_revenue`, `bot_prize_revenue`, `guest_escrow_liability`, `total_voucher_redeemed` — each moved by a distinct, immutable `world_bank_ledger.entry_type`. Guest prize issuance atomically increases `guest_escrow_liability`, creates the voucher, and updates the settlement — no wallet-ledger row. Voucher redemption atomically decreases `guest_escrow_liability`, increases `total_voucher_redeemed`, credits the member wallet, and writes both a wallet-ledger and a treasury-ledger row. Account-level conservation (§8) and settlement-level conservation (`SETTLEMENT_CONSERVATION_VIOLATION` check inside `settle_match_economy`) are both enforced. Full model in `docs/economy/economy-v1.md` §5.3.

---

## 6. Identity Erasure Strategy

`coin_wallets.identity_id` and both of `reward_vouchers`'s identity FKs are `ON DELETE RESTRICT` — an identity with any economy history can never be physically deleted; the attempt raises FK violation `23503` (verified). Personal-data erasure is handled by anonymizing the `player_identities`/`player_profiles` row in place (clearing display name, auth linkage, contact fields) while its primary key — and every financial reference to it — remains valid. This migration guarantees the FK strategy makes anonymization-in-place safe; it does not itself implement an anonymization procedure, which is out of scope here and should be proposed separately alongside the existing account-deletion flow. Detail in `docs/economy/economy-v1.md` §5.2.

---

## 7. Frozen-Wallet Matrix

| Operation | Frozen wallet allowed? | Enforced in |
|---|---|---|
| `commit_match_entry` (spend to start a match) | **No** — `WALLET_FROZEN` raised before balance check | `commit_match_entry` |
| `redeem_reward_voucher` (spend/claim) | **No** — `WALLET_FROZEN` raised after existence/status checks, before crediting | `redeem_reward_voucher` |
| `settle_match_economy` prize credit (receive) | **Yes** | `settle_match_economy` — no `is_frozen` check on the credit path |
| `refund_match_entry` / internal refund (receive) | **Yes** | `refund_match_entry`, `economy_apply_refund` — no `is_frozen` check |

No RPC in Economy V1 mutates `is_frozen` — freezing/unfreezing is a future, separately-approved capability. The admin dashboard plan displays the flag read-only.

---

## 8. Idempotency Response Contract

Every mutating RPC returns:
```json
{ "applied": true, "operation": "commit_match_entry", "idempotencyKey": "match-entry:M_98218", "result": { "...": "..." } }
```
A replay of an already-applied key returns the same shape with `applied: false` and the **original** `result` — never a bare row, never a different result on replay. The actual concurrency guard is the row's own locked state (`FOR UPDATE` plus a status/boolean column), not the key string alone. Verified via explicit shape assertions and via the 5 concurrency tests in §10 below. Full contract in `docs/economy/economy-v1.md` §6a.

---

## 9. Voucher Security Boundary

`code_hash` enforced to exactly 64 hex characters. `issue_guest_voucher` has no `ON CONFLICT` — a hash collision is a hard unique-violation failure, never a silent update (verified, after fixing a test setup bug that omitted the required `player_identities` rows for the colliding guest ids). Raw voucher codes are never generated, accepted from a client, logged, or persisted by this migration — `gen_random_bytes`/`pgcrypto` dependency was removed entirely in favor of `gen_random_uuid()` for the voucher's own ID (not the secret code). The required future server-side generator (cryptographically secure random bytes, keyed HMAC, bounded collision retry, one-time raw-code return) is documented but explicitly not implemented here — `docs/economy/economy-v1.md` §3.1.

---

## 10. Concurrency-Test Results

Five concurrency tests, each firing 8 parallel connections at the same operation and asserting exactly one `applied: true`:

| Operation | Result |
|---|---|
| Concurrent starter grants (same identity) | Exactly 1 of 8 applied |
| Concurrent `commit_match_entry` (same match) | Exactly 1 of 8 applied |
| Concurrent `settle_match_economy` (same match) | Exactly 1 of 8 applied |
| Concurrent `refund_match_entry` (same match) | Exactly 1 of 8 applied |
| Concurrent `redeem_reward_voucher` (same voucher) | Exactly 1 of 8 applied |

All five verified via `verifyEconomySchema.mjs` §12 against a real local PostgreSQL 17.5 instance (not mocked). One test-design bug was found and fixed during this work: the settlement-concurrency test originally committed a 5-seat match but supplied only one participant, correctly tripping the migration's own `SETTLEMENT_CONSERVATION_VIOLATION` check on every attempt — this was a test bug, not a migration bug, fixed by using a 2-seat match where a single participant fully satisfies conservation.

---

## 11. Populated Rollback-Test Results

`verifyEconomySchema.mjs` §15: starter grants, a committed+settled match, an issued+redeemed voucher, and a refund are created first (confirmed non-zero row counts across all 9 tables), then the rollback script is executed and confirmed to leave zero Economy V1 tables behind, then the forward migration is re-applied and confirmed to apply cleanly a second time. This directly supersedes the pre-remediation draft's empty-schema-only rollback test (finding H6).

---

## 12. RoomManager Async-Boundary Proposal

See `docs/economy/roommanager-async-boundary-proposal.md` in full. Summary of the recommendation: `startGame` gets a new asynchronous pre-commit orchestration step ahead of the existing (unchanged) synchronous `startGame`, because game start must be gated on debit confirmation; `finalizeMatch` and `abandonRoom` keep their existing synchronous contracts unchanged and queue their economy calls (`settle_match_economy`, `refund_match_entry`) to run after, because neither settlement nor refund gates any player-visible action the way entry commitment does. Making `startGame`/`finalizeMatch` themselves `async` is explicitly rejected as an option pending a complete caller-impact analysis that has not been performed. **`RoomManager.ts` has not been modified.**

---

## 13. Remaining Risks

- **Independent re-audit not performed.** All checks across both remediation rounds are self-authored verification, run against a real local PostgreSQL instance — not against the real Supabase project, and not reviewed by an independent party. Per explicit project constraint, this does not constitute approval.
- **No PostgREST/real-`service_role`-key transport test.** Verification used `SET ROLE service_role` on a local superuser connection to test privilege boundaries; it did not exercise the actual Supabase PostgREST layer or a real service-role JWT.
- ~~`ensure_wallet` auto-provisioning boundary.~~ **RESOLVED** (final certification pass, 2026-08-26): `ensure_wallet` no longer auto-creates a `player_identities` row under any condition, for guests or members. It now requires the identity to already exist and raises `IDENTITY_NOT_FOUND` otherwise. See `economy-v1.md` §6, item 1.
- **No implementation exists yet.** `EconomyRepository`, `EconomyService`, `EconomyController`, the voucher generator, and all client code remain entirely unbuilt — this remediation pass is schema/RPC/documentation only, per its explicit scope.
- **RoomManager integration unresolved.** The async-boundary proposal (§12) is a design evaluation, not code. The actual `startGame`/`finalizeMatch`/`abandonRoom` integration still needs to be built, including the caller-impact audit flagged as a prerequisite.
- **Reconciliation is manual-only in V1.** A crash mid-match leaves a `COMMITTED` settlement flagged by `list_stale_committed_settlements` but not auto-resolved — by design, per §9, but this means an operational process (someone watching that list) must actually exist before this is operationally safe.

---

## 14. Final Recommendation

**READY FOR INDEPENDENT RE-AUDIT**

Every BLOCKER, HIGH, and MEDIUM finding from the 2026-08-26 hostile audit that fell within this remediation's authorized scope (the migration, rollback, verification scripts, and `docs/economy/*`) now has a concrete fix, verified against a real local PostgreSQL 17.5 instance (87 total checks passing: 62 in `verifyEconomySchema.mjs`, 25 in `economyMigrationStructure.test.ts`), plus a full 853-test regression run of the existing server suite with zero failures. This is self-authored verification and is explicitly not a substitute for independent review — the remaining risks in §13, and in particular the unbuilt application layer and unresolved RoomManager integration, mean this is not a production-deployment recommendation of any kind. No migration has been applied to any Supabase project, local or production, and none should be until an independent reviewer has re-examined this work.
