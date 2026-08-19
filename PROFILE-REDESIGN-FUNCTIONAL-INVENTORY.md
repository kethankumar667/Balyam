# PROFILE-REDESIGN-FUNCTIONAL-INVENTORY.md — Profile Functional Discovery & Preservation Matrix

> **Author:** Principal Product Designer & Design Systems Architect  
> **Date:** 2026-08-19  
> **Target Experience:** BHALYAM Player Profile (`/profile`)  
> **Status:** Discovery & Inventory Complete  

---

## 1. Executive Summary

This document establishes the Phase 0 Functional Discovery and Preservation Matrix for the BHALYAM Player Profile page redesign. 

### Core Source-of-Truth Hierarchy:
1. **Existing business behavior and application functionality** (Real state, stats, match records, achievements, settings)
2. **Current routes, APIs, permissions, feature flags, and domain models** (Zero mock replacements for working APIs)
3. **BHALYAM governance and accessibility standards** (WCAG 2.1 AA, $\ge 44\times 44\text{px}$ touch targets, zero `any`)
4. **UX reference for visual presentation and layout hierarchy** (Styling, spacing, cards, elevation, typography)
5. **Current screenshot as implementation evidence**

---

## 2. API Contracts & Data Flow Audit

| Endpoint | Method | Response Payload | Component Consumer | Purpose |
|---|:---:|---|---|---|
| `/api/profile/:id` | GET | `{ profile: PlayerProfile }` | `ProfilePage.tsx`, `ProfileHeader.tsx` | Fetch player profile identity, display name, avatar, join date, level, XP |
| `/api/profile/:id` | PUT | `{ success: boolean, profile: PlayerProfile }` | `ProfilePage.tsx`, `AvatarPicker.tsx` | Update display name and/or avatar ID |
| `/api/profile/:id/stats` | GET | `{ stats: PlayerStats }` | `StatsOverview.tsx`, `CareerMetrics.tsx`, `FavoriteGames.tsx` | Matches played, W/L/D, win rate, play time, longest match, seat recoveries, per-game stats |
| `/api/profile/:id/matches` | GET | `{ matches: MatchHistoryItem[], total: number }` | `MatchHistoryList.tsx` | Filtered match history with room codes, outcomes, opponents, durations |
| `/api/profile/:id/matches/:matchId` | GET | `{ match: MatchDetailRecord }` | `ProfilePage.tsx` (Match Detail Modal) | Detailed match stats (moves count, timeline events, replay status) |
| `/api/profile/:id/achievements` | GET | `{ achievements: Achievement[] }` | `AchievementsPanel.tsx`, `AchievementCard.tsx` | Achievement catalogue with unlock status, progress percent, unlock timestamps |

---

## 3. Preservation Matrix

| Field / Action / Section | Source Component | Data Source | Current Behavior | Present in UX Reference | Planned Redesigned Location | Preservation Status |
|---|---|---|---|:---:|---|:---:|
| **Avatar & Frame** | `ProfileHeader.tsx` | `profile.avatar` / `useRoomStore.avatarId` | Displays player avatar with gilded rim | Yes | Profile Hero (Left) with level badge & radiant aura | **PRESERVED & ENHANCED** |
| **Level Badge** | `ProfileHeader.tsx` | `profile.level` (`calculateLevel(xp)`) | Displays `LVL {level}` tag | Yes | Affixed to bottom-center of Hero Avatar | **PRESERVED** |
| **Display Name** | `ProfileHeader.tsx` | `profile.displayName` / `useRoomStore.playerName` | Displays current name with edit trigger | Yes | Profile Hero headline | **PRESERVED** |
| **Edit Profile Action** | `ProfileHeader.tsx` | `onEditName` handler | Switches to Settings tab | Yes | Hero action next to display name with accessible button | **PRESERVED** |
| **Membership Date** | `ProfileHeader.tsx` | `profile.joinedAt` | Displays `Member since {date}` | Yes | Profile Hero top-right metadata | **PRESERVED (DYNAMIC)** |
| **Lifetime XP & Next Level** | `ProfileHeader.tsx` | `profile.experiencePoints`, `profile.level * 100` | Displays XP count and next level requirement | Yes | Profile Hero stats row with sparkle icon | **PRESERVED** |
| **XP Progress Bar** | `ProfileHeader.tsx` | `progressPct` (0..100%) | Smooth progress bar towards next level | Yes | Profile Hero progress bar | **PRESERVED** |
| **Section Tabs Navigation** | `ProfilePage.tsx` | `activeTab` state | 4 tabs with dynamic counters | Yes | Tab bar with pill styling and count chips | **PRESERVED & ENHANCED** |
| **Matches Played Card** | `StatsOverview.tsx` | `stats.totalMatches`, `stats.wins`, `stats.losses`, `stats.draws` | Total matches + W/L/D breakdown | Yes | Career Statistics Card 1 (Top-Left) | **PRESERVED** |
| **Win Rate Card** | `StatsOverview.tsx` | `stats.winRate`, `stats.wins` | Win rate % + victories count | Yes | Career Statistics Card 2 (Top-Mid-Left) | **PRESERVED** |
| **Total Play Time Card** | `StatsOverview.tsx` | `stats.totalPlayTimeMinutes`, `stats.averageMatchMinutes` | Total play minutes + average duration | Yes | Career Statistics Card 3 (Top-Mid-Right) | **PRESERVED** |
| **Best Game Card** | `StatsOverview.tsx` | `stats.favoriteGame` | Favorite/most active game title | Yes | Career Statistics Card 4 (Top-Right) | **PRESERVED** |
| **Endurance & Telemetry** | `CareerMetrics.tsx` | `stats.longestMatchMinutes`, `stats.averageMatchMinutes`, `stats.draws`, `stats.recoveryCount` | 4-column telemetry metrics grid | Integrated in summary | Dedicated Telemetry section with shield icon | **PRESERVED** |
| **Per-Game Career Breakdown** | `FavoriteGames.tsx` | `stats.perGame` | Per-game win rates, matches, and times | Secondary | Below telemetry in Career tab | **PRESERVED** |
| **Match History List** | `MatchHistoryList.tsx` | `matches`, `totalMatches` | Searchable, filterable list of matches | Yes | Tab 2: Match History with outcome badges | **PRESERVED** |
| **Match History Empty State** | `MatchHistoryList.tsx` | `matches.length === 0` | Empty state with browse games action | Yes | Polished empty state with gaming motif & CTA | **PRESERVED & UPGRADED** |
| **Match Details Modal** | `ProfilePage.tsx` | `selectedMatchDetail` | Modal dialog with moves and outcome | Contextual | Accessible dialog modal (`role="dialog"`) | **PRESERVED** |
| **Achievements Catalogue** | `AchievementsPanel.tsx` | `achievements` | Grid of achievement cards with progress | Yes | Tab 3: Achievements with rarity badges | **PRESERVED** |
| **Display Name Form** | `ProfilePage.tsx` | `handleSaveName`, `validateName` | Form input with validation & error states | Yes | Tab 4: Account & Settings | **PRESERVED** |
| **Avatar Picker** | `AvatarPicker.tsx` | `handleSelectAvatar` | Visual avatar grid selection | Yes | Tab 4: Account & Settings | **PRESERVED** |
| **Audio & Haptics Settings** | `GlobalSettings.tsx` | `AudioManager`, `HapticsManager` | In-profile audio toggles and volume | Settings sub-item | Tab 4: Account & Settings | **PRESERVED** |
| **Language Settings** | `LanguageSettings.tsx` | Language context | Language selection | Settings sub-item | Tab 4: Account & Settings | **PRESERVED** |
| **Privacy & Data Panel** | `YourDataPanel.tsx` | Local telemetry & storage export | Data transparency & deletion | Settings sub-item | Tab 4: Account & Settings | **PRESERVED** |
| **Sidebar Navigation** | `AppSidebar.tsx` | `navigationConfig.tsx` (`profile`) | Left sidebar with links and headers | Yes | Left sidebar via `AppLayout` with fixed active state | **PRESERVED & FIXED** |
| **Go Premium Promo** | `AppSidebar.tsx` | `authStore.isMember` | Premium club membership card | Yes (UX Mock) | Conditional sidebar promo card | **INTEGRATED (NON-FABRICATED)** |

---

## 4. Identified Inconsistencies & Planned Corrections

1. **Conflicting Active Navigation in Sidebar**:
   - *Issue*: `profile-achievements` had `hash: "#sec-profile"` without an explicit `isActive` predicate, causing both "Profile Overview" and "Achievements" to illuminate simultaneously.
   - *Fix*: Update `navigationConfig.tsx` to use precise hash mappings (`#overview`, `#personal`, `#stats`, `#achievements`, `#preferences`, `#security`) and strict predicate checks so only ONE item is active.
2. **Low-Contrast Empty States & Brown Cards**:
   - *Issue*: Current implementation relied on dark slate/brown cards with low-contrast muted typography in light mode.
   - *Fix*: Adopt semantic design tokens: warm parchment canvas (`#FAF3E0`), elevated clean white card surfaces (`#FFFFFF`), high-contrast mahogany ink (`#3D2005`), and radiant amber/gold accents.
3. **Hardcoded or Abbreviated Stat Labels**:
   - *Issue*: Abbreviated metrics like `35W • 15L • 0D` without accessible screen reader descriptions.
   - *Fix*: Provide explicit `aria-label="35 Wins, 15 Losses, 0 Draws"` while retaining the clean visual format.
