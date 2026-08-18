import { chromium } from "playwright";
import { io } from "socket.io-client";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

const VIEWPORTS = [
  { name: "Mobile_320x568", width: 320, height: 568, device: "iPhone SE (1st gen)", isSafari: true },
  { name: "Mobile_360x800", width: 360, height: 800, device: "Galaxy S20", isSafari: false },
  { name: "Mobile_390x844", width: 390, height: 844, device: "iPhone 12/13/14", isSafari: true },
  { name: "Mobile_393x852", width: 393, height: 852, device: "iPhone 14/15 Pro", isSafari: true },
  { name: "Mobile_412x915", width: 412, height: 915, device: "Pixel 7", isSafari: false },
  { name: "Mobile_430x932", width: 430, height: 932, device: "iPhone 14/15 Pro Max", isSafari: true },
  { name: "Landscape_844x390", width: 844, height: 390, device: "iPhone 14 (Landscape)", isSafari: true },
  { name: "Landscape_915x412", width: 915, height: 412, device: "Pixel 7 (Landscape)", isSafari: false },
];

const USER_AGENTS = {
  safari: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chrome: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
};

const GAMES = ["ludo", "snl", "rummy", "uno", "handcricket", "rps", "dotsboxes", "wordbuilding"];

function createRoomOnServer(game) {
  return new Promise((resolve, reject) => {
    const socket = io("http://localhost:4000", { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit(
        "room:create",
        {
          name: "MobileTester",
          game,
          hostKind: "member",
        },
        (res) => {
          socket.disconnect();
          if (res && res.ok && res.code) {
            resolve({ code: res.code, seatToken: res.seatToken, playerId: res.playerId });
          } else {
            reject(new Error(res?.error || "Failed to create room"));
          }
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

  console.log("=================================================");
  console.log("MOBILE ROOM FLOW & VIEWPORT VALIDATION SUITE");
  console.log("=================================================");

  // 1. First test: Name-Entry / Join-by-code flow with no stored name
  console.log("\n[TEST PHASE 1] Validating Name-Entry & Join Flow across Viewports");
  let testRoom;
  try {
    testRoom = await createRoomOnServer("ludo");
    console.log(`Created room for Name-Entry testing: ${testRoom.code}`);
  } catch (e) {
    console.error("Could not create test room:", e.message);
    process.exit(1);
  }

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.isSafari ? USER_AGENTS.safari : USER_AGENTS.chrome,
    });

    const page = await context.newPage();
    await page.goto(`http://localhost:5173/room/${testRoom.code}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Verify Name-Entry form is visible and submit button is reachable
    const formVisible = await page.locator("form").isVisible().catch(() => false);
    const inputVisible = await page.locator('input[placeholder="Your name"]').isVisible().catch(() => false);
    const buttonVisible = await page.locator('button[type="submit"]').isVisible().catch(() => false);

    // Test virtual keyboard focus simulation
    let keyboardFocusOk = false;
    if (inputVisible) {
      await page.locator('input[placeholder="Your name"]').focus();
      await page.waitForTimeout(200);
      const isFocused = await page.evaluate(() => document.activeElement?.tagName === "INPUT");
      keyboardFocusOk = isFocused;
    }

    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    const hasOverflow = scrollW > clientW;

    console.log(`[NameEntry][${vp.name}] Form: ${formVisible ? "✅" : "❌"} | Input: ${inputVisible ? "✅" : "❌"} | Submit: ${buttonVisible ? "✅" : "❌"} | Focus: ${keyboardFocusOk ? "✅" : "❌"} | Overflow: ${hasOverflow ? "❌" : "✅ PASS"}`);

    await context.close();
  }

  // 2. Second test: Room Lobby & Active Gameplay across all games & viewports
  console.log("\n[TEST PHASE 2] Validating In-Room Lobby & Game Viewports");
  for (const game of GAMES) {
    console.log(`\n--------------------------------------------`);
    console.log(`Testing Game Room: ${game.toUpperCase()}`);
    let room;
    try {
      room = await createRoomOnServer(game);
      console.log(`Created room: ${room.code}`);
    } catch (e) {
      console.error(`Could not create room for ${game}:`, e.message);
      continue;
    }

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.isSafari ? USER_AGENTS.safari : USER_AGENTS.chrome,
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
        localStorage.setItem("mpg.name", "MobileTester");
        const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
        seats[code] = seatToken;
        localStorage.setItem("mpg.seats", JSON.stringify(seats));
      }, { code: room.code, seatToken: room.seatToken });

      const page = await context.newPage();
      await page.goto(`http://localhost:5173/room/${room.code}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      // Check header visibility in lobby
      const headerVisible = await page.locator("header").isVisible().catch(() => false);

      // Check overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);

      const hasOverflow = scrollWidth > clientWidth || bodyScrollWidth > clientWidth;
      const overflowPx = Math.max(scrollWidth - clientWidth, bodyScrollWidth - clientWidth);

      // Test dynamic resize (portrait to landscape switch)
      let resizePassed = true;
      if (!vp.name.startsWith("Landscape")) {
        await page.setViewportSize({ width: vp.height, height: vp.width });
        await page.waitForTimeout(300);
        const postResizeScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const postResizeClientW = await page.evaluate(() => document.documentElement.clientWidth);
        if (postResizeScrollW > postResizeClientW) {
          resizePassed = false;
        }
        // Reset viewport back
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(200);
      }

      console.log(`[${game}][${vp.name}] scrollW: ${scrollWidth}, clientW: ${clientWidth} | Header: ${headerVisible ? "✅" : "⚠️"} | Resize: ${resizePassed ? "✅" : "❌"} -> ${hasOverflow ? `❌ OVERFLOW ${overflowPx}px` : "✅ PASS"}`);

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
        height: vp.height,
        hasOverflow,
        overflowPx,
        resizePassed,
        badElements,
      });

      await context.close();
    }
  }

  console.log("\n============================================");
  console.log("SUMMARY OF ROOM RESPONSIVENESS TEST RESULTS:");
  console.log("============================================");
  const failures = results.filter((r) => r.hasOverflow || !r.resizePassed);
  if (failures.length === 0) {
    console.log("🎉 ALL GAMES, VIEWPORTS & TRANSITIONS PASSED WITH ZERO REGRESSIONS!");
  } else {
    console.log(`⚠️ FOUND ${failures.length} FAILURES:`);
    for (const f of failures) {
      console.log(` - [${f.game}][${f.viewport} (${f.width}x${f.height})] overflow: ${f.overflowPx}px, resizeOk: ${f.resizePassed}`);
      if (f.badElements?.length) console.log(`   elements:`, f.badElements);
    }
    process.exit(1);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
