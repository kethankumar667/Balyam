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
