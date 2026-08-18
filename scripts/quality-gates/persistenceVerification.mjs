#!/usr/bin/env node
/**
 * BHALYAM Gate — Durability is verified, or it is not claimed.
 *
 * ── What this gate is for ─────────────────────────────────────────────
 * The audit found progression living in process-local `Map`s. The remediation
 * added a schema, repositories and a write path — and every one of those can
 * be complete and still wrong, because the only question that matters is
 * whether the data is there after the process that wrote it has died. No unit
 * test can answer that about itself.
 *
 * So the answer comes from `scripts/persistence/verifyPersistence.mjs`, which
 * spawns a real server, writes through the real API, SIGTERMs it, spawns a
 * second one and reads back. That script writes a receipt. This gate reads it.
 *
 * ── Why a receipt rather than a re-run ────────────────────────────────
 * Verification needs a database and credentials that a pull-request CI job
 * should not hold. Separating "prove it" from "check that it was proved" lets
 * the proof happen where the credentials live (a release job, or a developer's
 * terminal) while every build still refuses to call the system durable without
 * one.
 *
 * A receipt is forgeable by anyone willing to write JSON by hand. That is true
 * of every artifact, and it is not the failure mode this exists to prevent —
 * which is nobody checking at all, and a green pipeline being read as evidence
 * of something it never tested.
 *
 * ── Exit codes ────────────────────────────────────────────────────────
 *   0  a passing receipt exists and is fresh
 *   1  no receipt, a failing receipt, a stale one, or one for another project
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const RECEIPT = path.join(ROOT, "docs", "remediation", "persistence-verification.json");

/**
 * How old a proof may be.
 *
 * Schemas and write paths change; a verification from six months ago describes
 * a system that no longer exists. Thirty days is long enough not to be
 * bureaucratic and short enough that the answer still refers to roughly this
 * code.
 */
const MAX_AGE_DAYS = Number(process.env.PERSISTENCE_RECEIPT_MAX_AGE_DAYS) || 30;

function fail(lines) {
  console.error("\n✗ [Persistence] GATE FAILED\n");
  for (const line of lines) console.error(`  ${line}`);
  console.error(
    "\n  To satisfy this gate, run the verification against a real database:\n\n" +
      "    SUPABASE_URL=https://<ref>.supabase.co \\\n" +
      "    SUPABASE_SERVICE_ROLE_KEY=<service-role key> \\\n" +
      "    node scripts/persistence/verifyPersistence.mjs\n\n" +
      "  Until then the correct statement is that durability is UNVERIFIED.\n",
  );
  process.exit(1);
}

if (!fs.existsSync(RECEIPT)) {
  fail([
    "No persistence verification receipt exists.",
    "",
    "The schema, the repositories and the write path may all be in place — none of",
    "that establishes that data survives the process that wrote it. That claim needs",
    "a create → restart → read against real Postgres, and no such run has been",
    "recorded.",
  ]);
}

let receipt;
try {
  receipt = JSON.parse(fs.readFileSync(RECEIPT, "utf8"));
} catch (err) {
  fail([`The receipt at ${path.relative(ROOT, RECEIPT)} is not readable JSON: ${err.message}`]);
}

const problems = [];

if (receipt.passed !== true) {
  const failed = (receipt.checks ?? []).filter((c) => !c.passed);
  problems.push("The recorded verification did not pass.");
  for (const c of failed) problems.push(`  failed: ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

const verifiedAt = Date.parse(receipt.verifiedAt ?? "");
if (!Number.isFinite(verifiedAt)) {
  problems.push("The receipt has no readable `verifiedAt` timestamp.");
} else {
  const ageDays = (Date.now() - verifiedAt) / 86_400_000;
  if (ageDays > MAX_AGE_DAYS) {
    problems.push(
      `The verification is ${Math.round(ageDays)} days old (limit ${MAX_AGE_DAYS}). ` +
        "It describes a schema and a write path that may since have changed.",
    );
  }
}

if (receipt.store !== "supabase-postgres") {
  problems.push(
    `The receipt records store "${receipt.store}", not "supabase-postgres". ` +
      "A verification against anything else does not establish production durability.",
  );
}

// If this build knows which project it targets, the proof must be about that
// one. A receipt from a developer's scratch project says nothing about prod.
const expected = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
if (expected && receipt.project && receipt.project !== expected) {
  problems.push(
    `The receipt is for ${receipt.project}, but this environment targets ${expected}.`,
  );
}

/*
 * The claims that, together, mean "durable".
 *
 * Each is a distinct link: the data reached Postgres, it was there with no
 * server alive, a NEW process served it, concurrent writes did not duplicate,
 * and the write-behind queue actually drains. Dropping any one of them leaves
 * a receipt that could be green while the system loses data.
 */
const required = [
  "the row is in PostgreSQL with no server running",
  "the profile written by the DEAD process is served by the NEW one",
  "second server started and hydrated from the database",
  "13 identical friend writes stored exactly one row",
  "the write-behind queue drains on its own",
];
const byName = new Map((receipt.checks ?? []).map((c) => [c.name, c]));
for (const name of required) {
  const found = byName.get(name);
  if (!found) {
    problems.push(`The receipt is missing a required check: "${name}".`);
  } else if (found.skipped) {
    // A skipped check is not a passed check. Counting it would be the same
    // class of error as the certification suite this remediation deleted.
    problems.push(`Required check "${name}" was SKIPPED, which is not a pass: ${found.detail ?? ""}`);
  } else if (found.passed !== true) {
    problems.push(`Required check "${name}" did not pass: ${found.detail ?? ""}`);
  }
}

// Skipped non-required checks are reported but do not fail the gate. They are
// the honest record of what a given platform could not exercise.
const skipped = (receipt.checks ?? []).filter((c) => c.skipped);
if (skipped.length > 0) {
  console.log(`
  Note: ${skipped.length} check(s) could not run on ${receipt.platform ?? "this platform"}:`);
  for (const c of skipped) console.log(`    ~ ${c.name} — ${c.detail}`);
}

/*
 * The schema receipt is a separate artifact and a separate claim.
 *
 * Durability says "the application keeps data". Schema verification says "the
 * migration applies, the constraints hold, the rollback rolls back". Neither
 * implies the other, so the gate wants both.
 */
const SCHEMA_RECEIPT = path.join(ROOT, "docs", "remediation", "persistence-schema-verification.json");
if (!fs.existsSync(SCHEMA_RECEIPT)) {
  problems.push(
    "No schema verification receipt (docs/remediation/persistence-schema-verification.json). " +
      "Run `npm run verify:schema`.",
  );
} else {
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_RECEIPT, "utf8"));
    if (schema.passed !== true) {
      problems.push(`Schema verification did not pass (${schema.counts?.failed ?? "?"} failed check(s)).`);
    }
    const schemaAge = (Date.now() - Date.parse(schema.verifiedAt ?? "")) / 86_400_000;
    if (!Number.isFinite(schemaAge) || schemaAge > MAX_AGE_DAYS) {
      problems.push(`Schema verification is stale or undated (${Math.round(schemaAge)} days).`);
    }
  } catch (err) {
    problems.push(`The schema receipt is not readable JSON: ${err.message}`);
  }
}

const inconclusive = (receipt.checks ?? []).filter((c) => /INCONCLUSIVE/i.test(c.detail ?? ""));
if (inconclusive.length > 0) {
  problems.push(
    `${inconclusive.length} check(s) recorded INCONCLUSIVE. An inconclusive check is not a pass:`,
  );
  for (const c of inconclusive) problems.push(`  ${c.name} — ${c.detail}`);
}

if (problems.length > 0) fail(problems);

const total = (receipt.checks ?? []).length;
console.log(
  `\n✓ [Persistence] PASSED: ${total} checks verified against ${receipt.project} on ` +
    `${new Date(verifiedAt).toISOString().slice(0, 10)} (run ${receipt.run}).\n`,
);
process.exit(0);
