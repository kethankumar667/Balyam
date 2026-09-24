import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import {
  MAX_SESSION_TOKEN_LENGTH,
  UNAUTHENTICATED,
  type SessionAuthenticateResult,
} from "@shared/social/Session.js";
import { resolvePlayerIdentity, type PlayerIdentity } from "../auth/identity.js";
import { SocketRateLimiter } from "../lib/rateLimiter.js";
import { logger } from "../lib/logger.js";

/**
 * Socket identity — who a connection belongs to, proven once and remembered.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * The main socket layer had no notion of a person: `room:create` hands out a
 * per-room SEAT id, and nothing ever tied a connection to a verified account.
 * Mandali fixed that for itself (`mandali:authenticate`), which is exactly the
 * trap — each social feature growing its own private handshake. Presence, DMs
 * and the activity feed all need "which verified person is on this socket", so
 * they share this one.
 *
 * The client sends its bearer token, the server verifies it with the same
 * `resolvePlayerIdentity` the HTTP middleware uses, and the result lives on
 * `socket.data.session` — per-connection state Socket.IO drops on disconnect.
 * Nothing a handler later reads about "who is asking" comes from a payload.
 *
 * ── Deliberate choices ────────────────────────────────────────────────
 * • Sessions EXPIRE (`SESSION_TTL_MS`). A token is verified once, so without a
 *   ceiling a revoked or expired login would keep working on an open tab for as
 *   long as the tab stayed open. The client re-presents its token well inside
 *   the window; a tab that stops doing so quietly loses social access.
 * • The last authentication wins. Two overlapping attempts (token refresh
 *   racing a sign-out) are ordered by a per-socket counter, so a slow verifier
 *   can never resurrect an identity the person has already left.
 * • A refused credential DROPS the previous identity rather than keeping it —
 *   a client that presented something bad is not entitled to what it had.
 * • Refusals are coarse (`SESSION_ERRORS`): the caller learns "did not verify",
 *   never why, so this cannot be used to probe tokens.
 * • The private room `user:<playerId>` is the address social events are pushed
 *   to. Mandali joins the same room; leaving it is skipped while Mandali still
 *   holds that same person, so a session expiring never silences Mandali.
 */

export const SESSION_TTL_MS = 30 * 60 * 1000;

/** Burst of 5 attempts, then one every 5 seconds — a real client needs one per connect. */
const AUTH_ATTEMPT_BURST = 5;
const AUTH_ATTEMPT_REFILL_PER_SEC = 0.2;

const sessionAuthLimiter = new SocketRateLimiter(AUTH_ATTEMPT_BURST, AUTH_ATTEMPT_REFILL_PER_SEC);

type SessionSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type IdentityResolver = (token: string | null | undefined) => Promise<PlayerIdentity | null>;
type Ack<T> = ((response: T) => void) | undefined;

interface SessionRecord {
  playerId: string;
  kind: PlayerIdentity["kind"];
  expiresAt: number;
}

interface SessionSocketData {
  session?: SessionRecord;
  /** Bumped by every authenticate / end, so a stale in-flight verification can be recognised. */
  sessionSeq?: number;
  /** Mandali's own binding; read only to avoid pulling its private room out from under it. */
  mandaliPlayer?: { playerId: string };
}

export const userRoom = (playerId: string): string => `user:${playerId}`;

/**
 * Which sockets currently belong to which verified person. The single place
 * "is this person connected, and where" is answered — presence (WP3) reads it
 * rather than keeping a second map that could drift from the real sessions.
 */
export class SocketSessions {
  private readonly playerBySocket = new Map<string, string>();
  private readonly socketsByPlayer = new Map<string, Set<string>>();

  attach(playerId: string, socketId: string): void {
    this.detach(socketId);
    this.playerBySocket.set(socketId, playerId);
    const sockets = this.socketsByPlayer.get(playerId) ?? new Set<string>();
    sockets.add(socketId);
    this.socketsByPlayer.set(playerId, sockets);
  }

  detach(socketId: string): void {
    const playerId = this.playerBySocket.get(socketId);
    if (playerId === undefined) return;
    this.playerBySocket.delete(socketId);
    const sockets = this.socketsByPlayer.get(playerId);
    sockets?.delete(socketId);
    if (sockets?.size === 0) this.socketsByPlayer.delete(playerId);
  }

  /** A copy: callers cannot edit the registry through what they were given. */
  socketIdsFor(playerId: string): string[] {
    return [...(this.socketsByPlayer.get(playerId) ?? [])];
  }

  isConnected(playerId: string): boolean {
    return this.socketsByPlayer.has(playerId);
  }
}

export const socketSessions = new SocketSessions();

function dataOf(socket: SessionSocket): SessionSocketData {
  return socket.data as SessionSocketData;
}

function leaveUserRoom(socket: SessionSocket, playerId: string): void {
  if (dataOf(socket).mandaliPlayer?.playerId === playerId) return;
  void socket.leave(userRoom(playerId));
}

function clearSession(socket: SessionSocket, sessions: SocketSessions): void {
  const data = dataOf(socket);
  const previous = data.session;
  data.session = undefined;
  sessions.detach(socket.id);
  if (previous) leaveUserRoom(socket, previous.playerId);
}

/**
 * The verified person behind this connection, or `null`.
 *
 * Every social socket handler starts here and uses nothing else to decide who
 * is acting. An expired session is cleaned up on the spot, so a caller never
 * sees a stale identity.
 */
export function requireSocketIdentity(
  socket: SessionSocket,
  sessions: SocketSessions = socketSessions,
): string | null {
  const session = dataOf(socket).session;
  if (!session) return null;
  if (Date.now() >= session.expiresAt) {
    clearSession(socket, sessions);
    return null;
  }
  return session.playerId;
}

/** `requireSocketIdentity`, plus the standard refusal for handlers that take an ack. */
export function requireSocketIdentityOrAck(
  socket: SessionSocket,
  ack: Ack<{ ok: false; error: typeof UNAUTHENTICATED }>,
  sessions: SocketSessions = socketSessions,
): string | null {
  const playerId = requireSocketIdentity(socket, sessions);
  if (playerId === null) ack?.({ ok: false, error: UNAUTHENTICATED });
  return playerId;
}

/** Closed-set check: a string of sane length, or nothing. */
function readToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const token = (payload as { token?: unknown }).token;
  if (typeof token !== "string") return null;
  if (token.length === 0 || token.length > MAX_SESSION_TOKEN_LENGTH) return null;
  return token;
}

export interface SessionHandlerDeps {
  sessions?: SocketSessions;
  limiter?: SocketRateLimiter;
  resolveIdentity?: IdentityResolver;
}

export function registerSessionHandlers(socket: SessionSocket, deps: SessionHandlerDeps = {}): void {
  const sessions = deps.sessions ?? socketSessions;
  const limiter = deps.limiter ?? sessionAuthLimiter;
  const resolveIdentity = deps.resolveIdentity ?? resolvePlayerIdentity;

  const nextSeq = (): number => {
    const data = dataOf(socket);
    data.sessionSeq = (data.sessionSeq ?? 0) + 1;
    return data.sessionSeq;
  };

  const install = (identity: PlayerIdentity): SessionAuthenticateResult => {
    const data = dataOf(socket);
    const previous = data.session;
    if (previous && previous.playerId !== identity.playerId) leaveUserRoom(socket, previous.playerId);
    const expiresAt = Date.now() + SESSION_TTL_MS;
    data.session = { playerId: identity.playerId, kind: identity.kind, expiresAt };
    sessions.attach(identity.playerId, socket.id);
    void socket.join(userRoom(identity.playerId));
    return { ok: true, playerId: identity.playerId, kind: identity.kind, expiresAt };
  };

  socket.on("session:authenticate", async (payload, ack) => {
    if (!limiter.consume(socket.id).allowed) {
      ack?.({ ok: false, error: "RATE_LIMITED" });
      return;
    }
    const seq = nextSeq();
    const token = readToken(payload);
    if (token === null) {
      clearSession(socket, sessions);
      ack?.({ ok: false, error: "INVALID_CREDENTIAL" });
      return;
    }
    try {
      const identity = await resolveIdentity(token);
      if (dataOf(socket).sessionSeq !== seq || socket.disconnected) {
        ack?.({ ok: false, error: "SUPERSEDED" });
        return;
      }
      if (!identity) {
        clearSession(socket, sessions);
        ack?.({ ok: false, error: "INVALID_CREDENTIAL" });
        return;
      }
      ack?.(install(identity));
    } catch (err) {
      logger.error({
        message: `Socket session authentication failed: ${err instanceof Error ? err.message : String(err)}`,
        socketId: socket.id,
        module: "SOCKET_SESSION",
      });
      if (dataOf(socket).sessionSeq === seq) clearSession(socket, sessions);
      ack?.({ ok: false, error: "INTERNAL" });
    }
  });

  socket.on("session:end", (ack) => {
    nextSeq();
    clearSession(socket, sessions);
    if (typeof ack === "function") ack();
  });

  socket.on("disconnect", () => {
    clearSession(socket, sessions);
    limiter.removeSocket(socket.id);
  });
}
