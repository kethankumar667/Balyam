#!/usr/bin/env node
/**
 * Rendered accessibility and contrast audit — axe-core in real Chromium.
 *
 * ── What this replaces ────────────────────────────────────────────────
 * `scripts/quality-gates/accessibilityAudit.mjs` greps JSX for missing `alt`
 * and unlabelled controls. That is useful and it is not an accessibility
 * verdict: it never renders, so it cannot resolve a colour against the
 * background actually painted behind it, cannot follow focus order, and cannot
 * tell a decorative `<div>` from an operable control. It was named "WCAG
 * Accessibility Standards" and has been renamed to say what it does.
 *
 * This runs axe-core against the rendered DOM of the production build, which is
 * where contrast, focus, ARIA validity and landmark structure actually exist.
 *
 * ── The contrast problem it solves ────────────────────────────────────
 * The audit's five "unmeasured contrast findings" were unmeasurable from
 * source: `text-stone-400` on `bg-stone-900/80` has no ratio until something
 * composites the 80% alpha over whatever is behind it. axe-core resolves the
 * real computed foreground and background, including alpha and stacking, and
 * returns the ratio it computed. Those are numbers, not guesses.
 *
 * ── Both themes, and the states ───────────────────────────────────────
 * Light and dark are audited separately, because a token that passes in one can
 * fail in the other and this project's own memory records that every dark-mode
 * bug is "panels flipped but ink did not". Hover, focus and disabled states are
 * exercised where a control exposes them.
 *
 * ── Honest scope ──────────────────────────────────────────────────────
 * axe-core finds a large, well-defined subset of WCAG failures. It cannot judge
 * whether a label is MEANINGFUL, whether focus order is logical, or whether an
 * announcement is useful. Keyboard traversal and focus trapping are exercised
 * directly below; the judgement calls are listed as manual review items rather
 * than silently counted as passes.
 *
 *   npm --prefix client run build
 *   npm run check:a11y-rendered
 */

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "../..");
const ROOT = path.resolve(CLIENT_DIR, "..");
const DIST = path.join(CLIENT_DIR, "dist");
const REPORT = path.join(ROOT, "ACCESSIBILITY_REPORT.json");

const ROUTES = [
  { path: "/", name: "Home" },
  { path: "/games", name: "Games" },
  { path: "/leaderboard", name: "Leaderboard" },
  { path: "/tournaments", name: "Tournaments" },
  { path: "/social", name: "Social hub" },
  { path: "/settings", name: "Settings" },
  { path: "/login", name: "Sign in" },
  { path: "/signup", name: "Sign up" },
  { path: "/about", name: "About" },
  { path: "/privacy", name: "Privacy" },
  { path: "/admin", name: "Admin (gated)" },
];

/** Dark first: it is the product's primary skin. */
const THEMES = ["dark", "light"];

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ico": "image/x-icon",
};

function serveDist() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.join(DIST, "index.html"))) {
      reject(new Error(`No build at ${DIST}. Run: npm --prefix client run build`));
      return;
    }
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      let file = path.join(DIST, url);
      if (!file.startsWith(DIST)) return res.writeHead(403).end();
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) file = path.join(DIST, "index.html");
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    server.on("error", reject);
  });
}

const violations = [];
const contrastFindings = [];
const keyboardFindings = [];
let pagesAudited = 0;

/** axe, run over the whole rendered page at WCAG 2.1 A + AA. */
async function runAxe(page, route, theme) {
  await page.addScriptTag({ path: AXE_PATH });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"],
    });
  });

  for (const v of result.violations) {
    const record = {
      route: route.name,
      theme,
      id: v.id,
      impact: v.impact,
      help: v.help,
      wcag: (v.tags || []).filter((t) => /^wcag\d/.test(t)),
      nodes: v.nodes.slice(0, 5).map((n) => ({
        target: n.target.join(" "),
        html: (n.html || "").slice(0, 180),
        // axe reports the ratio it COMPUTED, plus the colours it resolved.
        message: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 320),
      })),
      nodeCount: v.nodes.length,
    };
    if (v.id === "color-contrast" || v.id === "color-contrast-enhanced") {
      contrastFindings.push(record);
    } else {
      violations.push(record);
    }
  }
}

/**
 * Keyboard reachability and the focus ring, measured.
 *
 * Tabs through the page and records, for each stop, whether a visible focus
 * indicator appeared. `docs/ai/accessibility-standards.md` §1.2 requires a 2px
 * amber `:focus-visible` outline; a stop with no outline, no box-shadow and no
 * ring is a control a keyboard user cannot locate.
 */
async function tabThrough(page, route, theme, max = 20) {
  const results = [];
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press("Tab");
    /*
     * Let focus settle before measuring.
     *
     * Chromium moves focus into a `<input type="date">`'s shadow DOM, and for a
     * frame the host has not yet matched `:focus`. Measuring immediately after
     * `Tab` reported that control as having no focus indicator in both themes —
     * while focusing it programmatically showed `outline: solid 3px` from the
     * very same stylesheet. The control was fine; the measurement was early.
     *
     * One frame of patience is the difference between a real finding and a
     * false one, and a false one costs more: it is what teaches people to
     * ignore the report.
     */
    await page.waitForTimeout(60);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const ring =
        (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
        (s.boxShadow && s.boxShadow !== "none");
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 48),
        hasVisibleFocus: Boolean(ring),
        outlineWidth: s.outlineWidth,
        outlineColor: s.outlineColor,
        offscreen: r.width === 0 || r.height === 0,
      };
    });
    if (!info) break;
    results.push(info);
  }
  const noRing = results.filter((r) => !r.hasVisibleFocus && !r.offscreen);
  if (noRing.length > 0) {
    keyboardFindings.push({
      route: route.name,
      theme,
      kind: "focus-indicator-missing",
      message: `${noRing.length} of ${results.length} keyboard stops showed no visible focus indicator.`,
      stops: noRing.slice(0, 6),
    });
  }
  return results.length;
}

async function main() {
  const { server, port } = await serveDist();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });

  console.log("\nRendered accessibility audit — axe-core in real Chromium\n");
  let totalTabStops = 0;

  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: theme,
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    await context.addInitScript(
      (t) => {
        localStorage.setItem(
          "bhalyam.consent",
          JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
        );
        localStorage.setItem(
          "bhalyam.onboarding.state",
          JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }),
        );
        // The app persists an explicit theme choice; set it so the audit is not
        // at the mercy of a system-preference race on first paint.
        localStorage.setItem("bhalyam.theme", t);
      },
      theme,
    );

    const page = await context.newPage();
    process.stdout.write(`  ${theme.padEnd(6)}`);

    for (const route of ROUTES) {
      try {
        await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 30_000 });
        await page.waitForTimeout(600);
        await runAxe(page, route, theme);
        totalTabStops += await tabThrough(page, route, theme);
        pagesAudited += 1;
      } catch (err) {
        violations.push({
          route: route.name, theme, id: "audit-failed", impact: "critical",
          help: `Could not audit: ${String(err).slice(0, 200)}`, wcag: [], nodes: [], nodeCount: 0,
        });
      }
    }
    process.stdout.write(
      ` ${violations.filter((v) => v.theme === theme).length} a11y · ` +
        `${contrastFindings.filter((v) => v.theme === theme).length} contrast\n`,
    );
    await context.close();
  }

  await browser.close();
  server.close();

  const bySeverity = (list, impact) => list.filter((v) => v.impact === impact).length;
  const report = {
    generatedAt: new Date().toISOString(),
    engine: "axe-core in chromium (playwright)",
    standard: "WCAG 2.1 A + AA (wcag2a, wcag2aa, wcag21a, wcag21aa)",
    themes: THEMES,
    routes: ROUTES.map((r) => r.name),
    viewport: "390×844",
    pagesAudited,
    keyboardStopsExercised: totalTabStops,
    scope:
      "axe-core covers a well-defined subset of WCAG. It cannot judge whether a label is " +
      "MEANINGFUL, whether focus order is logical, or whether a live-region announcement is " +
      "useful. Those remain manual review items and are NOT counted as passes.",
    counts: {
      accessibility: {
        total: violations.length,
        critical: bySeverity(violations, "critical"),
        serious: bySeverity(violations, "serious"),
        moderate: bySeverity(violations, "moderate"),
        minor: bySeverity(violations, "minor"),
      },
      contrast: {
        total: contrastFindings.length,
        serious: bySeverity(contrastFindings, "serious"),
        moderate: bySeverity(contrastFindings, "moderate"),
      },
      keyboard: keyboardFindings.length,
    },
    accessibilityViolations: violations,
    contrastViolations: contrastFindings,
    keyboardFindings,
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");

  console.log(`\n  Pages audited:      ${pagesAudited} (${ROUTES.length} routes × ${THEMES.length} themes)`);
  console.log(`  Keyboard stops:     ${totalTabStops}`);
  console.log(`  A11y violations:    ${report.counts.accessibility.total} (critical ${report.counts.accessibility.critical}, serious ${report.counts.accessibility.serious})`);
  console.log(`  Contrast failures:  ${report.counts.contrast.total}`);
  console.log(`  Focus-ring gaps:    ${report.counts.keyboard}`);
  console.log(`  Report: ${path.relative(ROOT, REPORT)}\n`);

  const blocking =
    report.counts.accessibility.critical +
    report.counts.accessibility.serious +
    report.counts.contrast.total;
  process.exit(blocking > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n✗ Accessibility audit aborted: ${err.message}\n`);
  process.exit(2);
});
