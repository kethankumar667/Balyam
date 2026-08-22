# Game Catalog Multi-Facet Filter System

## 1. Overview
The Game Filter System provides composable, multi-dimensional catalog filtering inspired by modern e-commerce and gaming libraries. Players can filter games across multiple orthogonal facets simultaneously to find the exact nostalgic game they are looking for.

---

## 2. Supported Facets & Dimensions
1. **Player Count**:
   - `Solo` (1 Player)
   - `Duel` (2 Players, 1v1)
   - `Party` (3+ Players)
2. **Game Type**:
   - `Board Games`
   - `Card Games`
   - `Retro Classics`
   - `Classroom & Casual`
3. **Estimated Duration**:
   - `Quick` (< 5 mins)
   - `Medium` (5-15 mins)
   - `Long` (15+ mins)
4. **Features & Capabilities**:
   - `AI Bot Support` (can practice solo)
   - `Voice Chat Ready` (WebRTC mesh enabled)

---

## 3. Technical Architecture
- **Facet State Shape**:
  ```ts
  export interface GameFacets {
    playerCount: ("solo" | "duel" | "party")[];
    gameType: ("board" | "cards" | "retro" | "classroom")[];
    duration: ("quick" | "medium" | "long")[];
    features: ("bots" | "voice" | "turn")[];
  }
  ```
- **Filter Evaluation**: `matchesFacets(game, facets)` evaluates logical conjunction across dimensions and disjunction within options.
- **Combined with Category Track & Live Search**: Works seamlessly alongside the category segmented control (`FilterBar`) and full-text keyword search (`SearchField`).
- **Reset & Empty State**: Clear feedback with total matched count and one-tap reset button when no games match the active filter criteria.
