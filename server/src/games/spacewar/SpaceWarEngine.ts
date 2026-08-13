import type {
  GameKind,
  Player,
  SpaceWarOptions,
  SpaceWarPublicState,
  SpaceWarSpecialType,
  SpaceWarThemeId,
  SpaceWarEnemy,
  SpaceWarProjectile,
  SpaceWarSpecialAttack,
  SpaceWarPowerUp,
} from "@shared/types.js";
import { SPACEWAR_TICK_HZ, SPACEWAR_WORLD } from "@shared/types.js";
import type { MoveContext, MoveResult, RealtimeEngine } from "../GameEngine.js";

// One copy of the flight envelope, shared with the board so its local
// prediction cannot drift from the simulation it is predicting.
const CANVAS_WIDTH = SPACEWAR_WORLD.width;
const CANVAS_HEIGHT = SPACEWAR_WORLD.height;

export class SpaceWarEngine implements RealtimeEngine {
  readonly kind: GameKind = "spacewar";
  readonly minPlayers = 1;
  readonly maxPlayers = 1;
  // From shared: the board interpolates between broadcasts using this exact
  // number, and a private copy is a copy that drifts.
  readonly tickRateHz = SPACEWAR_TICK_HZ;

  private options: SpaceWarOptions = { startingLives: 4, theme: "cyberpunk" };
  private theme: SpaceWarThemeId = "cyberpunk";
  private player = {
    x: 20,
    y: 205,
    width: SPACEWAR_WORLD.shipWidth,
    height: SPACEWAR_WORLD.shipHeight,
    lives: 4,
    maxLives: 7,
    shieldOn: true,
    shieldTimeLeft: 3000,
    specialAttack: "missile" as SpaceWarSpecialType,
    specialCount: 3,
  };

  private score = 0;
  private highScore = 0;
  private level = 1;
  private maxLevels = 8;
  private waveProgress = 0;
  private waveTarget = 15;
  private bossActive = false;

  private projectiles: SpaceWarProjectile[] = [];
  private specials: SpaceWarSpecialAttack[] = [];
  private enemies: SpaceWarEnemy[] = [];
  private powerUps: SpaceWarPowerUp[] = [];

  private activePlayerId: string | null = null;
  private activeKeys = new Set<string>();
  private paused = false;
  private gameOver = false;
  private winnerId: string | null = null;

  private enemySpawnTimer = 0;
  private enemySpawnInterval = 60; // ticks (2 seconds)
  private nextId = 1;

  setOptions(opts?: Partial<SpaceWarOptions>): void {
    if (opts?.startingLives != null) {
      this.options.startingLives = opts.startingLives;
      this.player.lives = opts.startingLives;
    }
    if (opts?.theme != null) {
      this.options.theme = opts.theme;
      this.theme = opts.theme;
    }
  }

  init(players: Player[]): void {
    if (players.length > 0) {
      this.activePlayerId = players[0].id;
    }
    this.player.x = 20;
    this.player.y = 205;
    this.player.lives = this.options.startingLives;
    this.player.shieldOn = true;
    this.player.shieldTimeLeft = 3000;
    this.player.specialAttack = "missile";
    this.player.specialCount = 3;

    this.score = 0;
    this.level = 1;
    this.waveProgress = 0;
    this.waveTarget = 15;
    this.bossActive = false;

    this.projectiles = [];
    this.specials = [];
    this.enemies = [];
    this.powerUps = [];

    this.activeKeys.clear();
    this.paused = false;
    this.gameOver = false;
    this.winnerId = null;
  }

  applyMove(move: MoveContext): MoveResult {
    if (this.gameOver) return { ok: false, error: "Game is over" };

    const { type, data } = move;

    if (type === "keydown" && typeof data === "string") {
      this.activeKeys.add(data);
      if (data === "p" || data === "P") {
        this.paused = !this.paused;
      }
      if (data === " " && !this.paused) {
        this.firePrimary();
      }
      if ((data === "x" || data === "X") && !this.paused) {
        this.fireSpecial();
      }
    } else if (type === "keyup" && typeof data === "string") {
      this.activeKeys.delete(data);
    } else if (type === "fire") {
      if (!this.paused) this.firePrimary();
    } else if (type === "special") {
      if (!this.paused) this.fireSpecial();
    } else if (type === "toggle_pause") {
      this.paused = !this.paused;
    } else if (type === "set_theme" && typeof data === "string") {
      if (["cyberpunk", "retro_nokia", "neon_synthwave", "solar_flare"].includes(data)) {
        this.theme = data as SpaceWarThemeId;
      }
    }

    return { ok: true, isOver: this.gameOver, winnerId: this.winnerId };
  }

  private firePrimary(): void {
    const pId = `proj_${this.nextId++}`;
    this.projectiles.push({
      id: pId,
      isPlayer: true,
      x: this.player.x + this.player.width,
      y: this.player.y + this.player.height / 2 - 5,
      vx: 12,
      vy: 0,
      width: 20,
      height: 10,
    });
  }

  private fireSpecial(): void {
    if (this.player.specialCount <= 0) return;
    this.player.specialCount--;

    const sId = `spec_${this.nextId++}`;
    if (this.player.specialAttack === "missile") {
      let nearest: SpaceWarEnemy | undefined;
      let minDst = Infinity;
      for (const e of this.enemies) {
        const dst = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dst < minDst) {
          minDst = dst;
          nearest = e;
        }
      }
      this.specials.push({
        id: sId,
        type: "missile",
        x: this.player.x + this.player.width,
        y: this.player.y + this.player.height / 2 - 10,
        vx: 8,
        vy: 0,
        width: 30,
        height: 16,
        targetId: nearest?.id,
      });
    } else if (this.player.specialAttack === "laser") {
      this.specials.push({
        id: sId,
        type: "laser",
        x: this.player.x + this.player.width,
        y: this.player.y + this.player.height / 2 - 15,
        vx: 20,
        vy: 0,
        width: 200,
        height: 30,
      });
    } else if (this.player.specialAttack === "wall") {
      this.specials.push({
        id: sId,
        type: "wall",
        x: this.player.x + this.player.width,
        y: 0,
        vx: 5,
        vy: 0,
        width: 25,
        height: CANVAS_HEIGHT,
      });
    }
  }

  simulateTick(): MoveResult {
    if (this.gameOver || this.paused) {
      return { ok: true, isOver: this.gameOver, winnerId: this.winnerId };
    }

    const dtMs = 1000 / this.tickRateHz;

    const speed = SPACEWAR_WORLD.shipSpeed;
    const margin = SPACEWAR_WORLD.shipMarginY;
    if (this.activeKeys.has("ArrowLeft") || this.activeKeys.has("a") || this.activeKeys.has("A")) {
      this.player.x = Math.max(0, this.player.x - speed);
    }
    if (this.activeKeys.has("ArrowRight") || this.activeKeys.has("d") || this.activeKeys.has("D")) {
      this.player.x = Math.min(CANVAS_WIDTH - this.player.width, this.player.x + speed);
    }
    if (this.activeKeys.has("ArrowUp") || this.activeKeys.has("w") || this.activeKeys.has("W")) {
      this.player.y = Math.max(margin, this.player.y - speed);
    }
    if (this.activeKeys.has("ArrowDown") || this.activeKeys.has("s") || this.activeKeys.has("S")) {
      this.player.y = Math.min(CANVAS_HEIGHT - this.player.height - margin, this.player.y + speed);
    }

    if (this.player.shieldOn) {
      this.player.shieldTimeLeft -= dtMs;
      if (this.player.shieldTimeLeft <= 0) {
        this.player.shieldOn = false;
      }
    }

    this.enemySpawnTimer++;
    if (!this.bossActive && this.enemySpawnTimer >= this.enemySpawnInterval) {
      this.enemySpawnTimer = 0;
      this.spawnEnemy();
    }

    for (const e of this.enemies) {
      e.x += e.speedX;
      e.y += e.speedY;

      if (e.type === "zigzag") {
        if (e.y <= 20 || e.y >= CANVAS_HEIGHT - e.height - 20) {
          e.speedY *= -1;
        }
      } else if (e.type === "boss") {
        if (e.y <= 30 || e.y >= CANVAS_HEIGHT - e.height - 30) {
          e.speedY *= -1;
        }
        if (Math.random() < 0.08) {
          this.projectiles.push({
            id: `proj_${this.nextId++}`,
            isPlayer: false,
            x: e.x,
            y: e.y + e.height / 2,
            vx: -9,
            vy: (Math.random() - 0.5) * 4,
            width: 16,
            height: 10,
          });
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.x + e.width > -50 && e.hp > 0);

    for (const p of this.projectiles) {
      p.x += p.vx;
      p.y += p.vy;
    }
    this.projectiles = this.projectiles.filter((p) => p.x >= 0 && p.x <= CANVAS_WIDTH + 50);

    for (const s of this.specials) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.type === "missile" && s.targetId) {
        const tgt = this.enemies.find((e) => e.id === s.targetId);
        if (tgt) {
          if (tgt.y > s.y) s.vy += 0.5;
          if (tgt.y < s.y) s.vy -= 0.5;
        }
      }
    }
    this.specials = this.specials.filter((s) => s.x <= CANVAS_WIDTH + 200);

    for (const pu of this.powerUps) {
      pu.x += pu.speedX;
    }
    this.powerUps = this.powerUps.filter((pu) => pu.x + 40 > 0);

    this.handleCollisions();

    if (this.score > this.highScore) {
      this.highScore = this.score;
    }

    return { ok: true, isOver: this.gameOver, winnerId: this.winnerId };
  }

  private spawnEnemy(): void {
    const eId = `enemy_${this.nextId++}`;
    const types: ("scouter" | "zigzag" | "kamikaze" | "heavy")[] = [
      "scouter",
      "zigzag",
      "kamikaze",
      "heavy",
    ];

    if (this.waveProgress >= this.waveTarget) {
      this.bossActive = true;
      const bossHp = 80 + this.level * 40;
      this.enemies.push({
        id: `boss_lvl_${this.level}`,
        type: "boss",
        x: CANVAS_WIDTH - 140,
        y: CANVAS_HEIGHT / 2 - 60,
        width: 130,
        height: 120,
        hp: bossHp,
        maxHp: bossHp,
        speedX: 0,
        speedY: 2 + this.level * 0.5,
      });
      return;
    }

    const type = types[Math.floor(Math.random() * types.length)];
    const y = 30 + Math.random() * (CANVAS_HEIGHT - 120);

    let speedX = -4 - this.level * 0.5;
    let speedY = 0;
    let width = 50;
    let height = 40;
    let hp = 1 + Math.floor(this.level / 3);

    if (type === "zigzag") {
      speedY = (Math.random() > 0.5 ? 1 : -1) * (2 + this.level * 0.4);
    } else if (type === "kamikaze") {
      speedX = -7 - this.level * 0.5;
      width = 40;
      height = 30;
    } else if (type === "heavy") {
      speedX = -2;
      width = 70;
      height = 60;
      hp = 4 + this.level;
    }

    this.enemies.push({
      id: eId,
      type,
      x: CANVAS_WIDTH,
      y,
      width,
      height,
      hp,
      maxHp: hp,
      speedX,
      speedY,
    });

    this.waveProgress++;
  }

  private handleCollisions(): void {
    // 1. Player Projectiles vs Enemies & Enemy Projectiles
    const playerProjectiles = this.projectiles.filter((p) => p.isPlayer);
    const enemyProjectiles = this.projectiles.filter((p) => !p.isPlayer);

    for (const p of playerProjectiles) {
      // Check bullet vs bullet
      for (const ep of enemyProjectiles) {
        if (ep.x >= 0 && this.checkIntersect(p, ep)) {
          p.x = CANVAS_WIDTH + 100;
          ep.x = -100;
          this.score += 10;
          break;
        }
      }

      if (p.x > CANVAS_WIDTH) continue;

      // Check bullet vs enemy
      for (const e of this.enemies) {
        if (this.checkIntersect(p, e)) {
          p.x = CANVAS_WIDTH + 100;
          e.hp -= 1;
          if (e.hp <= 0) {
            this.onEnemyKilled(e);
          }
          break;
        }
      }
    }

    // 2. Special Attacks vs Enemies & Enemy Projectiles
    for (const s of this.specials) {
      // Check special vs enemy projectiles
      for (const ep of enemyProjectiles) {
        if (ep.x >= 0 && this.checkIntersect(s, ep)) {
          ep.x = -100;
        }
      }

      // Check special vs enemies
      for (const e of this.enemies) {
        if (this.checkIntersect(s, e)) {
          const dmg = s.type === "laser" ? 3 : s.type === "wall" ? 5 : 4;
          e.hp -= dmg;
          if (s.type === "missile") {
            s.x = CANVAS_WIDTH + 300;
          }
          if (e.hp <= 0) {
            this.onEnemyKilled(e);
          }
        }
      }
    }

    if (!this.player.shieldOn) {
      for (const p of this.projectiles.filter((p) => !p.isPlayer)) {
        if (this.checkIntersect(p, this.player)) {
          p.x = -100;
          this.onPlayerHit();
          break;
        }
      }

      for (const e of this.enemies) {
        if (this.checkIntersect(e, this.player)) {
          if (e.type !== "boss") e.hp = 0;
          this.onPlayerHit();
          break;
        }
      }
    }

    for (const pu of this.powerUps) {
      if (this.checkIntersect({ x: pu.x, y: pu.y, width: 40, height: 40 }, this.player)) {
        pu.x = -100;
        if (pu.type === "life") {
          this.player.lives = Math.min(this.player.maxLives, this.player.lives + 1);
        } else if (pu.type === "ammo") {
          this.player.specialCount = Math.min(9, this.player.specialCount + 3);
          const types: SpaceWarSpecialType[] = ["missile", "laser", "wall"];
          const currIdx = types.indexOf(this.player.specialAttack);
          this.player.specialAttack = types[(currIdx + 1) % types.length];
        } else if (pu.type === "shield") {
          this.player.shieldOn = true;
          this.player.shieldTimeLeft = 4000;
        }
        this.score += 50;
      }
    }

    // Clean up destroyed projectiles and powerups
    this.projectiles = this.projectiles.filter((p) => p.x >= 0 && p.x <= CANVAS_WIDTH + 50);
    this.powerUps = this.powerUps.filter((pu) => pu.x + 40 > 0);
  }

  private onEnemyKilled(e: SpaceWarEnemy): void {
    if (e.type === "boss") {
      this.bossActive = false;
      this.score += 500 * this.level;
      if (this.level >= this.maxLevels) {
        this.gameOver = true;
        this.winnerId = this.activePlayerId;
      } else {
        this.level++;
        this.waveProgress = 0;
        this.waveTarget = 15 + this.level * 5;
        this.player.shieldOn = true;
        this.player.shieldTimeLeft = 3000;
      }
    } else {
      this.score += e.type === "heavy" ? 100 : 30;
      if (Math.random() < 0.15) {
        const pTypes: ("life" | "ammo" | "shield")[] = ["life", "ammo", "shield"];
        this.powerUps.push({
          id: `pu_${this.nextId++}`,
          type: pTypes[Math.floor(Math.random() * pTypes.length)],
          x: e.x,
          y: e.y,
          speedX: -2,
        });
      }
    }
  }

  private onPlayerHit(): void {
    this.player.lives -= 1;
    if (this.player.lives <= 0) {
      this.gameOver = true;
      this.winnerId = null;
    } else {
      this.player.shieldOn = true;
      this.player.shieldTimeLeft = 3000;
    }
  }

  private checkIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  getStateFor(playerId: string): unknown {
    return this.getPublicState();
  }

  getPublicState(): SpaceWarPublicState {
    const boss = this.enemies.find((e) => e.type === "boss");
    return {
      kind: "spacewar",
      player: {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
        lives: this.player.lives,
        maxLives: this.player.maxLives,
        shieldOn: this.player.shieldOn,
        shieldTimeLeft: this.player.shieldTimeLeft,
        specialAttack: this.player.specialAttack,
        specialCount: this.player.specialCount,
      },
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      maxLevels: this.maxLevels,
      projectiles: this.projectiles,
      specials: this.specials,
      enemies: this.enemies,
      powerUps: this.powerUps,
      bossHp: boss ? boss.hp : null,
      bossMaxHp: boss ? boss.maxHp : null,
      isPaused: this.paused,
      isOver: this.gameOver,
      winnerId: this.winnerId,
      theme: this.theme,
    };
  }

  isOver(): boolean {
    return this.gameOver;
  }

  removePlayer(playerId: string): void {
    if (this.activePlayerId === playerId) {
      this.gameOver = true;
    }
  }
}
