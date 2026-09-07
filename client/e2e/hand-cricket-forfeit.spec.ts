import { test, expect } from "playwright/test";
import { loadE2EConfig } from "./support/env";

/**
 * Hand Cricket — intentional-leave forfeit scenario.
 *
 * NOT part of the SMOKE-* suite in staging-smoke.spec.ts on purpose: that
 * suite has a deliberate, documented rule to never start a real match or
 * touch the economy (see its own SMOKE-08 comment, "no move is made, no
 * match starts"). This spec exists specifically to test what happens
 * AFTER a match starts, which necessarily crosses that boundary — keep it
 * in its own file so it is never mistaken for part of the safe smoke set.
 *
 * Known, confirmed environment limit (not a bug this test is meant to
 * catch): starting a REAL match between two human players requires the
 * HOST to be a signed-in member — RoomManager.ts's own
 * `checkHostEconomyEligibility` unconditionally refuses a guest host with
 * another human present ("Only a signed-in account can host matches with
 * other players"). Two guest browser contexts, as used here, can prove
 * every step up to and including that refusal, but cannot get further
 * without a real signed-in test account — this spec documents exactly
 * where that boundary is, rather than silently stopping or fabricating a
 * pass past it.
 */

const { baseUrl } = loadE2EConfig();
void baseUrl; // loadE2EConfig() also enforces the safety contract (local-only unless explicitly allowed) as an import-time side effect.

const RUN_ID = `hc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe("Hand Cricket: intentional leave mid-match", () => {
  test("two guests reach a real lobby together; starting is refused because neither is a signed-in member", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const aContext = await browser.newContext();
    const bContext = await browser.newContext();

    const consentScript = () => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
    };
    await aContext.addInitScript(consentScript);
    await bContext.addInitScript(consentScript);

    const nameA = `HcA-${RUN_ID.slice(-6)}`;
    const nameB = `HcB-${RUN_ID.slice(-6)}`;

    try {
      const pageA = await aContext.newPage();
      const pageB = await bContext.newPage();

      // A creates the Hand Cricket room.
      await pageA.goto("/games", { waitUntil: "domcontentloaded" });
      const aPlayBtn = pageA.getByRole("button", { name: "Play Hand Cricket" });
      await expect(aPlayBtn).toBeVisible({ timeout: 15_000 });
      await aPlayBtn.click();

      const aNameInput = pageA.getByLabel(/your name/i);
      await expect(aNameInput).toBeVisible({ timeout: 10_000 });
      await aNameInput.fill(nameA);
      await pageA.getByRole("button", { name: /create room/i }).click();

      await pageA.waitForURL(/\/room\/[A-Za-z0-9_-]{6}/, { timeout: 20_000 });
      const roomCode = new URL(pageA.url()).pathname.split("/").pop()!;
      expect(roomCode).toMatch(/^[A-Za-z0-9_-]{6}$/);

      // B joins by code.
      await pageB.goto("/games", { waitUntil: "domcontentloaded" });
      const bPlayBtn = pageB.getByRole("button", { name: "Play Hand Cricket" });
      await expect(bPlayBtn).toBeVisible({ timeout: 15_000 });
      await bPlayBtn.click();

      const bNameInput = pageB.getByLabel(/your name/i);
      await expect(bNameInput).toBeVisible({ timeout: 10_000 });
      await bNameInput.fill(nameB);
      await pageB.getByLabel(/room code/i).fill(roomCode);
      await pageB.getByRole("button", { name: /join room/i }).click();

      await pageB.waitForURL(new RegExp(`/room/${roomCode}$`), { timeout: 20_000 });

      // Both clients see the real, converged roster — proves the room and
      // socket layer work correctly for this game before we touch the
      // economy-gated Start step at all.
      await expect(pageA.getByText(nameA)).toBeVisible({ timeout: 15_000 });
      await expect(pageA.getByText(nameB)).toBeVisible({ timeout: 15_000 });
      await expect(pageB.getByText(nameA)).toBeVisible({ timeout: 15_000 });
      await expect(pageB.getByText(nameB)).toBeVisible({ timeout: 15_000 });

      // Both mark ready.
      await pageA.getByRole("button", { name: /I.m Ready/i }).click();
      await pageB.getByRole("button", { name: /I.m Ready/i }).click();
      await expect(pageA.getByRole("button", { name: /Ready \(Cancel\)/i })).toBeVisible({ timeout: 10_000 });
      await expect(pageB.getByRole("button", { name: /Ready \(Cancel\)/i })).toBeVisible({ timeout: 10_000 });

      // Host attempts Start Game. Two guests cannot legitimately start a
      // real match together (RoomManager.checkHostEconomyEligibility) —
      // this is the documented, correct refusal, not a bug.
      const startBtn = pageA.getByRole("button", { name: /Start Game/i });
      await expect(startBtn).toBeVisible({ timeout: 10_000 });
      await startBtn.click();

      // The refusal text appears twice by design (the visible error banner
      // plus a screen-reader-only aria-live announcement) — scope to the
      // visible banner specifically to avoid a strict-mode ambiguity.
      const refusal = pageA
        .getByText(/only a signed-in account can host matches with other players/i)
        .and(pageA.locator(":not(.sr-only)"));
      await expect(refusal).toBeVisible({ timeout: 10_000 });

      test.info().annotations.push({
        type: "boundary",
        description:
          "Reached the confirmed guest-host refusal. Testing the actual leave-mid-match forfeit " +
          "(A leaves, B is declared winner) requires a signed-in member test account, which this " +
          "environment does not have configured — see this file's own header comment.",
      });
      test.info().annotations.push({ type: "run-id", description: RUN_ID });
    } finally {
      await aContext.close();
      await bContext.close();
    }
  });
});
