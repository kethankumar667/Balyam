#!/usr/bin/env node
/**
 * Colour inventory and near-duplicate clustering.
 *
 * Produces every figure in `DESIGN-SYSTEM-AUDIT.md` §1.1 and §1.2.
 *
 * ── The question this answers ─────────────────────────────────────────
 * "How many colours does BHALYAM have?" has two very different answers, and
 * the gap between them is the finding. Counting distinct hex literals gives a
 * number in the thousands. Counting *visually distinguishable* colours — by
 * collapsing everything within an RGB distance nobody can see — gives a number
 * in the dozens.
 *
 * A product with 1,500 colours has a palette problem. A product with 40
 * colours typed 1,500 ways has a TOKEN problem, and that is a different fix:
 * you do not redesign the palette, you name the forty and delete the rest.
 *
 * ── Why RGB distance and not ΔE ───────────────────────────────────────
 * ΔE2000 is the perceptually correct metric and would be better. RGB distance
 * is used here because it needs no dependency, and because at the threshold
 * that matters (< 12, i.e. "is this the same cream?") the two agree closely
 * enough that no cluster in this codebase changes membership. Where the answer
 * would be marginal, the cluster is reported with its members so a human can
 * judge.
 *
 *   node scripts/design-audit/colors.mjs
 *   node scripts/design-audit/colors.mjs --clusters=20
 */

import fs from "node:fs";
import { CLIENT_SRC, walk, rel, isGameSurface, rgbDistance, heading, row } from "./lib.mjs";

const topN = Number((process.argv.find((a) => a.startsWith("--clusters=")) || "").split("=")[1]) || 7;

const files = walk(CLIENT_SRC, [".tsx", ".ts", ".css"]);
const counts = new Map();          // hex -> occurrences
const chromeOnly = new Map();      // hex -> occurrences outside games/
let arbitraryClasses = 0;
let inlineStyleObjects = 0;
const inlineStyleFiles = new Set();

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const relPath = rel(file);
  const game = isGameSurface(relPath);

  for (const m of src.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const hex = "#" + m[1].toUpperCase();
    counts.set(hex, (counts.get(hex) || 0) + 1);
    if (!game) chromeOnly.set(hex, (chromeOnly.get(hex) || 0) + 1);
  }
  arbitraryClasses += [...src.matchAll(/(?:bg|text|border|from|to|via|ring|fill|stroke|shadow|decoration|outline|caret|accent)-\[#[0-9a-fA-F]{3,8}\]/g)].length;
  const inline = [...src.matchAll(/style=\{\{/g)].length;
  if (inline) { inlineStyleObjects += inline; inlineStyleFiles.add(relPath); }
}

const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);

/* ── cluster ─────────────────────────────────────────────────────── */
const claimed = new Set();
const clusters = [];
for (const [hex, n] of entries) {
  if (claimed.has(hex)) continue;
  claimed.add(hex);
  const group = [[hex, n]];
  for (const [other, on] of entries) {
    if (claimed.has(other)) continue;
    if (rgbDistance(hex, other) < 12) { claimed.add(other); group.push([other, on]); }
  }
  if (group.length > 1) clusters.push(group);
}
clusters.sort((a, b) => b.reduce((s, x) => s + x[1], 0) - a.reduce((s, x) => s + x[1], 0));

const inCluster = clusters.reduce((s, c) => s + c.length, 0);

heading("BHALYAM colour inventory");
row("Files scanned (tsx/ts/css, tests excluded)", files.length);
row("Distinct 6-digit hex literals", entries.length);
row("Total hex literal occurrences", entries.reduce((s, x) => s + x[1], 0));
row("Distinct hex in product chrome only", chromeOnly.size);
row("Arbitrary colour classes  -[#…]", arbitraryClasses);
row("Inline style={{ }} objects", inlineStyleObjects);
row("  …across files", inlineStyleFiles.size);

heading("Near-duplicate clustering (RGB distance < 12)");
row("Clusters found", clusters.length);
row("Colours inside a cluster", `${inCluster} / ${entries.length}`);
row("Share of palette that is near-duplicate", `${((inCluster / entries.length) * 100).toFixed(1)}%`);

heading(`Worst ${topN} clusters`);
for (const [i, c] of clusters.slice(0, topN).entries()) {
  const uses = c.reduce((s, x) => s + x[1], 0);
  console.log(`\n${i + 1}. ${c.length} distinct values, ${uses} uses`);
  console.log("   " + c.slice(0, 12).map(([h, n]) => `${h}(${n})`).join("  ") +
    (c.length > 12 ? `  … ${c.length - 12} more` : ""));
}

heading("Top 15 individual colours");
for (const [hex, n] of entries.slice(0, 15)) row(`  ${hex}`, n, 20);
