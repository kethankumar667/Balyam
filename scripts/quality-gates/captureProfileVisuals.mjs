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

const FRONTEND_PORT = 4196;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots", "profile");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const MOCK_PROFILE = {
  playerId: "player_kethan_1",
  displayName: "Kethan Grandmaster",
  avatar: "👑",
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
  perGame: {
    ludo: {
      game: "ludo",
      matchesPlayed: 32,
      wins: 24,
      winRate: 75,
      totalPlayTimeMinutes: 140,
      averageMatchDurationMinutes: 4,
    },
    rummy: {
      game: "rummy",
      matchesPlayed: 20,
      wins: 14,
      winRate: 70,
      totalPlayTimeMinutes: 75,
      averageMatchDurationMinutes: 4,
    },
    handcricket: {
      game: "handcricket",
      matchesPlayed: 12,
      wins: 8,
      winRate: 67,
      totalPlayTimeMinutes: 30,
      averageMatchDurationMinutes: 3,
    },
  },
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
      { playerId: "friend_aarav_1", name: "Aarav Champion", isWinner: false },
    ],
    replayAvailable: true,
  },
  {
    matchId: "match_102",
    roomCode: "RUMMY42",
    game: "rummy",
    result: "WIN",
    durationMs: 310000,
    finishedAt: Date.now() - 86400000 * 1,
    participants: [
      { playerId: "player_kethan_1", name: "Kethan Grandmaster", isWinner: true },
      { playerId: "friend_diya_2", name: "Diya Strategist", isWinner: false },
    ],
    replayAvailable: false,
  },
  {
    matchId: "match_103",
    roomCode: "CRICKET7",
    game: "handcricket",
    result: "LOSS",
    durationMs: 180000,
    finishedAt: Date.now() - 86400000 * 2,
    participants: [
      { playerId: "player_kethan_1", name: "Kethan Grandmaster", isWinner: false },
      { playerId: "friend_rohan_3", name: "Rohan Master", isWinner: true },
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
  {
    id: "ludo_grand_slam",
    title: "Ludo Grandmaster",
    description: "Capture 10 opponent tokens in a single Ludo match.",
    icon: "crown",
    category: "skill",
    targetValue: 10,
    currentProgress: 10,
    progressPercent: 100,
    unlocked: true,
    unlockedAt: Date.now() - 86400000 * 12,
  },
  {
    id: "resilience_warrior",
    title: "Iron Will",
    description: "Recover your seat seamlessly during 5 reconnect events.",
    icon: "shield",
    category: "resilience",
    targetValue: 5,
    currentProgress: 5,
    progressPercent: 100,
    unlocked: true,
    unlockedAt: Date.now() - 86400000 * 5,
  },
  {
    id: "season_champion",
    title: "Season Champion",
    description: "Win a weekly championship bracket tournament.",
    icon: "sparkles",
    category: "tournaments",
    targetValue: 1,
    currentProgress: 0,
    progressPercent: 0,
    unlocked: false,
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

async function setupPageRoutes(page, customMatches = MOCK_MATCHES) {
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
        body: JSON.stringify({ matches: customMatches, total: customMatches.length }),
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

      await page.goto(`${FRONTEND_URL}/profile`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

      await page.waitForTimeout(1000);

      const filename = `profile-${vp.name}-${theme}-${vp.width}x${vp.height}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filepath });
      console.log(`📸 Captured: ${filename}`);

      // Capture scrolled view on desktop
      if (vp.name === "desktop") {
        await page.evaluate(() => {
          const main = document.getElementById("app-main-scroll");
          if (main) main.scrollTop = 450;
        });
        await page.waitForTimeout(300);
        const scrolledFile = path.join(SCREENSHOTS_DIR, `profile-desktop-${theme}-scrolled-1440x900.png`);
        await page.screenshot({ path: scrolledFile });
        console.log(`📸 Captured: profile-desktop-${theme}-scrolled-1440x900.png`);
      }

      await context.close();
    }
  }

  // Also capture Match History Tab view in light mode
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await setupPageRoutes(page, MOCK_MATCHES);
    await page.addInitScript(injectStorage, "light");

    await page.goto(`${FRONTEND_URL}/profile`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(1000);

    const historyBtn = page.getByRole("button", { name: /Match History/i });
    await historyBtn.waitFor({ state: "visible", timeout: 5000 });
    await historyBtn.click();
    await page.waitForTimeout(500);

    const historyFile = path.join(SCREENSHOTS_DIR, `profile-match-history-light-1440x900.png`);
    await page.screenshot({ path: historyFile });
    console.log(`📸 Captured: profile-match-history-light-1440x900.png`);
    await context.close();
  }

  // Also capture Empty Matches State
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await setupPageRoutes(page, []);
    await page.addInitScript(injectStorage, "light");

    await page.goto(`${FRONTEND_URL}/profile`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(1000);

    const emptyHistoryBtn = page.getByRole("button", { name: /Match History/i });
    await emptyHistoryBtn.waitFor({ state: "visible", timeout: 5000 });
    await emptyHistoryBtn.click();
    await page.waitForTimeout(500);

    const emptyHistoryFile = path.join(SCREENSHOTS_DIR, `profile-empty-matches-light-1440x900.png`);
    await page.screenshot({ path: emptyHistoryFile });
    console.log(`📸 Captured: profile-empty-matches-light-1440x900.png`);
    await context.close();
  }

  await browser.close();
  frontendServer.close();
  console.log("\n✅ All Profile screenshots successfully captured!");
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
