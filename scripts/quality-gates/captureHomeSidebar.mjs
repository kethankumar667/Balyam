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
  const server = app.listen(4201);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
    localStorage.setItem("bhalyam_onboarding_state", JSON.stringify({ hasCompletedWelcome: true, completedMilestones: [] }));
    localStorage.setItem("bhalyam.session", JSON.stringify({ user: { id: "usr_1", email: "kethan@example.com" } }));
    localStorage.setItem("bhalyam.account", JSON.stringify({ isMember: true, username: "Kethan" }));
  });
  await page.goto("http://127.0.0.1:4201");
  await page.waitForTimeout(500);
  try {
    const skipBtn = page.getByText("Skip Intro");
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {}
  await page.screenshot({ path: path.join(ROOT_DIR, "screenshots", "personal", "home-sidebar-with-profile.png") });
  await browser.close();
  server.close();
  console.log("Captured home-sidebar-with-profile.png successfully!");
})();
