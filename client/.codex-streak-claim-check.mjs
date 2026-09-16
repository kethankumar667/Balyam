import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];
const results = [];

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => {
      localStorage.setItem("bhalyam.consent", JSON.stringify({
        choice: "granted",
        at: new Date().toISOString(),
        noticeVersion: 3,
      }));
      localStorage.setItem("bhalyam.onboarding.state", JSON.stringify({
        hasCompletedWelcome: true,
        completedMilestones: [],
      }));
    });
    await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
    await page.evaluate(async ({ selectedTheme }) => {
      document.documentElement.dataset.theme = selectedTheme;
      const { useStreakStore } = await import("/src/store/streakStore.ts");
      useStreakStore.setState({
        state: {
          playerId: "visual-check",
          currentStreak: 1,
          longestStreak: 4,
          cycleCount: 0,
          lastClaimedDate: null,
          lastClaimedAt: null,
          isClaimableToday: true,
          todayUtcDate: "2026-09-16",
          activeDayInCycle: 1,
          nextResetAt: Date.now() + 37_000_000,
          shieldsRemaining: 1,
          history: [],
          schedule: [],
        },
        isOpen: true,
        viewMode: "reward",
        isLoading: false,
        isClaiming: false,
        showCelebration: false,
        hasAutoOpenedInSession: true,
      });
    }, { selectedTheme: theme });
    const dialog = page.getByRole("dialog", { name: "Login Streak Reward" });
    await dialog.waitFor({ state: "visible" });
    await page.waitForTimeout(900);
    const metric = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const buttons = [...element.querySelectorAll("button")].map((button) => {
        const box = button.getBoundingClientRect();
        return { text: button.textContent?.trim().replace(/\s+/g, " "), width: box.width, height: box.height };
      });
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        buttons,
      };
    });
    results.push({ theme, viewport, bodyWidth: await page.evaluate(() => document.body.scrollWidth), ...metric });
    if (viewport.width === 375 || viewport.width === 1024) {
      await page.screenshot({ path: `.streak-claim-${theme}-${viewport.width}.png`, fullPage: true });
    }
    await page.close();
  }
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
