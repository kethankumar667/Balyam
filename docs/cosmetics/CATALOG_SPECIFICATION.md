# Catalog Specification

## The closed-set registry model

The catalog has two halves that must agree, and the boot process enforces
that agreement:

1. **`shared/cosmetics.ts` — `BHALYAM_COSMETIC_REGISTRY`.** A compile-time,
   client-and-server-shared array of `RegistryCosmeticDef`. This is the
   identity source of truth: id, category, `supportedScopes`, whether it's
   the default for its slot, and (for image-based items) `bundledAssetKey`.
   It ships inside both bundles — adding a row here requires a deploy.
2. **The database catalog** (`cosmetic_catalog` table in Supabase, or
   `SEED_CATALOG` in `InMemoryCosmeticsRepository` for local/dev). This is
   the commerce source of truth: price, rarity, `unlockMethod`,
   `isActive`, `displayOrder`, name/description copy.

`CosmeticsService.assertCatalogIntegrity()` runs at boot and throws
(crashing the server) if any active database row's `id` is not present in
the shared registry. This is intentional fail-fast behavior, not a bug —
see the incident this session that motivated writing these docs: a
migration was run directly against Supabase for 32 new dice/token rows,
but the application code containing the matching registry entries was
never actually merged to `main` (it had been reset off the branch). The
rows existed in the database with no registry counterpart, so the shop
correctly filtered them out client-side rather than rendering broken
items — the system behaved exactly as designed, the deploy was just
incomplete.

**The corollary this section exists to state plainly: a database
migration and a registry/seed-catalog code change are one atomic unit of
work. Never ship one without the other in the same PR/deploy.**

## Id conventions

- `theme_<name>` — table themes
- `dice_<name>` — dice skins
- `token_<name>` — token/pawn skins
- `cardback_<style>_<game>` — card backs (game suffix required since the
  same visual style id must not collide across Rummy/UNO)

Ids are permanent once shipped — `sanitizeCosmeticId` and every persisted
entitlement/equip row key off the literal string. Renaming an id after
release orphans existing owners' entitlements; add a new id instead and
leave the old one in the registry (optionally `isActive: false` in the
catalog) rather than renaming.

## What's missing: catalog versioning

The roadmap requires catalog versioning as a Foundation exit-gate item.
Today there is no version field, no changelog, and no way to answer "what
did the catalog look like on date X" other than reading git history across
`shared/cosmetics.ts` + the relevant `supabase/migrations/*.sql` file
together. This is a real, acknowledged gap (see
[ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md)) — closing it means
deciding whether versioning lives as a DB column (`catalog_version` on each
row) or as an append-only migration-file convention that's already
sufficient in practice (each expansion is its own dated migration file:
`20260920000000_cosmetics_system.sql` through
`20260923000000_cosmetics_card_back_expansion.sql`). That decision is
product/architecture-owned and is not made unilaterally in this pass.
