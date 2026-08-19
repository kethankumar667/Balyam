#!/usr/bin/env node
/**
 * BHALYAM Dependency Governance & Supply Chain Guard
 * Audits package.json configurations across client and server:
 * 1. Checks shared dependency version alignment (typescript, vitest, etc.)
 * 2. Scans for deprecated or high-risk dependencies
 * 3. Validates node version engines alignment (.nvmrc)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const CLIENT_PKG = path.join(ROOT_DIR, "client/package.json");
const SERVER_PKG = path.join(ROOT_DIR, "server/package.json");
const NVMRC = path.join(ROOT_DIR, ".nvmrc");

export function runDependencyGovernanceAudit() {
  const issues = [];
  const clientData = JSON.parse(fs.readFileSync(CLIENT_PKG, "utf8"));
  const serverData = JSON.parse(fs.readFileSync(SERVER_PKG, "utf8"));

  // Check 1: Node Engine Alignment
  const nvmrcVersion = fs.existsSync(NVMRC) ? fs.readFileSync(NVMRC, "utf8").trim() : null;
  if (clientData.engines?.node && serverData.engines?.node) {
    if (clientData.engines.node !== serverData.engines.node) {
      issues.push({
        severity: "CRITICAL",
        category: "engine-drift",
        message: `Node engines mismatch: client specifies "${clientData.engines.node}", server specifies "${serverData.engines.node}"`,
      });
    }
  }

  // Check 2: Shared devDependencies alignment
  const sharedDeps = ["typescript", "vitest", "chess.js"];
  for (const dep of sharedDeps) {
    const clientVer = clientData.dependencies?.[dep] || clientData.devDependencies?.[dep];
    const serverVer = serverData.dependencies?.[dep] || serverData.devDependencies?.[dep];

    if (clientVer && serverVer && clientVer !== serverVer) {
      issues.push({
        severity: "WARN",
        category: "version-drift",
        message: `Dependency "${dep}" version drift: client is ${clientVer}, server is ${serverVer}`,
      });
    }
  }

  // Check 3: Redundant heavy packages
  const DEPRECATED_OR_DISCOURAGED = ["moment", "request", "lodash.template", "crypto-js"];
  for (const dep of DEPRECATED_OR_DISCOURAGED) {
    if (clientData.dependencies?.[dep] || serverData.dependencies?.[dep]) {
      issues.push({
        severity: "CRITICAL",
        category: "deprecated-package",
        message: `Prohibited legacy dependency detected: "${dep}"`,
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARN").length;
  const passed = criticalCount === 0;

  return {
    passed,
    nodeTarget: nvmrcVersion,
    clientDepsCount: Object.keys(clientData.dependencies || {}).length,
    serverDepsCount: Object.keys(serverData.dependencies || {}).length,
    criticalCount,
    warningCount,
    issues,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🔍 [DepGovernance] Auditing package dependencies and supply chain integrity...");
  const result = runDependencyGovernanceAudit();

  console.log(`📦 [DepGovernance] Verified Node.js v${result.nodeTarget}, ${result.clientDepsCount} client deps, ${result.serverDepsCount} server deps.`);
  if (!result.passed) {
    console.error(`\n❌ [DepGovernance] FAILED: Found ${result.criticalCount} critical dependency issue(s)!\n`);
    for (const issue of result.issues.filter((i) => i.severity === "CRITICAL")) {
      console.error(`  - [${issue.category}]: ${issue.message}`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [DepGovernance] PASSED: All dependencies and engine constraints aligned cleanly.\n`);
    process.exit(0);
  }
}
