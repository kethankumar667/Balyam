# Purchase State Machine

## Result codes

Source of truth: `PurchaseCosmeticResult.code` in
`server/src/cosmetics/CosmeticsRepository.ts`.

| Code | Meaning | `applied` |
|---|---|---|
| `PURCHASED` | Wallet debited, entitlement granted | `true` |
| `ALREADY_OWNED` | No-op — caller already owns this id (also returned for admin callers hitting `/purchase`, who are never actually charged) | `false` |
| `INSUFFICIENT_FUNDS` | Wallet balance too low at debit time | `false` |
| `INVALID_COSMETIC` | Id unknown or not in the closed-set registry | `false` |
| `IDEMPOTENCY_MISMATCH` | The idempotency key was reused for a *different* cosmetic id than its original request | `false` |
| `ERROR` | Unhandled repository/internal failure | `false` |

`applied` (not `success`) is the field callers should branch on for "did a
debit actually happen" — `success` in the HTTP response mirrors `applied`
directly today, but the roadmap's requirement to separate "request
succeeded" from "purchase state changed" is already met by having both
fields, so keep populating both if this ever diverges (e.g. a future
"queued" state).

## Preconditions checked before the repository is even called

`CosmeticsService.purchaseCosmetic` short-circuits with an `ERROR`/
`INVALID_COSMETIC` response (never reaching the repository) when:
- `userId` is empty (unauthenticated)
- `cosmeticId` is not a known registry id
- `idempotencyKey` is missing or blank

The HTTP layer (`CosmeticsController`) additionally rejects with 400 before
calling the service at all if `cosmeticId`/`idempotencyKey` aren't strings,
and short-circuits admin callers to a free `ALREADY_OWNED` response without
ever touching the wallet.

## Idempotency contract

Every purchase request carries a client-generated `idempotencyKey`. The
repository's contract (see the `purchaseCosmetic` interface doc comment) is:
verify catalog price → check account-scoped idempotency → validate a
non-frozen wallet balance → debit → write ledger → grant entitlement — as
one atomic operation. A retried request with the **same** key and **same**
cosmetic id must be safe to resend (returns the original result, does not
double-charge). A reused key against a **different** cosmetic id is a
client bug and returns `IDEMPOTENCY_MISMATCH` rather than silently
processing either interpretation.

## Refunds

`PURCHASED` can now transition to refunded via a separate, mirrored state
machine (`RefundCosmeticResult.code`) on `POST /api/cosmetics/refund`,
within a 15-minute window of the purchase — see
[REFUND_RULES.md](./REFUND_RULES.md) for the full design.

## Wallet-debit safety note

`InMemoryCosmeticsRepository` (used in dev/test) will refuse to grant a
cosmetic at all — throwing `CosmeticsDebitUnsupportedError` — if the
active `EconomyRepository` has no `debitWallet` implementation, specifically
to prevent a prior bug class where a purchase computed a plausible-looking
new balance for the response without ever persisting the debit (free item,
fake "charged" message). Any new `EconomyRepository` implementation must
implement `debitWallet` before it can back cosmetics purchases.
