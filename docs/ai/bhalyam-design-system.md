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

### 2.3 Modals & Dialogs
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
