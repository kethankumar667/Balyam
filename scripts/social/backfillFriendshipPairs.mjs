#!/usr/bin/env node
/**
 * Backfills friendship history from matches stored before it was recorded live.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless you pass --apply.
 *
 *   cd server
 *   node --import tsx ../scripts/social/backfillFriendshipPairs.mjs --before 2026-10-10T00:00:00Z
 *   node --import tsx ../scripts/social/backfillFriendshipPairs.mjs --before 2026-10-10T00:00:00Z --apply
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * ── --before is the moment live recording began ────────────────────────
 * Live counting and this script name a match differently (a live match is keyed
 * by when it STARTED; a stored one by the match summary's own id), so a match
 * that both saw could be counted twice. Passing the time WP5 was deployed as
 * --before makes them cover disjoint ranges: this script takes everything that
 * started earlier, and the live path took everything since. --apply refuses to
 * run without it.
 *
 * ── What a dry run does and does not tell you ──────────────────────────
 * It reads the real matches and counts them into a throw-away in-memory store,
 * so the report is exactly what --apply would attempt. It does NOT know which
 * matches the real store has already counted, so on a second run "counted"
 * overstates what --apply would add; --apply itself skips them safely.
 *
 * ── What it cannot recover ─────────────────────────────────────────────
 * A stored match names players by the id the room used, and for a long time that
 * was a per-room seat id, which belongs to no account. Only participants with a
 * verified account id are paired; the rest are reported as "unverifiable" and
 * left alone rather than guessed at.
 */

const USAGE = `Usage: node --import tsx ../scripts/social/backfillFriendshipPairs.mjs --before <ISO time> [--apply]

  --before <ISO time>  Only matches that STARTED before this. The moment live recording began.
  --apply              Write to the database. Without it, nothing is written.
  --help               This text.

Run from the server/ directory. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`;

function parseArgs(argv) {
  const args = { apply: false, before: undefined, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--before") args.before = argv[(i += 1)];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(USAGE);
    return fail(err.message);
  }
  if (args.help) {
    console.log(USAGE);
    return;
  }

  let before;
  if (args.before !== undefined) {
    before = Date.parse(args.before);
    if (Number.isNaN(before)) return fail(`--before "${args.before}" is not a valid date/time.`);
  }
  if (args.apply && before === undefined) {
    return fail("--apply needs --before <ISO time>: the moment live recording began. See the header of this file for why.");
  }

  const { readPostgrestConfig, PostgrestClient } = await import("../../server/src/persistence/postgrest.ts");
  const { SupabaseProgressionRepository } = await import("../../server/src/persistence/SupabaseProgressionRepository.ts");
  const { backfillContext, backfillFriendshipPairs, readStoredMatches } = await import(
    "../../server/src/social/backfillFriendshipPairs.ts"
  );

  const config = readPostgrestConfig();
  if (!config) return fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not both set (or the key is a publishable key).");

  const mode = args.apply ? "APPLY (writing to the database)" : "DRY RUN (nothing is written)";
  console.log(`\nFriendship history backfill — ${mode}`);
  console.log(`Matches that started before: ${before === undefined ? "(no cutoff)" : new Date(before).toISOString()}\n`);
  if (before === undefined) console.log("  ! No --before given. Fine for a dry run; --apply requires it.\n");

  const db = new PostgrestClient(config);
  const { service } = backfillContext(new SupabaseProgressionRepository(config), !args.apply);

  const report = await backfillFriendshipPairs(readStoredMatches(db, { before }), service, { before });
  await service.drain();

  const rows = [
    ["matches read", report.matchesSeen],
    ["  counted", report.matchesCounted],
    ["  already counted (skipped)", report.matchesAlreadyCounted],
    ["  fewer than two verified players (skipped)", report.matchesTooFewVerified],
    ["  after the cutoff (left to live recording)", report.matchesAfterCutoff],
    ["pairs updated", report.pairsUpdated],
    ["participants with an unverifiable id (seat ids — not recoverable)", report.participantsUnverifiable],
  ];
  for (const [label, value] of rows) console.log(`  ${String(value).padStart(8)}  ${label}`);
  console.log(`\n${args.apply ? "✓ Applied." : "✓ Dry run complete — re-run with --apply to write."}\n`);
}

main().catch((err) => fail(`Backfill failed: ${err.message}`));
