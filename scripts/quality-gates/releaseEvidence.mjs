import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { evaluateBrowserJourney, evaluateSoakRun } from "./releaseWorkload.mjs";

const MAX_AGE_MS = 7 * 86_400_000;
const FILES = {
  persistence: "docs/remediation/persistence-verification.json",
  schema: "docs/remediation/persistence-schema-verification.json",
  accessibility: "ACCESSIBILITY_REPORT.json",
  mobile: "MOBILE_LAYOUT_REPORT.json",
  multiplayer: "MULTIPLAYER-RESILIENCE-REPORT.json",
  soak: "SOAK-TEST-REPORT.json",
  browserCompatibility: "BROWSER-COMPATIBILITY-REPORT.json",
  supabaseCloud: "docs/remediation/supabase-cloud-verification.json",
};

const DURABILITY_CHECKS = [
  "the row is in PostgreSQL with no server running",
  "the profile written by the DEAD process is served by the NEW one",
  "second server started and hydrated from the database",
  "13 identical friend writes stored exactly one row",
  "the write-behind queue drains on its own",
];
const SCHEMA_CHECKS = [
  "database reachable and answering queries",
  "migration applies cleanly to an empty database",
  "migration is re-runnable (idempotent)",
  "RLS enabled on every table",
  "no INSERT/UPDATE/DELETE policy exists for client roles",
  "rollback script executes cleanly",
  "no progression tables remain after rollback",
  "migration re-applies after a rollback",
];
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const positive = (value) => count(value) && value > 0;
const names = (value) => Array.isArray(value) && value.length > 0 &&
  value.every((item) => typeof item === "string" && item.length > 0) && new Set(value).size === value.length;
const passingChecks = (checks) => Array.isArray(checks) && checks.length > 0 &&
  checks.every((check) => object(check) && typeof check.name === "string" &&
    check.name.length > 0 && check.passed === true && check.skipped !== true) &&
  new Set(checks.map((check) => check.name)).size === checks.length;
const hasChecks = (checks, required) => passingChecks(checks) &&
  required.every((name) => checks.some((check) => check.name === name));
const result = (status, message) => ({ status, passed: status === "PASS", message });

/** Capture before running checks. A dirty source tree cannot certify a commit. */
export function captureEvidence(root, environment = "local") {
  const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const changed = execFileSync("git", [
    "status", "--porcelain", "--untracked-files=normal", "--",
    "client", "server", "shared", "scripts", "supabase", ".github",
    "package.json", "package-lock.json", ".nvmrc", "render.yaml",
  ], { cwd: root, encoding: "utf8" }).trim();
  return {
    schemaVersion: 1, gitCommit, sourceClean: changed.length === 0,
    environment, startedAt: new Date().toISOString(),
  };
}

export function completeEvidence(evidence, root) {
  const current = captureEvidence(root, evidence.environment);
  return {
    ...evidence,
    sourceClean: evidence.sourceClean && current.sourceClean && evidence.gitCommit === current.gitCommit,
    completedAt: new Date().toISOString(),
  };
}

function provenanceProblem(kind, receipt, context) {
  const proof = receipt.evidence;
  if (!object(proof) || proof.schemaVersion !== 1) return "Missing versioned evidence provenance; regenerate the report.";
  if (!/^[a-f0-9]{40}$/.test(context.gitCommit) || proof.gitCommit !== context.gitCommit) {
    return "Evidence does not match the full release commit.";
  }
  if (context.sourceClean !== true || proof.sourceClean !== true) return "Source changes are not committed; evidence cannot certify this commit.";
  const environment = kind === "supabaseCloud" ? "staging" : "local";
  if (proof.environment !== environment) return `Expected ${environment} evidence, not another environment.`;
  if (typeof proof.startedAt !== "string" || typeof proof.completedAt !== "string" || !Number.isFinite(context.now)) {
    return "Evidence requires readable start/completion timestamps and a valid evaluation time.";
  }
  const started = Date.parse(proof.startedAt);
  const completed = Date.parse(proof.completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) ||
    new Date(started).toISOString() !== proof.startedAt || new Date(completed).toISOString() !== proof.completedAt ||
    started > completed || completed > context.now || context.now - started > MAX_AGE_MS) {
    return "Evidence timestamps are missing, invalid, future-dated, or older than seven days.";
  }
  return null;
}

function validAccessibility(report) {
  const counts = report.counts;
  return names(report.routes) && names(report.themes) &&
    report.themes.includes("light") && report.themes.includes("dark") &&
    positive(report.pagesAudited) && report.pagesAudited >= report.routes.length * report.themes.length &&
    object(counts) && object(counts.accessibility) && object(counts.contrast) &&
    counts.accessibility.critical === 0 && counts.accessibility.serious === 0 &&
    counts.contrast.total === 0 && counts.keyboard === 0 &&
    Array.isArray(report.accessibilityViolations) &&
    report.accessibilityViolations.every((finding) => object(finding) && ["minor", "moderate"].includes(finding.impact)) &&
    Array.isArray(report.contrastViolations) && report.contrastViolations.length === 0 &&
    Array.isArray(report.keyboardFindings) && report.keyboardFindings.length === 0;
}

function validMobile(report) {
  return names(report.routes) && names(report.viewports) &&
    positive(report.pagesInspected) && report.pagesInspected >= report.routes.length * report.viewports.length &&
    positive(report.controlsMeasured) && report.roomScreenChecked === true &&
    object(report.counts) && report.counts.critical === 0 && report.counts.high === 0 &&
    count(report.counts.medium) && Array.isArray(report.findings) &&
    report.findings.length === report.counts.medium &&
    report.findings.every((finding) => object(finding) && finding.severity === "MEDIUM");
}

function validMultiplayer(report) {
  return report.allPassed === true && Array.isArray(report.failures) && report.failures.length === 0 &&
    Array.isArray(report.scenarios) && report.scenarios.length === 8 &&
    "ABCDEFGH".split("").every((id) => report.scenarios.some(
      (scenario) => object(scenario) && scenario.id === `SCENARIO_${id}` && scenario.status === "PASS",
    ));
}

function validSoak(report) {
  const elapsed = (Date.parse(report.evidence.completedAt) - Date.parse(report.evidence.startedAt)) / 1000;
  const numeric = ["durationSeconds", "requestedDurationSeconds", "completedCycles", "totalEventsProcessed",
    "totalRoomsCreated", "totalSocketsConnected", "duplicateEventsDetected", "residualRooms", "residualSockets",
    "heapGrowthMb", "maxWorkGapSeconds", "settlementChecks", "recoveryChecks", "observedMoves"];
  if (!numeric.every((key) => typeof report[key] === "number") || !Array.isArray(report.errors)) return false;
  const measured = evaluateSoakRun(report);
  return report.status === "PASS" && measured.status === "PASS" && measured.releaseEligible &&
    report.durationSeconds <= elapsed + 1 && report.releaseEligible === true &&
    report.duplicateEventsDetected === 0 && report.memoryLeakDetected === false && report.webSocketLeakDetected === false;
}

function validBrowsers(report) {
  return report.status === "PASS" && Array.isArray(report.errors) && report.errors.length === 0 &&
    Array.isArray(report.browsers) && report.browsers.length === 4 &&
    ["chromium", "edge", "firefox", "safari"].every((id) => report.browsers.some(
      (browser) => object(browser) && browser.id === id && browser.status === "PASS" &&
        Array.isArray(browser.errors) && object(browser.flows) &&
        evaluateBrowserJourney(browser.flows, browser.errors),
    ));
}

function validCloud(report, context) {
  if (typeof context.stagingEndpoint !== "string") return false;
  let endpoint;
  try {
    endpoint = new URL(context.stagingEndpoint);
  } catch {
    return false;
  }
  return endpoint.protocol === "https:" && endpoint.username === "" && endpoint.password === "" &&
    report.endpoint === endpoint.origin && report.status === "VERIFIED" &&
    names(context.migrations) && Array.isArray(report.migrations) &&
    context.migrations.every((name) => report.migrations.some(
      (migration) => object(migration) && migration.name === name && migration.applied === true,
    )) && hasChecks(report.checks, ["cloud-auth", "cloud-rls", "cloud-postgrest"]);
}

export function validateReleaseReceipt(kind, receipt, context) {
  if (!object(receipt)) return result("UNVERIFIED", "Report must be a JSON object.");
  const problem = provenanceProblem(kind, receipt, context);
  if (problem) return result("UNVERIFIED", problem);
  let passed = false;
  switch (kind) {
    case "accessibility": passed = validAccessibility(receipt); break;
    case "mobile": passed = validMobile(receipt); break;
    case "persistence":
      passed = receipt.passed === true && receipt.store === "supabase-postgres" &&
        hasChecks(receipt.checks, DURABILITY_CHECKS); break;
    case "schema": passed = receipt.passed === true && hasChecks(receipt.checks, SCHEMA_CHECKS); break;
    case "multiplayer": passed = validMultiplayer(receipt); break;
    case "soak": passed = validSoak(receipt); break;
    case "browserCompatibility": passed = validBrowsers(receipt); break;
    case "supabaseCloud": passed = validCloud(receipt, context); break;
  }
  return passed
    ? result("PASS", `${kind}: recorded checks passed for ${receipt.evidence.gitCommit}. See the report's scope limitations.`)
    : result("FAIL", `${kind}: required measurements/checks are missing, skipped, failed, or inconsistent.`);
}

export function evaluateReleaseEvidence(root, context) {
  return Object.fromEntries(Object.entries(FILES).map(([kind, relative]) => {
    const filename = path.join(root, relative);
    let receipt;
    try {
      if (fs.statSync(filename).size > 10 * 1024 * 1024) {
        return [kind, result("UNVERIFIED", `${relative}: report exceeds 10 MiB.`)];
      }
      receipt = JSON.parse(fs.readFileSync(filename, "utf8"));
    } catch (error) {
      const reason = error.code === "ENOENT" ? "Missing evidence" : "Unreadable or invalid JSON evidence";
      return [kind, result("UNVERIFIED", `${relative}: ${reason}. Regenerate using the documented verifier.`)];
    }
    return [kind, validateReleaseReceipt(kind, receipt, context)];
  }));
}
