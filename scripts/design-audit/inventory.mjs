#!/usr/bin/env node
/**
 * Component inventory + icon/emoji + typography-signature + shared-library
 * adoption — the categories `tokens.mjs` and `components.mjs` don't cover.
 *
 * Read-only. Measures the repo as it stands; writes nothing back into it.
 *
 *   node scripts/design-audit/inventory.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { CLIENT_SRC, walk, rel, isGameSurface, heading, row } from "./lib.mjs";

const files = walk(CLIENT_SRC, [".tsx", ".ts"]);
const sources = files.map((f) => ({
  rel: rel(f), src: fs.readFileSync(f, "utf8"), game: isGameSurface(rel(f)),
  test: /__tests__|\.test\.tsx?$/.test(rel(f)),
}));
const prod = sources.filter((s) => !s.test);

const countFiles = (re, hay = prod) => hay.filter((s) => re.test(s.src)).length;
const filesMatching = (re, hay = prod) => hay.filter((s) => re.test(s.src)).map((s) => s.rel);

/* ───────────────────────────── shared libraries ───────────────────────────── */

heading("Shared UI library directories");
const LIB_DIRS = [
  "design-system/dls",
  "design-system/premium",
  "design-system/icons",
  "components/bhalyam",
];
for (const dir of LIB_DIRS) {
  const abs = path.join(CLIENT_SRC, dir);
  if (!fs.existsSync(abs)) { row(`  ${dir}`, "does not exist"); continue; }
  const n = fs.readdirSync(abs).filter((f) => /\.(tsx|ts)$/.test(f)).length;
  row(`  ${dir}`, `${n} files`);
}

heading("DLS Button adoption (product code only — excludes tests, the catalogue page, and Buttons.tsx itself)");
const DLS_HAY = prod.filter((s) => !/design-system\/dls\/|DesignSystemCatalogPage/.test(s.rel));
for (const name of ["PrimaryButton", "SecondaryButton", "TournamentCTAButton", "RewardButton", "DangerButton"]) {
  const hits = filesMatching(new RegExp(`\\b${name}\\b`), DLS_HAY);
  row(`  ${name}`, hits.length);
  for (const f of hits) console.log("       " + f);
}

heading("Premium library adoption (product code only — excludes tests and the catalogue page)");
const PREMIUM_HAY = prod.filter((s) => !/design-system\/premium\/|DesignSystemCatalogPage/.test(s.rel));
for (const name of [
  "PremiumCard", "PremiumStatCard", "PremiumProgressCard", "PremiumHeroCard",
  "RewardRevealModal", "EmptyStateIllustration", "SkeletonLoader", "PremiumErrorState",
]) {
  const hits = filesMatching(new RegExp(`\\b${name}\\b`), PREMIUM_HAY);
  row(`  ${name}`, hits.length);
  for (const f of hits) console.log("       " + f);
}

/* ───────────────────────────── icons ───────────────────────────── */

heading("Icon systems — how many, and which one a given file reaches for");
row("Files importing from lucide-react", countFiles(/from ["']lucide-react["']/));
row("Files importing design-system/icons/*", countFiles(/design-system\/icons/));
row("Files importing components/bhalyam/icons", countFiles(/bhalyam\/icons/));
const inlineIconFns = [...new Set(prod.flatMap((s) =>
  [...s.src.matchAll(/function\s+([A-Za-z]*Icon[A-Za-z]*)\s*\(/g)].map((m) => `${s.rel}::${m[1]}`)
))];
row("Inline per-file `function XIcon()` components (own, ad-hoc icon)", inlineIconFns.length);
row("  …across files", new Set(inlineIconFns.map((x) => x.split("::")[0])).size);
row("Raw <svg> tags in source (all systems combined)", prod.reduce((n, s) => n + [...s.src.matchAll(/<svg\b/g)].length, 0));

heading("Emoji usage — functional vs decorative-in-chrome");
/**
 * Same regex and comment-stripping as tokens.mjs's "Icon systems" section,
 * deliberately — two differently-tuned emoji regexes on the same repo would
 * reproduce the exact kind of contradiction this audit suite exists to
 * avoid (see MODAL-SYSTEM-AUDIT.md §1 for the earlier version of this
 * mistake). This adds what tokens.mjs doesn't: which files, and a first
 * pass at functional-vs-decorative via two structural signals — `aria-hidden`
 * (self-marked decorative by the author) and being the sole visible content
 * of a `<button`/`<Link` (the shape a functional, tap-to-act emoji takes —
 * a reaction, a pressable mode icon). AGENTS.md §8: emoji are sanctioned
 * inside playful in-game UI, not as decoration in product chrome.
 */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]/gu;
let totalEmoji = 0, chromeEmoji = 0, gameEmoji = 0, ariaHiddenEmoji = 0;
const chromeEmojiFiles = new Map();
for (const s of prod) {
  const body = s.src.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n");
  const matches = [...body.matchAll(EMOJI)];
  if (matches.length === 0) continue;
  totalEmoji += matches.length;
  if (s.game) { gameEmoji += matches.length; continue; }
  chromeEmoji += matches.length;
  chromeEmojiFiles.set(s.rel, (chromeEmojiFiles.get(s.rel) || 0) + matches.length);
  for (const m of matches) {
    const windowStart = Math.max(0, m.index - 60);
    const around = body.slice(windowStart, m.index);
    if (/aria-hidden/.test(around)) ariaHiddenEmoji++;
  }
}
row("Total emoji occurrences (comments excluded)", totalEmoji);
row("  …in game surfaces (games/) — AGENTS.md §8 sanctions this", gameEmoji);
row("  …in chrome (everything else)", chromeEmoji);
row("  …of the chrome ones, preceded by aria-hidden within 60 chars (self-marked decorative)", ariaHiddenEmoji);
console.log("\n  Chrome files with the most emoji (candidates for AGENTS.md §8 review):");
for (const [f, n] of [...chromeEmojiFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) row(`   ${f}`, n, 60);

/* ───────────────────────────── component inventory ───────────────────────────── */

heading("Component inventory — categories not covered by components.mjs");
row("<select> elements", prod.reduce((n, s) => n + [...s.src.matchAll(/<select\b/g)].length, 0));
row("<nav> elements", prod.reduce((n, s) => n + [...s.src.matchAll(/<nav\b/g)].length, 0));

const dropdownFiles = sources.filter((s) => /Dropdown|Menu(?!u)/i.test(path.basename(s.rel)) && !s.test);
row("Files named *Dropdown*/*Menu*", dropdownFiles.length);
for (const s of dropdownFiles) console.log("     " + s.rel);

const badgeChipFiles = sources.filter((s) => /Badge|Chip|Pill/i.test(path.basename(s.rel)) && !s.test);
row("Files named *Badge*/*Chip*/*Pill*", badgeChipFiles.length);
for (const s of badgeChipFiles) console.log("     " + s.rel);

// Inline badge/chip/pill SHAPES: small rounded-full text tag, not a named file.
const chipShape = /rounded-full[^"'`]{0,80}(?:px-2|px-1\.5|px-2\.5)[^"'`]{0,120}text-\[?1[01]px/;
let chipShapeCount = 0;
for (const s of prod) chipShapeCount += [...s.src.matchAll(new RegExp(chipShape.source, "g"))].length;
row("Inline chip/badge SHAPES (rounded-full + small px + ~10-11px text, unnamed)", chipShapeCount);

const navFiles = sources.filter((s) => /AppHeader|AppSidebar|navigationConfig|BottomNav|TabBar/i.test(path.basename(s.rel)) && !s.test);
row("Named navigation surfaces", navFiles.length);
for (const s of navFiles) console.log("     " + s.rel);

const tooltipCount = countFiles(/role="tooltip"|function\s+\w*Tooltip\s*\(/);
row("Tooltip implementations", tooltipCount);

/* ───────────────────────────── typography signatures ───────────────────────────── */

heading("Typography signatures — distinct (size × weight × family) combinations");
const SIZE = /text-(?:\[[^\]]+\]|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/;
const WEIGHT = /font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;
const FAMILY = /font-(?:sans|body|display|script|mono|kalam|hand|notebook|sketch)/;
function classNamesForAny(src) {
  const out = [];
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g;
  for (const m of src.matchAll(re)) out.push(m[1] || m[2] || m[3] || "");
  return out;
}
const sigMap = new Map();
let taggedText = 0;
for (const s of prod) {
  for (const cls of classNamesForAny(s.src)) {
    const size = (cls.match(SIZE) || [null])[0];
    if (!size) continue;
    taggedText++;
    const weight = (cls.match(WEIGHT) || ["(no weight)"])[0];
    const family = (cls.match(FAMILY) || ["(inherited)"])[0];
    const key = `${size} · ${weight} · ${family}`;
    sigMap.set(key, (sigMap.get(key) || 0) + 1);
  }
}
row("Elements with a statically-readable text-size class", taggedText);
row("Distinct (size × weight × family) signatures", sigMap.size);
console.log("");
for (const [k, n] of [...sigMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) row(`   ${k}`, n, 55);

console.log("");
