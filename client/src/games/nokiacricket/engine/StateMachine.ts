import type {
  GameState,
  MatchStats,
  ShotType,
  ShotResult,
  NokiaCricketSaveData,
  CricketGameMode,
  CricketDifficulty,
  CricketTeamCode,
} from "../types";
import { CRICKET_TEAMS } from "../types";
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
  private menuItems = ["CLASSIC MATCH", "CHASE TARGET", "HIGH SCORES", "INSTRUCTIONS", "SOUND: ON"];

  private selectedOversIndex: number = 2; // Default 5 Overs
  private overOptions = [
    { label: "1 OVER  (QUICK)", overs: 1 },
    { label: "2 OVERS (BLITZ)", overs: 2 },
    { label: "5 OVERS (MATCH)", overs: 5 },
    { label: "10 OVERS (PRO)", overs: 10 },
  ];

  // Chasing Mode Flow Selections
  private selectedUserTeamIndex: number = 0; // Default IND
  private selectedOppTeamIndex: number = 1;  // Default AUS
  private selectedDifficultyIndex: number = 1; // Default MEDIUM
  private difficultyOptions: Array<{ label: string; value: CricketDifficulty; stars: string }> = [
    { label: "EASY", value: "EASY", stars: "★" },
    { label: "MEDIUM", value: "MEDIUM", stars: "★★" },
    { label: "HARD", value: "HARD", stars: "★★★" },
  ];

  private stats: MatchStats = {
    mode: "CLASSIC",
    difficulty: "MEDIUM",
    userTeam: "IND",
    oppTeam: "AUS",
    score: 0,
    wickets: 0,
    balls: 0,
    overs: "0.0",
    target: 0,
    targetOvers: 5,
    runsNeeded: 0,
    ballsRemaining: 30,
    reqRunRate: 0,
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
    this.menuItems[4] = isMuted ? "SOUND: OFF" : "SOUND: ON";
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
    } else if (this.state === "CHASE_TARGET_SPLASH") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = "READY";
        this.stateTimer = 900;
      }
    } else if (this.state === "READY") {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        // Start bowler delivery with active difficulty
        const delivery = this.opponentAI.selectDelivery(
          this.stats.balls + 1,
          this.stats.wickets,
          this.stats.difficulty
        );
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
        this.resetMatch(chosen, "CLASSIC", "MEDIUM", "IND", "AUS", 0);
        this.state = "READY";
        this.stateTimer = 900;
      } else if (action === "BACK") {
        this.state = "MENU";
      }
    } else if (this.state === "CHASE_SELECT_USER_TEAM") {
      if (action === "LEFT" || action === "UP") {
        this.selectedUserTeamIndex = (this.selectedUserTeamIndex - 1 + CRICKET_TEAMS.length) % CRICKET_TEAMS.length;
      } else if (action === "RIGHT" || action === "DOWN") {
        this.selectedUserTeamIndex = (this.selectedUserTeamIndex + 1) % CRICKET_TEAMS.length;
      } else if (action === "SELECT" || action === "STRAIGHT") {
        // Auto-shift opponent if it collides with user team
        if (this.selectedOppTeamIndex === this.selectedUserTeamIndex) {
          this.selectedOppTeamIndex = (this.selectedUserTeamIndex + 1) % CRICKET_TEAMS.length;
        }
        this.state = "CHASE_SELECT_OPP_TEAM";
      } else if (action === "BACK") {
        this.state = "MENU";
      }
    } else if (this.state === "CHASE_SELECT_OPP_TEAM") {
      const availableTeams = CRICKET_TEAMS.filter((_, idx) => idx !== this.selectedUserTeamIndex);
      const currentAvailableIdx = availableTeams.findIndex((t) => t.code === CRICKET_TEAMS[this.selectedOppTeamIndex]?.code);
      let nextAvailableIdx = currentAvailableIdx >= 0 ? currentAvailableIdx : 0;

      if (action === "LEFT" || action === "UP") {
        nextAvailableIdx = (nextAvailableIdx - 1 + availableTeams.length) % availableTeams.length;
        const targetTeam = availableTeams[nextAvailableIdx];
        this.selectedOppTeamIndex = CRICKET_TEAMS.findIndex((t) => t.code === targetTeam.code);
      } else if (action === "RIGHT" || action === "DOWN") {
        nextAvailableIdx = (nextAvailableIdx + 1) % availableTeams.length;
        const targetTeam = availableTeams[nextAvailableIdx];
        this.selectedOppTeamIndex = CRICKET_TEAMS.findIndex((t) => t.code === targetTeam.code);
      } else if (action === "SELECT" || action === "STRAIGHT") {
        this.state = "CHASE_SELECT_DIFFICULTY";
      } else if (action === "BACK") {
        this.state = "CHASE_SELECT_USER_TEAM";
      }
    } else if (this.state === "CHASE_SELECT_DIFFICULTY") {
      if (action === "LEFT" || action === "UP") {
        this.selectedDifficultyIndex = (this.selectedDifficultyIndex - 1 + this.difficultyOptions.length) % this.difficultyOptions.length;
      } else if (action === "RIGHT" || action === "DOWN") {
        this.selectedDifficultyIndex = (this.selectedDifficultyIndex + 1) % this.difficultyOptions.length;
      } else if (action === "SELECT" || action === "STRAIGHT") {
        this.state = "CHASE_SELECT_OVERS";
      } else if (action === "BACK") {
        this.state = "CHASE_SELECT_OPP_TEAM";
      }
    } else if (this.state === "CHASE_SELECT_OVERS") {
      if (action === "LEFT" || action === "UP") {
        this.selectedOversIndex = (this.selectedOversIndex - 1 + this.overOptions.length) % this.overOptions.length;
      } else if (action === "RIGHT" || action === "DOWN") {
        this.selectedOversIndex = (this.selectedOversIndex + 1) % this.overOptions.length;
      } else if (action === "SELECT" || action === "STRAIGHT") {
        const chosenOvers = this.overOptions[this.selectedOversIndex].overs;
        const chosenDifficulty = this.difficultyOptions[this.selectedDifficultyIndex].value;
        const userTeam = CRICKET_TEAMS[this.selectedUserTeamIndex].code;
        const oppTeam = CRICKET_TEAMS[this.selectedOppTeamIndex].code;

        // Dynamic Target Generation based on Complexity & Overs
        const target = this.generateChaseTarget(chosenOvers, chosenDifficulty);

        this.resetMatch(chosenOvers, "CHASING", chosenDifficulty, userTeam, oppTeam, target);
        this.state = "CHASE_TARGET_SPLASH";
        this.stateTimer = 2200;
      } else if (action === "BACK") {
        this.state = "CHASE_SELECT_DIFFICULTY";
      }
    } else if (this.state === "CHASE_TARGET_SPLASH") {
      if (action === "SELECT" || action === "STRAIGHT" || action === "BACK") {
        this.state = "READY";
        this.stateTimer = 900;
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
      case 0: // Classic Match
        this.state = "SELECT_OVERS";
        break;
      case 1: // Chase Target Mode
        this.state = "CHASE_SELECT_USER_TEAM";
        break;
      case 2: // High Scores
        this.saveData = StorageService.load();
        this.state = "HIGH_SCORES";
        break;
      case 3: // Instructions
        this.state = "INSTRUCTIONS";
        break;
      case 4: // Sound toggle
        const isMuted = this.soundEngine.toggleMute();
        this.menuItems[4] = isMuted ? "SOUND: OFF" : "SOUND: ON";
        break;
    }
  }

  private generateChaseTarget(overs: number, difficulty: CricketDifficulty): number {
    if (difficulty === "EASY") {
      // ~8 runs per over + random variance
      return overs * 8 + Math.floor(Math.random() * 5) + 1;
    } else if (difficulty === "HARD") {
      // ~16 runs per over + random variance
      return overs * 16 + Math.floor(Math.random() * 9) + 1;
    }
    // MEDIUM: ~12 runs per over
    return overs * 12 + Math.floor(Math.random() * 7) + 1;
  }

  public handleBattingShot(shot: ShotType): void {
    if (this.state !== "BOWLING") return;

    this.batsmanPose = shot === "LEFT" ? "PULL" : shot === "STRAIGHT" ? "DRIVE" : "CUT";
    this.batsmanPoseTimer = 700;

    const result = this.shotEngine.executeShot(
      shot,
      this.ballPhysics.x,
      this.ballPhysics.y,
      this.ballPhysics.currentDelivery,
      this.stats.difficulty
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
        this.soundEngine.playWicket("BOWLED");
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
      this.soundEngine.playWicket("BOWLED");
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
      this.soundEngine.playWicket(result.outcome);
    } else {
      this.stats.score += result.runs;
      if (result.runs === 4) {
        this.stats.fours += 1;
        this.soundEngine.playFour();
      } else if (result.runs === 6) {
        this.stats.sixes += 1;
        this.soundEngine.playSix();
      } else if (result.runs > 0) {
        this.soundEngine.playRun(result.runs);
      }
    }

    this.stats.lastOutcome = result.outcome;
    this.stats.lastFeedback = result.feedbackText;
    this.stats.strikeRate = Math.round((this.stats.score / this.stats.balls) * 100);
    this.stats.currentOverDeliveries.push({ outcome: result.outcome, runs: result.runs });

    // Target Chasing metrics
    this.stats.runsNeeded = Math.max(0, this.stats.target - this.stats.score);
    this.stats.ballsRemaining = Math.max(0, this.stats.targetOvers * 6 - this.stats.balls);
    this.stats.reqRunRate =
      this.stats.ballsRemaining > 0
        ? Number(((this.stats.runsNeeded / this.stats.ballsRemaining) * 6).toFixed(1))
        : 0;

    this.onStatsChange(this.stats);

    // Check Match Completion
    const lostAllWickets = this.stats.wickets >= 10;
    const oversFinished = this.stats.balls >= this.stats.targetOvers * 6;
    const targetChased = this.stats.mode === "CHASING" && this.stats.score >= this.stats.target;

    if (targetChased || lostAllWickets || oversFinished) {
      const isRecord = this.stats.score > this.saveData.highScore;
      const isChase = this.stats.mode === "CHASING";
      const won = isChase ? targetChased : false;

      this.stats.isMatchWon = won;
      this.stats.isRecord = isRecord;

      if (isChase) {
        if (won) {
          this.stats.wonByWickets = 10 - this.stats.wickets;
          this.stats.wonByBalls = this.stats.ballsRemaining;
          if (isRecord) {
            this.soundEngine.playHighScoreRecord();
          } else {
            this.soundEngine.playMatchWon();
          }
        } else {
          this.stats.lostByRuns = this.stats.target - this.stats.score;
          this.soundEngine.playMatchLost();
        }
      } else {
        if (isRecord) {
          this.soundEngine.playHighScoreRecord();
        } else {
          this.soundEngine.playMatchWon();
        }
      }

      StorageService.recordMatch(
        this.stats.score,
        this.stats.wickets,
        this.stats.balls,
        this.stats.sixes,
        this.stats.fours,
        won,
        isChase
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

  private resetMatch(
    targetOvers: number = 5,
    mode: CricketGameMode = "CLASSIC",
    difficulty: CricketDifficulty = "MEDIUM",
    userTeam: CricketTeamCode = "IND",
    oppTeam: CricketTeamCode = "AUS",
    target: number = 0
  ): void {
    this.stats = {
      mode,
      difficulty,
      userTeam,
      oppTeam,
      score: 0,
      wickets: 0,
      balls: 0,
      overs: "0.0",
      target,
      targetOvers,
      runsNeeded: target,
      ballsRemaining: targetOvers * 6,
      reqRunRate: target > 0 ? Number(((target / (targetOvers * 6)) * 6).toFixed(1)) : 0,
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
      case "CHASE_SELECT_USER_TEAM":
        this.renderChaseSelectUserTeam(r);
        break;
      case "CHASE_SELECT_OPP_TEAM":
        this.renderChaseSelectOppTeam(r);
        break;
      case "CHASE_SELECT_DIFFICULTY":
        this.renderChaseSelectDifficulty(r);
        break;
      case "CHASE_SELECT_OVERS":
        this.renderChaseSelectOvers(r);
        break;
      case "CHASE_TARGET_SPLASH":
        this.renderChaseTargetSplash(r);
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
    r.drawText("RETRO CRICKET", 24, 24);
    r.drawText("2D BHALYAM", 32, 38);
    r.drawSprite(SPRITES.TROPHY, 60, 54);
    r.drawText("PRESS ANY KEY", 26, 78);
  }

  private renderMenu(r: RenderPipeline): void {
    r.drawText("★ RETRO CRICKET ★", 12, 6);
    r.drawLine(4, 16, 124, 16);

    let y = 22;
    this.menuItems.forEach((item, idx) => {
      const isSelected = idx === this.selectedMenuIndex;
      if (isSelected) {
        r.fillRect(6, y - 2, 116, 11, r.PIXEL_COLOR);
        r.drawText(`► ${item}`, 10, y, r.BG_COLOR);
      } else {
        r.drawText(`  ${item}`, 10, y, r.PIXEL_COLOR);
      }
      y += 13;
    });

    r.drawLine(4, 84, 124, 84);
    r.drawText("4/6:MOVE  5:OK", 22, 87);
  }

  private renderSelectOvers(r: RenderPipeline): void {
    r.drawText("CLASSIC: OVERS", 20, 8);
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

  private renderChaseSelectUserTeam(r: RenderPipeline): void {
    r.drawText("YOUR TEAM", 34, 8);
    r.drawLine(4, 18, 124, 18);

    // 2-Column grid of 8 teams
    CRICKET_TEAMS.forEach((team, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? 8 : 68;
      const y = 24 + row * 14;
      const isSelected = idx === this.selectedUserTeamIndex;

      if (isSelected) {
        r.fillRect(x - 2, y - 2, 54, 12, r.PIXEL_COLOR);
        r.drawText(`►${team.code}`, x, y, r.BG_COLOR);
      } else {
        r.drawText(` ${team.code}`, x, y, r.PIXEL_COLOR);
      }
    });

    r.drawLine(4, 82, 124, 82);
    r.drawText("4/6:MOVE  5:SELECT", 10, 86);
  }

  private renderChaseSelectOppTeam(r: RenderPipeline): void {
    r.drawText("OPPONENT TEAM", 24, 8);
    r.drawLine(4, 18, 124, 18);

    // 2-Column grid of remaining 7 teams
    const available = CRICKET_TEAMS.filter((_, idx) => idx !== this.selectedUserTeamIndex);
    available.forEach((team, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? 8 : 68;
      const y = 24 + row * 14;
      const isSelected = team.code === CRICKET_TEAMS[this.selectedOppTeamIndex]?.code;

      if (isSelected) {
        r.fillRect(x - 2, y - 2, 54, 12, r.PIXEL_COLOR);
        r.drawText(`►${team.code}`, x, y, r.BG_COLOR);
      } else {
        r.drawText(` ${team.code}`, x, y, r.PIXEL_COLOR);
      }
    });

    r.drawLine(4, 82, 124, 82);
    r.drawText("4/6:MOVE  5:SELECT", 10, 86);
  }

  private renderChaseSelectDifficulty(r: RenderPipeline): void {
    r.drawText("COMPLEXITY", 32, 8);
    r.drawLine(4, 18, 124, 18);

    let y = 26;
    this.difficultyOptions.forEach((diff, idx) => {
      const isSelected = idx === this.selectedDifficultyIndex;
      const text = `${diff.label} ${diff.stars}`;
      if (isSelected) {
        r.fillRect(8, y - 2, 112, 12, r.PIXEL_COLOR);
        r.drawText(`► ${text}`, 12, y, r.BG_COLOR);
      } else {
        r.drawText(`  ${text}`, 12, y, r.PIXEL_COLOR);
      }
      y += 16;
    });

    r.drawLine(4, 82, 124, 82);
    r.drawText("4/6:DIFF  5:CHOOSE", 10, 86);
  }

  private renderChaseSelectOvers(r: RenderPipeline): void {
    r.drawText("CHASE OVERS", 30, 8);
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
    r.drawText("4/6:MOVE  5:SET TARGET", 4, 86);
  }

  private renderChaseTargetSplash(r: RenderPipeline): void {
    r.fillRect(0, 0, 128, 12, r.PIXEL_COLOR);
    r.drawText("★ TARGET SET! ★", 20, 3, r.BG_COLOR);

    r.drawText(`${this.stats.userTeam} vs ${this.stats.oppTeam}`, 28, 18);
    r.drawText(`DIFF: ${this.stats.difficulty}`, 30, 30);

    r.fillRect(16, 44, 96, 16, r.PIXEL_COLOR);
    r.drawText(`TARGET: ${this.stats.target} RUNS`, 22, 49, r.BG_COLOR);

    r.drawText(`NEED: ${this.stats.target} IN ${this.stats.targetOvers * 6} BALLS`, 8, 66);
    r.drawText(`REQ RR: ${this.stats.reqRunRate}`, 34, 76);

    r.drawLine(4, 86, 124, 86);
    r.drawText("5:START CHASE", 24, 88);
  }

  private renderMatch(r: RenderPipeline): void {
    // 1. Top HUD Bar
    r.fillRect(0, 0, 128, 10, r.PIXEL_COLOR);

    if (this.stats.mode === "CHASING") {
      // Chasing Top HUD: [Team Score/Wkts] [Target] [Need in Balls]
      const scoreStr = `${this.stats.userTeam} ${this.stats.score}/${this.stats.wickets}`;
      const targetStr = `T:${this.stats.target}`;
      const needStr = `N:${this.stats.runsNeeded}(${this.stats.ballsRemaining})`;

      const needW = needStr.length * 6 - 1;
      const needX = Math.max(82, 126 - needW);

      r.drawText(scoreStr, 2, 2, r.BG_COLOR);
      r.drawText(targetStr, 48, 2, r.BG_COLOR);
      r.drawText(needStr, needX, 2, r.BG_COLOR);
    } else {
      // Classic Top HUD: [Score/Wkts] [Overs] [Strike Rate]
      const scoreStr = `${String(this.stats.score).padStart(3, "0")}/${this.stats.wickets}`;
      const overStr = `O:${this.stats.overs}/${this.stats.targetOvers}`;
      const srStr = `SR:${this.stats.strikeRate}`;

      const srW = srStr.length * 6 - 1;
      const srX = Math.max(82, 126 - srW);

      r.drawText(scoreStr, 2, 2, r.BG_COLOR);
      r.drawText(overStr, 38, 2, r.BG_COLOR);
      r.drawText(srStr, srX, 2, r.BG_COLOR);
    }

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

    // 7. Ball Result Overlay Toast (Auto-centered)
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

    // 8. Bottom Keypad Help / Match Status Line
    r.drawLine(0, 87, 128, 87, r.PIXEL_COLOR);
    if (this.stats.mode === "CHASING") {
      const subLine = `${this.stats.userTeam} v ${this.stats.oppTeam} | RRR:${this.stats.reqRunRate}`;
      r.drawText(subLine, 4, 89, r.PIXEL_COLOR);
    } else {
      r.drawText("4:PULL 5:DRIVE 6:CUT", 4, 89, r.PIXEL_COLOR);
    }
  }

  private renderGameOver(r: RenderPipeline): void {
    const isNewRecord = this.stats.isRecord ?? (this.stats.score > 0 && this.stats.score >= this.saveData.highScore);
    r.fillRect(0, 0, 128, 12, r.PIXEL_COLOR);

    if (this.stats.mode === "CHASING") {
      if (this.stats.isMatchWon) {
        const title = "★ TARGET CHASED! ★";
        r.drawText(title, Math.max(8, Math.floor((128 - title.length * 6) / 2)), 3, r.BG_COLOR);
        r.drawText(`${this.stats.userTeam} WON BY ${this.stats.wonByWickets} WKTS!`, 12, 18);
        r.drawText(`BALLS LEFT: ${this.stats.wonByBalls}`, 24, 30);
      } else {
        const title = "★ TARGET MISSED ★";
        r.drawText(title, Math.max(8, Math.floor((128 - title.length * 6) / 2)), 3, r.BG_COLOR);
        r.drawText(`${this.stats.oppTeam} WON BY ${this.stats.lostByRuns} RUNS`, 10, 18);
        r.drawText(`TARGET WAS: ${this.stats.target}`, 20, 30);
      }
    } else {
      const title = this.stats.wickets >= 10 ? "★ ALL OUT ★" : isNewRecord ? "★ NEW RECORD! ★" : "★ INNINGS OVER ★";
      r.drawText(title, Math.max(8, Math.floor((128 - title.length * 6) / 2)), 3, r.BG_COLOR);
      r.drawText(`OVERS: ${this.stats.overs} / ${this.stats.targetOvers}.0`, 16, 22);
    }

    r.drawText(`SCORE: ${this.stats.score}/${this.stats.wickets}`, 20, 42);
    r.drawText(`BOUNDARIES: ${this.stats.fours}X4 ${this.stats.sixes}X6`, 12, 54);
    r.drawText(`STRIKE RATE: ${this.stats.strikeRate}%`, 14, 66);

    if (isNewRecord) {
      r.drawSprite(SPRITES.TROPHY, 18, 74);
      r.drawText("HIGH SCORE!", 34, 76);
    }

    r.drawLine(4, 84, 124, 84);
    r.drawText("5:RETURN TO MENU", 14, 87);
  }

  private renderHighScores(r: RenderPipeline): void {
    r.drawText("★ HIGH SCORES ★", 18, 8);
    r.drawLine(4, 18, 124, 18);

    r.drawText(`BEST: ${this.saveData.highScore} RUNS`, 16, 24);
    r.drawText(`MATCHES: ${this.saveData.matchesPlayed}`, 16, 36);
    r.drawText(`CHASE WINS: ${this.saveData.chaseMatchesWon || 0}/${this.saveData.chaseMatchesPlayed || 0}`, 10, 48);
    r.drawText(`TOTAL SIXES: ${this.saveData.totalSixes}`, 16, 60);
    r.drawText(`BEST SR: ${this.saveData.bestStrikeRate}%`, 16, 72);

    r.drawLine(4, 84, 124, 84);
    r.drawText("5:BACK TO MENU", 20, 87);
  }

  private renderInstructions(r: RenderPipeline): void {
    r.drawText("HOW TO PLAY", 32, 8);
    r.drawLine(4, 18, 124, 18);

    r.drawText("4:PULL 5:DRIVE 6:CUT", 8, 24);
    r.drawText("CHASE: REACH TARGET", 6, 36);
    r.drawText("DIFF: EASY/MED/HARD", 6, 48);
    r.drawText("TIMING: PITCH BOUNCE", 6, 60);
    r.drawText("0:PAUSE MATCH", 22, 72);

    r.drawLine(4, 84, 124, 84);
    r.drawText("5:BACK TO MENU", 20, 87);
  }

  private renderPaused(r: RenderPipeline): void {
    this.renderMatch(r);
    r.fillRect(14, 26, 100, 42, r.PIXEL_COLOR);
    r.drawText("★ GAME PAUSED ★", 18, 30, r.BG_COLOR);
    r.drawText("5/0: RESUME", 30, 44, r.BG_COLOR);
    r.drawText("4/6: QUIT MENU", 22, 54, r.BG_COLOR);
  }
}
