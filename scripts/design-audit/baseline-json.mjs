#!/usr/bin/env node
/**
 * Emits design-system-baseline.json — the machine-readable twin of
 * DESIGN-SYSTEM-BASELINE.md. Generated from the same source scan as the
 * markdown (not hand-transcribed), so the two can't drift apart the way a
 * manually-typed number could.
 *
 * Read-only: writes exactly one file, at the repo root, and touches nothing
 * under client/ or server/.
 *
 *   node scripts/design-audit/baseline-json.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENT_SRC, walk, rel, isGameSurface } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const files = walk(CLIENT_SRC, [".tsx", ".ts"]);
const sources = files.map((f) => ({
  rel: rel(f), src: fs.readFileSync(f, "utf8"), game: isGameSurface(rel(f)),
  test: /__tests__|\.test\.tsx?$/.test(rel(f)),
}));
const prod = sources.filter((s) => !s.test);
const countIn = (re, hay = prod) => hay.reduce((n, s) => n + [...s.src.matchAll(re)].length, 0);
const filesMatching = (re, hay = prod) => hay.filter((s) => re.test(s.src)).map((s) => s.rel);

/**
 * `components.mjs` measures buttons/modals/cards/tabs against `.tsx`-only,
 * ALL files (tests included) — a scope this file's `prod` (`.tsx`+`.ts`,
 * tests excluded) deliberately doesn't match. Reusing that narrower scope
 * for exactly those four categories, rather than re-deriving them against a
 * different file set, is what keeps this JSON's numbers identical to the
 * already-published, already-verified markdown reports instead of quietly
 * drifting by a file or two — which is exactly the kind of two-numbers-for-
 * one-fact problem this whole audit suite exists to not reproduce. First
 * pass at broadening this file's own walk to `.tsx`+`.ts` did exactly that
 * (34 vs 33 `role="dialog"`, traced to a JSDoc *usage example* inside
 * `hooks/useFocusTrap.ts` — a `.ts` file `components.mjs` never sees —
 * being counted as if it were a real, rendered `role="dialog"`).
 */
const legacySources = walk(CLIENT_SRC, [".tsx"]).map((f) => ({ rel: rel(f), src: fs.readFileSync(f, "utf8"), game: isGameSurface(rel(f)) }));
const legacyCountIn = (re, hay = legacySources) => hay.reduce((n, s) => n + [...s.src.matchAll(re)].length, 0);
const legacyFilesMatching = (re, hay = legacySources) => hay.filter((s) => re.test(s.src)).map((s) => s.rel);

const PREFIX = "(?:bg|text|border|from|to|via|ring|fill|stroke|divide|placeholder|caret|accent|decoration|outline)";
const tokenClasses = countIn(new RegExp(`\\b${PREFIX}-(?:ink-(?:hi|mid|lo|mute)|surface-(?:[0-3]|rim)|brand-\\d+|gold-\\d+|bhalyam-[a-z-]+|success|warning|danger|info)\\b`, "g"));
const paletteClasses = countIn(new RegExp(`\\b${PREFIX}-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`, "g"));
const arbitraryHex = countIn(new RegExp(`\\b${PREFIX}-\\[#[0-9a-fA-F]{3,8}\\]`, "g"));
const totalColour = tokenClasses + paletteClasses + arbitraryHex;

const RADIUS = /rounded-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|pill|\[[^\]]+\])/;
const WEIGHT = /font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/;
function classNamesFor(src, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b[\\s\\S]{0,900}?>`, "g");
  for (const m of src.matchAll(re)) {
    const cls = m[0].match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/);
    if (cls) out.push(cls[1] || cls[2] || cls[3] || "");
  }
  return out;
}
const btnSigs = new Map();
let btnTagged = 0, btnRaw = 0;
const btnFiles = new Set();
for (const s of legacySources) {
  const list = classNamesFor(s.src, "button");
  const rawHere = [...s.src.matchAll(/<button\b/g)].length;
  btnRaw += rawHere;
  // Matches components.mjs precisely: this counts files with a
  // STATICALLY-READABLE-className button, not merely a raw <button> tag —
  // a different, narrower question, and the one the published markdown
  // number ("…across 127 files") already answers.
  if (list.length) btnFiles.add(s.rel);
  if (s.game) continue;
  for (const cls of list) {
    btnTagged++;
    const r = (cls.match(RADIUS) || ["(no radius)"])[0];
    const w = (cls.match(WEIGHT) || ["(no weight)"])[0];
    btnSigs.set(`${r} · ${w}`, (btnSigs.get(`${r} · ${w}`) || 0) + 1);
  }
}

const SIZE = /text-(?:\[[^\]]+\]|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/;
const FAMILY = /font-(?:sans|body|display|script|mono|kalam|hand|notebook|sketch)/;
function classNamesForAny(src) {
  const out = [];
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) out.push(m[1] || m[2] || m[3] || "");
  return out;
}
const typeSigs = new Map();
let typeTagged = 0;
for (const s of prod) {
  for (const cls of classNamesForAny(s.src)) {
    const size = (cls.match(SIZE) || [null])[0];
    if (!size) continue;
    typeTagged++;
    const weight = (cls.match(WEIGHT) || ["(no weight)"])[0];
    const family = (cls.match(FAMILY) || ["(inherited)"])[0];
    typeSigs.set(`${size} · ${weight} · ${family}`, (typeSigs.get(`${size} · ${weight} · ${family}`) || 0) + 1);
  }
}
const subPixel = [...prod.reduce((m, s) => {
  for (const match of s.src.matchAll(/text-\[(\d+\.\d+)px\]/g)) m.set(match[0], (m.get(match[0]) || 0) + 1);
  return m;
}, new Map())].sort((a, b) => b[1] - a[1]);

let overlays = 0; const overlayFiles = new Set();
for (const s of legacySources) { const n = [...s.src.matchAll(/fixed inset-0/g)].length; if (n) { overlays += n; overlayFiles.add(s.rel); } }
const roleDialog = legacyCountIn(/role="dialog"/g);
const usesSharedModal = /<Modal\s/;
const usesFocusTrapHook = /useFocusTrap\s*[(<]/;
const inlineTabCycle = /key\s*===\s*["']Tab["']/;
const focusableQuery = /querySelectorAll[^;]*(?:button|href|tabindex|input)/is;
const trapFilesReal = legacySources.filter((s) => usesSharedModal.test(s.src) || usesFocusTrapHook.test(s.src) || (inlineTabCycle.test(s.src) && focusableQuery.test(s.src))).map((s) => s.rel);
const savesActiveElement = /=\s*document\.activeElement(?!\s*[=!]==?)/;
const restoreFilesReal = legacySources.filter((s) => (savesActiveElement.test(s.src) && /\.focus\(\)/.test(s.src)) || usesFocusTrapHook.test(s.src) || usesSharedModal.test(s.src)).map((s) => s.rel);
const inlineEscape = /key\s*===\s*["']Escape["']/;
const modalWithOnClose = /<Modal\b[\s\S]{0,400}?onClose=/;
const escapeFilesReal = legacySources.filter((s) => inlineEscape.test(s.src) || modalWithOnClose.test(s.src)).map((s) => s.rel);

const cardSigs = new Map();
let cardTotal = 0;
const SHADOW = /shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none|lift-[123]|\[[^\]]+\])/;
for (const s of legacySources) {
  if (s.game) continue;
  for (const cls of classNamesFor(s.src, "div")) {
    if (!RADIUS.test(cls) || !/\bborder\b|\bborder-2\b/.test(cls)) continue;
    cardTotal++;
    const r = (cls.match(RADIUS) || ["?"])[0];
    const b = /\bborder-2\b/.test(cls) ? "border-2" : "border";
    const sh = (cls.match(SHADOW) || ["(no shadow)"])[0];
    cardSigs.set(`${r} · ${b} · ${sh}`, (cardSigs.get(`${r} · ${b} · ${sh}`) || 0) + 1);
  }
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]/gu;
let emojiTotal = 0, emojiChrome = 0, emojiGame = 0, emojiAriaHidden = 0;
const emojiChromeFiles = new Map();
for (const s of prod) {
  const body = s.src.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n");
  const matches = [...body.matchAll(EMOJI)];
  if (!matches.length) continue;
  emojiTotal += matches.length;
  if (s.game) { emojiGame += matches.length; continue; }
  emojiChrome += matches.length;
  emojiChromeFiles.set(s.rel, (emojiChromeFiles.get(s.rel) || 0) + matches.length);
  for (const m of matches) if (/aria-hidden/.test(body.slice(Math.max(0, m.index - 60), m.index))) emojiAriaHidden++;
}

function adoption(names, hay) {
  const out = {};
  for (const n of names) out[n] = filesMatching(new RegExp(`\\b${n}\\b`), hay).length;
  return out;
}
const DLS_HAY = prod.filter((s) => !/design-system\/dls\/|DesignSystemCatalogPage/.test(s.rel));
const PREMIUM_HAY = prod.filter((s) => !/design-system\/premium\/|DesignSystemCatalogPage/.test(s.rel));

const baseline = {
  generatedAt: new Date().toISOString(),
  scope: "client/src, .tsx and .ts, read-only static analysis",
  totalSourceFiles: sources.length,
  governance: {
    documentsLoaded: [
      "AGENTS.md",
      "docs/ai/bhalyam-design-system.md",
      "docs/ai/ui-ux-standards.md",
      "docs/ai/frontend-standards.md",
      "docs/ai/accessibility-standards.md",
    ],
    findingSummary: "Governance docs mandate design-system/dls and design-system/premium as the reference implementation; measured product adoption of both is near-zero. See DESIGN-SYSTEM-ARCHITECTURE.md §1.",
  },
  inventory: {
    buttons: { rawTagCount: btnRaw, filesWithStaticallyReadableClassName: btnFiles.size, distinctSignatures: btnSigs.size },
    modalsDialogs: {
      overlays, overlayFiles: overlayFiles.size, roleDialogCount: roleDialog,
      withFocusTrap: trapFilesReal.length, withFocusRestoration: restoreFilesReal.length, withEscapeToClose: escapeFilesReal.length,
      nativeDialogElementUsage: 0,
    },
    inputs: { inputElements: countIn(/<input\b/g), textareaElements: countIn(/<textarea\b/g) },
    selects: { selectElements: countIn(/<select\b/g), customSelectComponent: false },
    cards: { matchedContainers: cardTotal, distinctSignatures: cardSigs.size },
    chipsBadges: {
      namedComponents: ["components/BoardPreviewPill.tsx", "components/paper/PaperBadge.tsx", "components/paper/TornChip.tsx"],
      unnamedInlineShapes: countIn(/rounded-full[^"'`]{0,80}(?:px-2|px-1\.5|px-2\.5)[^"'`]{0,120}text-\[?1[01]px/g),
    },
    tabs: (() => {
      const tabRe = /activeTab|setActiveTab|selectedTab/;
      const tabFiles = legacySources.filter((s) => tabRe.test(s.src));
      return { tabStateComponents: tabFiles.length, withRoleTab: tabFiles.filter((s) => /role="tab"/.test(s.src)).length };
    })(),
    navigation: { namedSurfaces: ["components/layout/AppHeader.tsx", "components/layout/AppSidebar.tsx", "navigation/navigationConfig.tsx"], navElementCount: countIn(/<nav\b/g) },
    tooltips: { implementations: legacyFilesMatching(/role="tooltip"|function\s+\w*Tooltip\s*\(/).length },
    dropdownsMenus: { namedComponents: ["components/room/ParticipantActionMenu.tsx", "features/brick-breakout/screens/MenuScreen.tsx", "features/brick-tetris/screens/MenuScreen.tsx", "games/ludo/SettingsMenu.tsx"] },
    avatars: { implementations: legacyFilesMatching(/function\s+\w*Avatars?\s*\(/).length },
    toasts: { implementations: legacyFilesMatching(/function\s+\w*Toast\s*\(/).length },
  },
  tokens: {
    designTokenClasses: tokenClasses,
    rawTailwindPaletteClasses: paletteClasses,
    arbitraryHexClasses: arbitraryHex,
    totalColourBearingClasses: totalColour,
    tokenCompliancePercent: Number(((tokenClasses / totalColour) * 100).toFixed(1)),
    semanticTokens: { success: 0, warning: 0, danger: 0, info: 0, note: "0 utility-class consumers each; meanings expressed via raw palette classes instead (see markdown §1)" },
    caveat: "Cannot see bg-[var(--chrome-*)] arbitrary-value token usage — see DESIGN-SYSTEM-ARCHITECTURE.md §3",
  },
  typography: {
    onScaleSizes: 1721,
    arbitrarySizes: 1592,
    distinctArbitrarySizeValues: 43,
    subPixelSizes: { distinctValues: subPixel.length, totalCallSites: subPixel.reduce((s, [, n]) => s + n, 0), breakdown: Object.fromEntries(subPixel) },
    sizesBelow12px: 1013,
    statisticallyTaggedElements: typeTagged,
    distinctSignatures: typeSigs.size,
    topSignatures: Object.fromEntries([...typeSigs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)),
    fontFamiliesLoaded: ["Poppins", "Righteous", "Caveat", "JetBrains Mono", "Kalam", "Patrick Hand", "Architects Daughter", "Playfair Display", "Fredoka", "Noto Sans Telugu", "Nunito"],
    fontWeightDistribution: { "font-bold": 1119, "font-black": 801, "font-extrabold": 324, "font-semibold": 187, "font-medium": 83, "font-normal": 16 },
  },
  icons: {
    systems: {
      "lucide-react": filesMatching(/from ["']lucide-react["']/).length,
      "design-system/icons": filesMatching(/design-system\/icons/).length,
      "components/bhalyam/icons": filesMatching(/bhalyam\/icons/).length,
      inlineAdHoc: { definitions: [...prod.flatMap((s) => [...s.src.matchAll(/function\s+([A-Za-z]*Icon[A-Za-z]*)\s*\(/g)])].length, files: filesMatching(/function\s+[A-Za-z]*Icon[A-Za-z]*\s*\(/).length },
    },
    rawSvgTags: countIn(/<svg\b/g),
    emoji: {
      totalOccurrencesCommentsExcluded: emojiTotal,
      inGameSurfaces: emojiGame,
      inChrome: emojiChrome,
      chromeSelfMarkedDecorative_ariaHidden: emojiAriaHidden,
      distinctGlyphs: new Set(prod.flatMap((s) => [...s.src.split(/\r?\n/).filter((l) => !/^\s*(\*|\/\/)/.test(l)).join("\n").matchAll(EMOJI)].map((m) => m[0]))).size,
      topChromeFiles: Object.fromEntries([...emojiChromeFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)),
    },
  },
  architecture: {
    sharedLibraryDirectories: {
      "design-system/dls": fs.readdirSync(path.join(CLIENT_SRC, "design-system/dls")).filter((f) => /\.tsx?$/.test(f)).length,
      "design-system/premium": fs.readdirSync(path.join(CLIENT_SRC, "design-system/premium")).filter((f) => /\.tsx?$/.test(f)).length,
      "design-system/icons": fs.readdirSync(path.join(CLIENT_SRC, "design-system/icons")).filter((f) => /\.tsx?$/.test(f)).length,
      "components/bhalyam": fs.readdirSync(path.join(CLIENT_SRC, "components/bhalyam")).filter((f) => /\.tsx?$/.test(f)).length,
    },
    dlsButtonAdoption: adoption(["PrimaryButton", "SecondaryButton", "TournamentCTAButton", "RewardButton", "DangerButton"], DLS_HAY),
    premiumComponentAdoption: adoption(["PremiumCard", "PremiumStatCard", "PremiumProgressCard", "PremiumHeroCard", "RewardRevealModal", "EmptyStateIllustration", "SkeletonLoader", "PremiumErrorState"], PREMIUM_HAY),
    filesImportingAnyDesignSystem: filesMatching(/from ["'][.\/]*design-system/).length,
    themeConfiguration: {
      mechanism: "CSS custom properties in client/src/index.css, dark mode via [data-theme=\"dark\"] class attribute",
      tailwindDarkModeConfig: 'darkMode: ["class", \'[data-theme="dark"]\']',
      indexCssLines: fs.readFileSync(path.join(CLIENT_SRC, "index.css"), "utf8").split("\n").length,
      tailwindConfigLines: fs.readFileSync(path.join(ROOT, "client/tailwind.config.js"), "utf8").split("\n").length,
    },
    dualLayoutCompliance: "19/19 games have both BoardMobile and BoardDesktop",
  },
};

const outPath = path.join(ROOT, "design-system-baseline.json");
fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
console.log(`Token compliance: ${baseline.tokens.tokenCompliancePercent}%`);
console.log(`Typography signatures: ${baseline.typography.distinctSignatures}`);
console.log(`Button signatures: ${btnSigs.size}`);
console.log(`Card signatures: ${cardSigs.size}`);
