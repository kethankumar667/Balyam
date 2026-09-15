# Cosmetics Taxonomy

## Categories (shipped today)

Source of truth: `shared/cosmetics.ts` — `COSMETIC_CATEGORIES` / `CosmeticCategory`.

| Category | Meaning | Example ids |
|---|---|---|
| `TABLE_THEME` | Global board/table skin | `theme_*` |
| `DICE_SKIN` | Dice face material (Ludo/SNL) | `dice_*` |
| `TOKEN_SKIN` | Ludo pawn accessory/material | `token_*` |
| `CARD_BACK` | Rummy/UNO card back art | `cardback_*` |

Two categories the roadmap assumes exist (`AVATAR_AURA`, `PODIUM_TITLE`) were
**removed** from this codebase in migration
`20260921000000_cosmetics_remove_tables_auras_titles.sql` and are not present
in the current registry. Any roadmap language referencing them describes a
future decision to re-add them, not current state — do not re-introduce them
without an explicit product decision, since they were pulled once already.

## Scopes

Source of truth: `CosmeticGameScope` = `"GLOBAL" | "uno" | "rummy" | "ludo" | "snl"`.

`GLOBAL` items are valid across every game that supports the category (used
by `TABLE_THEME` and some `DICE_SKIN`/`TOKEN_SKIN` entries via
`supportedScopes: ["GLOBAL", "ludo", "snl"]`). A cosmetic can be equipped
only into a `(category, scope)` slot listed in its own `supportedScopes` —
enforced server-side by `sanitizeCosmeticId` in
`CosmeticsService.equipCosmetic` (see [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md)).

## Rarity

Source of truth: `CosmeticRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY"`,
stored per-row in the catalog (`cosmetic_catalog.rarity` /
`InMemoryCosmeticsRepository`'s `SEED_CATALOG`), not in the shared registry
itself — rarity is a catalog/pricing concept, not an identity concept.

Price bands are now enforced at boot, not just convention — see
`RARITY_PRICE_BANDS` in `shared/cosmetics.ts`, checked by
`CosmeticsService.assertRarityPricing()` (called alongside
`assertCatalogIntegrity()` in `server/src/index.ts`; throws and crashes the
server the same way a catalog-integrity violation does):

| Rarity | Enforced band (COIN_PURCHASE only) |
|---|---|
| COMMON | 0 – 1,000 coins |
| RARE | 1,000 – 3,000 coins |
| EPIC | 2,000 – 4,500 coins |
| LEGENDARY | 4,000 – 11,000 coins |

Bands deliberately overlap at their edges (a price is checked only against
its own item's declared rarity, never cross-checked against neighboring
rarities) and are wide enough to pass every price already shipped — a
violation always means a genuine authoring mistake, not normal pricing
variance. `DEFAULT` and `STREAK_MILESTONE` items are exempt
(`isPriceWithinRarityBand` returns `true` unconditionally for them) since
they were never priced to begin with.

## Unlock methods

`UnlockMethod = "COIN_PURCHASE" | "STREAK_MILESTONE" | "DEFAULT"`.

- `DEFAULT` — free, pre-equipped, cannot be purchased (`isDefault: true` in
  the registry; see `getDefaultCosmetic`).
- `COIN_PURCHASE` — bought via `POST /api/cosmetics/purchase`.
- `STREAK_MILESTONE` — granted server-side via
  `CosmeticsService.grantCosmeticEntitlement`, called only by internal
  services (e.g. a streak service), never by a client request.

## Roadmap's expanded taxonomy — not implemented

The roadmap's material-family/`AcquisitionSource` enum (crafting, seasonal
drops, prestige rewards, companions, personal spaces, etc.) does not exist
in code. It belongs to the Progression/Crafting/Live-Ops/Social stages,
which are explicitly out of scope for this Foundation pass — see
[RELEASE_BOUNDARIES.md](./RELEASE_BOUNDARIES.md). Do not add new
`UnlockMethod` or `CosmeticCategory` values speculatively; extend this
taxonomy only when a specific later-stage release actually needs the new
value, and update this file in the same change.
