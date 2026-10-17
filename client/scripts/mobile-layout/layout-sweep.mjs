#!/usr/bin/env node
/**
 * Layout sweep — every route and every game, at every device shape, in a real browser.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────────────────────────
 * `runner.mjs` checked 8 routes and one lobby, and its own report said the in-game screen was "NOT RUN".
 * That is exactly where the Rummy table broke on a phone held in landscape: the hand was cut off and the
 * action row ran off the bottom. No page-level check could have caught it, because the failure only
 * exists once a match is running on a short, wide screen.
 *
 * This runs two sweeps:
 *   • pages — every guest-reachable route × every viewport
 *   • games — every game kind, a real match with bots started through the real UI, × every viewport
 * and applies the same checks to both (see `inspect.mjs`): sideways overflow, controls past the bottom
 * with no scroll path, content sliced by an overflow:hidden ancestor, truncated text, touch targets,
 * and controls another element sits on top of.
 *
 * ── What it is NOT ──────────────────────────────────────────────────────────────────────────────────
 * Not device certification. One engine (Chromium) at CSS viewport sizes — no WebKit, no Gecko, no
 * hardware, nothing about iOS address-bar or Android keyboard insets. A game that could not be started
 * is reported as NOT RUN, never as passed: "we could not look" and "we looked and it was fine" are
 * different results.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────────────────────────────
 *   npm --prefix server run dev        # game server on :4000   (games sweep only)
 *   npm --prefix client run dev        # Vite on :5173
 *   node client/scripts/mobile-layout/layout-sweep.mjs --mode=both
 *
 *   --mode=pages|games|both          default both
 *   --base=http://localhost:5173     the client under test
 *   --server=http://localhost:4000   the game server (games only)
 *   --viewports=phones,landscape,tablets,desktop | 800x365,375x667   default all sets
 *   --games=rummy,ludo               default every game
 *   --routes=/games,/about           default every route
 *   --concurrency=4                  parallel browser contexts
 *   --out=artifacts/responsive       where the report and screenshots go
 */

import { chromium } from "playwright";
import { io } from "socket.io-client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPage } from "./inspect.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const MODE = arg("mode", "both");
const BASE = arg("base", "http://localhost:5173").replace(/\/$/, "");
const SERVER = arg("server", "http://localhost:4000").replace(/\/$/, "");
const CONCURRENCY = Number(arg("concurrency", 4));
const OUT = path.resolve(ROOT, arg("out", "artifacts/responsive"));
const GAME_FILTER = arg("games", "").split(",").filter(Boolean);
const ROUTE_FILTER = arg("routes", "").split(",").filter(Boolean);

/* ──────────────────────────────── viewports ──────────────────────────────── */

/**
 * `phone` means "held in the hand": it turns on the 44px thumb rule and mobile emulation. The landscape
 * set is the one that matters most for Rummy and UNO — wide, but only 320–430px tall — and is the shape
 * the first runner did not include at all.
 */
const mk = (w, h, label, extra = {}) => ({
  name: `${w}×${h} ${label}`,
  width: w,
  height: h,
  phone: Boolean(extra.phone),
  tablet: Boolean(extra.tablet),
  landscape: w > h,
});

const SETS = {
  phones: [
    mk(320, 568, "iPhone SE", { phone: true }),
    mk(360, 640, "Android small", { phone: true }),
    mk(375, 667, "iPhone 8", { phone: true }),
    mk(390, 844, "iPhone 14", { phone: true }),
    mk(412, 915, "Pixel", { phone: true }),
    mk(430, 932, "iPhone Pro Max", { phone: true }),
  ],
  landscape: [
    mk(568, 320, "SE landscape", { phone: true }),
    mk(667, 375, "iPhone 8 landscape", { phone: true }),
    mk(740, 360, "Android landscape", { phone: true }),
    mk(800, 365, "Reported phone", { phone: true }),
    mk(844, 390, "iPhone 14 landscape", { phone: true }),
    mk(915, 412, "Pixel landscape", { phone: true }),
    mk(932, 430, "Pro Max landscape", { phone: true }),
  ],
  tablets: [
    mk(768, 1024, "iPad portrait", { tablet: true }),
    mk(1024, 768, "iPad landscape", { tablet: true }),
    mk(820, 1180, "iPad Air portrait", { tablet: true }),
    mk(1180, 820, "iPad Air landscape", { tablet: true }),
  ],
  desktop: [mk(1280, 720, "laptop"), mk(1440, 900, "desktop"), mk(1920, 1080, "full HD")],
};

function resolveViewports() {
  const spec = arg("viewports", "phones,landscape,tablets,desktop");
  const out = [];
  for (const part of spec.split(",").filter(Boolean)) {
    if (SETS[part]) out.push(...SETS[part]);
    else if (/^\d+x\d+$/.test(part)) {
      const [w, h] = part.split("x").map(Number);
      out.push(mk(w, h, "custom", { phone: Math.min(w, h) <= 450 }));
    }
  }
  return out;
}

/* ───────────────────────────────── routes ───────────────────────────────── */

/**
 * Every route a signed-out guest can open. Routes behind a member account (`/mandali/:handle`, `/admin/*`)
 * are NOT here — they need credentials this harness does not hold — and the report lists them as not
 * covered rather than leaving them out silently.
 */
const ROUTES = [
  "/", "/games", "/favorites", "/recently-played",
  "/profile", "/profile/matches", "/profile/achievements", "/profile/scorecards",
  "/leaderboard", "/tournaments", "/social", "/mandali",
  "/about", "/how-to-play", "/community-rules", "/support", "/contact", "/reviews/write", "/feedback",
  "/testimonials", "/privacy", "/terms", "/safety",
  "/settings/preferences", "/settings/security",
  "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email",
  "/nokiacricket", "/snake", "/roadrash", "/brickblocks", "/breakout", "/2048", "/sudoku", "/brainvita",
  "/preview/ludo", "/preview/tiles", "/diagnostics", "/this-route-does-not-exist",
];
const NOT_COVERED = [
  "/mandali/:handle (member only)",
  "/admin/* (admin only)",
  "/tv/:code and /watch/:code (need a live room, member only)",
];

/* ───────────────────────────────── games ────────────────────────────────── */

/** Minimum seats per game, from `shared/catalog.ts`. */
const GAME_MIN = {
  rps: 2, rummy: 2, ludo: 2, snl: 2, handcricket: 2, uno: 2, wordbuilding: 2, dotsboxes: 2, stargame: 2,
  bingo: 1, namesplaceanimal: 2, tambola: 1, snake: 1, chess: 2, blockblast: 1, spacewar: 1, roadrash: 1,
  tictactoe: 2, connect4: 2, vamanaguntalu: 2,
};
/** A full table lays out differently from a two-seat one; check a busy one for the games that scale. */
const BUSY_TABLE = { rummy: 4, ludo: 4, uno: 4, snl: 4, dotsboxes: 4, wordbuilding: 4, stargame: 4, bingo: 4 };

const GAMES = Object.keys(GAME_MIN).filter((g) => !GAME_FILTER.length || GAME_FILTER.includes(g));

/**
 * Creates the room and seats the bots over a socket, then hands the host seat to the browser through
 * `mpg.seats` — the same reclaim path a page refresh uses. The browser then readies up and starts the
 * match through the real UI, which is what answers the server's start handshake.
 */
/**
 * A FRESH guest per room. Starting a paid match commits coins from the host's wallet, so one guest reused
 * across hundreds of matches runs dry and every later start fails with "this match has not been paid for
 * yet" — which reads like a layout problem and is not. Guest creation is rate-limited by design, so run
 * the server with `GUEST_PER_NETWORK_LIMIT=0 GUEST_PROVISION_PER_MINUTE=100000` (see usage above).
 */
function sharedGuest() {
  return fetch(`${SERVER}/api/auth/guest`, { method: "POST" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

async function createRoom(game, botCount) {
  // A token is optional: without one the room is still created (the host just has no wallet identity),
  // and a refused guest — the per-network cap is 5 a week — must not take the whole sweep down with it.
  const guest = await sharedGuest();

  return new Promise((resolve) => {
    const socket = io(SERVER, { transports: ["websocket"], timeout: 8000 });
    const giveUp = setTimeout(() => {
      socket.disconnect();
      resolve(null);
    }, 12_000);
    socket.on("connect_error", () => {
      clearTimeout(giveUp);
      socket.disconnect();
      resolve(null);
    });
    socket.on("connect", () => {
      socket.emit("room:create", { name: "LayoutProbe", game, hostKind: "guest", guestToken: guest?.token }, (res) => {
        if (!res?.ok || !res.code) {
          clearTimeout(giveUp);
          socket.disconnect();
          resolve(null);
          return;
        }
        for (let i = 0; i < botCount; i += 1) socket.emit("room:addBot", undefined, "medium");
        setTimeout(() => {
          clearTimeout(giveUp);
          socket.disconnect();
          resolve({ code: res.code, seatToken: res.seatToken, playerId: res.playerId, guest });
        }, 600);
      });
    });
  });
}

/**
 * Runs in the page before any script. Seeds what a returning player already has, so nothing sits over
 * every page for a reason that is not a layout defect.
 */
function seedStorage({ room, noticeVersion, guest }) {
  // The browser must be the SAME guest the room was created under. A solo game (snake, blockblast) has no
  // bots to make it free, so starting it commits coins from the host's wallet; with two different guest
  // identities the server answers "this match has not been paid for yet" and the lobby never starts.
  if (guest?.token) {
    localStorage.setItem("bhalyam.guest.id", guest.playerId);
    localStorage.setItem("bhalyam.guest.token", guest.token);
    localStorage.setItem("bhalyam.guest.expires", String(guest.expiresAt ?? Date.now() + 6 * 24 * 3600 * 1000));
  }
  localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion }));
  localStorage.setItem("bhalyam.age.band", JSON.stringify({ band: "adult", guardianConfirmed: false, answeredAt: new Date().toISOString() }));
  localStorage.setItem("mpg.playerName", "LayoutProbe");
  localStorage.setItem("bhalyam.onboarding.state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
  if (room) {
    const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
    seats[room.code] = { playerId: room.playerId, seatToken: room.seatToken, name: "LayoutProbe" };
    localStorage.setItem("mpg.seats", JSON.stringify(seats));
    localStorage.setItem("mpg.playerId", room.playerId);
  }
}

async function newContext(browser, viewport, room) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.phone,
    hasTouch: viewport.phone || viewport.tablet,
  });
  await context.addInitScript(seedStorage, { room, noticeVersion: NOTICE_VERSION, guest: room?.guest ?? null });
  return context;
}

/**
 * The privacy notice version the app currently asks about. Read from the source rather than copied: a
 * stale copy re-opens the consent dialog over every page (it did, the first time this ran) and every
 * control behind it then reads as "covered" for a reason that is not a layout defect.
 */
const NOTICE_VERSION = (() => {
  const src = fs.readFileSync(path.join(ROOT, "client/src/lib/privacy/consent.ts"), "utf8");
  const hit = src.match(/export const NOTICE_VERSION\s*=\s*(\d+)/);
  if (!hit) throw new Error("Could not read NOTICE_VERSION from client/src/lib/privacy/consent.ts");
  return Number(hit[1]);
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickIfPresent(page, name, timeout = 1500) {
  try {
    await page.getByRole("button", { name }).first().click({ timeout });
    return true;
  } catch {
    return false;
  }
}

/** Ready up, press Start, and wait for the lobby to give way to the board. Returns an error string or null. */
async function startMatch(page) {
  await page.waitForLoadState("domcontentloaded");
  // The lobby needs a moment to attach the seat after the socket connects.
  await page.getByRole("button", { name: /start game/i }).first().waitFor({ timeout: 20_000 }).catch(() => {});
  // A solo game (Snake, Space War) starts itself from the lobby, so there may be no Start button left to press.
  // The lobby gives way to the board without it; the tutorial/board checks that follow will show if it did not.
  if (!(await page.getByRole("button", { name: /start game/i }).count()) && !(await page.getByRole("button", { name: /ready/i }).count())) {
    return null;
  }
  // Ready only if not already: the host of a solo-capable game is readied automatically, and the button
  // then reads "Ready (Cancel)" — clicking it UN-readies and leaves Start disabled.
  await page
    .getByRole("button", { name: /ready/i })
    .filter({ hasNotText: /cancel/i })
    .first()
    .click({ timeout: 2500 })
    .catch(() => {});
  await sleep(600);
  // Start is disabled until every seat is ready and the server has confirmed it; give that a real chance
  // before concluding there is no button (it read "Start Game disabled" for Road Rash, Word Building…).
  const startBtn = page.getByRole("button", { name: /start game/i }).first();
  for (let i = 0; i < 20 && !(await startBtn.isEnabled({ timeout: 500 }).catch(() => false)); i += 1) {
    // A solo game starts itself while we wait: the button is then gone, which is a started match, not a missing one.
    if (!(await page.getByRole("button", { name: /start game/i }).count())) return null;
    await sleep(500);
  }
  if (!(await page.getByRole("button", { name: /start game/i }).count())) return null;
  if (!(await clickIfPresent(page, /start game/i, 4000))) return "no enabled Start Game button";
  const started = await page
    .waitForFunction(() => !/start game/i.test(document.body.innerText), null, { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);
  return started ? null : "match did not start (the lobby never gave way to a board)";
}

/** A first-run tutorial / how-to modal is up. */
async function hasDialog(page) {
  return page.evaluate(() => Boolean(document.querySelector("[role=dialog]:not([aria-hidden=true])")));
}

async function dismissTutorials(page) {
  for (let i = 0; i < 5; i += 1) {
    const hit = await clickIfPresent(
      page,
      /^(skip.*|close.*|got it|maybe later|not now|no thanks|dismiss.*|i know how to play|start playing)$/i,
      900,
    );
    if (!hit) break;
    await sleep(400);
  }
}

/* ──────────────────────────────── the runs ──────────────────────────────── */

const results = [];
const notRun = [];
let done = 0;
let total = 0;

function tick(label) {
  done += 1;
  if (done % 10 === 0 || done === total) process.stdout.write(`  ${done}/${total}  ${label}\n`);
}

async function runPool(tasks, size) {
  const queue = [...tasks];
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) {
      const task = queue.shift();
      try {
        await task();
      } catch (err) {
        process.stdout.write(`  ! task crashed: ${String(err).slice(0, 160)}\n`);
      }
    }
  });
  await Promise.all(workers);
}

async function sweepPages(browser, viewports) {
  const routes = ROUTES.filter((r) => !ROUTE_FILTER.length || ROUTE_FILTER.includes(r));
  total += viewports.length * routes.length;
  const tasks = viewports.map((viewport) => async () => {
    const context = await newContext(browser, viewport, null);
    const page = await context.newPage();
    for (const route of routes) {
      const errors = [];
      const onError = (e) => errors.push(String(e).slice(0, 200));
      page.on("pageerror", onError);
      try {
        await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30_000 });
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await sleep(700);
        // Captured BEFORE the checks: the tap-trial in `inspectPage` scrolls the page and leaves hover
        // tooltips open, so a screenshot taken after it shows a state the probes never measured.
        const shot = await page.screenshot().catch(() => null);
        const { findings, controls } = await inspectPage(page, viewport);
        if (errors.length) findings.push({ kind: "page-error", severity: "HIGH", message: errors.join(" | ") });
        results.push({ scope: "page", target: route, viewport: viewport.name, controls, findings });
        if (shot && findings.some((f) => f.severity === "HIGH" || f.severity === "CRITICAL")) {
          const name = `${route.replace(/[^a-z0-9]+/gi, "_") || "home"}__${viewport.width}x${viewport.height}.png`;
          const file = path.join(OUT, "shots", "pages", name);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, shot);
        }
      } catch (err) {
        results.push({
          scope: "page",
          target: route,
          viewport: viewport.name,
          controls: 0,
          findings: [{ kind: "navigation-failed", severity: "CRITICAL", message: String(err).slice(0, 200) }],
        });
      }
      page.off("pageerror", onError);
      tick(`${route} @ ${viewport.name}`);
    }
    await context.close();
  });
  await runPool(tasks, CONCURRENCY);
}

async function sweepGames(browser, viewports) {
  const tasks = [];
  for (const game of GAMES) {
    for (const viewport of viewports) {
      for (const table of ["pair", ...(BUSY_TABLE[game] ? ["busy"] : [])]) {
        total += 1;
        tasks.push(async () => {
          const label = `${game}/${table}`;
          const bots = table === "busy" ? BUSY_TABLE[game] - 1 : Math.max(GAME_MIN[game] - 1, game === "spacewar" ? 0 : 1);
          const room = await createRoom(game, bots);
          if (!room) {
            notRun.push({ target: label, viewport: viewport.name, reason: "could not create a room (is the game server up?)" });
            tick(`${label} @ ${viewport.name}  NOT RUN`);
            return;
          }
          const context = await newContext(browser, viewport, room);
          const page = await context.newPage();
          const pageErrors = [];
          page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
          try {
            await page.goto(`${BASE}/room/${room.code}`, { waitUntil: "load", timeout: 30_000 });
            const problem = await startMatch(page);
            if (problem) {
              notRun.push({ target: label, viewport: viewport.name, reason: problem });
              const f = path.join(OUT, "shots", "not-run", `${game}_${table}__${viewport.width}x${viewport.height}.png`);
              fs.mkdirSync(path.dirname(f), { recursive: true });
              await page.screenshot({ path: f }).catch(() => {});
            } else {
              await sleep(1500);
              // A first-run tutorial is a screen a new player sees before the table — measure it as one,
              // THEN dismiss it. (The first sweep measured a tutorial as if it were the board.)
              if (await hasDialog(page)) {
                const tut = path.join(OUT, "shots", game, `${table}-tutorial__${viewport.width}x${viewport.height}.png`);
                fs.mkdirSync(path.dirname(tut), { recursive: true });
                await page.screenshot({ path: tut }).catch(() => {});
                const t = await inspectPage(page, viewport, { skipReachability: true });
                results.push({ scope: "game", target: `${game}/tutorial`, viewport: viewport.name, controls: t.controls, findings: t.findings, screenshot: path.relative(ROOT, tut) });
              }
              await dismissTutorials(page);
              // Deal/shuffle openers and turn animations: measure the settled table, not mid-flight rects.
              await sleep(game === "rummy" || game === "uno" ? 9000 : 4500);
              // Some games open their tutorial late (Hand Cricket does, once the pre-match phase settles),
              // and a dialog that appears between "dismissed" and "measured" turns every control behind it
              // into a false "covered" finding. Look again until none is up.
              for (let i = 0; i < 3 && (await hasDialog(page)); i += 1) {
                await dismissTutorials(page);
                await sleep(700);
              }
              const shot = path.join(OUT, "shots", game, `${table}__${viewport.width}x${viewport.height}.png`);
              fs.mkdirSync(path.dirname(shot), { recursive: true });
              await page.screenshot({ path: shot }).catch(() => {});
              const { findings, controls } = await inspectPage(page, viewport);
              if (pageErrors.length) findings.push({ kind: "page-error", severity: "HIGH", message: pageErrors.join(" | ") });
              results.push({ scope: "game", target: label, viewport: viewport.name, controls, findings, screenshot: path.relative(ROOT, shot) });
            }
          } catch (err) {
            notRun.push({ target: label, viewport: viewport.name, reason: String(err).slice(0, 200) });
          }
          await context.close();
          tick(`${label} @ ${viewport.name}`);
        });
      }
    }
  }
  await runPool(tasks, CONCURRENCY);
}

/* ──────────────────────────────── reporting ──────────────────────────────── */

function summarise(viewports) {
  const flat = results.flatMap((r) => r.findings.map((f) => ({ scope: r.scope, target: r.target, viewport: r.viewport, ...f })));
  const count = (s) => flat.filter((f) => f.severity === s).length;
  const byKind = {};
  for (const f of flat) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  const report = {
    generatedAt: new Date().toISOString(),
    engine: "chromium (playwright)",
    scope:
      "Layout measured in one engine at CSS viewport sizes. NOT device certification: no WebKit, no Gecko, " +
      "no hardware, nothing about iOS address-bar or Android keyboard insets.",
    mode: MODE,
    base: BASE,
    viewports: viewports.map((v) => v.name),
    routes: ROUTES,
    notCovered: NOT_COVERED,
    games: GAMES,
    counts: { critical: count("CRITICAL"), high: count("HIGH"), medium: count("MEDIUM"), notRun: notRun.length },
    byKind,
    notRun,
    findings: flat,
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `report-${MODE}.json`), JSON.stringify(report, null, 2) + "\n");
  return report;
}

function printSummary(report) {
  const { counts } = report;
  console.log(`\n  CRITICAL ${counts.critical}   HIGH ${counts.high}   MEDIUM ${counts.medium}   NOT RUN ${counts.notRun}`);
  console.log("\n  By kind:");
  for (const [kind, n] of Object.entries(report.byKind).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(5)}  ${kind}`);
  const grouped = {};
  for (const f of report.findings.filter((x) => x.severity === "HIGH" || x.severity === "CRITICAL")) {
    (grouped[`${f.scope}:${f.target}`] ??= new Set()).add(f.kind);
  }
  console.log("\n  Worst offenders (HIGH/CRITICAL):");
  for (const [key, kinds] of Object.entries(grouped).slice(0, 40)) console.log(`    ${key.padEnd(34)} ${[...kinds].join(", ")}`);
  if (report.notRun.length) {
    console.log(`\n  NOT RUN (${report.notRun.length}) — these are not passes:`);
    for (const n of report.notRun.slice(0, 15)) console.log(`    ${n.target} @ ${n.viewport}: ${n.reason}`);
  }
  console.log(`\n  Report: ${path.relative(ROOT, path.join(OUT, `report-${MODE}.json`))}\n`);
}

async function main() {
  const viewports = resolveViewports();
  if (!viewports.length) throw new Error("No viewports selected.");
  const browser = await chromium.launch({ headless: true });
  console.log(`\nLayout sweep — ${MODE}, ${viewports.length} viewports, concurrency ${CONCURRENCY}\n`);
  if (MODE === "pages" || MODE === "both") await sweepPages(browser, viewports);
  if (MODE === "games" || MODE === "both") await sweepGames(browser, viewports);
  await browser.close();
  const report = summarise(viewports);
  printSummary(report);
  process.exit(report.counts.critical + report.counts.high + report.counts.notRun > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n✗ Layout sweep aborted: ${err.message}\n`);
  process.exit(2);
});
