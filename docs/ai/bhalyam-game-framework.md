# BHALYAM Game Development Framework & Lifecycle

> **Scope:** Architecture requirements for all game implementations in BHALYAM  
> **Mandate:** Every game must be a first-class, fully featured multiplayer citizen. No one-off partial implementations.

---

## 1. Mandatory Game Capabilities Matrix

Every game added to BHALYAM **MUST** fulfill all 12 core framework capabilities:

| # | Capability | Requirement & Architecture |
|---|---|---|
| 1 | **Server Authority** | 100% authoritative `GameEngine` in `server/src/games/<game>/`. Client never computes valid moves or scores. |
| 2 | **Deterministic State** | Pure finite state machine with deterministic transitions given $(State, Move) \to State'$. |
| 3 | **Dual Layouts (§6)** | `<Game>BoardMobile.tsx` (touch-first) and `<Game>BoardDesktop.tsx` (expanded action rail). |
| 4 | **Mobile Ergonomics** | Minimum 44x44px touch targets; zero 300ms double-tap delay; safe area notch buffers. |
| 5 | **Keyboard Accessibility** | Fully operable via keyboard (`Tab`, `Enter`, `Space`, `ArrowKeys`, `Escape`). Focus visible. |
| 6 | **Intelligent Bots** | Multi-difficulty heuristic bot automation (`pendingActors` / `applyAutoMove`). |
| 7 | **Pass & Play Local Mode** | Seamless local turn handovers protected by `<PassPhoneGate>` privacy shields. |
| 8 | **Network Recovery** | Reconnection via cryptographic `seatToken` within 90-second grace period without forfeit. |
| 9 | **Rematch Loop** | Support post-match rematch negotiation state machine (`RematchPanel`). |
| 10| **Audio & Haptic Sync** | Sound effects dispatched via `AudioManager`; tactile pulses dispatched via `HapticsManager`. |
| 11| **Event Timeline Logging**| Moves recorded into `EventStore` for replay timeline playback and analytics projections. |
| 12| **Vitest Coverage** | Comprehensive unit tests in `server/src/games/<game>/__tests__/` covering legality, scoring, and edge cases. |

---

## 2. Shared Contracts & State Shapes

All game state models live in `shared/types.ts`:

```typescript
// 1. Core State Shapes
export interface <Game>State {
  game: "<game>";
  players: <Game>PlayerState[];
  currentTurn: string;
  turnDeadline: number;
  winner: string | null;
  phase: <Game>Phase;
}

// 2. Public State Shape (Filtered for Opponent Privacy)
export interface <Game>PublicState {
  game: "<game>";
  players: <Game>PlayerPublicState[];
  currentTurn: string;
  turnDeadline: number;
  winner: string | null;
  phase: <Game>Phase;
}

// 3. Move Payload Union
export type <Game>Move =
  | { type: "ROLL_DICE" }
  | { type: "SELECT_PIECE"; pieceId: string }
  | { type: "PLAY_CARD"; cardId: string }
  | { type: "DECLARE"; melds: string[][] };
```

---

## 3. Server Engine Structure

```
server/src/games/<game>/
├── <Game>Engine.ts          # Core GameEngine implementation
├── types.ts                 # Local engine helper types (if needed)
├── rules.ts                 # Move validation & scoring algorithms
└── __tests__/
    └── <game>Engine.test.ts # Vitest test suite
```

---

## 4. Client Board Structure

```
client/src/games/<game>/
├── <Game>Board.tsx          # useViewport() layout switcher
├── <Game>BoardMobile.tsx    # Touch-first portrait mobile shell
├── <Game>BoardDesktop.tsx   # Desktop mouse & keyboard wide shell
├── <Game>BoardProps.ts      # Shared board props interface
└── sub-components/          # Shared presentational primitives (Dice, Token, Card, BoardSVG)
```
