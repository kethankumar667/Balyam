import type {
  GameState,
  GameInput,
  MatchStats,
  BrickRacerSaveData,
} from "../types";
import { PlayerCar } from "../entities/PlayerCar";
import { EnemyCarManager } from "../entities/EnemyCarManager";
import { CollisionEngine } from "./CollisionEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { RetroSoundEngine } from "../audio/RetroSoundEngine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import { StorageService } from "../utils/storage";
import { LANE_CENTERS, SPRITES } from "../utils/constants";

export class StateMachine {
  public state: GameState = "BOOT";
  public previousState: GameState | null = null;

  public player: PlayerCar;
  public enemyManager: EnemyCarManager;
  public saveData: BrickRacerSaveData;

  public score: number = 0;
  public level: number = 1;
  public carsDodged: number = 0;
  public distanceMeters: number = 0;

  private stateTimer: number = 1200; // Boot timer
  private readyCountdown: number = 3;
  private readyTimer: number = 0;
  private roadOffset: number = 0;
  private crashAnimationTimer: number = 0;

  public selectedMenuIndex: number = 0;
  public menuItems = [
    "START RACE",
    "HIGH SCORES",
    "INSTRUCTIONS",
  ];

  constructor(
    private soundEngine: RetroSoundEngine,
    private onStatsChange: (stats: MatchStats) => void
  ) {
    this.player = new PlayerCar();
    this.enemyManager = new EnemyCarManager();
    this.saveData = StorageService.load();
    this.updateStats();
  }

  public getCurrentTickInterval(): number {
    if (this.state === "PLAYING") {
      return DifficultyEngine.getTickInterval(this.level, this.player.isBoosting);
    }
    return 100;
  }

  public update(dt: number): void {
    if (this.state === "BOOT") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "MENU";
      }
    } else if (this.state === "READY") {
      this.readyTimer -= dt;
      if (this.readyTimer <= 0) {
        this.readyCountdown--;
        if (this.readyCountdown <= 0) {
          this.state = "PLAYING";
        } else {
          this.readyTimer = 350;
          this.soundEngine.playMenuBeep();
        }
      }
    } else if (this.state === "PLAYING") {
      this.tickRace();
    }
  }

  private tickRace(): void {
    // 1. Advance road animation stripes
    this.roadOffset = (this.roadOffset + 1) % 3;

    // 2. Advance enemy traffic
    const { dodgedCount } = this.enemyManager.advance();

    // 3. Update dodge scoring
    if (dodgedCount > 0) {
      this.carsDodged += dodgedCount;
      const ptsPerCar = this.player.isBoosting ? 20 : 10;
      this.score += dodgedCount * ptsPerCar * this.level;
      this.soundEngine.playCarDodged();

      const nextLevel = DifficultyEngine.calculateLevel(this.carsDodged);
      if (nextLevel > this.level) {
        this.level = nextLevel;
        this.score += 100; // Level completion bonus
        this.soundEngine.playLevelUp();
      }
    }

    // 4. Update distance
    this.distanceMeters += this.player.isBoosting ? 30 : 15;

    // 5. Try spawn next wave
    this.enemyManager.trySpawnWave(this.level);

    // 6. Check Collision
    if (CollisionEngine.checkCollision(this.player, this.enemyManager)) {
      this.handleGameOver();
      return;
    }

    this.updateStats();
  }

  private handleGameOver(): void {
    this.soundEngine.playCrash();
    this.state = "GAME_OVER";
    this.crashAnimationTimer = 600;

    const isNewHigh = this.score > this.saveData.highScore;
    const nextData = StorageService.save({
      highScore: Math.max(this.saveData.highScore, this.score),
      matchesPlayed: this.saveData.matchesPlayed + 1,
      totalCarsDodged: this.saveData.totalCarsDodged + this.carsDodged,
      bestLevel: Math.max(this.saveData.bestLevel, this.level),
      longestDistance: Math.max(this.saveData.longestDistance, this.distanceMeters),
    });

    const { nextData: finalData } = StorageService.checkAchievements(
      this.score,
      this.carsDodged,
      this.level,
      this.distanceMeters
    );

    this.saveData = finalData;
    this.updateStats(isNewHigh);
  }

  public handleInput(input: GameInput): void {
    this.soundEngine.playKeyTick();

    if (this.state === "BOOT") {
      this.state = "MENU";
      return;
    }

    if (this.state === "MENU") {
      if (input === "LEFT") {
        this.selectedMenuIndex =
          (this.selectedMenuIndex - 1 + this.menuItems.length) %
          this.menuItems.length;
      } else if (input === "RIGHT") {
        this.selectedMenuIndex =
          (this.selectedMenuIndex + 1) % this.menuItems.length;
      } else if (input === "SELECT") {
        this.triggerMenuAction();
      }
    } else if (this.state === "PLAYING") {
      if (input === "LEFT") {
        const moved = this.player.moveLeft();
        if (moved) this.soundEngine.playLaneSwitch();
      } else if (input === "RIGHT") {
        const moved = this.player.moveRight();
        if (moved) this.soundEngine.playLaneSwitch();
      } else if (input === "BOOST_START") {
        this.player.isBoosting = !this.player.isBoosting;
        if (this.player.isBoosting) this.soundEngine.playBoost();
      } else if (input === "PAUSE" || input === "BACK") {
        this.togglePause();
      }
    } else if (this.state === "PAUSED") {
      if (input === "SELECT" || input === "PAUSE") {
        this.state = this.previousState || "PLAYING";
      } else if (input === "BACK" || input === "LEFT" || input === "RIGHT") {
        this.state = "MENU";
      }
    } else if (this.state === "GAME_OVER" || this.state === "HIGH_SCORE" || this.state === "INSTRUCTIONS") {
      if (input === "SELECT" && this.state === "GAME_OVER") {
        this.startMatch();
      } else {
        this.state = "MENU";
      }
    }
  }

  private triggerMenuAction(): void {
    switch (this.selectedMenuIndex) {
      case 0: // Start Race
        this.startMatch();
        break;
      case 1: // High Scores
        this.saveData = StorageService.load();
        this.state = "HIGH_SCORE";
        break;
      case 2: // Instructions
        this.state = "INSTRUCTIONS";
        break;
    }
  }

  public startMatch(): void {
    this.score = 0;
    this.level = 1;
    this.carsDodged = 0;
    this.distanceMeters = 0;
    this.player.reset();
    this.enemyManager.reset();

    this.state = "READY";
    this.readyCountdown = 3;
    this.readyTimer = 350;
    this.soundEngine.playMenuBeep();
    this.updateStats();
  }

  public togglePause(): void {
    if (this.state === "PLAYING" || this.state === "READY") {
      this.previousState = this.state;
      this.state = "PAUSED";
    } else if (this.state === "PAUSED") {
      this.state = this.previousState || "PLAYING";
    }
  }

  private updateStats(isNewHigh: boolean = false): void {
    this.onStatsChange({
      score: this.score,
      highScore: Math.max(this.saveData.highScore, this.score),
      level: this.level,
      carsDodged: this.carsDodged,
      distanceMeters: this.distanceMeters,
      speedKmh: DifficultyEngine.getSpeedKmh(this.level, this.player.isBoosting),
      isBoosting: this.player.isBoosting,
      isNewRecord: isNewHigh || (this.score > 0 && this.score >= this.saveData.highScore),
    });
  }

  // ── Render Dispatcher ─────────────────────────────────────────

  public render(r: RenderPipeline): void {
    r.clear();
    r.drawMatrixGrid();

    switch (this.state) {
      case "BOOT":
        this.renderBoot(r);
        break;
      case "MENU":
        this.renderMenu(r);
        break;
      case "READY":
      case "PLAYING":
        this.renderPlaying(r);
        break;
      case "PAUSED":
        this.renderPaused(r);
        break;
      case "GAME_OVER":
        this.renderGameOver(r);
        break;
      case "HIGH_SCORE":
        this.renderHighScores(r);
        break;
      case "INSTRUCTIONS":
        this.renderInstructions(r);
        break;
    }
  }

  private renderBoot(r: RenderPipeline): void {
    r.drawText("BRICK GAME", 64, 30, r.PIXEL_COLOR, 13);
    r.drawText("FORMULA 1", 70, 50, r.PIXEL_COLOR, 12);
    r.drawCar(6, 3, r.PIXEL_COLOR);
    r.drawText("PRESS 5 / START", 54, 160, r.PIXEL_COLOR, 10);
    r.drawText("9999 IN 1 RACER", 58, 190, r.PIXEL_COLOR, 9);
  }

  private renderMenu(r: RenderPipeline): void {
    r.drawText("★ FORMULA 1 ★", 54, 18, r.PIXEL_COLOR, 13);
    r.drawLine(16, 38, 212, 38);

    let y = 52;
    this.menuItems.forEach((item, idx) => {
      const isSelected = idx === this.selectedMenuIndex;
      if (isSelected) {
        r.fillRect(20, y - 2, 188, 20, r.PIXEL_COLOR);
        r.drawText(`► ${item}`, 28, y + 2, r.BG_COLOR, 11);
      } else {
        r.drawText(`  ${item}`, 28, y + 2, r.PIXEL_COLOR, 11);
      }
      y += 28;
    });

    r.drawCar(6, 6, r.PIXEL_COLOR);

    r.drawLine(16, 190, 212, 190);
    r.drawText("4/6:NAV  5:START", 54, 202, r.PIXEL_COLOR, 10);
  }

  private renderPlaying(r: RenderPipeline): void {
    // 1. Draw animated road stripes
    r.drawRoadStripes(this.roadOffset);

    // 2. Draw descending enemy traffic
    for (const enemy of this.enemyManager.enemies) {
      if (enemy.y >= -3 && enemy.y < 12) {
        const cx = LANE_CENTERS[enemy.lane];
        r.drawCar(cx, enemy.y, r.PIXEL_COLOR);
      }
    }

    // 3. Draw player car
    r.drawCar(this.player.centerCol, this.player.y, r.PIXEL_COLOR);

    // 4. Ready Countdown Overlay
    if (this.state === "READY") {
      r.fillRect(44, 75, 140, 60, r.PIXEL_COLOR);
      r.drawText("GET READY", 66, 85, r.BG_COLOR, 12);
      r.drawText(`- ${this.readyCountdown} -`, 94, 106, r.BG_COLOR, 14);
    }
  }

  private renderPaused(r: RenderPipeline): void {
    this.renderPlaying(r);
    r.fillRect(24, 70, 180, 85, r.PIXEL_COLOR);
    r.drawText("★ RACE PAUSED ★", 40, 80, r.BG_COLOR, 12);
    r.drawText("5/0: RESUME", 68, 108, r.BG_COLOR, 10);
    r.drawText("4/6: QUIT MENU", 56, 126, r.BG_COLOR, 10);
  }

  private renderGameOver(r: RenderPipeline): void {
    r.drawRoadStripes(0);
    r.drawCrashExplosion(this.player.centerCol, this.player.y);

    r.fillRect(16, 18, 196, 172, r.PIXEL_COLOR);
    const isNewRecord = this.score > 0 && this.score >= this.saveData.highScore;
    const title = isNewRecord ? "★ NEW RECORD! ★" : "★ CRASHED! ★";
    r.drawText(title, 48, 28, r.BG_COLOR, 12);

    r.drawText(`SCORE: ${this.score}`, 32, 54, r.BG_COLOR, 10.5);
    r.drawText(`BEST:  ${this.saveData.highScore}`, 32, 72, r.BG_COLOR, 10.5);
    r.drawText(`DODGED:${this.carsDodged} CARS`, 32, 90, r.BG_COLOR, 10.5);
    r.drawText(`DIST:  ${this.distanceMeters} M`, 32, 108, r.BG_COLOR, 10.5);
    r.drawText(`LEVEL: LV ${this.level}`, 32, 126, r.BG_COLOR, 10.5);

    r.drawText("5:PLAY AGAIN", 60, 154, r.BG_COLOR, 11);

    r.drawLine(16, 198, 212, 198);
    r.drawText("0: BACK TO MENU", 54, 208, r.PIXEL_COLOR, 10);
  }

  private renderHighScores(r: RenderPipeline): void {
    r.drawText("★ HIGH SCORES ★", 48, 18, r.PIXEL_COLOR, 13);
    r.drawLine(16, 38, 212, 38);

    r.drawText(`BEST SCORE: ${this.saveData.highScore}`, 24, 55, r.PIXEL_COLOR, 10.5);
    r.drawText(`TOTAL DODGED:${this.saveData.totalCarsDodged}`, 24, 80, r.PIXEL_COLOR, 10.5);
    r.drawText(`MAX DIST:   ${this.saveData.longestDistance}M`, 24, 105, r.PIXEL_COLOR, 10.5);
    r.drawText(`RACES:      ${this.saveData.matchesPlayed}`, 24, 130, r.PIXEL_COLOR, 10.5);
    r.drawText(`BEST LEVEL: LV ${this.saveData.bestLevel}`, 24, 155, r.PIXEL_COLOR, 10.5);

    r.drawLine(16, 195, 212, 195);
    r.drawText("5/0: BACK TO MENU", 48, 206, r.PIXEL_COLOR, 10);
  }

  private renderInstructions(r: RenderPipeline): void {
    r.drawText("HOW TO PLAY", 64, 18, r.PIXEL_COLOR, 13);
    r.drawLine(16, 38, 212, 38);

    r.drawText("4/A: MOVE LEFT", 24, 52, r.PIXEL_COLOR, 10.5);
    r.drawText("6/D: MOVE RIGHT", 24, 72, r.PIXEL_COLOR, 10.5);
    r.drawText("8/S: BOOST SPEED", 24, 92, r.PIXEL_COLOR, 10.5);
    r.drawText("0/P: PAUSE / RESUME", 24, 112, r.PIXEL_COLOR, 10.5);
    r.drawText("DODGE CARS TO SCORE", 20, 140, r.PIXEL_COLOR, 10);
    r.drawText("BOOST GIVES 2X PTS!", 20, 160, r.PIXEL_COLOR, 10);

    r.drawLine(16, 195, 212, 195);
    r.drawText("5/0: BACK TO MENU", 48, 206, r.PIXEL_COLOR, 10);
  }
}
