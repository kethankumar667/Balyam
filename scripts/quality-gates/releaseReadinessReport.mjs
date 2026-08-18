#!/usr/bin/env node
/**
 * BHALYAM Release Readiness & Quality Gates Orchestrator
 * Consolidates all verification dimensions into a definitive release score and report.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runBundleBudgetAudit } from "./bundleBudgetGuard.mjs";
import { runAccessibilityAudit } from "./accessibilityAudit.mjs";
import { runTestQualityAudit } from "./testQualityAudit.mjs";
import { runDependencyGovernanceAudit } from "./dependencyGovernance.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

export function generateReleaseReadinessReport() {
  console.log("==================================================");
  console.log("🚀 BHALYAM RELEASE READINESS & QUALITY GATES CHECK");
  console.log("==================================================\n");

  const results = {
    timestamp: new Date().toISOString(),
    gitCommit: getGitCommit(),
    overallScore: 100,
    decision: "GO",
    gates: {},
  };

  let totalDeductions = 0;

  // Gate 1: Strict TypeScript Check
  console.log("1️⃣ Checking Strict TypeScript Compilation...");
  try {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    execSync(`${npmCmd} run typecheck`, { cwd: path.join(ROOT_DIR, "server"), stdio: "pipe", shell: true });
    execSync(`${npmCmd} run typecheck`, { cwd: path.join(ROOT_DIR, "client"), stdio: "pipe", shell: true });
    results.gates.typeSafety = { status: "PASS", message: "0 TypeScript compiler errors" };
    console.log("   ✅ Type Safety: PASS (0 errors)");
  } catch (err) {
    totalDeductions += 30;
    const output = err.stderr?.toString() || err.stdout?.toString() || err.message;
    results.gates.typeSafety = { status: "FAIL", message: `TypeScript compilation failed: ${output}` };
    console.error(`   ❌ Type Safety: FAIL -> ${output}`);
  }

  // Gate 2: Test Suite Quality & Anti-Skip
  console.log("2️⃣ Auditing Test Suite Integrity...");
  const testAudit = runTestQualityAudit();
  if (testAudit.passed) {
    results.gates.testIntegrity = { status: "PASS", message: `${testAudit.totalFiles} test files clean (0 skipped, 0 focused)` };
    console.log(`   ✅ Test Integrity: PASS (${testAudit.totalFiles} test files clean)`);
  } else {
    totalDeductions += 25;
    results.gates.testIntegrity = { status: "FAIL", message: `${testAudit.violations.length} forbidden test directives` };
    console.error(`   ❌ Test Integrity: FAIL (${testAudit.violations.length} violations)`);
  }

  // Gate 3: Bundle Size Budgets
  console.log("3️⃣ Auditing Client Bundle Budgets...");
  const bundleAudit = runBundleBudgetAudit();
  if (bundleAudit.passed) {
    results.gates.bundleBudgets = { status: "PASS", message: `All ${bundleAudit.assets.length} chunks within budgets` };
    console.log(`   ✅ Bundle Budgets: PASS (${bundleAudit.assets.length} chunks compliant)`);
  } else {
    totalDeductions += 20;
    results.gates.bundleBudgets = { status: "FAIL", message: `${bundleAudit.violations.length} chunks exceeded budget` };
    console.error(`   ❌ Bundle Budgets: FAIL (${bundleAudit.violations.length} chunks exceeded budget)`);
  }

  // Gate 4: Accessibility Standards (WCAG)
  console.log("4️⃣ Auditing Accessibility (A11y)...");
  const a11yAudit = runAccessibilityAudit();
  if (a11yAudit.passed) {
    results.gates.accessibility = { status: "PASS", message: `${a11yAudit.totalFiles} UI components scanned (0 critical)` };
    console.log(`   ✅ Accessibility: PASS (${a11yAudit.totalFiles} components scanned)`);
  } else {
    totalDeductions += 20;
    results.gates.accessibility = { status: "FAIL", message: `${a11yAudit.criticalCount} critical A11y violations` };
    console.error(`   ❌ Accessibility: FAIL (${a11yAudit.criticalCount} critical violations)`);
  }

  // Gate 5: Dependency Governance
  console.log("5️⃣ Auditing Dependency Governance...");
  const depAudit = runDependencyGovernanceAudit();
  if (depAudit.passed) {
    results.gates.dependencyGovernance = { status: "PASS", message: "Engine alignment & dependencies secure" };
    console.log("   ✅ Dependency Governance: PASS");
  } else {
    totalDeductions += 15;
    results.gates.dependencyGovernance = { status: "FAIL", message: `${depAudit.criticalCount} dependency issues` };
    console.error(`   ❌ Dependency Governance: FAIL (${depAudit.criticalCount} issues)`);
  }

  // Calculate Overall Score
  results.overallScore = Math.max(0, 100 - totalDeductions);
  results.decision = results.overallScore >= 90 ? "GO" : results.overallScore >= 75 ? "REVIEW_REQUIRED" : "NO_GO";

  console.log("\n==================================================");
  console.log(`📊 FINAL RELEASE SCORE: ${results.overallScore} / 100`);
  console.log(`🚦 DECISION: ${results.decision}`);
  console.log("==================================================\n");

  const reportPath = path.join(ROOT_DIR, "RELEASE_READINESS_REPORT.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`📄 Saved release report to: ${reportPath}`);

  return results;
}

function getGitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT_DIR, stdio: "pipe" }).toString().trim();
  } catch {
    return "unknown";
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = generateReleaseReadinessReport();
  if (report.decision === "NO_GO") {
    process.exit(1);
  } else {
    process.exit(0);
  }
}
