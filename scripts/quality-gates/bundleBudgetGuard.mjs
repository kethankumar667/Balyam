#!/usr/bin/env node
/**
 * BHALYAM Bundle Budget Guard
 * Audits generated client build assets against strict size limits.
 * Fails CI with exit code 1 if any bundle exceeds its budget.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_ASSETS = path.resolve(__dirname, "../../client/dist/assets");

// Configurable Budgets in Kilobytes (KB)
const BUNDLE_BUDGETS = {
  // Main Application Core Entry
  "index-*.js": 750,

  // Vendor Chunks
  "vendor-react-*.js": 300,
  "vendor-supabase-*.js": 250,
  "vendor-framer-motion-*.js": 150,
  "vendor-socketio-*.js": 60,
  "vendor-audio-*.js": 50,

  // Heavy Visual Game Boards
  "HandCricketBoard-*.js": 550,
  "UnoBoard-*.js": 360,
  "RummyBoard-*.js": 220,

  // Standard Game Boards
  "LudoBoard-*.js": 100,
  "ChessBoard-*.js": 100,
  "StarBoard-*.js": 80,
  "SpaceWarBoard-*.js": 70,
  "RpsBoard-*.js": 70,
  "BrickTetrisPage-*.js": 60,
  "CarromBoard-*.js": 50,
  "DotsBoxesBoard-*.js": 50,
  "NokiaCricketPage-*.js": 50,
  "BrickRacerPage-*.js": 50,
  "NokiaSnakePage-*.js": 50,
  "BrickBreakoutPage-*.js": 50,
  "SnakeBoard-*.js": 40,
  "NamePlaceAnimalBoard-*.js": 40,
  "WordBuildingBoard-*.js": 40,
  "PrivacyPolicyPage-*.js": 40,
  "AboutPage-*.js": 40,
  "SnlBoard-*.js": 30,
  "BingoBoard-*.js": 30,
  "TambolaBoard-*.js": 30,

  // Interactive Hub & Pages
  "Room-*.js": 160,
  "SettingsPage-*.js": 50,
  "ProfilePage-*.js": 45,
  "SignUpPage-*.js": 45,
  "LoginPage-*.js": 30,
  "GamesPage-*.js": 30,
};

function matchPattern(filename, pattern) {
  const regexPattern = "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$";
  return new RegExp(regexPattern).test(filename);
}

export function runBundleBudgetAudit() {
  if (!fs.existsSync(DIST_ASSETS)) {
    console.error(`❌ [BundleBudget] dist/assets directory not found at ${DIST_ASSETS}. Run 'npm run build' first.`);
    return { passed: false, error: "dist/assets not found", violations: [], assets: [] };
  }

  const files = fs.readdirSync(DIST_ASSETS);
  const violations = [];
  const assetsReport = [];

  for (const file of files) {
    if (!file.endsWith(".js")) continue;

    const fullPath = path.join(DIST_ASSETS, file);
    const sizeBytes = fs.statSync(fullPath).size;
    const sizeKb = Math.round((sizeBytes / 1024) * 100) / 100;

    let matchedBudgetKb = null;
    let matchedPattern = null;

    for (const [pattern, budgetKb] of Object.entries(BUNDLE_BUDGETS)) {
      if (matchPattern(file, pattern)) {
        matchedBudgetKb = budgetKb;
        matchedPattern = pattern;
        break;
      }
    }

    // Default fallback budget for any unlisted chunk
    if (matchedBudgetKb === null) {
      matchedBudgetKb = 100;
      matchedPattern = "default (<100KB)";
    }

    const breached = sizeKb > matchedBudgetKb;
    const ratio = Math.round((sizeKb / matchedBudgetKb) * 100);

    const assetInfo = {
      file,
      sizeKb,
      budgetKb: matchedBudgetKb,
      pattern: matchedPattern,
      ratio,
      breached,
    };

    assetsReport.push(assetInfo);

    if (breached) {
      violations.push(assetInfo);
    }
  }

  const passed = violations.length === 0;
  return { passed, violations, assets: assetsReport };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🔍 [BundleBudget] Auditing client bundle sizes against performance budgets...");
  const result = runBundleBudgetAudit();

  if (!result.passed) {
    console.error(`\n❌ [BundleBudget] FAILED: ${result.violations.length} bundle(s) exceeded size budget!\n`);
    for (const v of result.violations) {
      console.error(`  - ${v.file}: ${v.sizeKb} KB (Budget: ${v.budgetKb} KB, ${v.ratio}%)`);
    }
    process.exit(1);
  } else {
    console.log(`✅ [BundleBudget] PASSED: All ${result.assets.length} bundle chunks within defined size budgets.\n`);
    process.exit(0);
  }
}
