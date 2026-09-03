import { defineConfig, devices } from "playwright/test";
import { loadE2EConfig } from "./e2e/support/env";

/**
 * Staging smoke suite config — deliberately separate from any local dev-server
 * config. This suite never starts its own frontend/backend (no `webServer`
 * entry): it exists to point at an already-deployed target and prove the
 * deployed boundary works, so config validation runs at import time via
 * `loadE2EConfig()` (see client/e2e/support/env.ts) rather than deferring to a
 * webServer health check that would only ever run against localhost.
 *
 * Trace/screenshot capture is scoped to failures only, and this suite never
 * types a credential into a page, so there is nothing secret for a trace or
 * screenshot to capture in the first place (see SMOKE-06's own comment).
 */
const { baseUrl } = loadE2EConfig();

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: baseUrl.toString(),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
