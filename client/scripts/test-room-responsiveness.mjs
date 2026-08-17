import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

const VIEWPORTS = [
  { name: "iPhone_SE_375", width: 375, height: 667 },
  { name: "Galaxy_S20_360", width: 360, height: 740 },
  { name: "iPhone_14_Pro_393", width: 393, height: 852 },
  { name: "Pixel_7_412", width: 412, height: 915 },
  { name: "iPad_Mini_768", width: 768, height: 1024 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
    });

    // Dismiss consent & set member account
    await context.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 })
      );
      localStorage.setItem(
        "bhalyam.account",
        JSON.stringify({ kind: "member", email: "tester@bhalyam.com", since: Date.now() })
      );
      localStorage.setItem("mpg.name", "Tester");
    });

    const page = await context.newPage();
    
    // Create a room first or navigate to home
    console.log(`\n=== Testing ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click on a game tile, e.g. Rps or Ludo or Rummy to create a room
    const ludoTile = page.locator('text="Ludo"').first();
    if (await ludoTile.isVisible()) {
      await ludoTile.click();
      await page.waitForTimeout(400);

      // In game room sheet, click "Host Room" / "Create Room"
      const createBtn = page.locator('button:has-text("Create Room"), button:has-text("Host Room"), button:has-text("Host Table")');
      if (await createBtn.isVisible()) {
        await createBtn.first().click();
        await page.waitForTimeout(1000);
      }
    }

    console.log(`Current URL: ${page.url()}`);

    // Check for horizontal overflow
    const overflowElements = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const elements = Array.from(document.querySelectorAll("*"));
      const overflowing = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1) {
          overflowing.push({
            tag: el.tagName,
            id: el.id,
            className: el.className,
            right: rect.right,
            docWidth,
            text: (el.textContent || "").slice(0, 30),
          });
        }
      }
      return overflowing.slice(0, 10);
    });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    console.log(`[${vp.name}] scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);
    if (scrollWidth > clientWidth) {
      console.warn(`⚠️ HORIZONTAL OVERFLOW DETECTED ON ${vp.name}! Diff: ${scrollWidth - clientWidth}px`);
      console.log("Overflow elements:", overflowElements);
    } else {
      console.log(`✅ NO OVERFLOW on ${vp.name}`);
    }

    const snapPath = path.resolve(publicDir, `room-mobile-${vp.name}.png`);
    await page.screenshot({ path: snapPath, fullPage: true });
    console.log(`Saved screenshot to ${snapPath}`);

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
