# Economy V1 — Phase 1 Implementation Specification: `EconomyRepository`

> **Status:** SPECIFICATION ONLY — no code, no SQL, no migration or roadmap changes. This document
> is the complete, final specification for Phase 1 of `docs/economy/economy-v1-implementation-roadmap.md`
> and supersedes that roadmap entry's brevity, not its decisions — nowhere below contradicts the
> roadmap or the blueprint; two methods (`getActiveConfiguration`, `getPrizeSchedule`) that the
> blueprint deferred as "omitted for brevity" are now formally specified as part of the interface,
> which is a completion, not a reversal.
> **Source of truth used:** `supabase/migrations/20260826000000_economy_v1.sql` (frozen, not
> re-read as a candidate for change — only as the contract this interface must faithfully expose),
> `docs/economy/economy-v1.md` §4/§6/§6a/§7, and the established `ProgressionRepository.ts` pattern
> this interface is required to mirror.
> **Out of scope, per explicit constraint:** `EconomyService`, any REST API, `RoomManager`, any UI.
> None of those are discussed below except where a boundary must be named to say what does NOT
> belong in this layer.

---

## 1. Repository Responsibilities

### What belongs inside `EconomyRepository`

- **Every** data access to the nine Economy V1 tables — no other module reads or writes
  `coin_wallets`, `coin_ledger_entries`, `reward_vouchers`, `world_bank_accounts`,
  `world_bank_ledger`, `match_economy_settlements`, `match_economy_participants`,
  `economy_configurations`, or `economy_prize_schedules` directly. This is the single seam the
  entire runtime layer passes through.
- **One method per database capability**, named identically to the RPC or query it wraps — no
  repository method may combine two RPC calls into one, and no repository method may invoke an RPC
  partially (e.g. calling `commit_match_entry` and then deciding, in TypeScript, whether to also
  call `settle_match_economy` — that composition belongs to `EconomyService`, Phase 5).
- **Faithful pass-through of the database's own outcome shapes** — the `{applied, operation,
  idempotencyKey, result}` envelope (`economy-v1.md` §6a) is carried through unchanged, not
  re-wrapped, re-named, or partially unpacked.
- **Translation of failure into named TypeScript error types** (§6) — the ONE piece of real
  "logic" this layer is permitted: turning a raw PL/pgSQL exception message or a raw
  `PostgrestError`/connection failure into a specific, catchable class.
- **Bigint-safety** — every coin-amount field crosses this boundary as a `string`, never a `number`
  (per the established bigint-precision rule; see §4).

### What must never belong inside `EconomyRepository`

- **No business validation beyond shape/type.** Whether a host has enough balance, whether a
  wallet is frozen, whether a ranking is valid — none of that is decided here. The repository
  calls the RPC and reports what the RPC decided; it does not pre-empt that decision. (Contrast
  with `EconomyService`, Phase 5, which explicitly DOES perform cheap pre-checks — that asymmetry
  is deliberate and is Phase 5's concern, not this one's.)
- **No retry logic.** A repository method fails once, cleanly, with a typed error. Retry policy
  (blueprint §2.3: one retry for infrastructure errors only) is a Phase 5 concern. A repository
  that retries internally would make Phase 5's retry policy either redundant or silently
  overridden — exactly one layer owns retry, and it is not this one.
- **No caching.** Every read hits the database (or the in-memory store, for
  `InMemoryEconomyRepository`) fresh. A stale-read bug hiding behind a repository-level cache would
  be invisible to every layer above it.
- **No cross-player aggregation.** `countActiveWallets()`-style admin reads belong to Phase 13
  (roadmap), which extends this interface later — Phase 1 is exclusively the player/match-scoped
  surface the blueprint already defined. Not discussed further here per the roadmap's own
  sequencing, restated only to draw the boundary.
- **No knowledge of HTTP, sessions, or `req.player`.** Authorization (who is allowed to call this)
  is entirely an API-layer concern, explicitly out of scope for this document. The one apparent
  exception — `redeemRewardVoucher` rejecting a non-member — is not an authorization check this
  layer performs; it is a business rule the DATABASE enforces and this layer reports (§6,
  Authorization Errors).
- **No raw voucher codes, ever, in any form** — this layer only ever sees or produces `codeHash`
  values. A raw code reaching this file's scope would already be a defect in whatever called it.
- **No RoomManager, socket, or Express types anywhere in this file's signatures.** The interface is
  pure TypeScript + Node's `Promise` — importable by a socket handler, an HTTP controller, or a
  test file with equal ease, which is the entire point of the seam.

---

## 2. Interface Specification

Two supporting types first — used throughout every method contract in §3.

```typescript
/**
 * Faithful pass-through of the database's own idempotency envelope
 * (economy-v1.md §6a). `applied: false` means "already happened; here is
 * the ORIGINAL result" — this is a normal return value, never a thrown error.
 */
export interface EconomyOperationResult<T> {
  readonly applied: boolean;
  readonly operation: string;
  readonly idempotencyKey: string;
  readonly result: T;
}

export type PlayerIdentityKind = "member" | "guest";
export type ParticipantIdentityKind = "member" | "guest" | "bot";
```

### `EconomyRepository` — full member list

| # | Method | Parameters | Return Type | Mutability |
|---|---|---|---|---|
| 1 | `kind` (readonly property, not a method) | — | `"memory" \| "supabase"` | n/a |
| 2 | `ping` | — | `Promise<void>` | Read (side-effect-free) |
| 3 | `getWallet` | `identityId: string` | `Promise<CoinWalletRecord \| null>` | Read |
| 4 | `listLedger` | `walletId: string, opts?: { limit?: number; offset?: number }` | `Promise<CoinLedgerEntryRecord[]>` | Read |
| 5 | `getSettlement` | `matchId: string` | `Promise<MatchEconomySettlementRecord \| null>` | Read |
| 6 | `getWorldBankSnapshot` | — | `Promise<WorldBankSnapshot>` | Read |
| 7 | `getVoucherStatus` | `codeHash: string` | `Promise<VoucherStatusView \| null>` | Read |
| 8 | `getActiveConfiguration` | — | `Promise<EconomyConfigurationRecord>` | Read |
| 9 | `getPrizeSchedule` | `seatCount: number` | `Promise<EconomyPrizeScheduleRecord \| null>` | Read |
| 10 | `reconcileSettlement` | `matchId: string` | `Promise<SettlementReconciliation>` | Read (RPC-backed) |
| 11 | `listStaleCommittedSettlements` | `olderThanMs: number` | `Promise<MatchEconomySettlementRecord[]>` | Read (RPC-backed) |
| 12 | `ensureWallet` | `identityId: string` | `Promise<CoinWalletRecord>` | **Conditional mutation**, no `Applied` envelope |
| 13 | `grantStarterCoins` | `identityId: string` | `Promise<EconomyOperationResult<CoinWalletRecord>>` | Mutation, idempotent |
| 14 | `commitMatchEntry` | `input: CommitMatchEntryInput` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | Mutation, idempotent |
| 15 | `settleMatchEconomy` | `input: SettleMatchEconomyInput` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | Mutation, idempotent |
| 16 | `refundMatchEntry` | `matchId: string, reason: string` | `Promise<EconomyOperationResult<MatchEconomySettlementRecord>>` | Mutation, idempotent |
| 17 | `issueGuestVoucher` | `input: IssueGuestVoucherInput` | `Promise<EconomyOperationResult<RewardVoucherRecord>>` | Mutation, idempotent |
| 18 | `redeemRewardVoucher` | `codeHash: string, memberIdentityId: string` | `Promise<EconomyOperationResult<RewardVoucherRecord>>` | Mutation, idempotent |

**"Mutability Expectations"**, stated once rather than per-row: every method numbered 3–11 above
MUST NOT alter any Economy V1 table under any circumstance, including on error — a read that
somehow writes is a defect regardless of what it writes. Every method 13–18 MUST be safe to call
an arbitrary number of times with the same logical input and MUST produce the mutation's effect
**at most once**, reported truthfully via `applied`. Method 12 (`ensureWallet`) is the one
deliberate exception to the `Applied`-envelope convention — see its contract in §3 for why.

---

## 3. Method Contracts

Grouped as **Reads** (brief — genuinely simple) and **Mutations** (full contract — where the real
specification weight belongs).

### 3.1 Reads

**`ping(): Promise<void>`**
- **Purpose:** Prove the store is reachable and the economy schema is present, once, at boot.
- **Inputs:** none.
- **Outputs:** resolves on success; rejects otherwise.
- **Expected behavior:** for `SupabaseEconomyRepository`, a single `SELECT ... LIMIT 1` against
  `economy_configurations` — proves both connectivity AND that the migration has actually been
  applied (an empty-but-reachable database still resolves; a database missing the table rejects).
  For `InMemoryEconomyRepository`, resolves unconditionally.
- **Idempotency behavior:** n/a (not a mutation).
- **Failure conditions:** `EconomyInfrastructureError` on any connectivity or schema-absence
  failure.

**`getWallet(identityId): Promise<CoinWalletRecord | null>`**
- **Purpose:** Fetch a single wallet by identity.
- **Inputs:** `identityId: string`, non-empty (empty string is a caller bug — throws
  `InvalidIdentityError` without a round-trip, same reasoning as `commitMatchEntry`'s cheap
  rejects).
- **Outputs:** the wallet record, or `null` if none exists yet (a wallet that hasn't been
  provisioned is a valid, non-error state — never a thrown `WalletNotFoundError` from this
  specific method, which is the one place `null` is the correct signal rather than an error;
  contrast with `ensureWallet`, which DOES throw for a genuinely unknown identity).
- **Expected behavior:** exact row read, no derived fields.
- **Idempotency behavior:** n/a — reads have no replay concept.
- **Failure conditions:** `InvalidIdentityError` (empty/malformed id, checked before any query);
  `EconomyInfrastructureError` (connectivity).

**`listLedger(walletId, opts?): Promise<CoinLedgerEntryRecord[]>`**
- **Purpose:** Paginated ledger history for one wallet.
- **Inputs:** `walletId: string`; `opts.limit` (default 20, hard max 100 — enforced HERE, not left
  to the caller, since an unbounded `limit` is a resource-exhaustion vector regardless of which
  layer eventually calls this); `opts.offset` (default 0, must be `>= 0`).
- **Outputs:** array, newest-first (`created_at desc`), possibly empty — an empty array for a
  wallet with no history is correct, not an error.
- **Expected behavior:** a `limit` above 100 is silently clamped to 100, not rejected — pagination
  bounds are a resource concern, not a validation failure a caller needs to be told about.
- **Idempotency behavior:** n/a.
- **Failure conditions:** `InvalidIdentityError` (malformed `walletId`); `EconomyInfrastructureError`.

**`getSettlement(matchId): Promise<MatchEconomySettlementRecord | null>`**
- Same shape as `getWallet`: `null` for "no settlement yet" (a match that hasn't committed), never
  an error for that case. `InvalidIdentityError`-equivalent for a malformed `matchId` is instead
  named generically — see §6's naming convention note on this exact ambiguity.

**`getWorldBankSnapshot(): Promise<WorldBankSnapshot>`**
- **Purpose:** The four independent treasury balances (`economy-v1.md` §5.3), read together so a
  caller never sees them at two different moments in time relative to each other.
- **Outputs:** always exactly one record — the table is a database-enforced singleton
  (`world_bank_singleton` CHECK), so this method's return type is NOT nullable, unlike the
  per-identity/per-match reads above. A `null`-returning implementation here is a defect, not a
  valid state.
- **Failure conditions:** `EconomyInfrastructureError` only (the singleton's existence is a
  migration-time guarantee, not a runtime possibility to defend against here).

**`getVoucherStatus(codeHash): Promise<VoucherStatusView | null>`**
- **Purpose:** A narrow read — status and amount only, NOT the full `RewardVoucherRecord` — used
  for lightweight existence/status checks without exposing `issuedToGuestId`/`redeemedByMemberId`
  to every caller of this method by default.
  ```typescript
  export interface VoucherStatusView {
    status: VoucherStatus;
    coinAmount: string;
  }
  ```
- **Inputs:** `codeHash`, must match `^[0-9a-f]{64}$` — checked here, before any query, since a
  malformed hash can never match a real row and querying for it wastes a round-trip on a caller
  bug.
- **Failure conditions:** `InvalidVoucherHashError` (malformed shape); `EconomyInfrastructureError`.

**`getActiveConfiguration(): Promise<EconomyConfigurationRecord>`** *(formalized in this document —
see the status note at the top)*
- **Purpose:** Backs the future `quoteMatchCheckout` (Phase 5) — the single active
  `economy_configurations` row (`is_active = true`, database-enforced singleton via partial unique
  index, `economy-v1.md` §5.1).
- **Outputs:** non-nullable, same reasoning as `getWorldBankSnapshot`.
- **Failure conditions:** `EconomyInfrastructureError` only.

**`getPrizeSchedule(seatCount): Promise<EconomyPrizeScheduleRecord | null>`** *(formalized in this
document)*
- **Purpose:** The prize tier for a given seat count, also for `quoteMatchCheckout`.
- **Inputs:** `seatCount: number`, checked against `1..5` HERE, before any query — an out-of-range
  value can never match a row, so this returns `null` for it rather than querying, but ALSO the
  caller receives `null` either way for "unsupported," making the 1–5 boundary a documentation
  fact rather than a distinct error path at this layer (contrast with `commitMatchEntry`, where an
  unsupported seat count IS a distinct thrown error — that asymmetry is intentional: a read
  returning "nothing found" is normal; a mutation attempting real money movement against an invalid
  configuration is not).

**`reconcileSettlement(matchId): Promise<SettlementReconciliation>`**
- **Purpose:** Wraps `reconcile_match_settlement(text)` — the one RPC-backed read, computing
  collected-vs-disbursed conservation for a single settlement.
  ```typescript
  export interface SettlementReconciliation {
    matchId: string; status: MatchSettlementStatus; isBalanced: boolean;
    collected: string; disbursed: string; delta: string;
    details: { walletRewarded: string; guestEscrow: string; botCollection: string; worldBankCut: string; refunded: string };
  }
  ```
- **Failure conditions:** a **named** `MatchNotFoundError` if the settlement doesn't exist (the RPC
  itself raises `MATCH_NOT_FOUND` — this is the one read method where "not found" IS an error, not
  a `null`, because the RPC's own contract makes it one; the repository must not paper over that
  distinction by inventing a `null` return the RPC never offered).

**`listStaleCommittedSettlements(olderThanMs): Promise<MatchEconomySettlementRecord[]>`**
- **Purpose:** Wraps `list_stale_committed_settlements(interval)` — read-only, backs the future
  reconciliation surface. Nothing about this method's existence implies it is ever called
  automatically; that remains explicitly false at every layer above this one too (`economy-v1.md`
  §9).
- **Inputs:** `olderThanMs: number`, converted to a Postgres `interval` at the boundary
  (`SupabaseEconomyRepository`'s concern; `InMemoryEconomyRepository` compares millisecond
  timestamps directly).
- **Outputs:** possibly empty array — the healthy, expected case.

### 3.2 Mutations

**`ensureWallet(identityId): Promise<CoinWalletRecord>`**
- **Purpose:** Idempotent wallet provisioning — the one composition helper every mutating method
  below calls internally at the database layer already; exposed here because `EconomyService`
  (Phase 5) needs to call it directly too (e.g. before `getWallet` for a brand-new identity).
- **Inputs:** `identityId: string`.
- **Outputs:** the wallet row, guaranteed to exist by the time this resolves.
- **Expected behavior:** if a wallet already exists, returns it unchanged. If not, creates it and
  triggers the starter grant, THEN returns the freshly-granted wallet.
- **Idempotency behavior:** **deliberately not wrapped in `EconomyOperationResult`.** Its
  underlying effect (provisioning + starter grant) IS idempotent — calling it 100 times produces
  one wallet and one grant — but there is no meaningful "was THIS call the one that provisioned it"
  question a caller needs answered, unlike `commitMatchEntry` where "did MY debit happen" matters.
  Returning the plain record, not an envelope, is intentional, not an oversight.
- **Failure conditions:** `IdentityNotFoundError` — **the single most consequential behavior in
  this entire specification**: this method does NOT create a `player_identities` row under any
  circumstance, for guests or members, regardless of what the `identityId` string looks like. An
  identity must already exist. This is a final, settled decision from the remediation/re-audit
  work (Correction 4) — not open for reconsideration in this document. `InvalidIdentityError` for
  a null/empty id, checked before any query.

**`grantStarterCoins(identityId): Promise<EconomyOperationResult<CoinWalletRecord>>`**
- **Purpose:** The starter-grant RPC, exposed directly (as distinct from `ensureWallet`'s implicit
  call to it) for a caller that needs to explicitly re-attempt a grant it isn't sure landed.
- **Inputs:** `identityId: string` — the wallet must already exist (this method does NOT call
  `ensureWallet` internally; that composition is `EconomyService`'s decision, not this layer's).
- **Outputs:** `EconomyOperationResult<CoinWalletRecord>`.
- **Expected behavior:** grants 2,000 (guest) or 5,000 (member) coins exactly once per wallet, per
  the active configuration at grant time.
- **Idempotency behavior:** guarded by the wallet's own `starter_granted` boolean, not merely the
  idempotency key string — a replay (any subsequent call for the same identity) returns
  `applied:false` with the wallet's CURRENT state, not a stale snapshot from the first grant.
- **Failure conditions:** a repository-level `WalletNotFoundError` if no wallet row exists yet (a
  caller that skipped `ensureWallet` first); `EconomyInfrastructureError`.

**`commitMatchEntry(input): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>`**
```typescript
export interface CommitMatchEntryInput {
  matchId: string; roomCode: string | null; hostIdentityId: string;
  seatCount: number; humanSeatCount: number; botSeatCount: number; isSolo: boolean;
}
```
- **Purpose:** Debit the host, create the `COMMITTED` settlement — the entry point Phase 9
  (RoomManager, out of scope here) will eventually call before allowing a match to start.
- **Inputs:** all fields required; `seatCount === humanSeatCount + botSeatCount` checked here
  (cheap, pre-database) as well as by the database itself — defense in depth, not a substitute.
- **Outputs:** the settlement, `status: "COMMITTED"`.
- **Expected behavior:** debits `seatCount × active-configuration's seat_cost_coins` from the host
  wallet; writes exactly one wallet-ledger row; creates exactly one settlement row.
- **Idempotency behavior:** keyed by `matchId` — a replayed call for the same `matchId` returns
  `applied:false` with the ORIGINAL settlement, regardless of whether the input parameters on the
  replay attempt differ from the original call (the repository does not re-validate parameter
  equality on replay; the database's own idempotency guard fires on `matchId` alone, and this
  layer does not add a second, stricter check the database doesn't itself perform).
- **Failure conditions:** `WalletFrozenError` (host wallet frozen — checked before balance,
  matching `economy-v1.md`'s documented order); `InsufficientFundsError`; `InvalidSeatConfigurationError`
  (arithmetic mismatch); `UnsupportedSeatCountError` (outside 1–5); `IdentityNotFoundError` (host
  has no `player_identities` row — surfaces through the internal `ensureWallet` call the RPC itself
  performs); `EconomyInfrastructureError`.

**`settleMatchEconomy(input): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>`**
```typescript
export interface SettleMatchEconomyInput {
  matchId: string; isValidRanking: boolean;
  participants: SettlementParticipantInput[]; refundReason?: string;
}
export interface SettlementParticipantInput {
  identityId: string; identityKind: ParticipantIdentityKind; placement: number; voucherCodeHash?: string;
}
```
- **Purpose:** Distribute prizes (valid ranking) or refund in full (invalid ranking) — a single
  entry point for both outcomes, matching the database's own `p_is_valid_ranking`-branching design
  (finding M6).
- **Inputs:** `isValidRanking` is REQUIRED, never inferred by this layer from the participants
  array — that inference is a game-rules concern belonging entirely outside this repository (and
  outside Phase 1 generally). Every `participants[].identityKind` must be exactly
  `"member" | "guest" | "bot"` at the TYPE level (TypeScript itself rejects anything else at
  compile time for a caller using the interface correctly) — but a caller constructing this object
  from untyped/external data (e.g. deserialized JSON) can still produce an invalid runtime value,
  which is why the database's own `INVALID_IDENTITY_KIND` rejection (Correction 1) still matters
  as a runtime backstop even though the TypeScript type appears to rule it out.
- **Outputs:** the settlement, `status: "SETTLED"` or `"REFUNDED"` depending on `isValidRanking`.
- **Expected behavior:** exactly as specified in `economy-v1.md` §6 item 4 — member credits,
  guest escrow deposits (zero wallet-ledger impact), bot collections, world bank cut, all inside
  one all-or-nothing database transaction.
- **Idempotency behavior:** keyed by `matchId`; a replay of an already-`SETTLED` or already-
  `REFUNDED` match returns `applied:false` with the existing outcome — this method NEVER
  transitions a settled match to refunded or vice versa on a second call, regardless of what
  `isValidRanking` the second call passes.
- **Failure conditions:** `InvalidIdentityKindError`; `InvalidVoucherHashError` (guest prize
  missing/malformed hash); `VoucherCodeCollisionError` (a genuine, non-idempotency-related unique
  violation on `code_hash` — see §6, Concurrency Errors); `SettlementConservationViolationError`;
  `MatchNotCommittedError` (no settlement row exists for this `matchId` at all);
  `IdentityNotFoundError` (a member participant whose identity doesn't exist — Correction 4's
  consequence surfacing here too); `EconomyInfrastructureError`.
- **Atomicity guarantee (explicit, load-bearing):** on ANY failure above, this method guarantees
  zero partial effect — no wallet credit, no ledger row, no `match_economy_participants` row for
  ANY participant in the array, even ones that would have succeeded had they been processed alone.
  This is not an aspiration; it was directly verified (Correction 3) and is a hard contract this
  interface's implementations (Phase 2, Phase 3) must each independently prove, not just inherit
  from the database's transaction semantics — `InMemoryEconomyRepository` in particular must
  implement this explicitly, since JS has no ambient "transaction" to fall back on.

**`refundMatchEntry(matchId, reason): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>`**
- **Purpose:** Standalone refund entry point — cancellation/abandonment, independent of
  `settleMatchEconomy`'s internal invalid-ranking path.
- **Inputs:** `reason: string`, non-empty (checked here — an empty reason is rejected before any
  query, since it's an audit-trail requirement, not a database-enforced one, and rejecting it
  cheaply is strictly better than letting the database accept an empty string it has no CHECK
  constraint against).
- **Outputs:** the settlement, `status: "REFUNDED"`.
- **Expected behavior:** full committed amount restored to the host wallet; `lifetime_refunded`
  credited; `lifetime_spent` UNCHANGED (never decremented — a repository-level invariant, §7).
- **Idempotency behavior:** keyed by `matchId`; a replay against an already-`REFUNDED` match
  returns `applied:false`.
- **Failure conditions:** `MatchNotCommittedError`; `MatchAlreadySettledError` (the settlement
  reached `SETTLED` before this call arrived — a genuine, expected race, not a bug, see blueprint
  §2.5); `EconomyInfrastructureError`.

**`issueGuestVoucher(input): Promise<EconomyOperationResult<RewardVoucherRecord>>`**
```typescript
export interface IssueGuestVoucherInput {
  voucherId: string; codeHash: string; coinAmount: string; matchId: string; issuedToGuestId: string;
}
```
- **Purpose:** Standalone voucher issuance — exists for parity with the full RPC surface;
  `settleMatchEconomy` does NOT call this internally (it inserts directly, per the migration's own
  design), so this method's only caller today would be a FUTURE path issuing a voucher outside a
  settlement — none exists yet, and this document does not invent one.
- **Inputs:** `codeHash` must be exactly 64 hex characters (checked here, before any query);
  `coinAmount` a positive bigint-string.
- **Idempotency behavior:** keyed by `voucherId` — a replay with the SAME `voucherId` returns
  `applied:false` with the original voucher. A DIFFERENT `voucherId` reusing the same `codeHash` is
  NOT a replay — it is a collision, and fails as one (`VoucherCodeCollisionError`, §6). This
  distinction — same id is a replay, same hash with a different id is a collision — is the single
  most important nuance in this method's contract and must not be conflated by any implementation.
- **Failure conditions:** `InvalidVoucherHashError`; `VoucherCodeCollisionError`;
  `IdentityNotFoundError` (`issuedToGuestId` has no `player_identities` row); `EconomyInfrastructureError`.

**`redeemRewardVoucher(codeHash, memberIdentityId): Promise<EconomyOperationResult<RewardVoucherRecord>>`**
- **Purpose:** The one method in this entire interface that touches raw-code-adjacent security —
  though even here, this layer receives only the already-hashed value; hashing the client's raw
  input is explicitly Phase 5/7's responsibility, never this layer's.
- **Inputs:** `codeHash` (64 hex chars, checked here first); `memberIdentityId`.
- **Outputs:** the voucher, `status: "REDEEMED"`.
- **Expected behavior:** credits the member wallet, releases the equivalent `guest_escrow_liability`,
  increments `total_voucher_redeemed`, marks the voucher redeemed — all one transaction.
- **Idempotency behavior:** a replay by the SAME member for an already-redeemed-by-them voucher
  returns `applied:false` with the voucher's current state. A DIFFERENT member attempting to redeem
  an already-redeemed voucher is NOT a replay — it is a genuine rejection
  (`VoucherAlreadyRedeemedError`), and this distinction (redeemer identity matters for what counts
  as "the same call") must be preserved by every implementation, not just the Supabase one where
  the database already enforces it.
- **Failure conditions:** `OnlyMembersCanRedeemError` (guest attempted redemption — checked by the
  database BEFORE voucher lookup, so this error can occur even for a codeHash that doesn't exist,
  which is intentional: it never discloses voucher existence to a non-member); `WalletFrozenError`
  (member's own wallet frozen — checked AFTER existence/status, per `economy-v1.md` §7's documented
  order); `VoucherNotFoundError`; `VoucherNotActiveError`; `VoucherAlreadyRedeemedError` (different
  redeemer); `InvalidVoucherHashError` (malformed shape); `EconomyInfrastructureError`.

---

## 4. Request Models

Every mutating method's input is a **plain, serializable object** — no class instances, no
methods, no defaults resolved inside the DTO itself (defaults belong to the database's own column
defaults or to `EconomyService`, never silently applied inside a repository-layer type).

**Bigint fields are `string`, always.** `coinAmount`, and every field that becomes one in a
response (`balance`, `totalCollected`, etc.) — this is a hard, non-negotiable rule carried directly
from the earlier remediation work (finding L3): a JS `number` silently loses precision above
2^53, and this codebase's own `pg` driver already returns bigint columns as strings for direct
selects, so `number` here would be not just risky but INCONSISTENT with how the data already
arrives from one of the two code paths that produce it (jsonb-RPC-return vs. direct-select — see
`economy-v1.md` §6a's own note on this exact type-mapping trap).

**Validation expectations, by category:**

| Category | Where validated | Example |
|---|---|---|
| **Shape/type** (wrong type, missing field) | Compile-time via TypeScript for any caller using the interface correctly; a runtime guard ONLY where the value crosses an untyped boundary (deserialized JSON) — `settleMatchEconomy`'s `participants[].identityKind` is the one field in this whole interface where this applies, per §3.2 | `identityKind: "member"` typed as a literal union |
| **Cheap, deterministic business shape** (hash format, seat-count range, non-empty string) | In the repository, before any query — §3's per-method contracts each name exactly which | `codeHash ~ /^[0-9a-f]{64}$/` |
| **Stateful business rules** (sufficient balance, wallet frozen, voucher status, conservation) | Never in the repository — always the database, reported back via the error hierarchy (§6) | `INSUFFICIENT_FUNDS`, `WALLET_FROZEN` |

No request model in this interface carries an idempotency key as an explicit field — every key is
derived deterministically from the operation's own natural identifiers (`matchId` for
match-scoped operations, `identityId` for wallet-scoped ones, `voucherId` for voucher issuance),
computed identically by the caller and the database, never supplied as free-form caller input. A
free-form idempotency-key parameter would let a caller accidentally (or maliciously) collide two
unrelated operations onto one key — not permitted anywhere in this interface.

---

## 5. Response Models

**Success models — two shapes, no more:**
1. `T | null` for reads where "not found" is a valid, expected state (§3.1's `getWallet`,
   `getSettlement`, `getVoucherStatus`, `getPrizeSchedule`).
2. `T` (non-nullable) for reads where the row is a database-guaranteed singleton
   (`getWorldBankSnapshot`, `getActiveConfiguration`) or where "not found" is itself a distinct
   thrown error rather than a valid null state (`reconcileSettlement`).
3. `EconomyOperationResult<T>` for every mutation except `ensureWallet` (§3.2 explains the one
   exception).

**Failure models: there is exactly one — a thrown error.** No method in this interface returns a
result object that itself carries a `success: false` / `error: "..."` field alongside a `T`. A
failure is ALWAYS a rejected Promise carrying one of the named classes in §6, never a returned
value the caller must remember to check. This is a deliberate, singular convention across the
entire interface — mixing "sometimes an error, sometimes a `{success:false}` object" between
methods would make every caller's error handling method-specific instead of uniform.

**Applied / Not-Applied model — the one place a "failure-shaped" outcome is NOT an error:**

| Outcome | Represented as | Caller's correct response |
|---|---|---|
| Fresh mutation succeeded | `{applied: true, result: <new state>}` | Proceed as if this call caused the effect (because it did) |
| Replay of an already-applied operation | `{applied: false, result: <ORIGINAL state, not the caller's requested state>}` | Proceed IDENTICALLY to the `applied: true` case — same downstream action, because from the caller's point of view the desired outcome (the match is committed, the voucher is redeemed) is equally true either way |
| Genuine business-rule rejection | Thrown named error | Handle per §6 — this is NOT a variant of `applied: false`, and no implementation may ever represent a rejection as `{applied: false}` instead of throwing |

---

## 6. Error Hierarchy

```
EconomyRepositoryError (abstract base — never thrown directly)
│
├── EconomyValidationError                    ── cheap, pre-database rejections this layer itself performs
│     ├── InvalidIdentityError                   (empty/malformed identityId)
│     ├── InvalidVoucherHashError                 (codeHash not 64 hex chars)
│     ├── InvalidSeatConfigurationError            (seatCount ≠ human+bot)
│     ├── UnsupportedSeatCountError                (outside 1–5)
│     └── InvalidIdentityKindError                 (participant identityKind not member/guest/bot)
│
├── EconomyBusinessRuleError                    ── stateful rules the DATABASE decided, reported here
│     ├── WalletFrozenError
│     ├── InsufficientFundsError
│     ├── IdentityNotFoundError                    (no player_identities row — Correction 4)
│     ├── WalletNotFoundError                      (no coin_wallets row where one was assumed)
│     ├── MatchNotCommittedError
│     ├── MatchAlreadySettledError
│     └── SettlementConservationViolationError     ── "Settlement Errors" per the requested taxonomy
│
├── EconomyAuthorizationError                   ── NOT session/HTTP auth (out of scope) — identity-KIND-based business authorization the database itself enforces
│     └── OnlyMembersCanRedeemError                (guest attempted a member-only action)
│
├── EconomyVoucherError                          ── "Voucher Errors" per the requested taxonomy
│     ├── VoucherNotFoundError
│     ├── VoucherNotActiveError
│     ├── VoucherAlreadyRedeemedError
│     └── VoucherCodeCollisionError                ── "Concurrency Errors": a genuine unique-constraint
│                                                      race between two DIFFERENT legitimate issuances,
│                                                      distinct from an idempotency-key replay (§3.2)
│
├── MatchNotFoundError                          ── reconcileSettlement's specific "does not exist" (distinct from the null-returning reads)
│
└── EconomyInfrastructureError                  ── connectivity, timeout, or any unmapped database error;
                                                     the ONLY class Phase 5's retry policy may ever retry
```

**Naming convention:**
- Every class name ends in `Error`, no exceptions.
- Every class name states the CONDITION, not the METHOD it occurred in
  (`InsufficientFundsError`, not `CommitMatchEntryInsufficientFundsError`) — the same condition can
  legitimately occur from more than one method (e.g. `IdentityNotFoundError` from `ensureWallet`
  directly OR from `commitMatchEntry`'s internal `ensureWallet` call), and a caller catching it
  should not need to know which call path produced it.
- Every class exposes a `readonly code: string` matching the exact UPPER_SNAKE_CASE token the
  database raises (`WALLET_FROZEN`, `IDENTITY_NOT_FOUND`, ...) — this is the ONE place string
  matching against the database's raw exception text is permitted at all, and it happens exactly
  once per error class, inside the repository's own mapping logic (Phase 3's concern to implement;
  this document specifies the target, not the mapping code itself).
- No error class carries a `.cause` chain back to a raw `PostgrestError`/`pg` driver exception in
  its PUBLIC shape — the raw underlying error is logged (server-side only, at the point of
  mapping), never exposed on the typed error instance itself, so that nothing above this layer can
  accidentally leak a raw database error string into a client-facing response by forwarding
  `.cause`.

**On `EconomyAuthorizationError` specifically** (since its inclusion could be misread as
contradicting §1's "no HTTP/session knowledge" rule): this category exists because
`ONLY_MEMBERS_CAN_REDEEM_VOUCHERS` genuinely IS an authorization decision — just one made by the
database based on `player_identities.kind`, not by this repository based on a session. The
repository reports it; it does not decide it. A future HTTP-layer 403 (Phase 7, out of scope here)
will be DERIVED from catching this class, not the other way around.

---

## 7. Operational Invariants

Every invariant below must hold for BOTH implementations (Phase 2, Phase 3) identically, proven by
Phase 4's shared contract suite — none of these are Supabase-specific or memory-specific.

1. **Wallet balances never mutate outside the nine RPC-backed methods.** No method in this
   interface exposes a raw "set balance" or "adjust balance" operation, and none ever will within
   Phase 1's scope — this mirrors the database's own privilege boundary (`economy-v1.md` §7) at the
   TypeScript layer.
2. **Every mutating method is safe to call an unbounded number of times with the same natural
   idempotency key** — no method may ever produce a second effect on replay, under any
   concurrency, including genuinely simultaneous calls (not just sequential retries).
3. **`applied: false` is never treated as, logged as, or surfaced as an error, by this layer, at
   any point.**
4. **A voucher redeems at most once, ever** — enforced identically whether the second attempt
   arrives sequentially or concurrently with the first.
5. **A `voucherId` replay is a no-op; a `codeHash` collision under a NEW `voucherId` is a hard
   failure** — these are never conflated (§3.2).
6. **Settlement transitions are one-way and terminal**: `COMMITTED → SETTLED` or
   `COMMITTED → REFUNDED`, never reversed, never re-entered, by any method in this interface.
7. **`lifetime_spent` never decreases, under any method, for any reason** — a refund credits
   `lifetime_refunded`, exclusively.
8. **A `settleMatchEconomy` failure of any kind leaves zero partial state** — no wallet credit, no
   ledger row, no participant row survives a failed call, for ANY reason the call failed,
   including a failure on the LAST participant in an otherwise-successful-looking array.
9. **Frozen-wallet enforcement is asymmetric and this asymmetry is never "fixed" by this layer**:
   `commitMatchEntry` and `redeemRewardVoucher` reject a frozen wallet; `settleMatchEconomy`'s
   credit path and `refundMatchEntry` do not and must not — a frozen wallet always remains able to
   receive.
10. **`ensureWallet` never creates a `player_identities` row, under any input, ever** (Correction 4
    — the single most load-bearing invariant in this entire document, given how much prior audit
    work exists specifically because this was once violated).
11. **No raw voucher code ever exists inside this layer's process memory beyond the single
    `codeHash` parameter it receives** — this repository never generates, stores, logs, or returns
    a raw code, under any method, under any circumstance.
12. **Every coin-amount value crossing this interface's boundary, in either direction, is a
    `string`** — never a `number`, in any method's input or output, without exception.
13. **`world_bank_accounts` is read and, when mutated (via the RPC-backed methods only), treated
    as a true singleton** — no method in this interface may address a second row, and none exposes
    a way to create one.
14. **Reads never mutate, under any circumstance, including on error** (§1, restated here as a
    formal invariant since it is independently testable and belongs in this list explicitly).

---

## 8. Unit Testing Requirements

These are the tests EACH implementation (`InMemoryEconomyRepository` in Phase 2,
`SupabaseEconomyRepository` in Phase 3) must independently satisfy, in addition to — not instead
of — Phase 4's shared contract suite. Phase 1 itself has no implementation to test; this section
specifies the target both later phases are built against.

**Required tests, per mutating method (18 methods total from §2, 7 of which are true mutations
plus `ensureWallet`):**
- One test per named error class that method can throw (§6's per-method mapping in §3.2) —
  every listed failure condition needs a corresponding red-path test, not just the happy path.
- One replay test proving `applied: false` with the ORIGINAL result on a second identical call.
- One test proving the specific atomicity/ordering claim unique to that method where one exists
  (e.g. `commitMatchEntry`'s frozen-check-before-balance-check order; `redeemRewardVoucher`'s
  membership-check-before-voucher-lookup order — both from `economy-v1.md`'s documented sequencing,
  both independently testable).

**Required tests, per read method:** a populated-state test, an empty/`null`-state test, and — for
`listLedger` specifically — a pagination-boundary test (`limit` clamping at 100, `offset`
behavior).

**Mocking strategy:** `EconomyRepository` is the mock boundary for everything ABOVE this layer
(Phase 5 onward) — a future `EconomyService` unit test mocks this interface directly (e.g. a
hand-written stub or a generated mock satisfying the interface), never `InMemoryEconomyRepository`
itself as a "lighter" stand-in, and never `SupabaseEconomyRepository`/`PostgrestClient`. Within
THIS phase's own testing (Phase 2/3), there is no mocking — `InMemoryEconomyRepository` is tested
directly against its own real logic, and `SupabaseEconomyRepository` is tested against a REAL
local Postgres (the existing embedded-postgres harness), never a mocked database — mocking the
database layer while testing the database-backed repository would test nothing but the mock's own
shape.

**Success paths:** covered by the "populated-state"/"happy path" tests above — deliberately not
elaborated further here since success is the less interesting half of this specification's own
attention, by design (per this document's own weighting, see §3.2's fuller mutation contracts vs
§3.1's brief read contracts).

**Failure paths:** every row of §6's hierarchy must be triggered by at least one test, in at least
one implementation — a class that exists in the hierarchy but is never actually thrown by any test
is a specification gap, not a passing test suite.

**Replay paths:** every one of the 7 true mutating methods needs an explicit replay test — this is
not optional coverage, it is the single property this entire interface exists to guarantee.

---

## 9. Contract Testing Requirements

**Contract tests** (Phase 4 of the roadmap, specified here as Phase 1's exit requirement rather
than re-planned): ONE test suite, written against the `EconomyRepository` INTERFACE — not against
either concrete class — and run twice, once per implementation, inside the same CI job.

**Repository Compliance Matrix** — every cell below must be independently proven true for BOTH
implementations before Phase 4 (and therefore Phase 5) may be considered complete:

| Property | `InMemoryEconomyRepository` | `SupabaseEconomyRepository` |
|---|---|---|
| Implements all 18 interface members | Required | Required |
| Every §6 error class reachable | Required | Required, via real Postgres exceptions |
| Idempotent replay for all 7 mutations | Required | Required, under real concurrency (reuses `verifyEconomySchema.mjs`'s 5 proven concurrency scenarios as the standard, not a lighter one) |
| §7's 14 invariants hold | Required, independently implemented (no shared code path with the SQL) | Required, inherited from the migration's own CHECK constraints and exception logic |
| Bigint fields are `string` end-to-end | Required | Required — this is the specific place Supabase's dual return-type behavior (jsonb-RPC-result vs. direct-select) must be normalized to ONE consistent shape by this repository, never leaked through as-is |
| `ensureWallet` never writes `player_identities` | Required (no such write path exists in the in-memory model at all) | Required (proven by a real-database test attempting the old auto-provision behavior and confirming it does NOT happen) |

**Required test coverage:** every method in §2's table, every error class in §6, every invariant
in §7 — each appears in the shared suite at least once. A method, error class, or invariant with
zero corresponding contract-test coverage is, by this document's own standard, not actually part
of the proven interface yet, regardless of whether the TypeScript compiles.

**Compatibility expectations:** a caller (any future Phase 5+ consumer) must be able to swap
`InMemoryEconomyRepository` for `SupabaseEconomyRepository` by changing exactly one factory call
(mirroring `server/src/persistence/index.ts`'s existing `progressionRepository()` pattern) with
ZERO other code change required anywhere above this layer. This compatibility claim is not
aspirational language — it is exactly what the contract-test suite exists to prove, mechanically,
not just assert in prose.

---

## 10. Verification Gates

**What must be proven before Phase 2 (`InMemoryEconomyRepository`) may start:**
- This specification itself contains no internal contradiction with the frozen migration — every
  method name, parameter, and error condition in §2–§3 traces to an actual RPC, table, or
  documented behavior in `supabase/migrations/20260826000000_economy_v1.sql` /
  `docs/economy/economy-v1.md`, not an invented convenience.
- Every method's bigint fields are confirmed `string`-typed with no exception (a single `number`
  slipping through anywhere in §2's table would need to be caught HERE, before Phase 2 writes a
  single line against this interface).
- `tsc --noEmit` passes against the interface file once it exists (this document is the
  specification for that file's content, not the file itself).

**What evidence is required:** a manual line-by-line diff of §2's 18 members against the
migration's actual function signatures and table columns — not a re-read-and-trust, an actual
side-by-side comparison, since a transposed parameter or a missed field is invisible to the type
checker when two adjacent parameters share a type (already flagged as a real risk in the roadmap's
own Phase 1 entry).

**What blocks progression:** any of the following, discovered at any point before Phase 2 begins,
is a hard stop, not a note-and-continue:
- A method whose contract (§3) describes behavior the actual RPC does not perform.
- An error class in §6 with no corresponding real database exception to map from.
- Any coin-amount field typed as `number` anywhere in §2–§5.
- Any method signature implying this repository could create a `player_identities` row (violates
  invariant §7.10).

---

## 11. GO / NO-GO Checklist

**All items below must be checked complete before Phase 2 (`InMemoryEconomyRepository`) may
begin:**

- [ ] §2's interface (18 members) is finalized with no open `TODO`/placeholder types.
- [ ] Every method in §2 has a complete §3 contract (Purpose, Inputs, Outputs, Expected Behavior,
      Idempotency Behavior, Failure Conditions) — no method deferred to "add later."
- [ ] §4's Request Models are fully typed, with every bigint field confirmed `string`.
- [ ] §5's Response Models are fully typed, with the Applied/Not-Applied table understood and
      agreed as the ONE representation of that outcome across all 7 mutating methods.
- [ ] §6's Error Hierarchy is complete, every class named per the stated convention, every class
      mapped to at least one §3 method's Failure Conditions list.
- [ ] §7's 14 invariants are individually reviewed and none contradicts §3's method contracts.
- [ ] §8's testing requirements are understood as the target for Phase 2/3, not deferred or
      simplified.
- [ ] §9's Repository Compliance Matrix is accepted as Phase 4's exact exit criteria, unchanged.
- [ ] §10's verification gate (manual signature diff against the migration) has actually been
      performed for this document, not merely asserted — **performed in this session**: every RPC
      name, parameter order, and named exception referenced above was cross-checked against
      `supabase/migrations/20260826000000_economy_v1.sql` as read and written in this same
      multi-turn effort, not from memory alone.
- [ ] No item in this specification proposes a new database capability, a schema change, or a
      migration edit — confirmed: none does.
- [ ] No item in this specification discusses `EconomyService`, any REST endpoint, `RoomManager`,
      or any UI component beyond naming them as explicitly out of scope — confirmed: §1 and §9 name
      them only to draw a boundary, never to design them.

---

## FINAL VERDICT

**READY TO IMPLEMENT**

Every method the roadmap's Phase 1 entry named is now fully specified — interface, contracts,
request/response models, a complete and internally-consistent error hierarchy, a full invariant
list, and concrete testing/contract-testing/verification requirements that Phases 2 through 4 can
be built and gated against without needing to return to this document for a missing detail. The
two methods the earlier blueprint deferred (`getActiveConfiguration`, `getPrizeSchedule`) are now
formally part of the interface, closing the one known gap. Nothing here modifies the frozen
migration, the approved roadmap, or any previously-approved architecture decision.
