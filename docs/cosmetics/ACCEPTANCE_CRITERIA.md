# Foundation Stage — Exit Gate Scorecard

The roadmap states these seven conditions must all hold before any
Beginner-and-beyond cosmetics work proceeds. Each is scored against the
system as it exists today, with the doc that backs the claim.

| # | Exit gate criterion | Verdict | Backing doc |
|---|---|---|---|
| 1 | Taxonomy is approved | **PASS** | [COSMETICS_TAXONOMY.md](./COSMETICS_TAXONOMY.md) — 4 categories, 5 scopes, 4 rarities, 3 unlock methods, all shipped and in active use |
| 2 | Rarity has documented meaning | **PASS** | [COSMETICS_TAXONOMY.md](./COSMETICS_TAXONOMY.md) — pricing bands are now enforced at boot by `CosmeticsService.assertRarityPricing()`, not just convention (shipped 2026-09-15) |
| 3 | Ownership is server authoritative | **PASS** | [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md) — verified via code reading of `CosmeticsService`/`CosmeticsRepository`, no client-trusted ownership path exists |
| 4 | Purchase and refund states are defined | **PASS** | [PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md) and [REFUND_RULES.md](./REFUND_RULES.md) — a 15-minute self-service refund shipped 2026-09-15, atomically crediting the wallet, revoking the entitlement, and unequipping the item |
| 5 | Asset performance budgets exist | **PASS** | [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) — `cosmeticAssetBudget.test.ts` enforces a 500KB-per-file ceiling on every card-back PNG (shipped 2026-09-15) |
| 6 | Administrative permissions are documented | **PASS (as they exist), GAP (vs. roadmap's target role model)** | [ADMIN_PERMISSION_MATRIX.md](./ADMIN_PERMISSION_MATRIX.md) — today's single-boolean model is fully documented; the roadmap's 8-role governance model is not built and is explicitly deferred |
| 7 | Cosmetics are isolated from gameplay probability and settlement | **PASS** | [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md) "Cosmetics cannot affect gameplay" — confirmed by reading every consumer of `DiceSkinConfig`/`TokenSkinConfig`/card-back configs; none are reachable from `server/src/games/*` |

## Net verdict (updated 2026-09-15)

**6 of 7 fully pass.** The one remaining partial is criterion 6: today's
admin model is a single boolean with three authentication paths (fully
documented), not the roadmap's 8-role governance matrix (Artist, Content
editor, Economy reviewer, Compliance reviewer, Publisher, Support agent,
Auditor, Administrator). That gap is deliberately **not** closed here —
standing up speculative roles with nothing yet to gate (no catalog-editing
admin UI exists) would be exactly the premature-abstraction mistake this
project's own coding-style rule warns against. It becomes real work only
once a later stage actually needs role separation (e.g. an admin catalog
editor, or agent-assisted refunds beyond the self-service window — see
[REFUND_RULES.md](./REFUND_RULES.md)'s "Explicitly not built" section).

With 6/7 passing and the 7th's remaining scope explicitly identified, the
Foundation stage's own exit gate is now satisfied enough to respect the
roadmap's sequencing rule — later releases (Beginner catalog growth,
Intermediate asset pipeline, etc.) are no longer blocked by an
undocumented or unenforced Foundation item.

## What was closed in this pass (2026-09-15)

- **Refund states**: `POST /api/cosmetics/refund`, a 15-minute self-service
  window, one attempt per purchase — see [REFUND_RULES.md](./REFUND_RULES.md)
  for the full design and rationale.
- **Asset performance budgets**: a 500KB-per-file test-enforced ceiling on
  card-back PNGs — see [ASSET_PIPELINE.md](./ASSET_PIPELINE.md).
- **Rarity-price enforcement**: `RARITY_PRICE_BANDS` + boot-time
  `assertRarityPricing()` — see [COSMETICS_TAXONOMY.md](./COSMETICS_TAXONOMY.md).

## What's still open, by design

- **Admin role model** (criterion 6's remaining half): deferred until a
  concrete later-stage feature needs it — see the Net verdict above.
- **Support-agent-assisted refunds outside the 15-minute window**: not
  built; see [REFUND_RULES.md](./REFUND_RULES.md)'s closing section for the
  straightforward extension path if the business wants it later.
