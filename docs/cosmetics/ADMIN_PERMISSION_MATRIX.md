# Admin Permission Matrix

## What actually exists: one boolean, three ways to earn it

Source of truth: `isCallerAdmin(req)` in `server/src/cosmetics/CosmeticsController.ts`.
There is no multi-role system for cosmetics specifically — a caller is
either "admin" (true) or an ordinary player (false), checked fresh on every
request via, in order:

1. **Operational secret key** — `x-operational-key` header matched via
   constant-time comparison (`secretsMatch`) against
   `operationalAuthConfig().secret`. Used for server-to-server/ops tooling,
   not end-user sessions.
2. **Verified DB role** — if `req.player` is a verified `"member"` identity,
   `getUserRole(playerId, email)` is checked against `"admin"` or
   `"super_admin"`. This is the real production path for a human admin.
   `adminUserIds` (an explicit allowlist from `operationalAuthConfig()`) is
   also checked first regardless of role lookup.
3. **Dev-mode header assertion** — only reachable when
   `verificationMode() === "off"` (local/unconfigured auth): an
   `x-account-kind: admin` or `super_admin` header is trusted outright.
   This path does not exist in a properly configured production
   environment and must never be reachable there — see
   [MONETIZATION_GUARDRAILS.md](./MONETIZATION_GUARDRAILS.md).

## What admin status grants, specifically for cosmetics

- `GET /api/cosmetics/loadout` — every catalog item reported as owned
  (`effectiveOwnedIds = catalog.map(c => c.id)`), **not** persisted as real
  entitlement rows (see [ENTITLEMENT_RULES.md](./ENTITLEMENT_RULES.md)).
- `POST /api/cosmetics/purchase` — short-circuited to a free
  `ALREADY_OWNED` response; the wallet is never touched.
- `POST /api/cosmetics/equip` — the ownership check is skipped entirely
  (`isAdmin` passed through to `CosmeticsService.equipCosmetic`).

Admin status grants full access to every cosmetic for testing/support
purposes; it does not grant any additional *write* capability over the
catalog itself (no endpoint exists to add/edit/deactivate a catalog row —
that happens only via a code change + migration, per
[CATALOG_SPECIFICATION.md](./CATALOG_SPECIFICATION.md)).

## Roadmap's role model — not implemented

The roadmap describes eight distinct roles (Artist, Content editor,
Economy reviewer, Compliance reviewer, Publisher, Support agent, Auditor,
Administrator) with presumably different permissions per domain
(catalog edit vs. approve vs. publish vs. refund). None of that exists.
Today "admin" is a single undifferentiated bucket with full read/equip
override and no write surface at all for the catalog. Standing up the
roadmap's role matrix is real future work (tied to whatever stage adds a
catalog-editing admin UI) and is intentionally not attempted here — adding
speculative role plumbing with nothing to gate yet would be exactly the
premature abstraction this project's own coding-style rule warns against.

## Gap this file surfaces

The Foundation exit gate asks for "administrative permissions are
documented" — this file is that documentation. It does **not** claim the
permission model is complete against the roadmap's target; it states
plainly that today's model is a single boolean with three authentication
paths, and that a multi-role matrix is future work, not silently assumed
to already exist.
