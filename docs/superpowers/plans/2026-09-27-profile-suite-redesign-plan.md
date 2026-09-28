# BHALYAM Profile Suite Redesign — Implementation Plan

**Design source:** `docs/superpowers/specs/2026-09-27-profile-suite-redesign-design.md`  
**Execution rule:** Test first, preserve unrelated work, do not commit.

## Phase 1 — Lock routing and shell behavior with failing tests

1. Add route tests for the four canonical destinations and five legacy redirects.
2. Add shell tests covering four navigation items, active route state, identity rendering, and 44px control classes.
3. Add query/hash behavior tests for `?edit=profile` and `#mastery`.
4. Run the focused tests and confirm they fail for the expected current six-route behavior.

## Phase 2 — Establish the shared profile visual system

1. Create typed, theme-aware profile primitives for metric tiles, section frames, progress bars, result badges, resource states, and route headings.
2. Refactor the profile shell into a mobile-first identity masthead plus four-item route rail.
3. Replace hard-coded page colors with reusable DLS/profile semantic classes and CSS variables.
4. Preserve light and dark modes, safe-area spacing, keyboard focus rings, and reduced-motion behavior.

## Phase 3 — Refactor the persistent controller

1. Keep `ProfileFamilyLayout` as the shared owner of identity, requests, and edit/avatar dialogs.
2. Replace the single loading flag with independently typed profile, stats, achievements, and recent-match resource states.
3. Use partial-failure handling so one failed endpoint does not blank the suite.
4. Remove invented server-owned fallback facts.
5. Implement `?edit=profile` compatibility behavior.

## Phase 4 — Rebuild Career HQ

1. Compose real-data career metrics, mastery, recent battles, achievement preview, and account actions.
2. Fold statistics into the `#mastery` section.
3. Fold personal information into the shared editor and compact account utility section.
4. Add mobile 2x2 metrics and desktop 12-column composition.
5. Add honest loading, empty, error, and partial states.

## Phase 5 — Rebuild Battle Archive

1. Retain the existing history endpoint and detail endpoint behavior.
2. Replace the page with mobile summary cards, filter sheet/rail, concise match rows, and responsive detail dialog.
3. Preserve retry, filtering, participant data, and timeline metadata.
4. Keep result semantics text-based in addition to color.

## Phase 6 — Rebuild Achievement Vault

1. Implement the completion summary and accessible category rail.
2. Replace emoji-heavy category chrome with approved stroke icons.
3. Render unlocked, in-progress, and locked achievement states from authoritative data.
4. Retain the accessible reveal/detail modal.

## Phase 7 — Rebuild Scorecard Records

1. Keep scorecard fetching route-local through `useScorecardStore`.
2. Replace the spinner with shape-matched skeletons and the error block with the shared retry state.
3. Wrap the existing record deck in the new route heading and responsive system.
4. Preserve genuine personal-best reveal behavior.

## Phase 8 — Route migration and cleanup

1. Remove `PersonalInformationPage` and `GameStatisticsPage` from canonical routing.
2. Add compatibility redirects to query/hash targets.
3. Reduce the profile route rail to four items.
4. Update internal profile links and breadcrumbs.
5. Remove obsolete imports/components only when no longer referenced.

## Phase 9 — Verification and finish pass

1. Run focused profile tests after each phase.
2. Run client typecheck and full client tests.
3. Run full workspace typecheck and tests.
4. Build the client and run rendered mobile-layout and accessibility checks.
5. Inspect all four routes at 320, 375, 768, 1024, and 1440px in light and dark themes.
6. Run release and enterprise gates; document pre-existing failures separately.
7. Audit the final diff for fake data, forbidden icons, arbitrary colors, missing focus states, and unrelated edits.

## Primary files

- `client/src/App.tsx`
- `client/src/components/layout/ProfileFamilyLayout.tsx`
- `client/src/components/layout/ProfileLayout.tsx`
- `client/src/pages/ProfileOverviewPage.tsx`
- `client/src/pages/MatchHistoryPage.tsx`
- `client/src/pages/AchievementsPage.tsx`
- `client/src/pages/ScorecardsPage.tsx`
- `client/src/features/profile/*`
- profile-focused tests under `client/src/**/__tests__/`
- `client/src/index.css` or the DLS token layer only if semantic profile roles are missing

## Completion definition

The plan is complete when the four canonical routes ship with one cohesive mobile-first shell, full theme parity, truthful resource states, legacy URL compatibility, accessible interactions, passing tests, and verified rendered layouts.
