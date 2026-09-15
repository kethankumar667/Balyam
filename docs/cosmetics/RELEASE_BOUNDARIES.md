# Release Boundaries

Maps the roadmap's 7 releases to what actually exists in this codebase
today, so nobody re-litigates "haven't we already built this?" or
accidentally starts Advanced-stage work before Foundation is closed.

## Release 0 — Foundation Stage (this branch)

Status: **in progress**. Deliverable is documentation + gap identification,
not new code — see [README.md](./README.md) for the full list of docs and
[ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) for the pass/gap
breakdown of the exit gate itself.

## Release 1 — Beginner Stage (already shipped, pre-dates this branch)

The roadmap describes this as "a static dice/token shop with specific
endpoints like `POST /cosmetics/purchases/quote` + `POST
/cosmetics/purchases/confirm`." The shipped system doesn't use a
quote/confirm two-step, but it satisfies the same intent with a simpler,
already-idempotent single-step purchase
(`POST /api/cosmetics/purchase` — see
[PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md)), plus a working
catalog, equip/unequip, achievement-grant, and (as of 2026-09-15)
self-service refund path (`POST /api/cosmetics/refund`, 15-minute window —
see [REFUND_RULES.md](./REFUND_RULES.md)). Categories live today:
`TABLE_THEME`, `DICE_SKIN`, `TOKEN_SKIN`, `CARD_BACK` (`AVATAR_AURA` /
`PODIUM_TITLE` were shipped once and deliberately removed — see
[COSMETICS_TAXONOMY.md](./COSMETICS_TAXONOMY.md)). Adding more items to
these categories (more dice materials, more card backs, etc.) is ordinary
Beginner-stage catalog work and does not require touching this Foundation
layer — follow [CATALOG_SPECIFICATION.md](./CATALOG_SPECIFICATION.md)'s
"registry + seed + migration in one PR" rule when doing so.

## Release 2 — Intermediate Stage (not started)

Asset pipeline with quality tiers, a Preview Studio, performance budgets as
an enforced system rather than a convention. See
[ASSET_PIPELINE.md](./ASSET_PIPELINE.md) for the current baseline this
would build on top of.

## Release 3 — Advanced Stage (not started)

Collections, Bundles, an expanded `GameCosmeticLoadout` interface, named
presets, immutable per-match cosmetic snapshots. None of this exists —
today's loadout model is exactly one equipped item per (category, scope)
slot, resolved live on every read (`resolveEffectiveLoadout`), with no
concept of a saved preset or a frozen historical snapshot.

## Release 4 — Progression Stage (not started)

`CosmeticProgress`, mastery/evolution stages. No progression tracking of
any kind exists for cosmetics today.

## Release 5 — Crafting Stage (not started)

`CosmeticRecipe`, transactional crafting. No crafting system exists;
[MONETIZATION_GUARDRAILS.md](./MONETIZATION_GUARDRAILS.md)'s "no silent
duplicate loss" guardrail currently holds trivially because there is
nothing that could destroy an owned item — that changes the moment
crafting is introduced, and the guardrail's enforcement becomes a real
design requirement at that point, not before.

## Release 6 — Live-Operations Stage (not started)

Seasonal structure, regional/cultural content review,
`AvailabilityWindow`-style time-boxed items. No item in the current
catalog has any time-boxing concept — see the "No fake expiry timers" row
in [MONETIZATION_GUARDRAILS.md](./MONETIZATION_GUARDRAILS.md).

## Release 7 — Social/Prestige, Personal Spaces/Companions (not started)

Entirely new domains with no current codebase equivalent.

## Rule for future work on this roadmap

Before starting any release above Release 1, re-run the Foundation exit
gate in [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) and confirm its
open gaps have actually been closed (or explicitly waived by a product
decision) — do not let "we already have docs" substitute for "the gate
criteria are met."
