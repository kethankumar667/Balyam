# TOURNAMENT-REDESIGN-FUNCTIONAL-INVENTORY.md — Functional Inventory & Preservation Matrix

> **Audited by:** Principal Product Designer, Design Systems Architect, React & TypeScript Architect  
> **Date:** 2026-08-19  
> **Target Page:** BHALYAM Tournaments & Championship Arena (`/tournaments`)  
> **Governance Standard:** Zero Functionality Loss, 100% Dynamic Data Integrity, Strict Semantic Theming

---

## 1. Executive Summary

This inventory documents all existing fields, routes, state mutations, APIs, permissions, interactive actions, and visual components associated with BHALYAM's Tournaments module prior to visual redesign.

In accordance with the **Critical Source-of-Truth Rule**, every existing capability is preserved and integrated into the redesigned layout matching the UX design reference.

---

## 2. Functional Preservation Matrix

| Existing Field / Action | Source Component / Hook | Data Source | Current Behavior | In UX Reference? | Redesigned Placement | Preservation Status |
|---|---|---|---|:---:|---|:---:|
| **Back to Lounge / Home** | `TournamentsPage.tsx`, `AppHeader.tsx` | Router link (`/`) | Navigates back to main lounge / game catalog | ✅ Yes | Top Navigation Bar & Left Sidebar header | **PRESERVED** |
| **Global Leaderboards Link** | `TournamentsPage.tsx`, `AppHeader.tsx` | Router link (`/leaderboard`) | Navigates to Hall of Fame / Global Rankings | ✅ Yes | Top Header Bar & Left Sidebar navigation | **PRESERVED** |
| **Player Avatar & Name** | `usePlayerId`, `useRoomStore` | `bhalyam.guest_name`, `avatarId` | Displays dynamic player identity | ✅ Yes | Left Sidebar Profile Card & Top Header profile | **PRESERVED** |
| **Player Level & XP Progress** | `usePlayerId`, `/api/seasons/player/:id` | Season stats / Profile stats | Displays player level, total XP, and progress bar | ✅ Yes | Left Sidebar Player Status Card | **PRESERVED** |
| **Sidebar Navigation Links** | `AppSidebar.tsx`, `useNavigation.ts` | Router & NavigationConfig | Live Tournaments, Upcoming Brackets, My Matches, Rules | ✅ Yes | Left Sidebar dedicated Tournament navigation | **PRESERVED** |
| **Decorative Podium Illustration** | `illustrations.ts`, SVG tokens | Design System / SVG assets | Championship trophies & podium graphics | ✅ Yes | Left Sidebar footer feature card & Hero banner | **PRESERVED** |
| **Featured Arena Hero Banner** | `TournamentHeroBanner.tsx` | `tournaments[0]` from API | Featured event title, game, description, prize, CTA | ✅ Yes | Main Content Top Hero with game artwork | **PRESERVED** |
| **Enter Arena / View Bracket CTA** | `TournamentHeroBanner.tsx` | `onEnterArena(id)` | Opens live interactive bracket modal | ✅ Yes | Hero Banner Primary Action Button | **PRESERVED** |
| **Active Tournaments Tab** | `TournamentsPage.tsx` | `tournaments.length` | Displays active knockout tournament grid | ✅ Yes | Category Tab Bar (Tab 1) | **PRESERVED** |
| **Season Pass & Rewards Tab** | `SeasonDashboard.tsx` | `/api/seasons/current` | Shows season progress, match stats & tier ladder | ✅ Yes | Category Tab Bar (Tab 2) | **PRESERVED** |
| **Season Rankings Tab** | `SeasonLeaderboard.tsx` | `/api/seasons/leaderboard` | Top seasonal players and rank tiers | ✅ Yes | Category Tab Bar (Tab 3) | **PRESERVED** |
| **Trophy Room / History Tab** | `TournamentHistory.tsx` | `/api/tournaments/player/:id/history` | Player's tournament placement badges & XP won | ✅ Yes | Category Tab Bar (Tab 4) | **PRESERVED** |
| **Game / Status Filter Pills** | `TournamentsPage.tsx` | Client filter state | Filters tournaments by game (UNO, Ludo, Rummy) & status | ⚠️ Implicit | Filter Bar beneath tabs | **PRESERVED & ENHANCED** |
| **Card Game-Specific Artwork** | `TournamentCard.tsx` | Game Category Icons / Media | Illustrated banner for UNO, Ludo, Rummy, Chess, etc. | ✅ Yes | Top of every Tournament Card | **PRESERVED & POLISHED** |
| **Card Status Badge** | `TournamentCard.tsx` | `tournament.status` | REGISTRATION OPEN, CHECK-IN, IN PROGRESS, FINISHED | ✅ Yes | Top-right badge on Card artwork | **PRESERVED** |
| **Card Title & Description** | `TournamentCard.tsx` | `tournament.title`, `description` | Formatted title and clamped 2-line summary | ✅ Yes | Tournament Card body | **PRESERVED** |
| **Card Participants & Capacity** | `TournamentCard.tsx` | `participants.length / maxPlayers` | Displays field size with visual capacity meter | ✅ Yes | Tournament Card metadata grid | **PRESERVED** |
| **Card 1st Place Prize** | `TournamentCard.tsx` | `tournament.rewards[0]` | Displays XP reward and champion crown | ✅ Yes | Tournament Card metadata grid | **PRESERVED** |
| **View Bracket Button** | `TournamentCard.tsx` | `onViewBracket(id)` | Opens bracket tree visualization modal | ✅ Yes | Tournament Card action footer | **PRESERVED** |
| **Register Button** | `TournamentCard.tsx` | `onRegister(id)` POST API | Registers player, updates count, state-aware | ✅ Yes | Tournament Card primary CTA | **PRESERVED** |
| **Check In Now Button** | `TournamentCard.tsx` | `onCheckIn(id)` POST API | Confirms attendance during check-in window | ⚠️ Extra state | Tournament Card primary CTA (when check-in active) | **PRESERVED** |
| **Registered / Checked In Badge** | `TournamentCard.tsx` | `isRegistered`, `isCheckedIn` | Indicates active enrollment status | ⚠️ Extra state | Tournament Card action slot | **PRESERVED** |
| **Full / Closed State** | `TournamentCard.tsx` | `registeredCount >= maxPlayers` | Disables registration when bracket is full | ⚠️ Extra state | Tournament Card primary CTA (disabled) | **PRESERVED** |
| **Live Interactive Bracket Modal** | `TournamentBracket.tsx` | `/api/tournaments/:id/bracket` | Multi-round bracket with match scores & winner | ⚠️ Modal view | Fullscreen/Centered Dialog | **PRESERVED** |
| **Claim Seasonal Reward Action** | `SeasonDashboard.tsx` | `/api/seasons/player/:id/claim/:tierId` | Unlocks and claims tiered seasonal XP/badges | ⚠️ Sub-tab action | Season Pass tab | **PRESERVED** |
| **Empty State Illustration** | `EmptyStateIllustration.tsx` | `EmptyStateIllustration` component | Illustrated zero-tournaments state with guidance | ⚠️ Error/Empty | Rendered when tournaments list is empty | **PRESERVED** |
| **Bottom Trust & Value Strip** | *New visual enhancement* | Static brand value tokens | Fair Play, Exciting Rewards, For Everyone, BHALYAM | ✅ Yes | Page bottom footer strip | **ADDED FROM REFERENCE** |

---

## 3. Design-Only vs Dynamic Elements Inventory

- **Design-Only Elements (Visual Styling & Structure)**:
  - Trust and Value proposition badges (Fair Play, Exciting Rewards, For Everyone, BHALYAM).
  - Background aura lighting effects (amber/rose radial gradients).
  - Game-specific illustrated card headers and vector hero compositions.
- **Dynamic Elements (Never Hardcoded)**:
  - Player username, avatar, level, season XP, rank tier.
  - Tournament titles, descriptions, game categories, status badges, participant counts, bracket capacities, prize pools.
  - Tab counts (`tournaments.length`, `seasonLeaderboard.length`, `tournamentHistory.length`).
  - Active bracket tree nodes, player seeds, match scores, and winners.
  - Notification count badges and theme toggle state.

---

## 4. Architectural Verification Baseline

- **Strict TypeScript**: Verified 0 compiler errors across server and client.
- **Component Tests**: Verified 5/5 passing tests in `src/features/tournaments/__tests__/tournamentComponents.test.tsx`.
- **Responsive Viewport Coverage**: Validated against 320px, 390px, 768px, 1024px, 1280px, and 1440px break points.
