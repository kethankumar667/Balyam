/**
 * Pre-deploy check: is the database migrated for THIS version of the server?
 *
 * The server refuses to boot when a table or function it needs is missing, which
 * is the right behaviour but a poor way to find out: by then the deploy has gone
 * out and the service is crash-looping. Run this first — locally, in CI, or as
 * Render's Pre-Deploy Command — and a missing migration fails the release before
 * any traffic moves.
 *
 * It only asks PostgREST whether things exist. It writes nothing and moves no
 * coins: the transfer functions refuse a null cap before touching a row, so
 * calling them with nulls proves they exist without side effects.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the same two the server uses).
 * Prints SCHEMA_READY and exits 0 only if nothing is missing. Exits 2 when it has
 * no credentials, so an unconfigured CI job is not mistaken for a pass.
 *
 * Usage:  node scripts/persistence/checkSchemaReady.mjs
 */

const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim();

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to check the schema. Nothing was checked.");
  process.exit(2);
}

const REWARD = "20261012000000_reward_gateway.sql";
const TRANSFER_CAP = "20261013000000_transfer_daily_cap.sql";
const FUND_CAP = "20261014000000_fund_coin_request_daily_cap.sql";

const TABLES = [
  ["reward_ledger", "reward_id", REWARD],
  ["account_risk", "player_id", REWARD],
  ["risk_events", "id", REWARD],
];

const nulls = (names) => Object.fromEntries(names.map((n) => [n, null]));
const FUNCTIONS = [
  [
    "transfer_wallet_coins_capped",
    nulls(["p_from_identity_id", "p_to_identity_id", "p_amount", "p_reason", "p_idempotency_key", "p_daily_cap", "p_day_start"]),
    TRANSFER_CAP,
  ],
  [
    "fund_coin_request_capped",
    nulls(["p_request_id", "p_payer_identity_id", "p_idempotency_key", "p_daily_cap", "p_day_start"]),
    FUND_CAP,
  ],
];

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const isMissing = (status, text) => status === 404 && /PGRST20[25]|Could not find the (table|function)/.test(text);

const missing = [];
let unreachable = null;

async function probe(label, migration, request) {
  try {
    const res = await request();
    const text = await res.text();
    if (isMissing(res.status, text)) missing.push({ label, migration });
    else if (res.status === 401 || res.status === 403) unreachable = `${res.status} from the database: check the service key`;
  } catch (err) {
    unreachable = `could not reach ${url}: ${err.message}`;
  }
}

for (const [table, column, migration] of TABLES) {
  await probe(`table ${table}`, migration, () => fetch(`${url}/rest/v1/${table}?select=${column}&limit=1`, { headers }));
}
for (const [fn, args, migration] of FUNCTIONS) {
  await probe(`function ${fn}`, migration, () =>
    fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) }),
  );
}

// Set the exit code and let the process end on its own: calling process.exit() while
// fetch connections are still closing trips a libuv assertion on Windows, which
// reports a crash code instead of a clean failure.
if (unreachable) {
  console.error(`Schema check could not complete: ${unreachable}`);
  process.exitCode = 2;
} else if (missing.length > 0) {
  console.error("\nThe database is not ready for this version of the server. Missing:");
  for (const m of missing) console.error(`  - ${m.label}  →  apply supabase/migrations/${m.migration}`);
  console.error("\nApply the named file(s), in date order, then deploy. See docs/runbooks/reward-gateway.md.\n");
  process.exitCode = 1;
} else {
  console.log("SCHEMA_READY");
}
