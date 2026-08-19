# DESIGN-INVENTORY.md — Full Screen Inventory

> **Phase 1 of the BHALYAM Design Execution Audit.** Every reachable screen, rendered and measured.
>
> **Capture rig.** Playwright/Chromium, `reducedMotion: "reduce"`, viewports **390 × 844** (mobile),
> **768 × 1024** (tablet), **1440 × 900** (desktop), both themes. Consent and onboarding pre-granted in
> `localStorage` where the goal was to see the screen underneath; captured un-granted as well, because the
> gauntlet *is* the first-run experience (§2).
>
> **Screenshots** live in the session scratchpad and are referenced by filename. They are not committed —
> re-run `client/.audit-shots.mjs` (see `BHALYAM-DESIGN-REMEDIATION-REPORT.md` §7) to regenerate.
>
> **Consistency rating.** 1–5, where **5** = indistinguishable in language from the product's best screen,
> **3** = recognisably BHALYAM but with drift, **1** = looks like a different product.

---

## 1. Route map

`client/src/App.tsx` registers **43 routes** resolving to **30 distinct destinations** (13 are aliases —
`/snake`, `/nokiasnake`, `/snake2d` all render `NokiaSnakePage`).

| Group | Routes |
|---|---|
| Lounge | `/`, `/home`, `/games` |
| Meta-game | `/leaderboard`, `/tournaments`, `/social`, `/profile` 🔒 |
| Play | `/room/:code`, `/tv/:code`, `/preview/ludo` |
| Retro arcade | `/snake`, `/tetris`, `/breakout`, `/roadrash`, `/nokiacricket` (+8 aliases) |
| Account | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` |
| Support | `/about`, `/privacy`, `/settings` 🔒, `/diagnostics` |
| Internal | `/design-system`, `/admin` 🔒🔒 |
| Fallback | `*` → `NotFound` |

🔒 requires an account · 🔒🔒 requires an admin account

---

## 2. The first-run gauntlet — the most important finding in this document

A first-time visitor arriving at `/` does **not** see BHALYAM. They see two consecutive full-screen
blocking modals, in two different visual languages, before a single game is visible.

### 2.1 Blocker 1 — DPDP consent sheet (`components/privacy/ConsentModal.tsx`)

`mobile__light___.png` (pre-consent capture)

A cream bottom sheet covering roughly **75 % of the 390 px viewport**, over a heavily blurred backdrop.
Gold lock badge, "What BHALYAM keeps", three paragraphs of body copy, a "Read the full privacy notice"
link, then **"Allow all"** (gold gradient, primary) and **"Only what's essential"** (outline).

*Craft:* good. Rounded 3xl sheet, gold rim CTA, Fredoka display face, honest copy. The underlying
`consent.ts` is genuinely well built — declining actually purges optional keys, and the code says why.

*Design problems:*
- The **first impression of a gaming lounge is a legal dialog**. It is required by DPDP and correctly so —
  the issue is that nothing about the product is visible behind it. The backdrop blur is heavy enough that
  the game tiles read as coloured smudges, so the sheet has no context to sit in.
- Three paragraphs (≈110 words) before the choice. A first-time visitor is being asked to read a privacy
  notice before they know what the site is.
- The primary CTA is **"Allow all"**, not "Start playing". The moment is framed as a compliance
  transaction rather than an arrival.

**Consistency: 4/5** — on-brand, but the wrong first frame.

### 2.2 Blocker 2 — Welcome carousel (`features/onboarding/WelcomeModal.tsx`)

`shots2/mobile__light___.png`

Immediately after consent, a **second** full-screen modal: a 3-step carousel. And it is in a completely
different design language from the sheet that preceded it by one tap.

| | Consent sheet | Welcome modal |
|---|---|---|
| Surface | cream `#FFFDF8` | near-black (`SURFACES.cardElevated` → `stone-900/90`) |
| Ink | warm brown | `stone-100` / `stone-400` |
| Body face | Poppins | **JetBrains Mono** |
| Accent | `bhalyam.gold` | `amber-500` |
| Hero art | gold lock badge (SVG) | 🎮 **emoji** |

*Design problems:*
- **Two consecutive blocking modals in two different design systems.** This is the two-design-system split
  rendered as a literal before/after, one tap apart.
- The modal is **dark on a light-theme app**. It is the DLS's `cardElevated` token doing exactly what
  `DESIGN-BASELINE.md` B-04 describes.
- **All body copy is monospace.** "Play 10+ legendary multiplayer classics including Ludo, Rummy, UNO, Hand
  Cricket, Chess, Carrom, and Retro Nokia 2D games instantly in your browser." set in JetBrains Mono across
  four lines reads as a terminal banner, not a welcome.
- The CTA is `NEXT →` — mono, uppercase, tracked. The *action label* of the onboarding flow is styled like
  a build log.
- The hero is a 🎮 emoji in a rounded tile — `AGENTS.md` §8 forbids emoji in product chrome, and this is the
  single most prominent glyph a new user will ever see.
- Line 78 applies `SURFACES.cardElevated` and then **overrides it inline** with
  `rounded-3xl border border-stone-800 shadow-2xl` — someone saw the near-white preflight hairline the
  broken `border-stone-750` token produced and patched over it locally instead of fixing the token.
- Total cost to reach a game: **consent (1 tap) + 3 carousel steps = 4 taps minimum**, or 2 if the user
  finds "Skip Intro" (top-right, `text-xs`, low contrast).

**Consistency: 1/5.** **This screen alone puts Product Tenet 2 — "enter their first game within 10
seconds" — out of reach.**

---

## 3. Lounge

### 3.1 `/` — Home (`pages/BhalyamHome.tsx`, 2,563 lines)

`room/mobile-light__01…07.png`, `final/desktop__light___.png`

**Purpose** Land, orient, pick a game, resume, or join by code.
**Primary action** Play a game (`PLAY NOW` per card).
**Secondary** Join Room with a code · Create Room · resume last game · browse by mood.

Sections top-to-bottom: hero + "Play UNO Now" · **Starter Missions** · Pick a game (category rail + tall
game cards) · What are we playing? (Create Room / Join) · **Moods & Occasions** (illustrated) · Live feed ·
Referral card · Newsletter · Footer.

**What works.** The game cards are the best UI in the product: pastel per-game gradient, quality 3-D
illustration, Righteous title, a Caveat nostalgia line ("Every school break had one.", "Cards on the
classroom bench.", "One more game!"), a clean metadata row, and a chunky CTA with a bottom lip that reads
as pressable. The Moods section — hand-painted rainy verandah, a CRT TV with chai and biscuits, friends at
the *adda* wall — is the most distinctive brand asset BHALYAM owns.

**Design problems.**

1. **The Starter Missions card is the DLS dropped onto cream.** Near-black card, mono copy, six decorative
   emoji (🚀 🎮 🏆 🤝 ⚔️ 👤). At 390 px **all five mission titles and all five descriptions truncate with
   an ellipsis** — "Claim Your Gamer…", "Battle in Your 1st M…", "Unlock Your 1st Achi…". Ten truncated
   strings in one card. The progress bar sits at 0 % as a flat black rail, and the dismiss `×` floats
   unaligned beside "0 / 5".
2. **The notification bell shows a badge of `3` to a visitor who has never played.** The three
   notifications are hard-coded in this very file (`INITIAL_NOTIFICATIONS`, line 585): *"Ravi invited you to
   UNO Adda! · Room: 6-letter Code #UN984X · 3 friends waiting"*, *"Day 3 Login Bonus Claimed! +100 XP added
   to your Veteran progression"*, *"Suresh scored 184 runs in Hand Cricket!"*. See DEBT **TR-01** — this is
   the single most damaging item in the audit.
3. **"Last played 2 hours ago"** renders for a first-time visitor. Same class of problem.
4. **Card density.** Each game card is ≈610 px tall at 390 px, so roughly **1.2 cards fit per screen**.
   Reaching the 12th game is a seven-screen scroll.
5. **The `PLAY NOW` fill changes colour per card** (orange / blue / red / purple…). Charming as per-game
   theming; the cost is that the product's most repeated action has no constant colour.
6. **The mood-card game names are 20 px tall links** — "• Hand Cricket", "• Carrom", "• Dots & Boxes" — well
   under the WCAG 2.2 24 px floor, and they carry most of this screen's 33 sub-24px controls.
7. **52 of 75 controls (69 %) are under 44 px** at 390 px, **33 under 24 px**.
8. Category rail arrows are 21 × 42 and 28 × 56 and the next-arrow overlaps the "Solo Play" pill.

**Consistency 3/5 mobile · 3/5 desktop.** Would be 4–5 without the two DLS cards embedded in it.

### 3.2 `/games` — Game library (`pages/GamesPage.tsx`)

`after2/mobile__light___games.png`

**Purpose** Browse and filter the full catalogue. **Primary** `PLAY NOW`. **Secondary** search, category
filter.

**The best-behaved screen in the product.** Warm cream, eyebrow pill, Righteous H1, real stroke icons
(`lucide-react`), pill filters, consistent `GameCard`. **0 of 32 controls under 44 px.** Zero contrast
failures. Zero console errors. The only route with a specific `<title>` ("All Games · BHALYAM").

**Design problems** *(two of three fixed in Phase 10)*:
- ~~Every card showed "MULTIPLAYER" twice~~ — the left mode badge and the right category chip both rendered
  the word, because `tags[0]` is `"multiplayer"` on 14 of 20 entries. **Fixed** — the chip now shows
  Classroom / Board / Party / Retro.
- ~~The search placeholder clipped mid-word~~: "Search games by title, rules, or nost". **Fixed.**
- The filter rail still clips its 4th pill at the right edge with **no swipe affordance**, against
  `docs/ai/ui-ux-standards.md` §4.4 which requires one.
- Cards are still ~640 px tall — same density problem as home.
- `isSolo` is a hard-coded slug list inside `GameCard.tsx` that duplicates the `solo`/`multiplayer` tag
  data it sits next to. Two sources of truth for one fact.

**Consistency 5/5.** This is the reference screen. Everything else should be measured against it.

---

## 4. Meta-game — where the product visibly splits in two

These five screens are built on `client/src/design-system/` and `client/src/features/`. All five are
coherent and good-looking **in dark mode**, and all five break in **light**, which is the default.

### 4.1 `/social` — Social Hub

`after2/desktop__light___social.png` (light) vs `shots-dark/desktop__dark___social.png` (dark)

**The clearest evidence in the audit.** Side by side, the same DOM:

| | Light (default) | Dark |
|---|---|---|
| Page shell | cream parchment | near-black | *(shell is theme-aware)* |
| Hero banner | near-black block on cream | near-black on near-black | *(content is not)* |
| "No friends are currently active…" | grey on olive-khaki, **illegible** | grey on dark, fine |
| "Party Headquarters" / "Requests (0)" tabs | grey on grey, **read as disabled** | legible |
| "Filter friends by name…" | dark grey on near-black | fine |

The muddy olive is `bg-stone-900/80` compositing over cream — a colour that belongs to no palette in the
project and only exists because a dark token was asked to sit on a light page.

Also here: **body copy in JetBrains Mono** ("Assemble squads, invite friends, track shared combat history,
and queue into games together."); **emoji chrome** (🏟️ Tournaments, 🏆 Rankings, 👥 empty state); a
16 px-tall "Back to Lounge" link — the exact control `SPACING.touchTarget`'s comment was written about; and
top-right text links duplicating sidebar entries that are already on screen.

Empty state: "No Friends Found — Send friend requests by Player ID or add opponents from your recent
multiplayer rooms." Actionable copy, but **no action**. No button, no field. `EmptyStateIllustration`'s own
API takes `actionText` + `onAction`; neither is passed.

**Consistency: 1/5 light · 4/5 dark.**

### 4.2 `/tournaments` — Tournaments

`shots2/desktop__light___tournaments.png`

Same split. Additional findings:

- **The global sidebar is replaced by a page-local one.** On `/social` the left rail is Home / Games /
  Tournaments / Social Hub / Leaderboards / Rooms / Help Center. On `/tournaments` the same position now
  holds Back to Home / TOURNAMENTS / Live Tournaments / Upcoming Brackets / My Matches / Tournament Rules.
  **Entering Tournaments deletes the user's global navigation.** Two nav models at one position.
- **Seeded content presented as live.** Three tournaments come from `server/src/tournaments/TournamentService.ts`
  as fixtures: "UNO Color Clash Blitz", "Rummy Masters Invitational", "Ludo Grand Prix — Weekly Open". Every
  one shows **`0 / 8 Players`** or **`0 / 16 Players`**, `Trophy Room (0)`, `REGISTRATION OPEN`, and a
  "500 XP + Trophy" prize pool. A visitor reads an arena where nobody has ever entered.
- Inactive tabs are grey-on-grey and read as disabled.
- 6 of 18 controls under 44 px — "View Bracket" and "Register" are 154 × **32**, the primary actions.
- Emoji chrome: 🏅 🎫 📊 👑.

**Consistency: 1/5 light · 4/5 dark.**

### 4.3 `/leaderboard` — Leaderboards

`final/*__light___leaderboard.png`

Same dark-on-cream split. **But: 0 of 25 controls under 44 px** — the best touch-target result in the
product alongside `/games`, so this surface was built by someone who applied the rule. The problem here is
purely the theme.

**Consistency: 2/5 light · 4/5 dark.**

### 4.4 `/profile` 🔒

Redirects guests to `/login`. Never measured as itself. Its components (`ProfileHeader`,
`AchievementCard`, `AchievementsPanel`, `RankShowcaseCard`) all consume `GLASSMORPHISM.elevatedCard` /
`SURFACES.*` and carry `border-stone-850` / `border-zinc-850`, so they inherit the same split and — until
Phase 10 — the near-white preflight hairline.

**Consistency: not assessable · inherits 1/5 light.**

### 4.5 `/design-system` — DLS catalogue

`shots2/desktop__light___design_system.png`

**The design system's own showroom fails the product's default theme.** Section headings — "1. Button
System", "2. Competitive Rank Emblems & Shields", "3. Achievement Rarity System" — are near-white text on
cream. The descriptions beneath them are grey on cream. The `SECONDARY BUTTON` swatch is near-black text on
a near-black pill. A "DLS V1.0.0 ACTIVE" badge sits in the corner.

This is also the **only file in the product that imports `PrimaryButton`**.

**Consistency: 1/5 light · 4/5 dark.** As an artefact of design governance: **0/5** — a catalogue that is
unreadable in the default theme cannot function as a reference.

---

## 5. Room, waiting room and gameplay

### 5.1 Game sheet (`components/bhalyam/GameRoomSheet.tsx`, 1,621 lines)

`play/mobile-light-ludo__10-gamesheet.png`

**Purpose** Choose how to play. **Primary** Create Room. **Secondary** Pass & Play · Join by code.

Cream bottom sheet, drag handle, title + "QUICK MATCH" eyebrow, name field, Pass & Play checkbox, a mode
row, gold Create Room CTA, "OR JOIN ROOM" divider, dashed room-code field, navy Join Room button.

**Craft: good.** The dashed letter-spaced room-code field is a nice, specific piece of design.

**Problems:**
- **The game's identity is dropped at the moment of commitment.** `/games` shows a 3-D Ludo board render;
  this sheet shows a **generic red 4-square glyph**, twice (header + mode row).
- **Two competing primaries.** Gold "Create Room" is the intended one; navy "Join Room" is visually
  *heavier* (solid dark on cream) and wins the eye.
- The "Ludo · LIVE ROOM" row looks like a selectable option sitting under a checkbox, but is inert — there
  is nothing else to select.
- Emoji chrome: ⚡ 🤖 in "Real-time match · AI practice bots".
- Redundant labelling: "OR JOIN ROOM" divider immediately followed by a "ROOM CODE" label.

**Consistency 4/5.**

### 5.2 `/room/:code` — Waiting room

`play/mobile-light-ludo__11-after-create.png`, `…__14-in-play-later.png`

**Purpose** Gather players, pick a colour, start. **Primary** I'm Ready → Start Game.

**What works.** Clear three-card structure; the room-code "ticket" card (dashed border, letter-spaced code,
Tap to copy) is excellent; the colour picker pairs swatch + name so colour is never the only signal;
sticky bottom action bar; "Need at least 2 players to start" is genuinely helpful.

**Problems:**

1. **The entire room shell is emoji-labelled** — ✏️ Name this table · 🚪 Leave · 📷 QR · 📸 Snapshot ·
   🎫 ROOM CODE · 📋 Copy Code · 🔗 Share · 👥 PARTICIPANTS · ➕ Add Bot · ⚙️ · 👑 Host · 🎨 PICK YOUR
   COLOR · ⚡ I'm Ready · ▶ Start Game. The lounge one tap away uses proper stroke SVGs. **The two halves of
   the product have different iconography.**
2. **📷 and 📸 sit side by side, unlabelled and visually identical** — QR and Snapshot. A user cannot tell
   them apart.
3. **The swatch labelled "Cyan" painted magenta; "Brown" painted bronze.** The wire ids
   (`LudoColor = … | "cyan" | "brown"`) never moved when the palette did, and the picker built its labels
   with `capitalize(id)`. A player picking by name got a different colour than the one they read.
   *(Fixed in Phase 10 — `COLOR_LABEL` now lives beside `COLOR_HEX`.)*
4. **Three primaries and a destructive action compete.** Orange "Copy Code", green "I'm Ready", beige
   disabled "Start Game", and a white "Leave" pinned top-right at the same weight as the game title.
   **Leave is the most prominent control in the header.**
5. **The same fact twice**: "0/1 Ready" in the participants header and "0 of 1 ready" in the bottom bar.
6. "Name this table" is dotted-underlined grey text that reads as disabled placeholder, not an editable field.
7. The colour picker occupies ~35 % of the viewport before anyone else has joined.
8. Bots and humans are near-identical: same brown letter-avatar, distinguished only by a 🤖 pill.
9. **The host must mark themselves Ready before they can start their own game.**

**Consistency 3/5.**

### 5.3 In-play — Ludo board

`play/mobile-light-ludo__15-in-play-later.png`

**The strongest gameplay surface in the product.** Flat print board with clean geometry, glossy chips,
per-seat cards with a live turn timer, a large dice with "Tap to roll", a four-icon bottom rail. It reads
as a real game.

**Problems:**
- **BHALYAM disappears.** No logo, no brand colour, no lounge continuity. The header carries a multicoloured
  "LUDO" wordmark in a fourth display treatment, and the background switches from cream to gold. The
  transition lounge → game is an identity break.
- **Two turn indicators**: an "8s left" pill in the header *and* an "8S" chip on the seat card.
- **Empty seats are painted as fully-saturated quadrants.** In a 2-player game the board looks 60 % occupied
  by players who do not exist, with no de-emphasis.
- **No score, no progress, no stakes.** Nothing tells a player how close anyone is to winning.
- Seat cards show four unlabelled grey dots (tokens home) with no legend.
- Bottom rail is emoji-in-circles (💬 😊 🎙️ ⋯), and the 😊 icon labelled "EMOJI" is a tautology.
- Header icon buttons vary in weight; the exit is a **red filled circle** — destructive prominence again.

**Consistency 4/5 as a game · 1/5 as part of BHALYAM.**

### 5.4 First-play tutorial (`components/GameTutorial.tsx`)

`play/mobile-light-ludo__14-tutorial.png`, `…__16-chat.png`

A third blocking modal, on first play, in a **fourth** visual world — navy slate (`#16223B` / `#2B3550`),
distinct from cream, from stone, and from the gold board behind it.

Two hard defects:

1. **The title "How to play Ludo" is dark warm-brown ink on the dark navy panel — barely readable.** The
   panel flipped dark; the ink did not. This is the "dark mode two-part rule" failure, and it is on the
   heading of the first thing a new player is shown.
2. **The turn clock runs while the tutorial is open.** Captured at `10s left` on open and `3s left` four
   seconds later, with the modal still up and the board unreachable. **A first-time player is timed out of
   their first turn while reading how to play.** For a gaming product this is the worst UX defect found.

Also: emoji section headers (🎯 🎲 ✨ 💥); content cut off at the bottom with no scroll affordance and the
"Got it" button below the fold.

**Consistency 1/5.**

---

## 6. Account screens

### 6.1 `/login`

`shots2/mobile__light___login.png`

Warm parchment ground, illustrated backdrop (paper plane, pencil box, marbles), clean white card, gold
gradient "Sign in". Among the better-crafted screens.

**Problems:**

1. **A different logo and a different tagline from the rest of the app.** Here: a hand-drawn "three kids"
   mark with the script line *"Play Together. Remember Forever."* In the app header: a treasure-chest app
   icon with **"BHALYAM / RELIVE CHILDHOOD"** in Righteous. In `VisualIdentity.ts`: *"The Modern Multiplayer
   Game Lounge & Esports Arena."* **Two logos and three taglines.** This is the screen where a user decides
   whether the product is real.
2. **"Continue with Apple" is a decoy.** `pages/auth/LoginPage.tsx` line 97 sets `appleUnavailable` and
   line 110 explains: *"Apple sign-in isn't available — it needs a paid Apple developer account, which this
   app doesn't have."* The button is at equal weight to Google, at the highest-friction point in the funnel.
   Honest message; poor design. Offering an option you cannot fulfil is a trust cost, not a courtesy.
3. **The guest path is the weakest element on the screen.** "Continue as Guest" is the inactive half of a
   segmented control, low-contrast brown on cream, reading as disabled. Product Tenet 2 says guests are
   first-class; the design says otherwise.
4. The bottom trust row ("Secure · Lightweight · Made for You") **overlaps the background illustration** and
   is unreadable against the "PENCIL BOX" art.
5. **12 of 16 controls under 44 px**; one unlabelled 16 × 16 link.

**Consistency 3/5.**

### 6.2 `/signup`

**The worst touch-target screen: 18 of 18 controls under 44 px, 3 under 24 px** — including two 14 × 14
"Show password" toggles. The only route where `axe-core` independently raised `target-size` violations, in
both themes and at every viewport.

Otherwise shares `/login`'s shell and its problems. **Consistency 3/5.**

### 6.3 `/forgot-password`

Cleanest auth screen: 5 controls, 2 under 44 px, 0 contrast failures. **Consistency 4/5.**

---

## 7. Support and system screens

### 7.1 `/about`

`shots2/*__light___about.png`

Genuinely warm — "Built from memories." H1, illustrated sections, an honest "Built solo with ♥" footer.

**Problems:** section eyebrows ("OUR STORY", "OUR CORE VALUES", "WHAT MAKES BHALYAM DIFFERENT?") are
`amber-600` 11 px/800 on cream = **3.13:1**, under the 4.5:1 the platform requires. Social links are 36 × 36
**emoji** (📷 💬 🛋️ ✉️) — under 44 px and platform-dependent glyphs. In dark mode the pull-quote
*"Not just games, It's our childhood again."* measures **3.77:1**.

**Consistency 4/5.**

### 7.2 `/privacy`

**The screen with the most measured contrast debt: 5–6 failures per viewport in *both* themes.** "Overview"
at 3.24:1, "Know more →" at 3.44:1 (×2), "Built solo with" and "2026" at 4.29:1. The section nav entries are
332 × **19–21 px** — under the WCAG floor. 14 of 19 controls under 44 px.

The content is excellent — plain-language DPDP disclosure with a real data inventory. The typography lets
it down.

**Consistency 3/5.**

### 7.3 `/settings` 🔒

**A guest is silently redirected to `/`** (`pages/SettingsPage.tsx` lines 50–52: `if (ready && !isMember)
navigate("/", { replace: true })`). No toast, no sign-in prompt, no explanation. The user taps Settings and
lands on the home page — indistinguishable from a bug. Guests *do* have settings (audio, haptics, theme,
language) via `GlobalSettings`, which makes the dead-end harder to justify.

**Consistency: not assessable · the redirect itself is 1/5 UX.**

### 7.4 `/diagnostics`

Utilitarian connection log. Honest, plain, no pretence. 3 of 4 controls under 44 px. **Consistency 3/5.**

### 7.5 `*` → 404 (`pages/NotFound.tsx`)

`final/*__light___no-such-page-404.png`

Warm, on-brand, with real personality: *"Looks like this room ran off to play hide-and-seek."* One of the
best pieces of copy in the product.

**Problems:** "Game not found" renders at **3.58:1**; `<title>` is the generic
"BHALYAM · బాల్యం — Relive Childhood" so a lost user's browser tab claims nothing is wrong.

**Consistency 4/5.**

---

## 8. Retro arcade

`/snake` · `/tetris` · `/breakout` · `/roadrash` · `/nokiacricket`

A deliberate and well-executed **Game Boy DMG** world — `#0F380F`, `#306230`, `#8BAC0F`, `#9BBC0F`,
monospace, pixel chrome. `AGENTS.md` §8 sanctions playful in-game treatment, and this is a legitimate
sub-brand, not drift.

**Problems, consistent across all five:**
- **Touch targets are the worst in the product.** `/tetris` 11 of 12 controls under 44 px including a
  16 px-tall "LOBBY"; `/nokiacricket` 7 of 10; `/roadrash` and `/breakout` 5 of 8. The D-pad keys use
  `w-13`, which did not compile until Phase 10, so keys sized for a thumb fell back to content width.
- Exit controls are 59 × 24 ("← Exit") — small, and mixed between "← Exit", "Back" and "LOBBY" across the
  five screens for the same action.
- Emoji chrome inside a pixel-art world: ⏸ 🔊 📖 ▶.
- No route-specific `<title>`.

**Consistency 4/5 within the sub-brand · 2/5 with BHALYAM.**

---

## 9. Not reachable in this audit

| Screen | Why | Design risk |
|---|---|---|
| `/admin` | `ProtectedRoute` + `AdminRoute` | Unknown. Admin surfaces are where design systems go to die. |
| `/tv/:code` Party Mode | Needs a live room + an account | Large-format TV layout, un-reviewed |
| `/profile` | Guests redirected | Inherits DLS split (§4.4) |
| `/settings` | Guests redirected | 1,129 lines, 34 emoji |
| Win / loss / tie / rematch | Need a completed match | See `DESIGN-DEBT-REGISTER.md` GX-01…GX-05 |
| 18 of 19 game boards | One board captured end-to-end (Ludo) | Ludo is reported to be the most polished; the others are extrapolated from source, not observed |

**Stated plainly: this inventory observed one game board in play. Conclusions about the other 18 are drawn
from source reading, not from screenshots, and are labelled as such wherever they appear.**

---

## 10. Screen ranking

| # | Screen | Mobile | Desktop | Verdict |
|---:|---|:---:|:---:|---|
| 1 | `/games` | 5 | 5 | Reference screen. Ship as-is. |
| 2 | Ludo in-play | 4 | 4 | Great game, zero BHALYAM |
| 3 | `/about` | 4 | 4 | Warm; eyebrow contrast |
| 4 | 404 | 4 | 4 | Best copy in the product |
| 5 | `/forgot-password` | 4 | 4 | Clean |
| 6 | Game sheet | 4 | 4 | Identity dropped at commitment |
| 7 | Retro arcade ×5 | 4* | 4* | *within its sub-brand; touch targets fail |
| 8 | `/` Home | 3 | 3 | Best assets, two foreign cards, fabricated data |
| 9 | Room lobby | 3 | 3 | Structure good, emoji chrome, 3 primaries |
| 10 | `/login` `/signup` | 3 | 3 | Different logo; decoy provider; targets |
| 11 | `/privacy` | 3 | 3 | Great content, worst contrast |
| 12 | `/diagnostics` | 3 | 3 | Honest utility |
| 13 | `/leaderboard` | 2 | 2 | Perfect targets, broken theme |
| 14 | `/tournaments` | 1 | 1 | Broken theme + empty seeded arena + nav swap |
| 15 | `/social` | 1 | 1 | Broken theme, illegible tabs, dead empty state |
| 16 | `/design-system` | 1 | 1 | The catalogue fails its own product's theme |
| 17 | Welcome modal | 1 | 1 | Second blocker, foreign language, mono, emoji |
| 18 | Game tutorial | 1 | 1 | Unreadable title **and the clock runs behind it** |

---

## 11. Cross-cutting measurements

| Metric | Value |
|---|---|
| Routes captured | 20 × 3 viewports × 2 themes = **120 renders** |
| Horizontal overflow | **0 / 120** ✅ |
| Console errors | **0 / 120** ✅ |
| Routes with a specific `<title>` | **1 / 20** (`/games`) ❌ |
| Mobile controls measured | 293 |
| Under BHALYAM's 44 px rule | **156 (53 %)** ❌ |
| Under WCAG 2.2 AA 24 px floor | **40 (14 %)** ❌ |
| Distinct confirmed contrast failures | **17** (2 fixed in Phase 10 → 15) |
| Blocking modals before first game | **3** (consent → welcome → tutorial) |

---

*Next: `DESIGN-SYSTEM-AUDIT.md` — colour, type, spacing, elevation and shape, token by token.*
