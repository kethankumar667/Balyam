# BHALYAM Platform Non-Negotiable Rules

> **Status:** Mandatory Enforcement across All Contributors and AI Agents  
> **Violation Policy:** Any PR or commit violating these rules is rejected immediately.

---

## 1. The 10 Inviolable Platform Laws

```
┌────────────────────────────────────────────────────────┐
│             THE 10 INVIOLABLE BHALYAM LAWS             │
├────────────────────────────────────────────────────────┤
│ 1. NEVER use `any` in TypeScript.                      │
│ 2. NEVER compute game logic locally on the client.     │
│ 3. NEVER ship a game without Dual Layouts (§6).        │
│ 4. NEVER invent ad-hoc styles outside the DLS.         │
│ 5. NEVER render blank or raw "Loading..." states.      │
│ 6. NEVER bypass WCAG 2.1 AA keyboard/screen reader checks│
│ 7. NEVER trust unvalidated client broadcasts.          │
│ 8. NEVER introduce Redis or external DB in game loops. │
│ 9. NEVER leak memory from untorn-down timers/listeners│
│ 10. NEVER commit code without 100/100 on Quality Gates │
└────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Rule Specifications

### Rule 1: Strict Zero-`any` Type Safety
- Every function parameter, return type, state interface, and event payload must be strictly typed.
- Use `unknown` with runtime type narrowing for arbitrary payloads.

### Rule 2: Absolute Server Authority
- The server computes: card deals, dice rolls, valid move validation, captures, turn transitions, time-outs, and win standings.
- The client only computes: local UI animations, haptic triggers, and optimistic UI transitions that roll back on server rejection.

### Rule 3: Mandatory Dual Layouts (§6)
- Every game must implement `<Game>BoardMobile.tsx` and `<Game>BoardDesktop.tsx` under `client/src/games/<game>/`.
- The mobile layout must be thumb-friendly with >= 44px touch targets.
- The desktop layout must utilize extra screen real estate for wide boards and persistent side panels.

### Rule 4: Design Language System Adherence
- All UI colors, typography scales, surface paddings, button variants, and glowing auras must be imported from `client/src/design-system/dls/` and `client/src/design-system/premium/`.

### Rule 5: Triple State Guarantee (Loading, Empty, Error)
- Every view, panel, and data-bound component must provide:
  - An animated `SkeletonLoader` for initial fetching.
  - An actionable `EmptyStateIllustration` when data is empty.
  - A retryable `PremiumErrorState` when requests fail.

### Rule 6: Full Accessibility Compliance
- Interactive controls must have `:focus-visible` golden focus rings, minimum 4.5:1 text contrast, and descriptive `aria-label`s on icon buttons.

### Rule 7: Closed-Set Broadcast Sanitization
- Avatars, chat reactions, and room custom names must be sanitized on the server before broadcasting to opponents.

### Rule 8: Zero Heavy Infrastructure Overhead
- Room states, turn timers, and matchmaking live in `RoomManager`'s in-memory engine. No external Redis cluster is needed or permitted.

### Rule 9: Resource Leak Prevention
- All intervals, animation frames, and socket subscriptions must be disposed of in `useEffect` return functions or registered with `CleanupRegistry`.

### Rule 10: 100/100 Quality Gate Verification
- Every code change must verify:
  ```bash
  npm run typecheck       # 0 errors
  npm test                # 100% passing test files
  npm run release:check   # Score: 100 / 100 — Decision: GO
  npm run enterprise:check# Score: 100 / 100 — Decision: CERTIFIED_FOR_PRODUCTION
  ```
