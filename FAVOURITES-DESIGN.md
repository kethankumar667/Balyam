# Favourites — Design & Verification

## Status

Already implemented (client-only) — built ahead of this audit, same author
and pattern as Recently Played. This document records the architecture,
evaluates it against the brief, and gives a concrete recommendation for the
DB-backed extension.

## Current Architecture

- **Storage**: `client/src/services/FavouritesManager.ts` — a plain
  singleton wrapping `localStorage["bhalyam.favourites"]` (a flat
  `BhalyamGameSlug[]`), same shape as `RecentlyPlayedManager`.
- **Bridge into React**: `client/src/hooks/useFavourites.ts` via
  `useSyncExternalStore`, exposing `favourites`, `isFavourite`,
  `toggleFavourite`, `addFavourite`, `removeFavourite`.
- **Add / remove / view**:
  - Toggle: `client/src/components/games/GameCard.tsx:147-162` — a heart
    icon button on every game card (`toggleFavourite(game.slug)`),
    `aria-label` swaps between "Add … to favourites" / "Remove … from
    favourites," `e.stopPropagation()` so it doesn't also trigger the
    card's own launch action.
  - View: `client/src/components/bhalyam/FavouritesSection.tsx`, mounted on
    Home (`BhalyamHome.tsx:163`), plus a dedicated "Favourites" entry in
    `client/src/components/bhalyam/CategoryFilter.tsx` for filtering the
    full catalog down to just favourited games (`getFavouriteCount` via
    `FavouritesManager.getFavourites().length`).
- **Ordering**: insertion order (`push` on add) — stable, not re-sorted by
  recency or alphabetically, so a player's favourites stay where they put
  them.
- **Guest and authenticated users**: identical code path, same as Recently
  Played — works for both today because it's device-local, not
  account-gated.

## Bug found and fixed this session

Same defect as `RecentlyPlayedManager`, same root cause:
`getFavourites()` returned `this.load().slice()` — a fresh array every
call, breaking `useSyncExternalStore`'s reference-stability contract and
producing the infinite-render crash reported by the user. Fixed
identically (return the stable cached reference; a new one is only minted
on an actual `toggleFavourite`/`addFavourite`/`removeFavourite`). Verified
against `client/src/services/__tests__/favourites.test.ts` (5/5 passing).

## Favourites Data Model

**Authenticated users — should favourites be stored in DB?** Yes, for the
same reason as Recently Played: a member's favourites should follow them to
a new device, and today they don't.

**Guest users — should favourites be stored locally?** Yes — a guest has no
durable server-side identity to attach it to (see Recently Played's data
model review; the same reasoning applies verbatim here).

## Recommendation

**Identical shape to Recently Played, for consistency and because the two
features share almost the same code today**: add a `favourite_games jsonb`
column to `public.profiles` (an ordered array of `BhalyamGameSlug`),
written through on every `toggleFavourite`/`addFavourite`/`removeFavourite`
call for signed-in members, merged with the local list on sign-in
(union, de-duplicated, insertion order preserved from whichever list saw
the game favourited first), same migration style as `bio`/`region` and the
same `dataInventory.ts` entry pattern as Recently Played.

A dedicated table is not warranted for the same reason it isn't for
Recently Played: this list is only ever read/written whole by its owner,
never queried across players. **Not implemented in this pass** — recommendation only, per "do not implement schema changes blindly."

## Favourites UX — requirements check

| Requirement | Status |
|---|---|
| Reuse existing icons | `lucide-react`'s `Heart` — already used elsewhere in the app's icon set, not a new import |
| Reuse existing card components | `GameCard.tsx` — the toggle is a small addition to the existing card header, not a new card type |
| No redesign | Confirmed — no layout structure changed, only the icon button already present |
| Keyboard support | Native `<button type="button">` — reachable via `Tab`, activates on `Enter`/`Space` by default, no custom key handling needed or added |
| Mobile support | Present on every `GameCard` instance, which is the primary catalog browsing surface on mobile |
| Accessible interaction states | `aria-label` correctly swaps with state; visual state (filled heart, rose background) is paired with the label change, not color-only |

**One real gap found, not fixed**: the toggle button's tappable area is
`p-1.5` around a `w-3.5 h-3.5` (14px) icon — roughly 26×26px, under the
44×44px minimum touch target mandated by `docs/ai/accessibility-standards.md`
and `docs/ai/ui-ux-standards.md` §4. Not corrected in this pass: the button
sits in a deliberately compact card header row (mode badge + category tag +
heart, in the space of one text line), and inflating it to a full 44px box
would visibly change that row's proportions — exactly the "redesign" this
task's brief says not to do. Fixing this properly needs an invisible
expanded hit-area (e.g. a padded `::before`/absolute overlay) that keeps the
visual icon size unchanged while satisfying the touch-target rule, which is
a small, targeted, but distinct change from anything else in this task.
Flagged as a remaining risk rather than fixed silently under a "no redesign"
instruction that could reasonably be read either way.

## Verification

- `[x]` `cd client && npx vitest run src/services/__tests__/favourites.test.ts` → 5/5 passing (add, remove, persistence, ordering)
- `[x]` `cd client && npm run typecheck` → clean
- `[x]` `cd client && npm test` → 538/538 passing
- `[x]` Confirmed wiring: `GameCard.tsx` toggle, `FavouritesSection.tsx` on Home, `CategoryFilter.tsx` favourites filter
- `[ ]` Cross-device / DB persistence — not implemented, see Recommendation above
- `[ ]` 44×44px touch target on the card toggle — not met, see gap above; not fixed to avoid an unrequested layout change
- `[ ]` Not freshly browser-verified for dark/light mode or 375/768/1024/1440px in this pass
