#!/usr/bin/env node
/**
 * Does progression survive the process that wrote it?
 *
 * ── The question P0-3 could not answer ────────────────────────────────
 * A schema can be perfect and an application still lose everything, because
 * the only thing that establishes durability is: write through the real API,
 * kill the process, start another one, read it back. That needs a database,
 * and there was none — so P0-3 shipped as IMPLEMENTED, NOT VERIFIED.
 *
 * This closes it locally. It stands up a real PostgreSQL 17, applies the real
 * migration, fronts it with a PostgREST shim (`postgrestShim.mjs`), then runs
 * the REAL server binary twice with a SIGTERM in between.
 *
 * ── Honest scope ──────────────────────────────────────────────────────
 * Proves: the repository's SQL semantics, the write-behind queue, the SIGTERM
 * drain, boot-time hydration, cross-restart idempotency, and concurrency —
 * against a genuine PostgreSQL.
 *
 * Does NOT prove: that Supabase's own PostgREST and RLS behave identically in
 * every corner. Against Supabase the server runs as the service role, which
 * bypasses RLS; the shim has no roles at all. Enforcement of the
 * `authenticated` policies is therefore still only verified structurally
 * (see verifySchema.mjs §3), not behaviourally.
 *
 *   node scripts/persistence/verifyDurability.mjs
 */

import EmbeddedPostgres from "embedded-postgres";
import pkg from "pg";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { startPostgrestShim } from "./postgrestShim.mjs";

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SERVER_DIR = path.join(ROOT, "server");
const TSX = path.join(SERVER_DIR, "node_modules", "tsx", "dist", "cli.mjs");
const MIGRATION = path.join(ROOT, "supabase/migrations/20260818000000_progression_persistence.sql");
const RECEIPT = path.join(ROOT, "docs/remediation/persistence-verification.json");

const PG_PORT = Number(process.env.VERIFY_PG_PORT) || 55434;
const SHIM_PORT = Number(process.env.VERIFY_SHIM_PORT) || 55435;
const APP_PORT = Number(process.env.VERIFY_APP_PORT) || 4897;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `bhalyam-pg-durability-${process.pid}`);
const OPS_KEY = "durability-verification-operational-key";

const results = [];
let failures = 0;
const check = (name, passed, evidence = "") => {
  results.push({ name, passed, evidence: String(evidence).slice(0, 400) });
  if (!passed) failures += 1;
  console.log(`  ${passed ? "✓" : "✗"} ${name}${evidence ? ` — ${String(evidence).slice(0, 150)}` : ""}`);
};

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;`;

const childEnv = (extra = {}) => ({
  ...process.env,
  NODE_ENV: "production",
  PORT: String(APP_PORT),
  OPERATIONAL_SECRET: OPS_KEY,
  SUPABASE_URL: `http://127.0.0.1:${SHIM_PORT}`,
  // Shaped like a service-role JWT so `readPostgrestConfig` accepts it. The
  // shim has no auth; the shape is what the config reader inspects.
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.durability.verification",
  SUPABASE_JWT_SECRET: "durability-verification-jwt-secret",
  // Fixed, so guest tokens minted by the first process verify in the second.
  SESSION_SECRET: "durability-verification-session-secret",
  CLIENT_ORIGIN: "http://localhost:5173",
  ALLOW_EPHEMERAL_PROGRESSION: "",
  ...extra,
});

function startServer(label, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TSX, "src/index.ts"], { cwd: SERVER_DIR, env: childEnv(extra) });
    let output = "";
    let settled = false;
    const onData = (d) => {
      output += String(d);
      if (!settled && /Server listening/.test(output)) {
        settled = true;
        clearTimeout(timer);
        resolve({ child, output: () => output });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ child: null, exitCode: code, output: () => output });
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`${label} never announced a port:\n${output}`));
    }, 45_000);
  });
}

function stopServer(child, signal = "SIGTERM") {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve("killed after grace period");
    }, 20_000);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve("exited cleanly");
    });
    child.kill(signal);
  });
}

async function api(pathname, init = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

const RUN = crypto.randomBytes(4).toString("hex");

async function main() {
  console.log(`\nPersistence durability verification — run ${RUN}\n`);

  fs.rmSync(DATA_DIR, { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR, user: "postgres", password: "postgres", port: PG_PORT,
    persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
  await pg.initialise();
  await pg.start();

  const connectionString = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;
  const admin = new Client({ connectionString });
  await admin.connect();
  await admin.query(AUTH_STUB);
  await admin.query(fs.readFileSync(MIGRATION, "utf8"));
  console.log("  (real PostgreSQL 17 up, migration applied, shim starting)\n");

  const shim = await startPostgrestShim({ port: SHIM_PORT, connectionString });

  let first = null;
  let second = null;
  try {
    /* ── 1. Startup behaviour ── */
    console.log("1. Startup and connectivity");
    first = await startServer("first server");
    check("server starts against a real Postgres and hydrates",
      Boolean(first.child) && /Progression is durable/.test(first.output()),
      (first.output().match(/Progression (is durable|restored)[^"]*/) ?? ["no line"])[0]);

    const health = await api("/health");
    check("health reports durable progression",
      health.body?.progression?.durable === true && health.body?.progression?.kind === "supabase",
      JSON.stringify(health.body?.progression ?? {}));

    /* ── 2. Create ── */
    console.log("\n2. Create records");
    const guestRes = await api("/api/auth/guest", { method: "POST" });
    const guest = guestRes.body;
    check("guest identity minted", guestRes.status === 201 && Boolean(guest?.playerId), guest?.playerId);

    const displayName = `Durability ${RUN}`;
    const put = await api(`/api/profile/${guest.playerId}`, {
      method: "PUT", token: guest.token,
      body: JSON.stringify({ displayName, avatar: "fox" }),
    });
    check("profile written through the real API",
      put.status === 200 && put.body?.profile?.displayName === displayName, `status ${put.status}`);

    const friendRes = await api("/api/auth/guest", { method: "POST" });
    const friendId = friendRes.body.playerId;
    const addFriend = await api(`/api/ranking/friends/${guest.playerId}`, {
      method: "POST", token: guest.token, body: JSON.stringify({ friendId }),
    });
    check("friendship written", addFriend.status === 200, `status ${addFriend.status}`);

    /* ── 3. Duplicate replay ── */
    console.log("\n3. Duplicate request replay");
    const dup = await Promise.all([
      api(`/api/ranking/friends/${guest.playerId}`, {
        method: "POST", token: guest.token, body: JSON.stringify({ friendId }),
      }),
      api(`/api/ranking/friends/${guest.playerId}`, {
        method: "POST", token: guest.token, body: JSON.stringify({ friendId }),
      }),
    ]);
    check("replayed writes are accepted without duplicating",
      dup.every((r) => r.status === 200), dup.map((r) => r.status).join(", "));

    /* ── 4. Concurrent mutation ── */
    console.log("\n4. Concurrent mutation");
    await Promise.all(Array.from({ length: 10 }, () =>
      api(`/api/ranking/friends/${guest.playerId}`, {
        method: "POST", token: guest.token, body: JSON.stringify({ friendId }),
      })));

    /* ── 4b. The write-behind window, measured ── */
    console.log("\n4b. Write-behind flush");
    /*
     * Wait for the queue to empty before killing the process.
     *
     * Not a convenience — it separates two different questions. Progression is
     * written BEHIND the request, so a process killed mid-queue loses whatever
     * had not flushed, and an earlier version of this run proved exactly that:
     * the profile came back 200 to the client and was absent from Postgres a
     * moment later, because the kill beat the write.
     *
     * That window is a real, documented property of the design (see
     * docs/runbooks/persistence.md §7). Conflating it with "does data survive a
     * restart" would let one failure hide the other. So: flush first, prove
     * durability; and record the window as its own measurement.
     */
    const flushStart = Date.now();
    let pending = -1;
    while (Date.now() - flushStart < 15000) {
      const h = await api("/health");
      pending = h.body?.progression?.sync?.pending ?? -1;
      if (pending === 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    check("the write-behind queue drains on its own", pending === 0,
      `queue reached ${pending} pending after ${Date.now() - flushStart}ms`);

    const syncStatus = (await api("/health")).body?.progression?.sync;
    check("no progression write failed", syncStatus?.failed === 0, JSON.stringify(syncStatus ?? {}));
    if (syncStatus?.failed > 0) {
      console.log(`    last error: ${syncStatus.lastError}`);
    }

    /* ── 5. Deploy-shaped restart ── */
    console.log("\n5. Deploy-shaped restart (SIGTERM, then a fresh process)");
    const stopReason = await stopServer(first.child, "SIGTERM");
    first.child = null;
    check("first server terminated", stopReason === "exited cleanly", stopReason);

    /*
     * Windows cannot deliver SIGTERM.
     *
     * `child.kill("SIGTERM")` on win32 terminates the process WITHOUT running
     * its signal handlers — verified directly, with a child that logs on
     * SIGTERM and never did. So on Windows this run is not a graceful deploy
     * at all: it is an abrupt kill, and the durability results below are
     * therefore STRONGER than a graceful restart would have shown, because
     * nothing got the chance to flush on the way out.
     *
     * What it cannot show is that the drain works. That check belongs on
     * Linux (CI), and reporting it as a failure here would be blaming the code
     * for the platform.
     */
    const flushed = /Progression writes flushed/.test(first.output());
    if (process.platform === "win32" && !flushed) {
      results.push({
        name: "graceful SIGTERM drain",
        passed: true,
        skipped: true,
        evidence:
          "NOT VERIFIABLE ON WINDOWS — SIGTERM is not deliverable, so this run was an abrupt " +
          "kill. Durability below therefore holds WITHOUT a graceful flush. Run on Linux to " +
          "verify the drain itself.",
      });
      console.log("  ~ graceful SIGTERM drain — NOT VERIFIABLE ON WINDOWS (this run was an abrupt kill)");
    } else {
      check("write queue was flushed before exit", flushed,
        (first.output().match(/Progression writes flushed \([^)]*\)/) ?? ["not found"])[0]);
    }

    // The database is the only thing that carried anything across this line.
    const rowsBetween = await admin.query(
      `select display_name from player_profiles where player_id=$1`, [guest.playerId]);
    check("the row is in PostgreSQL with no server running",
      rowsBetween.rowCount === 1 && rowsBetween.rows[0].display_name === displayName,
      `SELECT returned ${rowsBetween.rowCount} row(s): ${JSON.stringify(rowsBetween.rows[0] ?? null)}`);

    const friendRows = await admin.query(
      `select count(*)::int n from friends where player_id=$1 and friend_player_id=$2`,
      [guest.playerId, friendId]);
    check("13 identical friend writes stored exactly one row",
      friendRows.rows[0].n === 1, `${friendRows.rows[0].n} row(s)`);

    const identityRows = await admin.query(
      `select count(*)::int n from player_identities where player_id in ($1,$2)`,
      [guest.playerId, friendId]);
    check("both ends of the friendship have durable identity rows",
      identityRows.rows[0].n === 2, `${identityRows.rows[0].n} identity row(s)`);

    second = await startServer("second server");
    check("second server started and hydrated from the database",
      Boolean(second.child) && /Progression restored/.test(second.output()),
      (second.output().match(/Progression restored[^"]*/) ?? ["no hydration line"])[0]);

    /* ── 6. Read back ── */
    console.log("\n6. Read back after restart");
    const readBack = await api(`/api/profile/${guest.playerId}`, { token: guest.token });
    check("the profile written by the DEAD process is served by the NEW one",
      readBack.status === 200 && readBack.body?.profile?.displayName === displayName,
      `${readBack.status} ${JSON.stringify(readBack.body?.profile?.displayName)}`);

    const friendsBack = await api(`/api/ranking/friends/${guest.playerId}`, { token: guest.token });
    check("the friendship survived the restart",
      (friendsBack.body?.friends ?? []).length >= 1,
      `${(friendsBack.body?.friends ?? []).length} friend(s)`);

    const guestStillValid = await api("/api/auth/me", { token: guest.token });
    check("the guest identity still verifies after the restart",
      guestStillValid.status === 200 && guestStillValid.body?.player?.playerId === guest.playerId,
      JSON.stringify(guestStillValid.body ?? {}));
  } finally {
    if (first?.child) await stopServer(first.child).catch(() => undefined);
    if (second?.child) await stopServer(second.child).catch(() => undefined);
    await shim.stop().catch(() => undefined);
    await admin.end().catch(() => undefined);
    await pg.stop().catch(() => undefined);
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  const receipt = {
    verifiedAt: new Date().toISOString(),
    run: RUN,
    project: "local://embedded-postgres-17 + postgrest-shim",
    store: "supabase-postgres",
    migration: path.basename(MIGRATION),
    node: process.version,
    scope:
      "Real PostgreSQL 17 + real server binary, restarted with SIGTERM. Supabase's own PostgREST " +
      "and RLS enforcement under the authenticated role are NOT covered by this run.",
    platform: process.platform,
    checks: results.map((r) => ({
      name: r.name, passed: r.passed, skipped: Boolean(r.skipped), detail: r.evidence,
    })),
    passed: failures === 0,
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");

  console.log(`\n${failures === 0 ? "✓ PASSED" : `✗ FAILED (${failures})`} — receipt: ${path.relative(ROOT, RECEIPT)}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✗ Durability verification aborted: ${err.message}\n${err.stack ?? ""}\n`);
  process.exit(2);
});
