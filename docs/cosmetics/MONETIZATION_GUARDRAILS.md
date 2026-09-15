# Monetization Guardrails

These are the roadmap's "Mandatory Long-Term Guardrails," restated as
durable rules for this codebase, each checked against current behavior.
Treat every "Holds today" row as a regression target for code review, not
just an aspiration — a future change that breaks one of these is a
correctness bug, not a style nit.

| Guardrail | Holds today? | Evidence |
|---|---|---|
| No pay-to-win cosmetics | Yes | Every cosmetic config is consumed only by rendering code (`Token.tsx`, `Card.tsx`, preview components); no game engine (`server/src/games/*`) reads a cosmetic id. See [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md) "Cosmetics cannot affect gameplay." |
| No hidden pricing | Yes | `GET /api/cosmetics/catalog` is a public, unauthenticated endpoint returning every active item's real price before any purchase action. |
| No client-authoritative ownership | Yes | Ownership is read fresh from the repository on every request; see [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md). |
| No direct wallet deduction from a React component | Yes | No client code imports or calls into wallet/economy logic directly — the only client-side write path is `POST /api/cosmetics/purchase`, which debits server-side inside `CosmeticsRepository.purchaseCosmetic`. |
| No fake expiry timers | Yes | No cosmetic in the current catalog has any expiry/countdown concept at all — there is no time-limited item today, so there is nothing to fake. If a future Live-Ops seasonal item introduces a real expiry, it must be backed by a server-checked timestamp, not a client-rendered countdown with no enforcement behind it. |
| No silent duplicate loss | Yes (by construction) | Purchasing an already-owned id returns `ALREADY_OWNED` and does not debit the wallet a second time — see [PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md). There is no mechanic that could destroy an owned item at all today (no crafting, no trading), so there is no code path where a duplicate could be silently lost. |
| No unreviewed production catalog changes | Partially | Every catalog change today ships as a code change + PR (registry + seed + migration), which goes through normal review — there is no live "hotfix the price in prod" admin panel that bypasses review. However, there is also no *formal* review checklist or required approver for catalog PRs specifically; this is process discipline, not a system-enforced gate. Real gap, tracked in [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md). |
| No sacred or culturally sensitive designs without review | No formal process | Nothing in the pipeline currently checks new cosmetic art/copy for cultural sensitivity — this has been informal (a human reads the reference images and descriptions before merging). No automated or checklist-based review exists. Open gap; see [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md). |
| No paid loot boxes / random-reward monetization | Yes | Every purchase in `purchaseCosmetic` is for a specific, known `cosmeticId` chosen by the buyer — there is no "mystery box" or randomized-outcome purchase anywhere in the catalog or repository code. |

## Guardrail specifically for the dev-mode admin bypass

`ADMIN_PERMISSION_MATRIX.md`'s path 3 (`x-account-kind` header trusted when
`verificationMode() === "off"`) is a guardrail risk if it were ever
reachable in production — it would let anyone claim free admin access to
every paid cosmetic by setting a header. It is gated behind
`verificationMode() === "off"`, which must never be true in a properly
configured production deployment (this mirrors the existing
`ALLOW_EPHEMERAL_ECONOMY` escape-hatch pattern used elsewhere in this
codebase for the same class of risk). This is an existing control, not a
new one introduced here — documented so it stays visible as a guardrail
condition rather than being rediscovered as a surprise later.
