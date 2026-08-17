import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

const VIEWPORTS = [
  { name: "Galaxy_360", width: 360, height: 740 },
  { name: "iPhone_375", width: 375, height: 667 },
  { name: "iPhone14_393", width: 393, height: 852 },
  { name: "Pixel_412", width: 412, height: 915 },
];

const GAMES_TO_TEST = ["ludo", "rummy", "snl", "handcricket", "rps", "uno", "dotsboxes"];

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const game of GAMES_TO_TEST) {
    console.log(`\n========================================`);
    console.log(`Testing Game: ${game.toUpperCase()}`);
    console.log(`========================================`);

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
      });

      await context.addInitScript(() => {
        localStorage.setItem(
          "bhalyam.consent",
          JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
        );
        localStorage.setItem(
          "bhalyam.account",
          JSON.stringify({ kind: "member", email: "tester@bhalyam.com", since: Date.now() })
        );
        localStorage.setItem("mpg.name", "Kethan");
      });

      const page = await context.newPage();

      // Go to home
      await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      // Create room via page evaluate socket or UI
      const roomCode = await page.evaluate(async (gameKind) => {
        return new Promise((resolve) => {
          const socket = window.__testSocket || (window.io && window.io("http://localhost:3001"));
          // Or read room store socket
          const socketModule = window.__socketInstance;
          if (socketModule) {
            socketModule.emit("room:create", {
              name: "Kethan",
              game: gameKind,
              hostKind: "member",
            }, (res) => {
              if (res.ok && res.code) {
                // store seat
                const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
                seats[res.code] = res.seatToken;
                localStorage.setItem("mpg.seats", JSON.stringify(seats));
                resolve(res.code);
              } else {
                resolve(null);
              }
            });
          } else {
            resolve(null);
          }
        });
      }, game);

      let targetUrl = "http://localhost:5173/";
      if (roomCode) {
        targetUrl = `http://localhost:5173/room/${roomCode}`;
        await page.goto(targetUrl, { waitUntil: "networkidle" });
      } else {
        // Fallback: Click game tile and create room via UI
        const gameCard = page.locator(`[data-game="${game}"], text="${game}"`).first();
        if (await gameCard.isVisible()) {
          await gameCard.click();
          await page.waitForTimeout(400);
          const hostBtn = page.locator('button:has-text("Create Room"), button:has-text("Host Table"), button:has-text("Play with Friends"), button:has-text("Host Room")').first();
          if (await hostBtn.isVisible()) {
            await hostBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      await page.waitForTimeout(600);
      const currentUrl = page.url();
      console.log(`[${vp.name}][${game}] Landed at: ${currentUrl}`);

      // Check horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      console.log(`[${vp.name}][${game}] docScroll: ${scrollWidth}, docClient: ${clientWidth}, bodyScroll: ${bodyScrollWidth}`);

      if (scrollWidth > clientWidth || bodyScrollWidth > clientWidth) {
        console.warn(`🚨 OVERFLOW DETECTED for ${game} on ${vp.name}!`);
        const overflowDetails = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth;
          const bad = [];
          document.querySelectorAll("*").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > docW + 1) {
              bad.push({
                tag: el.tagName,
                class: el.className,
                right: r.right,
                width: r.width,
                text: (el.textContent || "").slice(0, 30),
              });
            }
          });
          return bad.slice(0, 5);
        });
        console.log("Overflowing elements:", overflowDetails);
      } else {
        console.log(`✅ ${game} on ${vp.name}: Clean layout`);
      }

      // Save screenshot
      const screenPath = path.resolve(publicDir, `room-${game}-${vp.name}.png`);
      await page.screenshot({ path: screenPath });

      await context.close();
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
