# Asset Pipeline

## How cosmetic visuals ship today

There are two authoring patterns in the current codebase, both fully static
and bundled at build time — there is no runtime asset ingestion, upload, or
CDN-served cosmetic asset anywhere in the system:

1. **Pure-CSS material configs** — `DiceSkinConfig` and (for its boolean
   accessory flags) `TokenSkinConfig` in `client/src/lib/cosmeticsResolver.ts`.
   No image asset at all; the visual is entirely `faceBg`/`faceBorder`/
   `pipBg`/`pipBorder`/`glow`/`wooden` CSS values, rendered inline by
   `Token.tsx`, `CosmeticsItemCard.tsx`, and `CosmeticsPreviewStage.tsx`.
   Zero file size cost beyond the config object itself; renders identically
   at any resolution.
2. **Bundled static images** — card backs
   (`client/public/rummy-card-backs/RUMMY*.png`,
   `client/public/uno-card-backs/UNO*.png`) referenced via
   `bundledAssetKey` on the registry entry and rendered through the
   `{ kind: "image", imageSrc }` branch of the discriminated
   `RummyCardBackConfig`/`UnoCardBackConfig` union. These ship as ordinary
   Vite public assets — no compression pipeline, no responsive variants, no
   quality tiers.

## What the roadmap's Intermediate stage asks for — not built

The roadmap's asset pipeline (quality tiers low/medium/high/ultra, a
Preview Studio, per-device performance budgets, presumably a real ingestion
workflow for artists) does not exist. Every cosmetic asset today is
authored once, at one fixed quality, and committed directly to the repo.
This is adequate for the current catalog size (roughly 90 items across 4
categories) but will not scale to hundreds of items with multiple render
resolutions — that buildout is explicitly Intermediate-stage work, out of
scope for this Foundation pass.

## Performance budget — enforced, 2026-09-15

`client/src/lib/__tests__/cosmeticAssetBudget.test.ts` scans every PNG under
`client/public/rummy-card-backs/` and `client/public/uno-card-backs/` and
fails the build's test run if any file exceeds **500KB**. That number is
not aspirational — it's the real current max (`RUMMY5.png`, ~430KB) plus
headroom, so it passes on every asset already shipped and only fails on a
genuine future regression (e.g. someone committing an unoptimized 5MB
export). CSS-material dice/tokens still have effectively zero asset weight
and need no check.

This closes the roadmap's "asset performance budgets exist" exit-gate item
for the one asset class that actually ships binary files today. What it
does **not** do: generate or require WebP variants, enforce anything about
render cost/GPU budget (irrelevant for a static `<img>`/CSS gradient), or
cover a future asset type this test doesn't know about yet — extend the
same test (or add a sibling) when a new binary cosmetic asset class ships.

## Rejected alternative found on the remote

A separate branch, `feat/luxury-3d-dice-token-cosmetics` (commit `0134a8e`),
implements a third pattern: real PNG+WEBP asset pairs per dice/token skin
under `client/public/dice-skins/`. It was not merged and is not part of
this Foundation baseline; if a future stage revisits image-based dice/token
skins, that branch is prior art worth reviewing before starting fresh, but
it has not been evaluated for quality/licensing/performance as part of this
pass.
