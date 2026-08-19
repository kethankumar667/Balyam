#!/usr/bin/env node
/**
 * BHALYAM Test Quality & Anti-Skip Guard
 * Audits all test files across client and server to prevent:
 * 1. Focused tests (it.only, describe.only, test.only)
 * 2. Skipped tests (it.skip, describe.skip, test.skip, xit, xdescribe)
 * 3. Empty test files
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const SCAN_DIRS = [
  path.join(ROOT_DIR, "client/src"),
  path.join(ROOT_DIR, "server/src"),
];

function findTestFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") {
        findTestFiles(fullPath, fileList);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx") || entry.name.endsWith(".spec.ts"))
    ) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

export function runTestQualityAudit() {
  const allTestFiles = [];
  for (const dir of SCAN_DIRS) {
    findTestFiles(dir, allTestFiles);
  }

  const violations = [];
  let totalTestsScanned = 0;

  const FORBIDDEN_PATTERNS = [
    { pattern: /\b(it|test|describe)\.only\s*\(/g, name: "Focused test (.only)" },
    { pattern: /\b(it|test|describe)\.skip\s*\(/g, name: "Skipped test (.skip)" },
    { pattern: /\b(xit|xtest|xdescribe)\s*\(/g, name: "Skipped test (x-prefix)" },
  ];

  for (const filePath of allTestFiles) {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    totalTestsScanned++;

    lines.forEach((line, lineIdx) => {
      // Ignore comment lines
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;

      for (const { pattern, name } of FORBIDDEN_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push({
            file: relativePath,
            line: lineIdx + 1,
            rule: name,
            snippet: line.trim(),
          });
        }
      }
    });
  }

  const passed = violations.length === 0;
  return {
    passed,
    totalFiles: allTestFiles.length,
    violations,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🔍 [TestQuality] Auditing test suites for anti-skip and anti-focus compliance...");
  const result = runTestQualityAudit();

  if (!result.passed) {
    console.error(`\n❌ [TestQuality] FAILED: Found ${result.violations.length} test quality violation(s)!\n`);
    for (const v of result.violations) {
      console.error(`  - ${v.file}:${v.line} -> ${v.rule}`);
      console.error(`    "${v.snippet}"\n`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [TestQuality] PASSED: All ${result.totalFiles} test files are 100% clean (0 focused, 0 skipped).\n`);
    process.exit(0);
  }
}
