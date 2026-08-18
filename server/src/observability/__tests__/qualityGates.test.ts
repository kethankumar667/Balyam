import { describe, it, expect } from "vitest";
// @ts-ignore - JavaScript ESM quality gate scripts
import { runBundleBudgetAudit } from "../../../../scripts/quality-gates/bundleBudgetGuard.mjs";
// @ts-ignore
import { runTestQualityAudit } from "../../../../scripts/quality-gates/testQualityAudit.mjs";
// @ts-ignore
import { runAccessibilityAudit } from "../../../../scripts/quality-gates/accessibilityAudit.mjs";
// @ts-ignore
import { runDependencyGovernanceAudit } from "../../../../scripts/quality-gates/dependencyGovernance.mjs";

describe("Release Quality Gates Automated Audits", () => {
  it("enforces bundle size budgets across all generated client assets", () => {
    const result = runBundleBudgetAudit();
    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.assets.length).toBeGreaterThan(50);
  });

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
