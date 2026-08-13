import { describe, expect, it } from "vitest";
import type { Player, VyomaYudhPublicState } from "@shared/types.js";
import { VyomaYudhEngine } from "../VyomaYudhEngine.js";

function seat(id: string): Player {
  return { id, name: id, isHost: true, isReady: true, isConnected: true };
}

function start() {
  const engine = new VyomaYudhEngine();
  engine.setRng(() => 0.99); // no spawns, no drops — just flight
  engine.init([seat("a")]);
  return engine;
}

const shipY = (e: VyomaYudhEngine) => (e.getPublicState() as VyomaYudhPublicState).ship!.y;

/**
 * Flight speed used to depend on the network.
 *
 * `steer` moved the ship a fixed distance PER MESSAGE, and the board sent one
 * every 50ms on an interval. So distance travelled was a function of how many
 * packets survived the trip rather than of elapsed time — on a phone, jitter,
 * loss and socket buffering turned a steady hold into a crawl, a stall, then
 * a lurch. That is what "the controls feel heavy" was.
 *
 * The engine now stores the DIRECTION and flies the ship on its own clock.
 */
describe("steering is intent, not motion", () => {
  it("does not move the ship when the message arrives", () => {
    const engine = start();
    const before = shipY(engine);
    engine.applyMove({ playerId: "a", type: "steer", data: { dy: -1 } });
    expect(shipY(engine)).toBe(before);
  });

  it("moves the ship once per tick while a direction is held", () => {
    const engine = start();
    const before = shipY(engine);
    engine.applyMove({ playerId: "a", type: "steer", data: { dy: -1 } });
    engine.simulateTick();
    const afterOne = shipY(engine);
    expect(afterOne).toBeLessThan(before);

    engine.simulateTick();
    // Even steps: the second tick must travel the same distance as the first.
    expect(before - afterOne).toBeCloseTo(afterOne - shipY(engine), 6);
  });

  it("flies exactly as far in ten ticks however many messages arrived", () => {
    /**
     * The whole point, stated as a test.
     *
     * A player who spams steering and a player whose packets barely get
     * through must cover identical ground, because the ship is flown by the
     * server's clock now and not by their connection.
     */
    const spammer = start();
    const struggler = start();

    spammer.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });
    struggler.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });

    for (let t = 0; t < 10; t++) {
      // One player's client is repeating itself 20x a second; the other's
      // message got through once and nothing since.
      for (let i = 0; i < 20; i++) {
        spammer.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });
      }
      spammer.simulateTick();
      struggler.simulateTick();
    }

    expect(shipY(spammer)).toBeCloseTo(shipY(struggler), 6);
  });

  it("stops when the pilot lets go", () => {
    const engine = start();
    engine.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });
    engine.simulateTick();
    const moving = shipY(engine);

    engine.applyMove({ playerId: "a", type: "steer", data: { dy: 0 } });
    engine.simulateTick();
    engine.simulateTick();
    expect(shipY(engine)).toBe(moving);
  });

  it("clamps a hostile steer to a direction rather than a distance", () => {
    // A client asking to move 900 units must not teleport across the board.
    const engine = start();
    const before = shipY(engine);
    engine.applyMove({ playerId: "a", type: "steer", data: { dy: 900 } });
    engine.simulateTick();
    const travelled = shipY(engine) - before;

    const fair = start();
    fair.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });
    fair.simulateTick();
    expect(travelled).toBeCloseTo(shipY(fair) - before, 6);
  });

  it("rejects a steer that is not a number at all", () => {
    const engine = start();
    expect(engine.applyMove({ playerId: "a", type: "steer", data: {} }).ok).toBe(false);
    expect(
      engine.applyMove({ playerId: "a", type: "steer", data: { dy: NaN } }).ok,
    ).toBe(false);
  });

  it("keeps the ship inside the world however long a direction is held", () => {
    /**
     * Steering is sticky now, so "held forever" is a state the game can
     * really be in — a pilot who puts the phone down mid-climb. The ship
     * must park against the ceiling, not fly out of the world.
     *
     * 120 ticks: comfortably past the ~23 needed to cross half the board,
     * and short enough that the run cannot end underneath the assertion.
     */
    // Separate runs per direction. Enemies keep spawning on a tick schedule
    // regardless of the rng, so a ship parked against a wall for hundreds of
    // ticks eventually gets shot — and a respawn recentres it, which would
    // read as a clamp failure rather than the collision it actually is.
    const up = start();
    up.applyMove({ playerId: "a", type: "steer", data: { dy: -1 } });
    for (let t = 0; t < 60; t++) up.simulateTick();
    expect(shipY(up)).toBe(4);

    const down = start();
    down.applyMove({ playerId: "a", type: "steer", data: { dy: 1 } });
    for (let t = 0; t < 60; t++) down.simulateTick();
    expect(shipY(down)).toBe(96);
  });
});
