import type { GameEngine, MoveContext, MoveResult } from "../GameEngine.js";
import type {
  Player,
  VyomaDifficulty,
  VyomaEnemyKind,
  VyomaEntity,
  VyomaPickup,
  VyomaResult,
  VyomaShot,
  VyomaWeapon,
  VyomaYudhOptions,
  VyomaYudhPublicState,
} from "@shared/types.js";
import { DEFAULT_VYOMAYUDH_OPTIONS, VYOMA_WORLD } from "@shared/types.js";

/**
 * Vyoma Yudh — an original side-scrolling shooter.
 *
 * Written from mechanics only (waves, bosses, power-ups, lives, score), which
 * copyright does not cover. No code or art is derived from any existing game,
 * and the name is our own.
 *
 * ── Shape of a match ──────────────────────────────────────────────────
 * Strictly solo: one seat, one pilot, one run. The run ends when the pilot
 * loses their last life or clears the final level, and that ends the match.
 *
 * `tickRateHz` opts into RoomManager's server-owned loop (see GameEngine and
 * ADR-007) so the pilot's browser cannot dictate simulation speed.
 *
 * ── Coordinates ───────────────────────────────────────────────────────
 * A fixed 200x100 world, scaled by the client. Physics are identical on a
 * phone and a desktop, and no state is expressed in pixels.
 */

const TICK_HZ = 20;
/** Seconds per tick, as a multiplier for the per-second speeds below. */
const DT = 1 / TICK_HZ;

const SHIP_SPEED = 55;      // world units per second
const BASIC_SPEED = 90;
const MISSILE_SPEED = 60;
const LASER_SPEED = 170;
const ENEMY_SHOT_SPEED = 45;

const SHIP_X = 16;          // pilot's fixed column; the world scrolls past
const HIT_RADIUS = 4;
const INVULN_TICKS = TICK_HZ * 2;

const START_AMMO: Record<VyomaWeapon, number> = { missile: 3, laser: 2, wall: 1 };

interface DifficultyTuning {
  spawnEveryTicks: number;
  enemySpeed: number;
  enemyFireChance: number;
  bossHp: number;
}

const TUNING: Record<VyomaDifficulty, DifficultyTuning> = {
  easy:   { spawnEveryTicks: 22, enemySpeed: 18, enemyFireChance: 0.010, bossHp: 24 },
  normal: { spawnEveryTicks: 16, enemySpeed: 24, enemyFireChance: 0.022, bossHp: 36 },
  hard:   { spawnEveryTicks: 11, enemySpeed: 31, enemyFireChance: 0.038, bossHp: 52 },
};

/** Kills needed to summon the level boss. Grows with depth. */
function killsForBoss(level: number): number {
  return 8 + level * 2;
}

interface RunState {
  playerId: string;
  shipY: number;
  lives: number;
  score: number;
  level: number;
  kills: number;
  ammo: Record<VyomaWeapon, number>;
  invulnUntilTick: number;
  bossActive: boolean;
}

export class VyomaYudhEngine implements GameEngine {
  readonly kind = "vyomayudh" as const;
  readonly minPlayers = 1;
  readonly maxPlayers = 1;
  /** Opt in to the server-owned simulation loop. */
  readonly tickRateHz = TICK_HZ;

  private opts: VyomaYudhOptions = { ...DEFAULT_VYOMAYUDH_OPTIONS };
  private pendingOptions: VyomaYudhOptions | null = null;

  private pilotId: string | null = null;
  private run: RunState | null = null;
  private result: VyomaResult | null = null;

  private enemies: VyomaEntity[] = [];
  private shots: VyomaShot[] = [];
  private pickups: VyomaPickup[] = [];

  private tickCount = 0;
  private nextId = 0;
  private lastSpawnTick = 0;
  private isOverFlag = false;
  private winnerId: string | null = null;

  private rng: () => number = Math.random;

  setRng(fn: () => number): void {
    this.rng = fn;
  }

  setOptions(opts: Partial<VyomaYudhOptions>): void {
    this.pendingOptions = { ...DEFAULT_VYOMAYUDH_OPTIONS, ...opts };
  }

  private id(prefix: string): string {
    return `${prefix}${++this.nextId}`;
  }

  private tuning(): DifficultyTuning {
    return TUNING[this.opts.difficulty] ?? TUNING.normal;
  }

  init(players: Player[]): void {
    this.opts = this.pendingOptions ?? { ...DEFAULT_VYOMAYUDH_OPTIONS };
    this.pilotId = players[0]?.id ?? null;
    this.result = null;
    this.tickCount = 0;
    this.isOverFlag = false;
    this.winnerId = null;
    this.startRun();
  }

  /* ────────────────────────────── run lifecycle ────────────────────── */

  private startRun(): void {
    this.enemies = [];
    this.shots = [];
    this.pickups = [];
    if (!this.pilotId) {
      this.isOverFlag = true;
      return;
    }
    this.run = {
      playerId: this.pilotId,
      shipY: VYOMA_WORLD.h / 2,
      lives: this.opts.lives,
      score: 0,
      level: 1,
      kills: 0,
      ammo: { ...START_AMMO },
      invulnUntilTick: this.tickCount + INVULN_TICKS,
      bossActive: false,
    };
    this.lastSpawnTick = this.tickCount;
  }

  /**
   * The run IS the match — there is no next pilot to hand over to.
   *
   * `winnerId` is set only when the game was actually beaten. A destroyed
   * run has no winner: calling the player a winner for dying would make the
   * game-over screen say the opposite of what happened.
   */
  private endRun(reason: "cleared" | "destroyed"): void {
    if (!this.run) return;
    this.result = {
      score: this.run.score,
      levelReached: this.run.level,
      reason,
    };
    this.winnerId = reason === "cleared" ? this.run.playerId : null;
    this.run = null;
    this.isOverFlag = true;
  }

  /* ────────────────────────────── input ────────────────────────────── */

  applyMove(move: MoveContext): MoveResult {
    // A run belongs to exactly one pilot. Everyone else is a spectator, and
    // the server — not the client — is what enforces that.
    if (!this.run || move.playerId !== this.run.playerId) {
      return { ok: false, error: "Not your run" };
    }
    if (this.isOverFlag) return { ok: false, error: "Game over" };

    switch (move.type) {
      case "steer": {
        const { dy } = (move.data as { dy?: number }) ?? {};
        if (typeof dy !== "number" || !Number.isFinite(dy)) {
          return { ok: false, error: "Bad steer" };
        }
        // Clamp the REQUEST, not just the result: a client asking to move
        // 900 units in one input must not teleport across the board.
        const step = Math.max(-1, Math.min(1, dy)) * SHIP_SPEED * DT;
        this.run.shipY = clamp(this.run.shipY + step, 4, VYOMA_WORLD.h - 4);
        return { ok: true };
      }
      case "fire": {
        this.fireBasic();
        return { ok: true };
      }
      case "special": {
        const { weapon } = (move.data as { weapon?: VyomaWeapon }) ?? {};
        if (weapon !== "missile" && weapon !== "laser" && weapon !== "wall") {
          return { ok: false, error: "Unknown weapon" };
        }
        if (this.run.ammo[weapon] <= 0) return { ok: false, error: "Out of ammo" };
        this.run.ammo[weapon] -= 1;
        this.fireSpecial(weapon);
        return { ok: true };
      }
      // `tick` is deliberately NOT accepted. The server owns the clock now;
      // see GameEngine's real-time notes. Older clients that still emit it
      // get a clear error rather than silently driving the simulation.
      case "tick":
        return { ok: false, error: "Server drives the clock" };
      default:
        return { ok: false, error: `Unknown move: ${move.type}` };
    }
  }

  private fireBasic(): void {
    if (!this.run) return;
    this.shots.push({
      id: this.id("s"),
      x: SHIP_X + 4,
      y: this.run.shipY,
      vx: BASIC_SPEED,
      vy: 0,
      fromPlayer: true,
      weapon: "basic",
    });
  }

  private fireSpecial(weapon: VyomaWeapon): void {
    if (!this.run) return;
    const y = this.run.shipY;
    if (weapon === "laser") {
      this.shots.push({
        id: this.id("s"), x: SHIP_X + 4, y, vx: LASER_SPEED, vy: 0,
        fromPlayer: true, weapon: "laser",
      });
      return;
    }
    if (weapon === "missile") {
      // Three homing missiles, fanned out. Homing is applied in stepShots.
      for (const spread of [-18, 0, 18]) {
        this.shots.push({
          id: this.id("s"), x: SHIP_X + 4, y, vx: MISSILE_SPEED, vy: spread,
          fromPlayer: true, weapon: "missile",
        });
      }
      return;
    }
    // "wall" — a full-height sweep that clears everything in its path. The
    // panic button: one per run, and it is the only thing that saves a pilot
    // boxed in by a bomber spread.
    this.shots.push({
      id: this.id("s"), x: SHIP_X + 4, y: VYOMA_WORLD.h / 2, vx: 42, vy: 0,
      fromPlayer: true, weapon: "wall",
    });
  }

  /* ────────────────────────────── simulation ───────────────────────── */

  simulateTick(): MoveResult {
    if (this.isOverFlag) return { ok: true, isOver: true, winnerId: this.winnerId };
    this.tickCount++;

    if (!this.run) return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };

    this.spawnWave();
    this.stepEnemies();
    this.stepShots();
    this.stepPickups();
    this.resolveCollisions();
    this.checkLevelProgress();

    return { ok: true, isOver: this.isOverFlag, winnerId: this.winnerId };
  }

  private spawnWave(): void {
    if (!this.run || this.run.bossActive) return;
    const t = this.tuning();
    // Deeper levels spawn faster, with a floor so it stays playable.
    const interval = Math.max(5, t.spawnEveryTicks - this.run.level);
    if (this.tickCount - this.lastSpawnTick < interval) return;
    this.lastSpawnTick = this.tickCount;

    const kind = this.pickEnemyKind(this.run.level);
    const hp = kind === "bomber" ? 3 : kind === "turret" ? 2 : 1;
    this.enemies.push({
      id: this.id("e"),
      x: VYOMA_WORLD.w + 5,
      y: 6 + this.rng() * (VYOMA_WORLD.h - 12),
      kind,
      hp,
      maxHp: hp,
    });
  }

  private pickEnemyKind(level: number): VyomaEnemyKind {
    const r = this.rng();
    // Early levels are almost all scouts; variety arrives with depth so a
    // new player is not meeting bombers on level 1.
    if (level <= 1) return r < 0.85 ? "scout" : "weaver";
    if (level <= 3) return r < 0.55 ? "scout" : r < 0.85 ? "weaver" : "turret";
    return r < 0.4 ? "scout" : r < 0.65 ? "weaver" : r < 0.85 ? "turret" : "bomber";
  }

  private stepEnemies(): void {
    if (!this.run) return;
    const t = this.tuning();
    for (const e of this.enemies) {
      if (e.kind === "boss") {
        // Bosses hold the right third and drift vertically.
        e.x = Math.max(VYOMA_WORLD.w - 28, e.x - t.enemySpeed * DT);
        e.y += Math.sin(this.tickCount / 14) * 22 * DT;
        e.y = clamp(e.y, 12, VYOMA_WORLD.h - 12);
      } else if (e.kind === "turret") {
        // Advances to a firing line, then holds.
        if (e.x > VYOMA_WORLD.w * 0.62) e.x -= t.enemySpeed * DT;
      } else if (e.kind === "weaver") {
        e.x -= t.enemySpeed * DT;
        e.y += Math.sin((this.tickCount + e.x) / 6) * 30 * DT;
        e.y = clamp(e.y, 3, VYOMA_WORLD.h - 3);
      } else {
        e.x -= (e.kind === "bomber" ? t.enemySpeed * 0.6 : t.enemySpeed) * DT;
      }

      if (this.rng() < t.enemyFireChance * (e.kind === "boss" ? 5 : 1)) {
        this.enemyFire(e);
      }
    }
    // Anything that leaves the left edge is gone — no free kills for waiting.
    this.enemies = this.enemies.filter((e) => e.x > -8);
  }

  private enemyFire(from: VyomaEntity): void {
    const spread = from.kind === "bomber" || from.kind === "boss" ? [-20, 0, 20] : [0];
    for (const vy of spread) {
      this.shots.push({
        id: this.id("s"), x: from.x - 3, y: from.y,
        vx: -ENEMY_SHOT_SPEED, vy,
        fromPlayer: false, weapon: "basic",
      });
    }
  }

  private stepShots(): void {
    if (!this.run) return;
    for (const s of this.shots) {
      if (s.weapon === "missile" && s.fromPlayer) {
        // Home toward the nearest enemy ahead of the missile.
        const target = this.nearestEnemyAhead(s.x, s.y);
        if (target) {
          const dy = target.y - s.y;
          s.vy += clamp(dy, -1, 1) * 70 * DT;
          s.vy = clamp(s.vy, -55, 55);
        }
      }
      s.x += s.vx * DT;
      s.y += s.vy * DT;
    }
    this.shots = this.shots.filter(
      (s) => s.x > -6 && s.x < VYOMA_WORLD.w + 6 && s.y > -10 && s.y < VYOMA_WORLD.h + 10,
    );
  }

  private nearestEnemyAhead(x: number, y: number): VyomaEntity | null {
    let best: VyomaEntity | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.x < x) continue;
      const d = Math.abs(e.x - x) + Math.abs(e.y - y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  private stepPickups(): void {
    for (const p of this.pickups) p.x -= 20 * DT;
    this.pickups = this.pickups.filter((p) => p.x > -5);
  }

  private resolveCollisions(): void {
    const run = this.run;
    if (!run) return;

    // ── player shots vs enemies ──
    const spentShots = new Set<string>();
    for (const s of this.shots) {
      if (!s.fromPlayer) continue;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const hit =
          s.weapon === "wall"
            // The wall spans the full height — only the column matters.
            ? Math.abs(e.x - s.x) < 6
            : Math.abs(e.x - s.x) < HIT_RADIUS && Math.abs(e.y - s.y) < HIT_RADIUS;
        if (!hit) continue;

        e.hp -= s.weapon === "laser" ? 3 : s.weapon === "missile" ? 2 : 1;
        // Laser and wall punch through; basic and missile are consumed.
        if (s.weapon !== "laser" && s.weapon !== "wall") spentShots.add(s.id);
        if (e.hp <= 0) this.killEnemy(e, run);
        if (s.weapon !== "laser" && s.weapon !== "wall") break;
      }
    }
    this.shots = this.shots.filter((s) => !spentShots.has(s.id));
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    // ── pickups ──
    this.pickups = this.pickups.filter((p) => {
      const got = Math.abs(p.x - SHIP_X) < 6 && Math.abs(p.y - run.shipY) < 6;
      if (!got) return true;
      if (p.weapon === "life") run.lives = Math.min(run.lives + 1, 9);
      else run.ammo[p.weapon] += 1;
      return false;
    });

    // ── threats vs the pilot ──
    if (this.tickCount < run.invulnUntilTick) return;

    const shotHit = this.shots.find(
      (s) => !s.fromPlayer && Math.abs(s.x - SHIP_X) < HIT_RADIUS && Math.abs(s.y - run.shipY) < HIT_RADIUS,
    );
    const rammed = this.enemies.find(
      (e) => Math.abs(e.x - SHIP_X) < HIT_RADIUS + 1 && Math.abs(e.y - run.shipY) < HIT_RADIUS + 1,
    );
    if (!shotHit && !rammed) return;

    if (shotHit) this.shots = this.shots.filter((s) => s.id !== shotHit.id);
    if (rammed) this.enemies = this.enemies.filter((e) => e.id !== rammed.id);
    this.damagePilot(run);
  }

  private killEnemy(e: VyomaEntity, run: RunState): void {
    run.kills++;
    run.score += e.kind === "boss" ? 500 : e.kind === "bomber" ? 80 : e.kind === "turret" ? 60 : 30;
    if (e.kind === "boss") {
      run.bossActive = false;
      this.advanceLevel(run);
      return;
    }
    // Occasional drops keep specials in circulation without making them free.
    if (this.rng() < 0.07) {
      const roll = this.rng();
      const weapon: VyomaPickup["weapon"] =
        roll < 0.4 ? "missile" : roll < 0.7 ? "laser" : roll < 0.9 ? "wall" : "life";
      this.pickups.push({ id: this.id("p"), x: e.x, y: e.y, weapon });
    }
  }

  private damagePilot(run: RunState): void {
    run.lives -= 1;
    if (run.lives <= 0) {
      this.endRun("destroyed");
      return;
    }
    // Respawn: clear the immediate area so the pilot is not killed again on
    // the tick they return, and grant brief invulnerability.
    run.shipY = VYOMA_WORLD.h / 2;
    run.invulnUntilTick = this.tickCount + INVULN_TICKS;
    this.shots = this.shots.filter((s) => s.fromPlayer || s.x > SHIP_X + 25);
    this.enemies = this.enemies.filter((e) => e.x > SHIP_X + 25);
  }

  private checkLevelProgress(): void {
    const run = this.run;
    if (!run || run.bossActive) return;
    if (run.kills < killsForBoss(run.level)) return;
    this.summonBoss(run);
  }

  private summonBoss(run: RunState): void {
    const hp = this.tuning().bossHp + run.level * 6;
    run.bossActive = true;
    this.enemies.push({
      id: this.id("boss"),
      x: VYOMA_WORLD.w + 10,
      y: VYOMA_WORLD.h / 2,
      kind: "boss",
      hp,
      maxHp: hp,
    });
  }

  private advanceLevel(run: RunState): void {
    run.kills = 0;
    if (run.level >= this.opts.levels) {
      run.score += 1000; // clearing the whole game is worth naming
      run.level = this.opts.levels;
      this.endRun("cleared");
      return;
    }
    run.level += 1;
    run.invulnUntilTick = this.tickCount + INVULN_TICKS;
    this.enemies = [];
    this.shots = [];
  }

  /* ────────────────────────────── state ────────────────────────────── */

  getPublicState(): VyomaYudhPublicState {
    const run = this.run;
    const boss = this.enemies.find((e) => e.kind === "boss");
    return {
      kind: "vyomayudh",
      pilotId: run?.playerId ?? null,
      tick: this.tickCount,
      ship: run ? { x: SHIP_X, y: run.shipY, invulnUntilTick: run.invulnUntilTick } : null,
      lives: run?.lives ?? 0,
      score: run?.score ?? 0,
      level: run?.level ?? 0,
      ammo: run ? { ...run.ammo } : { missile: 0, laser: 0, wall: 0 },
      enemies: this.enemies.map((e) => ({ ...e })),
      shots: this.shots.map((s) => ({ ...s })),
      pickups: this.pickups.map((p) => ({ ...p })),
      bossHp: boss ? boss.hp / boss.maxHp : null,
      result: this.result ? { ...this.result } : null,
      isOver: this.isOverFlag,
      winnerId: this.winnerId,
    };
  }

  getStateFor(_playerId: string): VyomaYudhPublicState {
    // Nothing is hidden in a solo arcade run.
    return this.getPublicState();
  }

  isOver(): boolean {
    return this.isOverFlag;
  }

  removePlayer(playerId: string): void {
    if (playerId !== this.pilotId) return;
    // The pilot leaving ends the match, but their score is still recorded —
    // what they flew was real even if they walked away from it.
    if (this.run) this.endRun("destroyed");
    this.pilotId = null;
    this.isOverFlag = true;
  }

  /* Bots do not fly this one — it is a solo score attack. */
  pendingActors(): string[] { return []; }
  applyAutoMove(): MoveResult { return { ok: true }; }
  getPhaseTimerSeconds(): number { return 0; }
  armDeadline(): number { return 0; }
  clearDeadline(): void {}
  resolveDeadline(): void {}
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
