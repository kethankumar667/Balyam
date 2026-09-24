import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerSessionHandlers,
  requireSocketIdentity,
  requireSocketIdentityOrAck,
  SocketSessions,
  SESSION_TTL_MS,
} from "../socketSession.js";
import { SocketRateLimiter } from "../../lib/rateLimiter.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { clearGuestIdentityProvisioningCache, type PlayerIdentity } from "../../auth/identity.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import type { SessionAuthenticateResult } from "@shared/social/Session.js";

/**
 * WP3.0 — a socket proves who it is once, and every social event afterwards
 * takes that proven id. These tests drive the REAL handlers through a fake
 * socket that records what the handlers do to it (joins, leaves, data).
 */

const MEMBER_ID = "aaaaaaaa-1111-2222-3333-444444444444";
const OTHER_MEMBER_ID = "bbbbbbbb-1111-2222-3333-444444444444";

type Handler = (...args: unknown[]) => unknown;

function fakeSocket(id = "sock-1") {
  const handlers = new Map<string, Handler>();
  const rooms = new Set<string>([id]);
  const socket = {
    id,
    data: {} as Record<string, unknown>,
    disconnected: false,
    rooms,
    on: (event: string, handler: Handler) => void handlers.set(event, handler),
    join: vi.fn((room: string) => void rooms.add(room)),
    leave: vi.fn((room: string) => void rooms.delete(room)),
  };
  return { socket, handlers };
}

/** Invokes a registered handler and resolves with whatever it acked. */
async function emit(handlers: Map<string, Handler>, event: string, payload?: unknown) {
  const handler = handlers.get(event);
  if (!handler) throw new Error(`no handler registered for ${event}`);
  let acked: unknown;
  await handler(payload, (res: unknown) => {
    acked = res;
  });
  return acked as SessionAuthenticateResult;
}

/** Stands in for the Supabase-verified path: tokens named `member:<id>` resolve to that member. */
async function resolveMember(token: string | null | undefined): Promise<PlayerIdentity | null> {
  if (token?.startsWith("member:")) {
    return { kind: "member", playerId: token.slice("member:".length), email: null };
  }
  return null;
}

/** A verifier whose answer the test releases by hand, to interleave two authentications. */
function deferredResolver() {
  let release: (identity: PlayerIdentity | null) => void = () => undefined;
  const resolve = vi.fn(
    () =>
      new Promise<PlayerIdentity | null>((done) => {
        release = done;
      }),
  );
  return { resolve, release: (identity: PlayerIdentity | null) => release(identity) };
}

describe("WP3.0 — socket identity", () => {
  let sessions: SocketSessions;
  let limiter: SocketRateLimiter;

  beforeEach(() => {
    setProgressionRepository(new InMemoryProgressionRepository());
    clearGuestIdentityProvisioningCache();
    sessions = new SocketSessions();
    limiter = new SocketRateLimiter(50, 50);
  });

  afterEach(() => {
    limiter.destroy();
    setProgressionRepository(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function connect(id = "sock-1", resolve?: typeof resolveMember) {
    const fake = fakeSocket(id);
    registerSessionHandlers(fake.socket as never, { sessions, limiter, resolveIdentity: resolve });
    return fake;
  }

  describe("authenticating", () => {
    it("binds a guest's verified id to the connection and joins their private room", async () => {
      const guest = mintGuestToken();
      const { socket, handlers } = connect();

      const res = await emit(handlers, "session:authenticate", { token: guest.token });

      expect(res).toMatchObject({ ok: true, playerId: guest.playerId, kind: "guest" });
      expect(requireSocketIdentity(socket as never, sessions)).toBe(guest.playerId);
      expect(socket.rooms.has(`user:${guest.playerId}`)).toBe(true);
    });

    it("binds a member's verified id the same way", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);

      const res = await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      expect(res).toMatchObject({ ok: true, playerId: MEMBER_ID, kind: "member" });
      expect(requireSocketIdentity(socket as never, sessions)).toBe(MEMBER_ID);
    });

    it("refuses a token that does not verify, and leaves the connection anonymous", async () => {
      const { socket, handlers } = connect();

      const res = await emit(handlers, "session:authenticate", { token: "garbage" });

      expect(res).toEqual({ ok: false, error: "INVALID_CREDENTIAL" });
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
      expect(socket.join).not.toHaveBeenCalled();
    });

    it.each([
      ["a missing payload", undefined],
      ["a payload with no token", {}],
      ["a numeric token", { token: 42 }],
      ["an object token", { token: { $ne: null } }],
      ["an empty token", { token: "" }],
      ["an oversized token", { token: "x".repeat(5000) }],
    ])("refuses %s without ever calling the verifier", async (_label, payload) => {
      const resolve = vi.fn(resolveMember);
      const { socket, handlers } = connect("sock-1", resolve);

      const res = await emit(handlers, "session:authenticate", payload);

      expect(res).toEqual({ ok: false, error: "INVALID_CREDENTIAL" });
      expect(resolve).not.toHaveBeenCalled();
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
    });

    it("ignores any player id the client puts in the payload", async () => {
      const guest = mintGuestToken();
      const { socket, handlers } = connect();

      await emit(handlers, "session:authenticate", { token: guest.token, playerId: MEMBER_ID });

      expect(requireSocketIdentity(socket as never, sessions)).toBe(guest.playerId);
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
    });

    it("reports a verifier crash as INTERNAL, not as a bad credential", async () => {
      const boom = vi.fn(async () => {
        throw new Error("supabase down");
      });
      const { socket, handlers } = connect("sock-1", boom);

      const res = await emit(handlers, "session:authenticate", { token: "member:x" });

      expect(res).toEqual({ ok: false, error: "INTERNAL" });
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
    });
  });

  describe("re-authenticating on the same connection", () => {
    it("leaves the previous person's private room when the identity changes", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      await emit(handlers, "session:authenticate", { token: `member:${OTHER_MEMBER_ID}` });

      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
      expect(socket.rooms.has(`user:${OTHER_MEMBER_ID}`)).toBe(true);
      expect(requireSocketIdentity(socket as never, sessions)).toBe(OTHER_MEMBER_ID);
      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
      expect(sessions.isConnected(OTHER_MEMBER_ID)).toBe(true);
    });

    it("drops the old identity even when the new credential is refused", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      const res = await emit(handlers, "session:authenticate", { token: "garbage" });

      expect(res).toEqual({ ok: false, error: "INVALID_CREDENTIAL" });
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
    });

    it("keeps the private room when the same person simply refreshes their session", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });
      socket.leave.mockClear();

      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      expect(socket.leave).not.toHaveBeenCalled();
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(true);
      expect(sessions.socketIdsFor(MEMBER_ID)).toEqual(["sock-1"]);
    });

    it("lets only the latest of two overlapping authentications win", async () => {
      const slow = deferredResolver();
      const resolve = vi.fn((token: string | null | undefined) =>
        token === "member:slow" ? slow.resolve() : resolveMember(`member:${OTHER_MEMBER_ID}`),
      );
      const { socket, handlers } = connect("sock-1", resolve);

      const first = emit(handlers, "session:authenticate", { token: "member:slow" });
      const second = await emit(handlers, "session:authenticate", { token: "member:fast" });
      slow.release({ kind: "member", playerId: MEMBER_ID, email: null });
      const firstResult = await first;

      expect(second).toMatchObject({ ok: true, playerId: OTHER_MEMBER_ID });
      expect(firstResult).toEqual({ ok: false, error: "SUPERSEDED" });
      expect(requireSocketIdentity(socket as never, sessions)).toBe(OTHER_MEMBER_ID);
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
    });

    it("does not attach an identity that resolves after the socket has gone", async () => {
      const slow = deferredResolver();
      const { socket, handlers } = connect("sock-1", slow.resolve);

      const pending = emit(handlers, "session:authenticate", { token: "member:x" });
      socket.disconnected = true;
      slow.release({ kind: "member", playerId: MEMBER_ID, email: null });
      await pending;

      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe("ending a session", () => {
    it("forgets the identity and leaves the private room on session:end", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      await emit(handlers, "session:end");

      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
    });

    it("cancels an authentication still in flight when the person signs out", async () => {
      const slow = deferredResolver();
      const { socket, handlers } = connect("sock-1", slow.resolve);

      const pending = emit(handlers, "session:authenticate", { token: "member:x" });
      await emit(handlers, "session:end");
      slow.release({ kind: "member", playerId: MEMBER_ID, email: null });
      const res = await pending;

      expect(res).toEqual({ ok: false, error: "SUPERSEDED" });
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
    });

    it("clears the registry when the socket disconnects", async () => {
      const { handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });
      expect(sessions.isConnected(MEMBER_ID)).toBe(true);

      handlers.get("disconnect")?.();

      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
    });
  });

  describe("requireSocketIdentity", () => {
    it("is null for a connection that never authenticated", () => {
      const { socket } = connect();
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
    });

    it("expires the session after its TTL and tidies up after itself", async () => {
      vi.useFakeTimers();
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      vi.advanceTimersByTime(SESSION_TTL_MS - 1);
      expect(requireSocketIdentity(socket as never, sessions)).toBe(MEMBER_ID);

      vi.advanceTimersByTime(2);
      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(false);
      expect(sessions.isConnected(MEMBER_ID)).toBe(false);
    });

    it("refuses through the ack, with the standard error, when there is no session", () => {
      const { socket } = connect();
      const ack = vi.fn();

      const playerId = requireSocketIdentityOrAck(socket as never, ack, sessions);

      expect(playerId).toBeNull();
      expect(ack).toHaveBeenCalledWith({ ok: false, error: "UNAUTHENTICATED" });
    });

    it("stays silent through the ack when there is a live session", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });
      const ack = vi.fn();

      expect(requireSocketIdentityOrAck(socket as never, ack, sessions)).toBe(MEMBER_ID);
      expect(ack).not.toHaveBeenCalled();
    });

    it("does not pull the private room out from under Mandali when the session ends", async () => {
      const { socket, handlers } = connect("sock-1", resolveMember);
      await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });
      socket.data.mandaliPlayer = { playerId: MEMBER_ID };

      await emit(handlers, "session:end");

      expect(requireSocketIdentity(socket as never, sessions)).toBeNull();
      expect(socket.rooms.has(`user:${MEMBER_ID}`)).toBe(true);
    });

    it("reports an expiry time that matches the TTL", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000_000);
      const { handlers } = connect("sock-1", resolveMember);

      const res = await emit(handlers, "session:authenticate", { token: `member:${MEMBER_ID}` });

      expect(res).toMatchObject({ ok: true, expiresAt: 1_000_000 + SESSION_TTL_MS });
    });
  });

  describe("abuse limits", () => {
    it("rate-limits authentication attempts per connection before verifying anything", async () => {
      const tight = new SocketRateLimiter(2, 0);
      const resolve = vi.fn(resolveMember);
      const fake = fakeSocket();
      registerSessionHandlers(fake.socket as never, { sessions, limiter: tight, resolveIdentity: resolve });

      const results: SessionAuthenticateResult[] = [];
      for (let i = 0; i < 4; i++) {
        results.push(await emit(fake.handlers, "session:authenticate", { token: "garbage" }));
      }
      tight.destroy();

      expect(results.map((r) => (r.ok ? "ok" : r.error))).toEqual([
        "INVALID_CREDENTIAL",
        "INVALID_CREDENTIAL",
        "RATE_LIMITED",
        "RATE_LIMITED",
      ]);
      expect(resolve).toHaveBeenCalledTimes(2);
    });

    it("gives each connection its own budget", async () => {
      const tight = new SocketRateLimiter(1, 0);
      const a = fakeSocket("sock-a");
      const b = fakeSocket("sock-b");
      registerSessionHandlers(a.socket as never, { sessions, limiter: tight, resolveIdentity: resolveMember });
      registerSessionHandlers(b.socket as never, { sessions, limiter: tight, resolveIdentity: resolveMember });

      await emit(a.handlers, "session:authenticate", { token: "garbage" });
      const spent = await emit(a.handlers, "session:authenticate", { token: "garbage" });
      const untouched = await emit(b.handlers, "session:authenticate", { token: "garbage" });
      tight.destroy();

      expect(spent).toEqual({ ok: false, error: "RATE_LIMITED" });
      expect(untouched).toEqual({ ok: false, error: "INVALID_CREDENTIAL" });
    });
  });

  describe("SocketSessions registry", () => {
    it("tracks several connections for one person, and forgets each independently", () => {
      sessions.attach("p1", "s1");
      sessions.attach("p1", "s2");
      sessions.attach("p2", "s3");

      expect(sessions.socketIdsFor("p1").sort()).toEqual(["s1", "s2"]);

      sessions.detach("s1");
      expect(sessions.isConnected("p1")).toBe(true);
      sessions.detach("s2");
      expect(sessions.isConnected("p1")).toBe(false);
      expect(sessions.isConnected("p2")).toBe(true);
    });

    it("moves a socket to its new owner rather than listing it under two people", () => {
      sessions.attach("p1", "s1");
      sessions.attach("p2", "s1");

      expect(sessions.socketIdsFor("p1")).toEqual([]);
      expect(sessions.socketIdsFor("p2")).toEqual(["s1"]);
    });

    it("hands out copies, so a caller cannot edit the registry through what it was given", () => {
      sessions.attach("p1", "s1");

      sessions.socketIdsFor("p1").push("intruder");

      expect(sessions.socketIdsFor("p1")).toEqual(["s1"]);
    });

    it("says nothing about a person it has never seen", () => {
      expect(sessions.isConnected("nobody")).toBe(false);
      expect(sessions.socketIdsFor("nobody")).toEqual([]);
    });
  });
});
