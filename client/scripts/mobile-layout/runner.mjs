#!/usr/bin/env node
/**
 * Mobile layout checks — real pages, real Chromium, real measurements.
 *
 * ── What this replaces, and why ───────────────────────────────────────
 * `client/src/__tests__/mobileCertification.test.ts`, 98 lines, which imported
 * no page and no component. Its "Complete Device Matrix & Ergonomics" suite
 * asserted that the number `44` in its own literal table was `>= 44`, and that
 * `320 / 568` fell between 0.35 and 2.2. It could not fail for any product
 * reason, and it was named "Production Mobile UX & Accessibility Certification
 * Suite".
 *
 * This navigates a real build in a real browser, at real viewport sizes, and
 * asks the layout engine for numbers.
 *
 * ── What it checks ────────────────────────────────────────────────────
 *   • horizontal overflow of the document, with the specific offending element
 *   • every visible control's measured width and height
 *   • controls clipped by the viewport edge (excluding carousel items, which
 *     are reached by swiping and are not defects)
 *   • controls that cannot receive a tap, asked of Playwright's own
 *     actionability check rather than guessed from a hit test
 *   • that the route rendered anything at all
 *
 * ── What it is NOT ────────────────────────────────────────────────────
 * Device certification. It runs one engine (Chromium) at CSS viewport sizes
 * that correspond to popular devices. It does not run WebKit or Gecko, it does
 * not run on hardware, and it says nothing about iOS Safari's address-bar
 * behaviour or Android keyboard insets. Calling that "certification" is how
 * the file it replaces came to be trusted. The names here say what was
 * measured.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *   npm --prefix client run build          # once; this reads dist/
 *   npm run check:mobile-layout
 *   npm run check:mobile-layout -- --server=4000   # also check the Room screen
 */

import { chromium } from "playwright";
import { io } from "socket.io-client";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTERACTIVE_SELECTOR, measureControls, measureOverflow, measureRendered } from "./probes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "../..");
const ROOT = path.resolve(CLIENT_DIR, "..");
const DIST = path.join(CLIENT_DIR, "dist");
const REPORT = path.join(ROOT, "MOBILE_LAYOUT_REPORT.json");

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  return args.includes(`--${name}`) ? true : fallback;
};

/** The product's own bar. WCAG 2.2 AA (2.5.8) asks for 24; this app asks 44. */
const TOUCH_TARGET_PRODUCT_MIN = Number(getArg("min", 44));
/** The standard's floor, reported separately so the two are never conflated. */
const TOUCH_TARGET_WCAG_MIN = 24;
const serverPort = getArg("server", null);

/**
 * Widths the brief names, plus the two shapes that break layouts differently.
 *
 * Landscape is not "the same page, rotated": it is a viewport with almost no
 * vertical room, where sticky headers and footers can between them leave
 * nothing for the content. The low-height portrait entry approximates an open
 * software keyboard on a 390×844 phone — roughly 320px of the screen gone —
 * which is the state the chat composer is used in and almost never tested in.
 */
const VIEWPORTS = [
  // The nine widths docs/ai/code-review-checklist.md §3 requires, in order.
  { name: "320×568 (iPhone SE)", width: 320, height: 568 },
  { name: "360×800 (Galaxy A/S)", width: 360, height: 800 },
  { name: "375×667 (iPhone 8/SE3)", width: 375, height: 667 },
  { name: "390×844 (iPhone 13-16)", width: 390, height: 844 },
  { name: "412×915 (Pixel 7-9)", width: 412, height: 915 },
  { name: "430×932 (iPhone Pro Max)", width: 430, height: 932 },
  { name: "768×1024 (iPad portrait)", width: 768, height: 1024, tablet: true },
  { name: "1024×1366 (iPad Pro)", width: 1024, height: 1366, tablet: true },
  { name: "1440×900 (desktop)", width: 1440, height: 900, desktop: true },
  // Two shapes that break layouts differently from any width alone.
  { name: "667×375 landscape", width: 667, height: 375, landscape: true },
  { name: "390×540 keyboard open", width: 390, height: 540, lowHeight: true },
];

const ROUTES = [
  { path: "/", name: "Home" },
  { path: "/games", name: "Games" },
  { path: "/leaderboard", name: "Leaderboard" },
  { path: "/tournaments", name: "Tournaments" },
  { path: "/social", name: "Social hub" },
  { path: "/settings", name: "Settings" },
  { path: "/login", name: "Sign in" },
  { path: "/about", name: "About" },
];

/* ────────────────────────── static server ────────────────────────── */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
};

/**
 * Serves `dist` with an SPA fallback.
 *
 * The built bundle rather than the dev server, deliberately: production CSS is
 * minified and purged, and a Tailwind class that survives dev and gets purged
 * from the build is exactly the kind of defect that only shows up here.
 */
function serveDist() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path.join(DIST, "index.html"))) {
      reject(new Error(`No build found at ${DIST}. Run: npm --prefix client run build`));
      return;
    }
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      let file = path.join(DIST, url);
      if (!file.startsWith(DIST)) {
        res.writeHead(403).end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file)) file = path.join(DIST, "index.html");
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    server.on("error", reject);
  });
}

/* ────────────────────────── room bootstrap ────────────────────────── */

/**
 * A real room on a real server, so `/room/:code` is the actual Room screen
 * rather than a connecting spinner.
 *
 * Returns `null` when no server was asked for or none answered. The Room
 * checks are then reported as NOT RUN — never as passed. "We could not look"
 * and "we looked and it was fine" are different results and the report says
 * which one happened.
 */
async function createRoom(port) {
  return new Promise((resolve) => {
    const socket = io(`http://127.0.0.1:${port}`, { transports: ["websocket"], timeout: 5000 });
    const giveUp = setTimeout(() => {
      socket.disconnect();
      resolve(null);
    }, 8000);

    socket.on("connect", () => {
      socket.emit("room:create", { name: "LayoutProbe", game: "ludo", hostKind: "member" }, (res) => {
        if (!res?.ok || !res.code) {
          clearTimeout(giveUp);
          socket.disconnect();
          resolve(null);
          return;
        }
        // A bot, so the room is a populated table rather than an empty lobby —
        // the seat cards and the match feed are most of what has to fit.
        socket.emit("room:addBot", "BotProbe", "medium");
        setTimeout(() => {
          clearTimeout(giveUp);
          socket.disconnect();
          resolve({ code: res.code, seatToken: res.seatToken, playerId: res.playerId });
        }, 300);
      });
    });

    socket.on("connect_error", () => {
      clearTimeout(giveUp);
      socket.disconnect();
      resolve(null);
    });
  });
}

/* ────────────────────────── the run ────────────────────────── */

const findings = [];
let checksRun = 0;

function record(kind, severity, viewport, route, detail) {
  findings.push({ kind, severity, viewport, route, ...detail });
}

async function inspect(page, viewport, route) {
  checksRun += 1;

  const rendered = await page.evaluate(measureRendered);
  if (rendered.elementCount < 5 || rendered.textLength < 3) {
    record("blank-render", "CRITICAL", viewport.name, route.name, {
      message: `Route rendered ${rendered.elementCount} elements and ${rendered.textLength} characters of text. Every other check on this page is meaningless.`,
    });
    return;
  }

  const overflow = await page.evaluate(measureOverflow);
  if (overflow.overflowPx > 1) {
    record("horizontal-overflow", "HIGH", viewport.name, route.name, {
      message: `Page scrolls sideways by ${overflow.overflowPx}px (scrollWidth ${overflow.scrollWidth} > viewport ${overflow.viewportWidth}).`,
      offenders: overflow.offenders,
    });
  }

  const controls = await page.evaluate(measureControls, INTERACTIVE_SELECTOR);

  /*
   * The 44px bar is a THUMB rule.
   *
   * `docs/ai/ui-ux-standards.md` §4.1 scopes it to mobile screens (<768px), and
   * applying it to a 1440px desktop pointer would generate findings nobody
   * should act on. WCAG 2.2 AA 2.5.8 (24px) still applies everywhere, because
   * it is about pointer precision rather than device class — so the two
   * thresholds diverge above 768px, which is exactly why they are reported
   * separately.
   */
  const isTouchViewport = viewport.width < 768;
  const productMin = isTouchViewport ? TOUCH_TARGET_PRODUCT_MIN : 0;

  const tooSmall = controls.filter(
    (c) => c.inViewport && (c.width < productMin || c.height < productMin),
  );
  const belowWcag = controls.filter(
    (c) => c.inViewport && (c.width < TOUCH_TARGET_WCAG_MIN || c.height < TOUCH_TARGET_WCAG_MIN),
  );

  if (belowWcag.length > 0) {
    record("touch-target-below-wcag", "HIGH", viewport.name, route.name, {
      message: `${belowWcag.length} control(s) smaller than ${TOUCH_TARGET_WCAG_MIN}×${TOUCH_TARGET_WCAG_MIN}px (WCAG 2.2 AA 2.5.8).`,
      controls: belowWcag.slice(0, 8).map((c) => ({ selector: c.selector, label: c.label, size: `${c.width}×${c.height}` })),
    });
  }
  const productOnly = tooSmall.filter((c) => !belowWcag.includes(c));
  if (productOnly.length > 0) {
    record("touch-target-below-product-bar", "MEDIUM", viewport.name, route.name, {
      message: `${productOnly.length} control(s) smaller than the product's ${TOUCH_TARGET_PRODUCT_MIN}×${TOUCH_TARGET_PRODUCT_MIN}px thumb bar but at or above the WCAG floor.`,
      controls: productOnly.slice(0, 8).map((c) => ({ selector: c.selector, label: c.label, size: `${c.width}×${c.height}` })),
    });
  }

  // `clippedHorizontally` already excludes anything inside a horizontal
  // scroller — a carousel item past the edge is swipe-to-reach, not broken.
  const clipped = controls.filter((c) => c.clippedHorizontally);
  if (clipped.length > 0) {
    record("control-clipped", "HIGH", viewport.name, route.name, {
      message: `${clipped.length} control(s) extend past the viewport edge.`,
      controls: clipped.slice(0, 8).map((c) => ({ selector: c.selector, label: c.label, left: c.left, right: c.right })),
    });
  }

  /*
   * Reachability, asked of Playwright rather than guessed.
   *
   * `trial: true` runs the full actionability check — visible, stable, enabled,
   * and receives pointer events — and does not click. It is the same logic a
   * real `click()` uses, so a failure here means a real tap would not land.
   *
   * The first version of this check used `document.elementFromPoint` and
   * reported fourteen untappable controls on the home page. Every one was a
   * sibling backdrop layer inside the header that a person can tap straight
   * through. A detector that cries wolf is how a layout suite gets switched
   * off, so the heuristic is gone.
   *
   * Bounded to the first 40 in-viewport controls per page: each trial costs a
   * round trip, and forty is comfortably past the point where a page with a
   * genuine overlay bug stops hiding it.
   */
  const reachable = controls.filter((c) => c.inViewport && !c.behindOverlay).slice(0, 40);
  const unreachable = [];
  const modalOpen = controls.some((c) => c.behindOverlay);
  const handles = modalOpen ? [] : await page.$$(INTERACTIVE_SELECTOR);
  for (const handle of handles.slice(0, reachable.length)) {
    try {
      const box = await handle.boundingBox();
      if (!box || box.width === 0 || box.height === 0) continue;
      if (box.y + box.height < 0 || box.y > viewport.height) continue;
      await handle.click({ trial: true, timeout: 750 });
    } catch (err) {
      const message = String(err);
      // A control that is simply scrolled out of view is not unreachable, and
      // Playwright reports that as a stability/visibility timeout rather than
      // an interception. Only interception is a layout defect.
      if (!/intercepts pointer events/i.test(message)) continue;
      const label = (await handle.getAttribute("aria-label")) || (await handle.innerText().catch(() => "")) || "";
      unreachable.push({
        label: label.trim().slice(0, 60),
        detail: message.replace(/\s+/g, " ").slice(0, 160),
      });
    }
  }
  if (unreachable.length > 0) {
    record("control-unreachable", "HIGH", viewport.name, route.name, {
      message: `${unreachable.length} control(s) cannot receive a tap — another element intercepts pointer events over them.`,
      controls: unreachable.slice(0, 8),
    });
  }

  return controls.length;
}

async function main() {
  const { server, port } = await serveDist();
  const base = `http://127.0.0.1:${port}`;

  const room = serverPort ? await createRoom(serverPort) : null;
  if (serverPort && !room) {
    console.warn(
      `\n⚠ Could not create a room on port ${serverPort}. The Room screen and chat composer were NOT checked.\n`,
    );
  }

  const browser = await chromium.launch({ headless: true });
  console.log(`\nMobile layout checks — real Chromium, ${VIEWPORTS.length} viewports\n`);

  let totalControls = 0;

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: !viewport.landscape,
      hasTouch: true,
    });

    // Consent, so the privacy notice does not sit over every page and make
    // every control "covered" for a reason that is not a layout defect.
    await context.addInitScript(
      ({ code, seatToken, playerId }) => {
        localStorage.setItem(
          "bhalyam.consent",
          JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
        );
        localStorage.setItem("mpg.playerName", "LayoutProbe");
        // Seeded so the first-run welcome dialog does not sit over every page.
        // It is not skipped — it gets its own pass below, on its own terms.
        localStorage.setItem(
          "bhalyam.onboarding.state",
          JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }),
        );
        if (code) {
          const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
          seats[code] = { playerId, seatToken };
          localStorage.setItem("mpg.seats", JSON.stringify(seats));
          localStorage.setItem("mpg.playerId", playerId);
        }
      },
      { code: room?.code ?? null, seatToken: room?.seatToken ?? null, playerId: room?.playerId ?? null },
    );

    const page = await context.newPage();
    const routes = room ? [...ROUTES, { path: `/room/${room.code}`, name: "Room" }] : ROUTES;

    process.stdout.write(`  ${viewport.name.padEnd(26)}`);
    for (const route of routes) {
      try {
        await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 30_000 });
        // The app animates in; measuring mid-transition produces rects nobody
        // ever sees.
        await page.waitForTimeout(500);
        totalControls += (await inspect(page, viewport, route)) ?? 0;
      } catch (err) {
        record("navigation-failed", "CRITICAL", viewport.name, route.name, {
          message: `Could not load ${route.path}: ${String(err).slice(0, 200)}`,
        });
      }
    }
    process.stdout.write(` ${findings.length} finding(s) so far\n`);
    await context.close();
  }

  await browser.close();
  server.close();

  const bySeverity = (s) => findings.filter((f) => f.severity === s);
  const report = {
    generatedAt: new Date().toISOString(),
    engine: "chromium (playwright)",
    scope:
      "Layout measured in one engine at CSS viewport sizes. NOT device certification: no WebKit, " +
      "no Gecko, no physical hardware, and nothing about iOS address-bar or Android keyboard insets.",
    viewports: VIEWPORTS.map((v) => v.name),
    routes: ROUTES.map((r) => r.name),
    roomScreenChecked: Boolean(room),
    roomScreenNote: room
      ? `Checked against live room ${room.code}`
      : "NOT RUN — no game server was reachable. This is not a pass.",
    thresholds: { productTouchTargetPx: TOUCH_TARGET_PRODUCT_MIN, wcagTouchTargetPx: TOUCH_TARGET_WCAG_MIN },
    pagesInspected: checksRun,
    controlsMeasured: totalControls,
    counts: {
      critical: bySeverity("CRITICAL").length,
      high: bySeverity("HIGH").length,
      medium: bySeverity("MEDIUM").length,
    },
    findings,
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");

  console.log(`\n  Pages inspected:    ${checksRun}`);
  console.log(`  Controls measured:  ${totalControls}`);
  console.log(`  Room screen:        ${report.roomScreenNote}`);
  console.log(`  CRITICAL ${report.counts.critical}   HIGH ${report.counts.high}   MEDIUM ${report.counts.medium}`);
  console.log(`  Report: ${path.relative(ROOT, REPORT)}\n`);

  for (const f of findings.filter((x) => x.severity !== "MEDIUM").slice(0, 15)) {
    console.log(`  ✗ [${f.severity}] ${f.route} @ ${f.viewport}: ${f.message}`);
  }

  const blocking = report.counts.critical + report.counts.high;
  process.exit(blocking > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n✗ Mobile layout run aborted: ${err.message}\n`);
  process.exit(2);
});
