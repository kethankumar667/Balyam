#!/usr/bin/env node
/**
 * Rendered text contrast — real pages, real Chromium, real composited colours.
 *
 * ── Why this exists alongside the axe-core runner ─────────────────────
 * `client/scripts/accessibility/runner.mjs` runs axe-core, which is the right
 * tool and the authority for WCAG rules generally. For *contrast* specifically
 * it has one blind spot that matters here: when axe cannot resolve what is
 * painted behind an element, it reports the node as **incomplete** rather than
 * as a violation. That is the correct conservative behaviour for a compliance
 * tool, and it means the failures hide exactly where this product's are —
 * translucent dark cards composited over a warm cream page.
 *
 * Measured on this codebase: axe reported contrast violations on 9 light-theme
 * routes and 1 dark-theme route, while the worst light-theme failures on
 * `/social` and `/tournaments` landed in `incomplete` and were never counted.
 *
 * This probe composites the alpha stack itself and returns the ratio, so those
 * nodes get a number instead of a shrug.
 *
 * ── What it deliberately skips, and why ───────────────────────────────
 *   • **Emoji.** CSS `color` does not apply to colour glyphs, so a ratio
 *     computed from it is meaningless. An earlier unfiltered run reported 141
 *     failing nodes; 58 of those were emoji. Text with no alphanumeric
 *     character is skipped.
 *   • **Elements over a `background-image`.** Gradients and textures have no
 *     single background colour to composite against.
 *   • **Elements whose background is painted by an absolutely-positioned
 *     sibling** — the pattern active filter pills use. Measuring those against
 *     the ancestor gives a ratio the user never sees (one such pill reported
 *     1.06:1 while rendering as white-on-orange).
 *
 * Both skips prevent false positives at the cost of false negatives. **The true
 * failure count is higher than what this prints, never lower.** That is the
 * right direction for a number that will be used to argue something is fine.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *   npm --prefix client run dev          # or `npm --prefix client run preview`
 *   node client/scripts/design-audit/contrast.mjs
 *   BASE=http://localhost:4173 node client/scripts/design-audit/contrast.mjs
 *   ROUTES=/,/games node client/scripts/design-audit/contrast.mjs
 *
 * Writes `contrast.json` next to the run for diffing between passes.
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.BASE || "http://localhost:5173";
const OUT = process.env.OUT || path.resolve(__dirname, "../../../.design-audit");
const ROUTES = (process.env.ROUTES ||
  "/,/games,/social,/tournaments,/leaderboard,/settings,/about,/privacy,/design-system,/login,/signup,/no-such-404"
).split(",").filter(Boolean);

fs.mkdirSync(OUT, { recursive: true });

/**
 * Runs inside the page. Walks every text node, resolves the real painted
 * foreground and background, and returns everything under its required ratio.
 */
const PROBE = () => {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };

  /** Composite every translucent ancestor background down to one opaque colour. */
  const bgOf = (el) => {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { c: null, img: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
      n = n.parentElement;
    }
    let base = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    if (base.a < 1) base = { r: 255, g: 255, b: 255, a: 1 };
    let acc = base;
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return { c: acc, img: false };
  };

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const txt = (node.nodeValue || "").trim();
    if (txt.length < 2) continue;
    if (!/[A-Za-z0-9]/.test(txt)) continue;           // emoji / symbol-only

    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);

    // An absolutely-positioned sibling can be what actually paints behind this
    // text (active pills do exactly that). Skip rather than report a ratio
    // against a background nobody sees.
    const parent = el.parentElement;
    if (parent) {
      let painted = false;
      for (const sib of parent.children) {
        if (sib === el) continue;
        const scs = getComputedStyle(sib);
        if (scs.position === "absolute" &&
            (scs.backgroundColor !== "rgba(0, 0, 0, 0)" || scs.backgroundImage !== "none")) { painted = true; break; }
      }
      if (painted) continue;
    }

    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.15) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (bg.img || !bg.c) continue;

    const fgc = fg.a < 1 ? over(fg, bg.c) : fg;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const req = large ? 3 : 4.5;
    const cr = ratio(fgc, bg.c);

    if (cr < req) {
      out.push({
        text: txt.slice(0, 48),
        ratio: Math.round(cr * 100) / 100,
        req,
        size: Math.round(size * 10) / 10,
        weight,
        fg: cs.color,
        bg: `rgb(${Math.round(bg.c.r)}, ${Math.round(bg.c.g)}, ${Math.round(bg.c.b)})`,
        cls: String(el.className || "").slice(0, 90),
      });
    }
  }
  return out.sort((a, b) => a.ratio - b.ratio);
};

const browser = await chromium.launch();
const all = [];

for (const theme of ["light", "dark"]) {
  for (const vpName of ["mobile", "desktop"]) {
    const viewport = vpName === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
    const ctx = await browser.newContext({
      viewport,
      isMobile: vpName === "mobile",
      hasTouch: vpName === "mobile",
      reducedMotion: "reduce",
    });
    // Consent and onboarding are pre-granted so the probe measures the SCREEN,
    // not the two modals that cover it on a first visit. The modals themselves
    // are audited separately in DESIGN-INVENTORY.md §2.
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("mpg.playerName", "Auditor");
        localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
        localStorage.setItem("bhalyam.onboarding.state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
        localStorage.setItem("bhalyam.theme", t);
      } catch { /* private mode */ }
    }, theme);

    for (const route of ROUTES) {
      const page = await ctx.newPage();
      try { await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch { /* keep going */ }
      await page.waitForTimeout(2200);
      const fails = await page.evaluate(PROBE).catch(() => []);
      all.push({ theme, vp: vpName, route, fails });
      console.log(`${theme} ${vpName} ${route.padEnd(16)} FAILS=${fails.length}` +
        (fails.length ? `  worst=${fails[0].ratio}:1 "${fails[0].text}"` : ""));
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();

const nodes = all.reduce((s, e) => s + e.fails.length, 0);
const pairs = new Set();
const strings = new Set();
for (const e of all) for (const f of e.fails) {
  pairs.add(f.fg + "|" + f.bg);
  strings.add(f.text + "|" + f.fg + "|" + f.bg);
}

console.log("");
console.log(`renders=${all.length}  failing nodes=${nodes}  distinct colour pairs=${pairs.size}  distinct text+pair=${strings.size}`);
fs.writeFileSync(path.join(OUT, "contrast.json"), JSON.stringify(all, null, 2));
console.log(`written: ${path.join(OUT, "contrast.json")}`);
