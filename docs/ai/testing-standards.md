# BHALYAM Testing & Quality Assurance Standards

> **Runner:** Vitest 1.x (Strict ESM + Fast Execution)  
> **Coverage Goal:** Statement >= 85% • Branch >= 80% • Function >= 85% • Line >= 85%
> **Measured 2026-08-18:** server 79.37 / 76.57 / 76.86 / 79.37 — **below goal**.
> client **9.64** / 57.77 / 35.22 / **9.64** — **far below goal**. Enforced floors are
> set at the measured baseline and ratchet upward; the goal above is the target,
> not the current state. Do not read a passing coverage gate as meeting it.  
> **Policy:** Zero skipped tests (`.skip`), zero focused tests (`.only`), 100% clean test passes.

---

## 1. Testing Pyramid & Structure

```
┌────────────────────────────────────────────────────────┐
│ 1. Enterprise Verification Gates (enterprise:check)    │
├────────────────────────────────────────────────────────┤
│ 2. Rendered browser suites (real Chromium, measured):  │
│    • client/scripts/mobile-layout/runner.mjs           │
│    • client/scripts/accessibility/runner.mjs           │
│    • scripts/persistence/verify{Schema,Durability}.mjs │
├────────────────────────────────────────────────────────┤
│ 3. Integration & Room Lifecycle Tests (RoomManager)    │
├────────────────────────────────────────────────────────┤
│ 4. Deterministic Game Engine Unit Tests (Engine.test)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Test Authoring Guidelines

1. **Deterministic Game Engine Tests (`server/src/games/<game>/__tests__/`)**:
   - Test move legality validation (`validateMove`).
   - Test state mutations (`applyMove`).
   - Test win conditions and tie-breakers (`checkGameOver`).
   - Test automated bot moves (`applyAutoMove`).
2. **Component & UI Tests (`client/src/**/__tests__/`)**:
   - Verify component rendering with default and edge-case props.
   - Verify empty states and skeleton loaders.
   - Verify accessibility labels (`aria-label`, `role="dialog"`, `aria-live`).
3. **Responsive & accessibility verification — RENDERED, never asserted**:

   `client/src/__tests__/mobileCertification.test.ts` was **deleted** on
   2026-08-18. It imported no page and no component: it asserted that the
   literal `44` in its own table was `>= 44`, and that `320 / 568` fell between
   0.35 and 2.2. It could not fail for any product reason, and it was named a
   "Certification Suite". Do not recreate that pattern.

   Replacements, both measuring a real render in real Chromium:

   - **`npm run check:mobile-layout`** — 9-width matrix (320→1440) plus landscape
     and keyboard-open, measuring `getBoundingClientRect` for touch targets,
     horizontal overflow, clipping, and reachability via Playwright actionability.
   - **`npm run check:a11y-rendered`** — axe-core against the rendered DOM, both
     themes, with keyboard traversal and focus-indicator measurement. Contrast
     ratios are **computed from resolved colours**, which source scanning cannot do.

   A viewport assertion that does not measure a rendered rectangle is not a test.

---

## 3. Quality Gate Enforcement Commands

Before submitting code or declaring a milestone complete, run:
```bash
# 1. Type Safety Check
npm run typecheck

# 2. Complete Test Suite Execution
npm test

# 3. Release Readiness Quality Gate
npm run release:check

# 4. Full Enterprise Production Verification
npm run enterprise:check
```
Both `release:check` and `enterprise:check` MUST return **100 / 100 score** with **GO / CERTIFIED** decisions.

> **Read those two scores narrowly.** They aggregate typecheck, unit tests,
> bundle budgets, the a11y *source scan* and dependency governance. They do
> **not** include persistence durability, rendered accessibility, mobile layout
> measurement, or coverage thresholds — all of which are separate gates
> (`check:persistence`, `check:a11y-rendered`, `check:mobile-layout`,
> `--coverage`). On 2026-08-18 both reported `CERTIFIED_FOR_PRODUCTION` while the
> Room screen was unaudited, modal focus trapping unverified, and client
> statement coverage was 9.64%. A 100/100 here means the gates it covers passed;
> it is not a production verdict. Run the full set:
>
> ```bash
> npm run check:persistence && npm run check:mobile-layout && npm run check:a11y-rendered
> ```
