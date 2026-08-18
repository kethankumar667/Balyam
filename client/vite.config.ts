import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
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
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("socket.io-client")) return "vendor-socketio";
            if (id.includes("howler") || id.includes("use-sound")) return "vendor-audio";
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) return "vendor-react";
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
});
