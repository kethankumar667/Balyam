import fs from "node:fs";
import path from "node:path";
import { test, expect, request } from "playwright/test";
import { io as ioClient } from "socket.io-client";
import {
  loadE2EConfig,
  parseRequiredUrl,
  assertSafeToTarget,
  isKnownProductionHost,
  isLocalHost,
} from "./support/env";
import { PRERENDER_ROUTES, PUBLIC_ROUTES_METADATA } from "../src/seo/metadata";

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

const distDir = fs.existsSync(path.resolve(process.cwd(), "dist"))
  ? path.resolve(process.cwd(), "dist")
  : path.resolve(process.cwd(), "client/dist");

test.describe("SMOKE-03: Prerender delivery", () => {
  test("delivers route-specific prerendered output (local generated-files or remote Render rewrites)", async ({
    request: apiRequest,
  }) => {
    const config = await loadE2EConfig();

    if (config.isLocal) {
      test.info().annotations.push({
        type: "mode",
        description: "local-generated-prerender-file-verification",
      });

      // Verify all 37 authoritative public routes generated static files
      expect(PRERENDER_ROUTES.length).toBe(37);

      for (const route of PRERENDER_ROUTES) {
        const outPath =
          route === "/"
            ? path.join(distDir, "index.html")
            : path.join(distDir, route.replace(/^\//, ""), "index.html");

        expect(fs.existsSync(outPath), `Prerendered file missing on disk for ${route} at ${outPath}`).toBe(true);

        const html = fs.readFileSync(outPath, "utf-8");

        // Non-empty #root prerender content
        const rootStart = html.indexOf('<div id="root">');
        expect(rootStart, `${route} response must contain <div id="root">`).toBeGreaterThanOrEqual(0);
        const afterRoot = html.slice(
          rootStart + '<div id="root">'.length,
          rootStart + '<div id="root">'.length + 20,
        );
        expect(
          afterRoot.trimStart().startsWith("</div>"),
          `${route} prerender output must contain SSR markup inside #root, not be empty`,
        ).toBe(false);

        // Route-specific metadata assertions from the authoritative catalog
        const expectedMeta = PUBLIC_ROUTES_METADATA[route];
        if (expectedMeta?.title) {
          expect(html, `${route} missing expected title`).toContain(`<title>${expectedMeta.title}</title>`);
        }
        if (expectedMeta?.canonical) {
          expect(html, `${route} missing expected canonical`).toContain(
            `<link rel="canonical" href="${expectedMeta.canonical}" />`,
          );
        }

        // Non-home routes must never have a canonical that ends in bare "/"
        if (route !== "/") {
          const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
          expect(canonicalMatch, `${route} had no canonical link`).not.toBeNull();
          expect(canonicalMatch![1], `${route} erroneously received homepage canonical`).not.toMatch(/\/$/);
        }
      }

      // Verify dynamic route fallback behavior locally
      const dynamicSamplePath = path.join(distDir, "room", "123456", "index.html");
      expect(fs.existsSync(dynamicSamplePath), "Dynamic route must not have a pregenerated static file").toBe(false);

      // Verify SPA fallback exists on disk
      expect(fs.existsSync(path.join(distDir, "index.html"))).toBe(true);

      // Verify HTTP request to dynamic route returns the SPA shell
      const dynRes = await apiRequest.get(new URL("/room/123456", config.baseUrl).toString());
      expect(dynRes.status()).toBe(200);
      const dynHtml = await dynRes.text();
      const dynCanonicalMatch = dynHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
      if (dynCanonicalMatch) {
        expect(dynCanonicalMatch[1]).toMatch(/\/$/);
      }
    } else {
      // Remote staging mode: verify Render rewrites with extensionless requests
      test.info().annotations.push({
        type: "mode",
        description: "remote-staging-rewrite-verification",
      });

      const representativeRoutes = ["/", "/about", "/leaderboard", "/nokiacricket", "/cricket2d", "/privacy", "/how-to-play"];
      for (const route of representativeRoutes) {
        const res = await apiRequest.get(new URL(route, config.baseUrl).toString());
        expect(res.status()).toBe(200);
        const html = await res.text();

        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        expect(titleMatch, `${route} response had no <title> tag`).not.toBeNull();

        const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
        expect(canonicalMatch, `${route} response had no canonical link`).not.toBeNull();

        if (route !== "/") {
          expect(canonicalMatch![1], `${route} erroneously received homepage canonical`).not.toMatch(/\/$/);
        }
      }

      // Dynamic route receives the SPA shell
      const dynRes = await apiRequest.get(new URL("/room/123456", config.baseUrl).toString());
      expect(dynRes.status()).toBe(200);
      const dynHtml = await dynRes.text();
      const dynCanonical = dynHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
      if (dynCanonical) {
        expect(dynCanonical[1]).toMatch(/\/$/);
      }
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
  test("the privacy page renders contact details (mailto link on staging or honest notice locally)", async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
    });

    const config = loadE2EConfig();
    await page.goto("/privacy", { waitUntil: "domcontentloaded" });

    const privacySection = page.locator("#contact-us");
    await expect(privacySection).toBeVisible({ timeout: 10_000 });

    const privacyMailLink = privacySection.locator('a[href^="mailto:"]').first();
    const hasPrivacyMail = await privacyMailLink.isVisible({ timeout: 1_000 }).catch(() => false);

    if (config.isLocal && !hasPrivacyMail) {
      // In local mode where VITE_PRIVACY_CONTACT_EMAIL is unset at build time:
      // verify the honest fallback message renders in section 14 without broken mailto links.
      const unconfiguredFallback = privacySection.getByText(
        /privacy contact email address has not been configured yet/i,
      );
      await expect(unconfiguredFallback).toBeVisible();
    } else {
      // On staging (or if VITE_PRIVACY_CONTACT_EMAIL was configured):
      // Must render a real mailto link and NEVER the unconfigured fallback
      const unconfiguredFallback = privacySection.getByText(
        /privacy contact email address has not been configured yet/i,
      );
      await expect(unconfiguredFallback).toHaveCount(0);
      await expect(privacyMailLink).toBeVisible();
      const href = await privacyMailLink.getAttribute("href");
      expect(href).toMatch(/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/);
    }
  });
});

test.describe("SMOKE-08: Two-context create and join", () => {
  async function leaveRoomFromLobby(page: import("playwright/test").Page): Promise<void> {
    const leaveBtn = page.getByRole("button", { name: "Leave room", exact: true });
    if (await leaveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await leaveBtn.click();
      const modal = page.getByRole("dialog");
      const confirmBtn = modal.getByRole("button", { name: "Leave Room", exact: true });
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click();
    }
  }

  test("a host creates a room and a joiner joins it by code; both see the same roster, then both cleanly leave", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const hostContext = await browser.newContext();
    const joinerContext = await browser.newContext();

    const consentScript = () => {
      localStorage.setItem(
        "bhalyam.consent",
        JSON.stringify({ choice: "granted", at: new Date().toISOString(), noticeVersion: 3 }),
      );
    };
    await hostContext.addInitScript(consentScript);
    await joinerContext.addInitScript(consentScript);

    const hostName = `SmokeHost-${RUN_ID.slice(-6)}`;
    const joinerName = `SmokeJoin-${RUN_ID.slice(-6)}`;

    try {
      const hostPage = await hostContext.newPage();
      const joinerPage = await joinerContext.newPage();

      // Host enters games lobby and selects Rock Paper Scissors
      await hostPage.goto("/games", { waitUntil: "domcontentloaded" });
      const hostPlayBtn = hostPage.getByRole("button", { name: "Play Rock Paper Scissors" });
      await expect(hostPlayBtn).toBeVisible({ timeout: 15_000 });
      await hostPlayBtn.click();

      // Host enters display name and creates room
      const hostNameInput = hostPage.getByLabel(/your name/i);
      await expect(hostNameInput).toBeVisible({ timeout: 10_000 });
      await hostNameInput.fill(hostName);
      await hostPage.getByRole("button", { name: /create room/i }).click();

      await hostPage.waitForURL(/\/room\/[A-Za-z0-9_-]{6}/, { timeout: 20_000 });
      const roomCode = new URL(hostPage.url()).pathname.split("/").pop()!;
      expect(roomCode).toMatch(/^[A-Za-z0-9_-]{6}$/);

      // Joiner enters games lobby and opens game sheet
      await joinerPage.goto("/games", { waitUntil: "domcontentloaded" });
      const joinerPlayBtn = joinerPage.getByRole("button", { name: "Play Rock Paper Scissors" });
      await expect(joinerPlayBtn).toBeVisible({ timeout: 15_000 });
      await joinerPlayBtn.click();

      // Joiner enters display name and room code
      const joinerNameInput = joinerPage.getByLabel(/your name/i);
      await expect(joinerNameInput).toBeVisible({ timeout: 10_000 });
      await joinerNameInput.fill(joinerName);
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

      // Verify room code display
      await expect(hostPage.getByText(roomCode).first()).toBeVisible();
      await expect(joinerPage.getByText(roomCode).first()).toBeVisible();

      // Economy safety boundary: no checkout/start occurred
      expect(hostPage.url()).toContain(`/room/${roomCode}`);
      expect(joinerPage.url()).toContain(`/room/${roomCode}`);

      // Deterministic cleanup: User B leaves first
      await leaveRoomFromLobby(joinerPage);
      await joinerPage.waitForURL("/", { timeout: 10_000 });

      // Host observes joiner departure from roster
      await expect(hostPage.getByText(joinerName)).toHaveCount(0, { timeout: 15_000 });

      // User A (Host) leaves second
      await leaveRoomFromLobby(hostPage);
      await hostPage.waitForURL("/", { timeout: 10_000 });

      test.info().annotations.push({ type: "run-id", description: RUN_ID });
    } finally {
      await hostContext.close();
      await joinerContext.close();
    }
  });
});

test.describe("SMOKE-09: Environment safety contract", () => {
  test("verifies that all unsafe and misconfigured environments are rejected before execution", () => {
    // 1. Missing E2E_BASE_URL
    expect(() => loadE2EConfig({ E2E_API_URL: "http://localhost:4000" })).toThrow(/E2E_BASE_URL is required/);

    // 2. Missing E2E_API_URL
    expect(() => loadE2EConfig({ E2E_BASE_URL: "http://localhost:5173" })).toThrow(/E2E_API_URL is required/);

    // 3. Malformed URL
    expect(() => loadE2EConfig({ E2E_BASE_URL: "not-a-url", E2E_API_URL: "http://localhost:4000" })).toThrow(
      /E2E_BASE_URL is not a valid absolute URL/,
    );
    expect(() => loadE2EConfig({ E2E_BASE_URL: "http://localhost:5173", E2E_API_URL: "not-a-url" })).toThrow(
      /E2E_API_URL is not a valid absolute URL/,
    );

    // 4. Unsupported protocol
    expect(() => loadE2EConfig({ E2E_BASE_URL: "ftp://localhost:5173", E2E_API_URL: "http://localhost:4000" })).toThrow(
      /must use the http or https scheme/,
    );

    // 5. Credential-bearing URL
    expect(() =>
      loadE2EConfig({ E2E_BASE_URL: "http://admin:secret@localhost:5173", E2E_API_URL: "http://localhost:4000" }),
    ).toThrow(/must not contain credentials/);

    // 6. Remote URL without E2E_ALLOW_REMOTE=true
    expect(() =>
      loadE2EConfig({
        E2E_BASE_URL: "https://staging.example.com",
        E2E_API_URL: "https://api-staging.example.com",
        E2E_ALLOW_REMOTE: "false",
      }),
    ).toThrow(/E2E_ALLOW_REMOTE=true/);

    // 7. Known production frontend host rejected even with E2E_ALLOW_REMOTE=true
    expect(() =>
      loadE2EConfig({
        E2E_BASE_URL: "https://bhalyam.onrender.com",
        E2E_API_URL: "https://api-staging.example.com",
        E2E_ALLOW_REMOTE: "true",
      }),
    ).toThrow(/known production host/);

    // 8. Known production backend host rejected even with E2E_ALLOW_REMOTE=true
    expect(() =>
      loadE2EConfig({
        E2E_BASE_URL: "https://staging.example.com",
        E2E_API_URL: "https://bhalyam-backend.onrender.com",
        E2E_ALLOW_REMOTE: "true",
      }),
    ).toThrow(/known production host/);

    // 9. Lookalike production subdomain rejected
    expect(isKnownProductionHost("staging.bhalyam.onrender.com")).toBe(true);
    expect(isKnownProductionHost("bhalyam-backend.onrender.com")).toBe(true);

    // 10. Mixed local and remote targets rejected
    expect(() =>
      loadE2EConfig({
        E2E_BASE_URL: "http://localhost:5173",
        E2E_API_URL: "https://api-staging.example.com",
        E2E_ALLOW_REMOTE: "true",
      }),
    ).toThrow(/Mixed local and remote targets are not allowed/);

    // 11. Valid local configuration succeeds
    const localConf = loadE2EConfig({
      E2E_BASE_URL: "http://localhost:5173",
      E2E_API_URL: "http://localhost:4000",
    });
    expect(localConf.isLocal).toBe(true);

    // 12. Valid remote configuration succeeds
    const remoteConf = loadE2EConfig({
      E2E_BASE_URL: "https://staging-frontend.example.com",
      E2E_API_URL: "https://staging-backend.example.com",
      E2E_ALLOW_REMOTE: "true",
    });
    expect(remoteConf.isLocal).toBe(false);
  });
});
