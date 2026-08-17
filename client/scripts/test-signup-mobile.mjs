import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(rootDir, "public");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });

  const page = await context.newPage();
  await page.goto("http://localhost:5173/signup", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // If Consent Modal is present, click "Allow all"
  const allowAllBtn = page.locator('button:has-text("Allow all")');
  if (await allowAllBtn.isVisible().catch(() => false)) {
    await allowAllBtn.click();
    await page.waitForTimeout(300);
  }

  // Check horizontal overflow
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
  console.log(`Mobile (375px) scrollWidth: ${bodyScrollWidth}, clientWidth: ${bodyClientWidth}`);

  await page.screenshot({ path: path.resolve(publicDir, "signup-mobile-preview.png"), fullPage: true });
  console.log("Captured signup-mobile-preview.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
