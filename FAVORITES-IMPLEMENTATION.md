# Favorites System Implementation

## 1. Overview
The Favorites system enables players to star their favorite nostalgic 90s games, creating a personalized library accessible from the lounge hero, the header navigation pill, the command palette, and the dedicated `/favorites` page.

---

## 2. Technical Architecture
1. **Manager & State Management**:
   - `FavouritesManager` singleton with publish-subscribe pattern.
   - `useFavourites` hook using `useSyncExternalStore` ensuring stable object references to prevent unnecessary re-renders.
   - Immediate responsive UI toggling with optimistic updates.

2. **Storage Strategy**:
   - **Guests**: Stored in `localStorage` under `bhalyam.favourites` as a string array of `BhalyamGameSlug[]`.
   - **Members**: Syncs with user profile metadata / preferences when authenticated.

3. **Surfaces & Touchpoints**:
   - **Game Cards**: Heart icon toggle button with accessible labels (`"Add Ludo to favorites"` / `"Remove Ludo from favorites"`).
   - **Header Nav Pill**: Badged Favorites pill with live count.
   - **Category Filter Bar**: Quick filter pill for `"Favourites"`.
   - **Dedicated Page (`/favorites`)**: Clean grid with empty state encouraging game discovery.
