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

const FRONTEND_PORT = 4195;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots", "social");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const MOCK_FRIENDS = [
  {
    playerId: "player_kethan_1",
    friendPlayerId: "friend_aarav_1",
    displayName: "Aarav Champion",
    avatar: "🦁",
    createdAt: Date.now() - 86400000 * 14,
  },
  {
    playerId: "player_kethan_1",
    friendPlayerId: "friend_diya_2",
    displayName: "Diya Strategist",
    avatar: "👑",
    createdAt: Date.now() - 86400000 * 8,
  },
  {
    playerId: "player_kethan_1",
    friendPlayerId: "friend_rohan_3",
    displayName: "Rohan Master",
    avatar: "⚡",
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    playerId: "player_kethan_1",
    friendPlayerId: "friend_kavya_4",
    displayName: "Kavya Grandmaster",
    avatar: "🌟",
    createdAt: Date.now() - 86400000 * 2,
  },
];

const MOCK_PRESENCES = {
  friend_aarav_1: {
    playerId: "friend_aarav_1",
    status: "ONLINE",
    activityDetail: "Browsing Games Lounge",
    lastActiveAt: Date.now(),
  },
  friend_diya_2: {
    playerId: "friend_diya_2",
    status: "IN_GAME",
    activityDetail: "Ludo Grand Prix Open",
    lastActiveAt: Date.now(),
  },
  friend_rohan_3: {
    playerId: "friend_rohan_3",
    status: "ONLINE",
    activityDetail: "In UNO Championship Room",
    lastActiveAt: Date.now(),
  },
  friend_kavya_4: {
    playerId: "friend_kavya_4",
    status: "OFFLINE",
    activityDetail: "Offline",
    lastActiveAt: Date.now() - 3600000 * 5,
  },
};

const MOCK_REQUESTS = {
  incoming: [
    {
      id: "req_inc_1",
      senderId: "player_neha_5",
      senderName: "Neha Striker",
      senderAvatar: "🎯",
      recipientId: "player_kethan_1",
      status: "PENDING",
      createdAt: Date.now() - 3600000 * 2,
    },
  ],
  outgoing: [
    {
      id: "req_out_1",
      senderId: "player_kethan_1",
      senderName: "Kethan Player",
      recipientId: "player_arjun_99",
      status: "PENDING",
      createdAt: Date.now() - 3600000 * 4,
    },
  ],
};

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

        if (url.includes("/api/social/friends/")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ friends: MOCK_FRIENDS }),
          });
        }

        if (url.includes("/api/social/presence/query")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ presences: MOCK_PRESENCES }),
          });
        }

        if (url.includes("/api/social/presence/")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }

        if (url.includes("/api/social/requests/")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_REQUESTS),
          });
        }

        if (url.includes("/api/parties/player/")) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              party: {
                id: "party_squad_1",
                leaderId: "player_kethan_1",
                members: [
                  { playerId: "player_kethan_1", displayName: "Kethan (Leader)", avatar: "👑", isLeader: true, isReady: true, joinedAt: Date.now() },
                  { playerId: "friend_aarav_1", displayName: "Aarav Champion", avatar: "🦁", isLeader: false, isReady: true, joinedAt: Date.now() },
                  { playerId: "friend_diya_2", displayName: "Diya Strategist", avatar: "⚡", isLeader: false, isReady: false, joinedAt: Date.now() },
                ],
                maxMembers: 4,
                status: "INVITING",
                targetRoomCode: "LUDO77",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
              invitations: [],
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

      await page.goto(`${FRONTEND_URL}/social`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

      await page.waitForTimeout(1000);

      const filename = `social-${vp.name}-${theme}-${vp.width}x${vp.height}.png`;
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
        const scrolledFile = path.join(SCREENSHOTS_DIR, `social-desktop-${theme}-scrolled-1440x900.png`);
        await page.screenshot({ path: scrolledFile });
        console.log(`📸 Captured: social-desktop-${theme}-scrolled-1440x900.png`);
      }

      await context.close();
    }
  }

  // Also capture Empty Friends List state in light mode
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/social/friends/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ friends: [] }) });
      }
      if (url.includes("/api/social/requests/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ incoming: [], outgoing: [] }) });
      }
      if (url.includes("/api/parties/player/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ party: null, invitations: [] }) });
      }
      if (url.includes("/api/social/presence/")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    await page.addInitScript(() => {
      localStorage.setItem("bhalyam.theme", "light");
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
      );
      localStorage.setItem("bhalyam.guest_name", "Kethan Player");
      localStorage.setItem("bhalyam.guest.id", "player_kethan_1");
      localStorage.setItem("bhalyam.guest.token", "mock_guest_token_123");
    });

    await page.goto(`${FRONTEND_URL}/social`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.waitForTimeout(1000);

    const emptyFile = path.join(SCREENSHOTS_DIR, `social-empty-friends-light-1440x900.png`);
    await page.screenshot({ path: emptyFile });
    console.log(`📸 Captured: social-empty-friends-light-1440x900.png`);
    await context.close();
  }

  await browser.close();
  frontendServer.close();
  console.log("\n✅ All Social Hub screenshots successfully captured!");
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
