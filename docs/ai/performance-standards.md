# BHALYAM Performance & Optimization Standards

> **Performance Target:** 60fps / 120fps UI Animations • < 50ms Interaction Latency • < 210kB Gzip Initial Bundle  
> **Hardware Target:** Smooth operation on budget Android devices and low-tier WebViews.

---

## 1. Bundle Budget & Code-Splitting Rules

1. **Strict Initial Bundle Budgets**:
   - Initial entry chunk must not exceed **220kB gzip**.
   - No individual vendor chunk may exceed **600kB raw minified**.
2. **Mandatory Dynamic Imports (`React.lazy`)**:
   - All 10+ game board components (`LudoBoard`, `RummyBoard`, `UnoBoard`, `ChessBoard`, etc.) must be dynamically loaded with `lazy()`.
   - Settings, Diagnostics, Admin Dashboards, and heavy modals must be code-split.
3. **Manual Chunks Organization (`vite.config.ts`)**:
   - Keep large vendor libraries split into dedicated cache chunks:
     - `vendor-react` (`react`, `react-dom`, `react-router-dom`)
     - `vendor-framer-motion` (`framer-motion`)
     - `vendor-socketio` (`socket.io-client`)
     - `vendor-audio` (`howler`)

---

## 2. React Rendering & State Hygiene

1. **Zustand Selector Granularity**:
   - Never subscribe to the entire store (`const state = useRoomStore()`).
   - Always extract exact primitive or memoized values using selectors:
     ```tsx
     // Correct: Only re-renders when active player changes
     const currentTurn = useRoomStore((s) => s.room?.gameState?.currentTurn);
     ```
2. **Render Loop Isolation**:
   - Isolate rapidly updating elements (such as 1-second countdown timers) into dedicated leaf components (`<TurnTimeWarning />`, `<Countdown />`). Never trigger root board re-renders on timer ticks.
3. **Reference Stability**:
   - Wrap callbacks passed to child board components in `useCallback`.
   - Wrap complex board layout calculations in `useMemo`.

---

## 3. Mobile Performance & Animation Budgets

1. **CSS Transform & Opacity Exclusivity**:
   - Animate ONLY `transform` (GPU composite) and `opacity`. Never animate layout-triggering properties (`width`, `height`, `margin`, `padding`, `top`, `left`).
2. **Touch Manipulation & Zero Latency**:
   - Apply `touch-action: manipulation;` on all interactive buttons to eliminate the 300ms mobile double-tap delay.
3. **Audio Preload & Soundboard Hygiene**:
   - Sound effects are lazy-loaded via `AudioManager` and cached in memory to ensure zero playback latency when dice roll or cards deal.
4. **Memory Teardown Guarantee**:
   - All animation frames (`requestAnimationFrame`), socket listeners, and timer loops must be cleanly disposed of when a player leaves a room or unmounts a board.
