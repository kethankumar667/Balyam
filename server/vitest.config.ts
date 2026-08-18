import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  /**
   * Real coverage, collected by V8 against the code that actually ran.
   *
   * No thresholds here yet, deliberately. A number invented before the
   * baseline is measured is either so low it can never fail or so high it has
   * to be waived on the first run, and both teach people to ignore it. The
   * measured baseline is recorded in docs/remediation/P0-05-QUALITY-GATES.md;
   * thresholds get set from it, slightly below, and ratcheted.
   */
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/__tests__/**",
        // Test-only harness. Counting it would inflate the number with code
        // that exists to run tests rather than to be tested.
        "src/testing/**",
        "src/types/**",
      ],
      /**
       * Set FROM the measured baseline, not before it.
       *
       * Measured 2026-08-18: 79.30 / 76.63 / 76.76 / 79.30. The floors sit
       * about a point under, which is enough slack that deleting a well-tested
       * file does not fail the build, and tight enough that adding an untested
       * module does. They are a ratchet: raise them when the real number
       * rises, never lower them to make a build pass.
       */
      thresholds: {
        statements: 78,
        branches: 75,
        functions: 75,
        lines: 78,
      },
    },
  },
});
