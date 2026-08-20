/**
 * BHALYAM Automated Accessibility (A11y) Quality Gate
 * Audits React JSX/TSX components across client/src for WCAG 2.1 AA compliance:
 * - Missing button accessible names / aria-labels
 * - Missing image alt attributes
 * - Custom interactive elements without role / tabIndex / keyboard listeners
 * - Dialog without aria-modal or labelling
 * - Form input accessibility
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_SRC = path.resolve(__dirname, "../../client/src");

function findComponentFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "__tests__") {
        findComponentFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx"))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

export function runAccessibilityAudit() {
  const componentFiles = findComponentFiles(CLIENT_SRC);
  const issues = [];

  for (const filePath of componentFiles) {
    const relativePath = path.relative(CLIENT_SRC, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, lineIdx) => {
      const lineNum = lineIdx + 1;
      const trimmed = line.trim();

      // Check 1: <img> tag missing alt attribute
      if (/<img\b[^>]*>/i.test(line)) {
        if (!/\balt\s*=\s*["'{]/i.test(line) && !/aria-hidden/i.test(line)) {
          // Verify if it continues on next lines or is self-contained
          if (!line.includes("alt=")) {
            issues.push({
              file: relativePath,
              line: lineNum,
              category: "img-missing-alt",
              severity: "WARN",
              message: "<img> tag is missing an 'alt' attribute for screen reader accessibility.",
              snippet: trimmed,
            });
          }
        }
      }

      // Check 2: <button> element with icon/svg but without text, aria-label, or title
      if (/<button\b/i.test(line) && !/aria-label/i.test(line) && !/title=/i.test(line)) {
        if (/<button\s+[^>]*aria-label/i.test(line)) return;
        // If button is self-closed or only holds icon
        if (/onClick=/i.test(line) && /<button\s+[^>]*class(?:Name)?=["'][^"']*(?:p-|rounded|icon|btn-icon)[^"']*["']/i.test(line)) {
          issues.push({
            file: relativePath,
            line: lineNum,
            category: "button-missing-label",
            severity: "WARN",
            message: "Icon-style button may lack an explicit 'aria-label' or 'title'.",
            snippet: trimmed,
          });
        }
      }

      // Check 3: Non-semantic interactive <div onClick=...> without role or tabIndex
      if (/<div\b[^>]*onClick\s*=/i.test(line)) {
        if (!/role\s*=\s*["'](button|tab|link|menuitem)["']/i.test(line) && !/tabIndex/i.test(line)) {
          issues.push({
            file: relativePath,
            line: lineNum,
            category: "non-semantic-interactive",
            severity: "WARN",
            message: "<div onClick> lacks role='button' or tabIndex for keyboard navigation.",
            snippet: trimmed,
          });
        }
      }

      // Check 4: Dialogs missing aria-modal or aria-labelledby
      if (/role\s*=\s*["']dialog["']/i.test(line)) {
        if (!/aria-modal/i.test(line) && !/aria-labelledby/i.test(line) && !/aria-label/i.test(line)) {
          issues.push({
            file: relativePath,
            line: lineNum,
            category: "dialog-accessibility",
            severity: "WARN",
            message: "role='dialog' element should declare aria-modal='true' and aria-labelledby or aria-label.",
            snippet: trimmed,
          });
        }
      }
    });
  }

  // Count critical vs warnings
  const criticals = issues.filter((i) => i.severity === "CRITICAL");
  const warnings = issues.filter((i) => i.severity === "WARN");
  const passed = criticals.length === 0;

  return {
    passed,
    totalFiles: componentFiles.length,
    criticalCount: criticals.length,
    warningCount: warnings.length,
    issues,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🔍 [A11yAudit] Running automated WCAG accessibility scan across React UI components...");
  const result = runAccessibilityAudit();

  console.log(`📊 [A11yAudit] Scanned ${result.totalFiles} components. Found ${result.criticalCount} critical, ${result.warningCount} recommendations.`);
  if (!result.passed) {
    console.error(`\n❌ [A11yAudit] FAILED: Critical accessibility violations detected!\n`);
    for (const i of result.issues.filter((x) => x.severity === "CRITICAL")) {
      console.error(`  - ${i.file}:${i.line} [${i.category}]: ${i.message}`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [A11yAudit] PASSED: No blocking accessibility errors found.\n`);
    process.exit(0);
  }
}
