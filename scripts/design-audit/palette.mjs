#!/usr/bin/env node
/**
 * Contrast matrix for the BHALYAM palette — read from the config, not retyped.
 *
 * Every ratio quoted in `VISUAL-IDENTITY-RECOMMENDATION.md` comes from this
 * file. Where a candidate fails, the failure is printed rather than the value
 * quietly nudged until it passes.
 *
 * ── Why it imports tailwind.config.js instead of holding its own copy ──
 * The first version of this script kept the palette inline, and within one
 * session the config and the script disagreed: `sand-500` shipped as `#A98C68`
 * while the checker had already been corrected to `#96795A`. A checker with its
 * own copy of the thing it checks is not a checker.
 *
 * Reading the config means a value cannot ship without passing, and a value
 * cannot pass without shipping. The same argument `SPACING.touchTarget` makes
 * about touch targets: a rule you have to remember is a rule that gets missed.
 *
 * ── Why a palette needs a test at all ─────────────────────────────────
 * `DESIGN-SYSTEM-AUDIT.md` §1.4 found that nine of the twelve surviving
 * contrast failures are one colour — `#E85D04` — used two ways. It sits at the
 * luminance midpoint, so it fails as a fill behind white AND as ink on cream.
 * No amount of eyeballing catches that, because it looks fine both times.
 *
 * The structural fix is that every ramp declares which step is INK, which is
 * FILL, and which is GRAPHICS-ONLY. This script is what makes those labels
 * true — including asserting that graphics-only steps are genuinely unusable
 * for text, so the label is earned rather than claimed.
 *
 *   node scripts/design-audit/palette.mjs
 *   node scripts/design-audit/palette.mjs --verbose
 *
 * Exits 1 if any declared step misses the role it is declared for.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { contrast, heading, REPO_ROOT } from "./lib.mjs";

const verbose = process.argv.includes("--verbose");

const cfg = (await import(pathToFileURL(path.join(REPO_ROOT, "client", "tailwind.config.js")).href)).default;
const C = cfg.theme.extend.colors;

const SAND = C.sand;
const LIGHT_GROUNDS = [["sand-50", SAND[50]], ["sand-100", SAND[100]], ["sand-200", SAND[200]]];
const DARK_GROUNDS = [["sand-950", SAND[950]], ["sand-900", SAND[900]]];
const WHITE = "#FFFFFF";

/**
 * What each step is FOR. The config holds the values; this holds the contract.
 *
 *   ink-light   >= 4.5:1 on every light ground
 *   ink-dark    >= 4.5:1 on every dark ground
 *   fill        >= 4.5:1 against white text
 *   fill-dark   >= 4.5:1 against sand-800 ink — a fill that takes DARK text.
 *               Marigold lives here: white on it is 1.94:1, dark ink is 6.81:1.
 *   border      >= 3.0:1 on every light ground (WCAG 1.4.11)
 *   graphics    asserted to FAIL as ink and as fill, so "never put text on
 *               this" is a measured property rather than a hopeful comment
 *   decorative  no requirement — hairlines that carry no information
 *   disabled    no requirement — exempt under WCAG 1.4.3
 */
const CONTRACT = {
  sand:    { 300: "decorative", 400: "disabled", 500: "border", 600: "ink-light", 700: "ink-light", 800: "ink-light" },
  chest:   { 300: "ink-dark", 500: "graphics", 600: "fill", 700: "ink-light", 800: "ink-light" },
  lamp:    { 300: "ink-dark", 500: "fill-dark", 800: "ink-light" },
  inkblue: { 700: "fill" },
  ok:      { 300: "ink-dark", 700: "fill", 800: "ink-light" },
  bad:     { 300: "ink-dark", 700: "fill", 800: "ink-light" },
  note:    { 300: "ink-dark", 700: "fill", 800: "ink-light" },
};

let failures = 0;

function check(ramp, step, hex, role) {
  const name = `${ramp}-${step}`;
  const lines = [];
  let ok = true;

  const against = (grounds, need) => grounds.map(([gn, gh]) => {
    const r = contrast(hex, gh);
    if (r < need) ok = false;
    return `${gn} ${r.toFixed(2)}${r < need ? " FAIL" : ""}`;
  });

  switch (role) {
    case "ink-light": lines.push(...against(LIGHT_GROUNDS, 4.5)); break;
    case "ink-dark":  lines.push(...against(DARK_GROUNDS, 4.5)); break;
    case "border":    lines.push(...against(LIGHT_GROUNDS, 3.0)); break;
    case "fill": {
      const r = contrast(hex, WHITE);
      if (r < 4.5) ok = false;
      lines.push(`white ink ${r.toFixed(2)}${r < 4.5 ? " FAIL" : ""}`);
      break;
    }
    case "fill-dark": {
      const r = contrast(hex, SAND[800]);
      const w = contrast(hex, WHITE);
      if (r < 4.5) ok = false;
      lines.push(`sand-800 ink ${r.toFixed(2)}${r < 4.5 ? " FAIL" : ""} · white ${w.toFixed(2)} (white forbidden here)`);
      break;
    }
    case "graphics": {
      const w = contrast(hex, WHITE);
      const d = contrast(hex, SAND[800]);
      const usable = w >= 4.5 || d >= 4.5;
      if (usable) ok = false;
      lines.push(`white ${w.toFixed(2)} · dark ink ${d.toFixed(2)}` +
        (usable ? "  <- USABLE AS TEXT: promote it or relabel it" : "  (correctly text-hostile)"));
      break;
    }
    default: lines.push(...against(LIGHT_GROUNDS, 0));
  }

  if (!ok) failures++;
  if (!ok || verbose) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(14)} ${hex}  [${role}]  ${lines.join(" · ")}`);
  }
}

heading("BHALYAM palette — contrast matrix (values read from client/tailwind.config.js)");
console.log(`  Light grounds: ${LIGHT_GROUNDS.map(([n, h]) => `${n} ${h}`).join(" · ")}`);
console.log(`  Dark grounds:  ${DARK_GROUNDS.map(([n, h]) => `${n} ${h}`).join(" · ")}`);

let checked = 0;
for (const [ramp, steps] of Object.entries(CONTRACT)) {
  if (!C[ramp]) { console.log(`\n  MISSING RAMP: ${ramp} is not declared in the config`); failures++; continue; }
  if (verbose) console.log(`\n  -- ${ramp} --`);
  for (const [step, role] of Object.entries(steps)) {
    const hex = C[ramp][step];
    if (!hex) { console.log(`  FAIL  ${ramp}-${step}  not declared in the config`); failures++; continue; }
    check(ramp, step, hex, role);
    checked++;
  }
}

heading("Result");
console.log(`  ${checked} steps checked across ${Object.keys(CONTRACT).length} ramps.`);
if (failures === 0) {
  console.log("  Every step meets the role it is declared for.");
  console.log("  Every graphics-only step is measurably unusable for text.");
} else {
  console.log(`  ${failures} step(s) do not meet the role they are declared for.`);
}
console.log("");
process.exit(failures === 0 ? 0 : 1);
