import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import * as evidence from "../../../scripts/quality-gates/releaseEvidence.mjs";

vi.mock("../../../scripts/quality-gates/bundleBudgetGuard.mjs", () => ({
  runBundleBudgetAudit: () => ({ passed: true, assets: ["fixture.js"], violations: [] }),
}));
vi.mock("../../../scripts/quality-gates/accessibilityAudit.mjs", () => ({
  runAccessibilityAudit: () => ({ passed: true, totalFiles: 1, criticalCount: 0 }),
}));
vi.mock("../../../scripts/quality-gates/testQualityAudit.mjs", () => ({
  runTestQualityAudit: () => ({ passed: true, totalFiles: 1, violations: [] }),
}));
vi.mock("../../../scripts/quality-gates/dependencyGovernance.mjs", () => ({
  runDependencyGovernanceAudit: () => ({ passed: true, criticalCount: 0 }),
}));
vi.mock("node:child_process", () => ({
  execSync: () => "",
  execFileSync: (_command: string, args: string[]) => args[0] === "rev-parse" ? "a".repeat(40) : "",
}));
import { generateReleaseReadinessReport } from "../../../scripts/quality-gates/releaseReadinessReport.mjs";
import { generateEnterpriseReadinessReport } from "../../../scripts/quality-gates/enterpriseReadinessReport.mjs";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("release checker integration", () => {
  it("does not mark unavailable runtime evidence as passing", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "statSync").mockImplementation(() => { throw new Error("report unavailable"); });
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const report = generateReleaseReadinessReport();
    for (const domain of ["accessibility", "mobile", "multiplayer", "soakTesting", "browserCompatibility"]) {
      expect(report.domains[domain].status).not.toBe("PASS");
    }
    expect(report.releaseApproved).toBe(false);
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("keeps the enterprise command blocked when release evidence is unavailable", () => {
    vi.spyOn(fs, "statSync").mockImplementation(() => { throw new Error("report unavailable"); });
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = generateEnterpriseReadinessReport();
    expect(report.releaseApproved).toBe(false);
    expect(report.blockingDefects).toEqual(report.blockers);
    expect(report.domainEvaluations.mobile.status).toBe("UNVERIFIED");
  });

  it("does not approve a release when only hosted staging proof is missing", () => {
    const evaluations = evidence.evaluateReleaseEvidence("", {
      gitCommit: "a".repeat(40), now: Date.now(), sourceClean: true, migrations: [],
    });
    for (const evaluation of Object.values(evaluations)) {
      Object.assign(evaluation, { status: "PASS", passed: true, message: "Fixture evidence passed" });
    }
    evaluations.supabaseCloud = { status: "UNVERIFIED", passed: false, message: "No staging proof" };
    vi.spyOn(evidence, "evaluateReleaseEvidence").mockReturnValue(evaluations);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = generateReleaseReadinessReport();
    expect(report.stateCapped).toBe(true);
    expect(report.releaseApproved).toBe(false);
    expect(report.blockers).toEqual(["supabaseCloud: No staging proof"]);
  });

  it("accepts all valid domains without claiming automatic production certification", () => {
    const evaluations = evidence.evaluateReleaseEvidence("", {
      gitCommit: "a".repeat(40), now: Date.now(), sourceClean: true, migrations: [],
    });
    for (const evaluation of Object.values(evaluations)) {
      Object.assign(evaluation, { status: "PASS", passed: true, message: "Fixture evidence passed" });
    }
    vi.spyOn(evidence, "evaluateReleaseEvidence").mockReturnValue(evaluations);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report = generateReleaseReadinessReport();
    expect(report.releaseApproved).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.certificationState).toBe("EVIDENCE CHECKS PASSED");
    expect(report.scope).toContain("release-owner sign-off");
  });

  it("does not stamp clean completion when the source commit changed during verification", () => {
    const completed = evidence.completeEvidence({
      schemaVersion: 1, gitCommit: "b".repeat(40), sourceClean: true,
      environment: "local", startedAt: new Date().toISOString(),
    }, ".");
    expect(completed.gitCommit).toBe("b".repeat(40));
    expect(completed.sourceClean).toBe(false);
    expect(completed.completedAt).toBeDefined();
  });
});
