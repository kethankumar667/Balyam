# Phase 5 — Trustworthy quality gates

Status: **PARTIALLY COMPLETE.** Coverage, performance and the two new gates are
done and measured. The rendered-accessibility replacement and the contrast
detector are **not done** and are listed as open.

---

## 1. Vitest coverage — real collection, thresholds set from measurement

`@vitest/coverage-v8@^1.6.1` added to both packages; V8 provider configured in
`server/vitest.config.ts` and `client/vite.config.ts` with `text-summary`,
`json-summary` and `lcov` reporters.

**Measured baseline, 2026-08-18** — statements / branches / functions / lines:

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Server | **79.37%** (20432/25740) | **76.57%** (3429/4478) | **76.86%** (794/1033) | **79.37%** |
| Client | **9.64%** (11410/118353) | **57.77%** (992/1717) | **35.22%** (348/988) | **9.64%** |

Thresholds were set **after** measuring, about a point below each figure:

```
server:  statements 78, branches 75, functions 75, lines 78
client:  statements  9, branches 55, functions 34, lines  9
```

**9% is not a typo and not a target.** It is what 444 passing client tests
across 118,353 statements actually execute, and it is the single clearest
number behind the audit's finding that the client suite mostly does not run
application code. Recording it as a floor is the point: the build now fails if
it gets worse, and raising it is real work rather than a config edit.

Both gates verified passing:

```
server: Test Files 95 passed, Tests 792 passed — coverage exit 0
client: Test Files 56 passed, Tests 444 passed — coverage exit 0
```

Reports upload as CI artifacts (`server-coverage`, `client-coverage`).

---

## 2. Performance budget guard — it could not fail; now it can

`scripts/quality-gates/performanceBudgetGuard.mjs` was **self-asserting**. Every
run starts a fresh process with an empty registry, so `snap.count` was always
0, and line 21 read:

```js
const p95 = snap.count > 0 ? snap.p95 : Math.round(budget.targetP95Ms * 0.5);
```

Half the budget — a number **invented to pass**, printed as a measurement,
under the heading *"All operations within target SLA performance budgets."*
Wiring that into CI as the brief asks would have added a step incapable of
failing, which is worse than not running it: it looks like coverage.

**Now:** the guard builds a real `RoomManager` with a stub socket layer, drives
40 room creations and joins, and lets the same `performanceMonitor.recordDuration`
calls that run in production fill the histograms. Then it evaluates.

```
- room_create: p95 = 0.11ms over 40 sample(s) (Target: <=50ms)  [PASS]
- room_join:   p95 = 0.03ms over 40 sample(s) (Target: <=50ms)  [PASS]
- move_processing:     not measured by this harness — no claim made [NOT_EXERCISED]
- turn_processing:     not measured by this harness — no claim made [NOT_EXERCISED]
- recovery_duration:   not measured by this harness — no claim made [NOT_EXERCISED]
- voice_join_duration: not measured by this harness — no claim made [NOT_EXERCISED]

✅ PASSED: 2 measured operation(s) within budget; 4 NOT exercised by this
   harness and therefore not covered by this gate.
```

Three states, deliberately distinct:

- **PASS/WARN/CRITICAL** — measured, judged against budget.
- **NO_DATA** — this harness was supposed to drive it and produced nothing.
  **Fails the gate.**
- **NOT_EXERCISED** — unreachable from a headless script (`recovery_duration`
  needs a real disconnect; `voice_join_duration` needs two browsers and a TURN
  relay). Reported, **not claimed**, does not fail.

The summary line says what was measured rather than "all operations".

---

## 3. CI — every gate can fail, and reports are artifacts

`.github/workflows/ci.yml`:

| Gate | Status |
|---|---|
| 1 — Test quality & anti-skip | unchanged |
| 2 — Bundle size budgets | unchanged |
| 3 — **Accessibility Source Scan (not a verdict)** | **renamed** |
| 4 — Dependency governance | unchanged |
| 5 — **Performance budgets** | **newly wired**, now capable of failing |
| 6 — **Mobile layout measurements** | **new**; `continue-on-error` + artifact |
| 7 — **Persistence verification receipt** | **new**; blocking on `main` only |
| 8 — Release readiness report | renumbered |

Artifacts published: `server-coverage`, `client-coverage`,
`mobile-layout-report`, `release-readiness-report`.

**Gate 3 was renamed** because its old name, "WCAG Accessibility Standards
(A11y)", claimed what it does not do. It greps JSX for missing alt text and
unlabelled controls — genuinely useful, and incapable of establishing
accessibility, because it never renders, never computes a contrast ratio
against a real background, and never operates a control.

**Gate 6 is `continue-on-error`** because it currently fails on 41 real
touch-target defects (`docs/remediation/P0-04-MOBILE-LAYOUT.md`). The report is
published so the number is tracked. Flip it to blocking once the UI work lands
— that is what recording the number is for.

**Gate 7 is `main`-only** because a pull-request job cannot hold a service-role
key; verification belongs where the credentials live.

---

## 4. Rendered accessibility — a start, not the replacement

The brief asks to *"replace regex accessibility certification with rendered
accessibility tests"*. What exists now:

**Done.** Gate 6 measures real touch-target sizes in real Chromium against WCAG
2.2 AA 2.5.8 (24×24) and the product's 44×44 bar, across 8 viewports and 8
routes, on the production build. That is a rendered accessibility check and it
found 38 real 2.5.8 violations.

**Not done.** Contrast, focus order, ARIA correctness, keyboard traps and
screen-reader semantics still have no rendered check. The right shape is an
`axe-core` pass against the rendered DOM inside the existing Playwright runner
— the harness is built and the hook is obvious; it was not written.

Until it is, **no accessibility verdict is claimed** beyond measured touch
targets.

---

## 5. The contrast detector — NOT fixed, and nothing suppressed

The brief asks to fix the contrast detector so it distinguishes
foreground/background usage and tonal values, and **not to suppress the five
unmeasured contrast findings before verification**.

**Neither was done, and nothing was suppressed.**
`scripts/quality-gates/accessibilityAudit.mjs` is untouched by this
remediation: no rule was disabled, no finding was waived, no allowlist added.
Its current output is unchanged:

```
📊 Scanned 334 components. Found 0 critical, 37 recommendations.
```

The five unmeasured contrast findings therefore stand exactly as the audit left
them. Fixing the detector properly means computing a real ratio between a
resolved foreground and its resolved background, which needs the rendered DOM —
the same axe-core pass as §4, and the same reason it is open rather than
half-done.

---

## 6. What is open

1. **axe-core rendered accessibility pass** — the real replacement for Gate 3.
2. **Contrast detector** — cannot be done correctly from source; belongs in the
   rendered pass. The five findings remain unmeasured and unsuppressed.
3. **Gate 6 is non-blocking** until its 41 findings are fixed.
4. **Client coverage at 9.64%** — recorded as a floor, not endorsed.
5. **Four performance operations unmeasured** — honestly reported, not claimed.
