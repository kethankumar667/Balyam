#!/usr/bin/env node
/**
 * Touch-target measurement at two thresholds, because there are two rules.
 *
 * ── Why two numbers and not one ───────────────────────────────────────
 * WCAG 2.2 AA (2.5.8 Target Size, Minimum) sets a **24 × 24 px** floor. This
 * product's own `docs/ai/ui-ux-standards.md` §4.1 sets **44 × 44 px**, which is
 * the platform-conventional thumb target and a stricter, self-imposed bar.
 *
 * Reporting only the 44px number invites the reply "but that's not a WCAG
 * failure", which is true and beside the point. Reporting only the 24px number
 * hides that half the product misses the bar it set for itself. Both are
 * printed, labelled, and never merged.
 *
 * ── Why it measures instead of reading classes ────────────────────────
 * `min-h-[44px]` in a class list proves nothing: a flex parent can compress it,
 * a sibling can overlap it, and `w-13` — a class this codebase used seven times
 * — compiled to no CSS at all until the Phase 10 token pass, so a keypad key
 * "sized" to 52px was rendering at its content width. Only the layout engine
 * knows. This asks the layout engine.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *   npm --prefix client run dev
 *   node client/scripts/design-audit/touch-targets.mjs
 *   BASE=http://localhost:4173 node client/scripts/design-audit/touch-targets.mjs
 */

import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:5173";
const ROUTES = (process.env.ROUTES ||
  "/,/games,/leaderboard,/tournaments,/social,/login,/signup,/about,/privacy,/design-system,/snake,/tetris,/breakout,/roadrash,/nokiacricket,/diagnostics,/no-such-404"
).split(",").filter(Boolean);

const WCAG_FLOOR = 24;   // WCAG 2.2 AA 2.5.8
const PRODUCT_BAR = 44;  // docs/ai/ui-ux-standards.md §4.1

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("mpg.playerName", "Auditor");
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
    localStorage.setItem("bhalyam.onboarding.state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
    localStorage.setItem("bhalyam.theme", "light");
  } catch { /* private mode */ }
});

let total = 0, underBar = 0, underFloor = 0;
console.log(`viewport 390x844   product bar ${PRODUCT_BAR}px   WCAG 2.2 floor ${WCAG_FLOOR}px\n`);
console.log("route              controls  <44px  <24px   worst offenders");

for (const route of ROUTES) {
  const page = await ctx.newPage();
  try { await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch { /* keep going */ }
  await page.waitForTimeout(2000);

  const m = await page.evaluate(({ bar, floor }) => {
    const controls = [...document.querySelectorAll(
      'button, a[href], [role="button"], input:not([type=hidden]), select, textarea, summary'
    )];
    let n = 0, ub = 0, uf = 0;
    const worst = [];
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 1 || r.height < 1 || cs.visibility === "hidden" || cs.display === "none") continue;
      n++;
      const min = Math.min(r.width, r.height);
      if (min < bar) {
        ub++;
        if (min < floor) {
          uf++;
          worst.push(`${Math.round(r.width)}x${Math.round(r.height)} "${(el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 26)}"`);
        }
      }
    }
    return { n, ub, uf, worst: worst.slice(0, 4) };
  }, { bar: PRODUCT_BAR, floor: WCAG_FLOOR }).catch(() => ({ n: 0, ub: 0, uf: 0, worst: [] }));

  total += m.n; underBar += m.ub; underFloor += m.uf;
  console.log(
    route.padEnd(18) + String(m.n).padStart(8) + String(m.ub).padStart(7) + String(m.uf).padStart(7) +
    "   " + m.worst.join(" | ").slice(0, 108)
  );
  await page.close();
}

await browser.close();

console.log("");
console.log(`TOTAL controls=${total}`);
console.log(`  under ${PRODUCT_BAR}px (product rule) : ${underBar} (${((underBar / total) * 100).toFixed(0)}%)`);
console.log(`  under ${WCAG_FLOOR}px (WCAG 2.2 AA)   : ${underFloor} (${((underFloor / total) * 100).toFixed(0)}%)`);
