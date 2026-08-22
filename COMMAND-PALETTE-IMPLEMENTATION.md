# Command Palette (`Cmd + K` / `Ctrl + K`) Implementation

## 1. Overview
The Global Command Palette brings a desktop-class spotlight search modal to BHALYAM, inspired by productivity tools such as Raycast, Notion, and Slack. It enables instant keyboard-driven game discovery, page navigation, quick preference toggles, and direct room code joining.

---

## 2. Key Capabilities
1. **Global Keyboard & Touch Triggers**:
   - `Cmd + K` (macOS) / `Ctrl + K` (Windows/Linux) opens the palette anywhere in the app.
   - Header search trigger button with `⌘K` visual badge on desktop.
   - Dedicated mobile search icon in `AppHeader`.
   - `Escape` dismisses the palette and restores prior focus.

2. **Game Catalog Search**:
   - Searches all 17+ multiplayer and nostalgic 90s games (e.g. *Ludo, Chess, Carrom, UNO, Rummy, Hand Cricket, Nokia Snake*).
   - Fuzzy keyword matching across titles, tags, and blurbs.
   - Triggers the game detail sheet or navigates directly to the game arena.

3. **Page Quick Navigation**:
   - Fast jumps to `/games`, `/favorites`, `/recently-played`, `/profile`, `/leaderboard`, and `/settings`.

4. **Instant Actions & Room Joining**:
   - Quick toggling of **Dark Mode / Light Mode**.
   - Direct room joining: typing `ABC123` or `Join ABC123` creates an instant action to navigate to `/room/ABC123`.
   - Resume active ongoing room button if a match is waiting.

5. **Recently Used History**:
   - Tracks the top 5 most frequently / recently executed commands in `localStorage` (`bhalyam.recent_commands`), presenting them on open for zero-keystroke speed.

---

## 3. Architecture & Accessibility
- Semantic dialog role: `<div role="dialog" aria-modal="true" aria-label="Command Palette">`.
- Keyboard arrow navigation (`ArrowUp`, `ArrowDown`) with active item highlight and auto-scroll into view.
- Contrast compliant: Uses `--chrome-panel`, `--chrome-control`, `--chrome-ink`, and `--chrome-accent` DLS tokens.
- Lightweight: Renders via Framer Motion with reduced-motion awareness.
