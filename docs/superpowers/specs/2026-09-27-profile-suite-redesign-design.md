# BHALYAM Profile Suite Redesign

**Date:** 2026-09-27  
**Status:** Approved design; awaiting specification review before implementation planning  
**Scope:** All routes under `/profile`  
**Primary audience:** Mobile players, with tablet and desktop treated as full-priority experiences

## 1. Intent

Rebuild the profile suite as a coherent, premium gaming product rather than a collection of individually styled dashboard pages. The new experience must feel intense and colorful without becoming a noisy science-fiction HUD or a toy-like arcade skin.

The approved visual direction combines:

- the disciplined information architecture of a professional tournament broadcast;
- the intensity and clarity of a tactical arena interface;
- selective, functional color drawn from premium arcade presentation.

The redesign must preserve truthful player data, accessible interaction, theme parity, responsive quality, and route compatibility.

## 2. Goals

1. Create one recognizable profile system across overview, matches, achievements, and scorecards.
2. Make the mobile experience excellent from 320px upward while using desktop space deliberately at 1024px and above.
3. Support purpose-built light and dark themes on every route and state.
4. Reduce route and navigation clutter without removing user capabilities.
5. Present only real server-backed or explicitly device-local information.
6. Establish reusable profile primitives that prevent style drift between routes.
7. Preserve WCAG 2.1 AA behavior, 44px mobile targets, reduced-motion support, and keyboard completeness.
8. Keep the initial bundle within current budgets and avoid adding dependencies unless implementation exposes a specific gap.

## 3. Non-goals

- No changes to game rules, room authority, matchmaking, or economy behavior.
- No new rank, league, season, reward, latency, or social-presence system.
- No fabricated performance insights derived from absent data.
- No new profile API solely to support decorative UI.
- No duplicate mobile and desktop business logic.
- No generic third-party component theme layered over BHALYAM's design language.

## 4. Information Architecture

The profile suite is reduced from six destinations to four.

| Route | Product responsibility |
| --- | --- |
| `/profile` | Career HQ: identity, career metrics, game mastery, recent matches, achievement progress, and profile editing. |
| `/profile/matches` | Searchable and filterable battle archive with match details. |
| `/profile/achievements` | Achievement vault with category filters, completion progress, and locked/unlocked details. |
| `/profile/scorecards` | Game-by-game personal records, best scores, and recorded score history. |

### Compatibility redirects

Existing bookmarks and internal links remain valid:

- `/profile/overview` redirects to `/profile`.
- `/profile/personal` redirects to `/profile?edit=profile`.
- `/profile/statistics` redirects to `/profile#mastery`.
- `/profile/stats` redirects to `/profile#mastery`.
- `/profile/history` redirects to `/profile/matches`.

The overview route must respond to `?edit=profile` by opening the profile editor after member and identity state are ready. The `#mastery` target must receive focus or be scrolled into view after navigation without disorienting keyboard or screen-reader users.

## 5. Visual Language

### 5.1 Foundation

The suite uses a structured broadcast grid with strong alignment, restrained borders, and clear typographic hierarchy. Energy comes from accent rails, progress signals, result colors, and short interaction motion—not from filling every surface with gradients or glow.

Core characteristics:

- Persistent identity masthead with avatar, display name, verified profile facts, and edit actions.
- Four-item route rail below the masthead.
- Compact metric tiles arranged as a 2x2 mobile grid and four-column desktop strip.
- Dense but readable content modules with a consistent header, accent marker, supporting metadata, and action placement.
- One primary accent per semantic domain:
  - gold for identity and primary profile actions;
  - cyan for mastery and performance;
  - violet for achievements;
  - coral for records and exceptional states;
  - green, red, and blue for win, loss, and draw, always paired with text or icons.

No route may present decorative claims such as “Pro League,” invented ping, fictional online status, or unsupported progression.

### 5.2 Typography

- Display typography is reserved for the player name and the principal page title.
- Section headings use compact uppercase or high-weight labels with controlled tracking.
- Body and metadata remain highly legible at mobile sizes.
- Numeric metrics use tabular figures.
- Labels do not rely on all-caps at long lengths.

### 5.3 Iconography

- Use Lucide or existing BHALYAM stroke icons for interface chrome.
- Never use `Sparkles`.
- Use `Trophy`, `Medal`, `Award`, or `ShieldCheck` for achievements.
- Decorative emoji must not be introduced into neutral UI chrome.
- Existing achievement content icons may be displayed only when they come from the authoritative achievement definition; the surrounding controls remain stroke-icon based.

## 6. Theme System

Both themes share semantic roles and component geometry. Theme switching changes the material treatment, not the information hierarchy.

### Light theme

- Warm porcelain and parchment-derived page surfaces.
- White or lightly tinted elevated cards.
- Deep brown-black or ink text with WCAG AA contrast.
- Gold identity anchors with cyan, violet, and coral accents used selectively.
- Soft shadows with visible borders; no washed-out cream-on-gold combinations.

### Dark theme

- Obsidian page depth and navy elevated surfaces.
- Light neutral text with deliberately brighter muted text than the current low-contrast slate treatment.
- The same semantic accents at dark-theme-safe luminance.
- Glow limited to active indicators, focus, or exceptional progress; no ambient glow on every card.

### Token requirement

Profile components consume or extend the existing DLS and CSS custom-property system. Page markup must not accumulate arbitrary color literals. If a missing semantic role is discovered, add it once as a profile token and use that token across all routes and both themes.

## 7. Responsive Composition

### 7.1 Mobile: 320px–767px

Mobile is the primary design target.

- Single-column reading order.
- Compact, vertically stacked identity masthead.
- Four-route navigation remains visible in a sticky horizontal rail beneath the masthead. Labels may shorten to `Home`, `Matches`, `Trophies`, and `Scores` while accessible names retain the full labels.
- Career metrics form a 2x2 grid.
- Primary content precedes secondary insights; no critical content is hidden behind hover.
- Filters open in a bottom sheet where the inline control set would crowd the viewport.
- Match and achievement details open as full-width bottom sheets.
- All interactive controls measure at least 44x44px.
- Safe-area padding is applied at the page and sheet boundaries.
- Horizontal overflow is prohibited except for deliberately scrollable filter or navigation rails with visible affordance.

### 7.2 Tablet: 768px–1023px

- Identity remains compact but uses a wider horizontal arrangement when space permits.
- Metric tiles may remain 2x2 or become four columns based on measured readability.
- Content uses one or two columns according to the route rather than stretching mobile cards.
- Sheets may remain mobile-style on narrower tablets and become dialogs on wider tablets.

### 7.3 Desktop: 1024px+

- A deliberate 12-column dashboard.
- Full identity masthead with persistent edit action.
- Four-column metric strip.
- Primary analytics occupy approximately eight columns; recent activity, trophy preview, or controls occupy four.
- Match filters remain visible in a toolbar or side rail.
- Detail views use centered dialogs with constrained readable widths.
- Hover feedback supplements but never replaces keyboard or pointer-independent interaction.

## 8. Route Designs

### 8.1 Career HQ: `/profile`

Content order:

1. Identity masthead.
2. Route rail.
3. Career metric grid: total matches, win rate, achievements unlocked, best win streak.
4. Game mastery section derived from `PlayerStats.perGame`.
5. Recent battles preview using actual match history.
6. Achievement progress preview.
7. Account and privacy actions in a visually quieter utility section.

Statistics currently presented on `/profile/statistics` move into this route. Profile editing currently presented on `/profile/personal` moves into an accessible edit sheet/dialog launched from the masthead or the compatibility query parameter.

When no matches exist, the mastery and history sections render honest empty states with an action to explore games. Zero values are displayed as zero; absent responses are not replaced with invented activity.

### 8.2 Battle Archive: `/profile/matches`

Mobile:

- Summary strip for total matches, wins, win rate, and total play time.
- Compact game/result filter trigger opening a bottom sheet.
- Chronological match cards optimized for scan speed.
- Detail bottom sheet containing participants, result, duration, room code, and authoritative timeline counts when available.

Desktop:

- Summary strip and persistent filter toolbar.
- Denser list or table-like card rows with clear result, game, opponent/participants, duration, and timestamp columns.
- Centered detail dialog.

Pagination or load-more behavior follows the current API capability. The redesign must not imply replay availability unless `replayAvailable` is true.

### 8.3 Achievement Vault: `/profile/achievements`

Content order:

1. Completion summary with unlocked count and percentage.
2. Category filters: all, progression, skill, resilience, and social.
3. Achievement grid ordered with unlocked items first, followed by in-progress items and then locked items.
4. Achievement detail sheet/dialog.

Cards show title, description, progress, target, and unlock state. Color never communicates state alone. Locked items remain readable and accessible rather than being obscured by excessive blur or opacity.

Achievement copy and progress come from the authoritative catalog and server response. The redesign does not add new achievements or promise rewards.

### 8.4 Scorecard Records: `/profile/scorecards`

Content order:

1. Scorecard summary using the authoritative archive.
2. Game selector or card rail listing only games represented by scorecard data plus supported empty categories where useful.
3. Selected-game personal best card.
4. Recorded score list or trend visualization if the archive provides enough points.
5. Personal-best reveal modal retained for genuine new records.

Mobile uses a horizontally scrollable selector and vertically stacked record cards. Desktop uses a selector rail and wider record workspace. Charts require accessible text equivalents and must not be added when the data shape cannot truthfully support a trend.

## 9. Component Architecture

### Shared controller

`ProfileFamilyLayout` remains the persistent route controller and owns:

- member gating;
- identity resolution;
- profile, statistics, achievements, and recent-match requests;
- resource loading and error state;
- edit-profile and avatar-dialog state;
- compatibility-query behavior;
- the outlet context.

The controller should expose independently typed resource states rather than one ambiguous `loading` boolean. A suitable model is a discriminated union for each resource: `idle`, `loading`, `ready`, or `error`.

### Shared shell

A focused `ProfileShell` or refactored `ProfileLayout` owns:

- page atmosphere and theme tokens;
- identity masthead;
- route rail;
- content width and responsive gutters;
- route transition boundary;
- skip/focus target for page content.

It must not fetch data or contain page-specific metrics.

### Shared primitives

Expected focused primitives include:

- `ProfileIdentityMasthead`
- `ProfileRouteRail`
- `ProfileMetricTile`
- `ProfileSection`
- `ProfileProgressBar`
- `ProfileFilterRail`
- `ProfileResourceState`
- `MatchSummaryRow`
- `AchievementTile`
- `ScorecardRecordPanel`

Names may adapt to existing conventions, but each unit must have one clear responsibility and explicit typed props. Large route components should remain under 400 lines where feasible.

### Route composition

The four page components own only their route-specific composition and local UI state such as filters or selected detail records. Derived metrics use `useMemo`; no derived server data is duplicated into local state.

## 10. Data Flow and Truthfulness

1. `usePlayerId` resolves the effective identity.
2. `ProfileFamilyLayout` requests the existing profile, statistics, achievement, and recent-match resources.
3. Responses are narrowed to shared TypeScript contracts.
4. Each resource updates independently so a matches failure does not erase identity or achievements.
5. The outlet context exposes typed resource states and modal actions.
6. Route pages derive display values from the ready resources.
7. Scorecards continue through `useScorecardStore` and load only on the scorecards route.

Fallback policy:

- Local identity may supply the current display name and avatar when the member profile request is unavailable.
- Server-owned fields such as joined date, level, experience, match metrics, and achievement progress must not receive plausible-looking invented defaults.
- Empty server responses render explicit empty states.
- Network failures render retryable errors while preserving any successfully loaded sections.

Profile edits retain the existing persistence boundary: display name and avatar are server-backed; bio and region remain clearly labeled as device-local unless the backend contract changes separately.

## 11. Loading, Empty, Error, and Partial-Failure States

Every data-bound module supports:

- a shape-matched skeleton on initial load;
- an actionable empty state when the resource is valid but contains no records;
- a retryable error state when the resource request fails;
- a stale/partial presentation when other resources remain available.

The route shell and navigation remain mounted during resource transitions. Switching profile routes must not refetch the same shared resources or flash the entire layout.

Error copy must be concise, non-technical, and must not expose internal paths, IDs belonging to other users, or stack traces.

## 12. Interaction and Motion

- Use existing Framer Motion presets or DLS motion tokens.
- Animate only opacity and transform.
- Route content transitions are short and subordinate to navigation response.
- Button/tile presses provide immediate visual feedback without blocking navigation.
- Progress fills may animate once when first revealed, but must start at the correct semantic value and respect reduced motion.
- Achievement and personal-best celebration effects run only for genuine unlock/record events and are disabled or reduced under `prefers-reduced-motion`.
- All timers, listeners, and animation resources are cleaned up on unmount.

No new UI or animation dependency is planned. Existing React, Framer Motion, Recharts, Radix primitives, Lucide, and DLS components cover the approved design.

## 13. Accessibility

- Semantic landmarks: one page `main`, labeled profile navigation, labeled sections, native buttons and links.
- Route changes move focus to the page heading or primary content target without stealing focus during ordinary re-renders.
- Every icon-only control has an accessible name.
- Route navigation uses `aria-current="page"`.
- All filters are keyboard operable; selected state is exposed programmatically.
- Dialogs and sheets use the shared modal foundation with focus trap, Escape handling, focus restoration, and accessible names.
- Result, unlock, and progress states include text or icon semantics in addition to color.
- Text and UI contrast meet WCAG 2.1 AA in both themes.
- Browser zoom to 200% must not clip controls or create page-level horizontal overflow.
- Touch targets measure at least 44x44px.
- Reduced motion is honored in CSS and JavaScript animation.

## 14. Performance and Bundle Strategy

- Preserve route-level lazy loading already present in `App.tsx`.
- Do not import scorecard-heavy components into shared profile entry code.
- Keep profile resource subscriptions granular.
- Memoize only measured or clearly non-trivial derived lists and calculations.
- Do not subscribe pages to entire Zustand stores.
- Avoid expensive blur layers on large mobile surfaces.
- Decorative background effects must be pointer-inert and bounded to prevent scrolling or paint issues.
- No additional dependency is approved by this design.

## 15. Routing and Migration

1. Replace the six-tab route list with four canonical routes.
2. Add the compatibility redirects defined in Section 4.
3. Move statistics composition into the overview route.
4. Move personal editing into the shared edit sheet/dialog.
5. Remove obsolete route page implementations only after imports, tests, and internal links are migrated.
6. Preserve current API contracts and storage keys.
7. Update breadcrumbs and any profile deep links to canonical paths.

The migration must not break browser back/forward behavior or direct navigation to legacy URLs.

## 16. Testing Strategy

Implementation follows test-first development.

### Component and route tests

- Four canonical routes render inside the persistent shared shell.
- Legacy routes redirect to the correct canonical destination.
- `/profile?edit=profile` opens the editor after identity readiness.
- `/profile#mastery` reveals and focuses the mastery section appropriately.
- Shared resources are not refetched solely because the nested route changes.
- Each route renders loading, empty, error, partial-failure, and ready states.
- Metrics render only from provided data and never show invented defaults.
- Light and dark theme semantics render on all four routes.
- Filter controls, tabs, dialogs, and sheets are keyboard operable.
- Icon-only controls have accessible names.
- Achievement and match states do not rely on color alone.
- Profile editing preserves server-backed versus device-local persistence behavior.

### Browser verification

Visually inspect all four routes at:

- 320px
- 375px
- 768px
- 1024px
- 1440px

Repeat in both light and dark themes. At minimum verify:

- no page-level horizontal overflow;
- all touch targets meet 44x44px;
- sticky navigation remains reachable;
- dialogs/sheets fit the viewport and virtual-keyboard case;
- text does not clip at 200% zoom;
- focus indicators are visible;
- reduced-motion behavior;
- mobile and desktop compositions use the approved layouts.

### Required commands

Run the repository gates relevant to this change:

```bash
npm run typecheck
npm test
npm run build:client
npm run check:mobile-layout
npm run check:a11y-rendered
npm run release:check
npm run enterprise:check
```

Report any pre-existing failures separately. Do not weaken or skip tests.

## 17. Expected Source Impact

Likely source areas include:

- `client/src/App.tsx`
- `client/src/components/layout/ProfileFamilyLayout.tsx`
- `client/src/components/layout/ProfileLayout.tsx` or its replacement
- `client/src/pages/ProfileOverviewPage.tsx`
- `client/src/pages/MatchHistoryPage.tsx`
- `client/src/pages/AchievementsPage.tsx`
- `client/src/pages/ScorecardsPage.tsx`
- obsolete personal/statistics page files after migration
- focused components under `client/src/features/profile/`
- profile and routing tests
- DLS/profile semantic tokens where existing roles are insufficient

Exact file operations belong in the implementation plan after repository-level dependency mapping.

## 18. Acceptance Criteria

The redesign is complete only when:

1. Four canonical profile routes replace the current six-destination navigation.
2. All legacy profile URLs redirect correctly.
3. Every canonical route uses the shared approved shell and visual language.
4. Mobile is polished at 320px and 375px, not merely functional.
5. Tablet and desktop layouts deliberately use their available space.
6. Both light and dark themes pass visual and rendered accessibility checks.
7. No fictional player state or product capability appears.
8. Loading, empty, error, and partial-failure states exist for every data-bound module.
9. Keyboard, focus, screen-reader, reduced-motion, and touch requirements pass.
10. Tests and required quality gates pass, with pre-existing exceptions documented honestly.

## 19. Approved Decisions

- Consolidate to four canonical routes.
- Absorb personal editing into the overview experience.
- Absorb game statistics into the overview experience.
- Use the hybrid visual direction: tournament-broadcast structure, arena intensity, selective arcade color.
- Design mobile first while treating desktop and tablet as full-priority layouts.
- Support complete light and dark themes.
- Use existing dependencies unless a concrete implementation blocker is proven.

There are no unresolved product decisions in this specification.
