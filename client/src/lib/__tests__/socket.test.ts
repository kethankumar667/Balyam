import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSocket } from "../socket";

/**
 * Socket reconnection behaviour.
 *
 * This pins the defect behind "my wifi dropped, mobile data came back, and I
 * could never get into my game again".
 *
 * The socket was created with `reconnectionAttempts: 10`. With socket.io's
 * default 5s delay cap that is roughly 37 seconds of effort, after which the
 * client emits `reconnect_failed` and NEVER TRIES AGAIN for the life of the
 * page. Any outage longer than that was unrecoverable without a reload, and
 * restoring the network did nothing because nothing was still asking.
 *
 * The numbers below are the contract. A future change that caps attempts
 * again, or drops the `online` listener, reintroduces exactly that bug — and
 * it is invisible in normal use, because it only shows up after a long
 * outage on a real network.
 */

interface FakeSocket {
  connected: boolean;
  emit: ReturnType<typeof vi.fn<unknown[], FakeSocket>>;
  sendBuffer: unknown[][];
  sent: unknown[][];
  // Loose signatures: these stand in for socket.io's own, and the tests only
  // assert on call counts.
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  timeout: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  io: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; engine?: { transport?: { name: string } } };
}

/** Whether the fake server answers the liveness probe. */
let pingAnswers = true;

let fakeSocket: FakeSocket;
let ioOptions: Record<string, unknown> | undefined;
let windowListeners: Map<string, Array<() => void>>;
let documentListeners: Map<string, Array<() => void>>;
let visibility: string;
let socketOverride: AppSocket | undefined;

vi.mock("socket.io-client", () => ({
  io: vi.fn((_url: string, opts: Record<string, unknown>) => {
    ioOptions = opts;
    return socketOverride ?? fakeSocket;
  }),
}));

function fire(map: Map<string, Array<() => void>>, event: string): void {
  for (const fn of map.get(event) ?? []) fn();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  ioOptions = undefined;
  socketOverride = undefined;
  visibility = "visible";
  windowListeners = new Map();
  documentListeners = new Map();
  pingAnswers = true;

  fakeSocket = {
    connected: false,
    sendBuffer: [],
    sent: [],
    emit: vi.fn(function (this: FakeSocket, ...args: unknown[]) {
      if (this.connected) this.sent.push(args);
      else this.sendBuffer.push(args);
      return this;
    }),
    connect: vi.fn(() => {
      fakeSocket.connected = true;
      fakeSocket.sent.push(...fakeSocket.sendBuffer.splice(0));
      return fakeSocket;
    }) as unknown as ReturnType<typeof vi.fn>,
    disconnect: vi.fn(() => {
      fakeSocket.connected = false;
      return fakeSocket;
    }) as unknown as ReturnType<typeof vi.fn>,
    // socket.timeout(ms).emit(event, ack) — ack receives an error first arg
    // when the server does not answer in time.
    timeout: vi.fn(() => ({
      emit: (_event: string, ack: (err: unknown) => void) => {
        ack(pingAnswers ? null : new Error("timeout"));
      },
    })) as unknown as ReturnType<typeof vi.fn>,
    on: vi.fn(),
    io: { on: vi.fn(), off: vi.fn(), engine: { transport: { name: "websocket" } } },
  };

  // connectionLog writes every socket event to localStorage. It is built to
  // swallow failures, but stubbing it keeps the tests honest about what the
  // telemetry actually records.
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  });

  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("window", {
    addEventListener: (event: string, fn: () => void) => {
      if (!windowListeners.has(event)) windowListeners.set(event, []);
      windowListeners.get(event)!.push(fn);
    },
    removeEventListener: (event: string, fn: () => void) => {
      windowListeners.set(event, (windowListeners.get(event) ?? []).filter((listener) => listener !== fn));
    },
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  });
  vi.stubGlobal("document", {
    addEventListener: (event: string, fn: () => void) => {
      if (!documentListeners.has(event)) documentListeners.set(event, []);
      documentListeners.get(event)!.push(fn);
    },
    removeEventListener: (event: string, fn: () => void) => {
      documentListeners.set(event, (documentListeners.get(event) ?? []).filter((listener) => listener !== fn));
    },
    get visibilityState() {
      return visibility;
    },
  });
});

afterEach(async () => {
  (await import("../socket")).disconnectSocket();
  (await import("../../core/recovery/ConnectionStateManager")).connectionStateManager.reset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loadSocket() {
  return (await import("../socket")).getSocket();
}

describe("reconnection policy", () => {
  it("never stops retrying", async () => {
    await loadSocket();
    // The whole bug in one assertion. A finite value here means the client
    // gives up while the player is still trying to come back.
    expect(ioOptions?.reconnectionAttempts).toBe(Infinity);
  });

  it("retries on a bounded backoff rather than hammering or stalling", async () => {
    await loadSocket();
    expect(ioOptions?.reconnection).toBe(true);
    expect(Number(ioOptions?.reconnectionDelay)).toBeGreaterThan(0);
    // Capped, so a long outage keeps probing every few seconds instead of
    // backing off into hours.
    expect(Number(ioOptions?.reconnectionDelayMax)).toBeLessThanOrEqual(10_000);
    // Jittered, so a server restart is not hit by every client at once.
    expect(Number(ioOptions?.randomizationFactor)).toBeGreaterThan(0);
  });
});

describe("network-return triggers", () => {
  it("reconnects the moment the device comes back online", async () => {
    await loadSocket();
    fakeSocket.connected = false;
    fakeSocket.connect.mockClear();

    fire(windowListeners, "online");

    // Without this the socket sits out its backoff wait after connectivity
    // is already restored — and on the old config it may have exhausted its
    // attempts entirely while the radio was switching.
    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it("reconnects when a backgrounded tab becomes visible again", async () => {
    await loadSocket();
    fakeSocket.connected = false;
    fakeSocket.connect.mockClear();

    visibility = "visible";
    fire(documentListeners, "visibilitychange");

    // Mobile browsers freeze background tabs including their timers, so a
    // phone locked for ten minutes wakes with no pending retry and no
    // `online` event — the network never changed from its point of view.
    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it("does nothing when the tab is hidden", async () => {
    await loadSocket();
    fakeSocket.connected = false;
    fakeSocket.connect.mockClear();

    visibility = "hidden";
    fire(documentListeners, "visibilitychange");

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it("leaves a genuinely healthy socket alone", async () => {
    await loadSocket();
    fakeSocket.connected = true;
    pingAnswers = true;
    fakeSocket.connect.mockClear();
    fakeSocket.disconnect.mockClear();

    fire(windowListeners, "online");
    fire(documentListeners, "visibilitychange");

    // It probes, but a live socket must not be torn down and rebuilt.
    expect(fakeSocket.disconnect).not.toHaveBeenCalled();
  });

  it("rebuilds a socket that CLAIMS to be connected but answers nothing", async () => {
    await loadSocket();
    // The wifi-to-mobile-data case. The old transport is dead but no close
    // frame ever arrived, so `connected` is still true and the naive check
    // `if (!connected) connect()` did nothing at all — the socket sat on a
    // corpse until the heartbeat timed out tens of seconds later.
    fakeSocket.connected = true;
    pingAnswers = false;
    fakeSocket.connect.mockClear();
    fakeSocket.disconnect.mockClear();

    fire(windowListeners, "online");

    expect(fakeSocket.disconnect).toHaveBeenCalled();
    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it("installs a last-resort retry if attempts are ever capped again", async () => {
    await loadSocket();
    // Defensive: with Infinity this never fires, but a future change that
    // caps attempts must not leave the socket permanently dead.
    const registered = fakeSocket.io.on.mock.calls.map((c) => c[0]);
    expect(registered).toContain("reconnect_failed");
  });

  it("registers its listeners only once across repeated getSocket calls", async () => {
    const { getSocket } = await import("../socket");
    getSocket();
    getSocket();
    getSocket();
    // Every component calls getSocket(); duplicated listeners would fire a
    // reconnect storm on a single `online` event.
    expect(windowListeners.get("online")?.length).toBe(1);
  });
});

describe("outgoing move safety", () => {
  it.each(["DISCONNECTED", "RECONNECTING", "RECOVERING", "FAILED"] as const)(
    "drops moves before native emit while room readiness is %s",
    async (state) => {
      const originalEmit = fakeSocket.emit;
      const socket = await loadSocket();
      const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
      connectionStateManager.transition(state);

      expect(socket.emit("game:move", { type: "roll" })).toBe(socket);

      expect(originalEmit).not.toHaveBeenCalled();
      expect(fakeSocket.sendBuffer).toEqual([]);
      expect(fakeSocket.sent).toEqual([]);
      connectionStateManager.transition("CONNECTED");
      fakeSocket.connect();
      expect(fakeSocket.sent).toEqual([]);
    },
  );

  it.each(["disconnected", "offline"] as const)("drops %s moves without replay", async (condition) => {
    const originalEmit = fakeSocket.emit;
    const socket = await loadSocket();
    const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
    connectionStateManager.transition("CONNECTED");
    if (condition === "disconnected") fakeSocket.connected = false;
    else vi.stubGlobal("navigator", { onLine: false });

    expect(socket.emit("game:move", { type: "roll", actionId: "stale" })).toBe(socket);

    expect(originalEmit).not.toHaveBeenCalled();
    expect(fakeSocket.sendBuffer).toEqual([]);
    vi.stubGlobal("navigator", { onLine: true });
    fakeSocket.connect();
    expect(fakeSocket.sent).toEqual([]);
  });

  it.each(["CONNECTED", "RECOVERED"] as const)("sends ready moves in %s with unchanged keys and payloads", async (state) => {
    const originalEmit = fakeSocket.emit;
    const socket = await loadSocket();
    const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
    connectionStateManager.transition(state);
    const payload = Object.freeze({ type: "roll", data: { value: 6 }, playerId: "local-seat", actionId: "existing", requestId: "request" });

    expect(socket.emit("game:move", payload)).toBe(socket);

    expect(originalEmit).toHaveBeenCalledOnce();
    expect(originalEmit).toHaveBeenCalledWith("game:move", payload);
    expect(fakeSocket.sent).toEqual([["game:move", payload]]);
  });

  it("adds distinct action IDs to unkeyed moves without mutating caller data", async () => {
    const socket = await loadSocket();
    const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
    connectionStateManager.transition("CONNECTED");
    const payload = Object.freeze({ type: "roll", playerId: "local-seat" });

    socket.emit("game:move", payload).emit("game:move", payload);

    const first = fakeSocket.sent[0]?.[1];
    const second = fakeSocket.sent[1]?.[1];
    expect(first).toEqual({ ...payload, actionId: expect.any(String) });
    expect(second).toEqual({ ...payload, actionId: expect.any(String) });
    expect(first).not.toEqual(second);
    expect(payload).not.toHaveProperty("actionId");
  });

  it("leaves room joins and pings untouched even while offline and recovering", async () => {
    const originalEmit = fakeSocket.emit;
    const socket = await loadSocket();
    const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
    connectionStateManager.transition("RECOVERING");
    fakeSocket.connected = false;
    vi.stubGlobal("navigator", { onLine: false });
    const join = { code: "ABCDEF", name: "Player" };
    const ack = vi.fn();

    expect(socket.emit("room:join", join, ack).emit("net:ping", ack)).toBe(socket);

    expect(originalEmit.mock.calls).toEqual([["room:join", join, ack], ["net:ping", ack]]);
    expect(fakeSocket.sendBuffer).toEqual([["room:join", join, ack], ["net:ping", ack]]);
  });

  it("never enters the real Socket.IO sendBuffer or replays dropped moves on connection", async () => {
    const native = await vi.importActual<typeof import("socket.io-client")>("socket.io-client");
    const realSocket: AppSocket = native.io("http://localhost:4000", { autoConnect: false, forceNew: true });
    socketOverride = realSocket;
    vi.spyOn(realSocket, "connect").mockReturnValue(realSocket);
    const originalEmit = vi.spyOn(realSocket, "emit");
    const write = vi.spyOn(realSocket.io, "_packet").mockImplementation(() => {});
    const socket = await loadSocket();
    const { connectionStateManager } = await import("../../core/recovery/ConnectionStateManager");
    connectionStateManager.transition("CONNECTED");

    socket.emit("game:move", { type: "roll" });
    realSocket.connected = true;
    connectionStateManager.transition("RECOVERING");
    socket.emit("game:move", { type: "roll" });
    connectionStateManager.transition("CONNECTED");
    vi.stubGlobal("navigator", { onLine: false });
    socket.emit("game:move", { type: "roll" });

    expect(originalEmit).not.toHaveBeenCalled();
    expect(realSocket.sendBuffer).toEqual([]);
    vi.stubGlobal("navigator", { onLine: true });
    Reflect.apply(Reflect.get(realSocket, "onconnect"), realSocket, ["reconnected-id"]);
    expect(write).not.toHaveBeenCalled();
    expect(realSocket.sendBuffer).toEqual([]);
    socket.emit("game:move", { type: "roll", actionId: "fresh" });
    expect(originalEmit).toHaveBeenCalledOnce();
    expect(originalEmit).toHaveBeenCalledWith("game:move", { type: "roll", actionId: "fresh" });
    expect(write).toHaveBeenCalledOnce();
  });
});

describe("singleton teardown", () => {
  it("removes browser callbacks and pending retries, then installs recovery for the replacement", async () => {
    const { getSocket, disconnectSocket } = await import("../socket");
    getSocket();
    const oldSocket = fakeSocket;
    for (const [event, listener] of oldSocket.io.on.mock.calls) {
      if (event === "reconnect_failed") listener();
    }

    disconnectSocket();
    oldSocket.connect.mockClear();
    fire(windowListeners, "online");
    fire(windowListeners, "focus");
    fire(documentListeners, "visibilitychange");
    vi.runAllTimers();
    expect(oldSocket.connect).not.toHaveBeenCalled();

    fakeSocket = {
      ...oldSocket,
      connected: false,
      connect: vi.fn(() => fakeSocket) as unknown as ReturnType<typeof vi.fn>,
    };
    getSocket();
    fakeSocket.connect.mockClear();
    fire(windowListeners, "online");
    expect(fakeSocket.connect).toHaveBeenCalledOnce();
    expect(oldSocket.connect).not.toHaveBeenCalled();
    expect(windowListeners.get("online")).toHaveLength(1);
  });

  it("does not auto-connect after an explicit server disconnect", async () => {
    const { getSocket } = await import("../socket");
    getSocket();
    fakeSocket.connected = false;
    for (const [event, listener] of fakeSocket.on.mock.calls) {
      if (event === "disconnect") listener("io server disconnect");
    }
    fakeSocket.connect.mockClear();

    fire(windowListeners, "online");
    fire(windowListeners, "focus");
    fire(documentListeners, "visibilitychange");
    getSocket();
    vi.runAllTimers();

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });
});
