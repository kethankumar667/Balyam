# BHALYAM Design System & UI Primitive Catalog

> **Reference Implementation:** `client/src/design-system/dls/` and `client/src/design-system/premium/`  
> **Rule:** All screens, features, modals, and games **MUST** consume these standardized primitives. Never create ad-hoc styled components.

---

## 1. Core Design Tokens

### 1.1 Color Tokens (`VisualIdentity.ts`)
- **Brand Gold (`amber-500` / `#F59E0B`)**: Primary CTA accents, championship trophies, active tab indicators.
- **Deep Obsidian (`#070B14`)**: Root lounge backdrop and dark gaming felt.
- **Elevated Slate (`#0E1526`)**: Elevated cards, sheets, and modal hero headers.
- **Surface Dark (`#141C30`)**: Hover states, interactive item slots, and table headers.
- **Lounge chrome**: Use the existing `--chrome-*` variables in `client/src/index.css`.
  Light mode is warm parchment with brown ink; dark mode is navy with pale ink.
  `--chrome-panel`, `--chrome-control`, `--chrome-control-hi`, `--chrome-hairline`,
  `--chrome-ink`, `--chrome-ink-soft` and `--chrome-accent` are paired surface,
  text and focus tokens, not independent decorative swatches.
  Game worlds and approved scoped profile/records designs retain their own tokens.

### 1.2 Spacing & Surface Scale (`Spacing.ts`, `Surfaces.ts`)
- **Page Max Width**: `max-w-6xl` (`1152px`) centered on desktop.
- **Page Padding**: `px-3 sm:px-6` with safe-area bottom buffers.
- **Card Default**: `SURFACES.cardDefault`, adaptive chrome panel, ink and hairline; `rounded-2xl`.
- **Card Elevated**: `SURFACES.cardElevated`, adaptive chrome panel, ink and hairline; `rounded-3xl`.
- **Modal Hero**: `SURFACES.modalHero`, adaptive chrome panel, ink and border; `rounded-3xl`.
- **Text**: `TYPOGRAPHY` supplies adaptive heading/body/caption colors. Do not put
  fixed white text on a shared panel that becomes parchment in light mode.
- **Buttons**: Shared buttons default to `type="button"`; form submissions must
  explicitly use `type="submit"`. Loading retains the action's accessible name,
  disables activation and exposes `aria-busy`. Caller Tailwind overrides are
  merged through `cn`; hover/press transforms respect OS reduced motion.
- **Dialogs and navigation**: Centered dialogs use `Modal` for labelled dialog
  semantics, focus containment/restoration and scroll locking. The mobile
  navigation drawer shares the focus trap and closes on Escape or desktop entry.

---

## 2. Standardized Component Library

### Wallet and shop states

The shop preserves `useWallet`'s nullable balance: loading and failed reads are
never presented as zero or an invented shortfall. A failed wallet read disables
paid unlocks and offers Retry wallet; default and already-owned styles remain
equippable. A real zero still shows the exact shortfall. Use `formatCoinString`
for balance labels, not `Number`, so large balances keep their precision.

Both shop layouts share `ShopFeedback`. Catalog failure offers Retry shop and
must not be described as an empty category; category changes cannot erase a
failed initial load. API helpers returning `null` are failures, not empty lists.
Retry reloads data; it never resubmits a purchase.

The wallet's balance hero stays dark in both themes, so its error text uses
fixed pale ink. Ledger details wrap complete source identifiers, amounts and
descriptions at narrow widths rather than truncating audit data. Its child
dialog owns Escape and restores focus to the selected ledger row; the wallet
remains open and the page remains scroll-locked until the wallet itself closes.

### Brick Blocks Color Arcade

The `/brickblocks` solo game uses the app's `surface.*`, `ink.*` and `rim` tokens for
light/dark shells; `rim` maps to the existing `--rim-soft` hairline. Its playfield stays
midnight navy in both themes to keep colorful blocks and dashed ghost outlines legible.
Blocks retain their shape identity after placement and use cyan, blue, orange, gold,
lime, violet and coral beveled faces. Fredoka carries headings; existing body and
monospace faces carry instructions and numeric HUDs. A seven-color rail is the signature,
not ambient motion. Mobile and desktop layout shells share the board, engine, control
deck and stats. Settings/help/exit prompts use the shared focus-trapped `Modal`; tap
targets are at least 44px. Clear particles are optional and respect reduced motion.

### Player avatars and equipped decoration

Use `SeatAvatar` with the owner's room-seat `playerId` in games, or persistent
profile `playerId` outside rooms. `SelfAvatar` uses the current local equipped
loadout; Mandali's `AlbumAvatar` accepts the same owner ID while preserving its
logo fallback and presence badge. Never infer ownership from a picture or name.
An explicit `aura` overrides lookup; `aura_none` and unequipped players stay
plain, regardless of progression level. Picker thumbnails remain undecorated.

Bespoke portraits use one sibling `SeatFrame` inside a relative avatar-sized
box. Clip only the picture, not the frame: artwork extends 12% on each side.
Do not also enable owner lookup on an inner `SeatAvatar` in that box, which
would draw the decoration twice. Both artwork and legacy equipped rings work.
Decoration is non-interactive and hidden from assistive technology.
Profile portraits reserve padding around that overflow instead of adding a
square backing frame. Keep level labels below the frame; an edit badge must
sit outside its ring with a higher stacking layer, not on top of the portrait.

Live room cosmetics are server-filtered and take precedence. Outside rooms,
`GET /api/cosmetics/avatar-auras?playerIds=...` exposes only equipped aura IDs,
not inventory, entitlements, or account data. Requests are deduplicated, batched
at 25 owners, cached for 60 seconds and refreshed for visible mounted surfaces.
These passive GETs never create a guest. Failed lookups log an explicit warning
and retry rather than caching an unequipped success.

### Level-up celebration

`LevelUpAscension` uses opaque `surface.1` / `surface.0` panels and `ink.hi` /
`ink.mid` text in both document themes, not a translucent glass card. Tier
colors remain decorative on the badge and its contained celebration effects;
readable text, XP progress and the solid gold action do not depend on a tier's
art color. The shared `Modal` retains its backdrop, focus trap and dismissal.
Reward amounts, XP and navigation continue to use the existing level-up model.

### Personal scorecards

The Chrono dashboard uses a scoped `.chrono-scorecards` / `score.*` palette:
ivory/white with deep cyan ink in Light, navy panels with cyan/gold in Dark.
Four summary tiles lead into a game navigator, mode-card grid, illustrated
personal-best card, radar, history and recent battles. Desktop has four main
columns; tablet uses two, while the mobile shell stacks panels and scrolls
the game selector horizontally. Both shells share data, controls and local
selection state, which survives breakpoint changes. Pins keep their existing
storage key and show a status message if storage cannot be read or written.

Rank colors remain in the client-side `scorecardTheme` palette; ranking rules
are unchanged. Current mode coverage excludes historical-only formats, while
those archived records remain selectable. History plots only the retained
five recent scores, oldest to newest, never fabricated 10/30/all-time data.
Recent battles use actual profile results/dates and show their independent
loading/error states, not guessed per-match scores, modes or XP. A personal
best is not labelled "New best" without a new-best event, and play actions
start a fresh game rather than claiming to resume a save. Record details and
sharing use the shared `Modal` for portal layering, keyboard focus and Escape.
The share card describes a saved personal best, not a verified signature,
scannable QR or playable ghost. A failed clipboard write shows a selectable
link and an explicit error instead of reporting success.

### Profile command center

The `/profile` overview keeps the shared profile header and section navigation.
Its scoped `.profile-command` palette pairs opaque ivory/ink surfaces in Light
with navy/gold/cyan in Dark; existing profile primitives inherit these tokens.
`LevelJourneyCard` groups the real XP ring, base earning amounts and actual next
milestones into three columns on desktop and a vertical stack on phones.
`CommandRoomArtwork` is original decorative SVG, with themed room props and no
external image or animation loop. The ring respects reduced motion.
Career metrics and mastery require ready, non-demo stats; achievement totals
have an independent loading/unavailable state. Recent unlocks sort by recorded
unlock time; closest challenges retain the complete requirement. Progress-trail
markers are not dated milestones: only the account join date is known.
The existing roadmap/claim flow, profile controls, data export, deletion and
server-loaded trust details remain functional. No new reward, mastery rank,
cosmetic unlock or fair-play certification is inferred from the reference art.

### Nostalgia Network Hub footer

The home `Footer` sits outside the page's constrained content wrapper and
uses `shrink-0` to retain its full content height in the home's flex column.
Without it, the viewport-height shell can shrink the footer to its border,
and its decorative `overflow-hidden` clips the entire directory. Verify
scroll reachability on the actual home page, not only an isolated footer.
Its `footer.*` Tailwind palette uses opacity-aware RGB variables scoped to
`.bhalyam-footer`: warm cream surfaces, brown ink, antique gold and readable
blue/green accents by default; the original midnight/navy palette under the
document's `data-theme="dark"`. Surface, text, borders and focus colours switch
together without a React theme branch or a separate footer preference.
Playground silhouettes use their own ink token so they remain dark on the
light ground instead of inheriting the light surface colour. Neither the
document theme nor game-table worlds are changed by the footer.
Existing display, body, script and utility
fonts carry the brand; an original SVG playground turns chalk markings into
a digital route ending at the emblem. Decorative SVGs are noninteractive
and hidden from assistive technology. Only the playground scene is visible
on mobile; the small veranda vignette is desktop-only.

Desktop pairs the brand/System Pulse with three glass navigation groups,
then Dispatch, a four-card trust grid, the signoff and one utility bar.
Mobile moves Dispatch above native-button accordions and uses a 2x2 trust
grid. Closed mobile panels are not keyboard-focusable; all groups remain
visible on desktop. Links/controls are at least 44px, with cyan focus rings
and reduced-motion alternatives. Specialist links appear in an Admin tools
disclosure via `accessAdminPanel`; this is navigation presentation, not a
replacement for route/API authorization.

System Pulse makes a credential-free, uncached `/health` request only while
the footer and browser tab are visible, at most one request in flight.
A healthy response is `status: "healthy"`. The measured response time is a
browser-to-server HTTP health request, **not** gameplay ping, an India gateway,
or an all-services guarantee. Each request times out after 5 seconds, retries
are explicit, and visible checks repeat every 60 seconds. Hidden/unmounted
checks are aborted and timers cleaned up. A sparkline uses only the last eight
successful measurements and appears after two; no sample history is invented.

Veranda Dispatch is explicitly **not accepting signups**. Its labelled input
and button are disabled; no email is collected, saved, sent or reported as
subscribed. There is no fabricated latest transmission. A real subscription
service remains separate work. Footer WhatsApp uses the configured canonical
site URL; email uses the existing support address. The generic Instagram
homepage link is omitted until an official account is confirmed. The language
control shows the actual chosen language and opens existing settings.
Cookie/storage and data-choice links open Security & Data, where the
existing local-data inventory and essential-only consent control live.
Device language and admin navigation appear only after mount, preserving
the prerendered footer's hydration contract.

### Personal Journey Command Center

The home `PlayerJourneyDashboard` connects an emerald latest-game poster,
a cyan/violet XP module and a violet/gold `ReferralQuest` within one themed
landscape. Cards stack beside a vertical route below 1024px; desktop uses
three columns and a horizontal route. Primary actions are at least 52px.
Scoped `.bhalyam-journey` RGB tokens and opacity-aware `journey.*` utilities
follow the document theme: warm ivory with dark ink and deeper green, blue
and violet accents in Light mode; the navy landscape in Dark mode. Surfaces,
text, progress indicators, sharing controls, focus rings and loading states
switch together without a JavaScript theme branch or a separate preference.
The School Slate collectible keeps its actual material colors in both modes.
The panel never changes the document theme or game worlds.
Decoration is original SVG, noninteractive and hidden
from assistive technology; hover movement respects reduced motion.

Only display real snapshot data. Level XP uses `describeXpJourney`;
achievement progress and its full requirement are labelled separately.
Completed history opens a **new** game and says **Play again**, not Resume:
cross-device playable saves are a separate milestone.

Referrals show authenticated server counts, explicit loading/retry/unavailable
states and user-revealed sharing channels. Never invent a joined-friend count,
saved mode, XP reward or continuation estimate. The earned School Slate
material is personal, Rummy-only, and applies in both layouts only while the
host's world is classic. Non-classic host worlds take priority.

### Ludo board inspection

Ludo's 5–8-seat boards offer an optional 44px magnifier toggle in both layout
shells. Inspection follows the mouse or a primary touch/pen drag with a 2x,
view-only lens, placed above the contact when there is room and contained
inside the visual viewport. The lens uses the current rotated board, tokens
and table-world styling, not a screenshot. It stays out of pointer input and
the accessibility tree and does not duplicate the original board's SVG IDs.

While inspection is enabled, token selection and gameplay keyboard shortcuts
are disabled. Chat input remains usable. Focus moves to the labelled inspection
surface; arrow keys inspect and Escape turns inspection off and returns focus
to the toggle. Disabling restores normal moves. Touch release/cancellation,
focus loss and viewport changes hide the lens. Native pinch zoom remains
allowed by the inspection surface. The match and its server-controlled timer
continue: inspection does not pause play or change engine/socket contracts.
Boards with 2–4 seats retain their existing controls without a magnifier.

### Ludo token choices

On 5–8-seat boards, the active player's server-listed movable tokens also
appear as numbered buttons, each at least 44px square. Their numbers match
the pawns on the board, including when a seat's tokens arrive in a different
array order. Direct board taps and existing keyboard shortcuts remain available.
There is no automatic move or extra confirmation when only one choice exists.

On mobile, after the dice animation settles, a compact dice-result label and
one row of choices replace the large roll cup while choosing a move. This
preserves space for the measured board, including in short landscape. Desktop
keeps the dice and places the same choices underneath it in the right rail.
Both reuse `LudoTokenChoices` and the existing shared move action.

Hovering or keyboard-focusing a choice outlines its matching pawn; the existing
destination preview still respects the player's preview setting. Selection,
turn/choice changes, inspection and loss of connectivity clear the outline.
Choice buttons are disabled with an explanation during magnifier inspection
or reconnection. There are no choices when waiting, spectating, rolling, finished,
or when the server lists none. This is input presentation, not a second source
of move rules; the server remains authoritative, and 2–4-seat layouts retain
their existing token controls.

### Ludo turns and interrupted actions

Every seat count shares `LudoTurnStatus`: a wrapping status beside the mobile
controls and in the desktop right rail. It distinguishes roll, choose, waiting,
dice animation, sending, inspection, reconnection and finished states. The timer
reads the server's current turn deadline and sits outside the live announcement
so screen readers do not announce every second. Expiry says it is waiting for
the server; it does not claim that a timeout always skips the turn. No-move and
three-sixes explanations come only from the server's last outcome.

All roll/token paths, including keyboard shortcuts and direct board taps, share
an immediate in-flight lock and the existing action ID contract. They do not
buffer moves while offline. Authoritative gameplay progress, a rejection,
disconnect or remount releases the lock; a slow response alone does not.
After eight seconds the status offers **Restore room**, using the room's
existing recovery owner, never replaying an unconfirmed action. A rejected
optimistic token animation snaps back to the current authoritative snapshot.
Inspection and reconnection do not pause the match or change its rules.
If recovery/outcome copy exhausts a small portrait viewport, the play column
scrolls internally while the bottom navigation stays reachable. Short landscape
keeps the board and navigation in place and scrolls the right-hand controls.
Both scroll regions are keyboard reachable; no control may overlap another.

### Trophy vault

`/profile/achievements` retains the shared profile shell and uses scoped
`.trophy-vault` tokens for ivory/gold Light mode and navy/cyan Dark mode,
including its portalled detail dialog. `TrophyVaultArtwork` is original
responsive SVG; live HTML carries every count and label. `VaultAchievementCard`
shares category-colored badge art with the dialog. No rarity, secret challenge,
reward entitlement or player rank is invented from the visual reference.

The vault reads the profile outlet's existing resources. Loading/errors never
show stale achievement totals as loaded progress. Recent unlocks sort by
`unlockedAt` (missing dates are not invented); closest goals retain their full
requirements, including compound criteria. Collection markers are explicitly
non-reward counts. Search, category and status combine; sorting and incremental
display operate on the same real collection. Both themes must be checked in a
browser for contrast, focus, dialog dismissal and responsive reflow.

### Coin wallet drawer

`components/economy/WalletDrawer.tsx` uses a warm ivory shell (charcoal in
dark mode), an always-dark gold balance hero, illustrated coin-drop card,
2x2 lifetime totals and keyboard-operable transaction rows. Reuse `GoldCoin`
and `RewardChest` (the original open-chest SVG); do not hardcode the reference image's role,
balances, gains or audit claims. The claim confirmation remains server-driven;
only an immediately paid reward gets the dark/gold celebration and coin rain.
Waiting, held, refused, frozen and unavailable states retain their actual meaning.

`WalletActivityChart` reads the caller-only `/api/economy/wallet/activity`
aggregate, not the paginated ledger. It shows 30 UTC dates, daily closing
balances (today so far), and an expandable exact-value table. All amounts stay
decimal strings/BigInt; only bounded SVG ratios become numbers. A missing
aggregate is an explicit retryable error, never a fabricated flat chart.
Deploy migration `20261107000000_wallet_activity.sql` before the server/client;
its service-role-only RPC never creates a wallet or changes any balance.

### 2.1 Buttons (`client/src/design-system/dls/Buttons.tsx`)
| Button Component | Visual Style | Intended Usage |
| :--- | :--- | :--- |
| `<PrimaryButton>` | Gradient amber-500 to yellow-500 with gold shadow | Primary actions: "Start Match", "Create Room", "Save Profile". |
| `<SecondaryButton>` | Adaptive `surface-*` fill, `ink-hi` text and hairline border | Secondary actions: "Cancel", "Back", "View Rules". |
| `<TournamentCTAButton>`| Glowing violet-500 gradient with crown icon | Competitive actions: "Enter Arena", "Check In", "Claim Crown". |
| `<RewardButton>` | Radiant emerald-500 gradient | Claiming rewards: "Claim +100 XP", "Unlock Badge". |
| `<DangerButton>` | Rose-600/90 with danger border | Destructive actions: "Disband Party", "Forfeit Match", "Leave Room". |

### 2.2 Cards (`client/src/design-system/premium/`)
- `<PremiumCard>`: General-purpose interactive gaming container with glowing border aura on hover.
- `<PremiumStatCard>`: Metric tile displaying large numerical values, category icons, and subtext labels.
- `<PremiumProgressCard>`: Level / XP / Battle Pass progress track with dynamic fill percentage.
- `<PremiumHeroCard>`: Large banner card for active seasons, featured games, and tournament announcements.

#### Catalog cards: hybrid treatment

The home grid and All Games catalog share `components/games/GameCard.tsx`
and `GameCardGrid.tsx`. The owner's final structural reference uses a
continuous category-tinted gradient and thin coloured outline on EVERY card:
no top rail or inset artwork box. Large floating artwork sits below the
category pill and circular favourite control. Left-aligned title, handwritten
tagline and player/time details lead into a wide pill-shaped Play button with
a soft shadow. Desktop uses larger artwork, 56px favourite controls and 60px
CTAs; phones retain compact spacing and at least 44px controls.
Featured cards use the same structure with the approved gold palette,
slightly larger artwork and a stronger shadow. This supersedes the earlier
neutral-card/top-border proposal; the warm palette remains unchanged.
Two daily featured games lead an unfiltered grid, rotating through all
playable catalog games at midnight IST (UTC+05:30). Picks are deterministic
by date and slug order, identical on Home and All Games and stable on refresh;
they no longer depend on `isPopular`. Unavailable games are excluded.
Each day advances two places, so pools of four or more have no repeat from
the previous day. Smaller pools show up to two without duplicate tiles.
Home selects from the full pool before applying its six-card cap.
Open pages refresh the picks at midnight and on focus/visibility changes.
Prerendered HTML and the initial hydration render omit featured grouping;
today's grouping is applied after mount so a previous day's build stays safe.
No identity, network call or browser storage is involved; the device clock
supplies the date, so a wrong device clock can show a different day's picks.
Featured games are not duplicated below.
Search/category/play-way filters disable that grouping and keep all matches.

The palette is centralized in `components/bhalyam/tileColors.ts`:
Featured gold `#F59E0B`, Board & Cards royal blue `#2563EB`, Retro rose
`#E11D48`, Classroom green `#16A34A`, and Party purple `#9333EA`.
Solo/multiplayer-only entries use blue without changing their labels.
Genre tags take precedence over player-count tags; featured status overrides
the surface and CTA palette, not the game's category.
Category labels remain visible, so colour is never the only identifier.
White CTA text must meet 4.5:1 at both gradient endpoints: gold starts at
`#B45309` and green at `#15803D`, deliberately deeper than their primary
accents to preserve readable labels. Use the existing
display/body/script fonts; do not introduce a font download for these cards.

Grids start at two columns on phones, then three/four columns on wider
screens; featured cards remain a pair. Titles and metadata wrap instead of
truncating the game name. Play and favourite controls remain native, separate
buttons with 44px targets, visible focus rings and a pressed state for saved
favourites. Lift/press effects are restricted to `motion-safe`. Artwork keeps
one bounded retry (including AVIF/WebP URLs) and a glyph fallback. The
`classic` and `calm` treatments remain available for design comparisons;
`hybrid` is the default wherever the shared card is used.

#### My Records: personal performance dashboard

`/myrecords` replaces the former `/leaderboard` route; the old public route is
removed without a redirect. Admin rankings and their API are unchanged.
`pages/MyRecordsPage.tsx` uses shared scorecard archives and existing device
best-score keys, with the game/mode model in `features/myrecords/records.ts`.
Account archives come from durable server storage under the canonical account
ID, not the current device. The page refreshes on focus/visibility and offers a
44px **Refresh account records** button. An account switch clears the previous
account's archive immediately; a failed same-account refresh retains its cache
and displays an error. Device-only bests are labeled local and are not silently
uploaded.
The existing per-account cache key now stores a version-2 envelope. An older
raw cache archive is retained inside it as a separate local snapshot when the
server archive refreshes, even when the server is empty. Unmatched or greater
cached bests appear in **Previously recorded modes**, labeled **Saved on this
device · Account sync not verified**, without adding verified match counts or
dates. A current account result that accounts for a cached best hides the
redundant snapshot; snapshots never leak to another account.

Hand Cricket records the highest whole played innings from completed matches,
win or loss, separately for International and franchise T20/ODI/Test, plus the
three Galli lengths. Older format-only records remain in the historical section
because their category was not saved; never guess it. Rummy records only a valid final winning round's
positive score-sheet points in Points, Pool 101 and Pool 201, higher-is-better;
not losing penalties, cumulative pool totals, wrong shows or disconnect
walkovers. It shares `rummyRoundPoints` with the result sheet. Older
lower-is-better penalty records remain in **Previously recorded modes**.

Desktop uses a main dashboard and a journey rail; phone stacks the sections
with horizontal game and mode selectors. Summary cards, an illustrated
personal-best banner, mode cards, a last-five-results chart and a record
cabinet use actual tracked values. Suggested milestone goals are explicitly
not rewards. Timed modes display durations; score units appear only once.

Results run oldest to newest and have an expandable accessible table.
Archives do not provide full dated history, earlier-best snapshots or activity
streaks, so the interface does not invent them. Device-only bests carry no
fabricated date or match count. Failed refreshes show an explicit error,
retaining cached records when available. Selectors use native pressed
buttons, 44px targets, focus rings and reduced-motion-aware scrolling.

Older Retro Cricket and Retro Snake saves may contain only an overall
`highScore`, without `modeBestScores`. When that best is not accounted for by a saved mode, show it
separately as **Previous overall best — mode not recorded**. Never assign it
to Classic/Chase or an innings length, migrate the save, or invent match
counts, dates or history. It counts as a personal best and an explored game,
not a played mode or a milestone. New per-mode records remain separate; a
matching or higher device-mode best makes the extra overall card redundant.
Snake 2D's numeric `mpg.snake.best` is also an unknown-mode overall best.
The single-mode Block Puzzle reads its legacy numeric `bb.best`; Brick Blocks
reads mode-tagged `highScores` as well as its dedicated mode-best fields.
2048, Brick Racer and Breakout retain their existing device readers. These
are read-only compatibility paths: no migration, writeback or account reward.
Sudoku progress, unfinished puzzles, tutorials and cosmetic unlocks are not
personal-best scores and must never be interpreted as such.

Across all 26 catalog games, archive modes no longer in the registry appear
under **Previously recorded modes**, with their saved names, raw scores,
counts and dates. Their original units are not recorded, so do not guess
units or apply current-mode goals. Their actual counts contribute to totals
and the most-played cabinet. The existing `tetris` alias supplies missing
Brick Blocks archive modes; a canonical mode takes precedence over an alias
duplicate. Available-mode totals still describe today's catalog.
Device records remain visible during account loading or failure, with an
explicit loading/error notice. No compatibility reader can recover deleted
storage or scores that were never saved.

#### Shop: cinematic collectible showroom

`components/cosmetics/shop/` owns the shop-only visual treatment; global app
chrome and economy contracts are unchanged. Warm ivory (`#FFF9ED`) surrounds
a dark ember-lit hero (`#291A12` to `#10131C`), with rarity-coloured orbital
lighting and an original SVG pedestal. The actual cosmetic renderer remains
the product preview: stage lighting is decorative, not an item capability.
No raster hero asset, font download, paid offer or countdown is introduced.

Desktop/tablet (768px+) pairs the live preview with description, actual
price and existing purchase/equip/reset/refund actions. The collectible shelf
below shows rarity, item names and price/ownership/equipped state. Phone
uses a stacked stage and details, horizontal shelf and sticky safe-area action
bar. Both preserve category/scope deep links, arrow-key tabs/listbox navigation,
44px controls and reduced-motion previews. Local hero text/surface variables
keep contrast without changing the app's selected theme.

Collection progress counts active registered items in the four shop categories,
using actual owned IDs plus defaults. Admin access is explicitly labelled
as a pass, not earned ownership, because its store synthesizes access IDs.
Loading and failed empty collections are identified rather than presented as
a successful zero balance. Preview and wallet data still come from the existing
shop hook; no layout computes entitlements or sends its own transaction.

Shop dice are six-faced CSS 3D cubes, not rotating square tiles. Shelf, Inspect,
Roll Preview and the table mockup share the same geometry and real skin material
resolver. Faces have recessed pips, bevel lighting and proportional half-edge
depth; opposite values sum to seven. A resting perspective shows front, top
and side even with reduced motion. Roll Again is a keyboard-accessible 44px
control; reduced motion changes the preview value without tumbling. Shop rolls
remain presentation-only and never affect gameplay RNG.

Both mobile and desktop stages offer previous/next style arrows, sharing the
same category-scoped wrap-around selection. Categories with fewer than two
styles omit the arrows; the shelf remains an alternative selection control.

Large shop previews use a 20% smaller scale on both layouts (mobile 0.84,
desktop 1.24; short-screen variants 0.64 and 0.8). Shelf thumbnails, pedestal,
item details and stage navigation retain their size. Embedded preview buttons
counter-scale by 1.25 so this artwork adjustment does not shrink their controls.

The collectible shelf is classified by actual catalog rarity: All, Common
(bronze), Rare (blue), Epic (purple) and Legendary (gold). Shared 44px filter
chips scroll horizontally on mobile. Taller material-preview cards use a
rarity badge and outline, item name and full-width status/price pill; no
illustrated backgrounds, invented collections or example prices are used.
Filters narrow both the shelf and stage navigation, falling back to the first
matching item when necessary. An empty rarity has an explicit message and
retains the filters; switching category or card-game variant resets to All.

### 2.3 Modals & Dialogs

**Safety Gateway** (`components/privacy/AgeGateModal.tsx`) is deliberately calmer
than reward and wallet surfaces. It shares one shield illustration, fine circuit
lines, age/conditional-guardian step indicator and device-local privacy footer
across the age question, guardian confirmation and waiting screens. Light mode
uses cream glass and navy ink; dark mode uses navy glass and quiet teal accents.
The navy blurred backdrop, 480px maximum panel and 56px-or-larger decision
controls remain readable and scrollable on small or short screens. There is no
celebration, timer, reward, ambient animation or sound.

Both age choices share identical styling; initial focus goes to the heading
rather than preferring the adult answer. Each step focuses its heading and
retains keyboard containment. This mandatory gate has no Close, Escape or
backdrop bypass. Waiting stores nothing, and Go back returns to the age question.
Privacy and Terms remain readable without answering.

Only implemented limitations are described: coin-sending controls are hidden
for under-18s on this device. Messaging, coin requests and server-side protection
must not be advertised as disabled by this UI. The guardian step explicitly
identifies this as a self-declared check, **not verified guardian consent**.
The existing local age-answer key and confirmation rules are unchanged.

The privacy-choice dialog (`components/privacy/ConsentModal.tsx`) uses the same
Safety Gateway materials and shared `SafetyEmblem`, with a lock at its centre.
Required and optional device data are grouped in labelled sections without
removing the existing disclosures. Both consent choices use identical controls
and initial focus goes to the heading, never to Allow all. Phones stack the
choices; wider screens place them side by side. Long content scrolls with the
whole panel, preserving its heading and keyboard-reachable actions.
The separate-tab privacy-notice link and announcement, age-first ordering,
profile-recovery wait, per-account acknowledgements and essential-only purging
are unchanged. This is a visual update, not a new notice version or data policy.

The daily-streak popup opens directly into **Rewards Expedition**, whether
today's reward is ready or already claimed. Desktop pairs a parchment daily
card with an illuminated next-chest showcase, followed by an original SVG
island journey and three summary panels. Mobile uses a fullscreen, safe-area
stack with swipeable waypoints and visible 44px previous/next controls.
Ivory/parchment and midnight/cyan materials follow the application's light
and dark themes; neither layout changes the document theme.

Reward amounts and milestone perks come from the shared schedule. The daily
card shows that day's grant even after claiming, not tomorrow's amount.
Stats distinguish the cycle reward pool and chests reached this cycle from
lifetime earnings; no invented earned totals appear. Day 30 awards the
Monthly Champion **badge** and a shield, not an equippable crown. Claiming,
registration waits, protection and reward settlement remain server-controlled.
Preview rewards is an expandable disclosure. Loading, retry and claim errors
are explicit; unavailable player state is never shown as a secured day.
The popup is portalled, scroll-locked, keyboard-contained and Escape-dismissible,
with focus restoration, visible focus rings and reduced-motion transitions.

- `<RewardRevealModal>`: High-dopamine dialog with particle confetti and unlock sound triggers.
- `<WelcomeModal>`: 3-step first-time player onboarding carousel.
- `<PartyInvitationModal>`: Realtime squad invitation popup with Accept & Join / Decline actions.
- `<SharedHistoryModal>`: Head-to-head combat analytics between two players.

### 2.4 Feedback & Fallback States
- `<SkeletonLoader>`: Adaptive chrome placeholders (`hero`, `card`, `profile`, `table`, `grid`),
  with one named busy status, hidden decoration, narrow-screen wrapping and no
  pulse under OS reduced motion.
- `<EmptyStateIllustration>`: Gamified zero-data illustration (`matches`, `achievements`, `friends`, `tournaments`) with action CTA.
- `<PremiumErrorState>`: Diagnostic container with glowing danger aura and retry button.
- `<TurnTimeWarning>`: Pulsing golden-border warning activating when <= 10 seconds remain on turn timer.

---

## 3. Mandatory Iconography Standards

> **STRICT USER MANDATE:** **NEVER USE `Sparkles` FROM `lucide-react` ANYWHERE IN BHALYAM.**  
> The sparkle icon feels like generic AI fluff, cheap novelty glitter, or an uninspired placeholder. All assistants and contributors must adhere to domain-specific gaming iconography instead:

| Domain / Concept | Prohibited Icon | Approved Standard Icons | Rationale |
| :--- | :--- | :--- | :--- |
| **Avatar Auras & Energy Rings** | `Sparkles` ❌ | `Orbit`, `Flame`, `Zap` | `Orbit` represents planetary/cosmic rings; `Flame` represents fiery radiant power. |
| **Boutique & Shop Entry** | `Sparkles` ❌ | `Store`, `ShoppingBag` | Anchors the merchant/vault metaphor without generic magic glitter. |
| **Podium / Victory Celebrations** | `Sparkles` ❌ | `Crown`, `Award`, `Trophy`, `Star` | Authentic game tournament prestige rather than AI fairy dust. |
| **Tabletop Felt Mats & Boards** | `Sparkles` ❌ | `Grid`, `Layers`, `Palette` | Tactile tabletop geometry. |
| **Achievements & Badges** | `Sparkles` ❌ | `Medal`, `Trophy`, `ShieldCheck` | Distinct milestone progression. |
