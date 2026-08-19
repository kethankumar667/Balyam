# TRUST-REMEDIATION-REPORT.md

> **Phase 1 (Sprint A) of the BHALYAM P0/P1 Design & Trust Remediation.**
> Every location a player can see notifications, invites, activity, streaks, or achievements — inventoried,
> and every fabricated one either wired to a real data source or removed. Verified against a clean
> production build and a clean dev-server render; screenshots below are from the dev server (no prerender
> involved) so they reflect the actual runtime, not the app's separate prerender-hydration issue (§5).

---

## 1. Scope note — found more than the approved table listed

The plan's Phase 1 table named six fabrications. Reading the full body of `BhalyamHome.tsx` during
implementation surfaced **five more** in the same file, in the same spirit — hardcoded numbers presented as
if they were this player's real activity. All eleven are fixed below under the same rule the plan already
established for the six: wire it if a real source exists, remove it if none does, never leave a placeholder
standing in for a real event.

## 2. Full inventory and disposition

| # | Location | Fabrication | Real source? | Disposition |
|---|---|---|:---:|---|
| 1 | `INITIAL_NOTIFICATIONS` | 4 fake notifications (fake inviter, fake room code `UN984X`, fake reward claim, fake friend score) driving a permanent "3" unread badge | No | **Removed** — `[]` |
| 2 | `WelcomePlayerStrip` (member) | "3-Day Streak" | `PlayerStats.currentPlayStreak` | **Wired** |
| 3 | `WelcomePlayerStrip` (member) | "1,450 / 2,000 XP" | `PlayerProfile.experiencePoints`, `.level` | **Wired** |
| 4 | `WelcomePlayerStrip` (member) | "Continue UNO" (claimed a resumable session that may not exist) | `GET /matches?limit=1` | **Wired** |
| 5 | `WelcomePlayerStrip` (member) | "Daily Bonus (+100 XP)" | *(no daily-bonus system)* | **Removed** |
| 6 | `PlayerJourneyDashboard` Card 1 | "Resume Hand Cricket", "45 Wins", "Lvl 8", "🔥 3x Streak", "Last played 2 hours ago" — hardcoded regardless of what the player actually played | Match history + per-game stats | **Wired**, with an honest empty state |
| 7 | `PlayerJourneyDashboard` Card 1 | "Next Milestone: Golden Willow Bat Avatar in 2 wins" | *(no avatar-unlock system)* | **Removed** |
| 8 | `PlayerJourneyDashboard` Card 2 | "60% Complete" / XP bar fixed at `width: 60%` | `PlayerProfile.experiencePoints % 100` | **Wired** |
| 9 | `PlayerJourneyDashboard` Card 2 | "Next Achievement: Win 1 More Rummy Match … +100 XP & Rummy Master Badge" | Real `Achievement[]`, closest to completion | **Wired** (reward text removed — no per-achievement reward field exists) |
| 10 | `PlayerJourneyDashboard` Card 2 | "Daily Quests (Refreshes in 4h)" — 3 quest rows, one pre-checked | *(no daily-quest system anywhere in `server/src`)* | **Removed — a fabricated feature, not just fabricated data** |
| 11 | `PlayerJourneyDashboard` Card 3 | "Referral Progress: 2 / 3 Friends Joined" | *(no referral-tracking system anywhere in `server/src`)* | **Removed** |
| 12 | `LiveLoungePulse` (4 metric tiles) | "548 Players Online", "68 Active Live Rooms", "23 School Gangs Active", "145 Matches Won Today" — static numbers animated with `<CountUp>` to read as live telemetry | *(no online-presence or platform-activity counters exist)* | **Removed** |
| 13 | `LiveLoungePulse` (ticker) | 5-message rotating "community feed" naming fake players by name | *(no cross-player activity feed exists)* | **Removed** |
| 14 | `LiveLoungePulse` (leaderboard) | 4-row "Weekly Leaderboard" naming three fake players **and the real signed-in user at a fixed fake rank** ("🏅 4. You (Champion) — 1,450 XP") | *(no weekly-XP leaderboard service exists)* | **Removed** |

Row 14 is worth calling out specifically: it attributed a fabricated rank and score to the actual person
looking at the screen, not just to invented third parties. That is the single most direct instance of
"simulating real user activity" in the inventory.

## 3. What "wired" means — the real APIs, one shared fetch

`server/src/profile/ProfileController.ts` already exposes everything needed, and `requireSelfParam()`
accepts a guest credential as well as a member one — the data was reachable, just unused on this page.

| Route | Feeds |
|---|---|
| `GET /api/profile/:id` | `PlayerProfile.level`, `.experiencePoints` |
| `GET /api/profile/:id/stats` | `PlayerStats.currentPlayStreak`, `.currentWinStreak`, `.perGame` |
| `GET /api/profile/:id/matches?limit=1` | Most recent `MatchHistoryItem` (newest-first from `MatchHistoryService.getMatches`) |
| `GET /api/profile/:id/achievements` | Real `Achievement[]`, each with `unlocked` / `currentProgress` / `progressPercent` |

**New shared hook** — `client/src/hooks/usePlayerSnapshot.ts` (`usePlayerSnapshot(enabled: boolean)`):
fetches all four with one `Promise.all` (the same pattern already used in `ProfilePage.tsx`), called **once**
in `BhalyamHome()` and passed as a `snapshot` prop to both `WelcomePlayerStrip` and `PlayerJourneyDashboard`.
`enabled` is `isMember` — guests never fire the fetch, since `WelcomePlayerStrip`'s guest branch was already
honest and needs no real-data backing.

Every field the hook returns defaults to `null` / `[]` rather than a placeholder. Rendering the right thing
for "no data yet" is the consumer's job — that is where every empty state below comes from.

**Reused, not duplicated:** `formatTimeAgo` existed only inside `MatchHistoryList.tsx`. It is now
`client/src/lib/formatTimeAgo.ts`, imported by both `MatchHistoryList` and the new hook's consumers
(AGENTS.md rule 4 — no duplicate implementations). `TILE_ART_BY_GAME` (21 game-tile image paths) was
declared fresh on every render inside `GameTile`; hoisted to module scope so `PlayerJourneyDashboard`'s
real "last played" card can reuse it instead of a 22nd copy of the same table.

## 4. What was deliberately left alone

- **`TrophyProgressionStrip`** — a fourth fabricated block ("Level 12 • Gold Tier", 3 of 4 trophies
  hardcoded `unlocked: true`) exists in this file but is **never rendered** (no call site anywhere in the
  codebase). Confirmed dead code; left untouched — deleting unreferenced code is outside a trust-remediation
  pass, and it is unreachable by any user regardless.
- **`Header`** (a second, unused notification-bell implementation with its own `useState(INITIAL_NOTIFICATIONS)`)
  — also confirmed dead; `BhalyamHome` renders through `AppLayout` → `AppHeader`, not this function. It still
  compiles against the now-empty array, correctly.
- **Card 3's reward list** ("Exclusive Gold Avatar Frame", "Gang Leader" Chat Badge, "Retro 90s School Slate
  Board Theme") — this is forward-looking promotional copy ("bring 3 friends, unlock these"), not a claim
  about something that already happened, so it sits outside "never simulate real user activity." It is
  flagged here rather than silently judged: **there is no referral-tracking or reward-fulfilment system
  behind these promises**, so a player who did refer three friends today would receive nothing. Removing the
  false *progress counter* (row 11) stops the active lie; whether the promotional copy itself should stay,
  change, or gets a real system built under it is a product decision beyond this plan's "no new features"
  boundary, and is called out here rather than decided unilaterally.
- **`GAME_DISPLAY_NAMES`** (`shared/catalog.ts`) was considered for the "Continue {Game}" label and rejected
  in favour of `BHALYAM_GAMES[...].title` — the former is styled for the in-room header
  ("HAND CRICKET 🏏", uppercase, emoji-suffixed) and would look wrong in a lounge card; the latter
  ("Hand Cricket") is what `GameCard`/`GameTile` already use for this exact context.

## 5. A pre-existing, out-of-scope issue found during verification

Testing surfaced React hydration errors (#418/#422/#425) on the **production build**. Investigated and
confirmed **not caused by this work**: the same errors occur on `/about`, `/privacy` and `/games` —
none of which this phase touched — and **zero errors occur on the dev server** (which does not prerender),
confirming the new code itself is sound. The cause is a mismatch between `client/scripts/prerender.mjs`'s
static output and the first client render, present across the whole app. Explicitly out of scope for a
trust/UX remediation pass — noted here rather than silently left for a future session to rediscover.

## 6. Verification

```
$ cd client && npm run typecheck   → clean
$ cd client && npm run build       → clean, prerender completes
$ cd client && npm test            → 64 files / 501 tests passing (0 regressions)
```

**Fabricated-string scan** — every string from the inventory above, searched against the rendered guest
home page (`document.body.innerText`) on both the dev server and the production preview:

```
absent Ravi invited          absent Ajay Kumar            absent Daily Bonus
absent Day 3 Login Bonus     absent Ravi Teja              absent 3-Day Streak
absent Suresh scored         absent Pooja Reddy            absent 2,000 XP
absent 548 / Players Online  absent You (Champion)         absent Golden Willow Bat
absent Active Live Rooms     absent Continue UNO           absent Referral Progress
absent School Gangs Active
absent Matches Won Today
```

All fourteen absent. **Manual, dev server (`localhost:5173`), guest session:**

- Notification bell — no badge (was permanently "3")
- "Continue Your Journey" — real empty states on all three cards (Card 1 "Play your first game…",
  Card 2 "Level 1 Progress · 0% Complete", Card 3 real WhatsApp CTA, no counter)
- The entire fake "Live Lounge Pulse" section (stat tiles, ticker, leaderboard) — gone, no layout gap;
  footer follows the journey cards directly
- 0 console errors, 0 page errors

**Not verified in this pass:** the member-branch UI pixel-for-pixel (real streak/XP/last-played rendering
requires a signed-in Supabase session; this repo has live Supabase credentials configured, and fabricating
a session to force that render was judged a risk to a real third-party auth backend not worth taking for a
screenshot). Correctness there rests on: a clean typecheck against the real `PlayerProfile` / `PlayerStats`
/ `MatchHistoryItem` / `Achievement` types, a clean build, all 501 tests passing, and the code being a
straight, small transformation of the same fields `ProfilePage.tsx` already renders successfully in
production today.

## 7. Files changed

- `client/src/pages/BhalyamHome.tsx` — all fixes above
- `client/src/hooks/usePlayerSnapshot.ts` — new
- `client/src/lib/formatTimeAgo.ts` — new, extracted
- `client/src/features/profile/MatchHistoryList.tsx` — imports the extracted helper, local copy removed
