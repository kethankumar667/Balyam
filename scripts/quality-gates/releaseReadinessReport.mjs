/**
 * Release evidence gate. Missing proof is not a pass; source scans are not
 * rendered tests, and local PostgreSQL is not hosted Supabase verification.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runBundleBudgetAudit } from "./bundleBudgetGuard.mjs";
import { runAccessibilityAudit } from "./accessibilityAudit.mjs";
import { runTestQualityAudit } from "./testQualityAudit.mjs";
import { runDependencyGovernanceAudit } from "./dependencyGovernance.mjs";
import { captureEvidence, evaluateReleaseEvidence } from "./releaseEvidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function generateReleaseReadinessReport() {
  const source = captureEvidence(ROOT);
  const results = {
    timestamp: new Date().toISOString(),
    gitCommit: source.gitCommit,
    certificationState: "NOT READY",
    releaseApproved: false,
    stateCapped: false,
    stateCappingReason: null,
    domains: {},
    blockers: [],
    advisories: [],
    scope: "Evidence gate only. Full CI, deployed player journeys, operational monitoring and rollback rehearsal still require release-owner sign-off.",
  };
  const record = (name, passed, message) => {
    results.domains[name] = { status: passed ? "PASS" : "FAIL", passed, message };
    if (!passed) results.blockers.push(`${name}: ${message}`);
  };

  console.log("BHALYAM release evidence check\n");
  try {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    for (const directory of ["server", "client"]) {
      execSync(`${npm} run typecheck`, { cwd: path.join(ROOT, directory), stdio: "pipe" });
    }
    record("typeSafety", true, "Client and server typechecks passed in this run.");
  } catch (error) {
    record("typeSafety", false, error.stdout?.toString() || error.stderr?.toString() || error.message);
  }

  const tests = runTestQualityAudit();
  record("testIntegrity", tests.passed, `${tests.totalFiles} test files scanned; ${tests.violations.length} forbidden directives. This is not test execution.`);
  const staticA11y = runAccessibilityAudit();
  record("accessibilitySource", staticA11y.passed, `${staticA11y.criticalCount} source-scan findings; not a rendered accessibility verdict.`);
  const bundle = runBundleBudgetAudit();
  record("bundleBudgets", bundle.passed && bundle.assets.length > 0,
    `${bundle.assets.length} built assets inspected; ${bundle.violations.length} budget findings.`);
  const dependencies = runDependencyGovernanceAudit();
  record("dependencyGovernance", dependencies.passed,
    `${dependencies.criticalCount} dependency configuration issues; not a vulnerability scan.`);

  const evidence = evaluateReleaseEvidence(ROOT, {
    gitCommit: source.gitCommit,
    sourceClean: source.sourceClean,
    now: Date.now(),
    stagingEndpoint: process.env.RELEASE_STAGING_SUPABASE_URL,
    migrations: fs.readdirSync(path.join(ROOT, "supabase", "migrations")).filter((name) => name.endsWith(".sql")),
  });
  const domainNames = { soak: "soakTesting" };
  for (const [kind, evaluation] of Object.entries(evidence)) {
    results.domains[domainNames[kind] ?? kind] = evaluation;
    if (!evaluation.passed) results.blockers.push(`${kind}: ${evaluation.message}`);
  }

  if (!evidence.supabaseCloud.passed) {
    results.stateCapped = true;
    results.stateCappingReason = "Hosted staging verification is missing or invalid; public release is not approved.";
  }
  if (results.blockers.length === 0) {
    results.certificationState = "EVIDENCE CHECKS PASSED";
    results.releaseApproved = true;
  } else if (results.domains.typeSafety.passed && results.domains.testIntegrity.passed) {
    results.certificationState = "INTERNAL TESTING READY";
  }
  console.log(`State: ${results.certificationState}`);
  console.log(`Release evidence: ${results.releaseApproved ? "PASSED (release-owner sign-off still required)" : "BLOCKED"}`);
  for (const blocker of results.blockers) console.error(`- ${blocker}`);
  fs.writeFileSync(path.join(ROOT, "RELEASE_READINESS_REPORT.json"), JSON.stringify(results, null, 2) + "\n");
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = generateReleaseReadinessReport().releaseApproved ? 0 : 1;
}
