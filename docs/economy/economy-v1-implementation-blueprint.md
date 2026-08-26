# Economy V1 — Implementation Layer Blueprint

> **Status:** DESIGN ONLY — NO CODE WRITTEN. The database layer (migration, rollback,
> verification, `docs/economy/economy-v1.md`) is frozen for the purposes of this document —
> nothing here proposes a schema change, and nothing here has been applied anywhere.
> **Scope:** the runtime layer that will eventually consume the already-certified Economy V1
> database — repository, service, REST API, RoomManager integration, and UI/admin surfaces —
> planned but not built.
> **Grounded against real source**, not invented in the abstract: every interface below mirrors
> an existing, working pattern in this codebase (`ProgressionRepository.ts`,
> `SupabaseProgressionRepository.ts`, `postgrest.ts`, `DashboardController.ts`,
> `auth/identity.ts`), and every RoomManager claim below was re-verified against the current
> `server/src/rooms/RoomManager.ts` in this session (line numbers cited are current, not carried
> over from an earlier draft).
> **Addendum (bigint transport remediation):** Phases 1 (`EconomyRepository`/
> `InMemoryEconomyRepository`) and 2 (`SupabaseEconomyRepository`) referenced below as future work
> have since been built, and a bigint-transport defect found while verifying Phase 2 —
> PostgREST/PostgreSQL `bigint` columns arriving as JSON numbers, losing precision above
> `Number.MAX_SAFE_INTEGER` — has been remediated at the database boundary (`*_safe` views +
> `*_to_safe_jsonb()` helpers) and re-verified end to end. See
> `docs/economy/economy-v1-bigint-transport-remediation-proposal.md` and `economy-v1.md` §6c for
> the full record; the `balance: string` comment at line 38 below (and every other `string`-typed
> amount field in this blueprint) is the guarantee that fix makes real, not just an intended
> convention.

---

## PHASE 1 — Repository Design

### Why an interface at all (same reasoning `ProgressionRepository.ts` already states)

Two reasons, neither new: the server's 855 tests run with zero infrastructure today, and an
`EconomyService` that imports a Postgres/PostgREST client directly cannot be tested without one —
that property is worth preserving. And every economy write already has an `applied` idempotency
contract baked into the database layer (`{applied, operation, idempotencyKey, result}`); the
repository interface's job is to carry that contract through in a shape both a real and an
in-memory implementation can honor identically, verified by one shared contract-test suite
(mirroring `__tests__/repositoryContract.test.ts`).

### 1.1 `EconomyRepository` — the interface

```typescript
export type IdentityKind = "member" | "guest" | "bot";

export interface CoinWalletRecord {
  identityId: string;
  identityKind: "member" | "guest";
  balance: string;              // bigint-safe: string, never number — see economy-implementation-plan.md
  version: number;
  lifetimeGranted: string;
  lifetimeEarned: string;
  lifetimeSpent: string;
  lifetimeRefunded: string;
  starterGranted: boolean;
  isFrozen: boolean;
  updatedAt: number;
}

export type WalletLedgerEntryType =
  | "STARTER_GRANT" | "ROOM_ENTRY_DEBIT" | "SOLO_ENTRY_DEBIT" | "BOT_ENTRY_DEBIT"
  | "MATCH_PRIZE_CREDIT" | "VOUCHER_REDEMPTION" | "MATCH_REFUND" | "ADMIN_ADJUSTMENT";

export interface CoinLedgerEntryRecord {
  id: number;
  walletId: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  walletVersionBefore: number;
  walletVersionAfter: number;
  entryType: WalletLedgerEntryType;
  sourceKind: string;
  sourceId: string;
  idempotencyKey: string;
  description: string;
  createdAt: number;
}

export type VoucherStatus = "ACTIVE" | "REDEEMED" | "CANCELLED";

export interface RewardVoucherRecord {
  id: string;
  codeHash: string;             // 64 hex chars — repository never sees a raw code, ever
  coinAmount: string;
  matchId: string;
  issuedToGuestId: string;
  status: VoucherStatus;
  redeemedByMemberId: string | null;
  redeemedAt: number | null;
  createdAt: number;
}

export type MatchSettlementStatus = "COMMITTED" | "SETTLED" | "REFUNDED";

export interface MatchEconomySettlementRecord {
  matchId: string;
  roomCode: string;
  hostIdentityId: string;
  seatCount: number;
  humanSeatCount: number;
  botSeatCount: number;
  costPerSeat: string;
  totalCollected: string;
  totalWalletRewarded: string;
  totalGuestEscrow: string;
  totalBotCollection: string;
  totalWorldBankCut: string;
  totalRefunded: string;
  refundReason: string | null;
  status: MatchSettlementStatus;
  settledAt: number | null;
  createdAt: number;
}

export interface SettlementParticipantInput {
  identityId: string;
  identityKind: "member" | "guest" | "bot";   // anything else -> INVALID_IDENTITY_KIND, see §Errors
  placement: number;                           // 1-5
  voucherCodeHash?: string;                    // required iff identityKind === "guest" and placement pays
}

export interface WorldBankSnapshot {
  baseFeeRevenue: string;
  botPrizeRevenue: string;
  guestEscrowLiability: string;
  totalVoucherRedeemed: string;
}

/**
 * Every mutating call returns this envelope — a direct pass-through of the
 * database's own `{applied, operation, idempotencyKey, result}` shape
 * (economy-v1.md §6a), not a re-wrapped or re-invented one. `applied: false`
 * means "already happened, here is the original result" — not an error, and
 * never thrown as one. See `ProgressionRepository.ts`'s own `Applied`
 * convention for why: a caller receiving `false` returns the same success it
 * returned the first time, rather than treating a replay as a failure.
 */
export interface EconomyOperationResult<T> {
  applied: boolean;
  operation: string;
  idempotencyKey: string;
  result: T;
}

export interface EconomyRepository {
  readonly kind: "memory" | "supabase";

  /** Same contract as ProgressionRepository.ping() — prove reachability at boot, loudly, once. */
  ping(): Promise<void>;

  /* reads */
  getWallet(identityId: string): Promise<CoinWalletRecord | null>;
  listLedger(walletId: string, opts?: { limit?: number; offset?: number }): Promise<CoinLedgerEntryRecord[]>;
  getSettlement(matchId: string): Promise<MatchEconomySettlementRecord | null>;
  getWorldBankSnapshot(): Promise<WorldBankSnapshot>;
  getVoucherStatus(codeHash: string): Promise<Pick<RewardVoucherRecord, "status" | "coinAmount"> | null>;
  /** Backs the read-only reconciliation surface — Phase 9 of the migration, not an automatic sweep. */
  listStaleCommittedSettlements(olderThanMs: number): Promise<MatchEconomySettlementRecord[]>;

  /* mutations — one method per top-level RPC, same name, same argument order */
  ensureWallet(identityId: string): Promise<CoinWalletRecord>;
  grantStarterCoins(identityId: string): Promise<EconomyOperationResult<CoinWalletRecord>>;
  commitMatchEntry(input: {
    matchId: string; roomCode: string | null; hostIdentityId: string;
    seatCount: number; humanSeatCount: number; botSeatCount: number; isSolo: boolean;
  }): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;
  settleMatchEconomy(input: {
    matchId: string; isValidRanking: boolean;
    participants: SettlementParticipantInput[]; refundReason?: string;
  }): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;
  refundMatchEntry(matchId: string, reason: string): Promise<EconomyOperationResult<MatchEconomySettlementRecord>>;
  issueGuestVoucher(input: {
    voucherId: string; codeHash: string; coinAmount: string; matchId: string; issuedToGuestId: string;
  }): Promise<EconomyOperationResult<RewardVoucherRecord>>;
  redeemRewardVoucher(codeHash: string, memberIdentityId: string): Promise<EconomyOperationResult<RewardVoucherRecord>>;
}
```

### 1.2 Error types

The database layer already raises specific, named PL/pgSQL exceptions. The repository's job is to
turn each one into a **distinguishable TypeScript error**, not a generic throw — because the
service layer's validation rules (Phase 2) branch on which one occurred.

```typescript
/** Base class. Never thrown directly. */
export abstract class EconomyRepositoryError extends Error {
  abstract readonly code: string;
}

export class WalletNotFoundError extends EconomyRepositoryError { readonly code = "IDENTITY_NOT_FOUND"; }
export class InvalidIdentityError extends EconomyRepositoryError { readonly code = "INVALID_IDENTITY_ID"; }
export class WalletFrozenError extends EconomyRepositoryError { readonly code = "WALLET_FROZEN"; }
export class InsufficientFundsError extends EconomyRepositoryError { readonly code = "INSUFFICIENT_FUNDS"; }
export class InvalidSeatConfigurationError extends EconomyRepositoryError { readonly code = "INVALID_SEAT_CONFIGURATION"; }
export class UnsupportedSeatCountError extends EconomyRepositoryError { readonly code = "UNSUPPORTED_SEAT_COUNT"; }
export class InvalidIdentityKindError extends EconomyRepositoryError { readonly code = "INVALID_IDENTITY_KIND"; }
export class InvalidVoucherHashError extends EconomyRepositoryError { readonly code = "INVALID_VOUCHER_HASH"; }
export class VoucherNotFoundError extends EconomyRepositoryError { readonly code = "VOUCHER_NOT_FOUND"; }
export class VoucherAlreadyRedeemedError extends EconomyRepositoryError { readonly code = "VOUCHER_ALREADY_REDEEMED"; }
export class VoucherNotActiveError extends EconomyRepositoryError { readonly code = "VOUCHER_NOT_ACTIVE"; }
export class OnlyMembersCanRedeemError extends EconomyRepositoryError { readonly code = "ONLY_MEMBERS_CAN_REDEEM_VOUCHERS"; }
export class MatchNotCommittedError extends EconomyRepositoryError { readonly code = "MATCH_NOT_COMMITTED"; }
export class MatchAlreadySettledError extends EconomyRepositoryError { readonly code = "MATCH_ALREADY_SETTLED"; }
export class SettlementConservationViolationError extends EconomyRepositoryError { readonly code = "SETTLEMENT_CONSERVATION_VIOLATION"; }
/** Anything that reached the database but doesn't map to a named business error above —
 *  a real outage, a connection timeout, a constraint the app-layer didn't anticipate. The
 *  service layer treats this class, and ONLY this class, as retryable (Phase 2). */
export class EconomyInfrastructureError extends EconomyRepositoryError { readonly code = "INFRASTRUCTURE_ERROR"; }
```

`SupabaseEconomyRepository` maps `PostgrestError` (already defined in `postgrest.ts`) by matching
the `message` text the PL/pgSQL `raise exception` calls actually produce (e.g. a message starting
with `WALLET_FROZEN:`) to the corresponding class above; anything unrecognized becomes
`EconomyInfrastructureError`. `InMemoryEconomyRepository` throws the same classes directly from its
own validation, so a single `catch` block in `EconomyService` (Phase 2) never has to know which
repository is underneath it.

### 1.3 `SupabaseEconomyRepository`

- Wraps the **existing** `PostgrestClient` from `postgrest.ts` — no new HTTP client, no new
  dependency. Every mutation is one call to `this.client.rpc<EconomyOperationResult<T>>(fnName, args)`,
  which already exists and already does exactly what these RPCs need (`POST rpc/<fn>` with the
  service-role key, per `postgrest.ts`'s own doc comment on why it isn't `@supabase/supabase-js`).
- Every read (`getWallet`, `listLedger`, `getWorldBankSnapshot`, ...) is one call to
  `this.client.select<T>(table, query)` against the narrow `SELECT` grants already in place
  (`economy-v1.md` §7) — `coin_wallets` and `coin_ledger_entries` additionally carry an
  `owns_player_row` RLS policy for `authenticated`, but this repository always calls through
  `service_role`, so it reads via the explicit table-level grant, not the RLS policy (the RLS
  policy exists for a **future** client-direct-to-PostgREST read path, which is explicitly not
  part of this blueprint — see Phase 3's scope note).
- `ping()`: `select('economy_configurations', 'limit=1')` — proves both connectivity and that the
  migration has actually been applied, the same two things `SupabaseProgressionRepository.ping()`
  proves today.
- Idempotency is **not** re-implemented here. The repository trusts the database's own
  `{applied, ...}` envelope entirely — no client-side deduplication, no cache of "did I already
  send this," because the database is the only party that can answer that truthfully under
  concurrency (proven in the concurrency validation pass: 5 scenarios, 8 parallel callers each,
  exactly one `applied: true` every time).

### 1.4 `InMemoryEconomyRepository`

- Mirrors the SQL invariants **structurally**, not by copy-pasting business logic: a `Map<string,
  CoinWalletRecord>` for wallets, an array for each ledger, and — critically — the same four
  checks the database enforces via `CHECK` constraints re-expressed as plain JS assertions that
  throw the **same error classes** as §1.2 (`balance = granted + earned + refunded - spent`,
  `balanceAfter = balanceBefore + amount`, etc.). If the SQL migration ever changes an invariant,
  the contract-test suite (§1.5) is what forces this file to change too — it cannot silently drift
  the way an untested mirror would.
- Idempotency: a `Map<idempotencyKey, EconomyOperationResult<unknown>>` per operation kind, checked
  and set atomically within the same synchronous JS callback (Node's single-threaded execution
  model already gives this the same effective atomicity the database's row lock gives the real
  implementation — no `async` gap between check and set).
- `world_bank_accounts` is a single in-memory record, matching the DB's own enforced singleton.

### 1.5 Idempotency contract — the one thing that must not drift

Same discipline as `ProgressionRepository.ts`'s `__tests__/repositoryContract.test.ts`: **one**
shared test suite, run against both `InMemoryEconomyRepository` and (in CI only, behind a
real-database flag, same pattern the progression suite already uses) `SupabaseEconomyRepository`.
Required assertions, each traceable to a concurrency-validation result already proven at the
database layer:

| Assertion | Already proven at DB layer (cite) |
|---|---|
| A replayed `commitMatchEntry` for the same `matchId` returns `applied:false` with the ORIGINAL settlement, never a second debit | `verifyEconomySchema.mjs` §idempotency |
| A replayed `grantStarterCoins` returns `applied:false`, balance unchanged | `verifyEconomySchema.mjs` §idempotency |
| 8 concurrent callers to the same `commitMatchEntry`/`settleMatchEconomy`/`refundMatchEntry`/`redeemRewardVoucher` produce exactly one `applied:true` | `verifyEconomySchema.mjs` §concurrency (5 scenarios) |
| A `settleMatchEconomy` with an unrecognized `identityKind` throws `InvalidIdentityKindError` and leaves **zero** trace (no partial wallet credit, no ledger row, no participant row) | `verifyEconomySchema.mjs` §invalid-participants (Correction 3) |

---

## PHASE 2 — Service Design

### `EconomyService` — required operations

```typescript
export interface EconomyService {
  getWallet(identityId: string): Promise<CoinWalletRecord>;
  getLedger(identityId: string, opts?: { limit?: number; offset?: number }): Promise<CoinLedgerEntryRecord[]>;
  quoteMatchCheckout(input: { hostIdentityId: string; seatCount: number }): Promise<MatchCheckoutQuote>;
  commitMatchEntry(input: CommitMatchEntryInput): Promise<MatchEconomySettlementRecord>;
  settleMatchEconomy(input: SettleMatchEconomyInput): Promise<MatchEconomySettlementRecord>;
  refundMatchEntry(matchId: string, reason: string): Promise<MatchEconomySettlementRecord>;
  redeemVoucher(rawCode: string, memberIdentityId: string): Promise<RewardVoucherRecord>;
}
```

Each operation below: **validation rules** (checked in the service, before the repository is ever
called — cheap rejects stay cheap), **failure scenarios** (mapped from Phase 1's error classes to
a caller-facing outcome), **retry strategy**.

### 2.1 `getWallet` / `getLedger`

- **Validation:** `identityId` must be the caller's own (enforced by the API layer's
  `requireSelfParam`-equivalent, Phase 3 — the service itself does not re-check this, matching
  `ProgressionRepository`'s existing division of labor where authorization is a route concern).
- **Failure scenarios:** wallet not yet provisioned → the service calls `ensureWallet` first
  (idempotent, safe), never returns a bare 404 for "you haven't played yet."
- **Retry:** pure reads — safe to retry unconditionally, no idempotency key needed.

### 2.2 `quoteMatchCheckout`

- **This is application-level, not a database RPC** — `economy-v1.md` §6b is explicit about this,
  and this service method is exactly the "application code" that doc anticipated. It reads
  `economy_configurations`/`economy_prize_schedules` (via two new repository read methods,
  `getActiveConfiguration()` / `getPrizeSchedule(seatCount)` — omitted from Phase 1's interface
  above for brevity, added here explicitly) and the host's current wallet balance, then computes:
  ```typescript
  interface MatchCheckoutQuote {
    seatCount: number; costPerSeat: string; totalCost: string;
    hostBalance: string; hasSufficientFunds: boolean;
    projectedPrizePool: { firstPlace: string; secondPlace: string; thirdPlace: string; worldBankCut: string };
  }
  ```
- **Validation:** `seatCount` between 1 and 5 (else `UNSUPPORTED_SEAT_COUNT`, thrown by the service
  itself, without a round-trip to the database — the schedule table's 1-5 range is public
  knowledge, not something worth a query to reject).
- **Failure scenarios:** no active configuration (should be impossible post-migration, but if it
  happens, this is `EconomyInfrastructureError` — a deployment problem, not a user error).
- **Retry:** pure read, safe to retry. **This value is never authoritative** — `commitMatchEntry`
  independently revalidates everything. A client that quotes, waits five minutes, then commits
  gets the CURRENT numbers at commit time, not the quoted ones; the service does not attempt to
  honor a stale quote.

### 2.3 `commitMatchEntry`

- **Validation (pre-repository, cheap rejects):** `seatCount === humanSeatCount + botSeatCount`;
  `seatCount` in [1,5]; `matchId` non-empty. These mirror the database's own CHECK constraints
  exactly — rejecting here is not a substitute for the database's enforcement, it's a faster
  failure for the common case (a caller bug), the database remains the actual authority.
- **Failure scenarios → caller-facing outcome:**
  - `WalletFrozenError` → the host's wallet is frozen; surfaced distinctly from insufficient funds
    (Phase 5's frozen-wallet matrix — a frozen host cannot start ANY paid match, regardless of
    balance).
  - `InsufficientFundsError` → surfaced with the shortfall amount for the checkout UI (Phase 6).
  - `UnsupportedSeatCountError` → should not reach here if `quoteMatchCheckout` was called first,
    but RoomManager (Phase 4) may call this directly without a prior quote in some paths; treat as
    a genuine 4xx.
  - Replay (`applied: false`) → **not a failure.** Returns the original settlement. This is the
    exact case Phase 4's pre-start orchestration depends on: if `startGame`'s socket handler is
    ever invoked twice for the same match (a double-click, a reconnect-triggered resend), the
    second call must return the SAME settlement, not error.
- **Retry strategy:** the service does **not** auto-retry `WalletFrozenError` or
  `InsufficientFundsError` — these are not transient, retrying changes nothing. It **does**
  auto-retry `EconomyInfrastructureError` exactly once with a short backoff (250ms) before
  surfacing failure — a single transient blip (connection reset) shouldn't fail a match start that
  a human is actively waiting on, but an unbounded retry loop would make `startGame` hang
  indefinitely, which Phase 4's "game start prohibited until debit confirmed" requirement makes
  actively dangerous (a player staring at a spinner is better than a player staring at one forever).

### 2.4 `settleMatchEconomy`

- **Validation:** the caller (RoomManager integration, Phase 4) must supply `isValidRanking`
  explicitly — the service does **not** infer validity from the participants array; that inference
  belongs to the per-game determinism contract in `game-settlement-map.md`, which is RoomManager's
  concern, not the economy service's. Every `participants[].identityKind` must be exactly
  `member`/`guest`/`bot` — checked here too (fail fast) even though the database now also enforces
  it (`INVALID_IDENTITY_KIND`, Correction 1) — defense in depth, not a substitute.
- **Failure scenarios:**
  - `InvalidIdentityKindError` → a caller bug (RoomManager sent a malformed participant list) —
    logged loudly, never silently retried, because retrying identical bad input produces the
    identical failure.
  - `SettlementConservationViolationError` → a caller bug in a DIFFERENT sense: the placement
    extraction logic computed prizes that don't sum to the committed total. Also never retried —
    surfaced to the reconciliation surface (Phase 7) as a settlement requiring manual attention,
    since automatically retrying a mis-computed settlement would retry the SAME mis-computation.
  - `MatchAlreadySettledError` on a `refundMatchEntry` call racing a `settleMatchEconomy` call —
    not this method's failure mode, but documented here because both hit the same settlement row;
    see §2.5.
- **Retry strategy:** identical to `commitMatchEntry` — one retry for infrastructure errors only,
  everything else surfaces immediately. A settlement is not time-critical the way match start is
  (Phase 4's async design explicitly decouples it from the player-visible "match finished" moment),
  so the retry budget here can be slightly more generous in a future revision — not expanded in
  this blueprint, since "slightly more generous" is an implementation-time tuning decision, not an
  architectural one.

### 2.5 `refundMatchEntry`

- **Validation:** `reason` non-empty (a refund without a reason is an audit gap, rejected before
  it ever reaches the database).
- **Failure scenarios:** `MatchAlreadySettledError` — the match settled between whatever triggered
  the refund attempt (Phase 4's abandonment/disconnect paths) and this call executing. This is a
  **race, not a bug** — a match can legitimately finish in the same window a disconnect-driven
  abandonment check fires. The service surfaces this distinctly so RoomManager can simply drop the
  refund attempt (the match already has a legitimate outcome) rather than treating it as an error
  to propagate to the player.
- **Retry strategy:** same infrastructure-error-only retry. `MatchAlreadySettledError` is never
  retried (retrying doesn't un-settle the match; it's a terminal outcome for this call).

### 2.6 `redeemVoucher`

- **Validation:** hashes the **raw** code the client submits before it ever reaches the repository
  or crosses into a log line — this is the one place in the whole runtime layer where a raw
  bearer code exists in memory, and it must never be logged, never appear in an error message
  passed to Phase 3's response envelope, and never be persisted. (The HMAC key used for this hash
  is server-only configuration, out of scope for this blueprint's interface but flagged here as a
  hard implementation requirement carried over from `economy-v1.md` §3.1.)
- **Failure scenarios:**
  - `OnlyMembersCanRedeemError` → a guest attempted redemption; 403, not 401 (they ARE
    authenticated, just not entitled — matches `requireMember`'s existing 403 convention).
  - `VoucherNotFoundError` / `VoucherNotActiveError` → both surfaced as the SAME generic "this
    code isn't redeemable" message to the client, deliberately not distinguished at the API
    boundary — distinguishing "not found" from "already used" from "cancelled" in a
    bearer-instrument system is an oracle for guessing other people's codes, one bit at a time.
    (Internally logged with the real distinction, for support/ops purposes only.)
  - `WalletFrozenError` → the member's own wallet is frozen; this IS surfaced distinctly, since
    it's the member's own account state, not information about someone else's voucher.
- **Retry strategy:** no automatic retry at all. A redemption is a discretionary, user-initiated
  action; if it fails, the client shows the failure and lets the human decide whether to try again
  (re-entering the code), rather than the service silently re-submitting a raw code multiple times.

---

## PHASE 3 — API Design

Scope note: these four endpoints are the **player-facing** surface. They call `EconomyService`
directly (in-process), not PostgREST — the browser never talks to Supabase directly for economy
data in this design, consistent with how every other player-facing progression endpoint in this
codebase works today (`EconomyController`, mirroring `ProfileController`/`DashboardController`'s
existing shape). All four require an authenticated identity via the **existing**
`requireIdentity`/`requireMember` middleware in `server/src/auth/identity.ts` — no new auth
mechanism.

### `GET /api/economy/wallet`

- **Auth:** `requireIdentity`. Always the CALLER's own wallet — no `:playerId` param, no way to
  address anyone else's (mirrors `requireSelfParam`'s reasoning: don't build an addressable-by-id
  route for something that's always "mine").
- **Request:** no body, no query params.
- **Response 200:**
  ```json
  {
    "wallet": {
      "identityId": "guest_...", "identityKind": "guest", "balance": "1850",
      "lifetimeGranted": "2000", "lifetimeEarned": "150", "lifetimeSpent": "300",
      "lifetimeRefunded": "0", "starterGranted": true, "isFrozen": false, "updatedAt": 1787...
    }
  }
  ```
- **Failure payloads:** `401 {"error":"Unauthorized","message":"..."}` (no identity) — same shape
  `deny()` in `identity.ts` already produces, reused verbatim, not reinvented.

### `GET /api/economy/ledger`

- **Auth:** `requireIdentity`, caller's own ledger only.
- **Request:** query params `limit` (default 20, max 100), `offset` (default 0) — same pagination
  convention as `ProgressionRepository.listMatchesForPlayer`'s `MatchPage`.
- **Response 200:**
  ```json
  { "entries": [ { "id": 42, "amount": "150", "entryType": "MATCH_PRIZE_CREDIT",
                    "balanceAfter": "1850", "description": "Match placement 1 prize",
                    "createdAt": 1787... } ], "hasMore": false }
  ```
- **Status codes:** 200 always for a valid caller (an empty ledger is a valid, non-error state —
  never a 404).

### `POST /api/economy/checkout/quote`

- **Auth:** `requireIdentity` — a guest can quote their own solo/room checkout just as freely as a
  member; quoting is read-only and non-binding.
- **Request:**
  ```json
  { "seatCount": 4 }
  ```
- **Response 200:** the `MatchCheckoutQuote` shape from Phase 2.2.
- **Failure payloads:** `422 {"error":"UnsupportedSeatCount","message":"seatCount must be between 1 and 5"}`
  — 422, not 400, since the request is syntactically valid JSON, just semantically out of range
  (matches the general REST convention this codebase's other validated-body routes already use).
- **Note:** this endpoint is NOT the same call RoomManager makes internally when actually starting
  a match (Phase 4 calls `EconomyService.commitMatchEntry` directly, in-process — RoomManager is a
  server-side module, not an HTTP client of its own server). This endpoint exists purely for the
  Checkout UI (Phase 6) to show a preview before the player clicks "Start."

### `POST /api/economy/vouchers/redeem`

- **Auth:** `requireMember` — reuses the EXISTING 403-for-guest behavior verbatim; no new
  member-only guard invented.
- **Request:**
  ```json
  { "code": "the-raw-bearer-code-the-guest-shared" }
  ```
  (Field named `code`, not `codeHash` — the client sends the RAW code; hashing happens server-side,
  per Phase 2.6. A request body containing a pre-hashed value would defeat the entire "raw code
  never persisted, never logged" design and must never be an accepted input shape.)
- **Response 200:**
  ```json
  { "voucher": { "id": "vch_...", "coinAmount": "150", "status": "REDEEMED" },
    "newBalance": "2000" }
  ```
- **Failure payloads:**
  - `403 {"error":"OnlyMembersCanRedeem", ...}` (via `requireMember`, before the service is even called)
  - `422 {"error":"VoucherNotRedeemable","message":"This code isn't valid or has already been used."}`
    — the deliberately-merged not-found/already-redeemed/cancelled message from Phase 2.6
  - `403 {"error":"WalletFrozen","message":"Your wallet is currently frozen."}`
  - `429` reserved for a future rate-limit on this endpoint specifically (brute-force code
    guessing is the realistic threat model here) — **not implemented in this blueprint**, flagged
    as a Phase 8 follow-up, not silently assumed to already exist.

---

## PHASE 4 — RoomManager Integration

**RoomManager.ts was reviewed, not modified, in this session** — every line number below was
re-verified against the current file, not carried over from the earlier
`roommanager-async-boundary-proposal.md` draft. One correction to that earlier draft is included
below (§4.1) because it changes the recommended design, not just its description.

### 4.1 Correction to the prior async-boundary proposal: `STARTING` already exists

The earlier proposal (`roommanager-async-boundary-proposal.md`, written before this phase of work)
speculated: *"Introduce a new state, e.g. `lifecycleState = 'COMMITTING_ENTRY'`."* That was written
without checking whether such a state already existed. It does. `shared/lifecycle.ts` already
defines:

```
RoomLifecycleState = "CREATED" | "WAITING_FOR_PLAYERS" | "READY_CHECK" | "STARTING"
                    | "IN_PROGRESS" | "RECOVERING" | "PAUSED" | "COMPLETED" | "ABANDONED" | "CLOSED"
```

`isValidLifecycleTransition` already permits `READY_CHECK → STARTING → IN_PROGRESS`. Verified via
`grep` that `"STARTING"` is referenced exactly once in `RoomManager.ts` today — inside
`getRoomCounts()` (line 395), where it's bucketed into "lobby" for observability — and is **never
entered** by any `transitionLifecycle()` call. `startGame()`'s own transition
(`RoomManager.ts:1222`) goes `READY_CHECK → IN_PROGRESS` directly, skipping `STARTING` entirely.

**Corrected recommendation:** do not invent a new state. Make `startGame()`'s pre-commit
orchestration step transition the room to the ALREADY-DEFINED, ALREADY-VALID `STARTING` state
first, and only transition to `IN_PROGRESS` after `commitMatchEntry` resolves successfully. This is
a smaller change than the original proposal assumed — no `shared/lifecycle.ts` edit needed at all,
only a new call site for a transition the state machine already permits.

### 4.2 Exact integration sequence — entry commitment (`room:startGame`)

Current call chain, verified this session:
`server/src/sockets/index.ts:173-175` (`socket.on("room:startGame", () => rooms.startGame(socket.id))`)
→ `RoomManager.startGame(socketId: string): void` (`RoomManager.ts:1138`, synchronous, single
production call site).

```
CLIENT                SOCKET HANDLER           ROOMMANAGER (new)              ECONOMY SERVICE        DATABASE
  │  "room:startGame"       │                        │                              │                   │
  ├─────────────────────────▶                        │                              │                   │
  │                         │ rooms.requestGameStart( │                              │                   │
  │                         │   socketId)  [NEW async │                              │                   │
  │                         │   entry point]          │                              │                   │
  │                         ├─────────────────────────▶                              │                   │
  │                         │                        │ validate host/ready/seats     │                   │
  │                         │                        │ (same checks startGame()      │                   │
  │                         │                        │  already does before L1222)   │                   │
  │                         │                        │ transitionLifecycle(          │                   │
  │                         │                        │   room, "STARTING")  ◄── §4.1 correction          │
  │                         │◄─── ack "starting" ─────┤                              │                   │
  │  (client shows a brief  │                        │ await economyService.         │                   │
  │   "starting..." state)  │                        │   commitMatchEntry({          │                   │
  │                         │                        │     matchId, roomCode,        │                   │
  │                         │                        │     hostIdentityId: hostId,   │                   │
  │                         │                        │     seatCount, humanSeatCount,│                   │
  │                         │                        │     botSeatCount, isSolo })   │                   │
  │                         │                        ├───────────────────────────────▶                   │
  │                         │                        │                              │ commit_match_entry()
  │                         │                        │                              ├───────────────────▶│
  │                         │                        │                              │◄── {applied,result}┤
  │                         │                        │◄──── settlement or throw ─────┤                   │
  │                         │                        │                              │                   │
  │              ┌──────────┴────────── SUCCESS ──────────────────────┐             │                   │
  │              │  room.currentMatchId = settlement.matchId          │             │                   │
  │              │  transitionLifecycle(room, "IN_PROGRESS")          │             │                   │
  │              │  createEngine(...), apply options (existing logic  │             │                   │
  │              │    from startGame(), UNCHANGED)                   │             │                   │
  │              └─────────────────────────────────────────────────────┘            │                   │
  │◄─── "room:started" broadcast (existing) ────────────────────────────┤             │                   │
  │                                                                     │             │                   │
  │              ┌──────────┴────────── FAILURE (WalletFrozen /        │             │                   │
  │              │  InsufficientFunds / infra) ───────────────────────┐│             │                   │
  │              │  transitionLifecycle(room, "READY_CHECK") — back to││             │                   │
  │              │    where it started; room NEVER entered IN_PROGRESS││             │                   │
  │              └─────────────────────────────────────────────────────┘            │                   │
  │◄─── "room:error" { code: "WALLET_FROZEN" | "INSUFFICIENT_FUNDS" | ... } ──────────┤                   │
```

**Failure handling detail:** on any `commitMatchEntry` rejection, the room transitions BACK to
`READY_CHECK` (a legal transition per `isValidLifecycleTransition`, since `STARTING → ABANDONED |
CLOSED | IN_PROGRESS` is what's actually declared — **this requires one addition to
`isValidLifecycleTransition`'s `STARTING` case**: allowing `STARTING → READY_CHECK` as a rollback
edge, since the current declaration only allows forward progress or abandonment. This is the one
place this blueprint identifies an actual (small, additive, non-breaking) change to
`shared/lifecycle.ts` itself — flagged explicitly rather than glossed over, since "no code" for
this blueprint does not mean "no identified code changes for the implementer."

**Hard requirement preserved exactly as stated in the original proposal and in this task's
CONTEXT:** game start is prohibited until debit confirmation. `IN_PROGRESS` is entered on ONE code
path only, and it is downstream of a resolved (not just initiated) `commitMatchEntry` call.

### 4.3 Match completion settlement (`finalizeMatch`)

`private finalizeMatch(room: Room): void` (`RoomManager.ts:1349`) has **6 internal call sites**
(verified this session: lines 836, 1325, 1566, 1740, 2424, 2768 — bot-move completion, timeout
paths, human-move completion, and a disconnect-adjacent path). This breadth is exactly why Phase
11's original recommendation — do not make `finalizeMatch` itself `async` — still holds, more
strongly than before: six call sites is six places that would need re-auditing for `await`
interleaving safety, for a function that (unlike `startGame`) gates nothing the player is actively
blocked on.

```
finalizeMatch(room)  [STAYS SYNCHRONOUS, UNCHANGED]
  │
  ├─ existing logic: room.phase = "finished", transitionLifecycle(room, "COMPLETED"),
  │    serverTimelineRecorder, profileService.recordMatchFinished, recentPlayersService
  │    — NONE OF THIS CHANGES
  │
  └─ NEW, appended at the end, fire-and-forget (not awaited):
       queueSettlement(room.currentMatchId, extractPlacements(room.engine, room.players), isValidRanking)
         │
         ▼ (runs on a later tick, NOT inside finalizeMatch's own call stack)
       economyService.settleMatchEconomy({ matchId, isValidRanking, participants })
         │
         ├─ SUCCESS → broadcast "economy:settled" { matchId, rewards } to the room's sockets
         │             (a NEW, separate broadcast from the existing "room:finished" one —
         │              the match is already shown finished; this is purely a rewards-arrived event)
         │
         └─ FAILURE (infra, after service-layer's one retry) →
                leave settlement COMMITTED — this is EXACTLY the state
                list_stale_committed_settlements (economy-v1.md §9) is designed to surface.
                No second retry mechanism invented here; the reconciliation admin surface
                (Phase 7) is the only follow-up path, by design.
```

### 4.4 Refund triggers — abandonment and disconnect

`private abandonRoom(room: Room): void` (`RoomManager.ts:1791`) — same "stays synchronous, queue
the economy call" pattern as §4.3:

```
abandonRoom(room)  [STAYS SYNCHRONOUS, UNCHANGED]
  │
  ├─ existing logic: transitionLifecycle(room, "ABANDONED") [L1793], stop timers, purge room
  │
  └─ NEW, only if room.phase === "playing" && room.currentMatchId:
       queueRefund(room.currentMatchId, "Room abandoned mid-match - all human players departed")
         │
         ▼
       economyService.refundMatchEntry(matchId, reason)
         │
         ├─ SUCCESS → nothing further; the host's wallet is credited, no one is watching this
         │             room anymore (it's already purged) — no broadcast target exists, which is
         │             fine: the credit is visible next time the host opens their wallet.
         │
         └─ MatchAlreadySettledError → expected race (see Phase 2.5) — the match finished in the
              gap between the abandonment check and this call; DROP silently, log at info level,
              not an error. The settlement already has a legitimate SETTLED outcome.
```

### 4.5 Host disconnect behavior — no economy call at all

`handleDisconnect(socketId: string): void` (`RoomManager.ts:2644`) and `reassignHost` (`:1400`):
**no direct economy integration.** Per `economy-v1.md`'s existing host-reassignment note: the
ORIGINAL host who funded entry remains the party entitled to any refund; a reassigned host funds
only a NEW match's entry going forward. A disconnect by itself triggers neither a debit nor a
credit — only the downstream `abandonRoom` (§4.4, if all humans leave) or `finalizeMatch` (§4.3, if
the match completes via bot takeover) paths touch the economy, exactly as today's non-economy
disconnect handling already routes through those same two functions for every OTHER side effect
(timeline recording, profile stats). No new hook point needed here at all — this is a case where
the correct answer is "nothing changes," worth stating explicitly rather than leaving implicit.

### 4.6 `Room` interface additions required (not implemented here)

```typescript
interface Room {
  // ...existing fields, unchanged...
  currentMatchId: string | null;        // set once commitMatchEntry resolves; null before and never reused across matches
  economyCommitPending: boolean;        // in-memory guard against a double-fire of the pre-commit step within one process
}
```

`committedTotalCost` (present in the earlier proposal's field list) is **dropped** from this
revision — it's redundant with `settlement.totalCollected`, already durably stored by
`commitMatchEntry`'s own return value, and RoomManager holding a second copy in memory is exactly
the kind of near-synonym `ProgressionRepository.ts`'s own doc comment warns against (`PartyStatus`
mirroring `shared/party/Party.ts` "exactly" rather than inventing a parallel field).

---

## PHASE 5 — Wallet UI Design

**Design only — no React.** Five surfaces, each a plain-language spec of state, data source, and
behavior.

### 5.1 Wallet Summary
- **Data:** `GET /api/economy/wallet`, refetched on mount and after any `economy:settled` /
  voucher-redemption socket/API event — never polled on an interval (matches this codebase's
  existing "server pushes, client doesn't poll" convention for room state).
- **Content:** current balance (large, primary), a small `Frozen` badge when `isFrozen === true`
  (read-only indicator — no in-UI unfreeze action exists, matching the admin dashboard's own
  read-only posture, Phase 7).

### 5.2 Current Balance
- A single prominent number, using the coin-count formatting convention already established by the
  UNO/Ludo work referenced in project memory (`.ludo-chip` glossy treatment's numeric sibling, or
  equivalent) — this blueprint does not invent a new visual language, it reuses whatever the
  existing DLS token/coin-formatting pattern is.
- Transitions (balance going up/down) get a brief animated count-up/count-down, sourced from a
  **before/after pair the API response already carries** (`balanceBefore`/`balanceAfter` on the
  relevant ledger entry) — never a client-side guess at the delta.

### 5.3 Recent Transactions
- **Data:** `GET /api/economy/ledger?limit=20`.
- **Content:** one row per entry — icon keyed off `entryType` (grant/debit/credit/refund — 4
  visual categories, not 7, since `STARTER_GRANT`/`MATCH_PRIZE_CREDIT`/`VOUCHER_REDEMPTION` share a
  "credit" visual treatment, `ROOM_ENTRY_DEBIT`/`SOLO_ENTRY_DEBIT`/`BOT_ENTRY_DEBIT` share "debit,"
  `MATCH_REFUND` gets its own distinct treatment since it's neither a spend nor an earn), signed
  amount, relative timestamp, `description` field verbatim (already human-readable, generated
  server-side — the UI does not re-derive a description from `entryType` + `sourceId`).
- **Empty state:** a fresh wallet's ledger is empty until the starter grant lands — the empty
  state IS the starter-grant-pending moment, not a generic "nothing here yet."

### 5.4 Voucher Redemption
- **Entry point:** a text input for the raw code, member-only (guests see this section replaced
  with "Create an account to redeem rewards" — matches `requireMember`'s 403 semantics rendered as
  a UI affordance rather than an error the player has to trigger first).
- **Submit:** `POST /api/economy/vouchers/redeem`. On success, the Current Balance (§5.2) animates
  the credit; on the merged not-found/redeemed/cancelled failure, a single generic message per
  Phase 2.6's deliberate non-disclosure design — the UI must not attempt to be "more helpful" by
  guessing which specific reason applied, since that would leak exactly the information the service
  layer chose not to disclose.

### 5.5 Coin Animations
- Scope: the count-up/count-down described in §5.2, and a brief "+N" toast anchored to the balance
  on any credit event, reusing whatever toast/notification primitive the existing targeted-reactions
  system (project memory: Ludo's tap-to-react ARC animation) already established, rather than a
  new animation primitive.

---

## PHASE 6 — Checkout Flow Design

**Design only — no React.**

### 6.1 Match Checkout Modal
- **Trigger:** host clicks "Start Game" while `room.lifecycleState === "READY_CHECK"`.
- **Data:** `POST /api/economy/checkout/quote` with the room's current `seatCount`, fired the
  moment the modal opens (not before — no speculative pre-fetch, since the seat count can still
  change up until this exact moment).
- **Content, top to bottom:** total cost, prize pool preview (§6.2), World Bank fee (§6.3), balance
  after entry (§6.4), a single "Confirm & Start" button that fires `room:startGame` — the SAME
  socket event the client already sends today; this modal is a confirmation step inserted BEFORE
  that event, not a new transport.
- **Confirm button state:** disabled with the specific reason shown (§6.5) when
  `!quote.hasSufficientFunds`, never just grayed out with no explanation.

### 6.2 Prize Pool Preview
- Three line items (1st/2nd/3rd), pulled directly from `quote.projectedPrizePool` — omits any
  placement the current seat count's schedule pays zero for (e.g. a 2-seat match shows only 1st,
  since 2nd pays 0 per `economy-v1.md` §2.3's table).
- Explicitly labeled as a **preview**, with the same "not authoritative, revalidated at commit"
  language `economy-v1.md` §6b requires of the underlying quote — this is a UI-copy requirement,
  not a decoration.

### 6.3 World Bank Fee
- One line item, the `quote.projectedPrizePool.worldBankCut` value, labeled plainly (e.g. "House
  fee") — shown, not hidden, consistent with this being the platform's actual cut, not a junk fee
  to obscure.

### 6.4 Balance After Match Entry
- `quote.hostBalance - quote.totalCost`, computed **client-side from values the API already
  returned** (no extra request) — shown as a preview number, explicitly distinct in styling from
  the Wallet Summary's live balance (§5.2), so a player never mistakes a projection for their
  actual post-debit balance, which `commitMatchEntry`'s own resolution determines authoritatively.

### 6.5 Insufficient Funds View
- Replaces the Confirm button when `!quote.hasSufficientFunds`: shows the exact shortfall
  (`totalCost - hostBalance`), and — scope note — this blueprint does NOT design a "buy more coins"
  or top-up flow; Economy V1 has no purchase path (starter grants and match winnings are the only
  inflows), so the correct UI here is simply "you need N more coins to start this match," with no
  call-to-action that doesn't yet exist.

---

## PHASE 7 — Economy Admin Dashboard

**Design only. Strictly read-only — no adjustment actions, no freeze toggle, per the standing
constraint already codified in `docs/economy/economy-admin-dashboard-plan.md`.** This phase adds
nothing new to that document's read-only posture; it restates it here so the implementation-order
plan (Phase 8) has a single self-contained reference.

### 7.1 World Bank Overview
- The four independent balances (`baseFeeRevenue`, `botPrizeRevenue`, `guestEscrowLiability`,
  `totalVoucherRedeemed`) as four distinct cards — never summed into one number, per
  `economy-v1.md` §5.3's explicit non-fungibility.
- A **Stale Settlements** panel sourced from `list_stale_committed_settlements` — this is the
  single most operationally important read-only surface in the whole admin plan, since it's the
  only visibility into Phase 4's "settlement failed after infra retry, left COMMITTED" case
  (§4.3). Surfacing it prominently here, not buried in the Settlement Explorer, is a deliberate
  placement choice this blueprint is making explicitly.

### 7.2 Wallet Explorer
- Search by identity id, read-only detail view including `isFrozen` (display only), full ledger
  history. No adjustment, no freeze/unfreeze control — matches the existing
  `economy-admin-dashboard-plan.md` exactly.

### 7.3 Voucher Explorer
- Status filter (ACTIVE/REDEEMED/CANCELLED), search by truncated `code_hash` prefix only — never
  the full hash rendered in the UI (matches `economy-v1.md` §3's zero-plaintext-leakage posture
  extended to the operator surface: even the hash itself is truncated in display, since a full
  hash plus knowledge of the HMAC key's rotation schedule is more attack surface than an operator
  screen needs to expose).

### 7.4 Settlement Explorer
- Per-match breakdown (collected/rewarded/escrowed/bot-collected/world-bank-cut), conservation
  badge computed from `reconcile_match_settlement`'s existing read-only function — reusing that
  function rather than re-deriving the same arithmetic in the admin layer.

### 7.5 Ledger Explorer
- Cross-cutting search over both `coin_ledger_entries` and `world_bank_ledger`, filterable by the
  real `entry_type` taxonomy from `economy-v1.md` §4 (no `GUEST_PRIZE_ESCROW`, no merged
  `HOUSE_CUT` — the corrected taxonomy, not the pre-remediation one).

---

## PHASE 8 — Implementation Order

| Step | Work | Risk | Dependencies | Verification requirement |
|---|---|---|---|---|
| 1 | `EconomyRepository` interface + `InMemoryEconomyRepository` + shared contract-test suite | **Low** — pure TypeScript, no external system, mirrors an existing well-tested pattern exactly | None | Contract-test suite passes against the in-memory implementation alone; every method from Phase 1.1 covered |
| 2 | `SupabaseEconomyRepository`, wired to the **existing** `PostgrestClient` | **Low-Medium** — the RPC calling convention is proven (`postgrest.ts` already works for progression); the risk is entirely in error-message-string mapping (§1.2) being brittle if a `raise exception` message ever changes wording | Step 1 (shares the contract-test suite) | Same contract-test suite, run against a real local Postgres with the economy migration applied (reuses `verifyEconomySchema.mjs`'s embedded-postgres harness) — not a new test methodology |
| 3 | `EconomyService` (Phase 2), unit-tested against `InMemoryEconomyRepository` only | **Low** — validation logic and retry strategy are the only new behavior; the hard part (correctness under concurrency) is already the repository's problem, proven at Step 2 | Step 1 | Every validation rule and failure-scenario mapping in Phase 2 has a corresponding unit test |
| 4 | `EconomyController` (Phase 3), the four REST endpoints | **Low** — thin layer over Step 3, reuses existing `requireIdentity`/`requireMember` verbatim | Step 3 | Route-level tests for all listed status codes/failure payloads, mirroring the existing `DashboardController`/profile-route test style |
| 5 | `RoomManager` integration (Phase 4) — **highest risk step in this entire plan** | **High** — this is the one step that touches a 3,181-line, extensively-tested, production-load-bearing file with 6 internal call sites for `finalizeMatch` alone; requires the "complete caller-impact analysis" the original async-boundary proposal explicitly deferred, PLUS the one identified `shared/lifecycle.ts` addition (§4.2, `STARTING → READY_CHECK`) | Steps 3-4 (needs a working `EconomyService` to call) | Full existing RoomManager test suite (`roomLifecycle`, `hostFailoverAndIdempotency`, `disconnectTakeover`, `seatSecurity`, chaos/scale/reliability suites — all currently-passing 103 files) must stay green; NEW tests for every branch in §4.2's sequence diagram (success, `WalletFrozen`, `InsufficientFunds`, infra-retry-then-fail); a staged/canary rollout is recommended over a single cutover, given the blast radius |
| 6 | Wallet UI (Phase 5) | **Low** — read-mostly, additive screens, no risk to existing gameplay UI | Step 4 | Manual QA in a browser per this project's own standing UI-testing convention (golden path + edge cases + regression check on adjacent screens) |
| 7 | Checkout flow (Phase 6) | **Medium** — the ONE UI surface that sits directly in the critical "start a match" path; a bug here blocks play entirely, unlike Wallet UI which is purely additive | Steps 4, 5 (needs the real `room:startGame` confirmation flow live) | Manual QA of every branch in §6.5 (sufficient funds, insufficient funds, quote-then-commit-fails-anyway race) in a real browser, plus a deliberate test of the double-click/replay case against Step 5's idempotency |
| 8 | Admin dashboard (Phase 7) | **Low** — read-only, no gameplay-path risk, isolated to `/admin/*` | Step 4 | Manual QA; explicit negative test that no mutation control exists anywhere in the built screens (a code-review checklist item, not just a design intent) |

**Sequencing rationale:** repository → service → API is the standard bottom-up order this
codebase already uses for progression (`ProgressionRepository` → `ProgressionSync`/service layer
→ controllers existed before any UI consumed them). RoomManager integration is deliberately
sequenced AFTER the API layer, not before, so that Step 5's manual verification has a working
`EconomyService` to call directly during RoomManager test-writing, without needing the HTTP layer
at all. UI phases are sequenced last and split into three risk tiers (Wallet UI low, Checkout
medium, Admin low) rather than treated as one monolithic "frontend" step, because Checkout's risk
profile is categorically different from the other two.

---

## FINAL REPORT

### 1. Repository Architecture

One interface (`EconomyRepository`), two implementations (`InMemoryEconomyRepository`,
`SupabaseEconomyRepository`), mirroring `ProgressionRepository.ts`'s proven shape exactly — same
`kind`/`ping()` contract, same `Applied`-style envelope (here, the database's own richer
`{applied, operation, idempotencyKey, result}`), same shared-contract-test discipline. Nine
mutating methods map 1:1 to the nine top-level RPCs; reads are added freely since they carry no
idempotency concern. Errors are named classes (`WalletFrozenError`, `InsufficientFundsError`, …),
not string matching, so the service layer's branching logic is compiler-checked.

### 2. Service Architecture

`EconomyService` sits between the API and the repository, owning validation-before-the-database
(cheap rejects), retry policy (infra-errors-only, bounded, never for business-rule failures), and
the one genuinely application-level computation in the whole system (`quoteMatchCheckout`, which
is explicitly non-authoritative per `economy-v1.md` §6b). No idempotency logic lives here — that
remains entirely the database's responsibility, passed through unmodified.

### 3. API Architecture

Four endpoints, all player-facing, all reusing the EXISTING `requireIdentity`/`requireMember`
middleware and the existing `deny()` error-envelope convention — zero new auth mechanisms. Voucher
redemption accepts a raw code and hashes it server-side; no endpoint ever accepts a pre-hashed
value. No admin-mutation endpoints exist anywhere in this design.

### 4. RoomManager Integration Plan

Reviewed, not modified. One correction made to the earlier proposal: the `STARTING` lifecycle
state already exists and is the correct home for the pre-commit orchestration step — no new state
needed, only one additive transition (`STARTING → READY_CHECK`, for the rollback-on-failure case)
identified as a genuinely required future code change to `shared/lifecycle.ts`. `startGame` gets a
new async pre-commit wrapper; `finalizeMatch` and `abandonRoom` stay fully synchronous and queue
their economy calls afterward, unawaited. Host disconnect itself needs no new hook — it already
routes through `abandonRoom`/`finalizeMatch` for every other side effect.

### 5. Wallet UI Plan

Five read-mostly surfaces (Summary, Balance, Transactions, Voucher Redemption, Animations), all
sourced from the two GET endpoints, no new visual language invented — reuses this project's
existing coin-formatting and animation/toast conventions per project history.

### 6. Checkout UX Plan

One modal, four content sections, non-authoritative throughout, explicitly labeled as such in
copy. No purchase/top-up flow designed, because none exists in Economy V1's economic model.

### 7. Admin Dashboard Plan

Five read-only explorers, restating (not modifying) the existing strict no-mutation posture
already established in `docs/economy/economy-admin-dashboard-plan.md`. The Stale Settlements panel
is elevated to the World Bank Overview screen specifically because it's the operational surface
Phase 4's async settlement design makes load-bearing.

### 8. Risks

- **RoomManager integration (Step 5) is the concentration of nearly all real risk in this plan** —
  a 3,181-line file, 6 internal `finalizeMatch` call sites, and the one function
  (`startGame`) where a mistake has the worst possible failure mode (a match starting without a
  confirmed debit, or a debit succeeding while the match silently fails to start).
  Everything else in this plan (repository, service, API, UI) is low-to-medium risk and follows
  proven, existing patterns in this codebase almost verbatim.
- The `shared/lifecycle.ts` addition identified in §4.2 is small but is a real, load-bearing state
  machine used by every game, not just economy-enabled rooms — it needs its own focused review
  when implemented, separate from the economy work itself.
- Settlement/refund failures after the service layer's retry budget is exhausted rely entirely on
  the Stale Settlements admin panel being watched by an actual human/process — this was already a
  known V1 scope limitation (`economy-v1.md` §9), and this blueprint doesn't remove it, only
  makes clear exactly which UI surface depends on someone actually looking at it.
- No rate-limiting is designed for the voucher-redemption endpoint in this pass (flagged, not
  solved, in Phase 3).

### 9. Recommended Implementation Sequence

Exactly the 8 steps in Phase 8's table, in that order. The load-bearing sequencing decision: **API
layer (Steps 1-4) fully built and tested BEFORE RoomManager integration (Step 5) begins**, so the
highest-risk step has a proven, working `EconomyService` to integrate against rather than being
built simultaneously with it.

### 10. Readiness Verdict

**READY FOR IMPLEMENTATION PLANNING**

Every phase requested has a concrete, source-grounded design — not a generic template. The one
open architectural question this review surfaced (the `STARTING` state already existing, contra
the earlier proposal's assumption) has been resolved with a specific, small, additive answer, not
left open. Nothing here proposes touching the database layer, and nothing here has written any
implementation code. The next action, if the user chooses to proceed, is Phase 8 Step 1 — the
`EconomyRepository` interface and its in-memory implementation — which this blueprint has already
fully specified.
