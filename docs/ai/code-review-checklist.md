# BHALYAM Comprehensive Code Review Checklist

> **Mandatory Review Gate:** Every pull request, code modification, or AI-generated artifact must be verified against this checklist before merging.

---

## 1. UX & Interaction Excellence
- [ ] Visual feedback provided within 16ms (< 1 frame) on user interaction.
- [ ] No raw `"Loading..."` text; `SkeletonLoader` utilized for loading states.
- [ ] No blank empty containers; `EmptyStateIllustration` provided with actionable CTAs.
- [ ] Error messages use `PremiumErrorState` with retry pathways.
- [ ] Microcopy uses energetic gaming terminology (*"Claim Identity"*, *"Scout Tournament"*, *"Starter Missions"*).

## 2. Accessibility & Ergonomics (WCAG 2.1 AA)
- [ ] All interactive buttons and touch targets measure at least **44 × 44 px** on mobile.
- [ ] Safe area insets (`.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe`) applied for notches.
- [ ] `:focus-visible` golden 2px focus ring enabled on all interactive elements.
- [ ] Icon-only buttons declare explicit `aria-label` or `.sr-only` descriptive labels.
- [ ] Contrast ratios meet minimum 4.5:1 (normal text) and 3:1 (large text / badges).
- [ ] Dialogs trap keyboard focus and dismiss gracefully on `Escape`.

## 3. Responsive Layouts & Breakpoints
- [ ] Verified across the 9-device matrix (320px, 360px, 375px, 390px, 412px, 430px, 768px, 1024px, 1440px).
- [ ] Layout verified with virtual keyboard open (usable height > 400px).
- [ ] Horizontal scrollable elements use `.touch-pan-x` and display swipe indicators.
- [ ] Board games implement both dedicated Mobile (`*BoardMobile.tsx`) and Desktop (`*BoardDesktop.tsx`) layouts.

## 4. Architecture & State Discipline
- [ ] Server remains 100% authoritative for all game rules, moves, and standings.
- [ ] TypeScript strict mode satisfied with **zero `any` types**.
- [ ] Shared type contracts synchronized in `@shared/types.ts`.
- [ ] Game engines implement pure, deterministic state transitions.
- [ ] No duplicate derived state stored in React `useState`.

## 5. Performance & Resource Cleanup
- [ ] No layout-triggering properties animated; only `transform` and `opacity` used.
- [ ] All `setInterval`, `setTimeout`, and event subscriptions cleaned up in unmount hooks.
- [ ] Large boards and admin views lazily loaded with `React.lazy()`.
- [ ] Initial client bundle remains under budget (<220kB gzip).

## 6. Security & Payload Validation
- [ ] Client input sanitized and validated on server before broadcasting.
- [ ] Player avatars validated through `sanitizeAvatar`.
- [ ] Cryptographic `seatToken`s verified on reconnection.
- [ ] No sensitive authentication tokens or passwords stored in `localStorage` or printed to console.

## 7. Testing & Quality Gates Verification
- [ ] `npm run typecheck` passes with **0 errors**.
- [ ] `npm test` passes 100% of unit and integration tests.
- [ ] `npm run release:check` yields **100 / 100 — Decision: GO**.
- [ ] `npm run enterprise:check` yields **100 / 100 — Decision: CERTIFIED_FOR_PRODUCTION**.
