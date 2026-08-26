# Economy V1 Implementation & Architecture Plan

> **Status:** PLANNING & DISCOVERY ONLY — NO CODE CHANGES APPLIED
> **Purpose:** Prepares repository structure, dependency graph, and service boundaries for Economy V1 implementation following independent audit approval.
>
> **Correction (remediation pass, 2026-08-26):** the type definitions in §3 previously used JS
> `number` for bigint-backed database columns (`balance`, `amount`, settlement totals) and the
> idempotency convention in §4.2 described a shape (`{ ok, applied, data? }`) that does not match
> what the migration actually implements. Both are corrected below to match the as-built
> migration: bigint-safe string typing (finding L3 / Phase 12), and the real
> `{applied, operation, idempotencyKey, result}` envelope (finding H4) — see
> `docs/economy/economy-v1.md` §6a for the authoritative contract.

---

## 1. Architectural Placement & Repository Boundaries

Economy V1 follows BHALYAM's established clean architecture principles (decoupled persistence, domain services, controller endpoints, and zero-DB real-time loop).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BHALYAM ECONOMY TOPOLOGY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [ Client Browser ]                                                        │
│         │                                                                   │
│         ├──────► REST APIs (/api/economy/*) ─────► [ EconomyController ]    │
│         │                                                  │                │
│         └──────► Realtime Sockets (Socket.IO) ──► [ RoomManager ]           │
│                                                            │                │
│                                                  [ EconomyService ]         │
│                                                            │                │
│                                                  [ EconomyRepository ]      │
│                                                            │                │
│                     ┌──────────────────────────────────────┴─────────────┐  │
│                     ▼                                                    ▼  │
│        [ InMemoryEconomyRepository ]                [ SupabaseEconomyRepo ] │
│        (Testing & Local Dev Fallback)               (PostgREST / Postgres)  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Best File Locations

| Layer / Component | Proposed Location | Rationale & Existing Pattern |
|---|---|---|
| **Economy Repository Interface** | `server/src/persistence/EconomyRepository.ts` | Matches `ProgressionRepository.ts`. Defines pure TypeScript contracts with `{ applied: boolean }` idempotency conventions. |
| **In-Memory Economy Repository** | `server/src/persistence/InMemoryEconomyRepository.ts` | Matches `InMemoryProgressionRepository.ts`. Enables all 800+ vitest tests to run with zero external DB dependencies. |
| **Supabase Economy Repository** | `server/src/persistence/SupabaseEconomyRepository.ts` | Matches `SupabaseProgressionRepository.ts`. Speaks PostgREST and invokes atomic PostgreSQL RPCs via `service_role`. |
| **Persistence Factory & Status** | `server/src/persistence/index.ts` | Extends existing persistence export factory (`economyRepository()`, `isEconomyDurable()`). |
| **Economy Domain Service** | `server/src/economy/EconomyService.ts` | Matches `ProfileService.ts` and `RankingService.ts`. Orchestrates wallet lifecycle, prize quotes, vouchers, and RoomManager integration. |
| **Economy REST Controller** | `server/src/economy/EconomyController.ts` | Matches `AuthController.ts` and `DashboardController.ts`. Handles authenticated wallet reads, voucher redemption, and checkout quotes. |
| **Admin Economy Controller** | `server/src/admin/AdminEconomyController.ts` | Dedicated admin API router registered under `/api/admin/economy/*` with `requireOperationalAuth`. |
| **Voucher Cryptography Helper** | `server/src/economy/voucherCrypto.ts` | Isolated helper for HMAC/SHA-256 voucher code hashing (never logs or leaks plaintext codes). |

---

## 2. Proposed Folder Structure

```
MultiplayerGames/
├── shared/
│   ├── types.ts                               # EconomyPublicState, CoinWallet, Voucher types
│   └── economy-constants.ts                   # Entry costs, prize schedule constants, limits
├── server/
│   └── src/
│       ├── economy/
│       │   ├── EconomyService.ts              # Core economy coordinator
│       │   ├── EconomyController.ts           # /api/economy routes (wallet, redeem, quote)
│       │   ├── voucherCrypto.ts               # Secure voucher HMAC generator & verifier
│       │   └── __tests__/
│       │       ├── EconomyService.test.ts
│       │       └── voucherCrypto.test.ts
│       ├── persistence/
│       │   ├── EconomyRepository.ts           # Storage contract interface
│       │   ├── InMemoryEconomyRepository.ts   # Memory map implementation
│       │   ├── SupabaseEconomyRepository.ts   # Supabase RPC PostgREST implementation
│       │   └── __tests__/
│       │       └── economyRepositoryContract.test.ts # Dual-engine parity suite
│       └── admin/
│           ├── AdminEconomyController.ts      # /api/admin/economy routes
│           └── __tests__/
│               └── AdminEconomyController.test.ts
└── client/
    └── src/
        ├── store/
        │   └── economyStore.ts                # Zustand store for client wallet & voucher state
        └── pages/
            └── admin/
                └── economy/                   # Admin Economy Management Views
                    ├── WorldBankDashboard.tsx
                    ├── WalletExplorer.tsx
                    ├── VoucherExplorer.tsx
                    └── SettlementExplorer.tsx
```

---

## 3. Shared Types to Extract (`shared/types.ts`)

```typescript
// ── Economy V1 Types ────────────────────────────────────────────────────────
// bigint-backed columns are typed `string`, not `number` — Postgres bigint
// values lose precision past 2^53 in JS numbers, and the `pg` driver already
// returns them as strings for direct column selects (see the jsonb-vs-direct-
// select type-mapping note in docs/economy/economy-v1.md §6a). Keeping every
// coin-amount field string-typed end to end avoids a silent precision bug
// (finding L3 / Phase 12) and avoids a mismatched type between a value read
// from an RPC's jsonb `result` and one read from a direct table select.

export type EconomyIdentityKind = "member" | "guest";

export type WalletLedgerEntryType =
  | "STARTER_GRANT"
  | "ROOM_ENTRY_DEBIT"
  | "SOLO_ENTRY_DEBIT"
  | "BOT_ENTRY_DEBIT"
  | "MATCH_PRIZE_CREDIT"
  | "VOUCHER_REDEMPTION"
  | "MATCH_REFUND"
  | "ADMIN_ADJUSTMENT"; // reserved; no RPC in Economy V1 writes this

export type TreasuryLedgerEntryType =
  | "BASE_FEE_REVENUE"
  | "SOLO_ENTRY_COLLECTION"
  | "BOT_PRIZE_REVENUE"
  | "GUEST_ESCROW_DEPOSIT"
  | "GUEST_ESCROW_REDEMPTION"
  | "ADMIN_CORRECTION"; // reserved; no RPC in Economy V1 writes this

export type VoucherStatus = "ACTIVE" | "REDEEMED" | "CANCELLED";
export type MatchSettlementStatus = "COMMITTED" | "SETTLED" | "REFUNDED";

export interface CoinWalletRecord {
  identityId: string;
  identityKind: EconomyIdentityKind;
  balance: string;
  lifetimeGranted: string;
  lifetimeEarned: string;
  lifetimeSpent: string;
  lifetimeRefunded: string; // separate from lifetimeSpent — a refund never decreases it
  starterGranted: boolean;
  isFrozen: boolean;
  walletVersion: number;
  updatedAt: number;
}

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

export interface RewardVoucherRecord {
  id: string;
  codeHash: string; // exactly 64 hex chars
  coinAmount: string;
  matchId: string;
  issuedToGuestId: string;
  status: VoucherStatus;
  redeemedByMemberId: string | null;
  redeemedAt: number | null;
  createdAt: number;
}

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

// Mirrors the application-level, non-authoritative quote described in
// docs/economy/economy-v1.md §6b. This is NOT a database RPC — it is computed
// in application code from the current economy_configurations /
// economy_prize_schedules rows, and commit_match_entry independently
// revalidates everything here at commit time. A stale or client-manipulated
// quote can never bypass that revalidation.
export interface MatchCheckoutQuote {
  seatCount: number;
  costPerSeat: string;
  totalCost: string;
  hostBalance: string;
  hasSufficientFunds: boolean;
  projectedPrizePool: {
    firstPlace: string;
    secondPlace: string;
    thirdPlace: string;
    worldBankCut: string;
  };
}
```

---

## 4. Existing Patterns Economy Will Follow

1. **Dual Repository Parity:**
   Every method in `EconomyRepository` must run identical tests against both `InMemoryEconomyRepository` and `SupabaseEconomyRepository` using a shared contract test suite (`__tests__/economyRepositoryContract.test.ts`).
2. **Applied Convention for Idempotency:**
   Every mutating database RPC returns the standardized envelope
   `{ applied: boolean, operation: string, idempotencyKey: string, result: T }` — this is what
   the migration actually implements (see `docs/economy/economy-v1.md` §6a), not a generic
   `{ ok, applied, data? }` shape. `EconomyRepository` write methods should surface this envelope
   as-is rather than re-wrapping it, so the caller can always distinguish a fresh application from
   a replay of an already-applied idempotency key. Duplicate requests return `applied: false` with
   the **original** `result`, never a bare row and never a different result on replay — preventing
   error cascades on retried socket requests without ever returning ambiguous data.
3. **Pure Server Authority:**
   Wallet mutations, prize evaluations, and quote calculations remain 100% server-side. Clients receive optimistic visual updates that reconcile against server broadcasts.
4. **Isolated Operational Auth:**
   Admin economy endpoints require `requireOperationalAuth` middleware and never expose raw database credentials or service role keys.
