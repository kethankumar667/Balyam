# BHALYAM Baseline Governance & Release-Certification Audit

> **Auditor**: Release Governance Owner, Principal Engineer, QA Architect & Test Architect  
> **Date**: August 19, 2026  
> **Governance Directive**: AGENTS.md §0 - §18, Product Vision & Platform Rules  
> **Scope**: Evaluation of existing quality gates, certification mechanisms, test coverage tooling, and frontend test architecture prior to hardening.

---

## 1. Executive Summary

A comprehensive baseline audit was conducted on BHALYAM's release-certification tooling (`scripts/quality-gates/enterpriseReadinessReport.mjs`, `scripts/quality-gates/releaseReadinessReport.mjs`), test infrastructures (Server & Client Vitest suites, Playwright headless browser runners), and persistence/accessibility verification layers.

While individual verification scripts exist (e.g. `verifyPersistence.mjs`, `accessibility/runner.mjs`, `mobile-layout/runner.mjs`), the higher-level enterprise and release orchestrators suffered from severe blind spots, including hardcoded 100/100 scoring, lack of real persistence/security/accessibility receipt ingestion, disconnected frontend test suites, and missing verification of business-critical user journeys.

---

## 2. Inventory of Existing Governance & Certification Tools

| Tool / Script | Location | Purpose | Execution Mechanism | Current Reliability |
|---|---|---|---|---|
| `enterpriseReadinessReport.mjs` | `scripts/quality-gates/` | Enterprise readiness certification | `npm run enterprise:check` | ⚠️ **UNRELIABLE**: Hardcodes `score: 100` and `CERTIFIED_FOR_PRODUCTION` without verifying persistence or rendered a11y receipts. |
| `releaseReadinessReport.mjs` | `scripts/quality-gates/` | Release readiness gate | `npm run release:check` | ⚠️ **DEFICIENT**: Deduction-based numeric score (>=90 = "GO"). Ignores security, persistence, rendered a11y, and responsive matrices. |
| `bundleBudgetGuard.mjs` | `scripts/quality-gates/` | Chunk size budget check | Static inspect `dist/assets/` | ✅ **FUNCTIONAL**: Enforces <220kB entry, <300kB game boards. |
| `testQualityAudit.mjs` | `scripts/quality-gates/` | Anti-skip enforcement | AST regex scan for `it.skip`, `describe.only` | ✅ **FUNCTIONAL**: 0 skipped/focused tests allowed. |
| `accessibilityAudit.mjs` | `scripts/quality-gates/` | Static JSX A11y scan | Regex scan for missing alt/aria-labels | ⚠️ **PARTIAL**: Static only; misses live contrast and keyboard trapping. |
| `persistenceVerification.mjs` | `scripts/quality-gates/` | Durability receipt validator | Checks `docs/remediation/persistence-verification.json` | ✅ **FUNCTIONAL**: Validates proof freshness & Postgres restart durability. |
| `accessibility/runner.mjs` | `client/scripts/accessibility/` | Real Chromium axe-core audit | Playwright axe audit across 22 pages | ✅ **FUNCTIONAL**: Outputs `ACCESSIBILITY_REPORT.json` (0 violations). |
| `mobile-layout/runner.mjs` | `client/scripts/mobile-layout/` | Real Chromium responsive matrix | Playwright 11 viewports | ✅ **FUNCTIONAL**: Outputs `MOBILE_LAYOUT_REPORT.json` (0 critical/high). |
| Server Vitest Suite | `server/` | 95 test files (792 tests) | `npm test` in server | ✅ **STRONG**: Covers game engines, room lifecycle, bot scheduling, operational auth. |
| Client Vitest Suite | `client/` | 56 test files (444 tests) | `npm test` in client | ⚠️ **WEAK COVERAGE**: Focuses on pure helpers, game math, and event bus; lacks comprehensive component-level user journey flows (Identity, Room, Chat, Game, Profile). |

---

## 3. Certification Blind Spots & False-Readiness Risks

### 3.1 Hardcoded Readiness Assumptions
In `enterpriseReadinessReport.mjs`:
- Mobile certification was hardcoded to `PASS` without reading `MOBILE_LAYOUT_REPORT.json`.
- Security hardening was hardcoded to `PASS` without verifying operational authentication test passes.
- Chaos pipeline and scale validation sections were hardcoded string constants.
- The readiness score was set directly to `100` and `CERTIFIED_FOR_PRODUCTION` regardless of actual repository state.

### 3.2 Numeric Deduction Flaws in Release Check
In `releaseReadinessReport.mjs`:
- A composite arithmetic score (`100 - deductions`) determined release readiness: if `overallScore >= 90`, it reported `"GO"`.
- A project with catastrophic persistence failure, zero authentication verification, and unverified responsive layouts would still achieve a score of 100 and report `"GO"` as long as TypeScript compiled and static regex scans passed.

### 3.3 Disconnected Rendered Evidence
The repository possessed state-of-the-art real browser automation runners (`accessibility/runner.mjs`, `mobile-layout/runner.mjs`, `audit-room-chat-suite.mjs`), but neither `release:check` nor `enterprise:check` ingested their receipts.

### 3.4 Client Test Coverage Gap
Although the client suite contained 444 passing tests, the tests were heavily concentrated in pure algorithmic units (Nokia Snake, Brick Racer math, Ludo coordinate translation, EventBus). Business-critical UI interactions—such as logging in as a guest, creating a room, toggling readiness, sending long chat messages, and handling room errors—lacked comprehensive behavior-driven integration tests.

---

## 4. Baseline Evidence

- **Git Status**: Clean working tree with governance documents and persistence schema files in place.
- **Server Test Suite**: 95 test files passed (792/792 tests).
- **Client Test Suite**: 56 test files passed (444/444 tests).
- **Axe-Core Rendered A11y**: 22 routes audited, 0 violations, 0 contrast failures.
- **Mobile Responsive Matrix**: 99 pages inspected across 11 viewports, 0 critical, 0 high defects.
- **Persistence Verification**: 54/54 schema checks passed, 17/17 durability restart checks passed against PostgreSQL 17.

---

## 5. Objectives for Overhaul (Phase A & Phase B)

1. **Phase A (Gate Overhaul)**:
   - Eliminate hardcoded scoring.
   - Implement strict, multi-domain evidence ingestion (Security, Persistence, A11y, Responsive, Quality, Coverage, Critical Flows).
   - Replace arithmetic scores with discrete state transitions: `NOT READY` → `INTERNAL TESTING READY` → `CLOSED BETA READY` → `PRODUCTION READY`.
   - Block `PRODUCTION READY` on any missing receipt, unresolved critical/high defect, or test failure.

2. **Phase B (Frontend Coverage Expansion)**:
   - Create 6 high-confidence, behavior-driven test suites protecting:
     - Priority 1: Identity Flow (Guest creation, restoration, session recovery, corrupt storage)
     - Priority 2: Room Flow (Creation, join, leave, ready/unready, host controls, ownership changes)
     - Priority 3: Chat Flow (Send, receive, empty, long messages, Unicode, aria-live)
     - Priority 4: Game Lifecycle Flow (Start, end, match results, rematch, state reset)
     - Priority 5: Profile & Progression Flow (Profile load, stats, XP/level updates, achievements)
     - Priority 6: Leaderboard & Tournaments Flow (Table rendering, game filtering, empty state)
   - Ensure all tests assert user-visible DOM state and accessibility attributes.
