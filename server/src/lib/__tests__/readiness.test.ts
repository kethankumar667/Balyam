import { afterEach, describe, expect, it, vi } from "vitest";
import { createReadinessCheck, readinessHandler } from "../readiness.js";
import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

afterEach(() => { vi.useRealTimers(); });

describe("dependency readiness", () => {
  it("serves 200, then 503 on failure, then 200 after recovery, and 503 during shutdown", async () => {
    let failed = false;
    let stopping = false;
    const app = express();
    app.get("/ready", readinessHandler(createReadinessCheck({
      storage: async () => { if (failed) throw new Error("private secret"); },
    }, { cacheMs: 0 }), () => stopping));
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ready`;
    try {
      expect((await fetch(url)).status).toBe(200);
      failed = true;
      const down = await fetch(url);
      expect(down.status).toBe(503);
      expect(down.headers.get("cache-control")).toBe("no-store");
      expect(await down.json()).toEqual({ status: "not_ready", checks: { storage: false } });
      failed = false;
      expect((await fetch(url)).status).toBe(200);
      stopping = true;
      expect((await fetch(url)).status).toBe(503);
    } finally {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("reports all probes and recovers after an outage without exposing errors", async () => {
    let unavailable = true;
    const check = createReadinessCheck({
      snapshots: async () => { if (unavailable) throw new Error("private-path-or-key"); },
      progression: async () => {},
    }, { cacheMs: 0 });
    expect(await check()).toEqual({
      status: "not_ready", checks: { snapshots: false, progression: true },
    });
    unavailable = false;
    expect((await check()).status).toBe("ready");
  });

  it("coalesces concurrent requests and caches probes briefly", async () => {
    const ping = vi.fn(async () => {});
    const check = createReadinessCheck({ snapshots: ping });
    await Promise.all([check(), check(), check()]);
    await check();
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("fails a hanging probe within a bounded time", async () => {
    vi.useFakeTimers();
    const check = createReadinessCheck({ snapshots: () => new Promise(() => {}) }, { timeoutMs: 50 });
    const result = check();
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toEqual({ status: "not_ready", checks: { snapshots: false } });
  });
});
