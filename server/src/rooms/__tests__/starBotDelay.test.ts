import { describe, it, expect, vi } from "vitest";
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";
import { RoomManager } from "../RoomManager.js";

/** Same fake Socket.IO harness as unoTimer.test.ts / roundHistory.test.ts. */
function makeFakeIO() {
  const emitted: Array<{ socketId?: string; room?: string; event: string; payload: unknown }> = [];
  const sockets = new Map<string, { id: string; join: () => void; emit: (event: string, payload: unknown) => void }>();

  function addSocket(id: string) {
    sockets.set(id, {
      id,
      join: () => {},
      emit: (event: string, payload: unknown) => emitted.push({ socketId: id, event, payload }),
    });
  }

  const io = {
    sockets: { sockets },
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }),
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;

  return { io, addSocket, emitted };
}

/**
 * Proves the RoomManager wiring, not just the engine in isolation:
 * scheduleBotMoveIfNeeded actually calls StarGameEngine.getBotThinkDelayMs()
 * instead of falling through to the platform default (1200-2000ms) — the
 * whole point of requirement #5 (human-like 1.5-4s bot delay, not robotic
 * instant/near-instant timing).
 */
describe("RoomManager — Star Game bot think delay", () => {
  it("uses StarGameEngine.getBotThinkDelayMs (1.5-4s), not the platform default (1.2-2s)", () => {
    const { io, addSocket, emitted } = makeFakeIO();
    addSocket("s0");
    const rooms = new RoomManager(io);

    const { code } = rooms.createRoom("s0", "Anand", "stargame");
    rooms.addBot("s0", "Bot1");
    rooms.addBot("s0", "Bot2");
    rooms.setReady("s0", true);

    // Math.random pinned to 0.9 — platform default would be
    // 1200 + 0.9*800 = 1920ms; the star-specific override is
    // 1500 + 0.9*2500 = 3750ms. Distinguishable, so capturing which value
    // setTimeout actually receives proves the override took effect.
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    try {
      rooms.startGame("s0"); // themeSelect: both bots are immediately pending

      const botMoveCall = setTimeoutSpy.mock.calls.find(
        ([, delay]) => typeof delay === "number" && delay >= 1500 && delay <= 4000,
      );
      expect(botMoveCall).toBeDefined();
      expect(botMoveCall![1]).toBeCloseTo(3750, 5);
    } finally {
      setTimeoutSpy.mockRestore();
      randomSpy.mockRestore();
    }

    expect(code).toBeTruthy();
    expect(emitted.some((e) => e.event === "room:state")).toBe(true);
  });
});
