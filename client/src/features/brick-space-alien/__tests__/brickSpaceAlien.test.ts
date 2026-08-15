import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialGameState,
  gameReducer,
} from "../engine/gameReducer";
import {
  stepFormation,
  getEligibleShooters,
} from "../engine/formationEngine";
import {
  simulateProjectilesAndCollisions,
} from "../engine/collisionEngine";
import {
  isValidPlayerCenterX,
  getPlayerPixels,
  buildOccupancyMatrix,
} from "../utils/matrix";
import { SpaceAlienPersistenceService } from "../services/PersistenceService";
import type { Alien, AlienFormation, PlayerShip, Projectile } from "../types";

describe("Brick Space Alien - Matrix & Footprint Utilities", () => {
  it("generates correct 4-pixel player footprint", () => {
    const pixels = getPlayerPixels(4);
    expect(pixels).toHaveLength(4);
    expect(pixels).toEqual([
      { x: 4, y: 18 },
      { x: 3, y: 19 },
      { x: 4, y: 19 },
      { x: 5, y: 19 },
    ]);
  });

  it("validates player boundaries correctly on 10-wide grid", () => {
    expect(isValidPlayerCenterX(1)).toBe(true);
    expect(isValidPlayerCenterX(8)).toBe(true);
    // Boundary overflow (wings would touch -1 or 10)
    expect(isValidPlayerCenterX(0)).toBe(false);
    expect(isValidPlayerCenterX(9)).toBe(false);
    expect(isValidPlayerCenterX(-1)).toBe(false);
    expect(isValidPlayerCenterX(10)).toBe(false);
  });

  it("builds 1D occupancy matrix correctly", () => {
    const aliens: Alien[] = [
      {
        id: "a1",
        position: { x: 2, y: 3 },
        formationRow: 0,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
    ];
    const projectiles: Projectile[] = [
      {
        id: "p1",
        owner: "PLAYER",
        position: { x: 4, y: 10 },
        previousPosition: { x: 4, y: 11 },
        direction: -1,
      },
    ];

    const matrix = buildOccupancyMatrix(4, false, aliens, projectiles);
    expect(matrix).toHaveLength(200); // 10 x 20
    expect(matrix[3 * 10 + 2]).toBe("alien_basic");
    expect(matrix[10 * 10 + 4]).toBe("player_bullet");
    expect(matrix[18 * 10 + 4]).toBe("player");
    expect(matrix[19 * 10 + 3]).toBe("player");
    expect(matrix[19 * 10 + 4]).toBe("player");
    expect(matrix[19 * 10 + 5]).toBe("player");
  });
});

describe("Brick Space Alien - Formation Engine", () => {
  const baseFormation: AlienFormation = {
    direction: 1,
    movementAccumulatorMs: 0,
    stepIntervalMs: 500,
  };

  it("advances aliens horizontally when clear of boundaries", () => {
    const aliens: Alien[] = [
      {
        id: "a1",
        position: { x: 2, y: 3 },
        formationRow: 0,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
    ];

    const result = stepFormation(aliens, baseFormation);
    expect(result.updatedAliens[0].position.x).toBe(3);
    expect(result.updatedAliens[0].position.y).toBe(3);
    expect(result.updatedFormation.direction).toBe(1);
    expect(result.invaded).toBe(false);
  });

  it("drops down 1 row and reverses direction when boundary is reached without crossing outside", () => {
    const aliens: Alien[] = [
      {
        id: "a1",
        position: { x: 9, y: 3 }, // At right edge, moving right
        formationRow: 0,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
    ];

    const result = stepFormation(aliens, baseFormation);
    // Should drop down to row 4, keep x at 9, and flip direction to -1
    expect(result.updatedAliens[0].position.x).toBe(9);
    expect(result.updatedAliens[0].position.y).toBe(4);
    expect(result.updatedFormation.direction).toBe(-1);
    expect(result.invaded).toBe(false);
  });

  it("detects invasion when aliens reach player defense row", () => {
    const aliens: Alien[] = [
      {
        id: "a1",
        position: { x: 9, y: 17 },
        formationRow: 0,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
    ];

    const result = stepFormation(aliens, baseFormation);
    expect(result.updatedAliens[0].position.y).toBe(18);
    expect(result.invaded).toBe(true);
  });

  it("selects only lowest surviving alien in each column as shooters", () => {
    const aliens: Alien[] = [
      {
        id: "top-col2",
        position: { x: 2, y: 2 },
        formationRow: 0,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
      {
        id: "bottom-col2",
        position: { x: 2, y: 4 },
        formationRow: 1,
        formationColumn: 0,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
      {
        id: "only-col3",
        position: { x: 3, y: 3 },
        formationRow: 0,
        formationColumn: 1,
        type: "BASIC",
        hitPoints: 1,
        scoreValue: 10,
      },
    ];

    const shooters = getEligibleShooters(aliens);
    expect(shooters).toHaveLength(2);
    expect(shooters.find((s) => s.id === "bottom-col2")).toBeDefined();
    expect(shooters.find((s) => s.id === "only-col3")).toBeDefined();
    expect(shooters.find((s) => s.id === "top-col2")).toBeUndefined();
  });
});

describe("Brick Space Alien - Collision & Projectile Simulation", () => {
  const player: PlayerShip = {
    centerX: 4,
    lives: 3,
    invulnerableUntilMs: 0,
  };

  it("detects and resolves head-on bullet crossing collision", () => {
    const projectiles: Projectile[] = [
      {
        id: "pb1",
        owner: "PLAYER",
        position: { x: 4, y: 10 },
        previousPosition: { x: 4, y: 11 },
        direction: -1,
      },
      {
        id: "ab1",
        owner: "ALIEN",
        position: { x: 4, y: 9 },
        previousPosition: { x: 4, y: 8 },
        direction: 1,
      },
    ];

    const result = simulateProjectilesAndCollisions(projectiles, [], player, 1000);
    // When moved: pb1 goes to 9, ab1 goes to 10 -> they crossed each other
    expect(result.survivingProjectiles).toHaveLength(0);
  });

  it("damages armored alien and destroys on second hit", () => {
    const aliens: Alien[] = [
      {
        id: "armored",
        position: { x: 4, y: 8 },
        formationRow: 0,
        formationColumn: 0,
        type: "ARMORED",
        hitPoints: 2,
        scoreValue: 25,
      },
    ];
    const bullet: Projectile[] = [
      {
        id: "pb",
        owner: "PLAYER",
        position: { x: 4, y: 9 },
        previousPosition: { x: 4, y: 10 },
        direction: -1,
      },
    ];

    // First hit -> remaining HP 1
    const hit1 = simulateProjectilesAndCollisions(bullet, aliens, player, 1000);
    expect(hit1.survivingAliens).toHaveLength(1);
    expect(hit1.survivingAliens[0].hitPoints).toBe(1);
    expect(hit1.scoreGained).toBe(0);

    // Second hit -> destroyed
    const bullet2: Projectile[] = [
      {
        id: "pb2",
        owner: "PLAYER",
        position: { x: 4, y: 9 },
        previousPosition: { x: 4, y: 10 },
        direction: -1,
      },
    ];
    const hit2 = simulateProjectilesAndCollisions(bullet2, hit1.survivingAliens, player, 2000);
    expect(hit2.survivingAliens).toHaveLength(0);
    expect(hit2.scoreGained).toBe(25);
    expect(hit2.destroyedAlienCount).toBe(1);
  });

  it("damages player on alien bullet hit unless invulnerable", () => {
    const alienBullet: Projectile[] = [
      {
        id: "ab",
        owner: "ALIEN",
        position: { x: 4, y: 17 },
        previousPosition: { x: 4, y: 16 },
        direction: 1,
      },
    ];

    // Vulnerable player
    const resultVulnerable = simulateProjectilesAndCollisions(alienBullet, [], player, 1000);
    expect(resultVulnerable.playerHit).toBe(true);

    // Invulnerable player
    const invulnerablePlayer: PlayerShip = {
      ...player,
      invulnerableUntilMs: 5000,
    };
    const resultInvulnerable = simulateProjectilesAndCollisions(alienBullet, [], invulnerablePlayer, 1000);
    expect(resultInvulnerable.playerHit).toBe(false);
  });
});

describe("Brick Space Alien - Reducer & State Machine", () => {
  let state = createInitialGameState(12345, 0, true);

  it("transitions from boot to menu after overlay timer", () => {
    state = gameReducer(state, { type: "TICK", deltaMs: 2000, nowMs: 2000 });
    expect(state.status).toBe("menu");
  });

  it("starts game from menu into ready and then playing", () => {
    state = gameReducer(state, { type: "CONFIRM_MENU" });
    expect(state.status).toBe("ready");

    state = gameReducer(state, { type: "TICK", deltaMs: 1500, nowMs: 3500 });
    expect(state.status).toBe("playing");
    expect(state.aliens.length).toBeGreaterThan(0);
  });

  it("moves player left and right within bounds", () => {
    const startX = state.player.centerX;
    state = gameReducer(state, { type: "MOVE_PLAYER", deltaX: -1, nowMs: 4000 });
    expect(state.player.centerX).toBe(startX - 1);

    state = gameReducer(state, { type: "MOVE_PLAYER", deltaX: 1, nowMs: 4050 });
    expect(state.player.centerX).toBe(startX);
  });

  it("handles player laser firing with cooldowns", () => {
    state = gameReducer(state, { type: "PLAYER_FIRE", nowMs: 5000 });
    expect(state.projectiles.filter((p) => p.owner === "PLAYER")).toHaveLength(1);
    expect(state.playerCooldownMs).toBeGreaterThan(0);

    // Immediate second fire ignored during cooldown
    state = gameReducer(state, { type: "PLAYER_FIRE", nowMs: 5050 });
    expect(state.projectiles.filter((p) => p.owner === "PLAYER")).toHaveLength(1);
  });

  it("toggles pause on and off", () => {
    state = gameReducer(state, { type: "TOGGLE_PAUSE" });
    expect(state.status).toBe("paused");

    state = gameReducer(state, { type: "RESUME_GAME" });
    expect(state.status).toBe("playing");
  });
});

describe("Brick Space Alien - Persistence Service", () => {
  it("records games played and updates high scores", () => {
    const data = SpaceAlienPersistenceService.recordGame(450, 3, 28);
    expect(data.highScore).toBeGreaterThanOrEqual(450);
    expect(data.highestWave).toBeGreaterThanOrEqual(3);
    expect(data.totalAlienKills).toBeGreaterThanOrEqual(28);
    expect(data.gamesPlayed).toBeGreaterThanOrEqual(1);
  });
});
