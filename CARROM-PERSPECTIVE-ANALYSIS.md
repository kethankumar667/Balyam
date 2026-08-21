# Carrom Player Perspective Analysis

> **Status:** Discovery & Architectural Analysis Complete  
> **Author:** Antigravity Autonomous Engineering & Game Architecture Specialist  
> **Target:** BHALYAM Carrom Multiplayer Gameplay UX

> **Independent re-verification note:** every factual claim in this
> document — the baseline formula in `CarromEngine.ts`, the
> `CARROM_BOARD` constants (`size`, `cushion`, `baseline`,
> `strikerRadius`), the rendering/physics decoupling, and the selected
> Option A transform — was independently re-checked against the current
> repository (not re-derived from this document) as part of implementing
> and verifying the fix. All held up; nothing here needed correction. See
> `CARROM-PLAYER-PERSPECTIVE-FIX.md` for the verification evidence,
> including which parts of the *implementation* report were downgraded
> from earlier over-claims.

---

## 1. Executive Summary & Problem Statement

In BHALYAM Carrom, the host player (Player 0 / White) always plays from the bottom baseline ($Y = 82$), while the non-host player (Player 1 / Black) plays from the top baseline ($Y = 18$).

### The UX Problem
When it is the non-host player's turn:
1. **Unnatural Aiming:** The player's striker is positioned at the top edge of the board. To shoot downward into the board, the player must drag backward towards the top of their screen/notch.
2. **Broken Intuition on Mobile:** Pulling upward near the top edge of a mobile viewport triggers OS gestures, browser chrome, or runs out of screen space.
3. **Inverted Mental Model:** Aiming left/right and power scaling feel inverted compared to physical carrom and standard digital board games (e.g. Chess, 8-Ball Pool, Carrom Pool).
4. **Asymmetrical Match Experience:** Host has a native bottom-up shooting advantage, while non-host suffers degraded playability.

### The Objective
Every player must experience their own turn from the **bottom baseline** of the board, looking forward into the playfield, with intuitive drag-down-to-shoot mechanics and natural left-to-right slider positioning, **without modifying server-authoritative physics or match synchronization**.

---

## 2. Existing Architecture & Root Cause Discovery

### 2.1 Coordinate System & State Storage
- **Coordinate Space:** Abstract square grid $100 \times 100$ units defined by `CARROM_BOARD` in `shared/types.ts`.
  - Center: $(50, 50)$
  - Cushion (rebound wall): $6$ (bounds: $[6, 94]$)
  - Baseline inset: $18$
  - Striker radius: $2.6$, Coin radius: $1.9$, Pocket radius: $4.2$
- **Baseline Assignment in `CarromEngine.ts`:**
  ```ts
  const y = this.turnIndex === 0 ? size - baseline : baseline;
  ```
  - Player 0 ($turnIndex = 0$): $Y = 100 - 18 = 82$ (Bottom).
  - Player 1 ($turnIndex = 1$): $Y = 18$ (Top).
- **Striker X-Positioning:**
  ```ts
  const span = size - cushion * 2 - CARROM_BOARD.strikerRadius * 2;
  const x = cushion + CARROM_BOARD.strikerRadius + this.strikerPos * span;
  ```
  - For both players, `strikerPos = 0` maps to $X \approx 8.6$ (world left) and `strikerPos = 1` maps to $X \approx 91.4$ (world right).

### 2.2 Server Authority & Physics Decoupling
- **Physics Engine:** Pure deterministic 60Hz semi-implicit Euler integration on the server (`server/src/games/carrom/physics.ts` and `CarromEngine.ts`).
- **Client Role:** Client renders the SVG board, tracks pointer events, computes aim vector $(\text{angle}, \text{power})$, and sends `{ type: "shoot", data: { angle, power } }` or `{ type: "place", data: { pos } }`.
- **Decoupling Status:** Rendering and physics are **fully decoupled**. The server communicates solely through `CarromPublicState` (`pieces`, `strikerPos`, `turnPlayerId`, `seats`). The client does not compute coin collisions.

### 2.3 Perspective Handling Across Other BHALYAM Games
- **Chess (`ChessBoardMobile.tsx` / `ChessBoardDesktop.tsx`):** Detects `myColor === "b"` and inverts ranks $8 \to 1$ vs $1 \to 8$, rendering Black from the bottom.
- **Rummy:** Player's own hand is always anchored at the bottom rail.
- **Hand Cricket:** Action controls dynamically swap depending on batting/bowling role.

---

## 3. Evaluation of Solution Options

| Criterion | Option A: SVG/View Perspective Transform (Selected) | Option B: Server-Side Dynamic Baseline Re-assignment | Option C: Client-Side Piece Inversion (Manual Projection) |
|---|---|---|---|
| **Description** | Render SVG with $180^\circ$ rotation for Player 1; map pointer & slider inputs via view $\leftrightarrow$ world coordinate transforms. | Invert server coordinates on turn change so active player is always at $Y = 82$. | Manually transform every piece $(x, y) \to (100-x, 100-y)$ in React JSX rendering. |
| **Physics Invariance** | **100% Unchanged.** Server physics is completely untouched. | **High Risk.** Breaks coin continuity; coins would jump across the board on every turn switch. | **100% Unchanged.** But error-prone in JSX maintenance. |
| **Multiplayer Sync** | **Flawless.** Both players observe identical authoritative simulation. | **Desync Risk.** High complexity during continuous resolving phase. | **Flawless.** |
| **UX Quality** | **Superior.** Smooth, stable view. Board orientation matches player's seat for the whole match. | Poor / Disorienting if board flips during continuous play. | Superior. |
| **Input Mapping** | Clean mathematical mapping: $\theta_w = \theta_v + \pi$, $pos_w = 1 - pos_v$. | Complex state machine updates. | Same as Option A. |
| **Implementation Complexity** | **Low / Elegant.** Minimal code changes in client rendering and input handling. | **High.** Requires refactoring server engines, tests, and replay logging. | Moderate (verbose JSX changes). |

### Conclusion
**Option A (Client-Side SVG & Input Perspective Transformation)** is the architecturally optimal, zero-risk solution. It preserves 100% server authority, leaves physics intact, and gives both players an intuitive bottom-up carrom experience.

---

## 4. Mathematical Formulation for Selected Solution

### 4.1 Perspective Determination
Let $selfId$ be the local player's ID.
```ts
const selfSeatIndex = state.seats.findIndex((s) => s.playerId === selfId);
const isFlipped = selfSeatIndex === 1;
```
- **Player 0 (Host / White):** $isFlipped = \text{false}$ ($0^\circ$).
- **Player 1 (Guest / Black):** $isFlipped = \text{true}$ ($180^\circ$).
- **Spectator:** $isFlipped = \text{false}$ (standard fixed board view).

### 4.2 Board Coordinate Transforms
Point in World Space: $(x_w, y_w)$  
Point in View Space (on screen): $(x_v, y_v)$

$$\begin{cases}
x_v = 100 - x_w \\
y_v = 100 - y_w
\end{cases} \quad (\text{when } isFlipped = \text{true})$$

$$\begin{cases}
x_v = x_w \\
y_v = y_w
\end{cases} \quad (\text{when } isFlipped = \text{false})$$

### 4.3 Pointer & Drag Aiming Input
When the user touches the screen, `pointerToBoard` converts client coordinates to SVG viewBox units $(x_{screen}, y_{screen})$.
To map directly into world coordinates:
```ts
export function pointerToBoard(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  isFlipped = false
): { x: number; y: number } {
  let x = BOARD_VIEW.min + ((clientX - rect.left) / rect.width) * BOARD_VIEW.span;
  let y = BOARD_VIEW.min + ((clientY - rect.top) / rect.height) * BOARD_VIEW.span;
  if (isFlipped) {
    x = CARROM_BOARD.size - x;
    y = CARROM_BOARD.size - y;
  }
  return { x, y };
}
```

#### Vector Math Verification:
- Striker position: $S_w = (x_{striker}, 18)$
- Player 1 touches near their striker (screen bottom $Y_s \approx 82$): $P_w = (100 - X_s, 100 - 82) \approx (x_{striker}, 18)$.
- Player 1 drags backward (downward on screen towards $Y_s = 90$): $D_w = (x_{striker}, 100 - 90) = (x_{striker}, 10)$.
- World drag delta:
  $$\Delta x_w = S_w.x - D_w.x = 0$$
  $$\Delta y_w = S_w.y - D_w.y = 18 - 10 = +8$$
- World launch angle:
  $$\theta_w = \text{atan2}(+8, 0) = +\frac{\pi}{2} \quad (+90^\circ)$$
- Launch velocity:
  $$v_x = v \cos(+\frac{\pi}{2}) = 0, \quad v_y = v \sin(+\frac{\pi}{2}) = +v > 0$$
- Result: Striker launches downward into the board from $Y=18$ towards $Y=100$.
- In the SVG `<g transform="rotate(180 50 50)">`, this trajectory is rendered pointing **upward** on Player 1's screen!

### 4.4 Striker Position Slider
- **World Coordinate:** $pos_w = 0$ is $X \approx 8.6$ (world left); $pos_w = 1$ is $X \approx 91.4$ (world right).
- For Player 1 ($180^\circ$ view), world left is on the **screen right**, and world right is on the **screen left**.
- To keep the slider intuitive ($0$ = left, $1$ = right on screen):
  $$pos_{ui} = \begin{cases} state.strikerPos & \text{if } !isFlipped \\ 1 - state.strikerPos & \text{if } isFlipped \end{cases}$$
  $$pos_{server} = \begin{cases} pos_{ui} & \text{if } !isFlipped \\ 1 - pos_{ui} & \text{if } isFlipped \end{cases}$$
- **Button Controls:**
  - Clicking ◀ moves the slider left $\implies pos_{ui}$ decreases $\implies$ striker moves **left on screen** for both players.
  - Clicking ▶ moves the slider right $\implies pos_{ui}$ increases $\implies$ striker moves **right on screen** for both players.

---

## 5. Visual Consistency & Accessibility
1. **Board Markings & Geometry:** The carrom board is 4-way symmetrical. Rotating $180^\circ$ preserves all pocket positions, corner arrows, base circles, and center circles.
2. **Specular Highlights & Visuals:** Piece gradients and shadows maintain realism.
3. **Turn Bar & Guidance:** Player instructions clearly state "Your Turn" / "Waiting for [Name]" with intuitive objectives.
4. **Touch Targets:** 44px minimum touch targets preserved on mobile and desktop.

---

## 6. Risk Analysis & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Pointer mapping drift on rotated SVG | High | Pass `isFlipped` to `pointerToBoard` and unit test corner, center, and offset mappings. |
| Slider inversion desync | Medium | Standardize $pos_{ui} \leftrightarrow pos_{server}$ mapping helpers with rigorous unit tests. |
| Trajectory reflection distortion | Low | Trajectory is computed in world coordinates and rendered inside the rotated SVG group `<g>`, ensuring reflection mathematics is 100% faithful. |
| Reconnect / Refresh Desync | Low | `isFlipped` is purely derived from immutable `selfId` and `state.seats`, ensuring zero state drift on reconnection. |
