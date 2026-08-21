# Favourite Games — Architectural Design & Specification

> **Status:** IMPLEMENTED AND VERIFIED  
> **Target:** Global BHALYAM Lounge Feature  
> **Quality Gate:** 100% Passing (0 TypeScript errors, 5/5 manager tests, 538 repository tests)

---

## 1. Overview & Objectives

The **Favourite Games** feature lets players bookmark and quickly access their preferred titles across the BHALYAM lounge and all-games catalogue.

### Core Tenets:
1. **1-Click Heart Toggle:** Every game card carries an accessible, touch-friendly heart toggle button with subtle haptic feedback.
2. **Instant Sync:** React state updates reactively across all open tabs and components.
3. **Dedicated Catalogue Filter:** A new **"Favourites"** tab in the games catalogue (`/games?c=favourites`) allows dedicated filtering.
4. **Lounge Showcase:** Favourited titles are surfaced in a high-priority shelf on the home lounge.

---

## 2. Architecture & Data Layer

### 2.1 Core Service ([`FavouritesManager.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/services/FavouritesManager.ts))
- **Storage Key:** `bhalyam.favourites`
- **`isFavourite(slug)`**: Boolean check for bookmark state.
- **`toggleFavourite(slug)`**: Atomic toggle operation that saves to localStorage and notifies listeners.
- **`addFavourite(slug)` / `removeFavourite(slug)`**: Explicit add/remove operations.
- **`getFavourites()`**: Returns array of favourited game slugs.
- **`subscribe(listener)`**: External store listener for React integration.

### 2.2 React Hook ([`useFavourites.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/hooks/useFavourites.ts))
Provides reactive access to favourites state with `useSyncExternalStore`.

---

## 3. UI/UX Integration

1. **[`GameCard.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/components/games/GameCard.tsx):**
   - Top-right header row includes heart toggle button.
   - Filled rose styling (`bg-rose-500/20 text-rose-500`) when active; subtle ghost style when inactive.
   - Accessible ARIA labels (`"Add [Game] to favourites"`, `"Remove [Game] from favourites"`).
   - Event propagation isolation (`e.stopPropagation()`) prevents accidentally opening the game sheet when toggling.

2. **[`FavouritesSection.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/components/bhalyam/FavouritesSection.tsx):**
   - Featured horizontal card track in [`BhalyamHome.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/pages/BhalyamHome.tsx).
   - Direct quick-play gradient buttons (`from-rose-500 to-amber-500`).
   - Clean empty state with prompt when rendered in dedicated views.

3. **[`FilterBar.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/components/games/FilterBar.tsx) & [`CategoryFilter.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/components/bhalyam/CategoryFilter.tsx):**
   - Added `"favourites"` category filter with heart icon to allow 1-click filtering of all bookmarked titles in [`GamesPage.tsx`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/pages/GamesPage.tsx).

---

## 4. Test Verification ([`favourites.test.ts`](file:///c:/Users/GontlaKethanKumar/Desktop/copilot_workshop/copilot_training/MultiplayerGames/client/src/services/__tests__/favourites.test.ts))

- ✅ Adds and correctly checks favourite status.
- ✅ Removes games from favourites.
- ✅ Toggles favourite state idempotently.
- ✅ Preserves ordering of added favourites.
- ✅ Accurately notifies subscribers on every state change.
