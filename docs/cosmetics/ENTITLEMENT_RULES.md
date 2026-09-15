# Entitlement Rules

## Core rule: ownership is server-authoritative

The client never decides what a player owns. Every surface that shows
"owned" state (`CosmeticsStoreModal.tsx`, equip buttons, the loadout
resolver) reads it from `GET /api/cosmetics/loadout`, which calls
`CosmeticsService.getUserLoadout` → `repository.getUserEntitlements(userId)`.
There is no client-side cache that is trusted for a purchase or equip
decision; every mutating action re-validates against the repository inside
`CosmeticsService`.

## How ownership is granted

Exactly two paths write an entitlement row, both server-side:

1. **Purchase** — `CosmeticsRepository.purchaseCosmetic`. Atomic: verifies
   the catalog price, checks idempotency, checks wallet balance, debits the
   wallet, writes a ledger entry, and grants the entitlement — all as one
   unit (see [PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md)).
2. **Achievement/streak grant** — `CosmeticsService.grantCosmeticEntitlement`
   → `repository.grantEntitlement(userId, cosmeticId, sourceType,
   sourceReference)`. Called only by internal server services (e.g. a
   streak-milestone service), never reachable from an HTTP request body.
   `sourceType`/`sourceReference` exist so a grant can be traced back to the
   event that caused it (audit trail), not just "this user owns this item."

There is no third path. A cosmetic cannot become owned by editing client
state, replaying a network request with a different id, or via any
admin-adjacent endpoint that writes entitlements directly — admin access
(see [ADMIN_PERMISSION_MATRIX.md](./ADMIN_PERMISSION_MATRIX.md)) is
implemented as a *read-time* bypass (treat as if everything were owned),
not a write to the entitlements table, so admin status is never
persisted as a fake purchase.

## Equip-time validation

`CosmeticsService.equipCosmetic` runs, in order:

1. `sanitizeCosmeticId(cosmeticId, category, scope)` — rejects the request
   outright if the id doesn't exist, or exists but its `supportedScopes`
   doesn't include the requested scope (prevents e.g. equipping a
   UNO-only card back into the Rummy slot, which would silently fall back
   to a default look client-side rather than error).
2. Ownership check — skipped only if the id is the category/scope's
   default (`getDefaultCosmetic`) or the caller is an admin; otherwise the
   id must appear in `repository.getUserEntitlements(userId)` or the call
   throws `UnownedCosmeticError` (→ HTTP 403).

## Cosmetics cannot affect gameplay

This is a hard boundary, not a style preference. Every cosmetic config
(`DiceSkinConfig`, `TokenSkinConfig`, card-back image, table theme) is
consumed exclusively by rendering code (`Token.tsx`, `Card.tsx`,
`uno-shared.tsx`, preview components) — none of it is read by any game
engine (`server/src/games/*/*.ts`), RNG, or settlement path. When adding
future cosmetics, this must remain true: a cosmetic id must never be
passed into anything that computes a dice roll, a card draw, or a payout.
