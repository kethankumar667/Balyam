# P0-4 — Removal of false certification

Status: **CLOSED.** The fake suite is deleted; a real one runs and currently
**fails on genuine defects**.

---

## 1. Original failure

`client/src/__tests__/mobileCertification.test.ts` — 98 lines, titled
*"BHALYAM Production Mobile UX & Accessibility Certification Suite"*, importing
**no page and no component**. It asserted against its own literal table:

```ts
const DEVICE_MATRIX = [{ name: "iPhone SE", width: 320, height: 568, touchTargetMinPx: 44 }, …];
expect(device.touchTargetMinPx).toBeGreaterThanOrEqual(44);   // 44 >= 44
expect(device.width / device.height).toBeGreaterThan(0.35);   // arithmetic on constants
expect(visibleViewportHeight).toBe(524);                      // 844 - 320
```

Nothing rendered. Nothing was measured. **The suite could not fail for any
product reason**, and its name asserted the opposite.

Compounding it: the client had **no jsdom, no happy-dom, no
`@testing-library/*`**. The four `.test.tsx` files call
`React.createElement(...)` and assert `toBeDefined()` — construction, not
rendering.

---

## 2. Files changed

| File | Change |
|---|---|
| `client/src/__tests__/mobileCertification.test.ts` | **deleted** |
| `client/scripts/mobile-layout/probes.mjs` | **new** — measurement code that runs inside Chromium |
| `client/scripts/mobile-layout/runner.mjs` | **new** — real build, real browser, 8 viewports, 8 routes |
| `package.json` | `check:mobile-layout` |
| `MOBILE_LAYOUT_REPORT.json` | machine-written report artifact |

No new dependency: `playwright@^1.62.1` was already a client devDependency.

**jsdom was considered and rejected.** It implements the DOM but not layout, so
every `getBoundingClientRect()` returns zeros — a measurement harness that
cannot measure is the same failure one level deeper.

---

## 3. What it actually does

Builds the client, serves `dist/` (production CSS, so a purged Tailwind class
is caught), and drives real Chromium at:

**320×568, 360×800, 375×667, 390×844, 412×915, 430×932**, plus **667×375
landscape** and **390×540** — the last approximating an open keyboard on a
390×844 phone, which is the state the chat composer is used in.

Across 8 routes (Home, Games, Leaderboard, Tournaments, Social hub, Settings,
Sign in, About), it checks:

- **Blank render** — `elementCount`/`textLength`, so "no violations" can never
  mean "no page".
- **Horizontal overflow** — document `scrollWidth` vs viewport, naming the
  specific offending element rather than its parents.
- **Touch targets** — every visible control's measured rect, reported against
  **two** thresholds kept separate: WCAG 2.2 AA 2.5.8 (24×24) and the product
  bar (44×44). Conflating them makes it impossible to say which is breached.
- **Clipping** — controls past the viewport edge.
- **Reachability** — Playwright's own actionability check.

---

## 4. Three false positives found and removed before reporting

A noisy detector gets switched off, which is how the file being replaced came
to be trusted. The first run produced **149** findings; **61 were wrong**.

1. **Carousel items reported as clipped** (5/page). The game-category tab strip
   is a horizontal scroller — items past the edge are reached by swiping.
   *Fix:* walk ancestors for a scrolling `overflow-x`; off-screen ≠ unreachable.

2. **`document.elementFromPoint` reported 14 untappable header controls.** A
   sibling backdrop layer that a person taps straight through.
   *Fix:* deleted the heuristic; ask Playwright `click({ trial: true })`.

3. **A first-run onboarding modal made every page's controls "unreachable".**
   Confirmed by direct probe:

   ```
   <div class="fixed inset-0 z-50 … bg-black/80 backdrop-blur-md"> … intercepts pointer events
   ```

   That is a modal doing its job. *Fix:* detect a full-screen overlay and
   restrict reachability to inside it; seed `bhalyam.onboarding.state`.

**149 → 88 findings.** The remaining ones were each traced to a measured rect.

---

## 5. Current result — it fails, on real defects

```
Pages inspected:    64
Controls measured:  1056
CRITICAL 0   HIGH 41   MEDIUM 47
```

| Kind | Count |
|---|---|
| `touch-target-below-wcag` (< 24×24) | 38 |
| `touch-target-below-product-bar` (< 44×44) | 47 |
| `control-clipped` | 2 |
| `control-unreachable` | 1 |

Distinct offenders, measured:

| Control | Size | Viewports |
|---|---|---|
| "Back to Lounge" | 110.2 × **16** | 16 |
| "Dismiss starter missions" | **19.4** × 28 | 14 |
| "Explore" / "Play Now" / "Customize" | ~80 × **24** | 15–16 each |
| "Social Hub" / "Tournaments" | ~95 × **24** | 16 each |
| "🏆 Wins", "⭐ Rating", "📊 Win Rate" | ~80 × **28–30** | 8 each |

A 16px-tall "Back to Lounge" link fails WCAG 2.2 AA by a factor of 1.5 and the
product's own bar by nearly 3×. **The suite it replaces reported this as
certified.**

Fixing these is UI work, explicitly out of P0 scope. They are recorded, not
suppressed.

---

## 6. What is NOT claimed

The word "certification" is gone, deliberately.

- **One engine.** Chromium only. No WebKit, no Gecko.
- **No hardware.** CSS viewport sizes named after devices are not those
  devices. Nothing here says anything about iOS Safari's address bar or real
  Android keyboard insets.
- **The Room screen and chat composer are NOT YET COVERED.** The runner
  supports it (`--server=<port>` creates a real room with a bot and navigates
  to `/room/:code`), but this run had no game server, so the report says:

  ```json
  "roomScreenChecked": false,
  "roomScreenNote": "NOT RUN — no game server was reachable. This is not a pass."
  ```

  **This is the one part of the brief's Phase 4 that is unfinished**, and it is
  recorded as not-run rather than quietly omitted. To close it:

  ```bash
  npm --prefix server run dev &
  npm run check:mobile-layout -- --server=4000
  ```

- **Accessibility is not claimed** beyond measured touch-target size.

---

## 7. Regression risks

1. The client suite drops from 57 files/460 tests to **56/444** — the 16
   removed tests asserted arithmetic on constants.
2. `check:mobile-layout` **currently exits 1**. Wired into CI as a required
   gate it blocks until the touch targets are fixed; that is the gate working.
3. It needs a build first (`npm --prefix client run build`) and ~90s to run.

---

## 8. Rollback

`git checkout acb5764 -- client/src/__tests__/mobileCertification.test.ts`
restores the deleted suite, and deleting `client/scripts/mobile-layout/` plus
the `check:mobile-layout` script removes the replacement. Neither touches
product code.

---

## 9. Residual limitations

1. **Room screen and chat composer unmeasured** (§6). The single open item.
2. **Chromium only.**
3. **Reachability is sampled**, first 40 in-viewport controls per page.
4. **`bhalyam.onboarding.state` is an undeclared localStorage key** — found
   while building this. Not personal data (two booleans), but it belongs in
   `dataInventory.ts` on DPDP grounds. Noted, not fixed: outside P0 scope.
5. **Overflow is measured; vertical clipping is not.** A control cut off by a
   fixed-height container is not yet detected.
