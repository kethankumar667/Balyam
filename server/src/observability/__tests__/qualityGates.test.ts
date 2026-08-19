import { describe, it, expect } from "vitest";
// @ts-ignore - JavaScript ESM quality gate scripts
import { runTestQualityAudit } from "../../../../scripts/quality-gates/testQualityAudit.mjs";
// @ts-ignore
import { runAccessibilityAudit } from "../../../../scripts/quality-gates/accessibilityAudit.mjs";
// @ts-ignore
import { runDependencyGovernanceAudit } from "../../../../scripts/quality-gates/dependencyGovernance.mjs";

// Bundle-budget audit intentionally not covered here: it reads
// client/dist/assets, which only exists once the client has been built.
// The `server` CI job never builds the client (that's a separate, parallel
// job with no shared filesystem), so this assertion failed on every clean
// CI run regardless of code correctness — not a flaky test, a structurally
// unrunnable one in this job. The real check already runs correctly in the
// `quality-gates` job ("Gate 2 — Bundle Size Budgets"), which builds the
// client first; this was a broken duplicate of it, not additional coverage.

describe("Release Quality Gates Automated Audits", () => {
  it("enforces test suite integrity with zero skipped or focused tests", () => {
    const result = runTestQualityAudit();
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.totalFiles).toBeGreaterThan(100);
  });

  it("enforces WCAG accessibility compliance with zero critical violations", () => {
    const result = runAccessibilityAudit();
    expect(result.passed).toBe(true);
    expect(result.criticalCount).toBe(0);
    expect(result.totalFiles).toBeGreaterThan(200);
  });

  it("enforces supply chain dependency governance and engine alignment", () => {
    const result = runDependencyGovernanceAudit();
    expect(result.passed).toBe(true);
    expect(result.criticalCount).toBe(0);
  });
});
