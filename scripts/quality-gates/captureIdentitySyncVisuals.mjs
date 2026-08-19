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

(async () => {
  const app = express();
  app.use(express.static(path.join(ROOT_DIR, "client", "dist")));
  app.get("*", (req, res) => res.sendFile(path.join(ROOT_DIR, "client", "dist", "index.html")));
  const server = app.listen(4205);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
    localStorage.setItem("bhalyam_onboarding_state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
    localStorage.setItem("bhalyam.account", JSON.stringify({ kind: "member", email: "rajamonica@example.com", since: Date.now() }));
    localStorage.setItem("bhalyam.guest.id", "player_rajamonica");
    localStorage.setItem("bhalyam.guest.token", "signed_token_rajamonica");
    localStorage.setItem("bhalyam.guest.expires", String(Date.now() + 86400000 * 30));
    localStorage.setItem("bhalyam.profile.displayName", "Rajamonica");
    localStorage.setItem("mpg.playerName", "Rajamonica");
    localStorage.setItem("mpg.avatar", "file_00000000c1f48208810e59b5535e2d15_18.jpg");
  });

  // 1. Capture Personal Info Page with live synced Header
  await page.goto("http://127.0.0.1:4205/profile/personal");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT_DIR, "screenshots", "personal", "identity-synced-personal-page.png") });

  // 2. Capture Home Page with live synced Header and Sidebar
  await page.goto("http://127.0.0.1:4205");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT_DIR, "screenshots", "personal", "identity-synced-home-page.png") });

  await browser.close();
  server.close();
  console.log("Captured identity sync visuals successfully!");
})();
