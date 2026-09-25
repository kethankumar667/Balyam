# Development Epics: Universal High-Energy TV Spectator Stadium

This document details the development epics, user stories, acceptance criteria, and implementation status for the TV Spectator Stadium (`/tv/:code`).

---

## Traceability Matrix

| Epic ID | Title | Game Pillar | Target Files | Status |
|---|---|---|---|---|
| **EPIC-TV-01** | Shared Stadium Shell & Ambilight Engine | Pillar 1, Pillar 2 | `TvScreen.tsx`, `TvGameArena.tsx`, `index.css` | Complete |
| **EPIC-TV-02** | Turn Telemetry & Anti-Cutoff Layouts | Pillar 3, Pillar 4 | `TvPlayerList.tsx`, `TvTurnTimer.tsx`, `TvGameArena.tsx` | Complete |
| **EPIC-TV-03** | Per-Game 3D Stadiums & Animation Parity | Pillar 1, Pillar 2 | `TvGameArena.tsx`, `*Animations.tsx` across 11 games | Complete |
| **EPIC-TV-04** | Multi-Theme TV Engines & Host Sync | Pillar 2 | `TvGameArena.tsx`, `hc-skin.ts`, `HandCricketThemeSwitcher.tsx` | Complete |
| **EPIC-TV-05** | Big-Screen Performance & TV Ergonomics | Pillar 4 | `TvScreen.tsx`, `TvGameArena.tsx`, `PartyScreen.test.tsx` | Complete |

---

## Epic Details

### EPIC-TV-01: Shared Stadium Shell & Ambilight Atmosphere

#### Story TV-01.1: Dynamic Reactive Ambilight Glow
- **As a** spectator sitting on the living-room couch,
- **I want** the TV background to cast dynamic peripheral glow matching the active game and turn color,
- **So that** the entire room feels immersed in the game state without needing to read small text.
- **Acceptance Criteria**:
  - Ambilight updates smoothly with CSS transitions (`transition: background 0.7s ease`).
  - UNO matches active card color (`#E11D48` Red, `#2563EB` Blue, `#10B981` Green, `#F59E0B` Yellow).
  - Ludo matches the active player's pawn color.
  - Hand Cricket shifts between emerald (Cricbuzz), retro amber (Doordarshan), cyan (Broadcast), and deep navy (Classic).
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-01.2: Persistent Broadcast Audio Header
- **As an** audience member,
- **I want** a clear audio toggle button with live status,
- **So that** we can unmute game audio when switching between quiet gathering and hype party mode.
- **Acceptance Criteria**:
  - Shows `🔊 Live Sound` when audio is unlocked, `🔇 Muted (Click to Unmute)` when locked.
  - Interacting with the TV screen or pressing `Space`/`M` unmutes immediately.
- **Status**: Verified in `TvScreen.tsx`.

---

### EPIC-TV-02: Turn Telemetry & Anti-Cutoff Layouts

#### Story TV-02.1: Dynamic Multi-Column Player Grid
- **As a** party host with 4 to 8 players in a room,
- **I want** all player avatars, names, and scores to remain cleanly visible on the TV screen without clipping or overflow,
- **So that** no player feels ignored or excluded from the broadcast.
- **Acceptance Criteria**:
  - Automatically switches between `grid-cols-2`, `grid-cols-3`, and `grid-cols-4` based on player count.
  - Active turn player has an intensified golden or team-colored aura ring with an animated badge.
  - Tested with up to 8 concurrent players; 0 scrollbars or truncated names.
- **Status**: Verified in `TvGameArena.tsx` and `PartyScreen.test.tsx`.

#### Story TV-02.2: Urgent 10-Second Countdown Alarm
- **As a** spectator,
- **I want** a dramatic visual and audio warning when a player has less than 10 seconds remaining,
- **So that** everyone in the room feels the time pressure and can shout encouragement.
- **Acceptance Criteria**:
  - Turn timer pulses red when timer drops under 10 seconds.
  - Audio countdown ticks in sync with the visual countdown.
- **Status**: Verified in `TvTurnTimer.tsx`.

---

### EPIC-TV-03: Per-Game 3D Stadiums & Animation Parity

#### Story TV-03.1: Ludo & Snakes & Ladders 3D Live Dice Stage
- **As a** spectator,
- **I want** to see the 3D dice roll in real time in the center of the TV screen and comic capture bursts when pawns are killed,
- **So that** watching on TV is just as thrilling as rolling on the mobile device.
- **Acceptance Criteria**:
  - Replaces static mini-boards with the full `<Dice />` physics rolling component.
  - Triggers `GotchaCaptureOverlay` (`"GOTCHA!"`) whenever a token is sent back to base.
  - Triggers `LuckySixBurst` with flame particles on any roll of 6.
  - Triggers `SnakeBiteOverlay` (`"OUCH! 🐍"`) and `LadderClimbOverlay` (`"SKY HIGH! 🪜"`) for SNL.
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-03.2: UNO 3D Stacked Deck & Action Toasts
- **As a** spectator,
- **I want** to see the 3D draw deck, live discard card, and center-screen action banners (Skip, Reverse, +2, +4),
- **So that** the whole room knows when an attack card is played against someone.
- **Acceptance Criteria**:
  - Displays 3D-angled card face for the active top discard card.
  - Center-screen `UnoActionToast` triggers on action card plays with dramatic bounce entrance.
  - `fireUnoDeclareConfetti` triggers when a player hits 1 card remaining.
  - Private player hands are strictly hidden (0 card leakage).
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-03.3: Rock Paper Scissors Fighter Showdown
- **As a** spectator,
- **I want** a 2-fighter showdown split-screen with comic clash bursts (`"CRUSH!"`, `"CUT!"`, `"COVER!"`, `"DRAW!"`),
- **So that** each reveal feels like an anime fighting game clash.
- **Acceptance Criteria**:
  - 3D avatar spotlight for Player 1 vs Player 2.
  - `RpsClashOverlay` triggers on move reveal with impact particles and comic splash.
  - Victory crown and confetti for match winner.
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-03.4: Rummy, Word Building, Dots & Boxes, Star Game, Bingo, NPAT
- **As an** audience member,
- **I want** every single game in Bhalyam to feature its signature mobile animations on the TV screen,
- **So that** no game feels like a second-class citizen on TV.
- **Acceptance Criteria**:
  - **Rummy**: `RummyDeclareFlourish` (`"SHOWDOWN!"`), invalid declare penalty badge, pure sequence burst.
  - **Word Building**: `WordBuildingWordBurst` with score explosion and combo streak fire.
  - **Dots & Boxes**: `DotsBoxesMineBurst` (`"MINE!"`), dominance bar, and combo chain banners.
  - **Star Game**: Cosmic star completion burst and constellation flare.
  - **Bingo**: 3D tumbler with `#number!` popping ball overlays and dust particles.
  - **NPAT**: Letter wheel spin and letter reveal burst.
- **Status**: All 6 game overlays verified in `TvGameArena.tsx`.

---

### EPIC-TV-04: Multi-Theme TV Engines & Host Reference Sync

#### Story TV-04.1: Hand Cricket 4-Theme Stadium Toggler
- **As a** spectator,
- **I want** to switch between Broadcast, Cricbuzz, Nostalgia Rerun, and Notebook themes,
- **So that** the broadcast presentation matches my preferred viewing style.
- **Acceptance Criteria**:
  - Toggler provides 4 buttons: `📺 Broadcast`, `🏏 Cricbuzz`, `📼 Rerun`, `📓 Classic`.
  - Toggling theme updates pitch background, typography, scorecard layout, and celebration aesthetics immediately.
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-04.2: Automatic Host Skin Synchronization
- **As a** spectator entering a TV room,
- **I want** the TV to automatically adopt whatever theme the room host chooses,
- **So that** the match has a cohesive aesthetic chosen by the organizer.
- **Acceptance Criteria**:
  - TV listens to `gameState.skin` or `gameState.theme`.
  - When the host switches themes, the TV updates smoothly while still permitting local spectator overrides if desired.
- **Status**: Verified in `TvGameArena.tsx`.

---

### EPIC-TV-05: Big-Screen Performance & TV Ergonomics

#### Story TV-05.1: 60 FPS Big-Screen Rendering & Memory Safety
- **As a** user running TV mode on a smart TV browser for multiple hours,
- **I want** smooth 60 FPS performance without memory leaks or browser crashes,
- **So that** party night runs without technical interruptions.
- **Acceptance Criteria**:
  - All burst overlays automatically self-dispose via `setTimeout` within 2.5–3.5s.
  - CSS transforms leverage GPU acceleration (`translate3d`, `scale3d`).
  - Memory footprint remains stable across multiple successive matches.
- **Status**: Verified in `TvGameArena.tsx`.

#### Story TV-05.2: Keyboard & Remote Hotkeys
- **As an** operator with a wireless keyboard or TV air mouse,
- **I want** hotkeys for key actions,
- **So that** I don't have to fiddle with fine mouse movements on a big screen.
- **Acceptance Criteria**:
  - `F` toggles fullscreen mode.
  - `Space` or `M` toggles mute/unmute.
  - `Esc` exits fullscreen mode.
- **Status**: Verified in `TvScreen.tsx`.
