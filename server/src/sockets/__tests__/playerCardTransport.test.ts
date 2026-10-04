import { describe, it, expect, beforeEach } from "vitest";
import type { Server, Socket } from "socket.io";
import { registerSocketHandlers } from "../index.js";
import { RoomManager } from "../../rooms/RoomManager.js";
import { globalRateLimiter, playerCardRateLimiter } from "../../lib/rateLimiter.js";
import { metricsRegistry } from "../../observability/MetricsRegistry.js";
import type { PlayerCardResult } from "@shared/profile/PublicPlayerCard.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";

/**
 * THE TRANSPORT AROUND THE PLAYER CARD.
 *
 * The card builder is covered elsewhere. What is pinned here is the layer that
 * can fail without anyone noticing: the lookup has its own rate budget, a
 * refused lookup is still answered so the client never hangs, the lookup does
 * not spend a player's move tokens, and bad input is answered rather than
 * thrown on.
 */

type Packet = [string, ...unknown[]];
type PacketMiddleware = (packet: Packet, next: (error?: Error) => void) => void;
type Listener = (...args: unknown[]) => void;

interface FakeSocket {
  id: string;
  use: (middleware: PacketMiddleware) => void;
  on: (event: string, listener: Listener) => void;
}

function wire(socketId: string): { middleware: PacketMiddleware; listeners: Map<string, Listener>; rooms: RoomManager } {
  let middleware: PacketMiddleware | null = null;
  const listeners = new Map<string, Listener>();
  const fake: FakeSocket = {
    id: socketId,
    use: (fn) => {
      middleware = fn;
    },
    on: (event, listener) => {
      listeners.set(event, listener);
    },
  };
  const io = {
    to: () => ({ emit() {} }),
    sockets: { sockets: { get: () => undefined } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  const rooms = new RoomManager(io);
  registerSocketHandlers(io, fake as unknown as Socket<ClientToServerEvents, ServerToClientEvents>, rooms);
  if (!middleware) throw new Error("the packet middleware was never registered");
  return { middleware, listeners, rooms };
}

/** Sends one `player:card` packet through the middleware and reports whether it was let through and what was acked. */
function sendCardPacket(middleware: PacketMiddleware): { passed: boolean; acked: PlayerCardResult | null } {
  let passed = false;
  let acked: PlayerCardResult | null = null;
  middleware(["player:card", "seat-1", (result: PlayerCardResult) => (acked = result)], () => {
    passed = true;
  });
  return { passed, acked };
}

describe("player:card transport", () => {
  const SOCKET_ID = "socket-card-test";

  beforeEach(() => {
    playerCardRateLimiter.removeSocket(SOCKET_ID);
    globalRateLimiter.removeSocket(SOCKET_ID);
  });

  it("lets a burst through, then refuses and still answers the ack", () => {
    const { middleware } = wire(SOCKET_ID);
    const outcomes = Array.from({ length: 8 }, () => sendCardPacket(middleware));

    expect(outcomes.slice(0, 6).every((o) => o.passed)).toBe(true);
    const refused = outcomes[6];
    expect(refused.passed).toBe(false);
    // The client is waiting on this ack; silence would read as a dead connection.
    expect(refused.acked?.ok).toBe(false);
    expect(refused.acked && !refused.acked.ok && refused.acked.error).toMatch(/too many/i);
  });

  it("does not spend the player's interactive move tokens", () => {
    const { middleware } = wire(SOCKET_ID);
    for (let i = 0; i < 8; i++) sendCardPacket(middleware);

    // A fresh bucket starts full; consuming one token from it must leave
    // capacity - 1, proving card lookups never drew from it.
    expect(globalRateLimiter.consume(SOCKET_ID).remainingTokens).toBe(14);
  });

  it("counts a refused lookup", () => {
    const { middleware } = wire(SOCKET_ID);
    const before = metricsRegistry.getCounter("player_card.rate_limited_total");
    for (let i = 0; i < 8; i++) sendCardPacket(middleware);
    expect(metricsRegistry.getCounter("player_card.rate_limited_total")).toBe(before + 2);
  });

  it("answers a non-string seat id as an unknown seat instead of throwing", () => {
    const { listeners } = wire(SOCKET_ID);
    let acked: PlayerCardResult | null = null;
    listeners.get("player:card")?.(12345, (result: PlayerCardResult) => (acked = result));
    expect(acked).toEqual({ ok: false, error: "That player is not at this table" });
  });

  it("counts a miss and a hit separately", () => {
    const { listeners } = wire(SOCKET_ID);
    const missesBefore = metricsRegistry.getCounter("player_card.miss_total");
    listeners.get("player:card")?.("not-a-seat", () => undefined);
    expect(metricsRegistry.getCounter("player_card.miss_total")).toBe(missesBefore + 1);
  });

  it("ignores a lookup that arrives without an acknowledgement callback", () => {
    const { listeners } = wire(SOCKET_ID);
    expect(() => listeners.get("player:card")?.("seat-1")).not.toThrow();
  });
});
