# BHALYAM Domain Knowledge & Platform Intelligence

> **Document Type:** Core Domain Knowledge & Business Context  
> **Platform Name:** BHALYAM (Nostalgic Multiplayer Gaming Lounge)  
> **Target Audience:** Casual gamers, nostalgic Nokia 2D enthusiasts, friends & family multiplayer groups, competitive ladder climbers.

---

## 1. What is BHALYAM?

**BHALYAM** is a web-based, zero-install multiplayer gaming lounge engineered to evoke childhood nostalgia while delivering a modern, competitive, and social gaming experience.

Players land in the lounge, explore a rich catalog of board, card, and retro arcade games, and instantly play solo against intelligent heuristic bots, share a device in "Pass & Play" local mode, or gather online with friends in server-authoritative multiplayer rooms via 6-character room codes.

### Core Value Propositions:
1. **Zero Barrier to Play**: Instant browser loading without downloads, app stores, or mandatory registration barriers for casual play.
2. **Nostalgia Meets Modernity**: Authentic retro feeling (Hand Cricket, Nokia Snake, Brick Racer, Ludo) enhanced with glowing rank auras, seasonal ladders, WebRTC voice chat, and rich soundscapes.
3. **Multi-Sensory Delight**: Every roll of dice, slap of card, strike of carrom striker, and score threshold produces synchronized visual micro-motion, haptic pulses, and audio cues.
4. **Resilient Lounge Architecture**: In-memory server authority with 90-second disconnect grace periods, cryptographic HMAC seat tokens, and zero forfeit on tab backgrounding or temporary network drops.

---

## 2. Game Catalog & Taxonomy

BHALYAM hosts games categorized across four distinct gaming domains:

| Category | Games Included | Player Count | Key Mechanics & Rules |
| :--- | :--- | :--- | :--- |
| **Classic Board Games** | **Ludo**, **Snakes & Ladders**, **Dots & Boxes**, **Chess**, **Carrom** | 2 – 4 Players | Turn-based token movement, safe stars, capturing opponents, home runs, spatial board geometry. |
| **Card & Meld Games** | **Rummy**, **UNO** | 2 – 6 Players | 13-card hand melds (pure sequence, sets, declaration validation), color matching, action cards (+2, +4, Skip, Reverse). |
| **Social & Street Classics**| **Hand Cricket**, **Rock Paper Scissors**, **Name Place Animal Thing**, **Tambola / Bingo** | 2 – 8 Players | Hand finger runs & wickets, simultaneous choice showdowns, timed word builder grids, ticket number marking. |
| **Retro Arcade (Nokia 2D)**| **Snake 2D**, **Brick Racer**, **Brick Tetris / Pentix**, **Brick Breakout**, **Space Impact**, **Bounce** | 1 – 2 Players | D-Pad / swipe grid movement, collision physics, high-score chase, progressive speed throttling. |

---

## 3. Core Gaming Mechanics & Progression

- **XP & Leveling System**: Transparent mathematical XP growth ($Level = \lfloor XP / 100 \rfloor + 1$). Players earn XP for matches played, declarations made, tournament check-ins, and daily quests.
- **Ranked Tier Progression**: 7 prestige tiers (*Bronze, Silver, Gold, Platinum, Diamond, Master, Radiant Vanguard*) with radiant glowing auras and custom badge borders.
- **Squads & Social Presence**: Realtime online presence tracking (`ONLINE`, `IN_GAME`, `IN_PARTY`, `IN_TOURNAMENT`), 4-player party lobbies, and shared combat history records.
- **Seasonal Knockout Tournaments**: Single-elimination bracket visualizers with automated match progression, champion podium crowns, and seasonal Battle Pass rewards.
- **Pass & Play Intermission (`<PassPhoneGate>`)**: Turn-based privacy protection allowing multiple players to share a single phone or tablet without revealing private card hands.
