#!/usr/bin/env node
/**
 * Token declaration vs. token adoption.
 *
 * Produces the figures in `DESIGN-BASELINE.md` §5 and `DESIGN-SYSTEM-AUDIT.md`
 * §1.5, §1.6, §2, §3, §4, §5 and §6.
 *
 * ── The question this answers ─────────────────────────────────────────
 * A design system is not the tokens you declare, it is the tokens components
 * reach for. This script counts both and prints the gap.
 *
 * The gap is the whole story: BHALYAM declares a semantic colour layer
 * (`success` / `warning` / `danger` / `info`) and uses it zero times, while
 * expressing the same four meanings 1,900+ times in hand-picked palette
 * classes. A token with no consumers is not a feature; it is a comment.
 *
 * ── Why it also counts weights, radii, shadows and durations ──────────
 * Because "inconsistent" is not a design opinion when you can count it. A
 * product with 113 distinct one-off shadows and a designed 3-step elevation
 * ladder used 7 times does not have an elevation system, and no amount of
 * review-by-taste establishes that as firmly as those two numbers side by side.
 *
 *   node scripts/design-audit/tokens.mjs
 */

import fs from "node:fs";
import { CLIENT_SRC, walk, rel, isGameSurface, heading, row } from "./lib.mjs";

const files = walk(CLIENT_SRC, [".tsx", ".ts"]);
const sources = files.map((f) => ({ rel: rel(f), src: fs.readFileSync(f, "utf8"), game: isGameSurface(rel(f)) }));
const all = sources.map((s) => s.src).join("\n");
const chrome = sources.filter((s) => !s.game).map((s) => s.src).join("\n");

const count = (re, hay = all) => [...hay.matchAll(re)].length;
const distinct = (re, hay = all) => new Set([...hay.matchAll(re)].map((m) => m[0])).size;
const tally = (re, hay = all) => {
  const m = new Map();
  for (const x of hay.matchAll(re)) m.set(x[0], (m.get(x[0]) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const PREFIX = "(?:bg|text|border|from|to|via|ring|fill|stroke|divide|placeholder|caret|accent|decoration|outline)";

/* ───────────────────────────── colour tokens ───────────────────────────── */

heading("Colour token adoption");
const namedTokenClasses = count(new RegExp(`\\b${PREFIX}-(?:ink-(?:hi|mid|lo|mute)|surface-(?:[0-3]|rim)|brand-\\d+|gold-\\d+|bhalyam-[a-z-]+|success|warning|danger|info)\\b`, "g"));
// `[var(--foo)]` is Tailwind's arbitrary-value escape hatch, not a named
// utility — a real, distinct way to consume a token (forced whenever an
// opacity modifier would otherwise be needed, see TOKEN-ADOPTION-REPORT.md
// §"Tailwind opacity-modifier limitation"). Excluded from the original regex
// below, which undercounted adoption for every var()-based swap; counted
// here as its own bucket so the split is visible, and summed into the same
// "Design-token classes" total the compliance % is built from.
const varTokenClasses = count(new RegExp(`\\b${PREFIX}-\\[var\\(--[a-zA-Z0-9-]+\\)\\]`, "g"));
const tokenClasses = namedTokenClasses + varTokenClasses;
const paletteClasses = count(new RegExp(`\\b${PREFIX}-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`, "g"));
const arbitrary = count(new RegExp(`\\b${PREFIX}-\\[#[0-9a-fA-F]{3,8}\\]`, "g"));
const total = tokenClasses + paletteClasses + arbitrary;
row("Design-token classes (named utility)", namedTokenClasses);
row("Design-token classes (var() arbitrary)", varTokenClasses);
row("Design-token classes (total)", tokenClasses);
row("Raw Tailwind palette classes", paletteClasses);
row("Arbitrary hex classes", arbitrary);
row("TOTAL colour-bearing classes", total);
row("Token compliance", `${((tokenClasses / total) * 100).toFixed(1)}%`);

heading("Semantic layer — declared vs used");
for (const t of ["success", "warning", "danger", "info"]) {
  row(`  ${PREFIX.slice(0, 6)}…-${t}`, count(new RegExp(`\\b${PREFIX}-${t}\\b`, "g")));
}
row("  green-*/emerald-* (meaning: success)", count(/\b(?:bg|text|border|ring|fill)-(?:green|emerald)-\d{2,3}\b/g));
row("  red-*/rose-* (meaning: danger)", count(/\b(?:bg|text|border|ring|fill)-(?:red|rose)-\d{2,3}\b/g));
row("  amber-*/yellow-* (meaning: warning)", count(/\b(?:bg|text|border|ring|fill)-(?:amber|yellow)-\d{2,3}\b/g));
row("  blue-*/sky-*/cyan-* (meaning: info)", count(/\b(?:bg|text|border|ring|fill)-(?:blue|sky|cyan)-\d{2,3}\b/g));

heading("Palette family share");
for (const fam of ["amber", "stone", "zinc", "slate", "emerald", "rose"]) {
  row(`  ${fam}-*`, count(new RegExp(`\\b${PREFIX}-${fam}-\\d{2,3}\\b`, "g")));
}
row("  bhalyam-*", count(new RegExp(`\\b${PREFIX}-bhalyam-[a-z-]+`, "g")));
row("  ink-*", count(/\btext-ink-(?:hi|mid|lo|mute)\b/g));
row("  surface-*", count(/\bbg-surface-[0-3]\b/g));

/* ───────────────────────────── typography ───────────────────────────── */

heading("Typography");
row("On-scale sizes (text-xs … text-9xl)", count(/\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g));
const arbSizes = tally(/\btext-\[[0-9.]+(?:px|rem)\]/g);
row("Arbitrary sizes", arbSizes.reduce((s, x) => s + x[1], 0));
row("  distinct arbitrary sizes", arbSizes.length);
row("  sub-pixel sizes (e.g. 12.5px)", arbSizes.filter(([v]) => /\.\d/.test(v)).length);
row("  sizes below 12px", arbSizes.filter(([v]) => parseFloat(v.match(/[\d.]+/)[0]) < 12).reduce((s, x) => s + x[1], 0));

const weights = tally(/\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g);
const wTotal = weights.reduce((s, x) => s + x[1], 0);
// `semibold` contains "bold" — match the exact token, not a substring, or 600
// gets counted as 700 and the headline weight figure comes out 7 points high.
const HEAVY = new Set(["font-bold", "font-extrabold", "font-black"]);
const heavy = weights.filter(([w]) => HEAVY.has(w)).reduce((s, x) => s + x[1], 0);
heading("Font weight distribution");
for (const [w, n] of weights) row(`  ${w}`, `${n}  (${((n / wTotal) * 100).toFixed(1)}%)`, 30);
row("  >= 700", `${heavy}  (${((heavy / wTotal) * 100).toFixed(1)}%)`, 30);

/* ───────────────────────────── spacing ───────────────────────────── */

heading("Spacing");
row("On-scale padding/margin/gap", count(/\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\d+(?:\.\d+)?\b/g));
const arbSpace = tally(/\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\[[^\]]+\]/g);
row("Arbitrary spacing", arbSpace.reduce((s, x) => s + x[1], 0));
row("  distinct", arbSpace.length);
row("  of which safe-area env()", arbSpace.filter(([v]) => v.includes("env(")).reduce((s, x) => s + x[1], 0));
row("  of which viewport-relative (vh/vw/%)", arbSpace.filter(([v]) => /v[hw]|%/.test(v)).reduce((s, x) => s + x[1], 0));

/* ───────────────────────────── elevation ───────────────────────────── */

heading("Elevation");
row("Raw Tailwind shadows", count(/\bshadow-(?:sm|md|lg|xl|2xl|inner|none)\b/g));
row("shadow-xs / shadow-2xs", count(/\bshadow-2?xs\b/g));
const arbShadow = tally(/\bshadow-\[[^\]]+\]/g);
row("One-off shadow-[…]", arbShadow.reduce((s, x) => s + x[1], 0));
row("  distinct", arbShadow.length);
row("Designed ladder shadow-lift-1/2/3", count(/\bshadow-lift-[123]\b/g));
row("shadow-rim-gold", count(/\bshadow-rim-gold\b/g));

heading("Stacking");
const z = tally(/\bz-(?:\d+|\[\d+\])/g);
row("Distinct z-index values", z.length);
console.log("   " + z.map(([v, n]) => `${v}(${n})`).join("  "));

/* ───────────────────────────── shape ───────────────────────────── */

heading("Shape");
for (const [v, n] of tally(/\brounded-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|pill)\b/g)) row(`  ${v}`, n, 30);
const arbRadius = tally(/\brounded-\[[^\]]+\]/g);
row("  arbitrary rounded-[…]", `${arbRadius.reduce((s, x) => s + x[1], 0)} (${arbRadius.length} distinct)`, 30);

/* ───────────────────────────── motion ───────────────────────────── */

heading("Motion");
row("Transition utilities", count(/\btransition\b/g));
const durs = tally(/\bduration-\d+\b/g);
row("Explicit durations", durs.reduce((s, x) => s + x[1], 0));
row("  distinct values", durs.length);
console.log("   " + durs.map(([v, n]) => `${v}(${n})`).join("  "));
row("Named easing tokens used", count(/\bease-(?:out-quart|in-out-arc|spring)\b/g));
const fm = sources.filter((s) => /framer-motion/.test(s.src));
const guarded = sources.filter((s) => /prefers-reduced-motion|useReducedMotion|reducedMotion/.test(s.src)).map((s) => s.rel);
row("Files importing framer-motion", fm.length);
row("  …of which guard reduced motion", fm.filter((s) => guarded.includes(s.rel)).length);
row("  …with NO reduced-motion guard", fm.filter((s) => !guarded.includes(s.rel)).length);

/* ───────────────────────────── icons ───────────────────────────── */

heading("Icon systems");
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]/gu;
let chromeEmoji = 0, gameEmoji = 0;
const distinctEmoji = new Set();
for (const s of sources) {
  const body = s.src.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n");
  const hits = body.match(EMOJI) || [];
  hits.forEach((e) => distinctEmoji.add(e));
  if (s.game) gameEmoji += hits.length; else chromeEmoji += hits.length;
}
row("lucide-react consumers", sources.filter((s) => /lucide-react/.test(s.src)).length);
row("design-system/icons consumers", sources.filter((s) => /design-system\/icons|from "\.\.\/icons"/.test(s.src) && !s.rel.startsWith("design-system/")).length);
row("bhalyam/icons consumers", sources.filter((s) => /bhalyam\/icons/.test(s.src)).length);
row("Emoji glyphs in PRODUCT CHROME", chromeEmoji);
row("Emoji glyphs in game surfaces", gameEmoji);
row("Distinct emoji used as iconography", distinctEmoji.size);

/* ───────────────────────────── DLS adoption ───────────────────────────── */

heading("Design-system adoption");
const nonDls = sources.filter((s) => !s.rel.startsWith("design-system/"));
row("Total .tsx/.ts source files", sources.length);
row("Files importing design-system", nonDls.filter((s) => /design-system/.test(s.src)).length);
row("Files using DLS Buttons", nonDls.filter((s) => /\b(?:Primary|Secondary|Danger|TournamentCTA|Reward)Button\b/.test(s.src)).length);
row("Files using SURFACES.*", nonDls.filter((s) => /\bSURFACES\./.test(s.src)).length);
row("Files using TYPOGRAPHY.*", nonDls.filter((s) => /\bTYPOGRAPHY\./.test(s.src)).length);
row("Files using SPACING.*", nonDls.filter((s) => /\bSPACING\./.test(s.src)).length);
row("Files using SkeletonLoader", nonDls.filter((s) => /SkeletonLoader/.test(s.src)).length);
row("Files using EmptyStateIllustration", nonDls.filter((s) => /EmptyStateIllustration/.test(s.src)).length);
row("Files using PremiumErrorState", nonDls.filter((s) => /PremiumErrorState/.test(s.src)).length);
row("Files hand-rolling animate-pulse", nonDls.filter((s) => /animate-pulse/.test(s.src)).length);

console.log("");
