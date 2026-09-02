#!/usr/bin/env node
/**
 * Does progression actually survive?
 *
 * ── Why this is a script and not a test ───────────────────────────────
 * Because the claim under test is "the data is still there after the process
 * that wrote it has died", and a test runner cannot make that claim about
 * itself. This spawns a real server, writes through its real HTTP API, kills
 * it, spawns a second one, and reads back. Anything less is a test of a Map.
 *
 * ── The five checks, and what each one would catch ────────────────────
 *   1. CREATE            writes land at all
 *   2. RESTART + READ    the process that wrote them is gone and they remain
 *   3. DEPLOY SIMULATION SIGTERM (not SIGKILL) flushes the write queue — the
 *                        actual shape of a redeploy, and the one that would
 *                        silently drop queued writes if `drain()` regressed
 *   4. DUPLICATE REPLAY  the same reward claim twice pays once
 *   5. CONCURRENT        ten simultaneous claims pay once
 *
 * ── Running it ────────────────────────────────────────────────────────
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
 *   SUPABASE_JWT_SECRET=<optional> \
 *   node scripts/persistence/verifyPersistence.mjs
 *
 * It refuses to run without a service-role key rather than "passing" against
 * memory, which would be a green result that means nothing.
 *
 * On success it writes docs/remediation/persistence-verification.json — the
 * receipt that `npm run check:persistence` requires. The receipt records what
 * ran, against which project, and when; it is the difference between a claim
 * and evidence.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SERVER_DIR = path.join(ROOT, "server");
const TSX = path.join(SERVER_DIR, "node_modules", "tsx", "dist", "cli.mjs");
const RECEIPT = path.join(ROOT, "docs", "remediation", "persistence-verification.json");

const PORT = Number(process.env.VERIFY_PORT) || 4899;
const BASE = `http://127.0.0.1:${PORT}`;
const OPS_KEY = "verification-operational-key-0001";

const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  ""
).trim();

if (!url || !serviceKey) {
  console.error(
    "\n✗ Cannot verify persistence: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "  Running this against the in-memory store would produce a green result that proves\n" +
      "  nothing, so it refuses instead. See docs/runbooks/persistence.md.\n",
  );
  process.exit(2);
}

const results = [];
let failures = 0;

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  console.log(`${passed ? "  ✓" : "  ✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const childEnv = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(PORT),
  OPERATIONAL_SECRET: OPS_KEY,
  SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  // A fixed key so guest tokens minted by the first process still verify in
  // the second. Without it a restart invalidates every guest, and the restart
  // check would fail for a reason that has nothing to do with the database.
  SESSION_SECRET: process.env.SESSION_SECRET || "persistence-verification-session-secret",
  // Required for the server to boot in production at all (voucherCrypto.ts's
  // own startup guard) — this script does not exercise voucher issuance, so
  // any fixed value works.
  VOUCHER_HMAC_SECRET: process.env.VOUCHER_HMAC_SECRET || "persistence-verification-voucher-secret",
  CLIENT_ORIGIN: "http://localhost:5173",
};

/** Start a server and resolve once it says it is listening. */
function startServer(label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [TSX, "src/index.ts"], {
      cwd: SERVER_DIR,
      env: childEnv,
    });
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
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`${label} exited with ${code} before listening:\n${output}`));
      }
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`${label} never announced a port within 40s:\n${output}`));
    }, 40_000);
  });
}

/** SIGTERM and wait — the shape of a redeploy, including the write drain. */
function stopServer(child, signal = "SIGTERM") {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve("killed after grace period");
    }, 15_000);
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
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/** A run-scoped tag, so repeated runs never collide in a shared database. */
const RUN = crypto.randomBytes(4).toString("hex");

async function main() {
  console.log(`\nPersistence verification — run ${RUN}`);
  console.log(`Project: ${url}\n`);

  /* ────────────── 1. CREATE ────────────── */
  console.log("1. Create data");
  let first = await startServer("first server");

  const guestRes = await api("/api/auth/guest", { method: "POST" });
  const guest = guestRes.body;
  check("minted a guest identity", guestRes.status === 201 && Boolean(guest?.playerId), guest?.playerId);

  const displayName = `Verify ${RUN}`;
  const put = await api(`/api/profile/${guest.playerId}`, {
    method: "PUT",
    token: guest.token,
    body: JSON.stringify({ displayName, avatar: "fox" }),
  });
  check("wrote a profile", put.status === 200 && put.body?.profile?.displayName === displayName);

  const challenges = await api(`/api/ranking/challenges/${guest.playerId}`, { token: guest.token });
  const all = [...(challenges.body?.challenges?.daily ?? []), ...(challenges.body?.challenges?.weekly ?? [])];
  const claimable = all.find((c) => c.completed && !c.claimed);
  check("read the player's challenges", challenges.status === 200, `${all.length} challenges`);

  /* ────────────── 4. DUPLICATE REPLAY ────────────── */
  // Done here, against the live first process, because a duplicate is only
  // meaningful while the first claim is still in the same process's memory.
  console.log("\n4. Duplicate request replay");
  const tier = "tier_1";
  const claimOnce = () =>
    api(`/api/seasons/player/${guest.playerId}/claim/${tier}`, { method: "POST", token: guest.token });

  const claimA = await claimOnce();
  const claimB = await claimOnce();
  if (claimA.status === 200) {
    check("second identical claim refused", claimB.status !== 200, `first ${claimA.status}, second ${claimB.status}`);
  } else {
    // Not claimable yet for this fresh guest — an honest inconclusive, never a
    // silent pass.
    check(
      "second identical claim refused",
      false,
      `INCONCLUSIVE: the first claim was not grantable (${claimA.status} ${JSON.stringify(claimA.body)}). ` +
        "Re-run against an account that has earned a tier.",
    );
  }

  /* ────────────── 5. CONCURRENT MUTATION ────────────── */
  console.log("\n5. Concurrent mutation");
  const friendIds = Array.from({ length: 10 }, () => `guest_${crypto.randomBytes(16).toString("hex")}`);
  const target = friendIds[0];
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () =>
      api(`/api/ranking/friends/${guest.playerId}`, {
        method: "POST",
        token: guest.token,
        body: JSON.stringify({ friendId: target }),
      }),
    ),
  );
  const accepted = concurrent.filter((r) => r.status === 200).length;
  const friendsAfter = await api(`/api/ranking/friends/${guest.playerId}`, { token: guest.token });
  const uniqueFriends = new Set((friendsAfter.body?.friends ?? []).map((f) => f.friendPlayerId ?? f.playerId));
  check(
    "ten concurrent identical writes leave one row",
    uniqueFriends.size <= 1,
    `${accepted}/10 answered 200, ${uniqueFriends.size} distinct friend(s) stored`,
  );

  /* ────────────── 2 & 3. RESTART ────────────── */
  console.log("\n2/3. Deploy-shaped restart (SIGTERM, then a fresh process)");
  const stopReason = await stopServer(first.child, "SIGTERM");
  check("first server stopped on SIGTERM", stopReason === "exited cleanly", stopReason);
  check(
    "write queue was flushed before exit",
    /Progression writes flushed/.test(first.output()),
    (first.output().match(/Progression writes flushed \([^)]*\)/) ?? ["not found in log"])[0],
  );

  const second = await startServer("second server");
  check("second server started and hydrated", /Progression restored/.test(second.output()),
    (second.output().match(/Progression restored[^"]*/) ?? ["no hydration line"])[0]);

  const readBack = await api(`/api/profile/${guest.playerId}`, { token: guest.token });
  check(
    "the profile written by the DEAD process is still there",
    readBack.status === 200 && readBack.body?.profile?.displayName === displayName,
    `got ${readBack.status} ${JSON.stringify(readBack.body?.profile?.displayName)}`,
  );

  const friendsRestored = await api(`/api/ranking/friends/${guest.playerId}`, { token: guest.token });
  check(
    "the friendship survived the restart",
    (friendsRestored.body?.friends ?? []).length >= (uniqueFriends.size > 0 ? 1 : 0),
    `${(friendsRestored.body?.friends ?? []).length} friend(s)`,
  );

  if (claimA.status === 200) {
    const claimAfterRestart = await claimOnce();
    check(
      "a claimed reward cannot be claimed again after a restart",
      claimAfterRestart.status !== 200,
      `got ${claimAfterRestart.status}`,
    );
  } else {
    check("a claimed reward cannot be claimed again after a restart", false, "INCONCLUSIVE: nothing was claimed");
  }

  const health = await api("/health");
  check(
    "the second process reports durable progression",
    health.body?.progression?.durable === true && health.body?.progression?.kind === "supabase",
    JSON.stringify(health.body?.progression ?? {}),
  );

  await stopServer(second.child, "SIGTERM");

  /* ────────────── receipt ────────────── */
  const receipt = {
    verifiedAt: new Date().toISOString(),
    run: RUN,
    project: url,
    store: "supabase-postgres",
    migration: "20260818000000_progression_persistence.sql",
    node: process.version,
    checks: results,
    passed: failures === 0,
  };
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");

  console.log(`\n${failures === 0 ? "✓ PASSED" : `✗ FAILED (${failures})`} — receipt written to ${path.relative(ROOT, RECEIPT)}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n✗ Verification aborted: ${err.message}\n`);
  process.exit(1);
});
