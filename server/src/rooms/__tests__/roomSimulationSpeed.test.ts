import { describe, expect, it } from "vitest";
import type { Server } from "socket.io";
import { RoomManager } from "../RoomManager.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types.js";

/**
 * The room's real-time loop must run a 60 Hz engine at 60 ticks per wall-clock second. It used to
 * clamp the period to 20 ms, which gave 50 ticks a second and made every Carrom coin move at 83% of
 * its real speed. This drives the REAL loop with a stub engine and counts ticks over one second.
 */

interface LoopRoom {
  code: string;
  game: string;
  phase: string;
  engine: unknown;
  simTimer?: ReturnType<typeof setInterval>;
}

function makeIo(): Server<ClientToServerEvents, ServerToClientEvents> {
  return {
    to: () => ({ emit() {} }),
    sockets: { sockets: { get: () => ({ join() {}, leave() {}, emit() {} }) } },
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
}

function countTicks(tickRateHz: number, wallMs: number): Promise<number> {
  const rooms = new RoomManager(makeIo());
  let ticks = 0;
  const engine = {
    tickRateHz,
    simulateTick: () => {
      ticks++;
      return { ok: true };
    },
    isOver: () => false,
  };
  const room: LoopRoom = { code: "SPEED1", game: "carrom", phase: "playing", engine };
  // The loop broadcasts after every wake-up; there is nobody to broadcast to here.
  (rooms as unknown as { broadcastGameState: () => void }).broadcastGameState = () => {};
  (rooms as unknown as { startSimulation: (r: LoopRoom) => void }).startSimulation(room);
  return new Promise((resolve) => {
    setTimeout(() => {
      room.phase = "finished"; // the loop stops itself on its next wake-up
      if (room.simTimer) clearInterval(room.simTimer);
      resolve(ticks);
    }, wallMs);
  });
}

describe("room real-time loop speed", () => {
  it("runs a 60 Hz engine at about 60 ticks per second, not the old 50", async () => {
    const ticks = await countTicks(60, 1000);
    // Generous on the high side (catch-up bursts) and tight on the low side: the old loop gave ~50.
    expect(ticks).toBeGreaterThanOrEqual(56);
    expect(ticks).toBeLessThanOrEqual(64);
  }, 6000);

  it("still honours a slower engine rate", async () => {
    const ticks = await countTicks(30, 1000);
    expect(ticks).toBeGreaterThanOrEqual(27);
    expect(ticks).toBeLessThanOrEqual(33);
  }, 6000);
});
