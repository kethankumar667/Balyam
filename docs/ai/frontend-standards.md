# BHALYAM Frontend Engineering Standards

> **Scope:** `client/` directory and shared UI components  
> **Framework:** React 18.3 + TypeScript 5.x (Strict) + TailwindCSS 3.x + Zustand 4.x + Vite 5.x  
> **Objective:** Maintain clean, robust, high-performance, modular, and accessible frontend architecture across all games and lounge subsystems.

---

## 1. React 18 Architecture Standards

1. **Functional Components Only**: Class components are strictly prohibited. All components must be pure functional React components.
2. **React 18 JSX Transform**: Never import `React` for basic JSX rendering (`"jsx": "react-jsx"`). Only import explicit React hooks and types (`import { useState, useMemo, useEffect, type ReactNode } from "react"`).
3. **Lazy Loading & Code Splitting**:
   - Every individual game board (`LudoBoard`, `RummyBoard`, `UnoBoard`, `ChessBoard`, etc.) must be dynamically loaded with `lazy()` and wrapped in `<Suspense fallback={<BoardLoadingFallback />}>`.
   - Modals and administrative panels must be code-split to keep the initial client bundle under tight budget limits (<600kB raw, <210kB gzip).
4. **Lifecycle & Cleanup Discipline**:
   - Every `useEffect` that sets a timer, event listener, audio session, or socket subscription **must** return an explicit teardown function or register with `CleanupRegistry`.
   - Never suppress exhaustive-deps warnings with `// eslint-disable-next-line`. Fix the dependency array or stabilize references using `useCallback` / `useMemo`.

---

## 2. TypeScript Strictness & Type Safety Rules

1. **Zero Tolerance for `any`**:
   - `any` is strictly banned across both client and server codebases.
   - Use `unknown` with runtime type guards, type narrowing, or Zod schemas for untrusted data.
2. **Discriminated Unions for State Machines**:
   - Complex game states and lifecycles must be represented as discriminated unions with a constant `status` or `type` discriminant:
     ```typescript
     export type RoomPhase =
       | { status: "LOBBY"; players: Player[] }
       | { status: "IN_PLAY"; gameState: LudoState; turnPlayerId: string }
       | { status: "GAME_OVER"; standings: Standing[]; rematchState: RematchState };
     ```
3. **Type-Only Imports**:
   - Use explicit `import type { ... }` when importing interfaces, type aliases, or signatures to enable clean tree-shaking and avoid ESM runtime cycle issues.
4. **Shared Types Immutability**:
   - All shared game state contracts live in `@shared/types.ts`. Frontend components must import from `@shared/*` and never define local overrides for server-authoritative state shapes.

---

## 3. Component Architecture & Hierarchy

Every component in BHALYAM belongs to one of four architectural layers:

```
┌────────────────────────────────────────────────────────┐
│ 1. Page Shells & Views (e.g., Room.tsx, BhalyamHome.tsx)│
├────────────────────────────────────────────────────────┤
│ 2. Feature Modules (e.g., features/tournaments, social)│
├────────────────────────────────────────────────────────┤
│ 3. Per-Game Boards (*BoardMobile.tsx, *BoardDesktop.tsx│
├────────────────────────────────────────────────────────┤
│ 4. Design System Primitives (design-system/dls, premium)│
└────────────────────────────────────────────────────────┘
```

### Component Rules
- **Single Responsibility**: One component = one clear purpose. If a file exceeds 400 lines, break it down into focused sub-components.
- **Props Interface Definition**: Every component must declare an explicit TypeScript interface naming all props (`interface PlayerListProps { ... }`).
- **Co-located Testing**: Every major component or utility must have a matching `*.test.tsx` located in a `__tests__/` directory adjacent to the source file.

---

## 4. Custom Hook Architecture & State Stores

1. **Naming**: All custom hooks must start with the `use` prefix (e.g., `useRoomViewModel`, `useHaptics`, `useTheme`, `useViewport`).
2. **External Singletons Bridge**:
   - Side-effect singletons (`AudioManager`, `HapticsManager`, `VoiceManager`) live outside React.
   - Bridge singleton state into React components using `useSyncExternalStore` or subscription hooks to avoid unneeded re-renders.
3. **State Management Boundaries**:
   - **Global State (Zustand `useRoomStore`)**: Room metadata, current player ID, active game state, socket connection status.
   - **Auth State (Zustand `useAuthStore`)**: Member credentials, access tokens, profile identities.
   - **Local State (`useState` / `useReducer`)**: Dropdowns, active modal tabs, form inputs, animation transitions.
   - **Derived State (`useMemo`)**: Filtered leaderboard lists, win rate calculations, quest completion percentages. Never duplicate derived state into `useState`.

---

## 5. Dual-Layout Game Requirement (Mandatory §6)

Every game in BHALYAM **must** implement two dedicated layouts:
1. `<Game>BoardMobile.tsx`: Touch-first, thumb-zone optimized, bottom sheet dialogs, 320px–768px viewport target.
2. `<Game>BoardDesktop.tsx`: Mouse/keyboard enabled, persistent side action rails, wide chat/scoreboard, >=1024px viewport target.
3. `<Game>Board.tsx`: Top-level switcher selecting between mobile and desktop using `useViewport()`.

---

## 6. Error Handling & Error Boundaries

1. **React Error Boundaries**: Wrap every major view and lazy-loaded board with `<GameErrorBoundary>` to prevent individual game render crashes from unmounting the global lounge shell.
2. **User-Facing Error Presentation**: Network, authentication, or room entry errors must render through `<PremiumErrorState>` with clear gaming copy and retry callbacks.
3. **Console Hygiene**: Avoid `console.log` clutter in production builds. Use structured debug loggers (`logConn`, `logger`) that redact sensitive auth tokens and passwords.
