# RELEASE-STATE-MATRIX.md — BHALYAM Release State Progression Matrix

> **Audited by:** Release Governance Owner, SRE Lead, QA Architect  
> **Date:** 2026-08-19  
> **Repository:** BHALYAM (`bhalyam-multiplayer-lounge`)  
> **Current Evaluated State:** **`CLOSED BETA READY`**

---

## 1. Release State Definitions & Criteria

| Release State | Definition & Scope | Mandatory Evidence Gates | Current Status |
|---|---|---|:---:|
| **NOT READY** | Fundamental compilation, type safety, or critical test failures present in the codebase. Build cannot proceed. | TS errors > 0 OR unit tests failing. | ❌ **SUPERSEDED** |
| **INTERNAL TESTING READY** | Clean compilation and unit test suite passing. Internal development team testing permitted on local environments. | `tsc --noEmit` PASS (0 errors), Vitest PASS (0 failing, 0 skipped). | ❌ **SUPERSEDED** |
| **CLOSED BETA READY** | Full multi-user lounge experience verified across real browsers, PostgreSQL persistence durable, WCAG 2.1 AA compliant, 6 critical journeys tested, soak tests leak-free, multi-user resilience proven. Controlled external beta testing permitted. | All 10 local/integration domains PASS (Security, A11y, Responsive, Journeys, Multiplayer, Soak, Durability). | ✅ **ACTIVE CERTIFIED STATE** |
| **PRODUCTION READY** | General Public Availability (GA). Full cloud infrastructure verified including hosted Supabase cloud staging endpoint with live JWT authentication and RLS policy enforcement under production load. | All 10 local domains PASS + Domain 11 (Hosted Supabase cloud staging with live JWT/RLS) VERIFIED. | 🔒 **BLOCKED (STATE CAPPED)** |

---

## 2. Evidence Cross-Reference Matrix

| Verification Domain | Requirement | Evidence Artifact / Receipt | Status |
|---|---|---|:---:|
| **Domain 1: Type Safety** | 0 TypeScript errors | `npm run typecheck` output | **PASS** |
| **Domain 2: Test Integrity** | 0 skipped, 0 focused | `scripts/quality-gates/testQualityAudit.mjs` | **PASS** |
| **Domain 3: Security & Auth** | HMAC seat verification & token auth | `server/src/lib/seatToken.ts` | **PASS** |
| **Domain 4: PostgreSQL Durability** | Clean recovery across server crashes | `docs/remediation/persistence-verification.json` | **PASS** |
| **Domain 5: Accessibility** | WCAG 2.1 AA & contrast | `ACCESSIBILITY_REPORT.json` | **PASS** |
| **Domain 6: Responsive Matrix** | 11 viewports 320px–2560px | `MOBILE_LAYOUT_REPORT.json` | **PASS** |
| **Domain 7: Bundle Budgets** | Asset size constraints | `scripts/quality-gates/bundleBudgetGuard.mjs` | **PASS** |
| **Domain 8: Critical Journeys** | 6 behavioral test suites (41 tests) | `client/src/features/__tests__/` | **PASS** |
| **Domain 9: Multiplayer Resilience** | Scenarios A through H verified | `MULTIPLAYER-RESILIENCE-REPORT.md` | **PASS** |
| **Domain 10: Soak Testing** | Extended multi-room runtime | `SOAK-TEST-REPORT.md` | **PASS** |
| **Domain 11: Browser Compatibility** | Chromium, Edge, Firefox smoke | `BROWSER-COMPATIBILITY-REPORT.md` | **PASS** |
| **Domain 12: Supabase Cloud Staging** | Live cloud JWT & RLS verification | `docs/remediation/supabase-cloud-verification.json` | ⚠️ **UNVERIFIED (CAPPED)** |

---

## 3. Progression Checklist to Achieve `PRODUCTION READY`

To promote BHALYAM from **`CLOSED BETA READY`** to **`PRODUCTION READY`**, the following single deployment milestone must be executed:

1. **Deploy Hosted Supabase Staging Environment**:
   - Provision live Supabase project instance.
   - Run `supabase/migrations/0001_accounts.sql` against the hosted Postgres instance.
   - Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_JWT_SECRET`.
2. **Execute Cloud JWT / RLS Durability Suite**:
   - Verify real Supabase OAuth / email sign-in tokens against the hosted endpoint.
   - Verify that row-level security (RLS) forbids cross-player profile writes.
   - Generate `docs/remediation/supabase-cloud-verification.json` with status `"VERIFIED"`.
3. **Re-run Release Quality Gate**:
   - Execute `npm run release:check`.
   - The gate will automatically detect the verified cloud receipt and unlock **`PRODUCTION READY`**.
