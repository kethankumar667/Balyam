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

const FRONTEND_PORT = 4192;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots", "tournaments");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const MOCK_TOURNAMENTS = [
  {
    id: "tourney_uno_1",
    title: "Weekly UNO Championship",
    description: "Fast-paced knockout tournament. Win consecutive rounds to claim the championship trophy!",
    game: "uno",
    type: "SINGLE_ELIMINATION",
    status: "REGISTRATION_OPEN",
    config: { minPlayers: 4, maxPlayers: 8, allowLateJoin: false, autoAdvanceByes: true, checkInRequired: false, visibility: "PUBLIC" },
    participants: [
      { playerId: "p1", displayName: "Aarav", seed: 1, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p2", displayName: "Diya", seed: 2, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p3", displayName: "Kavya", seed: 3, checkedIn: true, status: "CHECKED_IN" },
    ],
    currentRound: 0,
    totalRounds: 3,
    startsAt: Date.now() + 7200000,
    createdAt: Date.now(),
    createdBy: "system",
    rewards: [
      { placement: 1, name: "Champion", xp: 500, badge: "👑" },
      { placement: 2, name: "Runner Up", xp: 250, badge: "🥈" },
      { placement: 3, name: "Semi Finalist", xp: 100, badge: "🥉" },
      { placement: 4, name: "Participant", xp: 30, badge: "🎖️" },
    ],
  },
  {
    id: "tourney_rummy_2",
    title: "Rummy Masters Invitational",
    description: "Compete against top card strategists in a high-stakes bracket with double XP rewards.",
    game: "rummy",
    type: "SINGLE_ELIMINATION",
    status: "REGISTRATION_OPEN",
    config: { minPlayers: 4, maxPlayers: 16, allowLateJoin: false, autoAdvanceByes: true, checkInRequired: false, visibility: "PUBLIC" },
    participants: [
      { playerId: "p1", displayName: "Rohan", seed: 1, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p2", displayName: "Ananya", seed: 2, checkedIn: true, status: "CHECKED_IN" },
    ],
    currentRound: 0,
    totalRounds: 4,
    startsAt: Date.now() + 10800000,
    createdAt: Date.now(),
    createdBy: "system",
    rewards: [
      { placement: 1, name: "Champion", xp: 600, badge: "👑" },
      { placement: 2, name: "Runner Up", xp: 300, badge: "🥈" },
    ],
  },
  {
    id: "tourney_ludo_3",
    title: "Ludo Grand Prix Open",
    description: "Knockout board tournament with live bracket tracking and exclusive podium trophies.",
    game: "ludo",
    type: "SINGLE_ELIMINATION",
    status: "REGISTRATION_OPEN",
    config: { minPlayers: 4, maxPlayers: 8, allowLateJoin: false, autoAdvanceByes: true, checkInRequired: false, visibility: "PUBLIC" },
    participants: [
      { playerId: "p1", displayName: "Vikram", seed: 1, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p2", displayName: "Pooja", seed: 2, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p3", displayName: "Arjun", seed: 3, checkedIn: true, status: "CHECKED_IN" },
      { playerId: "p4", displayName: "Neha", seed: 4, checkedIn: true, status: "CHECKED_IN" },
    ],
    currentRound: 0,
    totalRounds: 3,
    startsAt: Date.now() + 14400000,
    createdAt: Date.now(),
    createdBy: "system",
    rewards: [
      { placement: 1, name: "Champion", xp: 500, badge: "👑" },
    ],
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

      // Route all API requests with deterministic mock responses
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

        if (url.includes("/api/tournaments/player/") && url.includes("/history")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              history: [
                { tournamentId: "t_past_1", tournamentName: "UNO Blitz Cup Season Opener", game: "uno", placement: 1, participatedAt: Date.now() - 86400000 * 2, prizeXP: 500, badge: "👑" },
                { tournamentId: "t_past_2", tournamentName: "Ludo Knockout Invitational", game: "ludo", placement: 2, participatedAt: Date.now() - 86400000 * 6, prizeXP: 250, badge: "🥈" },
              ],
            }),
          });
        }

        if (url.includes("/bracket")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              bracket: {
                tournamentId: "tourney_uno_1",
                rounds: [
                  {
                    roundNumber: 1,
                    name: "Semifinals",
                    matches: [
                      { matchId: "m1", roundNumber: 1, matchNumber: 1, player1: { playerId: "p1", displayName: "Aarav", seed: 1 }, player2: { playerId: "p4", displayName: "Kavya", seed: 4 }, winnerId: "p1", score1: 1, score2: 0, status: "COMPLETED", spectatorsAllowed: true },
                      { matchId: "m2", roundNumber: 1, matchNumber: 2, player1: { playerId: "p2", displayName: "Diya", seed: 2 }, player2: { playerId: "p3", displayName: "Rohan", seed: 3 }, winnerId: "p2", score1: 1, score2: 0, status: "COMPLETED", spectatorsAllowed: true },
                    ],
                  },
                  {
                    roundNumber: 2,
                    name: "Championship Finals",
                    matches: [
                      { matchId: "m3", roundNumber: 2, matchNumber: 1, player1: { playerId: "p1", displayName: "Aarav", seed: 1 }, player2: { playerId: "p2", displayName: "Diya", seed: 2 }, winnerId: null, score1: 0, score2: 0, status: "READY", spectatorsAllowed: true },
                    ],
                  },
                ],
              },
            }),
          });
        }

        if (url.includes("/api/tournaments")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ tournaments: MOCK_TOURNAMENTS }),
          });
        }

        if (url.includes("/api/seasons/current")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              season: {
                id: "season_1",
                name: "Season 1: Launch Championship",
                seasonNumber: 1,
                startsAt: Date.now() - 86400000 * 5,
                endsAt: Date.now() + 86400000 * 25,
                isActive: true,
              },
            }),
          });
        }

        if (url.includes("/api/seasons/player/")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              stats: {
                playerId: "player_kethan_1",
                seasonId: "season_1",
                seasonXP: 750,
                seasonLevel: 8,
                seasonRankTier: "Contender",
                seasonWins: 12,
                seasonMatches: 16,
                seasonWinRate: 75,
                tournamentWins: 2,
                rewardsClaimed: [],
              },
              rewards: [
                { tierId: "t1", name: "Initiate Badge", minSeasonXP: 100, bonusXP: 50, icon: "🌱", badge: "🥉", title: "Seasonal Initiate", unlocked: true, claimed: true },
                { tierId: "t2", name: "Challenger Blade", minSeasonXP: 300, bonusXP: 100, icon: "⚔️", badge: "🥈", title: "Seasonal Challenger", unlocked: true, claimed: true },
                { tierId: "t3", name: "Contender Shield", minSeasonXP: 600, bonusXP: 200, icon: "🛡️", badge: "🥇", title: "Seasonal Contender", unlocked: true, claimed: false },
                { tierId: "t4", name: "Elite Crown", minSeasonXP: 1200, bonusXP: 400, icon: "💎", badge: "💠", title: "Seasonal Elite", unlocked: false, claimed: false },
                { tierId: "t5", name: "Sovereign Star", minSeasonXP: 2500, bonusXP: 1000, icon: "🌌", badge: "👑", title: "Season Sovereign", unlocked: false, claimed: false },
              ],
            }),
          });
        }

        if (url.includes("/api/seasons/leaderboard")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              leaderboard: [
                { playerId: "u1", displayName: "Aarav Master", avatar: "👑", rank: 1, seasonRankTier: "Sovereign", seasonXP: 2850, seasonWins: 35, tournamentWins: 5, seasonWinRate: 88 },
                { playerId: "u2", displayName: "Diya Strategist", avatar: "⚡", rank: 2, seasonRankTier: "Elite", seasonXP: 2100, seasonWins: 28, tournamentWins: 3, seasonWinRate: 80 },
                { playerId: "u3", displayName: "Rohan Champion", avatar: "🔥", rank: 3, seasonRankTier: "Contender", seasonXP: 1450, seasonWins: 19, tournamentWins: 2, seasonWinRate: 72 },
              ],
            }),
          });
        }

        return route.continue();
      });

      // Seed localStorage
      await page.addInitScript((t) => {
        localStorage.setItem("bhalyam.theme", t);
        localStorage.setItem(
          "bhalyam.consent",
          JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
        );
        localStorage.setItem("bhalyam.guest_name", "Kethan Player");
        localStorage.setItem("bhalyam.guest.id", "player_kethan_1");
        localStorage.setItem("bhalyam.guest.token", "mock_guest_token_123");
      }, theme);

      await page.goto(`${FRONTEND_URL}/tournaments`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

      await page.waitForTimeout(1000);

      const filename = `tournaments-${vp.name}-${theme}-${vp.width}x${vp.height}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: filepath });
      console.log(`📸 Captured: ${filename}`);

      // Capture scrolled view on desktop to showcase cards & trust strip
      if (vp.name === "desktop") {
        await page.evaluate(() => {
          const main = document.getElementById("app-main-scroll");
          if (main) main.scrollTop = 500;
        });
        await page.waitForTimeout(300);
        const scrolledFile = path.join(SCREENSHOTS_DIR, `tournaments-desktop-${theme}-cards-and-trust-strip.png`);
        await page.screenshot({ path: scrolledFile });
        console.log(`📸 Captured: tournaments-desktop-${theme}-cards-and-trust-strip.png`);
      }

      // Also capture bracket modal on desktop light
      if (vp.name === "desktop" && theme === "light") {
        const viewBracketBtn = await page.$("button:has-text('View Bracket')");
        if (viewBracketBtn) {
          await viewBracketBtn.click();
          await page.waitForTimeout(600);
          const modalFile = path.join(SCREENSHOTS_DIR, `tournaments-bracket-modal-1440x900.png`);
          await page.screenshot({ path: modalFile, fullPage: false });
          console.log(`📸 Captured: tournaments-bracket-modal-1440x900.png`);
        }
      }

      await context.close();
    }
  }

  await browser.close();
  frontendServer.close();
  console.log("\n✅ All tournament screenshots successfully captured!");
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
