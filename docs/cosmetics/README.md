# BHALYAM Cosmetics — Governance Docs (Foundation Stage)

This directory is the start of the implementation of the "BHALYAM Cosmetics
Ecosystem Roadmap." The roadmap describes seven releases (Foundation,
Beginner, Intermediate, Advanced, Progression, Crafting, Live-Operations)
and is explicit that none of the later stages should start before the
Foundation stage's own exit gate is satisfied:

> "Proceed only when: Taxonomy is approved. Rarity has documented meaning.
> Ownership is server authoritative. Purchase and refund states are defined.
> Asset performance budgets exist. Administrative permissions are
> documented. Cosmetics are isolated from gameplay probability and
> settlement."

## What this branch actually does

BHALYAM already ships a working cosmetics system in production (catalog,
wallet-backed purchases, per-game equip slots, achievement grants — see
`server/src/cosmetics/`, `shared/cosmetics.ts`, `client/src/components/cosmetics/`).
That system already satisfies most of the exit gate in practice; it was
just never written down. So this stage is **documentation-first, not a
rewrite**: each file below states what the shipped system actually does
today, cites the code that proves it, and — where the roadmap asks for
something the code doesn't do yet — says so as an open gap instead of
inventing an answer.

| Doc | Answers |
|---|---|
| [COSMETICS_TAXONOMY.md](./COSMETICS_TAXONOMY.md) | What categories/scopes/rarities exist, and what the roadmap's expanded taxonomy would add later |
| [CATALOG_SPECIFICATION.md](./CATALOG_SPECIFICATION.md) | The closed-set registry model, id conventions, catalog versioning gap |
| [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md) | How ownership is granted and checked; why it's server-authoritative today |
| [PURCHASE_STATE_MACHINE.md](./PURCHASE_STATE_MACHINE.md) | The real purchase result codes and transitions, idempotency contract |
| [REFUND_RULES.md](./REFUND_RULES.md) | Current state: no refund capability exists — this is an open decision, not a shipped feature |
| [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) | How cosmetic visuals are authored/shipped today (static, bundled) vs. the roadmap's quality-tier pipeline (not built) |
| [ADMIN_PERMISSION_MATRIX.md](./ADMIN_PERMISSION_MATRIX.md) | The real admin-check logic and its single-tier role model, vs. the roadmap's multi-role governance |
| [MONETIZATION_GUARDRAILS.md](./MONETIZATION_GUARDRAILS.md) | The roadmap's mandatory guardrails, checked against current code, kept as durable rules for future cosmetics work |
| [RELEASE_BOUNDARIES.md](./RELEASE_BOUNDARIES.md) | Maps what's shipped to the roadmap's 7 releases; states plainly what is and isn't in scope right now |
| [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) | The Foundation exit gate, item by item, with a pass/gap verdict for each |

## What this branch deliberately does NOT do

Per the roadmap's own philosophy ("Do not begin by generating hundreds of
attractive assets. First establish catalog versioning, entitlement
integrity, purchase idempotency...") and per this project's YAGNI
principle, this stage does not:

- Build the Advanced-stage `GameCosmeticLoadout` preset/collection system
- Build Progression (`CosmeticProgress`) or Crafting (`CosmeticRecipe`)
- Build a Live-Ops seasonal/regional content-review pipeline
- Add new purchasable items (that's Beginner-stage catalog work, already
  live for dice/token/card-back/table-theme categories — see
  [RELEASE_BOUNDARIES.md](./RELEASE_BOUNDARIES.md))
- Stand up a new asset ingestion pipeline with quality tiers

Those are real future stages, not abandoned scope — they're just not
Foundation work, and starting them before the exit gate is closed is the
exact mistake the roadmap warns against.
