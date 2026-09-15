# Refund Rules

## Current state: self-service refund, 15-minute window, shipped 2026-09-15

A coin-purchased cosmetic can be refunded by its owner, exactly once, within
15 minutes of the purchase that granted it (`REFUND_WINDOW_MS` in
`server/src/cosmetics/CosmeticsRepository.ts`). This closes the roadmap's
Foundation exit-gate requirement that "purchase and refund states are
defined" — see [PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md) for
the purchase half, which was already real before this.

**Policy chosen** (my recommendation, approved for implementation rather
than left as an open product question): self-service, 15 minutes, one
attempt per purchase, no approval step. Rationale: cosmetics cannot affect
gameplay outcomes (see [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md)), so
a refund-then-rebuy cycle is economically neutral — it moves coins back and
forth with no arbitrage, no duplication, and no way to extract value. That
removed the usual reason self-service refunds get restricted (abuse/fraud
risk), so a short, low-friction window beats sending every "I clicked the
wrong skin" complaint to manual support.

## The full path: `POST /api/cosmetics/refund`

`CosmeticsController` → `CosmeticsService.refundCosmetic` →
`CosmeticsRepository.refundCosmetic`. Same idempotency-key contract as
purchase (client-generated key; a replay with the same key is a no-op
returning the original result; a replay with the same key against a
*different* cosmetic id is `IDEMPOTENCY_MISMATCH`, never silently
processed either way).

Result codes (`RefundCosmeticResult.code`):

| Code | Meaning |
|---|---|
| `REFUNDED` | Wallet credited, entitlement revoked, unequipped everywhere it was equipped |
| `NOT_OWNED` | Caller doesn't currently own this cosmetic |
| `NOT_REFUNDABLE` | Owned, but not via `COIN_PURCHASE` (a `STREAK_MILESTONE` achievement grant, or an admin/free default) — nothing was paid for it, so there is nothing to refund |
| `WINDOW_EXPIRED` | Owned via `COIN_PURCHASE`, but more than 15 minutes have passed since that purchase |
| `INVALID_COSMETIC` | Unknown id |
| `IDEMPOTENCY_MISMATCH` | Key reused against a different cosmetic id |
| `ERROR` | Unhandled failure |

## What a refund actually does, atomically

1. Credits the wallet by the item's current catalog price.
2. Writes a `COSMETIC_REFUND` ledger entry (its own entry type, not reused
   `MATCH_REFUND` or `ADMIN_ADJUSTMENT` — same "don't blur two different
   audit trails together" precedent that gave `COSMETIC_PURCHASE` and
   `DAILY_REWARD_CREDIT` their own types).
3. Increments the wallet's `lifetimeRefunded` counter, never
   `lifetimeEarned`/`lifetimeGranted` — required by the wallet reconciliation
   invariant (`balance = lifetimeGranted + lifetimeEarned + lifetimeRefunded
   - lifetimeSpent`), enforced by `InMemoryEconomyRepository.assertWalletReconciles`
   and mirrored in the `coin_wallets` schema.
4. Revokes the entitlement (deletes the `user_cosmetics` row / in-memory
   equivalent).
5. Unequips the item from **every** `(category, scope)` slot it currently
   occupies — a refunded item must never remain equipped and rendering.

Admins never purchased anything (see
[ADMIN_PERMISSION_MATRIX.md](./ADMIN_PERMISSION_MATRIX.md)'s
"free access" bypass), so `POST /refund` short-circuits an admin caller to
`NOT_OWNED` without touching the repository at all — mirroring how
`/purchase` short-circuits admins to a free `ALREADY_OWNED`.

## Where it lives

- Server contract: `server/src/cosmetics/CosmeticsRepository.ts`
  (`RefundCosmeticInput`/`RefundCosmeticResult`/`REFUND_WINDOW_MS`).
- In-memory implementation: `InMemoryCosmeticsRepository.refundCosmetic` —
  tracks each entitlement's `sourceType` + `acquiredAt` in a new
  `entitlementMeta` map specifically so this check has something to enforce
  against in dev/test.
- Supabase implementation: `refund_cosmetic_internal`/`refund_cosmetic` RPCs
  in `supabase/migrations/20260925000000_cosmetics_refund_capability.sql` —
  finds the eligible purchase via `cosmetic_purchase_requests` (already
  timestamped), locks the wallet row, and performs the same 5 steps above
  inside one transaction.
- Wallet credit primitive: `EconomyRepository.creditWallet` (optional,
  mirrors the existing optional `debitWallet` exactly — Supabase never
  calls it because its RPC credits `coin_wallets` directly, same as
  Supabase never calls `debitWallet` for purchases).
- Client: a "Refund for N Coins" link in `CosmeticsPreviewStage.tsx`, shown
  only for owned `COIN_PURCHASE` items. The client does **not** know or
  guess whether the window has expired — it always offers the attempt and
  lets the server's `WINDOW_EXPIRED` response (surfaced through the
  existing error banner) be the actual authority. This keeps refund
  eligibility server-authoritative, not computed client-side from a
  possibly-stale timestamp.

## Explicitly not built

Support-agent-triggered refunds outside the 15-minute window, partial
refunds, refunding a `STREAK_MILESTONE`/admin grant, and any UI showing
"time remaining to refund" are all out of scope here. If the business later
wants a longer or agent-assisted refund path, it's a straightforward
extension of `refund_cosmetic_internal` (a second, privileged variant
without the window/ownership-source checks, gated behind an admin role) —
not a redesign.
