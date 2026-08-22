# Recently Played Games Architecture & Design

## 1. Overview
The Recently Played system tracks which games a player has launched, recording last played timestamps and frequency counts to power personalized "Jump Back In" sections, header pills, and command palette suggestions.

---

## 2. Storage & Persistence Strategy

### 2.1 Guest Players (Local Persistence)
- Stored in browser `localStorage` under key `bhalyam.recently_played`.
- Schema:
  ```json
  [
    {
      "slug": "ludo",
      "lastPlayedAt": 1787378000000,
      "playCount": 4
    }
  ]
  ```
- Capped at top 10 games, sorted newest first.
- Managed by singleton `RecentlyPlayedManager` utilizing `useSyncExternalStore` for reactive UI updates across components without stale states or infinite re-renders.

### 2.2 Authenticated Members (Database Strategy Evaluation)
When Supabase persistence is active, recently played data is derived from the verified `matches` table (`MatchHistoryService`) or player preferences table:
- **Recommended Solution**: Derive directly from `matches` match history table for authenticated players.
  - *Rationale*: Avoids redundant denormalized tables; every finished or joined game already logs a signed match record containing `game`, `timestamp`, and `scores`.
  - Offline / guest sessions are merged seamlessly upon authentication.

---

## 3. UI Surfaces
- **Header Nav Pill**: Shows count of recently played games with quick badge.
- **Page `/recently-played`**: Dedicated grid with last-played relative timestamps (e.g. *"Played 2 hours ago"*).
- **Command Palette**: Surfaces recently played titles in the spotlight suggestions.
