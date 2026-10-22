---
version: 1
slug: "client-src-pages-shoppage-tsx"
primary_target: "client/src/pages/ShopPage.tsx"
related_targets: ["client/src/components/cosmetics"]
---

## Scope and mode

Surface: `/shop` (the Cosmetics Boutique), a page inside the established BHALYAM world (the main app, not the Mandali album). Mode: Operate. A shopper browses cosmetics (frames, dice, tokens, card backs), sees each one on their OWN avatar / dice / token / card back, reads the price against their coin balance, then unlocks, equips, resets or refunds.

## Audience, job, task, constraints

Phone-first, multi-generation (the least technical family member sets the bar for clarity), budget Android. One action per item, plainly labelled; no hover-only controls; 44px targets; light and dark both complete; reduced motion respected. Cosmetic only: no urgency, no dark patterns, no real money. The wallet balance, the preview on the shopper's own look, refund and "every match stays fair" must always be reachable. Prior surface (a bordered, glowing "vault" panel that read as a modal dropped on a page) is the anti-reference.

## Direction contract

THESIS: The shop is a showroom, a page you walk into, not a dialog you open. One item stands on a stage at a time, big, on the shopper's own look; everything else on the page serves choosing it and acting on it. It refuses the modal-in-a-page arrangement: no bordered floating panel, no vault glow, no gradient wordmark.

OWN-WORLD: BHALYAM's live tokens (light: warm cream ground; dark: obsidian), Righteous for the page title, Poppins for everything else, the standard Button primitives. Rarity is the page's colour: COMMON slate, RARE blue, EPIC violet, LEGENDARY gold, applied as flat fields (a tinted band, a stage plate with ring outlines, a solid floor pedestal with a real offset shadow), never a zero-offset halo. Recognisable with the copy removed: a full-bleed tinted stage band, an item on a ringed plate, a thumbnail strip with rarity-coloured underlines.

STORY: The shopper understands in one glance what they are looking at, whether they own it, what it costs against what they have, and the one thing to press. They leave wearing something new, or knowing exactly how many coins short they are.

FIRST VIEWPORT: Desktop: page title row with Back and the coin balance; category tabs; then a full-bleed rarity-tinted stage band holding the stage (about two thirds, the item large on its plate with step arrows and the preview-context switch) and the detail column (name, rarity, one-line description, price or state, one primary button, refund link); the thumbnail strip along the bottom of the band. Phone: title row with Back and balance; four equal tabs; a stage that takes the remaining height; name and price row; the thumbnail strip; a pinned action bar with the one primary button.

FORM: Showroom (preview-first stage with a thumbnail carousel), dealt as structure 4 of 7 in the surface roll, seed key c2da49e0, chosen by the user over Ledger and Catalog+Inspector.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Short landscape phones (width over 767, height under 520) fall into the desktop shell and scroll; confirm in a browser. No sidebar entry to the shop yet.
