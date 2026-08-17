import { chromium } from "playwright";
import { io } from "socket.io-client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

const VIEWPORTS = [
  { name: "Galaxy_360", width: 360, height: 740 },
  { name: "iPhone_375", width: 375, height: 667 },
  { name: "iPhone_393", width: 393, height: 852 },
];

const GAMES = ["ludo", "snl", "rummy", "rps", "uno", "handcricket", "dotsboxes"];

function createRoomWithBotAndStart(game) {
  return new Promise((resolve, reject) => {
    const socket = io("http://localhost:4000", { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit(
        "room:create",
        {
          name: "HostTester",
          game,
          hostKind: "member",
        },
        (res) => {
          if (!res || !res.ok || !res.code) {
            socket.disconnect();
            return reject(new Error(res?.error || "Create failed"));
          }
          const { code, seatToken, playerId } = res;

          // Add a bot
          socket.emit("room:bot:add", { name: "BotBuddy", difficulty: "medium" }, (bRes) => {
            // Ready up
            socket.emit("room:ready", { isReady: true }, (rRes) => {
              // Start game
              socket.emit("room:start", (sRes) => {
                socket.disconnect();
                resolve({ code, seatToken, playerId });
              });
            });
          });
        }
      );
    });
    socket.on("connect_error", (err) => {
      socket.disconnect();
      reject(err);
    });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const game of GAMES) {
    console.log(`\n============================================`);
    console.log(`Starting IN-PLAY test for: ${game.toUpperCase()}`);
    let room;
    try {
      room = await createRoomWithBotAndStart(game);
      console.log(`Room started: ${room.code}`);
    } catch (e) {
      console.error(`Failed to start room for ${game}:`, e.message);
      continue;
    }

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
      });

      await context.addInitScript(({ code, seatToken }) => {
        localStorage.setItem(
          "bhalyam.consent",
          JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
        );
        localStorage.setItem(
          "bhalyam.account",
          JSON.stringify({ kind: "member", email: "tester@bhalyam.com", since: Date.now() })
        );
        localStorage.setItem("mpg.name", "HostTester");
        const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
        seats[code] = seatToken;
        localStorage.setItem("mpg.seats", JSON.stringify(seats));
      }, { code: room.code, seatToken: room.seatToken });

      const page = await context.newPage();
      await page.goto(`http://localhost:5173/room/${room.code}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      // Check overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      const hasOverflow = scrollWidth > clientWidth || bodyScrollWidth > clientWidth;
      const overflowPx = Math.max(scrollWidth - clientWidth, bodyScrollWidth - clientWidth);

      console.log(`[IN-PLAY][${game}][${vp.name}] scrollW: ${scrollWidth}, clientW: ${clientWidth} -> ${hasOverflow ? `❌ OVERFLOW ${overflowPx}px` : "✅ PASS"}`);

      let badElements = [];
      if (hasOverflow) {
        badElements = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth;
          const bad = [];
          document.querySelectorAll("*").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > docW + 1) {
              bad.push({
                tag: el.tagName,
                class: el.className,
                right: Math.round(r.right),
                width: Math.round(r.width),
                text: (el.textContent || "").trim().slice(0, 30),
              });
            }
          });
          return bad.slice(0, 8);
        });
        console.log("  Bad elements:", badElements);
      }

      results.push({
        game,
        viewport: vp.name,
        width: vp.width,
        hasOverflow,
        overflowPx,
        badElements,
      });

      // Screenshot in play
      const screenPath = path.resolve(publicDir, `inplay-${game}-${vp.name}.png`);
      await page.screenshot({ path: screenPath });

      await context.close();
    }
  }

  console.log("\n============================================");
  console.log("IN-PLAY RESPONSIVENESS SUMMARY:");
  console.log("============================================");
  const failures = results.filter((r) => r.hasOverflow);
  if (failures.length === 0) {
    console.log("🎉 ALL IN-PLAY BOARDS PASSED ON MOBILE VIEWPORTS WITH ZERO OVERFLOW!");
  } else {
    console.log(`⚠️ FOUND ${failures.length} IN-PLAY OVERFLOW FAILURES:`);
    for (const f of failures) {
      console.log(` - [${f.game}][${f.viewport} (${f.width}px)] overflowed by ${f.overflowPx}px`);
      console.log(`   elements:`, f.badElements);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
