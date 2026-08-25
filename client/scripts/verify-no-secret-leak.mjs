#!/usr/bin/env node
/**
 * BHALYAM Production Bundle Secret-Leak Guard (ADMIN-SEC-001 regression test)
 *
 * Proves, against a REAL `vite build` production output — not source
 * inspection — that `VITE_OPERATIONAL_KEY` can never ship in the public
 * client bundle.
 *
 * ── What this closes ──────────────────────────────────────────────────
 * `client/src/lib/operationalApi.ts`'s `readOperationalKey()` used to read
 * `import.meta.env.VITE_OPERATIONAL_KEY` unconditionally, and setting that
 * variable in a production environment is an easy mistake — `client/.env.example`
 * and `server/.env.example` used to ship the SAME example value for this and
 * for the server's `OPERATIONAL_SECRET`.
 *
 * The read is now gated behind `import.meta.env.DEV`, but that guard alone
 * is NOT sufficient and this script is what proved it: `client/src/lib/featureFlags.ts`
 * does a genuinely useful DYNAMIC lookup into `import.meta.env` (a computed
 * key, to support arbitrary `VITE_FF_*` overrides). Vite cannot statically
 * resolve a computed key, so the presence of that one dynamic lookup
 * anywhere in the bundle forces Vite to synthesize the ENTIRE resolved
 * `import.meta.env` as a real object literal, embedding every `VITE_`-
 * prefixed variable it found — including `VITE_OPERATIONAL_KEY` — regardless
 * of which files reference which keys or under what condition. The first
 * version of the `DEV` guard alone did not stop this; this script caught it
 * with a real build before it shipped.
 *
 * The actual fix is in `vite.config.ts`
 * (`assertNoOperationalKeyInBuild`): the build itself refuses to run at all
 * while `VITE_OPERATIONAL_KEY` is set, so no artifact — and therefore no
 * synthesized env object carrying it — can ever be produced.
 *
 * ── How this proves it ────────────────────────────────────────────────
 * 1. Build the client in production mode with `VITE_OPERATIONAL_KEY` set to
 *    a unique sentinel value that cannot appear in the codebase by accident.
 * 2a. PASS if the build refuses to run at all (the `vite.config.ts` guard
 *     fired) — the strongest possible outcome, since no artifact exists.
 * 2b. Otherwise, recursively scan every emitted file (JS, CSS, HTML —
 *     everything under the build's output directory) as text for the
 *     sentinel, and fail loudly, listing every offending file, if it
 *     appears anywhere. PASS only if it appears nowhere.
 *
 * The build is written to a throwaway temp directory, not `client/dist/`,
 * so this never clobbers a developer's own build output.
 *
 * Usage:
 *   node scripts/verify-no-secret-leak.mjs
 *   node scripts/verify-no-secret-leak.mjs --sentinel=SOME_OTHER_VALUE
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, "..");

const DEFAULT_SENTINEL = "BHALYAM_TEST_SECRET_MUST_NOT_SHIP_9F3C";

function readSentinelArg() {
  const flag = process.argv.find((a) => a.startsWith("--sentinel="));
  return flag ? flag.slice("--sentinel=".length) : DEFAULT_SENTINEL;
}

/** Recursively lists every file (not directory) under `dir`. */
function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Runs a real `vite build` with `VITE_OPERATIONAL_KEY` forced to the
 * sentinel, into a scratch output directory. Vite gives environment
 * variables already present in `process.env` priority over `.env` files,
 * so this does not require touching any `.env` file on disk.
 *
 * Invoked as `node <vite's own bin script>` rather than via `npx`/a shell
 * lookup of the `vite` command — `npx.cmd` resolution through `spawnSync`
 * is inconsistent across Windows shells/PATH configurations, whereas the
 * local install's bin script is unambiguous and matches exactly what
 * `npm run build` already resolves to.
 */
export function buildWithSentinel(sentinel, outDir) {
  const viteBin = path.join(CLIENT_ROOT, "node_modules", "vite", "bin", "vite.js");
  const result = spawnSync(
    process.execPath,
    [viteBin, "build", "--outDir", outDir, "--emptyOutDir"],
    {
      cwd: CLIENT_ROOT,
      env: { ...process.env, VITE_OPERATIONAL_KEY: sentinel },
      encoding: "utf8",
    },
  );
  return result;
}

/** Scans every file under `dir` for `needle`; returns the offending files. */
export function scanForSentinel(dir, needle) {
  const hits = [];
  for (const file of listFilesRecursive(dir)) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      // Non-UTF8/binary asset (fonts, images) — read as latin1 fallback so
      // the search still runs over the raw bytes without throwing.
      content = fs.readFileSync(file, "latin1");
    }
    const occurrences = content.split(needle).length - 1;
    if (occurrences > 0) {
      hits.push({ file: path.relative(dir, file), occurrences });
    }
  }
  return hits;
}

export function runVerification({ sentinel = DEFAULT_SENTINEL, outDir } = {}) {
  const scratchDir =
    outDir ?? fs.mkdtempSync(path.join(os.tmpdir(), "bhalyam-secret-leak-"));

  console.log("🔒 [SecretLeakGuard] Building client in production mode with a sentinel VITE_OPERATIONAL_KEY...");
  console.log(`🔒 [SecretLeakGuard] Sentinel: ${sentinel}`);
  console.log(`🔒 [SecretLeakGuard] Output dir: ${scratchDir}`);

  const build = buildWithSentinel(sentinel, scratchDir);

  if (build.error) {
    console.error("❌ [SecretLeakGuard] Failed to spawn `vite build` at all:");
    console.error(build.error);
    return { passed: false, error: "spawn_failed", hits: [], scratchDir };
  }

  if (build.status !== 0) {
    const refused = (build.stderr ?? "").includes("Refusing to build: VITE_OPERATIONAL_KEY is set");
    if (refused) {
      console.log("✅ [SecretLeakGuard] PASSED: `vite.config.ts` refused to build at all while VITE_OPERATIONAL_KEY was set.");
      console.log("✅ [SecretLeakGuard] No artifact was produced, so nothing could carry the sentinel.");
      return { passed: true, hits: [], scratchDir, refusedAtConfig: true };
    }

    console.error("❌ [SecretLeakGuard] `vite build` failed for an unrelated reason — cannot verify a build that did not produce output.");
    if (build.stdout) console.error(build.stdout);
    if (build.stderr) console.error(build.stderr);
    return { passed: false, error: "build_failed", hits: [], scratchDir };
  }

  if (!fs.existsSync(scratchDir)) {
    console.error(`❌ [SecretLeakGuard] Build reported success but ${scratchDir} does not exist.`);
    return { passed: false, error: "outdir_missing", hits: [], scratchDir };
  }

  const hits = scanForSentinel(scratchDir, sentinel);
  const passed = hits.length === 0;

  if (passed) {
    const fileCount = listFilesRecursive(scratchDir).length;
    console.log(`✅ [SecretLeakGuard] PASSED: sentinel not found in any of ${fileCount} emitted production artifacts.`);
    console.log("✅ [SecretLeakGuard] VITE_OPERATIONAL_KEY is correctly stripped from the production bundle.");
  } else {
    console.error(`\n❌ [SecretLeakGuard] FAILED: the sentinel value shipped in ${hits.length} production artifact(s):\n`);
    for (const hit of hits) {
      console.error(`  - ${hit.file} (${hit.occurrences} occurrence${hit.occurrences === 1 ? "" : "s"})`);
    }
    console.error(
      "\nThis means VITE_OPERATIONAL_KEY is reachable from a production build again — a regression of " +
        "ADMIN-SEC-001. Check that `readOperationalKey()` in client/src/lib/operationalApi.ts still gates " +
        "every read of `import.meta.env.VITE_OPERATIONAL_KEY` behind `import.meta.env.DEV`, and that nothing " +
        "else in the client reads that variable unconditionally.\n",
    );
  }

  return { passed, hits, scratchDir };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { passed, error } = runVerification({ sentinel: readSentinelArg() });
  process.exit(passed ? 0 : error ? 2 : 1);
}
