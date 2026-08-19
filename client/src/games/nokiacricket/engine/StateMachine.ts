import type {
  GameState,
  MatchStats,
  ShotType,
  ShotResult,
  NokiaCricketSaveData,
} from "../types";
import { BallPhysics } from "./BallPhysics";
import { ShotEngine } from "./ShotEngine";
import { OpponentAI } from "./OpponentAI";
import { NokiaSoundEngine } from "../audio/NokiaSoundEngine";
import { RenderPipeline } from "../canvas/RenderPipeline";
import { SPRITES } from "../canvas/SpriteSheet";
import { StorageService } from "../utils/storage";

export class StateMachine {
  private state: GameState = "BOOT";
  private selectedMenuIndex: number = 0;
  private menuItems = ["START MATCH", "HIGH SCORES", "INSTRUCTIONS", "SOUND: ON"];

  private selectedOversIndex: number = 2; // Default 5 Overs
  private overOptions = [
    { label: "1 OVER  (QUICK)", overs: 1 },
    { label: "2 OVERS (BLITZ)", overs: 2 },
    { label: "5 OVERS (MATCH)", overs: 5 },
    { label: "10 OVERS (PRO)", overs: 10 },
  ];

  private stats: MatchStats = {
    score: 0,
    wickets: 0,
    balls: 0,
    overs: "0.0",
    target: 0,
    targetOvers: 5,
    currentOverDeliveries: [],
    sixes: 0,
    fours: 0,
    lastOutcome: null,
    lastFeedback: "",
    strikeRate: 0,
  };

  private stateTimer: number = 0;
  private batsmanPose: "STANCE" | "PULL" | "DRIVE" | "CUT" = "STANCE";
  private batsmanPoseTimer: number = 0;
  private currentShotResult: ShotResult | null = null;
  private previousState: GameState = "READY";
  private saveData: NokiaCricketSaveData;
  private soundToastTimer: number = 0;
  private soundToastText: string = "";

  constructor(
    private ballPhysics: BallPhysics,
    private shotEngine: ShotEngine,
    private opponentAI: OpponentAI,
    private soundEngine: NokiaSoundEngine,
    private onStatsChange: (stats: MatchStats) => void
  ) {
    this.saveData = StorageService.load();
    this.stateTimer = 1800; // Boot timer
    this.soundEngine.playNokiaBoot();
  }

  public getState(): GameState {
    return this.state;
  }

  public getStats(): MatchStats {
    return this.stats;
  }

  public toggleSound(): boolean {
    const isMuted = this.soundEngine.toggleMute();
    this.menuItems[3] = isMuted ? "SOUND: OFF" : "SOUND: ON";
    this.soundToastText = isMuted ? "SOUND: OFF" : "SOUND: ON";
    this.soundToastTimer = 1200;
    if (!isMuted) {
      this.soundEngine.playKeyTick();
    }
    return isMuted;
  }

  public togglePause(): void {
    if (this.state === "PAUSED") {
      this.state = this.previousState || "READY";
    } else if (
      this.state === "READY" ||
      this.state === "BOWLING" ||
      this.state === "SHOT_PLAYED" ||
      this.state === "BALL_RESULT"
    ) {
      this.previousState = this.state;
      this.state = "PAUSED";
    }
  }

  public update(dt: number): void {
    if (this.soundToastTimer > 0) {
      this.soundToastTimer -= dt;
      if (this.soundToastTimer <= 0) {
        this.soundToastText = "";
      }
    }
    if (this.batsmanPoseTimer > 0) {
      this.batsmanPoseTimer -= dt;
      if (this.batsmanPoseTimer <= 0) {
        this.batsmanPose = "STANCE";
      }
    }

    if (this.state === "BOOT") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "MENU";
      }
    } else if (this.state === "READY") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        // Start bowler delivery
        const delivery = this.opponentAI.selectDelivery(this.stats.balls + 1, this.stats.wickets);
        this.ballPhysics.initDelivery(delivery);
        this.state = "BOWLING";
      }
    } else if (this.state === "SHOT_PLAYED") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0 || this.ballPhysics.isOutOfField()) {
        this.concludeDelivery();
      }
    } else if (this.state === "BALL_RESULT") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.nextDelivery();
      }
    }
  }

  public handleMenuInput(action: "LEFT" | "STRAIGHT" | "RIGHT" | "UP" | "DOWN" | "SELECT" | "BACK"): void {
    this.soundEngine.playKeyTick();

    if (this.state === "BOOT") {
      this.state = "MENU";
      return;
    }

    if (this.state === "MENU") {
      if (action === "LEFT" || action === "UP") {
        this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuItems.length) % this.menuItems.length;
      } else if (action === "RIGHT" || action === "DOWN") {
        this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuItems.length;
      } else if (action === "SELECT" || action === "STRAIGHT") {
        this.triggerMenuAction();
      }
    } else if (this.state === "SELECT_OVERS") {
      if (action === "LEFT" || action === "UP") {
        this.selectedOversIndex = (this.selectedOversIndex - 1 + this.overOptions.length) % this.overOptions.length;
      } else if (action === "RIGHT" || action === "DOWN") {
        this.selectedOversIndex = (this.selectedOversIndex + 1) % this.overOptions.length;
      } else if (action === "SELECT" || action === "STRAIGHT") {
        const chosen = this.overOptions[this.selectedOversIndex].overs;
        this.resetMatch(chosen);
        this.state = "READY";
        this.stateTimer = 900;
      } else if (action === "BACK") {
        this.state = "MENU";
      }
    } else if (this.state === "HIGH_SCORES" || this.state === "INSTRUCTIONS") {
      if (action === "BACK" || action === "SELECT" || action === "STRAIGHT") {
        this.state = "MENU";
      }
    } else if (this.state === "GAME_OVER") {
      if (action === "SELECT" || action === "BACK" || action === "STRAIGHT") {
        this.state = "MENU";
      }
    } else if (this.state === "PAUSED") {
      if (action === "SELECT" || action === "STRAIGHT" || action === "UP") {
        this.state = this.previousState || "READY";
      } else if (action === "BACK" || action === "LEFT" || action === "RIGHT") {
        this.state = "MENU";
      }
    }
  }

  private triggerMenuAction(): void {
    switch (this.selectedMenuIndex) {
      case 0: // Start Match -> Go to Overs Selector
        this.state = "SELECT_OVERS";
        break;
      case 1: // High Scores
        this.saveData = StorageService.load();
        this.state = "HIGH_SCORES";
        break;
      case 2: // Instructions
        this.state = "INSTRUCTIONS";
        break;
      case 3: // Sound toggle
        const isMuted = this.soundEngine.toggleMute();
        this.menuItems[3] = isMuted ? "SOUND: OFF" : "SOUND: ON";
        break;
    }
  }

  public handleBattingShot(shot: ShotType): void {
    if (this.state !== "BOWLING") return;

    this.batsmanPose = shot === "LEFT" ? "PULL" : shot === "STRAIGHT" ? "DRIVE" : "CUT";
    this.batsmanPoseTimer = 700;

    const result = this.shotEngine.executeShot(
      shot,
      this.ballPhysics.x,
      this.ballPhysics.y,
      this.ballPhysics.currentDelivery
    );

    this.currentShotResult = result;

    if (result.grade !== "MISS") {
      this.soundEngine.playBatHit();
      this.ballPhysics.applyHit(result.trajectory.angle, result.trajectory.power);
      this.state = "SHOT_PLAYED";
      this.stateTimer = 1100;
    } else {
      // Clean Miss or Bowled
      if (result.outcome === "BOWLED") {
        this.soundEngine.playWicket();
      } else {
        this.soundEngine.playDot();
      }
      this.concludeDelivery();
    }
  }

  public handleMissedBall(): void {
    if (this.state !== "BOWLING") return;
    const isWicket = this.ballPhysics.isStumpsHit();
    this.currentShotResult = {
      grade: "MISS",
      runs: 0,
      outcome: isWicket ? "BOWLED" : "DOT",
      trajectory: { angle: 0, power: 0 },
      feedbackText: isWicket ? "CLEAN BOWLED!" : "DOT BALL",
    };

    if (isWicket) {
      this.soundEngine.playWicket();
    } else {
      this.soundEngine.playDot();
    }
    this.concludeDelivery();
  }

  private concludeDelivery(): void {
    const result = this.currentShotResult || {
      grade: "MISS",
      runs: 0,
      outcome: "DOT",
      trajectory: { angle: 0, power: 0 },
      feedbackText: "DOT BALL",
    };

    // Update match stats
    this.stats.balls += 1;
    const overNum = Math.floor(this.stats.balls / 6);
    const ballInOver = this.stats.balls % 6;
    this.stats.overs = `${overNum}.${ballInOver}`;

    if (result.outcome === "BOWLED" || result.outcome === "CAUGHT" || result.outcome === "LBW") {
      this.stats.wickets += 1;
      this.soundEngine.playWicket();
    } else {
      this.stats.score += result.runs;
      if (result.runs === 4) {
        this.stats.fours += 1;
        this.soundEngine.playFour();
      } else if (result.runs === 6) {
        this.stats.sixes += 1;
        this.soundEngine.playSix();
      } else if (result.runs > 0) {
        this.soundEngine.playRun();
      }
    }

    this.stats.lastOutcome = result.outcome;
    this.stats.lastFeedback = result.feedbackText;
    this.stats.strikeRate = Math.round((this.stats.score / this.stats.balls) * 100);
    this.stats.currentOverDeliveries.push({ outcome: result.outcome, runs: result.runs });

    this.onStatsChange(this.stats);

    // CRITICAL: Game is completely independent of score.
    // Match only ends when all chosen overs are completed OR all 10 wickets are lost!
    const lostAllWickets = this.stats.wickets >= 10;
    const oversFinished = this.stats.balls >= this.stats.targetOvers * 6;

    if (lostAllWickets || oversFinished) {
      const isRecord = this.stats.score > this.saveData.highScore;
      StorageService.recordMatch(
        this.stats.score,
        this.stats.wickets,
        this.stats.balls,
        this.stats.sixes,
        this.stats.fours,
        isRecord
      );
      this.saveData = StorageService.load();
      this.state = "GAME_OVER";
      this.stateTimer = 0;
    } else {
      this.state = "BALL_RESULT";
      this.stateTimer = 1200;
    }
  }

  private nextDelivery(): void {
    if (this.stats.balls % 6 === 0 && this.stats.balls > 0) {
      this.stats.currentOverDeliveries = [];
    }
    this.state = "READY";
    this.stateTimer = 700;
  }

  private resetMatch(targetOvers: number = 5): void {
    this.stats = {
      score: 0,
      wickets: 0,
      balls: 0,
      overs: "0.0",
      target: 0,
      targetOvers,
      currentOverDeliveries: [],
      sixes: 0,
      fours: 0,
      lastOutcome: null,
      lastFeedback: "",
      strikeRate: 0,
    };
    this.batsmanPose = "STANCE";
    this.currentShotResult = null;
    this.onStatsChange(this.stats);
  }

  /* ────────────────────────── RENDER PASSES ────────────────────────── */

  public render(r: RenderPipeline): void {
    switch (this.state) {
      case "BOOT":
        this.renderBoot(r);
        break;
      case "MENU":
        this.renderMenu(r);
        break;
      case "SELECT_OVERS":
        this.renderSelectOvers(r);
        break;
      case "READY":
      case "BOWLING":
      case "SHOT_PLAYED":
      case "BALL_RESULT":
        this.renderMatch(r);
        break;
      case "GAME_OVER":
        this.renderGameOver(r);
        break;
      case "HIGH_SCORES":
        this.renderHighScores(r);
        break;
      case "INSTRUCTIONS":
        this.renderInstructions(r);
        break;
      case "PAUSED":
        this.renderPaused(r);
        break;
    }

    // Floating Retro Sound Indicator Toast
    if (this.soundToastTimer > 0 && this.soundToastText) {
      const text = this.soundToastText;
      const textW = text.length * 6 - 1;
      const boxW = textW + 8;
      const boxX = Math.floor((128 - boxW) / 2);
      r.fillRect(boxX, 14, boxW, 11, r.PIXEL_COLOR);
      r.drawText(text, boxX + 4, 16, r.BG_COLOR);
    }
  }

  private renderBoot(r: RenderPipeline): void {
    r.drawText("RETRO CRICKET", 24, 28);
    r.drawText("2D BHALYAM", 32, 42);
    r.drawSprite(SPRITES.TROPHY, 60, 58);
    r.drawText("PRESS ANY KEY", 26, 80);
  }

  private renderMenu(r: RenderPipeline): void {
    r.drawText("★ RETRO CRICKET ★", 12, 8);
    r.drawLine(4, 18, 124, 18);

    let y = 26;
    this.menuItems.forEach((item, idx) => {
      const isSelected = idx === this.selectedMenuIndex;
      if (isSelected) {
        r.fillRect(8, y - 2, 112, 11, r.PIXEL_COLOR);
        r.drawText(`► ${item}`, 12, y, r.BG_COLOR);
      } else {
        r.drawText(`  ${item}`, 12, y, r.PIXEL_COLOR);
      }
      y += 14;
    });

    r.drawLine(4, 82, 124, 82);
    r.drawText("4/6:MOVE  5:OK", 22, 86);
  }

  private renderSelectOvers(r: RenderPipeline): void {
    r.drawText("SELECT OVERS", 28, 8);
    r.drawLine(4, 18, 124, 18);

    let y = 26;
    this.overOptions.forEach((opt, idx) => {
      const isSelected = idx === this.selectedOversIndex;
      if (isSelected) {
        r.fillRect(8, y - 2, 112, 11, r.PIXEL_COLOR);
        r.drawText(`► ${opt.label}`, 12, y, r.BG_COLOR);
      } else {
        r.drawText(`  ${opt.label}`, 12, y, r.PIXEL_COLOR);
      }
      y += 14;
    });

    r.drawLine(4, 82, 124, 82);
    r.drawText("4/6:MOVE  5:START", 14, 86);
  }

  private renderMatch(r: RenderPipeline): void {
    // 1. Top HUD Bar (Score / Wickets, Overs / Total Overs, Strike Rate)
    r.fillRect(0, 0, 128, 10, r.PIXEL_COLOR);
    const scoreStr = `${String(this.stats.score).padStart(3, "0")}/${this.stats.wickets}`;
    const overStr = `O:${this.stats.overs}/${this.stats.targetOvers}`;
    const srStr = `SR:${this.stats.strikeRate}`;

    // Layout on 128px strip with zero collisions:
    // Left: scoreStr at x = 2 (e.g. "000/1" -> 5 chars = 29px)
    // Middle: overStr at x = 38 (e.g. "O:0.1/5" -> 7 chars = 41px, ends at 79)
    // Right: srStr right-aligned from x = 126
    const srW = srStr.length * 6 - 1;
    const srX = Math.max(82, 126 - srW);

    r.drawText(scoreStr, 2, 2, r.BG_COLOR);
    r.drawText(overStr, 38, 2, r.BG_COLOR);
    r.drawText(srStr, srX, 2, r.BG_COLOR);

    // 2. Pitch Geometry
    r.drawLine(52, 14, 76, 14, r.FAINT_COLOR); // Bowling crease top
    r.drawLine(46, 85, 82, 85, r.PIXEL_COLOR);  // Popping crease bottom
    r.drawLine(52, 14, 46, 85, r.FAINT_COLOR); // Left pitch tramline
    r.drawLine(76, 14, 82, 85, r.FAINT_COLOR); // Right pitch tramline

    // 3. Stumps Top & Bottom
    r.drawSprite(SPRITES.STUMPS_INTACT, 61, 12, r.FAINT_COLOR);
    if (this.currentShotResult?.outcome === "BOWLED" && (this.state === "BALL_RESULT" || this.state === "GAME_OVER")) {
      r.drawSprite(SPRITES.STUMPS_BROKEN, 60, 77, r.PIXEL_COLOR);
    } else {
      r.drawSprite(SPRITES.STUMPS_INTACT, 61, 77, r.PIXEL_COLOR);
    }

    // 4. Bowler at top
    if (this.state === "READY") {
      r.drawSprite(SPRITES.BOWLER_RUN_1, 60, 14, r.PIXEL_COLOR);
    } else if (this.state === "BOWLING") {
      r.drawSprite(SPRITES.BOWLER_RELEASE, 60, 14, r.PIXEL_COLOR);
    }

    // 5. Ball Drawing & Trail
    if (this.state === "BOWLING" || this.state === "SHOT_PLAYED") {
      const bx = Math.floor(this.ballPhysics.x);
      const by = Math.floor(this.ballPhysics.y);
      const br = Math.floor(this.ballPhysics.radius);
      r.fillRect(bx - br, by - br, br * 2, br * 2, r.PIXEL_COLOR);

      // Bounce dust impact
      if (this.ballPhysics.hasBounced && this.state === "BOWLING") {
        r.setPixel(bx - 3, by + 1, r.FAINT_COLOR);
        r.setPixel(bx + 3, by + 1, r.FAINT_COLOR);
      }
    }

    // 6. Batsman Rendering
    const batX = 58;
    const batY = 74;
    if (this.batsmanPose === "STANCE") {
      r.drawSprite(SPRITES.BATSMAN_STANCE, batX, batY, r.PIXEL_COLOR);
    } else if (this.batsmanPose === "PULL") {
      r.drawSprite(SPRITES.BATSMAN_PULL, batX - 4, batY, r.PIXEL_COLOR);
    } else if (this.batsmanPose === "DRIVE") {
      r.drawSprite(SPRITES.BATSMAN_DRIVE, batX, batY - 2, r.PIXEL_COLOR);
    } else if (this.batsmanPose === "CUT") {
      r.drawSprite(SPRITES.BATSMAN_CUT, batX + 2, batY, r.PIXEL_COLOR);
    }

    // 7. Ball Result Overlay Toast (Auto-centered and dynamically sized)
    if (this.state === "BALL_RESULT" && this.stats.lastFeedback) {
      const text = this.stats.lastFeedback.trim();
      const textW = text.length * 6 - 1;
      const boxW = Math.min(124, textW + 8);
      const boxH = 14;
      const boxX = Math.floor((128 - boxW) / 2);
      const textX = Math.floor((128 - textW) / 2);
      const boxY = 40;

      r.fillRect(boxX, boxY, boxW, boxH, r.PIXEL_COLOR);
      r.drawText(text, textX, boxY + 3, r.BG_COLOR);
    }

    // 8. Bottom Keypad Help
    r.drawLine(0, 87, 128, 87, r.PIXEL_COLOR);
    r.drawText("4:PULL 5:DRIVE 6:CUT", 4, 89, r.PIXEL_COLOR);
  }

  private renderGameOver(r: RenderPipeline): void {
    const isNewRecord = this.stats.score > 0 && this.stats.score >= this.saveData.highScore;
    r.fillRect(0, 0, 128, 12, r.PIXEL_COLOR);
    const title = this.stats.wickets >= 10 ? "★ ALL OUT ★" : isNewRecord ? "★ NEW RECORD! ★" : "★ INNINGS OVER ★";
    r.drawText(title, Math.max(8, Math.floor((128 - title.length * 6) / 2)), 3, r.BG_COLOR);

    r.drawText(`SCORE: ${this.stats.score}/${this.stats.wickets}`, 20, 22);
    r.drawText(`OVERS: ${this.stats.overs} / ${this.stats.targetOvers}.0`, 16, 34);
    r.drawText(`BOUNDARIES: ${this.stats.fours}X4 ${this.stats.sixes}X6`, 12, 46);
    r.drawText(`STRIKE RATE: ${this.stats.strikeRate}%`, 14, 58);

    if (isNewRecord) {
      r.drawSprite(SPRITES.TROPHY, 18, 70);
      r.drawText("HIGH SCORE!", 34, 72);
    }

    r.drawLine(4, 82, 124, 82);
    r.drawText("5:RETURN TO MENU", 14, 86);
  }

  private renderHighScores(r: RenderPipeline): void {
    r.drawText("★ HIGH SCORES ★", 18, 8);
    r.drawLine(4, 18, 124, 18);

    r.drawText(`BEST: ${this.saveData.highScore} RUNS`, 16, 26);
    r.drawText(`MATCHES PLAYED: ${this.saveData.matchesPlayed}`, 12, 38);
    r.drawText(`TOTAL SIXES: ${this.saveData.totalSixes}`, 16, 50);
    r.drawText(`BEST SR: ${this.saveData.bestStrikeRate}%`, 16, 62);

    r.drawLine(4, 82, 124, 82);
    r.drawText("5:BACK TO MENU", 20, 86);
  }

  private renderInstructions(r: RenderPipeline): void {
    r.drawText("HOW TO PLAY", 32, 8);
    r.drawLine(4, 18, 124, 18);

    r.drawText("4:PULL 5:DRIVE 6:CUT", 8, 24);
    r.drawText("0:PAUSE MATCH", 22, 36);
    r.drawText("TIMING: PITCH BOUNCE", 6, 48);
    r.drawText("SCORE MAX IN OVERS", 10, 60);
    r.drawText("ONLY 4,5,6,0 KEYS", 14, 72);

    r.drawLine(4, 82, 124, 82);
    r.drawText("5:BACK TO MENU", 20, 86);
  }

  private renderPaused(r: RenderPipeline): void {
    this.renderMatch(r);
    r.fillRect(14, 26, 100, 42, r.PIXEL_COLOR);
    r.drawText("★ GAME PAUSED ★", 18, 30, r.BG_COLOR);
    r.drawText("5/0: RESUME", 30, 44, r.BG_COLOR);
    r.drawText("4/6: QUIT MENU", 22, 54, r.BG_COLOR);
  }
}
