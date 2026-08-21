# Recently Played — Design & Verification

## Status

Already implemented (client-only) — built ahead of this audit. This
document records the architecture as it stands, evaluates it against the
brief's durability requirement, and gives a concrete, non-blind
recommendation for the DB-backed extension the brief asks about.

## Current Architecture

- **Storage**: `client/src/services/RecentlyPlayedManager.ts` — a plain
  singleton class wrapping `localStorage["bhalyam.recently_played"]`, with
  an in-memory cache and a `Set<() => void>` of subscribers.
- **Bridge into React**: `client/src/hooks/useRecentlyPlayed.ts` via
  `useSyncExternalStore` (fixed this session — see below).
- **Recording trigger**: `RecentlyPlayedManager.recordRecentlyPlayed(slug)`
  is called from all four game-launch paths in
  `client/src/components/bhalyam/GameRoomSheet.tsx` (create room, join
  room, pass & play, solo vs. bot) — i.e. exactly "when a user launches a
  game," matching the requirement.
- **Ordering / dedup / cap**: `recordRecentlyPlayed` finds an existing entry
  for the slug, removes it, then unshifts a fresh `{slug, lastPlayedAt: now,
  playCount: existing+1}` to the front — newest-first, no duplicates, and
  `MAX_RECENT_ITEMS = 10` truncates the list on every write. All three
  requirements ("newest first," "prevent duplicates," "limit 10") hold.
- **UX**: `RecentlyPlayedSection.tsx`, mounted on the Home page
  (`BhalyamHome.tsx:162`), horizontally scrollable cards showing game icon,
  title, relative last-played time (`formatRelativeTime`), and a Play
  button that reuses `BHALYAM_GAMES` catalog data and the existing game-tile
  visual language — no new design-system components introduced.

## Bug found and fixed this session

`getRecentlyPlayed()` returned `this.load().slice()` — a **new array
reference on every call**. Since this is the `getSnapshot` function passed
to `useSyncExternalStore`, a new reference every render made React believe
the store had changed on every render, producing an infinite render loop
("Maximum update depth exceeded") that crashed the Home page. Fixed by
returning the stable cached reference (`this.load()` directly); a new
reference is now only created on an actual write. Verified against
`client/src/services/__tests__/recentlyPlayed.test.ts` (4/4 passing) and a
clean client build/typecheck. See git history for the isolated fix commit.

## Data Model Review

**Guest users**: Entirely client-local (localStorage), no account
required. Works today, survives a refresh, does not survive a cleared
browser or a new device — expected and acceptable for a guest, since a
guest has no durable identity to key server-side storage on in the first
place (per `AGENTS.md` §18, a guest's `playerId` is a client-generated,
`localStorage`-persisted value, not an account).

**Authenticated users**: Currently **identical** to the guest path — the
manager has no awareness of `useAuthStore`'s session state. This means an
authenticated (member) player's recently-played list does **not** follow
them across devices, which is the one place the current implementation
falls short of "Prefer durability."

## Recommendation

**Extend, don't replace — DB-backed for authenticated users, keep the
local path for guests, following the exact pattern already shipped for
`bio`/`region`** (`client/src/lib/supabase/profile.ts`,
`client/src/store/authStore.ts`'s `startProfileSync`, and
`supabase/migrations/20260820000000_add_bio_region_to_profiles.sql`):

1. **Storage location — JSON column on `public.profiles`, not a dedicated
   table.** Concretely: `recently_played jsonb` holding the same
   `RecentlyPlayedItem[]` shape already used client-side (capped at 10
   entries before write). Justification, weighed against the two other
   options the brief lists:
   - *Dedicated table* (`recently_played(player_id, game_slug,
     last_played_at, play_count)`) is the "correct" normalized shape for
     something you'd ever query, join, or aggregate across players — but
     nothing in this product currently does that for this data (unlike
     `match_summaries`/`xp_ledger`, which the platform's real analytics and
     leaderboard code queries directly — see the progression schema added
     under `persistence/`). Standing up a table, RLS policies, and a
     repository-layer read/write path for a 10-item personal list is
     infrastructure disproportionate to what it's for today.
   - *JSON preferences column* matches the size and access pattern exactly:
     always read/written whole, by exactly one owner (`player_id`), never
     queried by a WHERE clause on its contents. This is the same shape
     `bio`/`region` already took on `profiles`, so this is consistency with
     an established, working precedent — not a new pattern to learn or
     review.
   - *Live in the existing profile entity* (option 1) — yes, specifically:
     add the column to `profiles`, not a new entity, for the same reason.
2. **Sync strategy**: mirror `startProfileSync`'s existing
   local/remote-merge logic — on sign-in, merge the guest's local list with
   whatever's in `profiles.recently_played` (union by slug, keep the more
   recent `lastPlayedAt`, re-cap to 10, newest-first), write the merged
   result back, and keep writing through on every `recordRecentlyPlayed`
   call thereafter (debounced, matching the existing `rummy:arrangement`
   debounce convention elsewhere in this codebase).
3. **Migration**: one more `ALTER TABLE profiles ADD COLUMN recently_played
   jsonb` in the same safe `DO $$ ... $$`-guarded style as the bio/region
   migration; `dataInventory.ts` needs a new entry (`bhalyam.recently_played`
   is *not* personal/sensitive data — it's gameplay history, no new DPDP
   classification concern beyond what match history already carries).

**Not implemented in this pass.** Per the brief's own instruction ("do not
implement schema changes blindly") and this session's standing practice of
not pushing new Supabase migrations without the user's sign-off, this is a
recommendation with a concrete plan, not a committed change. The current
client-only implementation is fully functional for guests and functionally
adequate — just not durable across devices — for members.

## Verification

- `[x]` `cd client && npx vitest run src/services/__tests__/recentlyPlayed.test.ts` → 4/4 passing (new game tracked, ordering, dedup, 10-item cap)
- `[x]` `cd client && npm run typecheck` → clean
- `[x]` `cd client && npm test` → 538/538 passing, including the fixed hook
- `[x]` Confirmed wiring: `BhalyamHome.tsx` mounts the section; `GameRoomSheet.tsx`'s four launch paths call `recordRecentlyPlayed`
- `[ ]` Cross-device / DB persistence — not implemented, see Recommendation above
- `[ ]` Not browser-verified in this pass beyond confirming the crash is fixed (reported by the user, root-caused, fixed, unit-tested) — dark/light mode and 375/768/1024/1440px have not been freshly eyeballed for this specific section
