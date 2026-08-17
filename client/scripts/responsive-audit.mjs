/**
 * Responsive audit — renders the app at a real device matrix and reports
 * layout failures that a human would have to catch by hand otherwise.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * "Make it responsive on all devices" is not a checkable claim, and any
 * answer to it that is not measured is a guess. This turns it into a number
 * that can be re-run on every change: N routes x M viewports, each checked
 * for the failures that actually reach players.
 *
 * ── What it checks, and why only these ────────────────────────────────
 * Three things, all of them objectively true or false from the rendered DOM:
 *
 *  1. HORIZONTAL OVERFLOW — `scrollWidth > innerWidth`. This is the single
 *     most reported mobile bug and the one users describe as "it's cut off"
 *     or "it scrolls sideways". It is also the one that hides controls
 *     entirely, which is what happened to the header's settings gear.
 *  2. OFF-VIEWPORT ELEMENTS — the specific nodes whose right edge is past
 *     the fold, so the report names a file-findable culprit rather than
 *     just asserting a page is broken.
 *  3. SMALL TOUCH TARGETS — interactive elements under the 44px Apple HIG
 *     / WCAG 2.5.5 floor. Fingers do not get more accurate on a small
 *     screen; controls do.
 *
 * Deliberately NOT checked: anything about whether a layout looks *good*.
 * Overlap, cramping, awkward wrapping and ugly line breaks are real
 * responsive problems and none of them are decidable from a DOM rect. This
 * tool finds breakage, not taste, and a clean run is not a claim that every
 * screen is well designed at every width.
 *
 * Usage:  node scripts/responsive-audit.mjs [--url http://localhost:4173]
 *                                           [--json out.json]
 *                                           [--route /games]
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

/**
 * The device matrix.
 *
 * Chosen for market coverage rather than for famous phone names. 360x640 is
 * deliberately first and is the width everything must survive: it is the most
 * common Android viewport in India, which is who this app is for. 320 is kept
 * because it is the floor still in the wild (iPhone SE 1, older budget
 * Androids) and anything that survives 320 survives everything above it.
 */
const DEVICES = [
  { name: "320  Android/SE-1 (floor)", width: 320, height: 568 },
  { name: "360  Galaxy A / most common", width: 360, height: 800 },
  { name: "375  iPhone SE2/3, 8", width: 375, height: 667 },
  { name: "390  iPhone 12–14", width: 390, height: 844 },
  { name: "393  Pixel 7/8", width: 393, height: 873 },
  { name: "412  Galaxy S / large Android", width: 412, height: 915 },
  { name: "430  iPhone Pro Max", width: 430, height: 932 },
  { name: "768  iPad portrait", width: 768, height: 1024 },
  { name: "1024 iPad landscape", width: 1024, height: 768 },
  { name: "1280 laptop", width: 1280, height: 800 },
  { name: "1920 desktop", width: 1920, height: 1080 },
];

/** Public routes. Anything behind a room code needs a live server and a seat. */
const ROUTES = [
  "/",
  "/games",
  "/about",
  "/privacy",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
  "/profile",
  "/nokiacricket",
  "/snake",
  "/brickracer",
  "/tetris",
  "/breakout",
  "/spacealien",
  "/this-route-does-not-exist",
];

/** Sub-pixel layout means an exact comparison flags rounding, not bugs. */
const OVERFLOW_TOLERANCE_PX = 2;
/** Apple HIG / WCAG 2.5.5 Level AAA. WCAG 2.2 AA is 24; 44 is the real bar. */
const MIN_TOUCH_PX = 44;

/**
 * Runs inside the page. Must be self-contained — no closure over Node scope.
 */
function collectIssues({ tolerance, minTouch }) {
  const vw = window.innerWidth;
  const doc = document.documentElement;

  /** A short, greppable identity for an element. */
  const describe = (el) => {
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".")
        : "";
    const id = el.id ? `#${el.id}` : "";
    const text = (el.textContent || "").trim().slice(0, 40).replace(/\s+/g, " ");
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
  };

  /**
   * Fixed/sticky elements are excluded from the culprit hunt.
   *
   * Off-canvas drawers and dismissed sheets legitimately park outside the
   * viewport — that is how they are hidden. They do not contribute to
   * document scrollWidth, so counting them would be pure noise.
   */
  const parked = (el) => {
    let n = el;
    while (n && n !== doc) {
      const p = getComputedStyle(n).position;
      if (p === "fixed" || p === "sticky") return true;
      n = n.parentElement;
    }
    return false;
  };

  const all = Array.from(document.querySelectorAll("body *"));

  const offViewport = [];
  for (const el of all) {
    if (parked(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
    if (r.right > vw + tolerance) {
      offViewport.push({ el: describe(el), right: Math.round(r.right), over: Math.round(r.right - vw) });
    }
  }
  // Deepest-first, then widest overhang: the innermost node is the one whose
  // width actually needs changing, not the wrappers inheriting its size.
  offViewport.sort((a, b) => b.over - a.over);

  const smallTargets = [];
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="radio"], [role="tab"], [tabindex]:not([tabindex="-1"])',
  );
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (r.width < minTouch || r.height < minTouch) {
      smallTargets.push({
        el: describe(el),
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    }
  }

  return {
    scrollWidth: doc.scrollWidth,
    innerWidth: vw,
    overflowPx: Math.max(0, doc.scrollWidth - vw),
    offViewport: offViewport.slice(0, 8),
    smallTargets: smallTargets.slice(0, 8),
    smallTargetCount: smallTargets.length,
  };
}

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE = arg("--url", "http://localhost:4173").replace(/\/+$/, "");
const ONLY = arg("--route", null);
const JSON_OUT = arg("--json", null);

const routes = ONLY ? [ONLY] : ROUTES;

const browser = await chromium.launch();
const results = [];
let overflowFailures = 0;
let touchFailures = 0;

for (const device of DEVICES) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 2,
    isMobile: device.width < 768,
    hasTouch: device.width < 768,
  });
  const page = await context.newPage();

  for (const route of routes) {
    let data;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
      // Let entrance animations and font swaps settle — measuring mid-transition
      // reports positions no user ever sees.
      await page.waitForTimeout(400);
      data = await page.evaluate(collectIssues, {
        tolerance: OVERFLOW_TOLERANCE_PX,
        minTouch: MIN_TOUCH_PX,
      });
    } catch (err) {
      results.push({ device: device.name, route, error: String(err).split("\n")[0] });
      continue;
    }

    const overflowed = data.overflowPx > OVERFLOW_TOLERANCE_PX;
    if (overflowed) overflowFailures++;
    if (data.smallTargetCount > 0) touchFailures++;

    results.push({ device: device.name, width: device.width, route, ...data, overflowed });
  }

  await context.close();
}

await browser.close();

/* ── Report ─────────────────────────────────────────────────────────── */

const overflows = results.filter((r) => r.overflowed);
const touches = results.filter((r) => r.smallTargetCount > 0);
const errors = results.filter((r) => r.error);

console.log("\n=== RESPONSIVE AUDIT ===");
console.log(`${routes.length} routes x ${DEVICES.length} viewports = ${results.length} checks\n`);

if (errors.length) {
  console.log(`-- ${errors.length} LOAD ERRORS --`);
  for (const e of errors) console.log(`   ${e.route} @ ${e.device}: ${e.error}`);
  console.log("");
}

console.log(`HORIZONTAL OVERFLOW: ${overflows.length} failing combinations`);
if (overflows.length) {
  const byRoute = new Map();
  for (const o of overflows) {
    if (!byRoute.has(o.route)) byRoute.set(o.route, []);
    byRoute.get(o.route).push(o);
  }
  for (const [route, list] of [...byRoute].sort((a, b) => b[1].length - a[1].length)) {
    const widths = list.map((l) => `${l.width}(+${l.overflowPx})`).join(" ");
    console.log(`\n  ${route}`);
    console.log(`    fails at: ${widths}`);
    for (const c of list[0].offViewport.slice(0, 3)) {
      console.log(`    culprit +${c.over}px: ${c.el}`);
    }
  }
}

console.log(`\n\nTOUCH TARGETS < ${MIN_TOUCH_PX}px: ${touches.length} failing combinations`);
if (touches.length) {
  const seen = new Map();
  for (const t of touches.filter((x) => x.width < 768)) {
    for (const s of t.smallTargets) {
      const key = s.el.slice(0, 70);
      if (!seen.has(key)) seen.set(key, { size: s.size, routes: new Set() });
      seen.get(key).routes.add(t.route);
    }
  }
  for (const [el, info] of [...seen].slice(0, 20)) {
    console.log(`  ${info.size.padEnd(9)} ${el}  [${[...info.routes].slice(0, 3).join(", ")}]`);
  }
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
  console.log(`\nFull results -> ${JSON_OUT}`);
}

const failed = overflows.length > 0 || errors.length > 0;
console.log(`\n=== ${failed ? "FAIL" : "PASS"} — overflow:${overflows.length} errors:${errors.length} ===\n`);
process.exit(failed ? 1 : 0);
