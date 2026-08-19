#!/usr/bin/env node
/**
 * Utility classes the source writes that Tailwind emits no CSS for.
 *
 * ── Why this is the highest-value check in the design toolchain ───────
 * A dead utility class is invisible in every way that normally catches a bug.
 * It type-checks. It passes review — the reviewer reads `active:scale-98` and
 * sees press feedback. It passes tests, because no test asserts on a rendered
 * shadow. It only shows up as "the app feels a bit flat", which nobody files.
 *
 * On this codebase the first run of this script found **196 dead declarations**,
 * eleven of them inside the design system itself:
 *
 *   • `shadow-xs` (93) and `shadow-2xs` (41) — Tailwind v4 names adopted while
 *     on v3. 134 surfaces asked for the lightest lift in the system and
 *     rendered perfectly flat.
 *   • `border-stone-750` — sets a border WIDTH with an unresolvable colour, so
 *     Tailwind preflight's `border-color: #e5e7eb` applied. A near-white
 *     hairline drawn around near-black modals.
 *   • `bg-stone-750` — the six shimmer bars in `SkeletonLoader` painted
 *     nothing. The primitive that exists so the product never shows a blank
 *     loading state was showing blank bars.
 *   • `active:scale-98` (18) — including the PLAY NOW button on every game
 *     card. Declared tactile feedback, rendered none.
 *
 * Every one of those looked correct in the diff.
 *
 * ── How it decides ────────────────────────────────────────────────────
 * Compile the real stylesheet with the real Tailwind CLI, strip the CSS
 * escapes, and ask whether each class token appears preceded by `.` or `:`.
 * Negative-prefixed utilities (`-top-24`, `-translate-x-1/2`) are excluded
 * explicitly: they appear in source without the leading `-` captured by the
 * scanner, and reporting them produces a page of false positives that trains
 * the reader to ignore the output.
 *
 *   node scripts/design-audit/deadClasses.mjs
 *
 * Exits 1 when anything is dead, so it can gate a build.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import { REPO_ROOT, CLIENT_SRC, walk, rel, heading, row } from "./lib.mjs";

const CLIENT = path.join(REPO_ROOT, "client");
const outCss = path.join(os.tmpdir(), `bhalyam-tw-${process.pid}.css`);

process.stdout.write("Compiling Tailwind… ");
// Resolve the CLI's JS entry and run it with the current node rather than
// shelling out to `npx`. `npx.cmd` is a batch file, and `execFileSync` on
// Windows refuses to spawn one without `shell: true` — which would then need
// every path quoting. Calling the entry directly sidesteps both.
const require_ = createRequire(path.join(CLIENT, "package.json"));
const tailwindCli = require_.resolve("tailwindcss/lib/cli.js");
execFileSync(process.execPath, [tailwindCli, "-i", "src/index.css", "-o", outCss], {
  cwd: CLIENT,
  stdio: "pipe",
});
const cssRaw = fs.readFileSync(outCss, "utf8");
// Tailwind escapes `.` `/` `:` `[` in class selectors. Strip the escapes so a
// plain substring test can find `.h-4\.5` when looking for `h-4.5`.
const css = cssRaw.split(String.fromCharCode(92)).join("");
console.log(`${(cssRaw.length / 1024).toFixed(0)} kB`);

const VARIANTS = "(?:hover:|focus:|focus-visible:|active:|group-hover:|peer-focus:|disabled:|sm:|md:|lg:|xl:|2xl:|dark:)*";
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PATTERNS = [
  new RegExp(`\\b${VARIANTS}(scale-\\d+)\\b`, "g"),
  new RegExp(`\\b${VARIANTS}((?:bg|text|border|from|to|via|ring|fill|stroke|divide|placeholder|caret|accent)-(?:${PALETTE})-\\d{2,3})(?:\\/\\d+)?\\b`, "g"),
  new RegExp(`\\b${VARIANTS}((?:w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|inset|top|bottom|left|right)-\\d+(?:\\.\\d+)?)\\b`, "g"),
  new RegExp(`\\b${VARIANTS}(opacity-\\d+|duration-\\d+|delay-\\d+|z-\\d+|rotate-\\d+|blur-\\w+|backdrop-blur-\\w+|leading-\\d+)\\b`, "g"),
  new RegExp(`\\b${VARIANTS}(shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none)|rounded-(?:xs|sm|md|lg|xl|2xl|3xl|4xl|full|pill|none)|text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl))\\b`, "g"),
];

const found = new Map();
for (const file of walk(CLIENT_SRC, [".tsx", ".ts"])) {
  const src = fs.readFileSync(file, "utf8");
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const cls = m[1];
      // A negative utility is written `-top-24`; the scanner captures `top-24`
      // and the stylesheet holds `.-top-24`. Not a defect.
      if (src[m.index - 1] === "-" || m[0].startsWith("-")) continue;
      if (new RegExp(`-${cls.replace(/[.]/g, "\\.")}\\b`).test(src.slice(Math.max(0, m.index - 1), m.index + cls.length + 1))) continue;
      if (!found.has(cls)) found.set(cls, { n: 0, files: new Set() });
      const rec = found.get(cls);
      rec.n++;
      rec.files.add(rel(file));
    }
  }
}

const dead = [];
for (const [cls, rec] of found) {
  const token = cls.replace(/[-]/g, "\\-").replace(/[.]/g, "\\.");
  if (!new RegExp(`[.\\\\:]${token}(?![\\w-])`).test(css)) {
    dead.push({ cls, n: rec.n, files: [...rec.files] });
  }
}
dead.sort((a, b) => b.n - a.n);

heading("Utility classes written in source that emit NO CSS");
row("Distinct classes checked", found.size);
row("Dead classes", dead.length);
row("Dead declarations", dead.reduce((s, d) => s + d.n, 0));

if (dead.length) {
  console.log("");
  for (const d of dead) {
    console.log(`  ${String(d.n).padStart(4)}  ${d.cls.padEnd(26)} ${d.files.slice(0, 3).join(", ")}${d.files.length > 3 ? ` (+${d.files.length - 3})` : ""}`);
  }
  console.log("\n  Fix at the token layer (client/tailwind.config.js), not at the call sites:");
  console.log("  a class 40 people wrote is a token the config is missing, not 40 mistakes.");
} else {
  console.log("\n  None. Every utility the source writes resolves to CSS.");
}

fs.rmSync(outCss, { force: true });
console.log("");
process.exit(dead.length ? 1 : 0);
