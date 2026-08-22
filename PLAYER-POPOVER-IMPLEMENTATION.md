# Interactive Player Mini-Profile Popover Implementation

## 1. Overview
The Player Mini-Profile Popover is an interactive, accessible card that surfaces verified player stats and capabilities when clicking or tapping on a player in the lobby, player list, chat, leaderboards, or match history.

---

## 2. Information Displayed
Data is fetched on-demand from public backend endpoints (`/api/profile/:id` and `/api/profile/:id/stats`):
- **Avatar & Frame**: Customized 90s avatar with seat coloring.
- **Display Name**: Sanitized player name with "(You)" badge for self.
- **Player Level & XP**: Account progression metrics.
- **Career Matches**: Total matches played.
- **Win Rate %**: Calculated from won vs total games.
- **Favorite Game**: Top played 90s nostalgic title.

---

## 3. Real Capability-Gated Actions
*No fake or unbacked actions are rendered.*
1. **View / Manage Full Profile**:
   - For the current user: opens `/profile` or profile sheet.
2. **Invite to Active Room**:
   - Copies room link (`https://.../room/<code>`) with instant toast notification.
3. **Mute Chat & Reactions**:
   - Toggles local mute state for the target player in real-time.

---

## 4. Accessibility & Mobile Ergonomics
- Dismissible via Escape key, clicking outside, or explicit close button.
- ARIA semantics: `role="dialog"`, `aria-modal="true"`, `aria-label="Player Profile: [Name]"`.
- High contrast compliant in both dark parchment and light parchment modes.
