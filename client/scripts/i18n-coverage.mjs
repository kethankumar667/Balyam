/**
 * Translation coverage report.
 *
 * Non-English catalogues are typed as Partial on purpose — a locale that has
 * not caught up with a new English key falls back to English rather than
 * failing the build. That is the right runtime behaviour and the wrong
 * reporting behaviour: without this script an untranslated app looks exactly
 * like a translated one until a player notices English in the middle of
 * Telugu.
 *
 * Usage:  npm run i18n:coverage
 *         npm run i18n:coverage -- --missing   (list every missing key)
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(HERE, "../src/i18n/locales");
const SHOW_MISSING = process.argv.includes("--missing");

/**
 * Pull the quoted keys out of a catalogue file.
 *
 * Comments are stripped first so a key mentioned in a doc block (the plural
 * example in en.ts, for instance) is not counted as a real entry.
 */
function keysOf(file) {
  const source = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const keys = new Set();
  for (const m of source.matchAll(/^\s*"([^"]+)"\s*:/gm)) keys.add(m[1]);
  return keys;
}

/** `room.playerCount_one` and `_other` both satisfy the base key. */
function baseKey(k) {
  return k.replace(/_(zero|one|two|few|many|other)$/, "");
}

function main() {
  const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts"));
  const enKeys = keysOf(join(LOCALES_DIR, "en.ts"));
  const enBases = new Set([...enKeys].map(baseKey));

  console.log(`English catalogue: ${enBases.size} keys\n`);

  const rows = [];
  for (const file of files.sort()) {
    const id = file.replace(/\.ts$/, "");
    if (id === "en") continue;
    const bases = new Set([...keysOf(join(LOCALES_DIR, file))].map(baseKey));
    const missing = [...enBases].filter((k) => !bases.has(k)).sort();
    const extra = [...bases].filter((k) => !enBases.has(k)).sort();
    const pct = enBases.size === 0 ? 100 : Math.round(((enBases.size - missing.length) / enBases.size) * 100);
    rows.push({ id, pct, missing, extra });
  }

  const width = Math.max(...rows.map((r) => r.id.length));
  for (const r of rows) {
    const bar = "█".repeat(Math.round(r.pct / 5)).padEnd(20, "░");
    console.log(
      `${r.id.padEnd(width)}  ${bar} ${String(r.pct).padStart(3)}%  ` +
        `${r.missing.length} missing${r.extra.length ? `, ${r.extra.length} stale` : ""}`,
    );
  }

  if (SHOW_MISSING) {
    for (const r of rows) {
      if (r.missing.length === 0 && r.extra.length === 0) continue;
      console.log(`\n── ${r.id} ──`);
      for (const k of r.missing) console.log(`  missing: ${k}`);
      // A key here but not in English is usually a rename that was applied to
      // en.ts and forgotten everywhere else — it is dead weight, not coverage.
      for (const k of r.extra) console.log(`  stale:   ${k}`);
    }
  } else {
    const anyGaps = rows.some((r) => r.missing.length > 0 || r.extra.length > 0);
    if (anyGaps) console.log("\nRerun with --missing to list the keys.");
  }
}

main();
