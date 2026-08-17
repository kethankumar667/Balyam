import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const viewports = [
    { name: "Mobile (375x667)", width: 375, height: 667 },
    { name: "Tablet (768x1024)", width: 768, height: 1024 },
    { name: "Desktop (1280x800)", width: 1280, height: 800 },
  ];

  console.log("Testing /about page across viewports...");

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:5173/about", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`[${vp.name}] Horizontal Overflow: ${overflow ? "FAIL" : "PASS"}`);
  }

  // Set consent in localStorage so modal doesn't block view
  await page.addInitScript(() => {
    localStorage.setItem("bhalyam.consent", JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }));
  });

  // Take desktop screenshot of main scroll container
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("http://localhost:5173/about", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  
  await page.screenshot({ path: "client/public/about-page-preview.png", fullPage: true });
  console.log("Saved full screenshot to client/public/about-page-preview.png");

  await browser.close();
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
