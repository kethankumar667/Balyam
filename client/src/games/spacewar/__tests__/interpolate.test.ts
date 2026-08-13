import { describe, expect, it } from "vitest";
import type { SpaceWarPublicState } from "@shared/types";
import { interpolateSpaceWar } from "../interpolate";

function frame(over: Partial<SpaceWarPublicState> = {}): SpaceWarPublicState {
  return {
    kind: "spacewar",
    player: {
      x: 20,
      y: 200,
      width: 40,
      height: 30,
      lives: 3,
      maxLives: 4,
      shieldOn: false,
      shieldTimeLeft: 0,
      specialAttack: "missile",
      specialCount: 3,
    },
    score: 0,
    highScore: 0,
    level: 1,
    maxLevels: 5,
    projectiles: [],
    specials: [],
    enemies: [],
    powerUps: [],
    bossHp: null,
    bossMaxHp: null,
    isPaused: false,
    isOver: false,
    winnerId: null,
    theme: "cyberpunk",
    ...over,
  };
}

const foe = (id: string, x: number, y: number) =>
  ({ id, x, y, width: 30, height: 30, hp: 1, maxHp: 1, speedX: -2, speedY: 0 }) as never;

const bullet = (id: string, x: number, y: number) =>
  ({ id, x, y, width: 8, height: 4, speedX: 6, speedY: 0, fromPlayer: true }) as never;

/**
 * Space War simulates at 30Hz and the board draws on rAF at ~60.
 *
 * It used to paint inside `useEffect(..., [state])`, so the frame rate WAS
 * the packet rate: every ship, bullet and enemy sat still for a thirtieth of
 * a second and then jumped. That happened on a flawless connection too,
 * because it was never a connection problem.
 */
describe("interpolateSpaceWar", () => {
  it("draws an enemy part-way between its two known positions", () => {
    const prev = frame({ enemies: [foe("e1", 800, 100)] });
    const cur = frame({ enemies: [foe("e1", 700, 140)] });

    expect(interpolateSpaceWar(prev, cur, 0).enemies[0]).toMatchObject({ x: 800, y: 100 });
    expect(interpolateSpaceWar(prev, cur, 0.5).enemies[0]).toMatchObject({ x: 750, y: 120 });
    expect(interpolateSpaceWar(prev, cur, 1).enemies[0]).toMatchObject({ x: 700, y: 140 });
  });

  it("smooths the player ship as well", () => {
    // Space War holds input server-side, so the ship already moves every
    // tick a finger is down. It gets interpolated with everything else
    // rather than predicted — one coherent world beats a ship living
    // slightly in the future.
    const prev = frame();
    const cur = frame({ player: { ...frame().player, x: 40, y: 240 } });
    const out = interpolateSpaceWar(prev, cur, 0.5);
    expect(out.player.x).toBe(30);
    expect(out.player.y).toBe(220);
  });

  it("matches by id, not by array position", () => {
    // The engine rebuilds these arrays each tick and filters dead entries,
    // so index 0 is a different entity from frame to frame. Blending by
    // index would smear each one toward whoever replaced it.
    const prev = frame({ projectiles: [bullet("a", 10, 10), bullet("b", 90, 90)] });
    const cur = frame({ projectiles: [bullet("b", 100, 90), bullet("a", 20, 10)] });

    const out = interpolateSpaceWar(prev, cur, 0.5);
    expect(out.projectiles.find((p) => p.id === "a")).toMatchObject({ x: 15 });
    expect(out.projectiles.find((p) => p.id === "b")).toMatchObject({ x: 95 });
  });

  it("draws a bullet fired this tick where it actually is", () => {
    // Nothing to smooth from. A made-up start position makes shots appear
    // to come out of somewhere the ship never was.
    const prev = frame({ projectiles: [] });
    const cur = frame({ projectiles: [bullet("s1", 60, 215)] });
    expect(interpolateSpaceWar(prev, cur, 0.5).projectiles[0]).toMatchObject({ x: 60, y: 215 });
  });

  it("drops what is gone and keeps counts honest", () => {
    // The renderer spawns its explosion sparks by comparing enemy counts
    // between calls, so interpolation must never invent or retain one.
    const prev = frame({ enemies: [foe("e1", 50, 50), foe("e2", 60, 60)] });
    const cur = frame({ enemies: [foe("e1", 40, 50)] });
    expect(interpolateSpaceWar(prev, cur, 0.5).enemies).toHaveLength(1);
  });

  it("clamps rather than extrapolating past the newest frame", () => {
    const prev = frame({ enemies: [foe("e1", 800, 100)] });
    const cur = frame({ enemies: [foe("e1", 700, 100)] });
    expect(interpolateSpaceWar(prev, cur, 3).enemies[0].x).toBe(700);
    expect(interpolateSpaceWar(prev, cur, -1).enemies[0].x).toBe(800);
  });

  it("never smooths the numbers the HUD reads", () => {
    // A score easing toward its value looks broken, and lives sliding from
    // 3 to 2 would be worse.
    const prev = frame({ score: 100, level: 1 });
    const cur = frame({ score: 900, level: 2, bossHp: 0.5 });
    const out = interpolateSpaceWar(prev, cur, 0.5);
    expect(out.score).toBe(900);
    expect(out.level).toBe(2);
    expect(out.bossHp).toBe(0.5);
  });

  it("survives an empty previous frame", () => {
    // First broadcast of a run, and every respawn that clears the field.
    const prev = frame({ enemies: [] });
    const cur = frame({ enemies: [foe("e1", 500, 50)] });
    expect(interpolateSpaceWar(prev, cur, 0.5).enemies[0]).toMatchObject({ x: 500 });
  });
});
