## 📋 Pull Request Description

### Summary of Changes
<!-- Describe the problem solved and changes introduced -->

---

## 🚦 Release Quality Gates Checklist

Please verify before requesting review:

### 1. Type Safety & Compilations
- [ ] `npm run typecheck` passes with **0 errors** in both `client/` and `server/`.
- [ ] No `any` escapes or unsafe type assertions introduced.

### 2. Automated Tests & Longevity
- [ ] `npm test` passes with **100% success** (1,039+ automated tests).
- [ ] No focused (`.only`) or skipped (`.skip` / `xit`) tests in the commit.
- [ ] New features or bug fixes include co-located unit or stress tests in `__tests__/`.

### 3. Client & Mobile Layouts (Mandatory Standard §6)
- [ ] Verified dedicated **Mobile Layout** (320px – 768px touch targets >= 44x44px).
- [ ] Verified dedicated **Desktop Layout** (1024px+ with action rails / panels).
- [ ] Responsive breakpoint tested at 375px, 768px, 1024px, 1440px.

### 4. Accessibility & Performance Budgets
- [ ] `npm run check:a11y` passes with 0 critical WCAG violations.
- [ ] `npm run check:bundle` passes (all chunks within size budgets).
- [ ] Realtime operation latencies meet SLA targets (room creation <= 50ms, moves <= 25ms).

### 5. Production Reliability & Lifecycle Invariants
- [ ] All room state transitions go through `RoomLifecycleState` state machine.
- [ ] All room timers / intervals bound via `ServerLifecycleRegistry`.
- [ ] Voice and Howler audio resources cleanly released on route change/unmount.

---

## 📊 Release Readiness Command
Run locally prior to push:
```bash
npm run release:check
```
Decision must be `GO` with score `>= 90/100`.
