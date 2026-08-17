#!/usr/bin/env node
import { chromium } from "playwright";
import { io } from "socket.io-client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TIER_1_PROFILES,
  TIER_2_PROFILES,
  ALL_DEVICE_PROFILES,
  LANDSCAPE_PROFILES,
} from "./devices.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const publicDir = path.resolve(rootDir, "public");
const reportsDir = path.resolve(rootDir, "reports");

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  if (args.includes(`--${name}`)) return true;
  return defaultValue;
}

const tierArg = getArg("tier", "1");
const gameArg = getArg("game", "ludo");
const modeArg = getArg("mode", "all"); // lobby | inplay | all
const landscapeArg = getArg("landscape", "include"); // include | exclude | only
const takeScreenshots = getArg("screenshot", "false") === "true";
const serverPort = getArg("port", "4000");

// Select Device Profiles based on Tier & Landscape settings
let selectedProfiles = [];
if (tierArg === "1") {
  selectedProfiles = TIER_1_PROFILES;
} else if (tierArg === "2") {
  selectedProfiles = TIER_2_PROFILES;
} else {
  selectedProfiles = ALL_DEVICE_PROFILES;
}

if (landscapeArg === "only") {
  selectedProfiles = LANDSCAPE_PROFILES;
} else if (landscapeArg === "exclude") {
  selectedProfiles = selectedProfiles.filter((p) => !p.isLandscape);
}

// Deduplicate profiles by name
const uniqueProfiles = [];
const seenNames = new Set();
for (const p of selectedProfiles) {
  if (!seenNames.has(p.name)) {
    seenNames.add(p.name);
    uniqueProfiles.push(p);
  }
}

// Select Games
const ALL_GAMES = ["ludo", "snl", "rummy", "uno", "handcricket", "rps", "dotsboxes", "wordbuilding"];
const gamesToTest = gameArg === "all" ? ALL_GAMES : [gameArg];

console.log(`\n============================================================`);
console.log(`🎮 BHALYAM PRODUCTION-GRADE RESPONSIVE & DEVICE TEST MATRIX`);
console.log(`============================================================`);
console.log(`• Tier:            ${tierArg.toUpperCase()} (${uniqueProfiles.length} device profiles)`);
console.log(`• Target Games:    ${gamesToTest.join(", ")}`);
console.log(`• Mode:            ${modeArg.toUpperCase()}`);
console.log(`• Landscape mode:  ${landscapeArg}`);
console.log(`• Screenshots:     ${takeScreenshots ? "Enabled" : "Disabled"}`);
console.log(`• Total test runs: ${uniqueProfiles.length * gamesToTest.length * (modeArg === "all" ? 2 : 1)}`);
console.log(`============================================================\n`);

/** Create room via Socket.IO directly on the server */
function createRoomOnServer(game, shouldStart = false) {
  return new Promise((resolve, reject) => {
    const socket = io(`http://localhost:${serverPort}`, { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit(
        "room:create",
        {
          name: "MatrixTester",
          game,
          hostKind: "member",
        },
        (res) => {
          if (!res || !res.ok || !res.code) {
            socket.disconnect();
            return reject(new Error(res?.error || "Room create failed"));
          }
          const { code, seatToken, playerId } = res;

          if (!shouldStart) {
            socket.disconnect();
            return resolve({ code, seatToken, playerId });
          }

          // Add a bot, ready up, and start
          socket.emit("room:bot:add", { name: "BotMatrix", difficulty: "medium" }, () => {
            socket.emit("room:ready", { isReady: true }, () => {
              socket.emit("room:start", () => {
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
  let totalPassed = 0;
  let totalFailed = 0;

  for (const game of gamesToTest) {
    console.log(`\n▶ TESTING GAME: [${game.toUpperCase()}]`);

    const modes = modeArg === "all" ? ["lobby", "inplay"] : [modeArg];

    for (const mode of modes) {
      const isPlay = mode === "inplay";
      let room;
      try {
        room = await createRoomOnServer(game, isPlay);
      } catch (err) {
        console.error(`  ❌ Failed to create ${mode} room for ${game}: ${err.message}`);
        continue;
      }

      console.log(`  Phase: ${mode.toUpperCase()} (Room Code: ${room.code})`);

      for (const device of uniqueProfiles) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.deviceScaleFactor || 2,
          isMobile: device.isMobile ?? true,
          hasTouch: device.hasTouch ?? true,
          userAgent:
            device.userAgent ||
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        });

        await context.addInitScript(
          ({ code, seatToken }) => {
            localStorage.setItem(
              "bhalyam.consent",
              JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
            );
            localStorage.setItem(
              "bhalyam.account",
              JSON.stringify({ kind: "member", email: "tester@bhalyam.com", since: Date.now() })
            );
            localStorage.setItem("mpg.name", "MatrixTester");
            const seats = JSON.parse(localStorage.getItem("mpg.seats") || "{}");
            seats[code] = seatToken;
            localStorage.setItem("mpg.seats", JSON.stringify(seats));
          },
          { code: room.code, seatToken: room.seatToken }
        );

        const page = await context.newPage();
        await page.goto(`http://localhost:5173/room/${room.code}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(600);

        // Perform Comprehensive Health & Responsiveness Checks
        const checkResult = await page.evaluate((dev) => {
          const docW = document.documentElement.clientWidth;
          const docH = document.documentElement.clientHeight;
          const docScrollW = document.documentElement.scrollWidth;
          const bodyScrollW = document.body.scrollWidth;

          // 1. Check Horizontal Overflow
          const hasHorizontalOverflow = docScrollW > docW + 1 || bodyScrollW > docW + 1;
          const overflowPx = Math.max(0, docScrollW - docW, bodyScrollW - docW);

          // Find specific elements causing overflow
          const overflowingElements = [];
          if (hasHorizontalOverflow) {
            document.querySelectorAll("*").forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.right > docW + 1) {
                overflowingElements.push({
                  tag: el.tagName,
                  class: (el.className || "").toString().slice(0, 50),
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                  text: (el.textContent || "").trim().slice(0, 25),
                });
              }
            });
          }

          // 2. Touch Target & Accessibility Audit
          const interactiveElements = Array.from(
            document.querySelectorAll("button, a, input, select, [role='button']")
          );
          const touchTargetIssues = [];
          for (const el of interactiveElements) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) {
              // Ignore small inline icons or badges inside labeled containers
              if (!el.closest("button, a")) {
                touchTargetIssues.push({
                  tag: el.tagName,
                  width: Math.round(r.width),
                  height: Math.round(r.height),
                  text: (el.textContent || "").trim().slice(0, 20),
                });
              }
            }
          }

          // 3. Primary Controls In Viewport Check
          const leaveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Leave'));
          const leaveVisible = leaveBtn ? leaveBtn.getBoundingClientRect().top < docH + 200 : true;

          return {
            docW,
            docH,
            docScrollW,
            hasHorizontalOverflow,
            overflowPx,
            overflowingElements: overflowingElements.slice(0, 5),
            touchTargetIssues: touchTargetIssues.slice(0, 3),
            leaveVisible,
          };
        }, device);

        const isPass = !checkResult.hasHorizontalOverflow;
        if (isPass) {
          totalPassed++;
          console.log(
            `    ✅ [${device.name.padEnd(28)}] (${device.width}x${device.height}) DPR:${device.deviceScaleFactor || 2} -> PASS`
          );
        } else {
          totalFailed++;
          console.warn(
            `    🚨 [${device.name.padEnd(28)}] (${device.width}x${device.height}) OVERFLOW: +${checkResult.overflowPx}px`
          );
          if (checkResult.overflowingElements.length > 0) {
            console.log(`       Elements:`, checkResult.overflowingElements);
          }
        }

        if (takeScreenshots) {
          const snapDir = path.resolve(publicDir, "matrix-screenshots");
          if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });
          const snapFile = path.resolve(snapDir, `${game}-${mode}-${device.name}.png`);
          await page.screenshot({ path: snapFile });
        }

        results.push({
          game,
          mode,
          device: device.name,
          category: device.category,
          width: device.width,
          height: device.height,
          dpr: device.deviceScaleFactor || 2,
          isLandscape: device.isLandscape || false,
          passed: isPass,
          overflowPx: checkResult.overflowPx,
          details: checkResult,
        });

        await context.close();
      }
    }
  }

  // Generate Reports
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.resolve(reportsDir, "responsive-matrix-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        tier: tierArg,
        totalRuns: results.length,
        totalPassed,
        totalFailed,
        results,
      },
      null,
      2
    )
  );

  console.log(`\n============================================================`);
  console.log(`📊 TEST MATRIX RESULTS SUMMARY`);
  console.log(`============================================================`);
  console.log(`• Total Device Runs: ${results.length}`);
  console.log(`• Passed:             ${totalPassed} ✅`);
  console.log(`• Failed:             ${totalFailed} ${totalFailed > 0 ? "❌" : ""}`);
  console.log(`• Report saved to:   ${reportPath}`);
  console.log(`============================================================\n`);

  await browser.close();

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test Matrix Execution Error:", err);
  process.exit(1);
});
