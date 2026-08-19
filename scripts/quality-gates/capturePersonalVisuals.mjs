#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const serverRequire = createRequire(path.join(ROOT_DIR, "server", "package.json"));
const clientRequire = createRequire(path.join(ROOT_DIR, "client", "package.json"));

const express = serverRequire("express");
const { chromium } = clientRequire("playwright");

const FRONTEND_PORT = 4198;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots", "personal");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const MOCK_PROFILE = {
  playerId: "player_kethan_1",
  displayName: "Kethan Grandmaster",
  avatar: "file_0000000094008208a20f77270605d0d5_1.jpg",
  joinedAt: Date.now() - 86400000 * 45,
  lastSeenAt: Date.now(),
  level: 8,
  experiencePoints: 780,
};

const MOCK_STATS = {
  playerId: "player_kethan_1",
  totalMatches: 64,
  wins: 46,
  losses: 14,
  draws: 4,
  winRate: 72,
  winStreak: 6,
  bestWinStreak: 11,
  totalPlayTimeMinutes: 245,
  averageMatchMinutes: 4,
  longestMatchMinutes: 18,
  recoveryCount: 5,
  favoriteGame: "ludo",
};

const MOCK_MATCHES = [
  {
    matchId: "match_101",
    roomCode: "LUDO99",
    game: "ludo",
    result: "WIN",
    durationMs: 240000,
    finishedAt: Date.now() - 3600000 * 2,
    participants: [
      { playerId: "player_kethan_1", name: "Kethan Grandmaster", isWinner: true },
    ],
    replayAvailable: true,
  },
];

const MOCK_ACHIEVEMENTS = [
  {
    id: "first_blood",
    title: "First Victory",
    description: "Win your first multiplayer game in the lounge.",
    icon: "trophy",
    category: "skill",
    targetValue: 1,
    currentProgress: 1,
    progressPercent: 100,
    unlocked: true,
    unlockedAt: Date.now() - 86400000 * 40,
  },
];

async function startFrontend() {
  const distDir = path.join(ROOT_DIR, "client", "dist");
  const app = express();
  app.use(express.static(distDir));
  app.get("*", (req, res) => res.sendFile(path.join(distDir, "index.html")));

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(FRONTEND_PORT, "127.0.0.1", () => {
      console.log(`💻 Frontend preview running at ${FRONTEND_URL}`);
      resolve(server);
    });
  });
}

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/api/auth/guest")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          playerId: "player_kethan_1",
          token: "mock_guest_token_123",
          expiresAt: Date.now() + 86400000,
        }),
      });
    }

    if (url.includes("/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stats: MOCK_STATS }),
      });
    }

    if (url.includes("/matches")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ matches: MOCK_MATCHES, total: MOCK_MATCHES.length }),
      });
    }

    if (url.includes("/achievements")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ achievements: MOCK_ACHIEVEMENTS }),
      });
    }

    if (url.includes("/api/profile/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profile: MOCK_PROFILE }),
      });
    }

    return route.continue();
  });
}

function injectStorage(theme = "light") {
  localStorage.setItem("bhalyam.theme", theme);
  localStorage.setItem(
    "bhalyam.consent",
    JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
  );
  localStorage.setItem("bhalyam.account", JSON.stringify({ kind: "member", email: "kethan@bhalyam.com", since: Date.now() }));
  localStorage.setItem("bhalyam.guest_name", "Kethan Grandmaster");
  localStorage.setItem("bhalyam.guest.id", "player_kethan_1");
  localStorage.setItem("bhalyam.guest.token", "mock_guest_token_123");
  localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 86400000));
  localStorage.setItem("bhalyam.profile.bio", "90s multiplayer enthusiast and classic Ludo master.");
  localStorage.setItem("bhalyam.profile.region", "India 🇮🇳");
}

async function captureScreenshots() {
  const frontendServer = await startFrontend();
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  const themes = ["light", "dark"];

  for (const vp of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      await setupPageRoutes(page);
      await page.addInitScript(injectStorage, theme);

      await page.goto(`${FRONTEND_URL}/profile/personal`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

      await page.waitForTimeout(1000);

      const filename = `personal-${vp.name}-${theme}-${vp.width}x${vp.height}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filepath });
      console.log(`📸 Captured: ${filename}`);

      await context.close();
    }
  }

  // Capture Edit Profile Modal Open
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await setupPageRoutes(page);
    await page.addInitScript(injectStorage, "light");

    await page.goto(`${FRONTEND_URL}/profile/personal`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(1000);

    const editBtn = page.getByRole("button", { name: /Edit Profile/i });
    await editBtn.waitFor({ state: "visible", timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(400);

    const editModalFile = path.join(SCREENSHOTS_DIR, `personal-edit-modal-light-1440x900.png`);
    await page.screenshot({ path: editModalFile });
    console.log(`📸 Captured: personal-edit-modal-light-1440x900.png`);
    await context.close();
  }

  // Capture Avatar Picker Modal Open
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await setupPageRoutes(page);
    await page.addInitScript(injectStorage, "light");

    await page.goto(`${FRONTEND_URL}/profile/personal`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(1000);

    const avatarBtn = page.getByRole("button", { name: /Change Avatar/i });
    await avatarBtn.waitFor({ state: "visible", timeout: 5000 });
    await avatarBtn.click();
    await page.waitForTimeout(400);

    const avatarModalFile = path.join(SCREENSHOTS_DIR, `personal-avatar-modal-light-1440x900.png`);
    await page.screenshot({ path: avatarModalFile });
    console.log(`📸 Captured: personal-avatar-modal-light-1440x900.png`);
    await context.close();
  }

  await browser.close();
  frontendServer.close();
  console.log("\n✅ All Personal Information screenshots successfully captured!");
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
