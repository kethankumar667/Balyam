#!/usr/bin/env node
/**
 * Shared helpers for the design audit scripts.
 *
 * ── Why these live in one place ───────────────────────────────────────
 * Every number in `DESIGN-BASELINE.md`, `DESIGN-SYSTEM-AUDIT.md` and
 * `COMPONENT-CONSISTENCY-REPORT.md` was produced by one of the scripts beside
 * this file. If two of them walked the tree differently — one including
 * `__tests__`, one not — the documents would disagree with each other and a
 * reader would have no way to tell which was wrong. One walker, one definition
 * of "the product's source", one contrast formula.
 *
 * ── What counts as source ─────────────────────────────────────────────
 * `client/src/**` minus `__tests__`. Tests are excluded because a colour named
 * in an assertion is a colour the product never paints, and counting them
 * would inflate every drift figure with the very code that guards against it.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, "../..");
export const CLIENT_SRC = path.join(REPO_ROOT, "client", "src");

/** Recursively collect source files, skipping tests and node_modules. */
export function walk(dir, exts = [".tsx", ".ts"], out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      walk(p, exts, out);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

export function rel(p) {
  return path.relative(CLIENT_SRC, p).split(path.sep).join("/");
}

/**
 * Product chrome vs game surfaces.
 *
 * A Nokia game SHOULD have its own buttons and its own palette — `AGENTS.md`
 * §8 says so explicitly. Counting a Game Boy green next to a lounge cream as
 * two competing brand colours would be a false finding, and would let the real
 * one (the lounge disagreeing with itself) hide inside the noise.
 */
export function isGameSurface(relPath) {
  return (
    relPath.startsWith("games/") ||
    relPath.startsWith("animations/") ||
    relPath.startsWith("features/brick") ||
    relPath.startsWith("features/cricket")
  );
}

/* ────────────────────────── colour maths ────────────────────────── */

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** WCAG 2.1 relative luminance. */
export function luminance({ r, g, b }) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.1 contrast ratio between two hex colours, rounded to 2dp. */
export function contrast(hexA, hexB) {
  const la = luminance(hexToRgb(hexA));
  const lb = luminance(hexToRgb(hexB));
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(ratio * 100) / 100;
}

/** Euclidean distance in RGB. Under ~12 is indistinguishable at UI sizes. */
export function rgbDistance(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/* ────────────────────────── output ────────────────────────── */

export function heading(text) {
  console.log("\n" + text);
  console.log("─".repeat(Math.min(text.length, 78)));
}

export function row(label, value, width = 52) {
  console.log(String(label).padEnd(width) + String(value).padStart(8));
}
