# BHALYAM Engineering Operating System (EOS) & AI Thinking Framework

> **Document Type:** Core Reasoning & Decision Engine  
> **Mandatory For:** All AI agents, coding assistants, code reviewers, and software engineers working on BHALYAM.  
> **Primary Objective:** Generate production-grade, long-lasting architectural solutions that remain maintainable, scalable, accessible, performant, and secure for 10+ years. Never sacrifice architectural integrity for implementation speed.

---

## 1. Multi-Persona Cognitive Engine

Before proposing, writing, or refactoring code in BHALYAM, every agent must evaluate the request through the simultaneous cognitive lenses of seven senior engineering roles:

1. **Principal Software Architect**: Evaluates system boundaries, state ownership, event sourcing integrity, deterministic state machines, and long-term coupling.
2. **Staff Frontend Architect**: Evaluates React 18 component composition, hook ergonomics, state lifecycle predictability, bundle budget isolation, and TypeScript strictness.
3. **Product & Gaming UX Designer**: Evaluates player delight, feedback latency (<50ms perception), tactile haptic responses, audio-visual synchrony, and cognitive load.
4. **Accessibility (A11y) Specialist**: Evaluates WCAG 2.1 AA compliance, keyboard navigation, focus trap containment, aria landmarks, color contrast ratios, and screen reader announcements.
5. **Security & Vulnerability Reviewer**: Evaluates payload injection sanitization, client-side trust boundaries, cryptographic seat tokens, prototype pollution, and sensitive data leakage.
6. **Performance & Latency Engineer**: Evaluates re-render counts, 60/120fps CSS transforms, layout thrashing, asset compression, memory leak prevention, and low-end mobile hardware support.
7. **QA & Chaos Reliability Specialist**: Evaluates disconnect storms, server restart recoveries, timer skew, race conditions, edge-case failure modes, and automated regression coverage.

---

## 2. Mandatory 11-Phase Execution Framework

Every coding task must strictly progress through these 11 phases in chronological order.

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 11-PHASE AI ENGINEERING THINKING ENGINE                │
  └────────────────────────────────────────────────────────────────────────┘
     │
     ├─► Phase 1: Requirement & Constraint Analysis
     ├─► Phase 2: System Impact & Architecture Review
     ├─► Phase 3: UX & Player Interaction Analysis
     ├─► Phase 4: Accessibility (A11y) Review
     ├─► Phase 5: Responsive & Cross-Device Review
     ├─► Phase 6: Edge Case & Chaos Analysis
     ├─► Phase 7: Security & Boundary Review
     ├─► Phase 8: Performance & Render Budget Review
     ├─► Phase 9: Scalability & 10-Year Maintainability
     ├─► Phase 10: Production Readiness & Quality Gates
     └─► Phase 11: Adversarial Self-Critique
```

---

### Phase 1: Requirement & Constraint Analysis
Before proposing any code change:
- **Deconstruct Intent**: Identify the underlying player problem versus the surface-level symptom.
- **Differentiate Scope**: Clearly demarcate functional requirements (game rules, scoring, social actions) from non-functional requirements (p99 latency < 50ms, bundle size impact < 15kB, mobile viewport bounds 320px–1440px).
- **Enforce Constraints**:
  - Zero external database connections in game loop (in-memory state in `RoomManager`).
  - Zero Redis dependencies.
  - Zero arbitrary ad-hoc CSS colors (strictly use BHALYAM DLS design tokens).
  - Strict TypeScript with no `any` bypasses.

### Phase 2: System Impact & Architecture Review
Analyze the ripple effect across the entire repository:
- **Shared Type Contracts**: Does `shared/types.ts` require updates? Are server and client types synchronously mapped?
- **Server Authority**: Does the client attempt to compute game rules locally? *(Rule: Server is 100% authoritative; client only renders state and dispatches user actions).*
- **State Store Impact**: Does this touch `useRoomStore`, local React state, or singletons (`AudioManager`, `HapticsManager`)?
- **Backward Compatibility**: Will active matches or disconnected players with valid `seatToken`s break during state hydration?

### Phase 3: UX & Player Interaction Analysis
Audit the interaction loop:
- **Feedback Immediate Perception**: Every tap/click must trigger visual feedback (spring micro-motion, active scale, audio cue) within 1 frame (<16ms).
- **Empty & Loading States**: Never leave raw text `"Loading..."` or blank containers. Always provide animated `SkeletonLoader` or gamified `EmptyStateIllustration`.
- **Error Recovery Paths**: Errors must never leave dead ends. Provide informative gaming copy and actionable retry buttons (`PremiumErrorState`).

### Phase 4: Accessibility (A11y) Review
- **Contrast Ratios**: Normal text >= 4.5:1, large text/badges >= 3:1 against dark surfaces (`#070B14`, `#0E1526`).
- **Focus Visibility**: All interactive controls must support visible 2px gold focus ring on `:focus-visible`.
- **Keyboard Traversal**: Modals, sheets, and board games must support complete `Tab`, `Shift+Tab`, `Escape`, and `Enter`/`Space` navigation.
- **Screen Reader Clarity**: Icon-only buttons must declare descriptive `aria-label` or `sr-only` text.

### Phase 5: Responsive & Cross-Device Review
Verify rendering across all 9 target tiers:
- **320px (iPhone SE 1st/2nd Gen)**: No horizontal overflow, text truncated with ellipsis, tight padding.
- **360px–430px (Standard Android / iPhone Pro Max)**: Minimum 44x44px touch targets, notch/Dynamic Island safe area padding (`.pt-safe`, `.pb-safe`).
- **768px–1024px (Tablets / Foldables)**: Split-screen ergonomics, multi-column cards.
- **1024px+ (Desktop Gaming Lounges)**: Dedicated desktop board layouts (`*BoardDesktop.tsx`), side chat rails, keyboard shortcuts.

### Phase 6: Edge Case & Chaos Analysis
Identify and address unpredictable runtime scenarios:
- **Network Glitches**: Sudden packet drop, tab sleep/backgrounding, WebSocket reconnection storms.
- **Race Conditions**: Two players clicking dice/cards simultaneously; rapid double-clicking.
- **Abnormal Input**: Extremely long usernames (>30 chars), unicode emojis in chat, room codes with invalid formatting.
- **Timer Skew**: Player device clock drifting behind/ahead of server timestamp.

### Phase 7: Security & Boundary Review
- **Payload Sanitization**: Reject illegal moves, malformed payloads, and out-of-bounds array indices on the server.
- **Closed-Set Validation**: Avatars, reactions, and game options must be validated against closed sets (`ALLOWED_REACTIONS`, `sanitizeAvatar`).
- **Token Integrity**: Seats authenticated via cryptographic HMAC `seatToken`.
- **XSS Prevention**: Never render raw unescaped HTML.

### Phase 8: Performance & Render Budget Review
- **Render Hygiene**: Memoize expensive calculations (`useMemo`), stable callbacks (`useCallback`), and avoid re-rendering entire game boards on isolated timer ticks.
- **Bundle Budgets**: Large sub-games (Hand Cricket, Uno, Ludo, Space War) must remain code-split via `React.lazy()`.
- **Memory & Timer Leaks**: All `setInterval`, `setTimeout`, event listeners, and socket subscriptions must be cleaned up in effect return functions or `CleanupRegistry`.

### Phase 9: Scalability & 10-Year Maintainability
- **Modularity**: New games implement standard `GameEngine` interface on server and dual-layout (`*BoardMobile` / `*BoardDesktop`) on client.
- **Zero Monoliths**: Keep components modular, focused, and under 400 lines where feasible.
- **Self-Documenting Code**: Document architectural decisions, edge-case rationale, and lifecycle transitions with comprehensive JSDoc block comments.

### Phase 10: Production Readiness & Quality Gates
Before declaring work complete, verify:
- `npm run typecheck` (0 errors across workspace).
- `npm test` (all server and client tests passing).
- `npm run release:check` (100 / 100 score).
- `npm run enterprise:check` (100 / 100 score).

### Phase 11: Adversarial Self-Critique Phase
Before outputting final responses or merging code, the agent must run an adversarial internal audit answering:
1. *What did I assume that I haven't explicitly verified?*
2. *Will this break on a 320px iPhone SE screen with the virtual keyboard open?*
3. *What happens if the server restarts mid-round?*
4. *Did I introduce any ad-hoc styling instead of DLS design tokens?*
5. *Are all interactive elements accessible via keyboard and screen readers?*
6. *Is there any potential for memory leakage on unmount?*

---

## 3. Mandatory Output Validation Checklist

Every agent response must pass this checklist before completion:
- [ ] TypeScript strict mode satisfied (0 errors).
- [ ] No `any` types or unsafe type assertions.
- [ ] All touch targets >= 44x44px on mobile viewports.
- [ ] Safe area padding applied for notched devices.
- [ ] Mobile (<768px) and Desktop (>=1024px) layouts verified.
- [ ] Skeleton loaders and empty state illustrations implemented.
- [ ] Tests written and passing for all newly introduced logic.
- [ ] Both quality gates (`release:check` and `enterprise:check`) verified at 100/100.
