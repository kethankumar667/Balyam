import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const serverRequire = createRequire(path.join(ROOT_DIR, "server", "package.json"));
const clientRequire = createRequire(path.join(ROOT_DIR, "client", "package.json"));

const express = serverRequire("express");
const { chromium } = clientRequire("playwright");

(async () => {
  const app = express();
  app.use(express.static(path.join(ROOT_DIR, "client", "dist")));
  app.get("*", (req, res) => res.sendFile(path.join(ROOT_DIR, "client", "dist", "index.html")));
  const server = app.listen(4209);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
    localStorage.setItem("bhalyam_onboarding_state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
  });
  
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/guest")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          playerId: "guest_player_99",
          token: "guest_tok_99",
          expiresAt: Date.now() + 86400000,
        }),
      });
    }
    if (url.includes("/api/profile/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile: {
            playerId: "guest_player_99",
            displayName: "Guest",
            avatar: undefined,
            joinedAt: Date.now(),
            lastSeenAt: Date.now(),
            level: 1,
            experiencePoints: 0,
          },
        }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
  });

  // Capture logged out profile page
  await page.goto("http://127.0.0.1:4209/profile/personal");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT_DIR, "screenshots", "personal", "guest-synced-logged-out.png") });

  await browser.close();
  server.close();
  console.log("Captured guest logged out screenshot!");
})();
