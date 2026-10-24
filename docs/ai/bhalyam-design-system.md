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
- **Border Rail (`#292524` / `stone-800`)**: Subtle hairline divider and container borders.

### 1.2 Spacing & Surface Scale (`Spacing.ts`, `Surfaces.ts`)
- **Page Max Width**: `max-w-6xl` (`1152px`) centered on desktop.
- **Page Padding**: `px-3 sm:px-6` with safe-area bottom buffers.
- **Card Default**: `bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-2xl`
- **Card Elevated**: `bg-slate-900/90 backdrop-blur-xl border border-stone-700/80 rounded-3xl shadow-2xl`
- **Modal Hero**: `bg-slate-950/95 backdrop-blur-2xl border border-stone-800 rounded-3xl shadow-2xl`

---

## 2. Standardized Component Library

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
| `<SecondaryButton>` | Slate-900 with stone-700 hairline border | Secondary actions: "Cancel", "Back", "View Rules". |
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
- `<SkeletonLoader>`: Shimmering dark skeleton layouts (`hero`, `card`, `profile`, `table`, `grid`).
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
