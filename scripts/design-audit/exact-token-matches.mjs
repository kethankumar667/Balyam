#!/usr/bin/env node
/**
 * Finds arbitrary hex values in specific files that EXACTLY equal an
 * existing token's resolved value — the only swaps this pass is allowed to
 * make ("do not redesign the palette" means no near-match, no eyeballing).
 * Read-only: prints candidates, changes nothing.
 *
 *   node scripts/design-audit/exact-token-matches.mjs <file1> <file2> ...
 */
import fs from "node:fs";

// Token → resolved hex, both themes, from index.css. Scope noted per token
// (:root = global, .auth-shell = only inside an <AuthShell>-rendered tree).
const TOKENS = {
  "surface-0 (light)": { hex: "#f8fafc", scope: "root" },
  "surface-1 (light)": { hex: "#ffffff", scope: "root" },
  "surface-2 (light)": { hex: "#f1f5f9", scope: "root" },
  "surface-3 (light)": { hex: "#e2e8f0", scope: "root" },
  "surface-0 (dark)": { hex: "#0b0f19", scope: "root" },
  "surface-1 (dark)": { hex: "#131926", scope: "root" },
  "surface-2 (dark)": { hex: "#192233", scope: "root" },
  "surface-3 (dark)": { hex: "#222d42", scope: "root" },
  "ink-hi (light)": { hex: "#0f172a", scope: "root" },
  "ink-mid (light)": { hex: "#334155", scope: "root" },
  "ink-lo (light)": { hex: "#475569", scope: "root" },
  "ink-mute (light)": { hex: "#5a6779", scope: "root" },
  "ink-hi (dark)": { hex: "#f8fafc", scope: "root" },
  "ink-mid (dark)": { hex: "#cbd5e1", scope: "root" },
  "ink-lo (dark)": { hex: "#94a3b8", scope: "root" },
  "ink-mute (dark)": { hex: "#7c8ba1", scope: "root" },
  "success": { hex: "#22c55e", scope: "root", note: "light-only, no dark override defined" },
  "warning": { hex: "#f59e0b", scope: "root", note: "light-only, no dark override defined" },
  "danger": { hex: "#ef4444", scope: "root", note: "light-only, no dark override defined" },
  "info": { hex: "#38bdf8", scope: "root", note: "light-only, no dark override defined" },
  "rim-gold (light)": { hex: "#d4a574", scope: "root" },
  "chrome-panel (light)": { hex: "#fffdf7", scope: "root" },
  "chrome-control (light)": { hex: "#faf2df", scope: "root" },
  "chrome-control-hi (light)": { hex: "#f2e4cb", scope: "root" },
  "chrome-border (light)": { hex: "#a17c4e", scope: "root" },
  "chrome-hairline (light)": { hex: "#ecd9ba", scope: "root" },
  "chrome-ink (light)": { hex: "#2a221b", scope: "root" },
  "chrome-ink-soft (light)": { hex: "#7a5e45", scope: "root" },
  "chrome-accent (light)": { hex: "#c2410c", scope: "root" },
  "chrome-active-bg (light)": { hex: "#fff2d6", scope: "root" },
  "chrome-active-ink (light)": { hex: "#b45309", scope: "root" },
  "chrome-panel (dark)": { hex: "#131926", scope: "root" },
  "chrome-control (dark)": { hex: "#1e2739", scope: "root" },
  "chrome-control-hi (dark)": { hex: "#27324a", scope: "root" },
  "chrome-border (dark)": { hex: "#66799a", scope: "root" },
  "chrome-hairline (dark)": { hex: "#2a3346", scope: "root" },
  "chrome-ink (dark)": { hex: "#f1f5f9", scope: "root" },
  "chrome-ink-soft (dark)": { hex: "#9fb0c6", scope: "root" },
  "chrome-accent (dark)": { hex: "#fbbf24", scope: "root" },
  "auth-card (light)": { hex: "#fffbf2", scope: "auth-shell" },
  "auth-card-edge (light)": { hex: "#e8d8be", scope: "auth-shell" },
  "auth-ink (light)": { hex: "#2a221b", scope: "auth-shell" },
  "auth-ink-soft (light)": { hex: "#6d5540", scope: "auth-shell" },
  "auth-ink-mute (light)": { hex: "#7e653f", scope: "auth-shell" },
  "auth-field (light)": { hex: "#fdf6e7", scope: "auth-shell" },
  "auth-field-edge (light)": { hex: "#e8d8be", scope: "auth-shell" },
  "auth-rule (light)": { hex: "#e5d4b4", scope: "auth-shell" },
  "auth-card (dark)": { hex: "#131926", scope: "auth-shell" },
  "auth-ink (dark)": { hex: "#f8fafc", scope: "auth-shell" },
  "auth-ink-soft (dark)": { hex: "#94a3b8", scope: "auth-shell" },
  "auth-ink-mute (dark)": { hex: "#64748b", scope: "auth-shell" },
  "auth-field (dark)": { hex: "#182234", scope: "auth-shell" },
  "auth-accent (light)": { hex: "#7b5024", scope: "auth-shell" },
  "auth-note-bg (light)": { hex: "#fbf1da", scope: "auth-shell" },
  "auth-note-edge (light)": { hex: "#e3ce9f", scope: "auth-shell" },
  "auth-note-ink (light)": { hex: "#6b5323", scope: "auth-shell" },
  "auth-ok-bg (light)": { hex: "#eaf4e7", scope: "auth-shell" },
  "auth-ok-edge (light)": { hex: "#bfdcb6", scope: "auth-shell" },
  "auth-ok-ink (light)": { hex: "#2e5b2b", scope: "auth-shell" },
  "auth-bad-bg (light)": { hex: "#fbe9e6", scope: "auth-shell" },
  "auth-bad-edge (light)": { hex: "#efc2bb", scope: "auth-shell" },
  "auth-bad-ink (light)": { hex: "#8e2b22", scope: "auth-shell" },
  "auth-field-error (light)": { hex: "#a3231b", scope: "auth-shell" },
  "auth-accent (dark)": { hex: "#fbbf24", scope: "auth-shell" },
  "auth-note-bg (dark)": { hex: "#1a2333", scope: "auth-shell" },
  "auth-note-ink (dark)": { hex: "#fde68a", scope: "auth-shell" },
  "auth-ok-bg (dark)": { hex: "#064e3b", scope: "auth-shell" },
  "auth-ok-edge (dark)": { hex: "#059669", scope: "auth-shell" },
  "auth-ok-ink (dark)": { hex: "#a7f3d0", scope: "auth-shell" },
  "auth-bad-bg (dark)": { hex: "#4c0519", scope: "auth-shell" },
  "auth-bad-edge (dark)": { hex: "#be123c", scope: "auth-shell" },
  "auth-bad-ink (dark)": { hex: "#fecdd3", scope: "auth-shell" },
  "auth-field-error (dark)": { hex: "#fb7185", scope: "auth-shell" },
};

const byHex = new Map();
for (const [name, { hex, scope, note }] of Object.entries(TOKENS)) {
  const k = hex.toLowerCase();
  if (!byHex.has(k)) byHex.set(k, []);
  byHex.get(k).push({ name, scope, note });
}

const files = process.argv.slice(2);
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  console.log(`\n=== ${file} ===`);
  let found = 0;
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
      const hex = m[0].toLowerCase();
      const matches = byHex.get(hex);
      if (matches) {
        found++;
        console.log(`  L${i + 1}: ${m[0]} → ${matches.map((x) => `${x.name}${x.note ? ` [${x.note}]` : ""}`).join(" / ")}`);
        console.log(`         ${line.trim().slice(0, 140)}`);
      }
    }
  });
  if (!found) console.log("  (no exact matches)");
}
