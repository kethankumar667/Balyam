# BHALYAM Implementation Playbooks

> **Step-by-Step Execution Protocols:** Follow these exact playbooks when implementing new features, executing refactors, fixing bugs, or onboarding new games.

---

## Playbook 1: Onboarding a New Multiplayer Game

When adding a new game (e.g., `spaceimpact`, `bounce`, `carrom`, etc.) to BHALYAM, follow this mandatory 6-step lifecycle:

```
Step 1: Shared Contracts (@shared/types.ts)
  │
  ▼
Step 2: Server Engine (server/src/games/<game>/<Game>Engine.ts)
  │
  ▼
Step 3: Engine Registry (server/src/games/registry.ts)
  │
  ▼
Step 4: Client Dual Layouts (client/src/games/<game>/)
  │      ├─► <Game>BoardMobile.tsx
  │      ├─► <Game>BoardDesktop.tsx
  │      └─► <Game>Board.tsx
  ▼
Step 5: Room & Catalog Integration (Room.tsx & data.ts)
  │
  ▼
Step 6: Test Suite & Quality Gates Verification
```

### Detailed Steps:
1. **Shared Types (`shared/types.ts`)**:
   - Add the game key to the `GameKind` union.
   - Define `<Game>State`, `<Game>PublicState`, and `<Game>Move` interfaces.
   - Define `DEFAULT_<GAME>_OPTIONS` constant.
2. **Server Game Engine (`server/src/games/<game>/<Game>Engine.ts`)**:
   - Implement `GameEngine<TState, TPublicState, TMove>`.
   - Implement `initialize`, `getPublicState`, `validateMove`, `applyMove`, `checkGameOver`.
   - Add unit tests in `server/src/games/<game>/__tests__/<game>Engine.test.ts`.
3. **Registry Registration (`server/src/games/registry.ts`)**:
   - Register the engine constructor in `createEngine()` and define player limits in `getGameLimits()`.
4. **Client Dual Layouts (`client/src/games/<game>/`)**:
   - Create `<Game>BoardMobile.tsx` optimized for touch and thumbs.
   - Create `<Game>BoardDesktop.tsx` with expanded scoreboard and chat.
   - Create `<Game>Board.tsx` selecting between them using `useViewport()`.
5. **Catalog & Room Routing**:
   - Add lazy import in `client/src/pages/Room.tsx`.
   - Register game card metadata in `client/src/components/bhalyam/data.ts`.
6. **Verification**:
   - Run `npm test` and `npm run enterprise:check` to certify production readiness.

---

## Playbook 2: Fixing a Bug

1. **Reproduce & Isolate**: Create a failing unit or integration test in the appropriate `__tests__/` directory reproducing the bug.
2. **Identify Root Cause**: Determine if the issue is in server authority, state hydration, client render sync, or mobile touch bounds.
3. **Implement Fix**: Apply minimal, robust fix strictly adhering to TypeScript strictness and DLS design tokens.
4. **Verify Regression Pass**: Run `npm test` to ensure the new test passes and all existing tests remain green.

---

## Playbook 3: UI Enhancement & Component Polish

1. **Audit Mobile Ergonomics**: Verify 44x44px touch targets and notch safe area padding.
2. **Standardize Design Tokens**: Replace any ad-hoc styles with DLS tokens from `client/src/design-system/dls/`.
3. **Verify Feedback**: Ensure spring tap animation, sound cue, and haptic feedback are wired.
4. **Verify Accessibility**: Ensure keyboard focus visibility (`:focus-visible`) and screen reader labels (`aria-label`).
5. **Verify Breakpoints**: Open and confirm rendering at 320px, 375px, 768px, 1024px, and 1440px.
