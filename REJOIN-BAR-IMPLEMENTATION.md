# Continue Playing & Rejoin Bar Implementation

## 1. Overview
The Global Rejoin Bar provides session continuity and seamless multiplayer reconnection across BHALYAM. When a player navigates away from an active match (or returns after a brief network drop), a sticky floating banner appears on the lounge, catalog, or profile, allowing one-tap return to the game room.

---

## 2. Key Capabilities
1. **Session Persistence Integration**:
   - Inspects both in-memory `useRoomStore` state and persisted `loadSavedSession()` (`mpg.recovery.*` and `mpg.seats`).
   - Detects active room code, game kind, seat token, and player role.

2. **Context-Aware Display**:
   - Automatically hides when the player is actively on the `/room/:code` page.
   - Automatically hides if the match has concluded or expired.
   - Displays game title (e.g. *Ludo, Uno, Carrom, Rummy*) and 6-character room code (`#ABC123`).

3. **User Controls**:
   - **Rejoin Button**: Navigates immediately to `/room/:code` to resume the game and trigger recovery handshake.
   - **Dismiss (X) Button**: Hides the banner for the current session without forfeiting the seat or closing the room.

---

## 3. Visual & Mobile Design
- Floating sticky banner with ambient glow (`border-amber-500/40`, dark parchment gradient).
- Spring-based entrance animation via Framer Motion.
- Minimum 44px touch targets on mobile devices.
- Screen reader polite status live region: `role="status"` and `aria-live="polite"`.
