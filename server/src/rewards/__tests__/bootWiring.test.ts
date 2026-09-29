import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The real server, booted for real. Unit tests build the gateway by hand; only
 * this proves the composition root wires it: the store is chosen in `boot()`
 * after progression's, the routes are mounted behind their guards, and the
 * sweeper starts. A wiring mistake in `index.ts` would pass every other test.
 */

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const tsxCli = path.join(serverRoot, "node_modules", "tsx", "dist", "cli.mjs");
const PORT = 4957;
const OPS_KEY = "boot-wiring-operational-key-0001";
const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess;
let output = "";

function waitForListening(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start in ${timeoutMs}ms. Output:\n${output}`)), timeoutMs);
    const onData = (d: unknown) => {
      output += String(d);
      if (/Server listening/.test(output)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early with ${code}. Output:\n${output}`));
    });
  });
}

describe("the real server wires the reward gateway", () => {
  beforeAll(async () => {
    child = spawn(process.execPath, [tsxCli, "src/index.ts"], {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: String(PORT),
        OPERATIONAL_SECRET: OPS_KEY,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        SUPABASE_SECRET_KEY: "",
      },
    });
    await waitForListening(45_000);
  }, 60_000);

  afterAll(() => {
    child?.kill();
  });

  it("chose and announced a reward store before opening the port", () => {
    expect(output).toMatch(/Reward gateway ready \(memory\)/);
    expect(output).not.toMatch(/Startup aborted/);
  });

  it("mounts the player rewards routes behind identity: anonymous is refused, not 404", async () => {
    const res = await fetch(`${BASE}/api/rewards/someone`);

    expect(res.status).toBe(401);
  });

  it("mounts the operator risk routes behind the operational key", async () => {
    expect((await fetch(`${BASE}/api/admin/risk`)).status).toBe(401);

    const authed = await fetch(`${BASE}/api/admin/risk`, { headers: { "x-operational-key": OPS_KEY } });
    expect(authed.status).toBe(200);
    expect(await authed.json()).toMatchObject({ accounts: [], counts: { WATCHLIST: 0, RESTRICTED: 0, UNDER_REVIEW: 0 } });
  });

  it("lets an operator set a state on the live server and read it back", async () => {
    const headers = { "x-operational-key": OPS_KEY, "Content-Type": "application/json" };

    const put = await fetch(`${BASE}/api/admin/risk/boot_smoke_player`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ state: "WATCHLIST", note: "smoke test" }),
    });
    const get = await fetch(`${BASE}/api/admin/risk/boot_smoke_player`, { headers });

    expect(put.status).toBe(200);
    expect(await get.json()).toMatchObject({ state: "WATCHLIST", record: { updatedBy: "ops-key" } });
  });
});
