import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * ADMIN-SEC-001 — refuse to produce a build artifact that could carry
 * `VITE_OPERATIONAL_KEY`.
 *
 * Gating the one place application code *reads* this variable
 * (`import.meta.env.DEV` in `client/src/lib/operationalApi.ts`) is
 * necessary but not sufficient. Vite performs plain textual substitution
 * for a *statically analyzable* reference like `import.meta.env.FOO`, which
 * a production minifier can dead-code-eliminate inside an `if (false)`
 * branch — but this app also does a genuinely useful DYNAMIC lookup,
 * `import.meta.env[\`VITE_FF_${key}\`]` in `client/src/lib/featureFlags.ts`,
 * to support arbitrary feature-flag overrides. Vite cannot statically
 * resolve a computed key, so whenever ANY file in the bundle does that, Vite
 * falls back to synthesizing the *entire* resolved `import.meta.env` as a
 * real object literal — every `VITE_`-prefixed variable it found, including
 * `VITE_OPERATIONAL_KEY`, regardless of which files reference which keys or
 * under what condition. Proven against a real build by
 * `scripts/verify-no-secret-leak.mjs` — the object was found verbatim in
 * the emitted chunk, keyed alongside `MODE`/`DEV`/`PROD`, even with the
 * `DEV`-gated read in place.
 *
 * So the only watertight guarantee is refusing to build at all while this
 * variable is set — the same "absence of configuration is a refusal, never
 * a pass" posture `server/src/security/operationalAuth.ts` already takes
 * for `OPERATIONAL_SECRET`. Extracted as a pure function so it can be unit
 * tested without invoking a real Vite build.
 */
export function assertNoOperationalKeyInBuild(
  env: Record<string, string | undefined>,
  command: "build" | "serve",
): void {
  if (command !== "build") return;
  if (!env.VITE_OPERATIONAL_KEY) return;
  throw new Error(
    "Refusing to build: VITE_OPERATIONAL_KEY is set. This variable is a local-development-only " +
      "convenience — Vite embeds its value in the public production bundle regardless of any " +
      "DEV-only guard in application code (see client/src/lib/operationalApi.ts and " +
      "scripts/verify-no-secret-leak.mjs). Unset VITE_OPERATIONAL_KEY before running `vite build`. " +
      "Production admin access must go through a signed-in Supabase session on the server's " +
      "ADMIN_USER_IDS allowlist, or a caller presenting the real OPERATIONAL_SECRET directly to the " +
      "server — never through this client-side variable.",
  );
}

export default defineConfig(({ mode, command }) => {
  assertNoOperationalKeyInBuild(loadEnv(mode, process.cwd(), ""), command);

  return {
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("framer-motion")) return "vendor-framer-motion";
            // Shared across Ludo's player-wobble/bounce animations and
            // several UNO card effects — its own chunk so it's cached once
            // instead of duplicated into every board that imports it.
            // Also: "@react-spring" contains "react" as a substring, so it
            // needs to be claimed before the precise react-runtime check
            // below or it silently falls through into whichever board
            // happens to import it first (this is what pushed UnoBoard
            // over its own budget the moment the loose match was tightened).
            if (id.includes("@react-spring")) return "vendor-react-spring";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("socket.io-client")) return "vendor-socketio";
            if (id.includes("howler") || id.includes("use-sound")) return "vendor-audio";
            // Heavy, feature-specific libraries get their own chunk instead
            // of riding along in whichever page happens to import them
            // first. `design-system/dls` is a barrel module
            // (`export * from "./Tooltip"` etc.) imported from very
            // widely-used shared components (AppHeader, GameCard), so
            // without an explicit bucket here these libraries were landing
            // in the main entry chunk (loaded on every page) or bleeding
            // into unrelated lazy chunks like a game board — not because
            // that board needs them, but because Rollup has to put a shared
            // dependency's code somewhere once it isn't isolated.
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@dnd-kit")) return "vendor-dnd";
            if (
              id.includes("react-hook-form") ||
              id.includes("@hookform") ||
              id.includes("/zod/") ||
              id.includes("\\zod\\")
            ) return "vendor-forms";
            if (
              id.includes("react-joyride") ||
              id.includes("canvas-confetti") ||
              id.includes("cmdk") ||
              id.includes("react-loading-skeleton") ||
              id.includes("react-parallax-tilt") ||
              id.includes("react-countup")
            ) return "vendor-ui-extras";
            // Precise package-boundary match — only the core React runtime.
            // A loose `id.includes("react")` also matches every OTHER
            // package whose npm name happens to contain "react"
            // (react-hook-form, react-joyride, react-loading-skeleton,
            // react-countup, react-parallax-tilt, every @radix-ui/react-*
            // primitive, @tanstack/react-table, @tanstack/react-virtual...).
            // Those are per-route dependencies used by lazy-loaded pages
            // (Preferences, Settings, stats/profile screens) and must stay
            // free to code-split with the route that imports them — sweeping
            // them into vendor-react instead put them in the bundle every
            // page loads and pushed it over budget (334KB vs the 300KB
            // check:bundle gate) for pages that never touch them.
            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          }
        },
      },
    },
  },
  server: {
    // `host: true` binds Vite to 0.0.0.0 so any device on your LAN (phone,
    // tablet, another laptop) can hit http://<your-pc-ip>:5173/. Without
    // this Vite only listens on 127.0.0.1 and the phone gets ERR_CONNECTION_REFUSED.
    host: true,
    port: 5173,
    // strictPort means Vite fails loudly instead of silently moving to
    // 5174 — saves the "why did the QR-code in the terminal stop working?" hunt.
    strictPort: true,
    allowedHosts: ["sb-7f553oi3nr9l.vercel.run"],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    /**
     * Real coverage, collected by V8. Thresholds are deliberately absent until
     * the baseline is measured — see docs/remediation/P0-05-QUALITY-GATES.md.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/**/*.d.ts", "src/main.tsx"],
      /**
       * Measured 2026-08-18: statements 9.63%, branches 57.80%,
       * functions 35.22%, lines 9.63%.
       *
       * 9.63% is not a typo and not a target. It is what 444 passing tests
       * across 118,353 statements actually covers, and it is the single
       * clearest number behind the audit's finding that this suite mostly
       * does not execute application code. Writing it down as a floor is the
       * point: the build now fails if it gets WORSE, and every honest
       * improvement moves it up. Raising it is a real piece of work, not a
       * config edit.
       */
      thresholds: {
        statements: 9,
        branches: 55,
        functions: 34,
        lines: 9,
      },
    },
    // Vitest stubs CSS imports to an empty string by default. The Ludo board
    // theme test reads index.css via `?raw` to check that every declared
    // theme actually has a stylesheet block behind it — the exact defect it
    // exists to prevent — so it needs the real file contents.
    css: true,
  },
  };
});
