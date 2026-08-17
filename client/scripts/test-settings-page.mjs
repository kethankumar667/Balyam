import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: "mobile_375", width: 375, height: 667 },
    { name: "tablet_768", width: 768, height: 1024 },
    { name: "desktop_1280", width: 1280, height: 800 },
    { name: "desktop_1440", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto("http://localhost:5173/settings", { waitUntil: "networkidle" });

    // Seed consent
    await page.evaluate(() => {
      localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`[${vp.name}] Horizontal Overflow: ${overflow ? "FAIL" : "PASS"}`);

    if (vp.name === "desktop_1280") {
      await page.screenshot({ path: "client/public/settings-page-preview.png", fullPage: true });
      console.log("Captured client/public/settings-page-preview.png");
    }

    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
