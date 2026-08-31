import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Response } from "express";
import { RoomManager } from "../../rooms/RoomManager.js";
import { TelemetryBroadcastHub } from "../OperationalController.js";

/**
 * TelemetryBroadcastHub lifecycle — singleton tick sharing, backpressure,
 * and subscriber cleanup, all under deterministic fake timers.
 *
 * Uses a fresh `TelemetryBroadcastHub` instance per test (the exported
 * `telemetryBroadcastHub` is a process-wide singleton by design — these
 * tests exercise the class's own mechanics, not that specific instance).
 */

function makeMockIo() {
  const sockets = new Map<string, unknown>();
  return { sockets: { sockets }, to: vi.fn(() => ({ emit: vi.fn() })) } as unknown as ConstructorParameters<
    typeof RoomManager
  >[0];
}

interface MockRes {
  res: Response;
  writes: string[];
  setWriteReturn: (v: boolean) => void;
  fire: (event: "drain" | "error" | "close") => void;
}

function makeMockResponse(): MockRes {
  const listeners: Record<string, Array<() => void>> = {};
  const writes: string[] = [];
  let writeReturn = true;
  const res = {
    write: vi.fn((chunk: string) => {
      writes.push(chunk);
      return writeReturn;
    }),
    once: vi.fn((event: string, cb: () => void) => {
      (listeners[event] ??= []).push(cb);
    }),
  } as unknown as Response;
  return {
    res,
    writes,
    setWriteReturn: (v: boolean) => {
      writeReturn = v;
    },
    fire: (event) => {
      for (const cb of listeners[event] ?? []) cb();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("TelemetryBroadcastHub", () => {
  it("the first subscriber starts exactly one timer", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const a = makeMockResponse();

    const setIntervalSpy = vi.spyOn(global, "setInterval");
    hub.register(a.res);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    const b = makeMockResponse();
    hub.register(b.res);
    // A second subscriber must not start a second timer.
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
  });

  it("multiple subscribers share one computed, serialized tick", () => {
    const roomManager = new RoomManager(makeMockIo());
    const statsSpy = vi.spyOn(roomManager, "getOperationalDetailedStats");
    const hub = new TelemetryBroadcastHub();
    hub.init(roomManager);

    const a = makeMockResponse();
    const b = makeMockResponse();
    const c = makeMockResponse();
    hub.register(a.res);
    hub.register(b.res);
    hub.register(c.res);
    statsSpy.mockClear(); // clear the per-registration "force initial tick" calls

    vi.advanceTimersByTime(1000);

    // One tick, one computation — not one per subscriber.
    expect(statsSpy).toHaveBeenCalledTimes(1);
    // Each subscriber's own registration wrote once (either the forced
    // initial broadcast, for whoever triggered it, or the then-current
    // cached message for the others); this tick added exactly one more
    // write to each — never one write per subscriber for a shared tick.
    expect(a.writes.length).toBe(2);
    expect(b.writes.length).toBe(2);
    expect(c.writes.length).toBe(2);
    // The tick's payload itself — the thing actually computed once — is
    // byte-identical across every subscriber.
    expect(a.writes[a.writes.length - 1]).toBe(b.writes[b.writes.length - 1]);
    expect(b.writes[b.writes.length - 1]).toBe(c.writes[c.writes.length - 1]);
  });

  it("a slow consumer is paused on backpressure and does not block healthy consumers", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const slow = makeMockResponse();
    const healthy = makeMockResponse();
    hub.register(slow.res);
    hub.register(healthy.res);

    slow.setWriteReturn(false); // simulate a full write buffer
    vi.advanceTimersByTime(1000);
    expect(slow.writes.length).toBe(2); // initial + this tick's attempt
    expect(healthy.writes.length).toBe(2);

    // Slow client stays paused — no further write attempts while paused.
    vi.advanceTimersByTime(1000);
    expect(slow.writes.length).toBe(2);
    // Healthy client is unaffected and keeps receiving every tick.
    expect(healthy.writes.length).toBe(3);
  });

  it("drain resumes a paused consumer on the next tick", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const client = makeMockResponse();
    hub.register(client.res);

    client.setWriteReturn(false);
    vi.advanceTimersByTime(1000);
    expect(client.writes.length).toBe(2);

    client.setWriteReturn(true);
    client.fire("drain");
    vi.advanceTimersByTime(1000);
    expect(client.writes.length).toBe(3); // resumed, wrote again
  });

  it("request close (via res 'close') deregisters the client", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const client = makeMockResponse();
    hub.register(client.res);
    expect(hub.getSubscriberCount()).toBe(1);

    client.fire("close");
    expect(hub.getSubscriberCount()).toBe(0);
  });

  it("a response error deregisters the client", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const client = makeMockResponse();
    hub.register(client.res);

    client.fire("error");
    expect(hub.getSubscriberCount()).toBe(0);
  });

  it("a failed write during a tick deregisters that client", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const client = makeMockResponse();
    hub.register(client.res);
    (client.res.write as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("broken pipe");
    });

    vi.advanceTimersByTime(1000);
    expect(hub.getSubscriberCount()).toBe(0);
  });

  it("the last subscriber leaving stops the timer and clears the cached tick", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const client = makeMockResponse();
    hub.register(client.res);

    client.fire("close");
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    clearIntervalSpy.mockRestore();
  });

  it("a later subscriber, after the hub went idle, gets a fresh initial snapshot rather than a stale one", () => {
    const roomManager = new RoomManager(makeMockIo());
    const statsSpy = vi.spyOn(roomManager, "getOperationalDetailedStats");
    const hub = new TelemetryBroadcastHub();
    hub.init(roomManager);

    const first = makeMockResponse();
    hub.register(first.res);
    const callsAfterFirst = statsSpy.mock.calls.length;
    first.fire("close"); // idle again — cache cleared

    const second = makeMockResponse();
    hub.register(second.res);
    // A brand-new computation ran for the new subscriber — not a reuse of
    // whatever `first` last saw.
    expect(statsSpy.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    expect(second.writes.length).toBe(1);
  });

  it("cleanup is idempotent — deregistering twice does not throw or double-stop", () => {
    const hub = new TelemetryBroadcastHub();
    hub.init(new RoomManager(makeMockIo()));
    const client = makeMockResponse();
    hub.register(client.res);

    expect(() => {
      hub.deregister(client.res);
      hub.deregister(client.res);
    }).not.toThrow();
    expect(hub.getSubscriberCount()).toBe(0);
  });
});
