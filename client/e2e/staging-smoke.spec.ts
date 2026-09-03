import { test, expect, request } from "playwright/test";
import { io as ioClient } from "socket.io-client";
import { loadE2EConfig } from "./support/env";

/**
 * BHALYAM staging smoke suite.
 *
 * Deployed-boundary checks only — the smallest set that proves a staging
 * deployment is actually reachable, actually the right code, and actually
 * wired together (frontend ↔ backend ↔ Socket.IO), without touching anything
 * that could mutate real state. See client/e2e/support/env.ts for the safety
 * contract that decides what this suite is allowed to point at.
 *
 * What this suite deliberately does NOT do:
 *  - No OPERATIONAL_SECRET anywhere (SMOKE-06 tests the DENIAL, not the console).
 *  - No completed match, no economy mutation (SMOKE-08 stops at "both clients
 *    see the same roster").
 *  - No assertion on the literal grievance email from source (SMOKE-07 uses a
 *    semantic mailto: check, per the "do not assert the literal address" rule).
 */

const { apiUrl } = loadE2EConfig();
const RUN_ID = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe("SMOKE-01: Backend health contract", () => {
  test("returns a healthy, well-shaped, secret-free payload", async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(new URL("/health", apiUrl).toString());
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Only fields the real implementation actually returns (server/src/index.ts's
    // /health handler) — never a field this suite merely hopes exists.
    expect(body.status).toBe("healthy");
    expect(typeof body.uptimeSec).toBe("number");
    expect(typeof body.activeRooms).toBe("number");
    expect(typeof body.socketCount).toBe("number");
    expect(body).toHaveProperty("progression");
    expect(body).toHaveProperty("economy");
    expect(body.economy).toHaveProperty("durable");
    // voucher durability status — added alongside the production fail-closed
    // guard; present here as a boolean/reason pair, never the secret itself.
    expect(body.economy).toHaveProperty("voucher");
    expect(typeof body.economy.voucher.durable).toBe("boolean");

    // Structural checks above already prove the only fields present are the
    // known-safe ones (status/uptime/counts/durability booleans+reasons). A
    // bare substring scan for "SECRET" would false-positive on the durability
    // reason text itself (e.g. "VOUCHER_HMAC_SECRET is not set..." legitimately
    // names the variable without ever revealing its value) — so this checks
    // for a value shaped like a credential, never a variable NAME.
    const raw = JSON.stringify(body);
    for (const forbidden of ["PASSWORD=", "PRIVATE_KEY", "-----BEGIN"]) {
      expect(raw).not.toContain(forbidden);
    }
    await ctx.dispose();
  });
});

test.describe("SMOKE-02: Frontend availability", () => {
  /**
   * React's minified hydration-failure errors, by their stable decoder URL
   * fragment rather than the (unstable across React versions) numeric code
   * alone — https://reactjs.org/docs/error-decoder.html?invariant=<N>.
   * #418 = "Hydration failed because the initial UI does not match..."
   * #423 = "...the entire root will switch to client rendering" — the
   * literal React-internal signal for the root-replacement this test exists
   * to catch. See client/src/animations/app/FallingPetals.tsx's own
   * regression-fix comment for the confirmed root cause this once caught.
   */
  const HYDRATION_ERROR_PATTERN = /invariant=41[0-9]|invariant=42[0-9]|Hydration failed|switch to client rendering/i;

  test("root document loads, hydrates deterministically, and the server-rendered root is never discarded", async ({
    page,
    request: apiRequest,
  }) => {
    const pageErrors: string[] = [];
    const hydrationConsoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      // Filtered to hydration-signal text specifically, not every
      // console.error — an unrelated warning must never fail this test,
      // and a real hydration error must never be filtered out.
      if (msg.type() === "error" && HYDRATION_ERROR_PATTERN.test(msg.text())) {
        hydrationConsoleErrors.push(msg.text());
      }
    });

    // Stable marker (Phase 9): the RAW server response — before any client
    // JS has run at all — already contains real rendered content inside
    // #root, not an empty mount point. This proves prerendering itself
    // produced real markup independent of what the browser does with it.
    const raw = await apiRequest.get(new URL("/", (await loadE2EConfig()).baseUrl).toString());
    expect(raw.status()).toBe(200);
    const rawHtml = await raw.text();
    const rootStart = rawHtml.indexOf('<div id="root">');
    expect(rootStart, 'raw server response must contain <div id="root">').toBeGreaterThanOrEqual(0);
    const afterRootTag = rawHtml.slice(rootStart + '<div id="root">'.length, rootStart + '<div id="root">'.length + 20);
    expect(
      afterRootTag.trimStart().startsWith("</div>"),
      `raw server response's #root must contain prerendered markup, not be empty — found: ${afterRootTag}`,
    ).toBe(false);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    // #root is the real mount point (see client/index.html / entry-client);
    // waiting for a child to exist proves React actually hydrated, not just
    // that the static shell arrived.
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 15_000 });

    expect(hydrationConsoleErrors, `Hydration-related console errors: ${hydrationConsoleErrors.join("; ")}`).toEqual(
      [],
    );
    expect(pageErrors, `Uncaught page errors: ${pageErrors.join("; ")}`).toEqual([]);
  });
});

test.describe("SMOKE-03: Prerender delivery", () => {
  // A representative sample, not the full 37-route catalog — this is a smoke
  // suite, not a full SEO regression run. Includes one canonical route, one
  // alias route (to prove the alias-prerendering fix from the 2026-09-03
  // configuration-hardening commit actually shipped), and the root.
  const routes = ["/", "/about", "/leaderboard", "/nokiacricket", "/cricket2d"];

  for (const route of routes) {
    test(`${route} serves route-specific prerendered HTML, not the homepage shell`, async ({ request: apiRequest }) => {
      const config = await loadE2EConfig();
      const requestPath = config.isLocal && route !== "/" ? `${route}/index.html` : route;
      const res = await apiRequest.get(new URL(requestPath, config.baseUrl).toString());
      expect(res.status()).toBe(200);
      const html = await res.text();

      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      expect(titleMatch, `${requestPath} response had no <title> tag`).not.toBeNull();

      const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
      expect(canonicalMatch, `${requestPath} response had no canonical link`).not.toBeNull();

      if (route !== "/") {
        // The homepage's own canonical always ends in "/" — a non-home route
        // whose canonical also ends in exactly "/" got the homepage's prerendered
        // shell instead of its own, which is precisely the class of bug this
        // check exists to catch.
        expect(canonicalMatch![1]).not.toMatch(/\/$/);
      }
    });
  }

  test("a dynamic route (e.g. /room/123456) falls back to the SPA shell", async ({ request: apiRequest }) => {
    const config = await loadE2EConfig();
    const requestPath = "/room/123456"; // Do not append index.html for dynamic routes locally, testing the fallback
    const res = await apiRequest.get(new URL(requestPath, config.baseUrl).toString());
    expect(res.status()).toBe(200);
    const html = await res.text();
    
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    // The SPA shell's canonical link points to the homepage (ending in "/")
    if (canonicalMatch) {
      expect(canonicalMatch[1]).toMatch(/\/$/);
    }
  });
});

test.describe("SMOKE-04: Socket.IO WebSocket handshake", () => {
  test("connects over websocket transport and disconnects cleanly", async () => {
    const socket = ioClient(apiUrl.toString(), {
      transports: ["websocket"],
      reconnection: false,
      timeout: 10_000,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("websocket connect timed out")), 12_000);
        socket.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.once("connect_error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      expect(socket.connected).toBe(true);
      expect(socket.io.engine.transport.name).toBe("websocket");
    } finally {
      socket.disconnect();
    }
  });
});

test.describe("SMOKE-05: Socket.IO polling and CORS", () => {
  test("connects over polling transport from the configured frontend origin", async () => {
    const { baseUrl } = await loadE2EConfig();
    const socket = ioClient(apiUrl.toString(), {
      transports: ["polling"],
      reconnection: false,
      timeout: 10_000,
      extraHeaders: { Origin: baseUrl.origin },
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("polling connect timed out")), 12_000);
        socket.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });
        socket.once("connect_error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }
  });
});

test.describe("SMOKE-06: Unauthorized operational denial", () => {
  test("an operational endpoint refuses an unauthenticated request", async () => {
    const ctx = await request.newContext();
    // No Authorization header, no x-operational-key — deliberately. This test
    // proves the DENIAL, and must never itself hold OPERATIONAL_SECRET.
    const res = await ctx.get(new URL("/api/operational/rooms", apiUrl).toString());
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    await ctx.dispose();
  });
});

test.describe("SMOKE-07: Privacy contact rendering", () => {
  test("the privacy page renders a real mailto link, not the unconfigured fallback", async ({ page }) => {
    await page.goto("/privacy", { waitUntil: "domcontentloaded" });

    // The consent banner overlays the page on a fresh context; dismiss it so
    // the visibility check below reflects the actual privacy content, not an
    // occluded-but-technically-in-DOM element.
    const allowAll = page.getByRole("button", { name: /allow all/i });
    if (await allowAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await allowAll.click();
    }

    const unconfiguredFallback = page.getByText(/privacy contact email address has not been configured yet/i);
    await expect(unconfiguredFallback).toHaveCount(0);

    // Semantic check only — never assert the literal address from source.
    const mailLink = page.locator('a[href^="mailto:"]').first();
    await expect(mailLink).toBeVisible();
    const href = await mailLink.getAttribute("href");
    expect(href).toMatch(/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/);
  });
});

test.describe("SMOKE-08: Two-context create and join", () => {
  /**
   * Selectors below were verified against a real local build (`vite preview`
   * + real backend), not guessed from source — see the 2026-09-03
   * configuration-hardening session notes. Real, load-bearing details that
   * are easy to get wrong:
   *  - The consent banner ("Allow all" / "Only what's essential") blocks all
   *    interaction until dismissed, on EVERY fresh browser context.
   *  - Each game tile's Play button's ACCESSIBLE NAME is "Play <Game Name>"
   *    even though its visible text is just "Play Now" — getByRole with the
   *    full accessible name is required, a text-content match on the tile
   *    is not enough.
   *  - "Your name" must be filled before "Create Room" — creation appeared
   *    to hang indefinitely without it during discovery, not merely reject.
   *
   * ── Economy safety boundary ──────────────────────────────────────────
   * Rock Paper Scissors has a real coin prize pool ("Table prize pool is currently
   * 100 coins..." — confirmed in the room UI). Per this codebase's own
   * settlement architecture (verified independently this session), the
   * economy entry fee is committed at MATCH START (`requestGameStart` →
   * `commit_match_entry`), never at room creation. This test stops the
   * instant both names are visible in the roster — it never readies up,
   * never starts a match — so no economy mutation is reachable from here.
   */
  async function dismissConsent(page: import("playwright/test").Page): Promise<void> {
    const allowAll = page.getByRole("button", { name: /allow all/i });
    if (await allowAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await allowAll.click();
    }
  }

  test("a host creates a room and a joiner joins it by code; both see the same roster", async ({ browser }) => {
    // Two real contexts, two real room-creation/join round trips (including
    // an economy checkout-quote call on the host side) — genuinely slower
    // than a single-page check. 60s, not the 30s default.
    test.setTimeout(60_000);
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();
    const hostName = `SmokeHost-${RUN_ID.slice(-6)}`;
    const joinerName = `SmokeJoin-${RUN_ID.slice(-6)}`;

    try {
      const hostPage = await hostContext.newPage();
      const joinerPage = await joinerContext.newPage();

      await hostPage.goto("/games", { waitUntil: "domcontentloaded" });
      await dismissConsent(hostPage);
      await hostPage.getByRole("button", { name: "Play Rock Paper Scissors" }).click();
      await hostPage.getByLabel(/your name/i).fill(hostName);
      await hostPage.getByRole("button", { name: /create room/i }).click();

      await hostPage.waitForURL(/\/room\/[A-Za-z0-9_-]{6}/, { timeout: 20_000 });
      const roomCode = new URL(hostPage.url()).pathname.split("/").pop()!;
      expect(roomCode).toMatch(/^[A-Za-z0-9_-]{6}$/);

      await joinerPage.goto("/games", { waitUntil: "domcontentloaded" });
      await dismissConsent(joinerPage);
      await joinerPage.getByRole("button", { name: "Play Rock Paper Scissors" }).click();
      await joinerPage.getByLabel(/your name/i).fill(joinerName);
      await joinerPage.getByLabel(/room code/i).fill(roomCode);
      await joinerPage.getByRole("button", { name: /join room/i }).click();

      await joinerPage.waitForURL(new RegExp(`/room/${roomCode}$`), { timeout: 20_000 });

      // Both clients converged on the same room, and each observably sees
      // BOTH players' names — real, semantic roster evidence, not a guessed
      // numeric counter format. No move is made, no match starts (see the
      // economy safety boundary above).
      await expect(hostPage.getByText(hostName)).toBeVisible({ timeout: 15_000 });
      await expect(hostPage.getByText(joinerName)).toBeVisible({ timeout: 15_000 });
      await expect(joinerPage.getByText(hostName)).toBeVisible({ timeout: 15_000 });
      await expect(joinerPage.getByText(joinerName)).toBeVisible({ timeout: 15_000 });

      test.info().annotations.push({ type: "run-id", description: RUN_ID });
    } finally {
      await hostContext.close();
      await joinerContext.close();
    }
  });
});
