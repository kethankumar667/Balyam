---
title: "Universal High-Energy TV Spectator Stadium Experience (Bhalyam TV Lounge)"
game_type: "Multiplayer Lounge / Party Game Spectator Experience"
platforms: ["Web (Chromium, Safari, Firefox)", "Smart TV (LG webOS, Samsung Tizen, Android TV)", "Chromecast / AirPlay / HDMI Big-Screen (1080p, 4K)"]
created: "2026-09-25"
updated: "2026-09-25"
status: "active"
---

# Game Design Document: Bhalyam TV Spectator Stadium

## 1. Executive Summary

The **Universal High-Energy TV Spectator Stadium Experience** (`/tv/:code`) transforms Bhalyam from a screen where players stare at their individual phones into an electrifying, shared living-room centerpiece. Instead of showing static mini-boards or sleepy tables, the TV mode acts as a live esports broadcast stage: featuring 3D physics-driven stages (such as live 3D rolling dice, 3D tumblers, and stacked decks), real-time comic bursts and celebration overlays identical to the player screens, an adaptive ambient lighting engine ("Ambilight") that paints the room in game colors, and a dynamic telemetry HUD that never cuts off players regardless of party size.

Audience satisfaction and spectator hype are the paramount design priorities. Whether watching a tense 4-player Ludo kill, a high-stakes Hand Cricket chase, or a chaotic UNO Wild Draw Four, every spectator on the couch experiences the exact emotional cadence and visual impact of the game in 60 FPS broadcast clarity.

---

## 2. Target Platform(s) & Viewing Context

- **Primary Viewing Distance**: 8 to 15 feet ("10-foot couch UI experience").
- **Display Resolutions**: 1920×1080 (Full HD) up to 3840×2160 (4K UHD) landscape.
- **Hardware Targets**:
  - Smart TVs (Samsung Tizen, LG webOS, Android TV browsers).
  - Living-room media PCs, laptops hooked via HDMI, Apple TV / Chromecast tab cast.
- **Viewing Environment**: Living rooms, lounge rooms, office game nights, dorms, parties. Multiple spectators observing concurrently while 2–8 active players interact from their mobile devices.

---

## 3. Target Audience & Core Fantasy

- **Target Audience**: Casual party-goers, friends, families, college roommates, and competitive lounge players.
- **Core Fantasy**: **"The Living-Room Stadium."** The TV screen is not just a secondary mirror; it is the official tournament jumbotron. When you hit a 6 in Hand Cricket or capture a pawn in Ludo, the entire room lights up with comic book bursts, 3D confetti, and dynamic sound effects, elevating kitchen-table games into stadium spectacles.
- **Key Value Proposition**:
  - **Zero Sleepy Screens**: High energy, vibrant contrast, ambient glows, fluid micro-animations, and instant event bursts.
  - **Full Animation Parity**: Everything celebrated on mobile screens is celebrated on the TV.
  - **Zero Private Data Leakage**: Players can look up at the TV with total trust; private cards and hands remain secret while public moves take center stage.

---

## 4. The 4 Game Pillars

### Pillar 1: High-Octane Couch Spectacle
Every turn, score, capture, and victory must register visually with visceral feedback. Static boards are eliminated in favor of prominent, dynamic live-action stages:
- 3D live rolling dice for Ludo and Snakes & Ladders.
- Comic action bursts (`"GOTCHA!"`, `"SKY HIGH!"`, `"CRUSH!"`, `"SHOWDOWN!"`) on pivotal plays.
- 3D boundary and wicket celebration layers with stadium spotlights.
- Pulsing turn countdown rings and 10-second urgency alarms.

### Pillar 2: Dynamic Broadcast Fidelity & Theme Sovereignty
The TV experience feels like an elite sports broadcast:
- Hand Cricket features 4 distinct broadcast themes (`📺 Broadcast`, `🏏 Cricbuzz`, `📼 Rerun/Doordarshan`, `📓 Classic/Notebook`), allowing spectators or hosts to toggle visual styles dynamically.
- Dynamic Host Skin Sync: When a host changes game themes, the TV automatically synchronizes with the host's aesthetic.
- Color Ambilight Engine: Peripheral atmospheric radial glow reacts in real-time to active cards (UNO color), active players (Ludo tokens), or match themes (Cricket turf green, retro amber, etc.).

### Pillar 3: Non-Invasive Zero-Leak Telemetry
Competitive integrity is strictly preserved for couch multiplayer:
- Public board states, active turns, dice values, open discards, ball-by-ball summaries, and scores are prominently broadcast.
- Hidden cards (Rummy hand, UNO hand, secret submissions) are strictly masked or hidden on the spectator screen. Players can look at the TV without revealing their hand.

### Pillar 4: 60 FPS Big-Screen Polish & Ergonomics
- Zero player cutoff: Player chips automatically adjust in an adaptive multi-column grid (`grid-cols-2` to `grid-cols-4`) so 2 to 8+ players always remain fully visible.
- GPU-accelerated CSS and Canvas animations ensure sustained 60 FPS on TV chipsets without overheating or leaking memory.
- TV remote and single-hand accessibility: Keyboard hotkeys for Audio Toggle (`M` or `Space`) and Fullscreen (`F`).

---

## 5. Spectator Core Loop

```
+-------------------------------------------------------+
|                 1. AMBIENT LOBBY / IDLE               |
| Room code QR, room URL, connected player chips glow  |
+---------------------------+---------------------------+
                            | Game Starts
                            v
+-------------------------------------------------------+
|                 2. LIVE TURN SURVEILLANCE             |
| Active player spotlight, pulsing timer, status HUD,   |
| Ambilight reactive glow shifting with turn color      |
+---------------------------+---------------------------+
                            | Action Executed (Roll/Play)
                            v
+-------------------------------------------------------+
|                 3. LIVE 3D ACTION STAGE               |
| 3D Dice roll / Tumbler spin / Card discard animation   |
+---------------------------+---------------------------+
                            | Pivotal Event Triggered
                            v
+-------------------------------------------------------+
|                 4. SPECTACLE BURST & CELEBRATION      |
| Comic burst ("GOTCHA!", "SKY HIGH!", 3D fireworks),    |
| Dynamic score update, live ball-by-ball ticker update |
+---------------------------+---------------------------+
                            | Game Concluded
                            v
+-------------------------------------------------------+
|                 5. GRAND PODIUM & CEREMONY            |
| Gold/Silver/Bronze spotlight, stats recap, confetti,  |
| Next-game countdown / Rematch readiness indicators   |
+-------------------------------------------------------+
```

---

## 6. Spectator Telemetry & Controls

### 6.1 Audio & Atmosphere Controls
- **Mute / Unmute Button**: Located in the top-right header, clearly indicating audio status (`🔊 Live Sound` / `🔇 Muted`).
- **Mode Toggler**: On Hand Cricket and future games, an interactive 4-button pill bar allows switching visual aesthetics on the fly.
- **Fullscreen Mode**: Expand to borderless TV presentation with a single tap or pressing `F`.

### 6.2 Turn Urgency & Warning System
- **Active Turn Spotlight**: High-contrast golden/cyan border with avatar aura.
- **Pulsing Turn Warning**: When less than 10 seconds remain, the entire stadium border pulses in urgent warning colors (crimson/amber) with an energetic clock ticking sound.
- **Turn Timeout Grace**: Displays bot takeover indicators if a player disconnects or runs out of time.

---

## 7. Per-Game Stadium Specific Design

| Game | Live Action Centerpiece | In-Game Animation Parity Overlays | Visual Triggers & Conditions |
|---|---|---|---|
| **Ludo** | 3D Physics Rolling Dice (`<Dice />`), 4-Pawn status cards, captured token counters | `GotchaCaptureOverlay` (`"GOTCHA!"`), `LuckySixBurst` (flame particles), `LudoWinnerCelebration` | - Pawn Capture: comic skull burst + target token bounce.<br>- Roll of 6: Golden explosive flare.<br>- Final pawn enters home: Winner fireworks. |
| **Snakes & Ladders** | 3D Physics Rolling Dice, Position track HUD, Trajectory cards | `SnakeBiteOverlay` (`"OUCH! 🐍"`), `LadderClimbOverlay` (`"SKY HIGH! 🪜"`), `LuckySixBurst`, `SnlWinnerCelebration` | - Landing on snake head: Venom green bite flare + drop animation.<br>- Landing on ladder: Golden climb shimmer.<br>- Square 100 reached: Winner podium burst. |
| **UNO** | 3D Stacked Draw Deck & Live Discard Pile with reactive Color Ring | `UnoActionToast` (Skip, Reverse, +2, +4), `fireUnoDeclareConfetti` (`"UNO!"` badge) | - Action card played: Center-screen action banner with sound.<br>- 1 card remaining: Confetti & siren burst.<br>- Game won: Winner fanfare. |
| **Rock Paper Scissors** | 2-Fighter Clash Stage (Left vs Right player spotlights with 3D avatars) | `RpsClashOverlay` (`"CRUSH!"`, `"CUT!"`, `"COVER!"`, `"DRAW!"`), `RpsWinnerCelebration` | - Choice reveal: Simultaneous dramatic flip.<br>- Clash result: Stylized comic splash with impact dust particles.<br>- Best-of victory: Trophy explosion. |
| **Hand Cricket** | High-energy multi-theme Stadium (Broadcast, Cricbuzz, Rerun, Notebook), Batting & Bowling split HUDs, Ball-by-Ball ribbon | `Hc3DCelebrationLayer` (Four, Six, Wicket 3D fireworks, camera flash), Batsman/Bowler milestone cards | - Boundary (4/6): 3D boundary flares + confetti cannon.<br>- Wicket: Siren, flashing red stumps, `"WICKET!"` banner.<br>- Target Chase: Real-time RRR and required runs ticker. |
| **Rummy** | Center Open Discard Pile, Closed Deck stack, Wild Joker indicator card | `RummyDeclareFlourish` (`"SHOWDOWN!"`), `RummyInvalidDeclareOverlay`, `RummyPureSequenceBurst`, `RummyWinnerCelebration` | - Player declares: Full-screen `"SHOWDOWN!"` herald.<br>- Valid declare: Pure sequence triumph burst.<br>- Invalid declare: Warning flash & 80-point penalty indicator. |
| **Word Building** | Letter matrix stadium preview, Current prefix/chain banner, Live score table | `WordBuildingWordBurst` (`"BRILLIANT!"`, `"NICE WORD!"` + score badge), `WordBuildingComboBanner`, `WordBuildingWinnerCelebration` | - Valid word submitted: Score badge explosion with combo multiplier stars.<br>- Combo streak (3+ words): Fiery combo banner. |
| **Dots & Boxes** | Live Territory Dominance Bar (% ownership), Completed box counters, Last move highlight | `DotsBoxesMineBurst` (`"MINE!"`), Dynamic Combo Banners (`"DOUBLE BOX! 🔥"`, `"CHAIN MASTER! 👑"`), `DotsBoxesWinnerCelebration` | - Box completed: Color splash + `"MINE!"` badge.<br>- Multi-box chain: Escalating combo banners with streak counter. |
| **Star Game** | Galactic Orbit Stage with revolving celestial particles, Node constellation tracker | `StarBurstOverlay` (`"STAR COMPLETED! ⭐"`), Constellation link beams, `StarWinnerCelebration` | - Star node completed: Cosmic star flare and chime.<br>- Victory: Supernova particle explosion. |
| **Bingo** | 3D Bingo Tumbler Stage with metallic cage, Called number sequence tray | `BingoBallCalledOverlay` (3D popping ball + dust burst), Line completion badges, `BingoWinnerCelebration` | - Ball drawn: 3D ball emerges with high-contrast number badge.<br>- 5 lines completed: `"BINGO!"` gold victory blast. |
| **Name Place Animal Thing** | Letter Wheel Stage, Category completion matrix, Submission indicators | `NpatLetterRevealBurst` (`"LETTER X!"`), Category checkmark pops, `NpatWinnerCelebration` | - Round start: Spinning letter wheel stops with explosive letter reveal.<br>- Round stop called: Countdown siren. |

---

## 8. Art, Ambilight & Audio Direction

### 8.1 Color & Visual Hierarchy
- **Deep Space Lounge Background**: `#030712` (rich obsidian) layered with subtle micro-dot grid and dynamic ambilight gradient.
- **Ambilight Color System**:
  - UNO Red: `rgba(225, 29, 72, 0.25)` | Blue: `rgba(37, 99, 235, 0.25)` | Green: `rgba(16, 185, 129, 0.25)` | Yellow: `rgba(245, 158, 11, 0.25)`.
  - Ludo: Matches the active player's pawn color.
  - Cricket: Broadcast cyan, Cricbuzz emerald, Nostalgia amber, Classic notebook blue.
- **High-Contrast Typography**: Massive headings, readable stats, and clear avatars designed for 10-foot legibility.

### 8.2 Iconography & Visual Governance
- Strict adherence to repository platform governance: **Zero usage of `Sparkles` from `lucide-react`**.
- Symbolic accents use `Crown`, `Trophy`, `Flame`, `Zap`, `Swords`, `Star`, `Flame`, and `ShieldAlert`.

### 8.3 Sound Design
- TV mode honors the global `AudioManager` singleton.
- Sound cues fire on turn transitions, dice rolls, comic bursts, boundary celebrations, and game conclusions.
- Unmute CTA remains accessible with a prominent top-bar control.

---

## 9. Technical Specifications & Performance

- **Frame Rate Target**: 60 FPS sustained on 1080p and 4K displays.
- **Rendering Model**: React 18 + Tailwind CSS 3 + Framer Motion 12 + Hardware-accelerated CSS 3D transforms (`translate3d`, `will-change: transform`).
- **Memory Footprint**: All overlay timers automatically unmount within 2000–3500ms; event listeners are cleanly disposed to prevent memory leaks during hours-long lounge sessions.
- **Browser Compatibility**: Chromium 90+, Safari 15+, Firefox 90+, LG webOS 5.0+, Samsung Tizen 5.5+.

---

## 10. Development Epics Summary

| Epic ID | Title | Scope & Objectives | Status |
|---|---|---|---|
| **EPIC-TV-01** | Shared Stadium Shell & Ambilight Engine | Base TV screen layout, responsive header, audio toggle, and dynamic ambilight peripheral lighting engine. | **Completed** |
| **EPIC-TV-02** | Turn Telemetry & Anti-Cutoff Layouts | Dynamic grid layouts for 2–8+ player chips, active turn spotlight, and 10s urgent turn timer. | **Completed** |
| **EPIC-TV-03** | Per-Game 3D Stadiums & Animation Parity | 3D live stages and full in-game animation overlays across all 11 games (Ludo, SNL, UNO, RPS, HC, Rummy, Word Building, Dots & Boxes, Star Game, Bingo, NPAT). | **Completed** |
| **EPIC-TV-04** | Multi-Theme TV Engines & Host Reference Sync | Hand Cricket 4-theme visual switcher (Broadcast, Cricbuzz, Rerun, Classic) with automatic host skin synchronization. | **Completed** |
| **EPIC-TV-05** | Big-Screen Performance & TV Remote Ergonomics | GPU transform optimization, memory leak prevention, keyboard shortcuts (Space/M for audio, F for fullscreen), and HappyDOM test verification. | **Completed** |

---

## 11. Success Metrics & Audience Satisfaction KPIs

1. **Zero Sleepy Spectators**: Live dynamic action occurring on the TV every turn (dice rolling, cards flipping, ball tracking) with zero static dead screens.
2. **Zero Information Cutoff**: 100% of player avatars and scores visible regardless of room size (tested up to 8 players).
3. **100% Animation Parity**: Every major triumph or catastrophe experienced on mobile devices is reflected simultaneously on the big screen.
4. **Zero Hand Leaks**: 0 private player cards exposed to the room.
5. **Rock-Solid Stability**: 0 memory leaks or frame drops during prolonged 2+ hour party sessions.

---

## 12. Out of Scope

- Direct game input from the TV screen (games are controlled solely via players' mobile devices; the TV is strictly an authoritative spectator stadium).
- TV-based webcam video feeds (voice chat remains audio-only mesh WebRTC).
- Third-party broadcast streaming RTMP integrations (Twitch/YouTube export is deferred to future milestones).
