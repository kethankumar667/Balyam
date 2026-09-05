#!/usr/bin/env node
/**
 * BHALYAM Admin Key Secret Leak Guard (ADMIN-SEC-001)
 *
 * `client/src/lib/operationalApi.ts` reads `VITE_OPERATIONAL_KEY` only
 * inside an `import.meta.env.DEV` check specifically so that Vite's
 * production build folds the whole branch to `false` and dead-code-eliminates
 * it — including the string literal `VITE_OPERATIONAL_KEY` itself. That
 * source-level guard is unit-tested (`operationalApi.test.ts`), but a unit
 * test mocks `import.meta.env` — it cannot prove what the REAL `vite build`
 * actually emits. This is that proof: it scans the built client bundle for
 * the env var's name and the shared dev-default secret, and fails loudly if
 * either survived into shipped code. Run after `npm run build:client`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../../client/dist");

const FORBIDDEN_STRINGS = ["VITE_OPERATIONAL_KEY", "bhalyam_admin_secret_key_2026"];

function collectJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJsFiles(full));
    else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))) files.push(full);
  }
  return files;
}

export function runAdminKeySecretLeakAudit() {
  if (!fs.existsSync(DIST_DIR)) {
    return {
      passed: false,
      violations: [],
      error: `client/dist not found at ${DIST_DIR} — run "npm run build:client" first.`,
    };
  }

  const jsFiles = collectJsFiles(DIST_DIR);
  const violations = [];

  for (const file of jsFiles) {
    const contents = fs.readFileSync(file, "utf8");
    for (const needle of FORBIDDEN_STRINGS) {
      if (contents.includes(needle)) {
        violations.push({ file: path.relative(DIST_DIR, file), needle });
      }
    }
  }

  return { passed: violations.length === 0, violations, filesScanned: jsFiles.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("[AdminKeySecretLeak] Scanning client/dist for VITE_OPERATIONAL_KEY / dev-default secret...");
  const result = runAdminKeySecretLeakAudit();

  if (result.error) {
    console.error(`[AdminKeySecretLeak] FAILED: ${result.error}`);
    process.exit(1);
  }

  if (!result.passed) {
    console.error(`\n[AdminKeySecretLeak] FAILED: found ${result.violations.length} forbidden string(s) in the built client bundle!\n`);
    for (const v of result.violations) {
      console.error(`  - ${v.file}: contains "${v.needle}"`);
    }
    console.error(
      "\nThis means the `import.meta.env.DEV` guard in client/src/lib/operationalApi.ts " +
        "did not fold to false at build time — check for a regression there before shipping.\n",
    );
    process.exit(1);
  }

  console.log(`[AdminKeySecretLeak] PASSED: scanned ${result.filesScanned} file(s), no forbidden strings found.\n`);
  process.exit(0);
}
