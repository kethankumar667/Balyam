import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  // Loose signatures: these stand in for socket.io's own, and the tests only
  // assert on call counts.
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  timeout: ReturnType<typeof vi.fn>;
  io: { on: ReturnType<typeof vi.fn> };
}

/** Whether the fake server answers the liveness probe. */
let pingAnswers = true;

let fakeSocket: FakeSocket;
let ioOptions: Record<string, unknown> | undefined;
let windowListeners: Map<string, Array<() => void>>;
let documentListeners: Map<string, Array<() => void>>;
let visibility: string;

vi.mock("socket.io-client", () => ({
  io: vi.fn((_url: string, opts: Record<string, unknown>) => {
    ioOptions = opts;
    return fakeSocket;
  }),
}));

function fire(map: Map<string, Array<() => void>>, event: string): void {
  for (const fn of map.get(event) ?? []) fn();
}

beforeEach(() => {
  vi.resetModules();
  ioOptions = undefined;
  visibility = "visible";
  windowListeners = new Map();
  documentListeners = new Map();
  pingAnswers = true;

  fakeSocket = {
    connected: false,
    connect: vi.fn(() => {
      fakeSocket.connected = true;
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
    io: { on: vi.fn() },
  };

  vi.stubGlobal("window", {
    addEventListener: (event: string, fn: () => void) => {
      if (!windowListeners.has(event)) windowListeners.set(event, []);
      windowListeners.get(event)!.push(fn);
    },
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
  });
  vi.stubGlobal("document", {
    addEventListener: (event: string, fn: () => void) => {
      if (!documentListeners.has(event)) documentListeners.set(event, []);
      documentListeners.get(event)!.push(fn);
    },
    get visibilityState() {
      return visibility;
    },
  });
});

afterEach(() => {
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
