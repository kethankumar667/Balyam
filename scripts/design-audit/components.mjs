#!/usr/bin/env node
/**
 * Component duplication and style variance.
 *
 * Produces the figures in `COMPONENT-CONSISTENCY-REPORT.md`.
 *
 * ── The question this answers ─────────────────────────────────────────
 * "Are BHALYAM's buttons consistent?" is not answerable by looking at
 * buttons — there are 683 of them. It IS answerable by asking how many
 * distinct *signatures* they carry, where a signature is a deliberately
 * impoverished description: radius × weight, nothing else. No colour, no
 * padding, no shadow, no press behaviour.
 *
 * The impoverishment is the point. If a product cannot agree on two
 * properties, it certainly has not agreed on the fifteen this ignores. A
 * signature count is therefore a floor on the real variance, and a floor is
 * the honest thing to report.
 *
 * ── Chrome vs games ───────────────────────────────────────────────────
 * Counted separately, because `AGENTS.md` §8 explicitly sanctions bespoke
 * in-game treatment. A Nokia game SHOULD have its own buttons. The lounge
 * should not have twenty-two kinds. Merging the two would both inflate the
 * number and give the real problem somewhere to hide.
 *
 *   node scripts/design-audit/components.mjs
 */

import fs from "node:fs";
import { CLIENT_SRC, walk, rel, isGameSurface, heading, row } from "./lib.mjs";

const sources = walk(CLIENT_SRC, [".tsx"]).map((f) => ({
  rel: rel(f), src: fs.readFileSync(f, "utf8"), game: isGameSurface(rel(f)),
}));
const chrome = sources.filter((s) => !s.game);

const RADIUS = /rounded-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|pill|\[[^\]]+\])/;
const WEIGHT = /font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;
const SHADOW = /shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none|lift-[123]|\[[^\]]+\])/;

/** Pull the className string out of every element matching `tag`. */
function classNamesFor(src, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[\\s\\S]{0,900}?>`, "g");
  for (const m of src.matchAll(re)) {
    const cls = m[0].match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
    if (cls) out.push(cls[1] || cls[2] || cls[3] || "");
  }
  return out;
}

/* ───────────────────────────── buttons ───────────────────────────── */

heading("Buttons");
let btnTotal = 0, btnFiles = new Set();
const signatures = new Map();
for (const s of sources) {
  const list = classNamesFor(s.src, "button");
  if (list.length) { btnTotal += list.length; btnFiles.add(s.rel); }
  if (s.game) continue;
  for (const cls of list) {
    const r = (cls.match(RADIUS) || ["(no radius)"])[0];
    const w = (cls.match(WEIGHT) || ["(no weight)"])[0];
    const key = `${r} · ${w}`;
    signatures.set(key, (signatures.get(key) || 0) + 1);
  }
}
// Two counts, deliberately. The raw tag count is the honest total; the
// signature analysis can only see className strings it can extract statically,
// so it covers a subset. Reporting only the subset would understate the sprawl;
// reporting only the total would overstate what the signatures prove.
const rawButtons = sources.reduce((s, x) => s + [...x.src.matchAll(/<button\b/g)].length, 0);
row("<button> elements (raw tag count)", rawButtons);
row("  …with a statically-readable className", btnTotal);
row("  …across files", btnFiles.size);
row("Distinct chrome signatures (radius x weight)", signatures.size);
console.log("");
for (const [k, n] of [...signatures.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  row(`   ${k}`, n, 52);
}

/**
 * The five named wrapper exports, plus real usage of the base `<Button`
 * itself (`variant="chrome"`/`"auth"` consumers — AppHeader, AuthControls —
 * never mention any of the five names, so a wrapper-only regex undercounted
 * real adoption the moment a caller reached for `<Button variant=...>`
 * directly). `<Button\s` requires an attribute or multi-line prop list to
 * follow, same reasoning as the `<Modal\s` fix above: excludes this file's
 * own bare mentions of the component by name in prose, which no real call
 * site is ever written as.
 */
const dlsButtons = /\b(?:Primary|Secondary|Danger|TournamentCTA|Reward)Button\b|<Button\s/;
const dlsRefs = sources.filter((s) => dlsButtons.test(s.src));
console.log("");
row("Files referencing DLS Buttons", dlsRefs.length);
for (const s of dlsRefs) console.log("     " + s.rel);

/* ───────────────────────────── overlays ───────────────────────────── */

heading("Modals / overlays");
let overlays = 0; const overlayFiles = new Map();
const backdrops = new Map(), blurs = new Map();
for (const s of sources) {
  const n = [...s.src.matchAll(/fixed inset-0/g)].length;
  if (n) { overlays += n; overlayFiles.set(s.rel, n); }
  for (const m of s.src.matchAll(/bg-black\/(\d+)/g)) backdrops.set(m[0], (backdrops.get(m[0]) || 0) + 1);
  for (const m of s.src.matchAll(/backdrop-blur-(2?xs|sm|md|lg|xl|2xl|3xl|none)\b/g)) blurs.set(m[0], (blurs.get(m[0]) || 0) + 1);
}
row("`fixed inset-0` overlays", overlays);
row("  …across files", overlayFiles.size);
row("role=\"dialog\"", [...sources].reduce((s, x) => s + [...x.src.matchAll(/role="dialog"/g)].length, 0));
row("aria-modal", [...sources].reduce((s, x) => s + [...x.src.matchAll(/aria-modal/g)].length, 0));

/**
 * Focus-trap detection — three ways a file ends up with one.
 *
 * The first version of this line only matched named helpers
 * (`useFocusTrap`/`trapFocus`/`FocusTrap`) and reported 0, which is what
 * produced two contradictory audits of the same codebase: BHALYAM's traps
 * were hand-rolled inline (`e.key === "Tab"` + a focusable-element query),
 * not routed through a shared helper, so the true count was invisible to a
 * name-only grep. That inline pattern is still checked below (requiring
 * both halves — cycling focus AND knowing what "the focusable elements"
 * even are — so a file that merely swallows Tab for an unrelated reason
 * doesn't get counted).
 *
 * Since then, four of those inline copies (plus five more dialogs that had
 * no trap at all) were migrated onto one shared `<Modal>` — so a file can
 * now also have a trap by *rendering* it. `<Modal\s` requires real JSX
 * usage (an attribute or a multi-line prop list follows); the bare `<Modal>`
 * this script's own migration comments use to refer to the component by
 * name in prose is deliberately excluded — every real call site passes at
 * least `open`, so that exact zero-attribute form never appears as usage.
 * `\s` (not `[ \t\n]`) is deliberate too: this repo has a mix of LF and
 * CRLF files, and `\s` matches either line ending.
 */
const namedFocusTrap = /\btrapFocus\b|\bFocusTrap\b/;
const usesFocusTrapHook = /useFocusTrap\s*[(<]/;
const usesSharedModal = /<Modal\s/;
const inlineTabCycle = /key\s*===\s*["']Tab["']/;
const focusableQuery = /querySelectorAll[^;]*(?:button|href|tabindex|input)/is;
const trapFiles = sources.filter((s) =>
  namedFocusTrap.test(s.src) ||
  usesFocusTrapHook.test(s.src) ||
  usesSharedModal.test(s.src) ||
  (inlineTabCycle.test(s.src) && focusableQuery.test(s.src))
);
row("Focus-trap implementations (own + via shared <Modal>)", trapFiles.length);
for (const s of trapFiles) console.log("     " + s.rel);

/**
 * Focus restoration — did anything save the trigger and refocus it on close?
 *
 * First cut of this matched any co-occurrence of `activeElement` and
 * `.focus()` and returned 6 — every one of them was `document.activeElement
 * === first` / `=== last`, the CYCLING comparison inside the trap's own Tab
 * handler (§ above), not the trigger being saved. Comparison (`===`) and
 * assignment (an `=` that is not `===`, capturing the element into a
 * variable/ref) are opposite operations here and the regex has to tell them
 * apart or it counts a trap's internals as its own missing feature.
 *
 * `useFocusTrap` (extracted into client/src/hooks/useFocusTrap.ts, a `.ts`
 * file this `.tsx`-only walk cannot see directly) is the one place that
 * assignment now lives; every file below has it by calling the hook or
 * rendering `<Modal>`, not by re-implementing the assignment per file — that
 * consolidation is the point, not a gap in this count.
 */
const savesActiveElement = /=\s*document\.activeElement(?!\s*[=!]==?)/;
const restoreFiles = sources.filter((s) =>
  (savesActiveElement.test(s.src) && /\.focus\(\)/.test(s.src)) ||
  usesFocusTrapHook.test(s.src) ||
  usesSharedModal.test(s.src)
);
row("Focus restoration on close", restoreFiles.length);
for (const s of restoreFiles) console.log("     " + s.rel);

/**
 * Escape-to-close — inline `key === "Escape"`, or `<Modal>` used *with*
 * `onClose` (Escape is `<Modal>`'s job only when there's something to call;
 * `open`+`onClose` land within the same short prop list at every real call
 * site in this codebase, so a 400-char window from the tag is enough to
 * decide it without a full JSX parse). A dialog that intentionally passes no
 * `onClose` — BHALYAM has exactly one, the first-run consent gate, which
 * must be answered rather than dismissed — correctly does NOT count here.
 */
const inlineEscape = /key\s*===\s*["']Escape["']/;
const modalWithOnClose = /<Modal\b[\s\S]{0,400}?onClose=/;
const escapeFiles = sources.filter((s) => inlineEscape.test(s.src) || modalWithOnClose.test(s.src));
row("Escape closes dialog", escapeFiles.length);
for (const s of escapeFiles) console.log("     " + s.rel);
console.log("");
row("Distinct backdrop opacities", backdrops.size);
console.log("   " + [...backdrops.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}(${n})`).join("  "));
row("Distinct backdrop blur steps", blurs.size);
console.log("   " + [...blurs.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}(${n})`).join("  "));
console.log("");
console.log("  Highest concentrations:");
for (const [f, n] of [...overlayFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) row(`   ${f}`, n, 52);

/* ───────────────────────────── cards ───────────────────────────── */

heading("Card containers (chrome only)");
const cardSigs = new Map();
let cardTotal = 0;
for (const s of chrome) {
  for (const cls of classNamesFor(s.src, "div")) {
    if (!RADIUS.test(cls) || !/\bborder\b|\bborder-2\b/.test(cls)) continue;
    cardTotal++;
    const r = (cls.match(RADIUS) || ["?"])[0];
    const b = /\bborder-2\b/.test(cls) ? "border-2" : "border";
    const sh = (cls.match(SHADOW) || ["(no shadow)"])[0];
    const key = `${r} · ${b} · ${sh}`;
    cardSigs.set(key, (cardSigs.get(key) || 0) + 1);
  }
}
row("Matched card containers", cardTotal);
row("Distinct signatures (radius x border x shadow)", cardSigs.size);
console.log("");
for (const [k, n] of [...cardSigs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) row(`   ${k}`, n, 60);
row("  signatures used fewer than 8 times", [...cardSigs.values()].filter((n) => n < 8).length, 60);

/* ───────────────────────────── other families ───────────────────────────── */

heading("Other shared families");
row("<input> elements (chrome)", chrome.reduce((s, x) => s + [...x.src.matchAll(/<input\b/g)].length, 0));
row("Toast implementations", sources.filter((s) => /function\s+\w*Toast\s*\(/.test(s.src)).length);
row("Tab-state components", sources.filter((s) => /activeTab|setActiveTab|selectedTab/.test(s.src)).length);
row("  …with role=\"tab\"", sources.filter((s) => /activeTab|setActiveTab|selectedTab/.test(s.src) && /role="tab"/.test(s.src)).length);
row("Avatar implementations", sources.filter((s) => /function\s+\w*Avatars?\s*\(/.test(s.src)).length);
row("Tooltip components", sources.filter((s) => /role="tooltip"|function\s+\w*Tooltip\s*\(/.test(s.src)).length);
row("Native title= attributes (hover-only)", sources.reduce((s, x) => s + [...x.src.matchAll(/\stitle="/g)].length, 0));

heading("Accessibility affordances");
row("aria-label", sources.reduce((s, x) => s + [...x.src.matchAll(/aria-label/g)].length, 0));
row("aria-live", sources.reduce((s, x) => s + [...x.src.matchAll(/aria-live/g)].length, 0));
row("sr-only", sources.reduce((s, x) => s + [...x.src.matchAll(/sr-only/g)].length, 0));

heading("Dual-layout compliance (Platform Rule 3)");
import path from "node:path";
const gamesDir = path.join(CLIENT_SRC, "games");
let ok = 0, total = 0;
for (const d of fs.readdirSync(gamesDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === "shared" || d.name === "pro") continue;
  const fileList = fs.readdirSync(path.join(gamesDir, d.name));
  const m = fileList.some((f) => f.endsWith("BoardMobile.tsx"));
  const k = fileList.some((f) => f.endsWith("BoardDesktop.tsx"));
  total++;
  if (m && k) ok++; else console.log(`   MISSING  ${d.name}  mobile=${m} desktop=${k}`);
}
row("Games with both mobile + desktop boards", `${ok} / ${total}`);
console.log("");
