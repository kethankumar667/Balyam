import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ROOT, startReleaseFixture, startReleaseFrontend, readJson, waitUntil } from "./releaseFixture.mjs";
import { captureEvidence, completeEvidence } from "./releaseEvidence.mjs";
import { JOURNEY_STEPS, evaluateBrowserJourney } from "./releaseWorkload.mjs";

const { chromium, firefox, webkit } = createRequire(path.join(ROOT, "client", "package.json"))("playwright");

async function dismissConsent(page) {
  const age = page.getByRole("button", { name: "I'm 18 or older", exact: true });
  await age.waitFor({ state: "visible" });
  await age.click();
  await page.getByRole("button", { name: "Only what's essential", exact: true }).click();
}

async function signIn(page, origin, name) {
  await page.goto(`${origin}/login`);
  await dismissConsent(page);
  await page.getByLabel("Email or phone number", { exact: true }).fill(`${name}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("Local-fixture-only-123!");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

async function openGame(page, origin, name) {
  await page.locator('a[href="/games"]:visible').first().click();
  await page.waitForURL(`${origin}/games`);
  await page.getByRole("button", { name: "Play Tic Tac Toe", exact: true }).click();
  const field = page.getByLabel("Your name", { exact: true });
  await field.or(page.getByRole("button", { name: "Edit", exact: true })).waitFor();
  if (!(await field.isVisible())) await page.getByRole("button", { name: "Edit", exact: true }).click();
  await field.fill(name);
}

async function leaveTable(page) {
  await page.getByRole("dialog", { name: "Match results", exact: true })
    .getByRole("button", { name: "Leave Table", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/room/"));
}

async function exercise(browser, frontend, fixture, result) {
  const contexts = [];
  const pages = [];
  try {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: theme });
      contexts.push(context);
      await context.addInitScript((choice) => {
        if (location.protocol === "http:") localStorage.setItem("bhalyam.theme", choice);
      }, theme);
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (["127.0.0.1", "localhost"].includes(url.hostname) || ["data:", "blob:"].includes(url.protocol)) return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", (error) => {
        const message = `[${result.activeStep}] ${error.message}`;
        if (!result.errors.includes(message)) result.errors.push(message);
      });
      pages.push(page);
    }
    const [host, joiner] = pages;
    result.activeStep = "identity";
    await signIn(host, frontend.url, "release-host");
    await signIn(joiner, frontend.url, "release-joiner");
    assert.equal(await host.locator("html").getAttribute("data-theme"), "light");
    assert.equal(await joiner.locator("html").getAttribute("data-theme"), "dark");
    result.activeStep = "roomCreation";
    await openGame(host, frontend.url, "Release Host");
    await host.getByRole("button", { name: "Classic Matrix", exact: false }).click();
    await host.getByRole("button", { name: /^Untimed/ }).click();
    await host.getByRole("dialog", { name: "Tic Tac Toe", exact: true }).getByRole("button", { name: /^Create Room/ }).click();
    await host.waitForURL(/\/room\/[A-Z0-9]+/);
    const code = new URL(host.url()).pathname.split("/").pop();
    result.flows.roomCreation = true;
    result.activeStep = "roomJoin";
    await openGame(joiner, frontend.url, "Release Joiner");
    await joiner.getByLabel("6-character room code", { exact: true }).fill(code);
    await joiner.getByRole("button", { name: "Join Table", exact: true }).click();
    await joiner.waitForURL(`**/room/${code}`);
    await host.getByText("Release Joiner", { exact: true }).first().waitFor();
    await joiner.getByText("Release Host", { exact: true }).first().waitFor();
    const stateUrl = `${fixture.url}/fixture/room/${code}`;
    assert.equal((await readJson(stateUrl)).room.players.length, 2);
    result.flows.roomJoin = true;
    // Both identities are checked at the HTTP boundary, not inferred from UI.
    for (const page of pages) {
      const identity = await page.evaluate(async (backend) => {
        const token = localStorage.getItem("bhalyam.guest.token");
        if (!token) return null;
        const response = await fetch(`${backend}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        return response.ok ? { body: await response.json(), storedId: localStorage.getItem("bhalyam.guest.id") } : null;
      }, fixture.url);
      assert.ok(identity);
      assert.equal(identity.body.player.playerId, identity.storedId);
      assert.equal(identity.body.player.kind, "guest");
    }
    result.flows.identity = true;

    result.activeStep = "gameArena";
    for (const page of pages) await page.getByRole("button", { name: "I'm Ready", exact: true }).click();
    await host.getByRole("button", { name: /^Start Game/ }).click();
    for (const page of pages) await page.getByRole("gridcell", { name: "Cell 1, empty", exact: true }).waitFor();
    await host.getByRole("gridcell", { name: "Cell 1, empty", exact: true }).click();
    for (const page of pages) await page.getByRole("gridcell", { name: "Cell 1, occupied by X", exact: true }).waitFor();
    result.flows.gameArena = true;
    result.activeStep = "chat";
    const text = `release-browser-${Date.now()}`;
    await host.getByLabel("Type a message", { exact: true }).fill(text);
    await host.getByRole("button", { name: "Send message", exact: true }).click();
    const remoteMessage = joiner.getByLabel("Chat messages history").getByText(text, { exact: true });
    await remoteMessage.waitFor();
    assert.equal(await remoteMessage.count(), 1);
    result.flows.chat = true;
    result.activeStep = "modal";
    // Escape is reserved by native fullscreen in Firefox/WebKit. Exercise
    // the application dialog outside fullscreen, not the browser's exit UI.
    await host.evaluate(async () => {
      if (document.fullscreenElement) await document.exitFullscreen();
    });
    await host.getByRole("button", { name: "How to Play", exact: true }).click();
    const modal = host.getByRole("dialog");
    await modal.waitFor();
    await host.getByRole("button", { name: "Close tutorial", exact: true }).focus();
    for (let i = 0; i < 12; i++) {
      await host.keyboard.press("Tab");
      assert.ok(await modal.evaluate((element) => element.contains(document.activeElement)));
    }
    await host.keyboard.press("Escape");
    await modal.waitFor({ state: "hidden" });
    result.flows.modal = true;
    // Refresh during a live match. The server must attach the same seat and
    // restore the existing board, not create a duplicate participant.
    const before = (await readJson(stateUrl)).room.players.map((player) => player.id).sort();
    result.activeStep = "recovery";
    await joiner.reload();
    await joiner.getByRole("gridcell", { name: "Cell 1, occupied by X", exact: true }).waitFor();
    await waitUntil(async () => {
      const state = await readJson(stateUrl);
      return state.room.players.every((player) => player.isConnected) ? state : false;
    }, "browser seat recovery");
    assert.deepEqual((await readJson(stateUrl)).room.players.map((player) => player.id).sort(), before);
    assert.equal((await readJson(stateUrl)).game.moveCount, 1);
    result.flows.recovery = true;
    result.activeStep = "gameFinished";
    const moves = [3, 1, 4, 2];
    for (let i = 0; i < moves.length; i++) {
      const page = i % 2 === 0 ? joiner : host;
      await page.getByRole("gridcell", { name: `Cell ${moves[i] + 1}, empty`, exact: true }).click();
      if (i < moves.length - 1) {
        for (const observer of pages) {
          await observer.getByRole("gridcell", { name: `Cell ${moves[i] + 1}, occupied by ${i % 2 === 0 ? "O" : "X"}`, exact: true }).waitFor();
        }
      }
    }
    await host.getByRole("dialog", { name: "Match results", exact: true }).getByText("You won the match!", { exact: true }).waitFor();
    await joiner.getByRole("dialog", { name: "Match results", exact: true }).getByText("Release Host won the match.", { exact: true }).waitFor();
    const finished = await readJson(stateUrl);
    assert.equal(finished.room.phase, "finished");
    assert.equal(finished.game.moveCount, 5);
    result.flows.gameFinished = true;
    result.activeStep = "cleanup";
    for (const page of pages) await leaveTable(page);
    await waitUntil(async () => (await readJson(`${fixture.url}/health`)).rooms === 0, "browser room cleanup");
    result.flows.cleanup = true;
    result.activeStep = "context teardown";
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}

export async function runBrowserCompatibility() {
  const evidence = captureEvidence(ROOT);
  const matrix = [];
  let fixture;
  let frontend;
  const errors = [];
  try {
    fixture = await startReleaseFixture();
    frontend = await startReleaseFrontend(fixture.url);
    console.log(`Isolated browser frontend: ${frontend.url}`);
    for (const [id, engine, options] of [
      ["chromium", chromium, {}], ["edge", chromium, { channel: "msedge" }],
      ["firefox", firefox, {}], ["safari", webkit, {}],
    ]) {
      const result = {
        id, implementation: id === "safari" ? "Playwright WebKit (NOT physical Apple Safari)" : id,
        status: "FAIL", activeStep: "launch", themes: ["light", "dark"],
        flows: Object.fromEntries(JOURNEY_STEPS.map((step) => [step, false])), errors: [],
      };
      let browser;
      try {
        browser = await engine.launch({ headless: true, ...options });
        await exercise(browser, frontend, fixture, result);
        result.status = evaluateBrowserJourney(result.flows, result.errors) ? "PASS" : "FAIL";
      } catch (error) {
        result.errors.push(`[${result.activeStep}] ${error.message}`);
      } finally {
        if (browser) await browser.close();
      }
      matrix.push(result);
      console.log(`${id}: ${result.status}${result.errors.length ? `: ${result.errors.join("; ")}` : ""}`);
      if (result.status !== "PASS") {
        errors.push(`${id}: browser checks failed; see flow flags and runtime errors.`);
        if (id !== "safari" && (await readJson(`${fixture.url}/health`)).rooms > 0) {
          await frontend.close();
          await fixture.close();
          fixture = await startReleaseFixture();
          frontend = await startReleaseFrontend(fixture.url);
        }
      }
    }
  } catch (error) {
    errors.push(error.message);
    console.error(error);
  } finally {
    const cleanup = await Promise.allSettled([frontend?.close(), fixture?.close()]);
    for (const outcome of cleanup) {
      if (outcome.status === "rejected") errors.push(`Fixture cleanup failed: ${outcome.reason}`);
    }
  }
  for (const id of ["chromium", "edge", "firefox", "safari"]) {
    if (!matrix.some((item) => item.id === id)) matrix.push({
      id, status: "NOT TESTED", flows: {}, errors: ["Earlier fixture/journey failure prevented this engine from running."],
    });
  }
  const report = {
    status: matrix.every((item) => item.status === "PASS") && errors.length === 0 ? "PASS" : "FAIL",
    browsers: matrix, errors, evidence: completeEvidence(evidence, ROOT),
    scope: "Two desktop contexts, local sign-in fallback and real guest-token endpoint, UI create/join/chat/tutorial/start/moves/results/refresh/leave. In-memory rooms with no paid economy. Not Supabase login, cloud persistence, physical Safari/iOS, mobile layout or real payments.",
  };
  fs.writeFileSync(path.join(ROOT, "BROWSER-COMPATIBILITY-REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(ROOT, "BROWSER-COMPATIBILITY-REPORT.md"), (
    `# Measured local browser journeys\n\nStatus: ${report.status}\n\n${report.scope}\n\n` +
    matrix.map((item) => `- ${item.id}: ${item.status}${item.errors.length ? `; ${item.errors.join("; ")}` : ""}`).join("\n")).trimEnd() + "\n");
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = (await runBrowserCompatibility()).status === "PASS" ? 0 : 1;
}
