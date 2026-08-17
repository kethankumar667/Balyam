import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Test Guest Flow
  console.log("\n--- Testing Guest Player ---");
  const guestPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await guestPage.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  
  // Ensure cleared account (Guest mode)
  await guestPage.evaluate(() => {
    localStorage.removeItem("bhalyam.account");
    localStorage.removeItem("bhalyam.session");
  });
  await guestPage.reload({ waitUntil: "networkidle" });

  const guestSettingsHeader = await guestPage.$("a[href='/settings']");
  console.log(`[Guest] Settings icon in header: ${guestSettingsHeader ? "VISIBLE (FAIL)" : "HIDDEN (PASS)"}`);

  const guestSettingsNav = await guestPage.$("a[href='/settings']");
  console.log(`[Guest] Settings in sidebar: ${guestSettingsNav ? "VISIBLE (FAIL)" : "HIDDEN (PASS)"}`);

  // Attempt direct navigation to /settings
  await guestPage.goto("http://localhost:5173/settings", { waitUntil: "networkidle" });
  await guestPage.waitForTimeout(500);
  const currentUrl = guestPage.url();
  console.log(`[Guest] Navigating to /settings redirects to: ${currentUrl} (${currentUrl.endsWith("/") ? "PASS" : "FAIL"})`);
  await guestPage.close();

  // 2. Test Member Flow
  console.log("\n--- Testing Registered Member ---");
  const memberPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await memberPage.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  // Seed Member account
  await memberPage.evaluate(() => {
    // If running in local mock mode:
    localStorage.setItem(
      "bhalyam.account",
      JSON.stringify({ kind: "member", email: "jetpacker90s@gmail.com", since: Date.now() })
    );
  });
  await memberPage.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await memberPage.evaluate(() => {
    // Ensure state is member
    const win = window;
    if (win.__authStore) {
      win.__authStore.setState({ kind: "member", isMember: true, email: "jetpacker90s@gmail.com" });
    }
  });

  const memberSettingsHeader = await memberPage.$("a[href='/settings']");
  console.log(`[Member] Settings icon in header: ${memberSettingsHeader ? "VISIBLE (PASS)" : "HIDDEN (FAIL)"}`);

  if (memberSettingsHeader) {
    await memberPage.click("a[href='/settings']");
    await memberPage.waitForTimeout(500);
    const memberUrl = memberPage.url();
    console.log(`[Member] Navigating to /settings opens: ${memberUrl} (${memberUrl.includes("/settings") ? "PASS" : "FAIL"})`);
  }
  await memberPage.close();

  await browser.close();
}

main().catch(console.error);
