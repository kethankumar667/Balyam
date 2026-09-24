import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAuthenticateResult } from "@shared/social/Session";

/**
 * WP3.0 client — the browser presents its credential on the shared socket, and
 * does so again whenever the answer to "who am I" could have changed.
 *
 * The socket, the token readers and the identity subscriptions are stood in for;
 * what is under test is WHEN a credential is presented and what is sent.
 */

type Listener = (...args: unknown[]) => void;
type Responder = (payload: { token: string }) => SessionAuthenticateResult | "timeout";
type AckFn = (err: Error | null, res?: SessionAuthenticateResult) => void;
type AuthSnapshot = { userId: string | null };
type AuthListener = (state: AuthSnapshot, prev: AuthSnapshot) => void;

interface FakeSocket {
  connected: boolean;
  on: (event: string, cb: Listener) => void;
  off: (event: string, cb: Listener) => void;
  emit: ReturnType<typeof vi.fn>;
  timeout: (ms: number) => { emit: (event: string, payload: { token: string }, ack: AckFn) => void };
  fire: (event: string) => void;
}

const OK: SessionAuthenticateResult = { ok: true, playerId: "p1", kind: "guest", expiresAt: 1 };

let socket: FakeSocket;
let respond: Responder;
let sent: string[];
let accessToken: string | undefined;
let guestToken: string | undefined;
let authListeners: AuthListener[];
let guestListeners: Set<() => void>;

function makeSocket(): FakeSocket {
  const handlers = new Map<string, Set<Listener>>();
  return {
    connected: true,
    on: (event, cb) => void handlers.set(event, (handlers.get(event) ?? new Set()).add(cb)),
    off: (event, cb) => void handlers.get(event)?.delete(cb),
    emit: vi.fn(),
    timeout: () => ({
      emit: (_event, payload, ack) => {
        sent.push(payload.token);
        const res = respond(payload);
        if (res === "timeout") ack(new Error("timeout"));
        else ack(null, res);
      },
    }),
    fire: (event) => handlers.get(event)?.forEach((cb) => cb()),
  };
}

async function loadModule() {
  vi.resetModules();
  vi.doMock("../socket", () => ({ getSocket: () => socket }));
  vi.doMock("../../store/authStore", () => ({
    currentAccessToken: () => accessToken,
    useAuthStore: {
      subscribe: (cb: AuthListener) => {
        authListeners.push(cb);
        return () => {
          authListeners = authListeners.filter((l) => l !== cb);
        };
      },
    },
  }));
  vi.doMock("../playerIdentity", () => ({
    currentGuestToken: () => guestToken,
    subscribeGuestId: (cb: () => void) => {
      guestListeners.add(cb);
      return () => guestListeners.delete(cb);
    },
  }));
  return import("../socketSession");
}

/** Lets the promise chain behind a presented credential settle. */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("WP3.0 client — socket session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socket = makeSocket();
    respond = () => OK;
    sent = [];
    accessToken = undefined;
    guestToken = "guest-token";
    authListeners = [];
    guestListeners = new Set();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("../socket");
    vi.doUnmock("../../store/authStore");
    vi.doUnmock("../playerIdentity");
  });

  it("presents the guest token as soon as it is installed on a connected socket", async () => {
    const { installSocketSession } = await loadModule();

    installSocketSession();
    await settle();

    expect(sent).toEqual(["guest-token"]);
  });

  it("prefers the signed-in account's token over the guest one", async () => {
    accessToken = "member-token";
    const { installSocketSession } = await loadModule();

    installSocketSession();
    await settle();

    expect(sent).toEqual(["member-token"]);
  });

  it("presents again on every reconnect, because the server forgets a dropped connection", async () => {
    const { installSocketSession } = await loadModule();
    installSocketSession();
    await settle();

    socket.fire("connect");
    await settle();
    socket.fire("connect");
    await settle();

    expect(sent).toHaveLength(3);
  });

  it("waits for the connection rather than emitting into the void", async () => {
    socket.connected = false;
    const { installSocketSession } = await loadModule();

    installSocketSession();
    await settle();
    expect(sent).toEqual([]);

    socket.connected = true;
    socket.fire("connect");
    await settle();
    expect(sent).toEqual(["guest-token"]);
  });

  it("presents again when the signed-in user changes, but not for unrelated store updates", async () => {
    const { installSocketSession } = await loadModule();
    installSocketSession();
    await settle();
    sent.length = 0;

    accessToken = "member-token";
    authListeners.forEach((cb) => cb({ userId: "u1" }, { userId: null }));
    await settle();
    expect(sent).toEqual(["member-token"]);

    authListeners.forEach((cb) => cb({ userId: "u1" }, { userId: "u1" }));
    await settle();
    expect(sent).toEqual(["member-token"]);
  });

  it("falls back to the guest identity on sign-out, so the old account's rooms are left", async () => {
    accessToken = "member-token";
    const { installSocketSession } = await loadModule();
    installSocketSession();
    await settle();
    sent.length = 0;

    accessToken = undefined;
    authListeners.forEach((cb) => cb({ userId: null }, { userId: "u1" }));
    await settle();

    expect(sent).toEqual(["guest-token"]);
  });

  it("presents again when the device's guest identity changes", async () => {
    const { installSocketSession } = await loadModule();
    installSocketSession();
    await settle();
    sent.length = 0;

    guestToken = "new-guest-token";
    guestListeners.forEach((cb) => cb());
    await settle();

    expect(sent).toEqual(["new-guest-token"]);
  });

  it("ends the session instead of sending nothing when the browser has no credential at all", async () => {
    guestToken = undefined;
    const { installSocketSession } = await loadModule();

    installSocketSession();
    await settle();

    expect(sent).toEqual([]);
    expect(socket.emit).toHaveBeenCalledWith("session:end");
  });

  it("refreshes well inside the server's session lifetime", async () => {
    const { installSocketSession, SESSION_REFRESH_MS } = await loadModule();
    installSocketSession();
    await settle();
    sent.length = 0;

    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_MS);

    expect(sent).toHaveLength(1);
    expect(SESSION_REFRESH_MS).toBeLessThan(30 * 60 * 1000);
  });

  it("retries after a timeout, a few times and then stops", async () => {
    respond = () => "timeout";
    const { installSocketSession, RETRY_DELAY_MS, MAX_RETRIES } = await loadModule();

    installSocketSession();
    await settle();
    for (let i = 0; i < MAX_RETRIES + 2; i++) await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);

    expect(sent).toHaveLength(1 + MAX_RETRIES);
  });

  it("does not hammer the server after a refusal that a retry cannot fix", async () => {
    respond = () => ({ ok: false, error: "INVALID_CREDENTIAL" });
    const { installSocketSession, RETRY_DELAY_MS } = await loadModule();

    installSocketSession();
    await settle();
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 3);

    expect(sent).toHaveLength(1);
  });

  it("stops listening and refreshing once cleaned up", async () => {
    const { installSocketSession, SESSION_REFRESH_MS } = await loadModule();
    const stop = installSocketSession();
    await settle();
    sent.length = 0;

    stop();
    socket.fire("connect");
    guestListeners.forEach((cb) => cb());
    authListeners.forEach((cb) => cb({ userId: "u1" }, { userId: null }));
    await vi.advanceTimersByTimeAsync(SESSION_REFRESH_MS * 2);

    expect(sent).toEqual([]);
    expect(authListeners).toHaveLength(0);
    expect(guestListeners.size).toBe(0);
  });
});
