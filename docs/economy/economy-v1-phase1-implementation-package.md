# Economy V1 — Phase 1 Implementation Package: `EconomyRepository`

> **Status:** IMPLEMENTATION-READINESS PACKAGE — SPECIFICATION ONLY. No code, no SQL, no migration
> or rollback changes. This document does not begin implementation; it is what implementation
> begins FROM.
> **Relationship to prior documents:** this package restructures and extends
> `docs/economy/economy-v1-phase1-repository-spec.md` (the earlier interface/contract deep-dive)
> into the specific readiness-review shape requested here — a different error-hierarchy taxonomy
> (domain-organized: Wallet/Voucher/Settlement/Concurrency/Authorization/Persistence, rather than
> the earlier check-origin taxonomy), field-level DTO tables instead of interface code, ranked
> risk, a dual GO/NO-GO gate, and a per-step execution plan. Nothing below contradicts the earlier
> spec's DECISIONS — every method, field, and behavior is the same; only the organizing structure
> changes, and every reclassification is justified where it occurs.
> **Source of truth:** `supabase/migrations/20260826000000_economy_v1.sql` (frozen — read as a
> contract to expose faithfully, not a candidate for change), `economy-v1.md`, the implementation
> blueprint and roadmap. **Out of scope, per explicit constraint:** `EconomyService`, any API, any
> UI, any Admin Dashboard, any RoomManager implementation — named below only where a boundary must
> be drawn against them, never designed.

---

## 1. Repository Boundary Review

### What belongs inside `EconomyRepository`

| Belongs | Rationale |
|---|---|
| One method per database capability (RPC or table read) the migration actually exposes | The repository's entire reason to exist is being the ONE seam between the frozen schema and everything above it — a method that doesn't map to a real RPC/read would be inventing capability the database doesn't have |
| Faithful pass-through of the `{applied, operation, idempotencyKey, result}` envelope | The database already solved idempotency (proven at the SQL layer across five concurrency scenarios); re-deriving or re-wrapping it here would create a second, potentially divergent, source of truth for the same fact |
| Translation of raw database failures into named TypeScript error types (§4) | The one piece of real logic this layer is permitted — without it, every caller above would need to parse Postgres error strings itself, which is worse in every way (repeated, inconsistent, and coupled to exact wording) |
| Bigint-safety at the boundary (every coin amount is a `string`) | A precision bug here would be invisible to `tsc` and would corrupt real money values above 2^53 — this MUST be enforced at the single point every caller passes through, not hoped for at each call site |
| Cheap, deterministic shape checks that can never require a database round-trip (hash format, non-empty id) | Failing fast on an obvious caller bug before spending a network round-trip is a repository-appropriate optimization — it is NOT business validation (see below), because it never depends on stored state |

### What must NEVER belong inside `EconomyRepository`

| Excluded | Rationale |
|---|---|
| Business validation that depends on stored state (sufficient balance, frozen status, voucher status, ranking validity) | These are the DATABASE's decisions, made under lock, under real concurrency — the repository reporting them faithfully is correct; the repository trying to pre-decide them (even "just as an optimization") risks a check-then-act race the database's own row locks were specifically built to prevent |
| Retry logic of any kind | Exactly one layer owns retry policy. If it were this layer, a caller above could never distinguish "the operation genuinely failed once" from "it failed three times and I don't know" — that distinction belongs one layer up, where the caller's own tolerance for latency differs by use case (a UI's retry tolerance differs from a background reconciliation job's) |
| Caching of any read | A stale-read bug behind an invisible cache would be undetectable by every layer above it; every read in this interface must be provably fresh |
| Composition of two or more RPC calls into one repository method | `settleMatchEconomy` following `commitMatchEntry` under some condition is a POLICY decision (when to settle, whether to retry, what counts as "invalid ranking") — the repository exposes each primitive individually and never decides for its caller which sequence of primitives to run |
| Cross-player/admin aggregate reads | Deferred to a later, separately-scoped extension of this same interface (roadmap Phase 13) — Phase 1's surface is exclusively player/match-scoped, matching exactly what the blueprint already committed to |
| Any knowledge of HTTP, sessions, sockets, or `req.player` | This file must be importable and testable by a socket handler, an HTTP controller, or a bare test script with zero difference — coupling it to any transport would break that property for no benefit |
| Raw voucher codes, in any form, at any point | This repository only ever sees or produces a `codeHash` — a raw code reaching this file's scope is already a defect in whatever called it, not something this layer needs to defend against by design (it structurally cannot happen if every caller respects its own interface) |

### What belongs later, in `EconomyService` (named only to draw the line — not designed here)

| Belongs to `EconomyService`, not here | Why the line falls there |
|---|---|
| Cheap-reject validation that mirrors, but doesn't replace, the database's own checks (e.g. rejecting an out-of-range `seatCount` before even calling the repository) | This is a DIFFERENT kind of cheap check than the repository's own (§ above) — it exists purely to save a round-trip for a KNOWN-bad caller input, and belongs to the layer that also owns retry/UX-facing failure shaping, not the persistence seam |
| The one-retry-then-surface policy for infrastructure errors | Explicitly named above as never belonging here |
| Deciding WHETHER a match's ranking is valid (a game-rules question) | The repository accepts `isValidRanking` as a given boolean; deciding it is derived from per-game engine state, entirely outside this file's concern |
| Turning a caught repository error into a user-facing outcome/HTTP status | A translation this repository must never perform itself — see §4's `.code` design, which exists SPECIFICALLY so a layer above can do this translation without string-matching |

---

## 2. Final Repository Interface

**`kind`** — `readonly kind: "memory" | "supabase"` — not a method; identifies the active
implementation, reported at boot and by `/health`, mirroring `ProgressionRepository.kind` exactly.

| # | Method | Parameters | Return Type | Errors it can raise (§4 leaf classes) | Idempotency contract |
|---|---|---|---|---|---|
| 1 | `ping` | — | `Promise<void>` | `PersistenceError` | n/a |
| 2 | `getWallet` | `identityId: string` | `Promise<CoinWalletRecord \| null>` | `WalletError` (malformed id only) | n/a — pure read |
| 3 | `listLedger` | `walletId: string, opts?: {limit?, offset?}` | `Promise<CoinLedgerEntryRecord[]>` | `WalletError` (malformed id) | n/a |
| 4 | `getSettlement` | `matchId: string` | `Promise<MatchEconomySettlementRecord \| null>` | `SettlementError` (malformed id) | n/a |
| 5 | `getWorldBankSnapshot` | — | `Promise<WorldBankSnapshot>` (non-nullable — DB-enforced singleton) | `PersistenceError` | n/a |
| 6 | `getVoucherStatus` | `codeHash: string` | `Promise<VoucherStatusView \| null>` | `VoucherError` (malformed hash) | n/a |
| 7 | `getActiveConfiguration` | — | `Promise<EconomyConfigurationRecord>` (non-nullable) | `PersistenceError` | n/a |
| 8 | `getPrizeSchedule` | `seatCount: number` | `Promise<EconomyPrizeScheduleRecord \| null>` | — (out-of-range returns `null`, never throws) | n/a |
| 9 | `reconcileSettlement` | `matchId: string` | `Promise<SettlementReconciliation>` | `SettlementError` (`MATCH_NOT_FOUND`) | n/a |
| 10 | `listStaleCommittedSettlements` | `olderThanMs: number` | `Promise<MatchEconomySettlementRecord[]>` | `PersistenceError` | n/a |
| 11 | `ensureWallet` | `identityId: string` | `Promise<CoinWalletRecord>` | `WalletError` (`IDENTITY_NOT_FOUND`, `INVALID_IDENTITY_ID`) | **Effect-idempotent, no envelope** — see §2.1 |
| 12 | `grantStarterCoins` | `identityId: string` | `Promise<EconomyOperationResult<CoinWalletRecord>>` | `WalletError` (`WALLET_NOT_FOUND`) | Keyed by `identityId`; guarded by `starter_granted`, not the key alone |
| 13 | `commitMatchEntry` | `input: CommitMatchEntryInput` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | `WalletError` (`WALLET_FROZEN`, `INSUFFICIENT_FUNDS`, `IDENTITY_NOT_FOUND`), `SettlementError` (`INVALID_SEAT_CONFIGURATION`, `UNSUPPORTED_SEAT_COUNT`) | Keyed by `matchId` |
| 14 | `settleMatchEconomy` | `input: SettleMatchEconomyInput` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | `SettlementError` (`INVALID_IDENTITY_KIND`, `MATCH_NOT_COMMITTED`, `SETTLEMENT_CONSERVATION_VIOLATION`), `VoucherError` (`INVALID_VOUCHER_HASH`), `ConcurrencyError` (`VoucherCodeCollisionError`), `WalletError` (`IDENTITY_NOT_FOUND` for a member participant) | Keyed by `matchId` |
| 15 | `refundMatchEntry` | `matchId: string, reason: string` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | `SettlementError` (`MATCH_NOT_COMMITTED`, `MATCH_ALREADY_SETTLED`) | Keyed by `matchId` |
| 16 | `issueGuestVoucher` | `input: IssueGuestVoucherInput` | `Promise<EconomyOperationResult<RewardVoucherRecord>>` | `VoucherError` (`INVALID_VOUCHER_HASH`), `ConcurrencyError` (collision), `WalletError` (`IDENTITY_NOT_FOUND`) | Keyed by `voucherId` — **not** by `codeHash`, see §2.1 |
| 17 | `redeemRewardVoucher` | `codeHash: string, memberIdentityId: string` | `Promise<EconomyOperationResult<RewardVoucherRecord>>` | `AuthorizationError` (`ONLY_MEMBERS_CAN_REDEEM_VOUCHERS`), `WalletError` (`WALLET_FROZEN`), `VoucherError` (`VOUCHER_NOT_FOUND`, `VOUCHER_NOT_ACTIVE`, `VOUCHER_ALREADY_REDEEMED`, malformed hash) | Keyed by `voucherId:memberIdentityId` — same-redeemer replay only, see §2.1 |

**Mutability, stated once:** methods 1–10 never write, under any circumstance including error.
Methods 11–17 are the entire mutation surface — nothing above this repository has any other path
to change an Economy V1 table.

### 2.1 The two idempotency nuances most likely to be implemented wrong

1. **`issueGuestVoucher`** — a replay is identified by the SAME `voucherId`, never by `codeHash`
   alone. A different `voucherId` reusing an already-used `codeHash` is not a replay; it is a
   `VoucherCodeCollisionError`, thrown, not returned as `applied:false`. Conflating these two would
   silently let a hash collision be treated as a harmless repeat, which it is not.
2. **`redeemRewardVoucher`** — a replay is identified by `(voucherId, memberIdentityId)` TOGETHER.
   The SAME member redeeming an already-redeemed-by-them voucher again is `applied:false`. A
   DIFFERENT member attempting the same already-redeemed voucher is `VoucherAlreadyRedeemedError`,
   thrown. Redeemer identity is part of what makes two calls "the same call" for this one method
   only — no other method in this interface has an identity-scoped replay definition.

---

## 3. DTO Specification

### 3.1 Input DTOs

**`CommitMatchEntryInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `matchId` | `string` | Yes | The idempotency key for this entire operation |
| `roomCode` | `string \| null` | Yes | `null` permitted for solo matches |
| `hostIdentityId` | `string` | Yes | Must already exist in `player_identities` — this repository never creates it |
| `seatCount` | `number` | Yes | 1–5; validated by the database, cheaply pre-checked here (§1) |
| `humanSeatCount` | `number` | Yes | Must sum with `botSeatCount` to `seatCount` |
| `botSeatCount` | `number` | Yes | See above |
| `isSolo` | `boolean` | Yes | Drives `SOLO_ENTRY_DEBIT` vs `ROOM_ENTRY_DEBIT`/`BOT_ENTRY_DEBIT` ledger typing |

**`SettleMatchEconomyInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `matchId` | `string` | Yes | Must reference an existing `COMMITTED` settlement |
| `isValidRanking` | `boolean` | Yes | Never inferred by this repository — supplied as a fact by the caller |
| `participants` | `SettlementParticipantInput[]` | Yes | May be empty (a solo/no-participant settlement is valid) |
| `refundReason` | `string` | No | Used only when `isValidRanking` is `false` |

**`SettlementParticipantInput`** (element type of `participants`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `identityId` | `string` | Yes | For `bot`, a synthetic id (e.g. `bot_seat_3`) — never FK-checked |
| `identityKind` | `"member" \| "guest" \| "bot"` | Yes | Anything else is rejected with `INVALID_IDENTITY_KIND` — no silent default |
| `placement` | `number` | Yes | 1–5; enforced by a database CHECK on write |
| `voucherCodeHash` | `string` | Conditional | Required only when `identityKind === "guest"` AND the placement pays a nonzero prize |

**`IssueGuestVoucherInput`**

| Field | Type | Required | Notes |
|---|---|---|---|
| `voucherId` | `string` | Yes | The idempotency key for this call |
| `codeHash` | `string` | Yes | Exactly 64 lowercase hex characters |
| `coinAmount` | `string` | Yes | Bigint-as-string, must be `> 0` |
| `matchId` | `string` | Yes | Traceability only — not FK-enforced against `match_economy_settlements` |
| `issuedToGuestId` | `string` | Yes | Must already exist in `player_identities` |

### 3.2 Output DTOs (Repository Models)

**`CoinWalletRecord`**

| Field | Type | Notes |
|---|---|---|
| `identityId` | `string` | Primary key |
| `identityKind` | `"member" \| "guest"` | |
| `balance` | `string` | Bigint-as-string, always |
| `version` | `number` | Optimistic-audit counter, incremented by exactly 1 per mutation |
| `lifetimeGranted` | `string` | |
| `lifetimeEarned` | `string` | |
| `lifetimeSpent` | `string` | Never decreases |
| `lifetimeRefunded` | `string` | Separate from `lifetimeSpent` |
| `starterGranted` | `boolean` | |
| `isFrozen` | `boolean` | Read-only from this repository's own consumers — nothing in Phase 1 sets it |
| `updatedAt` | `number` | Epoch ms |

**`CoinLedgerEntryRecord`**

| Field | Type | Notes |
|---|---|---|
| `id` | `number` | |
| `walletId` | `string` | |
| `amount` | `string` | Signed bigint-as-string |
| `balanceBefore` / `balanceAfter` | `string` | `after = before + amount`, database-enforced |
| `walletVersionBefore` / `walletVersionAfter` | `number` | `after = before + 1`, database-enforced |
| `entryType` | one of 8 literal strings (`economy-v1.md` §4) | No `GUEST_PRIZE_ESCROW` — removed by design |
| `sourceKind` / `sourceId` | `string` | |
| `idempotencyKey` | `string` | Unique across the whole table |
| `description` | `string` | Human-readable, server-generated |
| `createdAt` | `number` | |

**`RewardVoucherRecord`**

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `codeHash` | `string` | 64 hex chars — the ONLY form of the code this repository ever holds |
| `coinAmount` | `string` | |
| `matchId` | `string` | |
| `issuedToGuestId` | `string` | |
| `status` | `"ACTIVE" \| "REDEEMED" \| "CANCELLED"` | |
| `redeemedByMemberId` | `string \| null` | Present internally — see §5 invariant 9 on who may see this |
| `redeemedAt` | `number \| null` | |
| `createdAt` | `number` | |

**`MatchEconomySettlementRecord`**

| Field | Type | Notes |
|---|---|---|
| `matchId` | `string` | Primary key |
| `roomCode`, `hostIdentityId` | `string` | |
| `seatCount`, `humanSeatCount`, `botSeatCount` | `number` | |
| `costPerSeat`, `totalCollected`, `totalWalletRewarded`, `totalGuestEscrow`, `totalBotCollection`, `totalWorldBankCut`, `totalRefunded` | `string` | All bigint-as-string |
| `refundReason` | `string \| null` | |
| `status` | `"COMMITTED" \| "SETTLED" \| "REFUNDED"` | One-way, terminal |
| `settledAt` | `number \| null` | |
| `createdAt` | `number` | |

**`WorldBankSnapshot`**

| Field | Type | Notes |
|---|---|---|
| `baseFeeRevenue` | `string` | BHALYAM's own revenue |
| `botPrizeRevenue` | `string` | BHALYAM's own revenue |
| `guestEscrowLiability` | `string` | A liability, never counted as revenue anywhere |
| `totalVoucherRedeemed` | `string` | Monotonic lifetime counter |

**`EconomyOperationResult<T>`** — the universal mutation-response envelope

| Field | Type | Notes |
|---|---|---|
| `applied` | `boolean` | `false` is a normal outcome, never an error |
| `operation` | `string` | e.g. `"commit_match_entry"` |
| `idempotencyKey` | `string` | The exact key this call resolved against |
| `result` | `T` | On `applied:false`, the ORIGINAL result, never the caller's requested (possibly different) input reflected back |

### 3.3 Error Models

Every thrown instance carries exactly these fields — no error class in §4 adds instance fields
beyond this shared shape, so a catch site never needs to know which concrete class it caught to
extract the basics:

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | The concrete class name, e.g. `"WalletFrozenError"` |
| `code` | `string` | UPPER_SNAKE_CASE, matches the database's own raised token exactly where one exists |
| `message` | `string` | Human-readable, safe to log server-side; NOT guaranteed safe to show a client verbatim (that translation is `EconomyService`'s job, out of scope) |

---

## 4. Error Hierarchy

```
EconomyRepositoryError                              (abstract base, never thrown directly)
│
├── WalletError
│     ├── code: IDENTITY_NOT_FOUND        — ensureWallet (and anything that calls it internally)
│     │                                       receives an identityId with no player_identities row.
│     │                                       Thrown for BOTH guests and members, unconditionally —
│     │                                       this repository never auto-provisions an identity.
│     ├── code: INVALID_IDENTITY_ID       — identityId is null/empty/malformed. Thrown BEFORE any
│     │                                       query, by this repository itself, not the database.
│     ├── code: WALLET_NOT_FOUND          — a wallet-scoped mutation (grantStarterCoins) is called
│     │                                       against an identity that has no coin_wallets row yet
│     │                                       (i.e. ensureWallet was never called first).
│     ├── code: WALLET_FROZEN             — commitMatchEntry or redeemRewardVoucher attempted
│     │                                       against a frozen wallet. NEVER thrown by
│     │                                       settleMatchEconomy's credit path or refundMatchEntry
│     │                                       — a frozen wallet may always receive.
│     └── code: INSUFFICIENT_FUNDS        — commitMatchEntry's host balance is below the required
│                                             commitment, checked AFTER the frozen check.
│
├── VoucherError
│     ├── code: INVALID_VOUCHER_HASH      — codeHash is not exactly 64 lowercase hex characters.
│     │                                       Thrown BEFORE any query, by this repository.
│     ├── code: VOUCHER_NOT_FOUND         — redeemRewardVoucher's codeHash matches no row, AFTER
│     │                                       the membership check already passed (§ Authorization).
│     ├── code: VOUCHER_NOT_ACTIVE        — status is CANCELLED (or any non-ACTIVE, non-REDEEMED
│     │                                       state a future version might add).
│     └── code: VOUCHER_ALREADY_REDEEMED  — status is REDEEMED and the caller is NOT the original
│                                             redeemer (same-redeemer case is applied:false, §2.1).
│
├── SettlementError
│     ├── code: INVALID_SEAT_CONFIGURATION — seatCount ≠ humanSeatCount + botSeatCount, or outside
│     │                                        the shape the database itself would also reject.
│     ├── code: UNSUPPORTED_SEAT_COUNT     — seatCount outside 1–5.
│     ├── code: INVALID_IDENTITY_KIND      — a settleMatchEconomy participant's identityKind is not
│     │                                        exactly member/guest/bot.
│     ├── code: MATCH_NOT_COMMITTED        — settleMatchEconomy or refundMatchEntry called against a
│     │                                        matchId with no COMMITTED settlement row at all.
│     ├── code: MATCH_ALREADY_SETTLED      — refundMatchEntry called against a settlement that
│     │                                        reached SETTLED before this call arrived (a genuine
│     │                                        race, not a bug — see §5 invariant 6).
│     ├── code: SETTLEMENT_CONSERVATION_VIOLATION — computed disbursement ≠ total collected; a
│     │                                        caller-side placement-extraction bug, not a database
│     │                                        defect.
│     └── code: MATCH_NOT_FOUND            — reconcileSettlement's specific "does not exist at all"
│                                              (distinct from the null-returning plain reads).
│
├── ConcurrencyError
│     └── code: VOUCHER_CODE_COLLISION    — a genuine unique-constraint race: two DIFFERENT
│                                             voucherIds attempting to use the SAME codeHash. This
│                                             is the ONLY concurrency-shaped error this repository
│                                             throws — see the design note below.
│
├── AuthorizationError
│     └── code: ONLY_MEMBERS_CAN_REDEEM_VOUCHERS — the caller's identity is kind='guest', attempting
│                                             a member-only action. Checked by the database BEFORE
│                                             voucher lookup — this error can occur even for a
│                                             codeHash that doesn't exist, deliberately, so voucher
│                                             existence is never disclosed to a non-member.
│
└── PersistenceError
      └── code: INFRASTRUCTURE_ERROR       — connectivity, timeout, or any database error that does
                                              NOT match one of the named tokens above. The ONLY
                                              class any future retry policy (EconomyService,
                                              out of scope) may treat as retryable.
```

**Design note on `ConcurrencyError` having exactly one leaf:** this repository's concurrency model
is entirely **pessimistic** — row-level `FOR UPDATE` locks plus 64-bit transaction-level advisory
locks, proven (five scenarios, eight parallel callers each) to resolve to exactly one `applied:true`
outcome with zero errors for every genuinely-idempotent operation. There is no optimistic-version-
conflict pattern anywhere in this design, so there is no "stale version, please retry" error class
to invent. The voucher-collision case is the ONE place two DIFFERENT, both-legitimate operations can
still collide on a real constraint (two distinct guests' vouchers cannot share a hash) — that is
what makes it a genuine concurrency error rather than an idempotency replay, and it is the only
member of this category by design, not by omission.

**Naming convention:** every class name ends in `Error`; every class states the CONDITION, not the
method it occurred in (the same `WALLET_FROZEN` condition is reachable from two different methods
and a catch site should not need to know which); every `.code` matches the database's own raised
token verbatim where the database is the source of the failure, and is repository-invented, still
in the same UPPER_SNAKE_CASE style, for the handful of pre-database shape checks this layer
performs itself.

---

## 5. Invariants

The complete set — every one must hold identically for both Phase 2 (`InMemoryEconomyRepository`)
and Phase 3 (`SupabaseEconomyRepository`), proven by the contract suite in §6.

1. Wallet balances never mutate outside the seven RPC-backed mutating methods (§2, rows 11–17) —
   no method in this interface exposes, or ever will expose within Phase 1's scope, a raw
   "set balance" operation.
2. Every mutating method is safe to call an unbounded number of times with the same natural
   idempotency key and produces its effect **at most once**, under any concurrency, not merely
   under sequential retries.
3. `applied: false` is never treated as, logged as, or surfaced as an error by this layer.
4. Voucher redemption is single-use — enforced identically whether the second attempt arrives
   sequentially or genuinely concurrently with the first.
5. A `voucherId` replay is a no-op; a `codeHash` collision under a NEW `voucherId` is a hard
   failure — never conflated (§2.1).
6. Settlement references are immutable once terminal: `COMMITTED → SETTLED` or
   `COMMITTED → REFUNDED`, one-way, never reversed, never re-entered.
7. Ledger history is append-only — no method in this interface updates or deletes an existing
   `coin_ledger_entries` or `world_bank_ledger` row; corrections are new, compensating rows only.
8. `lifetime_spent` never decreases, under any method, for any reason — a refund credits
   `lifetime_refunded` exclusively.
9. `redeemedByMemberId`, though present on the internal `RewardVoucherRecord` shape (§3.2), is
   never surfaced by ANY read method's public consumers as "who redeemed this" outside what the
   database itself already restricts access to — this repository does not add a redeemer-identity
   lookup convenience method, by design (this is a repository-layer echo of the UX governance
   decision already made in `economy-v1-ux-approved-specification.md`, not a new decision invented
   here).
10. `settleMatchEconomy`'s failure of ANY kind leaves zero partial state — no wallet credit, no
    ledger row, no participant row survives a failed call, including a failure on the LAST
    participant of an otherwise-successful-looking array. This must be independently proven by
    `InMemoryEconomyRepository` (JS has no ambient transaction to inherit this from), not assumed.
11. Frozen-wallet enforcement is asymmetric and this asymmetry is never "corrected" by any
    implementation: `commitMatchEntry` and `redeemRewardVoucher` reject a frozen wallet;
    `settleMatchEconomy`'s credit path and `refundMatchEntry` never do.
12. `ensureWallet` never creates a `player_identities` row, under any input, for any identity kind,
    ever — the single most load-bearing invariant in this document, given the prior-audit history
    behind it.
13. No raw voucher code exists inside this layer's process memory beyond the single `codeHash`
    parameter a caller supplies — this repository never generates, stores, logs, or returns one.
14. Every coin-amount value crossing this interface's boundary, in either direction, is a
    `string`, without exception.
15. `world_bank_accounts` is treated as a true singleton by every method that touches it — no
    method addresses, or can be made to create, a second row.
16. Reads never mutate, under any circumstance, including on error.
17. Every thrown error is one of the named classes in §4 — no method in either implementation may
    let a raw, unmapped exception (a bare `Error`, a raw `pg`/`PostgrestError`) escape to a caller
    uncaught and untranslated.

---

## 6. Contract Test Matrix

One shared suite, written against the `EconomyRepository` INTERFACE, run twice — once per
implementation — in the same CI job. ✅ = required coverage; — = not applicable to that method.

| Method | Success | Failure | Replay | Concurrency | Authorization |
|---|---|---|---|---|---|
| `ping` | ✅ | ✅ (unreachable store) | — | — | — |
| `getWallet` | ✅ (found + not-found) | ✅ (malformed id) | — | — | — |
| `listLedger` | ✅ (populated + empty + pagination bounds) | ✅ (malformed id) | — | — | — |
| `getSettlement` | ✅ | ✅ | — | — | — |
| `getWorldBankSnapshot` | ✅ | ✅ (infra only) | — | — | — |
| `getVoucherStatus` | ✅ | ✅ (malformed hash) | — | — | — |
| `getActiveConfiguration` | ✅ | ✅ (infra only) | — | — | — |
| `getPrizeSchedule` | ✅ (in-range + out-of-range → `null`) | — | — | — | — |
| `reconcileSettlement` | ✅ (balanced settlement) | ✅ (`MATCH_NOT_FOUND`) | — | — | — |
| `listStaleCommittedSettlements` | ✅ (populated + empty) | ✅ (infra only) | — | — | — |
| `ensureWallet` | ✅ (creates + returns existing) | ✅ (`IDENTITY_NOT_FOUND`, `INVALID_IDENTITY_ID`) | ✅ (idempotent effect, no envelope) | ✅ (concurrent first-call race) | — |
| `grantStarterCoins` | ✅ | ✅ (`WALLET_NOT_FOUND`) | ✅ | ✅ (8-caller race → exactly 1 applied) | — |
| `commitMatchEntry` | ✅ | ✅ (every `WalletError`/`SettlementError` this method can raise) | ✅ | ✅ (8-caller race → exactly 1 applied) | — |
| `settleMatchEconomy` | ✅ (member/guest/bot/solo branches) | ✅ (every error class this method can raise, **including the zero-partial-state assertion**, invariant 10) | ✅ | ✅ (8-caller race → exactly 1 applied, exactly 1 voucher) | — |
| `refundMatchEntry` | ✅ | ✅ (`MATCH_NOT_COMMITTED`, `MATCH_ALREADY_SETTLED`) | ✅ | ✅ (8-caller race) | — |
| `issueGuestVoucher` | ✅ | ✅ (`INVALID_VOUCHER_HASH`, collision) | ✅ (by `voucherId`) | ✅ (collision under concurrent issuance) | — |
| `redeemRewardVoucher` | ✅ | ✅ (every `VoucherError`/`WalletError` this method can raise) | ✅ (same-redeemer only, §2.1) | ✅ (8-caller race → exactly 1 applied) | ✅ (`ONLY_MEMBERS_CAN_REDEEM_VOUCHERS`, including the "checked before existence" ordering) |

**Compliance matrix (per-implementation, cross-cutting):**

| Property | `InMemoryEconomyRepository` | `SupabaseEconomyRepository` |
|---|---|---|
| All 17 methods implemented | Required | Required |
| Every §4 leaf class reachable by at least one test | Required | Required, via real Postgres exceptions, not simulated |
| §5's 17 invariants hold | Required, independently implemented — no shared code path with the SQL | Required, inherited from the migration's CHECK constraints/exception logic, still independently tested |
| Bigint fields are `string` end-to-end | Required | Required — the specific place Supabase's dual return-type behavior (jsonb-RPC-result vs. direct-select) must be normalized to one shape |
| `ensureWallet` never writes `player_identities` | Required (no such write path exists in the model at all) | Required, proven by a real-database test attempting the old auto-provision behavior and confirming it does not occur |

A method, error class, or invariant with zero corresponding test in this matrix is not, by this
document's own standard, part of the proven interface — regardless of whether the code compiles.

---

## 7. Implementation Deliverables

"Owner" below names the logical subsystem responsible for the file long-term (this codebase
organizes ownership by directory/module, not by named individuals) — not a person to be assigned.

| File | Purpose | Owner | Dependencies |
|---|---|---|---|
| `server/src/persistence/EconomyRepository.ts` | The interface (§2), all DTOs (§3), the full error hierarchy (§4) — pure types and error classes, zero runtime logic beyond error-class constructors | Persistence layer | None |
| `server/src/persistence/__tests__/economyRepositoryContract.test.ts` | The shared contract suite (§6), written against the interface only | Persistence layer | `EconomyRepository.ts` + both implementations below (added incrementally as Phase 2/3 land — this file's SHAPE is decided in Phase 1, its full content lands with Phase 4 of the roadmap) |

No other file is a Phase 1 deliverable. `InMemoryEconomyRepository.ts`, `SupabaseEconomyRepository.ts`,
and the `server/src/persistence/index.ts` factory extension are Phase 2/3 deliverables per the
roadmap and are named here only to confirm this package does not attempt to pre-build them.

---

## 8. Risks

| Risk | Rank | Detail |
|---|---|---|
| A method contract in §2 doesn't actually match the frozen migration's real RPC signature (transposed parameter, wrong return shape) | **HIGH** | Two adjacent parameters sharing a type (`humanSeatCount`/`botSeatCount`, both `number`) are invisible to `tsc` if swapped — this is a real, not hypothetical, class of bug; mitigated only by the manual signature diff in §9, never by the type system alone |
| The error-hierarchy reclassification in this document (domain-organized) silently drops or duplicates a leaf class that existed in the earlier check-origin taxonomy (`economy-v1-phase1-repository-spec.md`) | **MEDIUM** | Mitigated by this document's own construction — every leaf in the earlier spec was individually re-homed above, not regenerated from scratch; still worth an explicit line-by-line reconciliation pass before Phase 2 begins, not just an assumption that this document caught everything |
| `EconomyOperationResult<T>`'s `result` field on `applied:false` is implemented by returning the CALLER'S input reflected back, rather than the database's actual current state | **HIGH** | This is a correctness trap specifically because it would pass a shallow test (the shape looks right) while being subtly wrong (e.g. a replayed `commitMatchEntry` reflecting back the caller's requested `seatCount` instead of the ORIGINAL committed one, if those ever differed) — must be an explicit, named test case in §6, not left implicit |
| `InMemoryEconomyRepository`'s eventual re-implementation of §5's 17 invariants drifts from the SQL migration's actual CHECK constraints over time (a future migration edit not mirrored here) | **MEDIUM** | Structural risk of maintaining two independent implementations of the same rules — the contract suite (§6) is the ONLY thing that catches this drift; it is not a Phase 1 risk to solve, but a Phase 1 responsibility to hand off clearly to Phase 4 |
| Hidden coupling: a future caller (Phase 5 `EconomyService`, out of scope for design here) assumes this repository performs a business check it explicitly does not (§1) — e.g. assumes `commitMatchEntry` pre-validates seat count business-appropriately beyond shape | **MEDIUM** | Mitigated by this document's own explicit boundary statement (§1) being visible and referenced by whoever builds Phase 5 — a documentation risk, not a code risk, at this phase |
| Migration assumption: this entire interface assumes the nine RPCs' error-message TEXT remains stable enough for `SupabaseEconomyRepository`'s future string-to-class mapping to work | **HIGH** | The migration is frozen, so this is currently safe — but it is a standing constraint on ANY future migration edit (even a "harmless" wording change to a `raise exception` message would silently break the mapping) that nothing in the frozen migration itself enforces; worth flagging to whoever governs future schema changes, not fixable at this layer |
| Future RoomManager risk (named, not designed, per constraint): RoomManager's eventual integration (roadmap Phase 9) will call `commitMatchEntry`/`settleMatchEconomy`/`refundMatchEntry` from a context with real latency sensitivity (a player waiting for a match to start) — if this repository's methods are ever changed to add unexpected latency (e.g. an accidental N+1 read before the mutation), that latency lands directly in RoomManager's most latency-sensitive path | **MEDIUM** (flagged now, owned later) | Not a Phase 1 design flaw — a forward-looking constraint on how Phase 1's methods must be implemented (each as ONE round-trip per RPC call, no chatty pre-reads) so Phase 9 doesn't inherit an avoidable latency tax |
| Contract-test suite is written but only ever run against `InMemoryEconomyRepository` in practice (the real-database run is skipped for CI speed, quietly, over time) | **CRITICAL** | This is the single most consequential risk in the entire Phase 1–4 arc — a suite that stops running against a real database has silently stopped proving anything about `SupabaseEconomyRepository` at all, while still reporting green; this must be a CI-configuration decision made explicit and hard to accidentally disable, not left to convention |

---

## 9. GO / NO-GO Checklist

### Before coding begins (i.e., before `EconomyRepository.ts` is written)

- [ ] §2's interface (17 methods + `kind`) is accepted with no open `TODO`.
- [ ] Every method's parameter list has been diffed, line by line, against the actual RPC
      signature in `supabase/migrations/20260826000000_economy_v1.sql` — not re-read from memory,
      an actual side-by-side comparison (§8's HIGH risk item).
- [ ] §3's DTOs are accepted with every coin-amount field confirmed `string`, with no exception
      anywhere in §3.1–3.2.
- [ ] §4's error hierarchy is accepted, and the reconciliation pass against the earlier
      check-origin taxonomy (§8's MEDIUM risk item) has been performed — every leaf class from
      `economy-v1-phase1-repository-spec.md` §6 is accounted for somewhere in this document's §4,
      confirmed by name.
- [ ] §5's 17 invariants are individually reviewed and none contradicts §2's method contracts.
- [ ] §6's Contract Test Matrix is accepted as Phase 4's literal exit criteria, and the CI
      configuration for running it against a REAL database (not just in-memory) is agreed upon in
      principle now — not deferred to "figure out later" (§8's CRITICAL risk item).
- [ ] §7's file list is accepted as the complete Phase 1 deliverable set — no additional file is
      silently expected.

### Before Phase 2 (`InMemoryEconomyRepository`) may begin

- [ ] `EconomyRepository.ts` exists, compiles (`tsc --noEmit` clean), and matches §2/§3/§4 exactly
      — a diff between the written file and this document's tables, not a re-read-and-trust.
- [ ] No item in the file proposes a new database capability, a schema change, or a migration edit.
- [ ] No item in the file discusses or imports anything from `EconomyService`, any API route
      handler, any RoomManager module, or any UI/React code.
- [ ] The `EconomyOperationResult<T>.result`-on-replay correctness trap (§8, HIGH) has an explicit
      code comment or type-level note in the file itself, not left implicit for Phase 2/3's authors
      to rediscover independently.
- [ ] §9's own "before coding begins" checklist is fully checked — this second gate does not
      substitute for the first.

---

## 10. Phase 1 Execution Plan

**Step 1 — Write `EconomyRepository.ts`: DTOs and error hierarchy first, interface last.**
- **Files touched:** `server/src/persistence/EconomyRepository.ts` (new).
- **Order rationale:** the interface's method signatures REFERENCE the DTOs and error
  classes — writing them first means the interface itself is the last, simplest piece, reviewable
  as a single readable surface once its dependencies already exist in the file.
- **Expected tests:** none yet — this step produces types and error-class shells only.
- **Verification evidence:** `tsc --noEmit` passes; the manual signature diff from §9's
  "before coding begins" checklist is performed against this actual file, not a draft.

**Step 2 — Internal self-review against §5's invariant list.**
- **Files touched:** none (a review step, not an edit step) — corrections, if any, land back in
  Step 1's file.
- **Expected tests:** none.
- **Verification evidence:** a line-by-line note, for each of the 17 invariants in §5, of WHICH
  method's contract (§2) is responsible for upholding it — an invariant with no method
  demonstrably responsible for it is a gap in the interface, not just documentation.

**Step 3 — Draft the contract-suite SHAPE (test names and `it.todo`-equivalent placeholders,
matching §6's matrix exactly) without any implementation to run them against yet.**
- **Files touched:** `server/src/persistence/__tests__/economyRepositoryContract.test.ts` (new,
  skeleton only).
- **Dependencies:** Step 1's completed interface (the suite imports its types, even with no
  implementation to instantiate yet).
- **Expected tests:** the FULL enumeration from §6's matrix exists as named, pending test cases —
  none passing yet, none silently skipped without a `todo` marker.
- **Verification evidence:** every ✅ cell in §6's matrix has a corresponding named test in the
  file; a manual count reconciling the two.

**Step 4 — Final Phase 1 readiness confirmation.**
- **Files touched:** none.
- **Expected tests:** the full existing server suite (currently 855 tests, 103 files) re-run once,
  confirming this phase's new file (types + error classes + test skeleton, no runtime logic) causes
  zero regressions anywhere else in the codebase — an expected, low-risk confirmation given this
  step introduces no executable logic, but performed rather than assumed.
- **Verification evidence:** the §9 "before Phase 2 may begin" checklist, fully checked, is the
  literal deliverable this step produces — Phase 2 does not start until every box in that list is
  checked against the real, written file, not this planning document's description of it.

---

## FINAL NOTE

This package does not itself satisfy any box in §9 — those checklists describe what must be true
of the FILE this package specifies, once it exists. Nothing here has been written as code. No
migration, rollback, API, RoomManager, UI, or Admin Dashboard concern was discussed beyond naming
it as out of scope, per the explicit constraint. The next action, if the user chooses to proceed,
is Step 1 above.
