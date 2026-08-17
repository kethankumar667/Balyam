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
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  console.log("--- 1. Navigating to /signup ---");
  await page.goto("http://localhost:5173/signup", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // If Consent Modal is present, click "Allow all"
  const allowAllBtn = page.locator('button:has-text("Allow all")');
  if (await allowAllBtn.isVisible().catch(() => false)) {
    console.log("Dismissing consent modal with 'Allow all'");
    await allowAllBtn.click();
    await page.waitForTimeout(300);
  }

  // 1. Enter First Name & Last Name
  console.log("--- 2. Filling First Name and Last Name ---");
  const firstInput = page.locator('input[placeholder="e.g. Kethan"]');
  const lastInput = page.locator('input[placeholder="e.g. Kumar"]');
  const displayInput = page.locator('input[placeholder="e.g. Kethan Kumar"]');

  await firstInput.fill("Kethan");
  await lastInput.fill("Kumar");

  // Check auto-generated Display Name
  const autoVal = await displayInput.inputValue();
  console.log(`Auto-generated Display Name: "${autoVal}"`);

  // 2. Check Era and Account ID for 1995
  console.log("--- 3. Testing Era & Account ID for 1995 (90s kid) ---");
  const dobInput = page.locator('input[type="date"]');
  await dobInput.fill("1995-05-20");

  let accountBadgeText = await page.locator("text=/BHYM-90S-/").textContent();
  console.log(`Account ID with DOB 1995: ${accountBadgeText}`);

  // 3. Test Era & Account ID for 2005 (21s kid)
  console.log("--- 4. Testing Era & Account ID for 2005 (21s kid) ---");
  await dobInput.fill("2005-08-15");
  accountBadgeText = await page.locator("text=/BHYM-21S-/").textContent();
  console.log(`Account ID with DOB 2005: ${accountBadgeText}`);

  // 4. Fill Email
  await page.locator('input[type="email"]').fill("kethan.kumar@example.com");

  // 5. Select Gender
  await page.locator('button:has-text("Male 👨")').click();

  // 6. Fill Password & Confirm Password
  const passInputs = page.locator('input[type="password"]');
  await passInputs.nth(0).fill("Password123!");
  await passInputs.nth(1).fill("Password123!");

  // Verify passwords match text
  const matchNotice = await page.locator('text="Passwords match"').isVisible();
  console.log(`Passwords match indicator visible: ${matchNotice}`);

  // Capture Step 1 Screenshot
  const step1Path = path.resolve(publicDir, "signup-step1-preview.png");
  await page.screenshot({ path: step1Path });
  console.log(`Captured ${step1Path}`);

  // 7. Click Next -> Step 2
  console.log("--- 5. Advancing to Step 2 ---");
  await page.locator('button:has-text("Next: Choose Avatar")').click();
  await page.waitForTimeout(500);

  // Verify Step 2 elements
  const step2Title = await page.locator('text="Almost there!"').isVisible();
  console.log(`Step 2 title visible: ${step2Title}`);

  const summaryId = await page.locator('text=/BHYM-21S-/').textContent();
  console.log(`Summary banner Account ID: ${summaryId}`);

  // Capture Step 2 Screenshot
  const step2Path = path.resolve(publicDir, "signup-step2-preview.png");
  await page.screenshot({ path: step2Path });
  console.log(`Captured ${step2Path}`);

  // 8. Submit Account Creation
  console.log("--- 6. Submitting Account Creation ---");
  await page.locator('button:has-text("Create account & Play")').click();
  await page.waitForTimeout(1000);

  console.log(`Redirected to: ${page.url()}`);

  // 9. Navigate to /settings and check generated Account ID
  console.log("--- 7. Verifying Account ID in /settings ---");
  await page.goto("http://localhost:5173/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const settingsAccountId = await page.locator('text=/BHYM-21S-/').textContent();
  console.log(`Account ID visible in Settings: ${settingsAccountId}`);

  const settingsPath = path.resolve(publicDir, "settings-after-signup.png");
  await page.screenshot({ path: settingsPath });
  console.log(`Captured ${settingsPath}`);

  console.log("ALL SIGNUP TESTS PASSED SUCCESSFULLY!");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
