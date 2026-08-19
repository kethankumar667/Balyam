# DESIGN-DEBT-REGISTER.md

> **Phase 9 of the BHALYAM Design Execution Audit.** Every finding, categorised, with screen, component,
> severity, impact, root cause and fix.
>
> **Severity**
> **CRITICAL** — causes user confusion, damages trust, or hurts conversion.
> **HIGH** — major inconsistency, weak hierarchy, poor UX decision.
> **MEDIUM** — polishing opportunity.
> **LOW** — cosmetic.
>
> **Status** `OPEN` · `FIXED` (landed in Phase 10, verified) · `PARTIAL`.
>
> Reproduce any number with `npm run design:audit`, `npm run design:contrast`, `npm run design:touch`.

---

## Summary

| Severity | Open | Fixed | Total |
|---|---:|---:|---:|
| CRITICAL | 6 | 3 | **9** |
| HIGH | 14 | 3 | **17** |
| MEDIUM | 12 | 3 | **15** |
| LOW | 6 | 1 | **7** |
| **Total** | **38** | **10** | **48** |

---

# CRITICAL

### TR-01 — The notification bell shows fabricated activity to first-time visitors
| | |
|---|---|
| **Screen** | Every screen (global header) |
| **Component** | `pages/BhalyamHome.tsx:585` `INITIAL_NOTIFICATIONS` → `components/layout/AppLayout.tsx:69` |
| **Status** | **OPEN** |

A brand-new visitor with no account, no history and no friends sees a red **`3`** badge on the notification
bell. The three notifications are hard-coded:

* *"Ravi invited you to UNO Adda! · Room: 6-letter Code #UN984X · 3 friends waiting"* — carrying a
  `roomCode` that will not exist on a fresh server
* *"Day 3 Login Bonus Claimed! +100 XP added to your Veteran progression"* — on visit one
* *"Suresh scored 184 runs in Hand Cricket!"*

**Impact.** This is the single most damaging finding in the audit. A fake invite from a person who does not
exist, pointing at a room that does not exist, is the kind of thing a user discovers exactly once and never
forgets. It directly contradicts **Product Tenet 5 — "zero dark patterns, zero spam"** and, together with
"Last played 2 hours ago" (DEBT TR-02) and the empty tournament brackets (TR-03), teaches a new user that
BHALYAM's numbers are decoration.

`components/layout/AppHeader.tsx:47–51` even carries the comment *"Unread notifications, from the state
AppLayout already owns… same invented number. Absent or zero renders no badge at all."* Someone knew.

**Root cause.** Demo fixtures shipped as production state; no empty state was designed for "no notifications
yet".

**Fix.** Delete `INITIAL_NOTIFICATIONS`. Start at `[]`. Design the empty state — a bell with no badge and a
drawer reading "Nothing yet. Invites and results land here." When real invites exist, they populate it.

---

### TR-02 — Fabricated personal history on the lounge
| | |
|---|---|
| **Screen** | `/` |
| **Component** | `BhalyamHome` — "Last played 2 hours ago", "🔥 3x Streak", "🎯 Next Achievement", "LIVE FEED" |
| **Status** | **OPEN** |

Personal-history strings render for a visitor with none. Same class of problem as TR-01 and reinforces it on
the same screen.

**Fix.** Gate every one behind real state. A returning player with a streak is a delight; a first-timer with
a fake one is a lie.

---

### TR-03 — The tournament arena is empty and says "REGISTRATION OPEN"
| | |
|---|---|
| **Screen** | `/tournaments` |
| **Component** | `server/src/tournaments/TournamentService.ts:304–318` seeded fixtures |
| **Status** | **OPEN** |

Three tournaments, each showing **`0 / 8 Players`** or **`0 / 16 Players`**, `Trophy Room (0)`,
`REGISTRATION OPEN`, and a "500 XP + Trophy" prize pool. A visitor reads an arena nobody has ever entered.

**Impact.** Worse than showing nothing. An empty room labelled "live" reads as abandoned; a prize pool with
no entrants reads as fake.

**Fix.** Either hide the section until a tournament has entrants, or reframe honestly — "Opening soon ·
be the first to register" is truthful *and* more inviting than `0 / 8`.

---

### A11Y-01 — No dialog in the product traps focus
| | |
|---|---|
| **Screen** | All (65 files, 85 overlays) |
| **Component** | Every hand-rolled `fixed inset-0` overlay |
| **Status** | **OPEN** |

Measured: **85 overlays, 38 `role="dialog"`, 37 `aria-modal`, 0 focus traps.**

`docs/ai/accessibility-standards.md` §1.3 requires focus trapping, `Escape` dismissal, and focus restored
to the trigger. Zero implementations exist. A keyboard user who opens the consent sheet, the welcome
carousel, the game tutorial or the leave-room confirmation Tabs straight out into the page behind it. Roughly
27 overlays have no dialog semantics at all.

**Root cause.** No shared `<Modal>`. 65 files each solved the visual problem and none solved the behaviour.

**Fix.** One `<Modal>` — focus trap, `Escape`, `role="dialog"`, `aria-modal`, restore focus, scroll lock,
one backdrop treatment. Migrate all 85.

---

### GX-01 — The turn clock runs while the mandatory first-play tutorial is open
| | |
|---|---|
| **Screen** | `/room/:code` in play |
| **Component** | `components/GameTutorial.tsx` + `RoomManager` turn timer |
| **Status** | **OPEN** |

Captured in Ludo: tutorial auto-opens on first play; header shows **`10s left`**; four seconds later, modal
still up, board unreachable, **`3s left`**.

**Impact.** A first-time player is timed out of their first turn while reading how to play. For a *gaming*
product this is the worst UX defect in the audit — it converts the onboarding moment into a loss.

**Fix.** Pause the turn timer while a blocking overlay owns the screen, or defer the tutorial until after
the player's first turn resolves.

---

### VIS-01 — The design system is dark-only; the product defaults to light
| | |
|---|---|
| **Screen** | `/social`, `/tournaments`, `/leaderboard`, `/profile`, `/design-system`, `WelcomeModal`, `GettingStartedCard` |
| **Component** | `design-system/dls/Surfaces.ts`, `Typography.ts`, `premium/glassmorphism.ts` |
| **Status** | **OPEN** (architectural — token repairs landed, the split did not) |

Every DLS surface is written `bg-stone-900/80 dark:bg-zinc-900/80` — the *light* value is also near-black.
`TYPOGRAPHY` pins `text-stone-100 dark:text-zinc-100` — near-white ink in both themes. There is no light
variant anywhere in `client/src/design-system/`.

`lib/useTheme.ts` sets `DEFAULT_THEME = "light"` deliberately, with the reason in a comment: *"BHALYAM's
identity is warm cream paper and gold."*

**Impact.** Six production screens render near-black cards with near-white monospace text floating on cream
parchment, for every first-time visitor. Translucent stone over cream composites to a muddy olive that
belongs to no palette in the project. `axe-core` found contrast violations on **9 light-theme routes vs 1
dark** — a 9:1 asymmetry that is itself proof the default theme is the untested one.

**Fix.** Rewrite 9 `SURFACES` + 12 `TYPOGRAPHY` tokens to consume `surface.*` / `ink.*`. **21 string edits
repair 6 screens** — the highest-leverage change in this entire audit.

---

### FTUE-01 — Three blocking modals before the first game — FIXED? no: OPEN
| | |
|---|---|
| **Screen** | `/` → `/room/:code` |
| **Component** | `ConsentModal` → `WelcomeModal` → `GameTutorial` |
| **Status** | **OPEN** |

A first-time visitor meets, in order: a DPDP consent sheet covering ~75 % of the viewport, then a 3-step
welcome carousel, then (on first play) a rules modal. Four taps minimum before a game is visible; three
different design languages.

**Impact.** **Product Tenet 2 — "enter their first game within 10 seconds" — is unreachable.** The consent
sheet is legally required and correctly built; the welcome carousel is not required by anything.

**Fix.** Delete the welcome carousel or demote it to a dismissible inline card. Let the consent sheet be the
only gate. Defer the tutorial to a "?" affordance and a first-turn coach mark.

---

### A11Y-02 — Two primary CTAs failed contrast at 1.98:1 and 2.54:1
| | |
|---|---|
| **Screen** | `/` |
| **Component** | `BhalyamHome` WhatsApp referral; `WhatAreWePlayingSection` Create Room |
| **Status** | ✅ **FIXED** |

White on `#25D366` measured **1.98:1**; white on `#10B981` measured **2.54:1**. Both are body-sized labels
requiring 4.5:1. These were the two most prominent calls to action on the landing page.

**Fix applied.** Create Room fill darkened `#10B981` → `#047857` (**5.55:1**, same green four steps down).
WhatsApp keeps its brand fill — it is recognised by colour before it is read — and the label darkened to
`#0B2E20` (**7.4:1** rest, **5.9:1** hover). Re-measured in browser.

---

### DS-01 — 196 utility declarations emitted no CSS
| | |
|---|---|
| **Screen** | Product-wide, including inside the design system |
| **Component** | `tailwind.config.js` (missing tokens) |
| **Status** | ✅ **FIXED** — `npm run design:dead-classes` now returns **0** |

Verified against the compiled stylesheet. The worst:

| Class | Uses | What broke |
|---|---:|---|
| `shadow-xs` | 93 | No shadow. The lightest lift in the system, absent product-wide. |
| `shadow-2xs` | 41 | Same. 13 files incl. `AuthShell`, `AppSidebar`, `Chat`, `ParticipantRow`. |
| `backdrop-blur-xs` | 32 | No glass on auth shell, trust sheet, waiting banner. |
| `h-4.5` `w-4.5` | 40 | Icons fell back to intrinsic size. |
| `active:scale-98` | 18 | **No press feedback — includes `PLAY NOW` on every game card.** |
| `py-0.2` | 14 | Typo for `py-0.5`. |
| `border-stone-750/850`, `border-zinc-750/850` | 18 | **Preflight `#e5e7eb` hairline around near-black modals.** |
| `w-13` | 7 | Brick Tetris keypad keys fell back to content width. |
| `bg-stone-750` | 6 | **`SkeletonLoader`'s six shimmer bars painted nothing.** |
| `duration-250` | 2 | DLS card hover had no transition. |
| `z-55` `z-58` `z-60` `z-70` | 5 | No stacking context. |
| `scale-97` `scale-102` `scale-115` `gap-4.5` `px-4.5` `left-5.5` `w-26` `bg-stone-850` `from-stone-850` | 15 | Assorted. |

**Root cause.** Tailwind v4 class names (`shadow-xs`, `shadow-2xs`, `backdrop-blur-xs`) adopted on v3;
half-step spacing and scale values that Tailwind never shipped; and DLS colour shades (750/850) that no
config declared. None of it is visible in review — the diff reads correctly.

**Fix applied.** All added to `client/tailwind.config.js` with the reasoning in-file; `py-0.2` corrected in
source. `npm run design:dead-classes` gates this going forward.

---

# HIGH

### DS-02 — Design tokens are used by 5.6 % of colour declarations
`OPEN` · **All screens** · `index.css` + `tailwind.config.js`

423 token classes vs 4,187 raw palette classes vs 2,913 arbitrary hex. Plus **1,560 distinct hex literals**
across 6,610 occurrences and 1,616 inline `style={{}}` objects.

**Root cause (this is the important part).** Not laziness. The declared tokens are **cool slate**
(`--surface-0: #f8fafc`, `--text-hi: #0f172a`) and the product is **warm cream**. A developer who wrote
`bg-surface-1` on the lounge would have shipped a cool grey card onto parchment and it would have looked
broken. **The tokens were skipped because using them produces the wrong result.**

**Fix.** Make the tokens warm first (`VISUAL-IDENTITY-RECOMMENDATION.md`), then adopt. Any remediation that
only says "use the tokens" fails for the same reason it has already failed 2,913 times.

---

### DS-03 — The semantic colour layer has zero consumers
`OPEN` · All screens · `tailwind.config.js`

`success` / `warning` / `danger` / `info` are declared and used **0, 0, 0, 0** times. The meanings they
exist to carry are expressed **1,960 times** in hand-picked palette classes (`amber-*` 1,186,
`green|emerald-*` 385, `red|rose-*` 298, `blue|sky|cyan-*` 91).

Two collisions explain why:

* `--color-warning: #f59e0b` is **byte-identical** to `--color-gold-500: #f59e0b` and Tailwind `amber-500`
  (1,320 uses). A warning is pixel-identical to ordinary brand chrome.
* `--color-brand-500: #10b981` (emerald) and `--color-success: #22c55e` (green-500) are the same colour to a
  user. Brand reads as success; success reads as decoration.

**A semantic layer that cannot signal anything is a comment.**

**Fix.** Give each role a value distinct from the brand (`VISUAL-IDENTITY-RECOMMENDATION.md` §3.5), then
migrate.

---

### DS-04 — No production screen uses the design system's buttons
`OPEN` · All · `design-system/dls/Buttons.tsx`

`PrimaryButton` is referenced by exactly two files: its own definition and `DesignSystemCatalogPage.tsx`.
Shipped instead: **683 `<button>` elements** and 40+ bespoke button components, yielding **22 distinct
chrome signatures** on (radius × weight) alone. Three separate components are named `ActionButton`.

**Fix.** One `<Button>` with variants, sizes and enforced ≥44 px. Game-piece buttons stay bespoke.

---

### A11Y-03 — 53 % of mobile controls miss the product's own 44 px rule
`OPEN` · Measured across 17 routes at 390 px

| | |
|---|---:|
| Controls measured | 293 |
| Under 44 × 44 (product rule §4.1) | **156 (53 %)** |
| Under 24 × 24 (**WCAG 2.2 AA failure**) | **40 (14 %)** |

Worst: `/signup` **18 of 18** under 44 px including two **14 × 14** password toggles; `/tetris` 11 of 12
including a 16 px "LOBBY"; `/` 33 controls under 24 px, mostly 20 px-tall mood-card game links;
`/privacy` 19–21 px section nav.

**`/games` and `/leaderboard` score 0 of 32 and 0 of 25.** The rule is achievable; it is simply not enforced.

**Fix.** Enforce in a shared `<Button>`/`<Link>`; gate with `npm run design:touch`.

---

### VIS-02 — Two logos and three taglines
`OPEN` · `/login` `/signup` vs app header vs DLS

| Where | Mark | Tagline |
|---|---|---|
| App header | treasure-chest app icon | **RELIVE CHILDHOOD** |
| Auth screens | hand-drawn "three kids" | **Play Together. Remember Forever.** |
| `VisualIdentity.ts` | — | **The Modern Multiplayer Game Lounge & Esports Arena** |

The sign-in screen — where a user decides whether the product is real — shows a different brand mark from
the app.

**Fix.** One mark, one tagline. Keep the illustrated mark as a secondary/seasonal lockup if it earns its place.

---

### UX-01 — "Continue with Apple" is a decoy
`OPEN` · `/login` `/signup` · `pages/auth/LoginPage.tsx:97`

Tapping it sets `appleUnavailable` and shows: *"Apple sign-in isn't available — it needs a paid Apple
developer account, which this app doesn't have."* The button sits at equal visual weight to Google, at the
highest-friction point in the funnel.

**Fix.** Remove it, or mark it unavailable before the tap. The message is honest; the button is not.

---

### UX-02 — `/settings` silently redirects guests to `/`
`OPEN` · `pages/SettingsPage.tsx:50–52`

`if (ready && !isMember) navigate("/", { replace: true })` — no toast, no sign-in prompt, no explanation.
Tapping Settings and landing on the home page is indistinguishable from a bug. Guests *do* have settings
(audio, haptics, theme, language) elsewhere, which makes the dead-end harder to justify.

**Fix.** Show the guest-available settings and gate only the account section, or route to sign-in with a
reason.

---

### UX-03 — Two competing sidebar models at the same position
`OPEN` · `/tournaments` vs `/social` `/leaderboard` `/design-system`

`/social` shows global nav (Home · Games · Tournaments · Social Hub · Leaderboards · Rooms · Help Center).
`/tournaments` replaces it with a page-local menu (Back to Home · Live Tournaments · Upcoming Brackets · My
Matches · Tournament Rules). **Entering Tournaments deletes the user's global navigation.**

Compounding: top-right emoji text links duplicate sidebar entries visible at the same moment.

**Fix.** One global sidebar. Page sections become in-page nav.

---

### TYPE-01 — Two body typefaces render on the same pages
`OPEN` · 13 of 20 routes

`tailwind.config.js` declares `font-body: Poppins`; `index.css:282` sets `body { font-family: 'Nunito' }`.
Both render. Measured: Nunito on 20/20 routes, Poppins on 13/20.

11 families are loaded across **two render-blocking stylesheets**, four of them requested twice. Playfair
Display renders nowhere.

**Fix.** Delete the `body` Nunito rule; drop Playfair Display and Fredoka; consolidate to one request.

---

### TYPE-02 — Monospace is the body face of the meta-game layer
`OPEN` · `/social` `/tournaments` `/leaderboard`, `WelcomeModal`, `GettingStartedCard`

`TYPOGRAPHY.bodySubtle` and `.caption` pin `font-mono`, and `features/*` follows. Marketing prose,
onboarding copy and empty-state guidance are all set in JetBrains Mono. `AGENTS.md` reserves mono for "room
codes / chat timestamps".

**Impact.** Reads as *terminal*. Directly against "joyful nostalgic lounge".

**Fix.** Mono for values a player reads character-by-character; Poppins for sentences.

---

### TYPE-03 — 88.9 % of weight declarations are 700 or heavier
`OPEN` · Product-wide

bold 1,044 · black 734 · extrabold 350 · semibold 171 · medium 80 · **normal 16 (0.7 %)**.

Emphasis is a contrast mechanism; with nine of ten strings bold, a bold label carries no signal. This is the
mechanical reason BHALYAM's screens read loud and flat at once, and it is upstream of most small-text
contrast failures — heavy weight at 10–12 px is what makes low contrast unreadable rather than merely
sub-standard.

**Fix.** Body copy 400. Target ≤35 % at 700+.

---

### TYPE-04 — 48.8 % of font sizes are off-scale
`OPEN` · Product-wide

1,549 arbitrary vs 1,625 on-scale. 43 distinct arbitrary sizes including `text-[9.5px]`, `text-[10.5px]`,
`text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]`. **960 declarations are below 12 px.**

**Fix.** An 8-step scale; nothing below 12 px.

---

### ICON-01 — Four icon systems, one of which is 219 emoji
`OPEN` · Product-wide, worst in the room shell

| System | Consumers |
|---|---:|
| `design-system/icons/` | 18 |
| `components/bhalyam/icons.tsx` | 3 |
| `lucide-react` | 30 |
| **Emoji — 219 distinct glyphs** | **406 in chrome**, 817 in games |

`AGENTS.md` §8: *"No emoji as decorative icons in product chrome."* The room shell is entirely emoji-labelled
(✏️ 🚪 📷 📸 🎫 📋 🔗 👥 ➕ ⚙️ 👑 🎨 ⚡ ▶ ✈), while the lounge one tap away uses stroke SVGs.

Two consequences: **📷 and 📸 sit adjacent, unlabelled and visually identical** (QR vs Snapshot) — a
functional failure caused purely by icon choice; and emoji render from the platform font, so BHALYAM's
iconography is a **different set of pictures on Windows, Android and iOS**.

**Fix.** Chrome icons from `bhalyam/icons.tsx`. Emoji stay where they are content — reactions, RPS choices,
share buttons.

---

### MOT-01 — 28 of 53 animated components ignore reduced motion
`OPEN` · Product-wide

`index.css:360` has a correct global rule (`animation-duration: 0.01ms !important`) — but it governs **CSS**
animation and transition. `framer-motion` animates by writing inline transforms on rAF and is unaffected.
53 files import it; 25 guard; **28 do not**.

**Fix.** A shared `useMotionSafe()` wrapper feeding `framer-motion`'s `MotionConfig reducedMotion="user"`.

---

### ELEV-01 — 132 bespoke shadows against a 3-step ladder used 7 times
`OPEN` · Product-wide

168 one-off `shadow-[…]` occurrences, **132 distinct**. `shadow-lift-1/2/3` used **7** times.
`shadow-rim-gold` used **0**.

Sample of "the same elevation": `0 4px 14px rgba(74,44,22,.10)`, `0 6px 20px rgba(74,44,22,.10)`,
`0 8px 24px rgba(74,44,22,.12)`, `0 2px 10px rgba(0,0,0,.06)` — four light sources, one intent.

Backdrops likewise: **15 distinct `bg-black/N` opacities and 5 blur steps.** The consent sheet and the
welcome modal — shown one after another — dim the page by different amounts.

**Fix.** Four layers, four shadows, one rule per layer. Warm-tinted, not black.

---

### UX-04 — Three blocking-modal design languages
`OPEN` · Consent (cream sheet) → Welcome (near-black DLS) → Tutorial (navy slate)

A first-run user meets three in a row and no two look related. Compounded by the tutorial's title rendering
**dark warm-brown ink on a dark navy panel** — barely readable, and it is the heading of the first thing a
new player is shown.

**Fix.** One `<Modal>`; one surface language.

---

# MEDIUM

### MED-01 — Duplicate "MULTIPLAYER" badge on 14 of 20 game cards
✅ **FIXED** · `/` `/games` · `components/games/GameCard.tsx`

The mode badge printed "Multiplayer" and the category chip printed `tags[0]`, which is `"multiplayer"` on 14
of 20 catalogue entries. **Fix applied:** the chip now takes the first tag the badge does not already
convey — Classroom, Board, Party, Retro.

### MED-02 — Search placeholder truncated mid-word
✅ **FIXED** · `/games` · `SearchField` + `GamesPage`

"Search games by title, rules, or nostalgia quote…" is 49 characters and clipped to "…or nost" at 390 px.
**Fix applied:** short visible placeholder, full description moved to a separate `accessibleLabel` so screen
readers keep it.

### MED-03 — The colour picker labelled a magenta swatch "Cyan"
✅ **FIXED** · Room lobby · `LudoColorPicker` + `board-layout.ts`

`LudoColor`'s wire ids (`"cyan"`, `"brown"`) never moved when the palette became Magenta and Bronze, and the
picker built labels with `capitalize(id)`. A player picking by name got a different colour than the one they
read. **Fix applied:** `COLOR_LABEL` now lives beside `COLOR_HEX`, so changing one without the other is a
visible edit.

### MED-04 — Shape ladder was non-monotonic
✅ **FIXED** · Product-wide

The config overrode `xs sm md lg xl 2xl` but not `3xl`, so the scale compiled `4 → 6 → 10 → 14 → 20 → 28 →
**24**`. Every modal and elevated card rendered **tighter** than an ordinary card inside it — 109 call sites.
**Fix applied:** `3xl = 32px`.

### MED-05 — `rounded-pill` duplicates `rounded-full` exactly
`OPEN` · 706 combined uses, both `9999px`. Nothing tells an author which to reach for.

### MED-06 — Radius carries no meaning
`OPEN` · Buttons appear at `lg`, `xl`, `2xl` and `full`; chips at `full`, `pill` and `xl`; cards at `xl`,
`2xl`, `3xl`, `[26px]`, `[32px]`, `[36px]`. **62 distinct card signatures**, 54 of them used fewer than 8
times. Cards are drawn one at a time, not composed.

### MED-07 — 19 of 20 routes share one generic `<title>`
`OPEN` · "BHALYAM · బాల్యం — Relive Childhood" everywhere except `/games`. The 404 page's tab claims nothing
is wrong.

### MED-08 — 82 gradients use inline hex stops
`OPEN` · 163 `bg-gradient-to-*`, half drawing from named ramps. Restrained overall — ranked MEDIUM, not HIGH.

### MED-09 — Game cards are ~610 px tall on mobile
`OPEN` · `/` `/games` · ~1.2 cards per screen; reaching the 12th game is a seven-screen scroll.

### MED-10 — Starter Missions truncates 10 of 10 strings at 390 px
`OPEN` · `/` · Mono type plus wide action buttons leave no room. Five titles and five descriptions all
ellipsed.

### MED-11 — `EmptyStateIllustration` renders without its action
`OPEN` · `/social` · The primitive's API takes `actionText` + `onAction`; neither is passed. The copy tells
the user what to do and gives them nowhere to do it.

### MED-12 — 15 remaining contrast failures share one root cause
`OPEN` · `/` `/about` `/privacy` `/404`, header

All in the 3.04–4.29:1 band; twelve trace to the warm orange/amber family (`#E85D04`, `#EA5A1F`, `#D97706`,
`#EA580C`) used as **small bold text on cream**. `#E85D04` sits at the luminance midpoint, so it fails as a
fill behind white (3.50:1) *and* as ink on cream (3.24:1).

**Fix.** One token — a darker sibling reserved for text — closes twelve of them. See
`VISUAL-IDENTITY-RECOMMENDATION.md` §2.

### MED-13 — No shared Tooltip; 178 native `title=` attributes
`OPEN` · Native `title` does not appear on touch, has no styling and no keyboard access. On a **mobile-first**
product, 178 hover-only affordances are information no phone user will ever see. `AGENTS.md` §6.1: *"No
hover-only interactions."*

### MED-14 — Five parallel Toast implementations
`OPEN` · `Room.tsx:81`, `ludo/Toast.tsx`, `RummyBoardMobile:1721`, `uno-action-toast`, `ChatMessageToast`.
Different positions, durations and dismissal. The one that surfaces **server errors** is defined inline in a
1,635-line page file.

### MED-15 — Tabs without tab semantics; inactive tabs read as disabled
`OPEN` · 11 tab-state components, **2** with `role="tab"`. On `/social` and `/tournaments` in light theme,
inactive tabs are grey-on-grey and appear switched off while fully interactive.

---

# LOW

### LOW-01 — Filter rail clips its 4th pill with no swipe affordance
`OPEN` · `/games` `/` · `ui-ux-standards.md` §4.4 requires a visual swipe indicator.

### LOW-02 — 📷 / 📸 adjacent and indistinguishable
`OPEN` · Room header — QR vs Snapshot. (Sub-case of ICON-01, listed separately because it is a *functional*
failure a user hits immediately.)

### LOW-03 — Bots and humans look almost identical
`OPEN` · Room lobby · Same brown letter avatar, same size, same ring; only a small 🤖 pill differs.

### LOW-04 — "Leave" is the most prominent control in the room header
`OPEN` · Solid white pill top-right at the same weight as the game title; in-game, a red filled circle.
Destructive actions out-rank primary ones.

### LOW-05 — The same fact twice
`OPEN` · Room lobby shows "0/1 Ready" in the participants header and "0 of 1 ready" in the bottom bar.

### LOW-06 — "Name this table" reads as disabled
`OPEN` · Dotted-underlined grey text; nothing marks it editable.

### LOW-07 — 5 viewport-relative spacing values
✅ **noted, OPEN** · `gap-[2vh]`, `py-[1.4vh]`, `px-[3vw]`, `px-[2vw]`, `p-[18%]`. At 320 × 568 `gap-[2vh]`
is 11 px and at 1440 × 900 it is 18 px — the same layout is *tighter* on the device with less room.

---

## Deferred — not design debt, but design-adjacent

| # | Item | Why deferred |
|---|---|---|
| D-1 | i18n covers 33 keys across 6 languages | The machinery is excellent (typed `Partial<typeof en>`, `Intl.PluralRules`, 100 % locale coverage). The catalogue is the gap. A language switcher that changes 33 strings is a promise the UI does not keep, but the fix is content, not design. |
| D-2 | `/admin`, `/tv/:code`, `/profile`, `/settings` unreviewed | Behind auth. Admin surfaces and TV layouts are where design systems go to die; both need their own pass. |
| D-3 | 18 of 19 game boards not observed in play | Only Ludo was driven end-to-end. Conclusions about the others come from source reading and are labelled as such. |
| D-4 | Win / loss / tie / rematch states | Need a completed match to capture. **This is the emotional peak of a gaming product and it is entirely unaudited.** Highest-value gap in this document. |

---

*Next: `BHALYAM-DESIGN-REMEDIATION-REPORT.md` — what was changed, verified and what remains.*
