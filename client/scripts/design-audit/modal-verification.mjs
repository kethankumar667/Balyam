#!/usr/bin/env node
/**
 * Live verification of the Sprint B modal success-criteria checklist.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * `components.mjs` proves every migrated dialog RENDERS `<Modal>`, i.e. it
 * proves the code is wired correctly by inspection. It cannot prove the
 * trap actually holds focus in a real browser, that Escape actually closes
 * the right thing, or that axe finds nothing wrong with the open dialog —
 * those only exist once something renders. `MODAL-SYSTEM-AUDIT.md` needs
 * real answers, not code-reading confidence, for exactly the criteria the
 * plan calls out as most likely to be quietly skipped (focus restoration).
 *
 * ── Scope: 4 of the 9 named dialogs ───────────────────────────────────
 * Reachable from a fresh guest visit to `/` with no server-side room and no
 * auth: ConsentModal, WelcomeModal, JoinRoomModal, GameRoomSheet. The other
 * five (LeaveRoomModal, BotManagementDialog, QrCodeModal — need a live room;
 * EditProfileModal — needs a signed-in member; GameTutorial — needs a
 * mounted board; UnavailableGameSheet — needs a deliberately-broken catalog
 * entry) are not driven live here. They share the exact same `<Modal>` /
 * `useFocusTrap` mechanism proven below, so a mechanism bug would surface
 * identically in all nine — but that is not the same claim as "observed
 * live", and the report says so rather than blurring the two.
 *
 *   npm --prefix client run build
 *   node client/scripts/design-audit/modal-verification.mjs
 *   BASE=http://localhost:4173 node client/scripts/design-audit/modal-verification.mjs
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
    /**
     * A fixed port, not `listen(0)`'s random one — the backend's CORS
     * allowlist (`CLIENT_ORIGIN`, server/src/index.ts) has to name this
     * origin exactly, which only works if it is predictable. Port 5173 was
     * the obvious default (it is the server's own CORS default) until this
     * ran on a machine that already had a real Vite dev server parked on
     * it: this script's `listen()` silently lost that race, Playwright
     * happily navigated to the dev server instead, and every result that
     * followed was quietly measuring the wrong build. 4174 is picked to
     * collide with nothing else this repo runs.
     */
    server.listen(Number(process.env.PORT) || 4174, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    server.on("error", reject);
  });
}

async function dialogContainsActiveElement(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return dlg ? dlg.contains(document.activeElement) : false;
  });
}

async function axeOnOpenDialog(page) {
  await page.addScriptTag({ path: AXE_PATH });
  const result = await page.evaluate(async () => {
    const dlg = document.querySelector('[role="dialog"]');
    // eslint-disable-next-line no-undef
    return await window.axe.run(dlg || document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"],
    });
  });
  return result.violations;
}

/**
 * @param {import("playwright").Page} page
 * @param {{
 *   name: string,
 *   open: () => Promise<void>,
 *   expectEscapeCloses: boolean,
 *   expectFocusRestoreToTrigger: boolean,
 * }} spec
 */
async function verifyDialog(page, spec) {
  const out = { name: spec.name, checks: {}, violations: [], notes: [] };

  try {
    await spec.open();
  } catch (err) {
    out.notes.push(`Could not trigger this dialog: ${String(err.message || err).split("\n")[0]}`);
    out.checks.opened = false;
    return out;
  }
  await page.waitForTimeout(400);

  const dialogCountAfterOpen = await page.locator('[role="dialog"]').count();
  out.checks.opened = dialogCountAfterOpen > 0;
  if (!out.checks.opened) {
    out.notes.push("Dialog never appeared — could not run the remaining checks.");
    return out;
  }

  const dialog = page.locator('[role="dialog"]').last();
  out.checks.roleDialog = true; // the locator above already required it
  out.checks.ariaModal = (await dialog.getAttribute("aria-modal")) === "true";
  out.checks.initialFocusInside = await dialogContainsActiveElement(page);

  let tabOk = true;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (!(await dialogContainsActiveElement(page))) { tabOk = false; break; }
  }
  out.checks.tabStaysInside = tabOk;

  let shiftTabOk = true;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Shift+Tab");
    if (!(await dialogContainsActiveElement(page))) { shiftTabOk = false; break; }
  }
  out.checks.shiftTabStaysInside = shiftTabOk;

  out.violations = await axeOnOpenDialog(page);
  out.checks.axeClean = out.violations.length === 0;

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const dialogCountAfterEscape = await page.locator('[role="dialog"]').count();

  if (spec.expectEscapeCloses) {
    out.checks.escapeCloses = dialogCountAfterEscape === 0;
    if (spec.expectFocusRestoreToTrigger) {
      out.checks.focusRestoredToTrigger = await page.evaluate(
        () => document.activeElement?.getAttribute("data-modal-verify-trigger") === "1",
      );
    }
  } else {
    // A dialog with no onClose (the consent gate) must treat Escape as a
    // no-op, not a dismissal — this branch passes when the dialog is
    // STILL open afterwards.
    out.checks.escapeCorrectlyInert = dialogCountAfterEscape > 0;
  }

  return out;
}

function printResult(r) {
  console.log(`\n${r.name}`);
  console.log("─".repeat(r.name.length));
  for (const [k, v] of Object.entries(r.checks)) {
    console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
  }
  if (r.violations.length) {
    console.log(`  axe violations (${r.violations.length}):`);
    for (const v of r.violations) console.log(`    - [${v.impact}] ${v.id}: ${v.help}`);
  }
  for (const n of r.notes) console.log(`  note: ${n}`);
}

/**
 * The prerendered `/` route hydrates, and — under at least the guest +
 * localStorage conditions this script seeds — throws React error #418
 * followed by #422 within a few hundred ms of first paint: a hydration
 * mismatch React recovers from by discarding the server-rendered subtree
 * and client-rendering it again from scratch. That is a real, separate bug
 * (filed against SSR/prerendering, not this phase's scope — see
 * MODAL-SYSTEM-AUDIT.md), and it has a specific consequence for THIS
 * script: any element handle captured before the recovery finishes goes
 * stale, which looks exactly like a broken focus restoration even though
 * the trap is doing the right thing with the element it was actually
 * given. Waiting out the churn before touching anything is what separates
 * that false signal from the real one — a human's first click also lands
 * after this window, since no one clicks within 300ms of paint.
 */
async function settle(page) {
  await page.waitForTimeout(3000);
}

async function main() {
  const { server } = await serveDist();
  const base = process.env.BASE || `http://localhost:${process.env.PORT || 4174}`;
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ── ConsentModal: fresh guest, no consent choice yet, non-dismissible ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.onboarding.state",
        JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }),
      );
      // deliberately do NOT set bhalyam.consent — needsConsent() must be true
    });
    const page = await ctx.newPage();
    const r = await verifyDialog(page, {
      name: "ConsentModal",
      open: async () => {
        await page.goto(base + "/", { waitUntil: "domcontentloaded" });
        await settle(page);
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      },
      expectEscapeCloses: false,
      expectFocusRestoreToTrigger: false,
    });
    results.push(r); printResult(r);
    await ctx.close();
  }

  // ── WelcomeModal: fresh guest, welcome not yet completed ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
      // deliberately do NOT set bhalyam.onboarding.state — welcome must auto-open
    });
    const page = await ctx.newPage();
    const r = await verifyDialog(page, {
      name: "WelcomeModal",
      open: async () => {
        await page.goto(base + "/", { waitUntil: "domcontentloaded" });
        await settle(page);
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => {});
      },
      expectEscapeCloses: true,
      expectFocusRestoreToTrigger: false, // opened by a timer, not a click — no trigger element to return to
    });
    results.push(r); printResult(r);
    await ctx.close();
  }

  // ── JoinRoomModal: guest with both gates already satisfied, real click trigger ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
      localStorage.setItem(
        "bhalyam.onboarding.state",
        JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }),
      );
    });
    const page = await ctx.newPage();
    const r = await verifyDialog(page, {
      name: "JoinRoomModal",
      open: async () => {
        await page.goto(base + "/", { waitUntil: "domcontentloaded" });
        const trigger = page.getByRole("button", { name: /join room with a code/i }).first();
        await trigger.waitFor({ state: "visible", timeout: 10000 });
        await settle(page);
        await trigger.evaluate((el) => el.setAttribute("data-modal-verify-trigger", "1"));
        await trigger.click();
      },
      expectEscapeCloses: true,
      expectFocusRestoreToTrigger: true,
    });
    results.push(r); printResult(r);
    await ctx.close();
  }

  // ── GameRoomSheet: guest, click a game tile ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
      localStorage.setItem(
        "bhalyam.onboarding.state",
        JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }),
      );
    });
    const page = await ctx.newPage();
    const r = await verifyDialog(page, {
      name: "GameRoomSheet",
      open: async () => {
        await page.goto(base + "/", { waitUntil: "domcontentloaded" });
        const trigger = page.getByRole("button", { name: /play uno now/i }).first();
        await trigger.waitFor({ state: "visible", timeout: 10000 });
        await settle(page);
        await trigger.scrollIntoViewIfNeeded();
        await trigger.evaluate((el) => el.setAttribute("data-modal-verify-trigger", "1"));
        await trigger.click();
      },
      expectEscapeCloses: true,
      expectFocusRestoreToTrigger: true,
    });
    results.push(r); printResult(r);
    await ctx.close();
  }

  await browser.close();
  server.close();

  const allChecks = results.flatMap((r) => Object.values(r.checks));
  const failCount = allChecks.filter((v) => v === false).length;
  const totalViolations = results.reduce((s, r) => s + r.violations.length, 0);

  console.log(`\nTOTAL: ${allChecks.length - failCount}/${allChecks.length} checks passed, ${totalViolations} axe violations across ${results.length} dialogs\n`);

  fs.writeFileSync(
    path.join(ROOT, "MODAL_VERIFICATION_RESULTS.json"),
    JSON.stringify(results, null, 2) + "\n",
  );

  process.exit(failCount > 0 || totalViolations > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n✗ Modal verification aborted: ${err.stack || err.message}\n`);
  process.exit(2);
});
