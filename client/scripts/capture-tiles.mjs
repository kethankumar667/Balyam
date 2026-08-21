import { chromium } from "playwright";
import path from "node:path";

const ARTIFACT_DIR = "C:/Users/GontlaKethanKumar/.gemini/antigravity/brain/1adb2f84-e9b0-493f-aa2f-9749bf3eb4e7";

async function run() {
  const browser = await chromium.launch({ headless: true });

  const setupConsent = async (page) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({
          choice: "granted",
          at: new Date().toISOString(),
          noticeVersion: 3,
        })
      );
    });
  };

  // 1. Desktop Full View (1440 x 900)
  const pageDesktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await setupConsent(pageDesktop);
  await pageDesktop.goto("http://localhost:5173/preview/tiles", { waitUntil: "networkidle" });
  await pageDesktop.waitForTimeout(1000);

  await pageDesktop.screenshot({
    path: path.join(ARTIFACT_DIR, "tiles_desktop_overview.png"),
    fullPage: true,
  });
  console.log("Captured desktop overview");
  await pageDesktop.close();

  // 2. Tablet View (1024 x 768)
  const pageTablet = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
  });
  await setupConsent(pageTablet);
  await pageTablet.goto("http://localhost:5173/preview/tiles", { waitUntil: "networkidle" });
  await pageTablet.waitForTimeout(1000);

  await pageTablet.screenshot({
    path: path.join(ARTIFACT_DIR, "tiles_tablet_overview.png"),
    fullPage: true,
  });
  console.log("Captured tablet overview");
  await pageTablet.close();

  // 3. Mobile View (390 x 844)
  const pageMobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await setupConsent(pageMobile);
  await pageMobile.goto("http://localhost:5173/preview/tiles", { waitUntil: "networkidle" });
  await pageMobile.waitForTimeout(1000);

  await pageMobile.screenshot({
    path: path.join(ARTIFACT_DIR, "tiles_mobile_view.png"),
    fullPage: true,
  });
  console.log("Captured mobile view");
  await pageMobile.close();

  await browser.close();
  console.log("All screenshots captured successfully without modal!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
