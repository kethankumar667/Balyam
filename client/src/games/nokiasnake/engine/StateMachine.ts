import type {
  GameState,
  GameMode,
  Direction,
  GameInput,
  MatchStats,
  NokiaSnakeSaveData,
} from "../types";
import { Snake } from "../entities/Snake";
import { FoodManager } from "../entities/FoodManager";
import { CollisionEngine } from "./CollisionEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { RetroSoundEngine } from "../audio/RetroSoundEngine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import { StorageService } from "../utils/storage";
import { GRID_CONFIG, SPRITES } from "../utils/constants";

export class StateMachine {
  public state: GameState = "BOOT";
  public previousState: GameState | null = null;
  public gameMode: GameMode = "CLASSIC";

  public snake: Snake;
  public foodManager: FoodManager;
  public saveData: NokiaSnakeSaveData;

  public score: number = 0;
  public level: number = 1;
  public foodEaten: number = 0;
  public bonusCount: number = 0;

  private stateTimer: number = 1500; // Boot timer
  private readyCountdown: number = 3;
  private readyTimer: number = 0;

  public selectedMenuIndex: number = 0;
  public menuItems = [
    "START GAME",
    "MODE: CLASSIC",
    "HIGH SCORES",
    "INSTRUCTIONS",
  ];

  constructor(
    private soundEngine: RetroSoundEngine,
    private onStatsChange: (stats: MatchStats) => void
  ) {
    this.snake = new Snake(4);
    this.foodManager = new FoodManager();
    this.saveData = StorageService.load();
    this.updateStats();
  }

  public getCurrentTickInterval(): number {
    if (this.state === "PLAYING") {
      return DifficultyEngine.getTickInterval(this.level);
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
          this.readyTimer = 400;
          this.soundEngine.playMenuBeep();
        }
      }
    } else if (this.state === "PLAYING") {
      this.tickMatch();
    }
  }

  private tickMatch(): void {
    const wrapAround = this.gameMode === "WRAP_AROUND";
    const newHead = this.snake.advance(wrapAround, GRID_CONFIG.COLS, GRID_CONFIG.ROWS);

    // 1. Wall Collision Check (in Classic Mode)
    if (!wrapAround && CollisionEngine.checkWallCollision(newHead, GRID_CONFIG.COLS, GRID_CONFIG.ROWS)) {
      this.handleGameOver();
      return;
    }

    // 2. Self Collision Check
    if (CollisionEngine.checkSelfCollision(this.snake.body)) {
      this.handleGameOver();
      return;
    }

    // 3. Food Collision Check
    if (CollisionEngine.checkFoodCollision(newHead, this.foodManager.normalFood)) {
      this.snake.grow(1);
      this.foodEaten++;
      const pts = DifficultyEngine.calculateNormalScore(this.level);
      this.score += pts;
      this.level = DifficultyEngine.calculateLevel(this.foodEaten);
      this.soundEngine.playEat();

      // Spawn next normal food
      this.foodManager.spawnNormalFood(this.snake.body, GRID_CONFIG.COLS, GRID_CONFIG.ROWS);

      // Check if bonus food should spawn (every 5 food items)
      if (this.foodEaten % 5 === 0 && !this.foodManager.bonusFood) {
        this.foodManager.spawnBonusFood(this.snake.body, GRID_CONFIG.COLS, GRID_CONFIG.ROWS);
      }

      this.updateStats();
      return;
    }

    // 4. Bonus Food Collision Check
    if (CollisionEngine.checkFoodCollision(newHead, this.foodManager.bonusFood)) {
      const bonusPts = DifficultyEngine.calculateBonusScore(
        this.level,
        this.foodManager.bonusTimer,
        this.foodManager.maxBonusTimer
      );
      this.score += bonusPts;
      this.bonusCount++;
      this.foodManager.bonusFood = null;
      this.soundEngine.playBonusEat();
      this.updateStats();
      return;
    }

    // 5. Tick bonus insect timer
    this.foodManager.tickBonus();
    this.updateStats();
  }

  private handleGameOver(): void {
    this.soundEngine.playCrash();
    this.state = "GAME_OVER";

    const isNewHigh = this.score > this.saveData.highScore;
    const nextData = StorageService.save({
      highScore: Math.max(this.saveData.highScore, this.score),
      matchesPlayed: this.saveData.matchesPlayed + 1,
      totalFoodCollected: this.saveData.totalFoodCollected + this.foodEaten,
      bestLevel: Math.max(this.saveData.bestLevel, this.level),
      longestSnake: Math.max(this.saveData.longestSnake, this.snake.length),
    });

    const { nextData: finalData } = StorageService.checkAchievements(
      this.score,
      this.snake.length,
      this.level,
      this.bonusCount
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
      if (input === "UP" || input === "LEFT") {
        this.selectedMenuIndex =
          (this.selectedMenuIndex - 1 + this.menuItems.length) %
          this.menuItems.length;
      } else if (input === "DOWN" || input === "RIGHT") {
        this.selectedMenuIndex =
          (this.selectedMenuIndex + 1) % this.menuItems.length;
      } else if (input === "SELECT") {
        this.triggerMenuAction();
      }
    } else if (this.state === "PLAYING") {
      if (input === "UP" || input === "DOWN" || input === "LEFT" || input === "RIGHT") {
        const changed = this.snake.setDirection(input as Direction);
        if (changed) {
          this.soundEngine.playTurn();
        }
      } else if (input === "PAUSE" || input === "BACK") {
        this.togglePause();
      }
    } else if (this.state === "PAUSED") {
      if (input === "SELECT" || input === "PAUSE" || input === "UP") {
        this.state = this.previousState || "PLAYING";
      } else if (input === "BACK" || input === "LEFT" || input === "RIGHT" || input === "DOWN") {
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
      case 0: // Start Game
        this.startMatch();
        break;
      case 1: // Toggle Game Mode
        this.gameMode = this.gameMode === "CLASSIC" ? "WRAP_AROUND" : "CLASSIC";
        this.menuItems[1] = `MODE: ${this.gameMode === "CLASSIC" ? "CLASSIC" : "WRAP"}`;
        break;
      case 2: // High Scores
        this.saveData = StorageService.load();
        this.state = "HIGH_SCORE";
        break;
      case 3: // Instructions
        this.state = "INSTRUCTIONS";
        break;
    }
  }

  public startMatch(): void {
    this.score = 0;
    this.level = 1;
    this.foodEaten = 0;
    this.bonusCount = 0;
    this.snake.reset(4);
    this.foodManager.clear();
    this.foodManager.spawnNormalFood(this.snake.body, GRID_CONFIG.COLS, GRID_CONFIG.ROWS);

    this.state = "READY";
    this.readyCountdown = 3;
    this.readyTimer = 400;
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
      foodEaten: this.foodEaten,
      bonusCount: this.bonusCount,
      length: this.snake.length,
      speedMs: DifficultyEngine.getTickInterval(this.level),
      isNewRecord: isNewHigh || (this.score > 0 && this.score >= this.saveData.highScore),
      gameMode: this.gameMode,
    });
  }

  // ── Render Dispatcher ─────────────────────────────────────────

  public render(r: RenderPipeline): void {
    r.clear();

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
    r.drawText("BHALYAM", 54, 25, r.PIXEL_COLOR, 11);
    r.drawText("RETRO SNAKE", 42, 40, r.PIXEL_COLOR, 11);
    r.drawSprite(SPRITES.SNAKE_LOGO, 72, 60, r.PIXEL_COLOR, 2);
    r.drawText("PRESS 5 / ANY KEY", 28, 95, r.PIXEL_COLOR, 9);
    r.drawText("NOKIA 1100 MONOCHROME", 22, 135, r.PIXEL_COLOR, 8);
  }

  private renderMenu(r: RenderPipeline): void {
    r.drawText("★ RETRO SNAKE ★", 28, 10, r.PIXEL_COLOR, 10);
    r.drawLine(8, 24, 152, 24);

    let y = 34;
    this.menuItems.forEach((item, idx) => {
      const isSelected = idx === this.selectedMenuIndex;
      if (isSelected) {
        r.fillRect(10, y - 2, 140, 14, r.PIXEL_COLOR);
        r.drawText(`► ${item}`, 16, y, r.BG_COLOR, 9);
      } else {
        r.drawText(`  ${item}`, 16, y, r.PIXEL_COLOR, 9);
      }
      y += 18;
    });

    r.drawLine(8, 130, 152, 130);
    r.drawText("2/8:NAV  5:SELECT", 28, 138, r.PIXEL_COLOR, 8);
  }

  private renderPlaying(r: RenderPipeline): void {
    // 1. Top HUD
    const scoreStr = String(this.score).padStart(4, "0");
    const highStr = String(Math.max(this.saveData.highScore, this.score)).padStart(4, "0");
    r.drawText(`SC:${scoreStr}`, 8, 4, r.PIXEL_COLOR, 8);
    r.drawText(`LV:${this.level}`, 68, 4, r.PIXEL_COLOR, 8);
    r.drawText(`HI:${highStr}`, 108, 4, r.PIXEL_COLOR, 8);

    // 2. Arena Outer Border
    if (this.gameMode === "CLASSIC") {
      r.strokeRect(
        GRID_CONFIG.OFFSET_X - 1,
        GRID_CONFIG.OFFSET_Y - 1,
        GRID_CONFIG.ARENA_WIDTH + 2,
        GRID_CONFIG.ARENA_HEIGHT + 2,
        r.PIXEL_COLOR,
        1
      );
    } else {
      // Dashed border for wrap-around mode
      r.strokeRect(
        GRID_CONFIG.OFFSET_X - 1,
        GRID_CONFIG.OFFSET_Y - 1,
        GRID_CONFIG.ARENA_WIDTH + 2,
        GRID_CONFIG.ARENA_HEIGHT + 2,
        r.PIXEL_GHOST,
        1
      );
    }

    // 3. Render Normal Food Pellet
    if (this.foodManager.normalFood) {
      r.drawCell(
        this.foodManager.normalFood.x,
        this.foodManager.normalFood.y,
        r.PIXEL_COLOR
      );
    }

    // 4. Render Bonus Food Insect
    if (this.foodManager.bonusFood) {
      const bx = GRID_CONFIG.OFFSET_X + this.foodManager.bonusFood.x * GRID_CONFIG.CELL_SIZE;
      const by = GRID_CONFIG.OFFSET_Y + this.foodManager.bonusFood.y * GRID_CONFIG.CELL_SIZE;
      r.drawSprite(SPRITES.BONUS_INSECT, bx + 1, by + 1, r.PIXEL_COLOR, 1);
    }

    // 5. Render Snake Body & Head
    this.snake.body.forEach((seg, idx) => {
      if (idx === 0) {
        // Head
        r.drawCell(seg.x, seg.y, r.PIXEL_COLOR);
      } else {
        // Body segment with slightly smaller fill for authentic matrix feel
        const px = GRID_CONFIG.OFFSET_X + seg.x * GRID_CONFIG.CELL_SIZE;
        const py = GRID_CONFIG.OFFSET_Y + seg.y * GRID_CONFIG.CELL_SIZE;
        r.fillRect(px + 1.5, py + 1.5, GRID_CONFIG.CELL_SIZE - 3, GRID_CONFIG.CELL_SIZE - 3, r.PIXEL_COLOR);
      }
    });

    // 6. Ready Countdown Overlay
    if (this.state === "READY") {
      r.fillRect(45, 65, 70, 30, r.PIXEL_COLOR);
      r.drawText("READY", 62, 70, r.BG_COLOR, 9);
      r.drawText(`- ${this.readyCountdown} -`, 68, 82, r.BG_COLOR, 10);
    }

    // 7. Bottom Help Line
    r.drawText("2:▲ 4:◄ 6:► 8:▼ 0:||", 24, 150, r.PIXEL_COLOR, 7);
  }

  private renderPaused(r: RenderPipeline): void {
    this.renderPlaying(r);
    r.fillRect(20, 48, 120, 52, r.PIXEL_COLOR);
    r.drawText("★ GAME PAUSED ★", 32, 54, r.BG_COLOR, 9);
    r.drawText("5/0: RESUME", 46, 70, r.BG_COLOR, 8);
    r.drawText("4/6: QUIT MENU", 40, 82, r.BG_COLOR, 8);
  }

  private renderGameOver(r: RenderPipeline): void {
    const isNewRecord = this.score > 0 && this.score >= this.saveData.highScore;
    r.fillRect(0, 0, 160, 16, r.PIXEL_COLOR);
    const title = isNewRecord ? "★ NEW HIGH SCORE! ★" : "★ GAME OVER ★";
    r.drawText(title, 24, 3, r.BG_COLOR, 9);

    r.drawText(`FINAL SCORE: ${this.score}`, 24, 28, r.PIXEL_COLOR, 9);
    r.drawText(`HIGH SCORE:  ${this.saveData.highScore}`, 24, 44, r.PIXEL_COLOR, 9);
    r.drawText(`FOOD EATEN:  ${this.foodEaten}`, 24, 60, r.PIXEL_COLOR, 9);
    r.drawText(`LENGTH:      ${this.snake.length} SEG`, 24, 76, r.PIXEL_COLOR, 9);
    r.drawText(`LEVEL:       ${this.level}`, 24, 92, r.PIXEL_COLOR, 9);

    if (isNewRecord) {
      r.drawSprite(SPRITES.TROPHY, 125, 32, r.PIXEL_COLOR, 2);
    } else {
      r.drawSprite(SPRITES.SKULL, 128, 36, r.PIXEL_COLOR, 2);
    }

    r.drawLine(8, 126, 152, 126);
    r.drawText("5:PLAY AGAIN  0:MENU", 20, 136, r.PIXEL_COLOR, 8);
  }

  private renderHighScores(r: RenderPipeline): void {
    r.drawText("★ HIGH SCORES ★", 34, 10, r.PIXEL_COLOR, 10);
    r.drawLine(8, 24, 152, 24);

    r.drawText(`BEST SCORE:   ${this.saveData.highScore} PTS`, 16, 36, r.PIXEL_COLOR, 8.5);
    r.drawText(`LONGEST SNAKE:${this.saveData.longestSnake} SEGS`, 16, 52, r.PIXEL_COLOR, 8.5);
    r.drawText(`TOTAL FOOD:   ${this.saveData.totalFoodCollected}`, 16, 68, r.PIXEL_COLOR, 8.5);
    r.drawText(`MATCHES:      ${this.saveData.matchesPlayed}`, 16, 84, r.PIXEL_COLOR, 8.5);
    r.drawText(`BEST LEVEL:   LV ${this.saveData.bestLevel}`, 16, 100, r.PIXEL_COLOR, 8.5);

    r.drawLine(8, 130, 152, 130);
    r.drawText("5/0: BACK TO MENU", 32, 138, r.PIXEL_COLOR, 8);
  }

  private renderInstructions(r: RenderPipeline): void {
    r.drawText("HOW TO PLAY", 46, 10, r.PIXEL_COLOR, 10);
    r.drawLine(8, 24, 152, 24);

    r.drawText("2:UP  8:DOWN", 18, 34, r.PIXEL_COLOR, 8.5);
    r.drawText("4:LEFT  6:RIGHT", 18, 48, r.PIXEL_COLOR, 8.5);
    r.drawText("5:SELECT  0:PAUSE", 18, 62, r.PIXEL_COLOR, 8.5);
    r.drawText("EAT PELLETS TO GROW", 14, 80, r.PIXEL_COLOR, 8);
    r.drawText("AVOID WALLS & SELF!", 14, 94, r.PIXEL_COLOR, 8);
    r.drawText("CATCH TIMED INSECTS!", 14, 108, r.PIXEL_COLOR, 8);

    r.drawLine(8, 130, 152, 130);
    r.drawText("5/0: BACK TO MENU", 32, 138, r.PIXEL_COLOR, 8);
  }
}
