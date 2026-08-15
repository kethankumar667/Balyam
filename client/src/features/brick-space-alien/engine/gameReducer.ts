import type { GameAction, GameState, Projectile } from "../types";
import { BRICK_SPACE_ALIEN_CONFIG, MENU_OPTIONS } from "../constants";
import { generateWaveAliens } from "../levels/wavePresets";
import { isValidPlayerCenterX } from "../utils/matrix";
import { stepFormation, getEligibleShooters } from "./formationEngine";
import { simulateProjectilesAndCollisions } from "./collisionEngine";
import { createSeededRandom } from "../utils/prng";

export function createInitialGameState(
  seed: number = Date.now(),
  highScore: number = 0,
  soundEnabled: boolean = true
): GameState {
  const { aliens, formation } = generateWaveAliens(1);

  return {
    status: "boot",
    player: {
      centerX: 4,
      lives: BRICK_SPACE_ALIEN_CONFIG.INITIAL_LIVES,
      invulnerableUntilMs: 0,
    },
    aliens,
    formation,
    projectiles: [],
    wave: 1,
    score: 0,
    highScore,
    totalKills: 0,
    playerCooldownMs: 0,
    alienFireCooldownMs: BRICK_SPACE_ALIEN_CONFIG.BASE_ALIEN_FIRE_INTERVAL_MS,
    overlayTimerMs: BRICK_SPACE_ALIEN_CONFIG.BOOT_DURATION_MS,
    seed,
    selectedMenuIndex: 0,
    soundEnabled,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "TICK": {
      const { deltaMs, nowMs } = action;

      // 1. Boot State Transition
      if (state.status === "boot") {
        const nextTimer = state.overlayTimerMs - deltaMs;
        if (nextTimer <= 0) {
          return {
            ...state,
            status: "menu",
            overlayTimerMs: 0,
          };
        }
        return { ...state, overlayTimerMs: nextTimer };
      }

      // 2. Ready Screen Countdown
      if (state.status === "ready") {
        const nextTimer = state.overlayTimerMs - deltaMs;
        if (nextTimer <= 0) {
          return {
            ...state,
            status: "playing",
            overlayTimerMs: 0,
            player: {
              ...state.player,
              invulnerableUntilMs: nowMs + BRICK_SPACE_ALIEN_CONFIG.PLAYER_INVULNERABILITY_MS,
            },
          };
        }
        return { ...state, overlayTimerMs: nextTimer };
      }

      // 3. Life-Lost Respawn Overlay
      if (state.status === "life-lost") {
        const nextTimer = state.overlayTimerMs - deltaMs;
        if (nextTimer <= 0) {
          if (state.player.lives <= 0) {
            return {
              ...state,
              status: "game-over",
              highScore: Math.max(state.highScore, state.score),
              overlayTimerMs: 0,
            };
          }
          return {
            ...state,
            status: "playing",
            overlayTimerMs: 0,
            player: {
              ...state.player,
              centerX: 4,
              invulnerableUntilMs: nowMs + BRICK_SPACE_ALIEN_CONFIG.PLAYER_INVULNERABILITY_MS,
            },
            projectiles: [],
          };
        }
        return { ...state, overlayTimerMs: nextTimer };
      }

      // 4. Wave-Complete Overlay
      if (state.status === "wave-complete") {
        const nextTimer = state.overlayTimerMs - deltaMs;
        if (nextTimer <= 0) {
          const nextWave = state.wave + 1;
          const { aliens, formation } = generateWaveAliens(nextWave);
          return {
            ...state,
            status: "ready",
            wave: nextWave,
            aliens,
            formation,
            projectiles: [],
            player: {
              ...state.player,
              centerX: 4,
            },
            overlayTimerMs: 1200,
          };
        }
        return { ...state, overlayTimerMs: nextTimer };
      }

      // If not playing, don't step physics
      if (state.status !== "playing") {
        return state;
      }

      // 5. Active Gameplay Physics & Simulation Loop
      let nextProjectiles = [...state.projectiles];
      let nextAliens = [...state.aliens];
      let nextFormation = { ...state.formation };
      let nextPlayer = { ...state.player };
      let nextScore = state.score;
      let nextTotalKills = state.totalKills;
      let nextPlayerCooldown = Math.max(0, state.playerCooldownMs - deltaMs);
      let nextAlienFireCooldown = state.alienFireCooldownMs - deltaMs;

      // A. Move Projectiles & Resolve Collisions
      const collision = simulateProjectilesAndCollisions(
        nextProjectiles,
        nextAliens,
        nextPlayer,
        nowMs
      );

      nextAliens = collision.survivingAliens;
      nextProjectiles = collision.survivingProjectiles;
      nextScore += collision.scoreGained;
      nextTotalKills += collision.destroyedAlienCount;

      // Speed up formation per destroyed alien
      if (collision.destroyedAlienCount > 0) {
        const speedBonus = collision.destroyedAlienCount * BRICK_SPACE_ALIEN_CONFIG.SPEED_ACCELERATION_PER_KILL_MS;
        nextFormation.stepIntervalMs = Math.max(
          BRICK_SPACE_ALIEN_CONFIG.MIN_STEP_INTERVAL_MS,
          nextFormation.stepIntervalMs - speedBonus
        );
      }

      // Check if Player was Hit
      if (collision.playerHit) {
        const nextLives = nextPlayer.lives - 1;
        return {
          ...state,
          status: "life-lost",
          player: { ...nextPlayer, lives: nextLives },
          score: nextScore,
          totalKills: nextTotalKills,
          highScore: Math.max(state.highScore, nextScore),
          overlayTimerMs: BRICK_SPACE_ALIEN_CONFIG.OVERLAY_DISPLAY_MS,
          projectiles: [],
        };
      }

      // Check Wave Completion
      if (nextAliens.length === 0) {
        const waveBonus = BRICK_SPACE_ALIEN_CONFIG.SCORE_WAVE_BONUS_BASE * state.wave;
        nextScore += waveBonus;
        return {
          ...state,
          status: "wave-complete",
          score: nextScore,
          totalKills: nextTotalKills,
          highScore: Math.max(state.highScore, nextScore),
          overlayTimerMs: BRICK_SPACE_ALIEN_CONFIG.OVERLAY_DISPLAY_MS,
          projectiles: [],
        };
      }

      // B. Update Alien Formation Step
      nextFormation.movementAccumulatorMs += deltaMs;
      if (nextFormation.movementAccumulatorMs >= nextFormation.stepIntervalMs) {
        const stepResult = stepFormation(nextAliens, nextFormation);
        nextAliens = stepResult.updatedAliens;
        nextFormation = stepResult.updatedFormation;

        // Check Invasion Trigger (Aliens reached defense row)
        if (stepResult.invaded) {
          return {
            ...state,
            status: "game-over",
            score: nextScore,
            totalKills: nextTotalKills,
            highScore: Math.max(state.highScore, nextScore),
            aliens: nextAliens,
            overlayTimerMs: 0,
          };
        }
      }

      // C. Alien Firing System
      const rng = createSeededRandom(state.seed + nowMs);
      if (nextAlienFireCooldown <= 0) {
        const alienBulletsCount = nextProjectiles.filter((p) => p.owner === "ALIEN").length;
        if (alienBulletsCount < BRICK_SPACE_ALIEN_CONFIG.MAX_ALIEN_PROJECTILES) {
          const shooters = getEligibleShooters(nextAliens);
          if (shooters.length > 0) {
            const shooterIndex = Math.floor(rng() * shooters.length);
            const shooter = shooters[shooterIndex];
            const bulletId = `ab-${nowMs}-${Math.floor(rng() * 1000)}`;

            nextProjectiles.push({
              id: bulletId,
              owner: "ALIEN",
              position: { x: shooter.position.x, y: shooter.position.y + 1 },
              previousPosition: { x: shooter.position.x, y: shooter.position.y },
              direction: 1,
            });
          }
        }

        // Reset alien fire cooldown with slight variance
        const intervalVariation = (rng() - 0.5) * 300;
        nextAlienFireCooldown = Math.max(
          BRICK_SPACE_ALIEN_CONFIG.MIN_ALIEN_FIRE_INTERVAL_MS,
          BRICK_SPACE_ALIEN_CONFIG.BASE_ALIEN_FIRE_INTERVAL_MS - (state.wave * 80) + intervalVariation
        );
      }

      return {
        ...state,
        player: nextPlayer,
        aliens: nextAliens,
        formation: nextFormation,
        projectiles: nextProjectiles,
        score: nextScore,
        totalKills: nextTotalKills,
        highScore: Math.max(state.highScore, nextScore),
        playerCooldownMs: nextPlayerCooldown,
        alienFireCooldownMs: nextAlienFireCooldown,
      };
    }

    case "MOVE_PLAYER": {
      if (state.status !== "playing") return state;
      const proposedX = state.player.centerX + action.deltaX;
      if (!isValidPlayerCenterX(proposedX)) return state;

      return {
        ...state,
        player: {
          ...state.player,
          centerX: proposedX,
        },
      };
    }

    case "PLAYER_FIRE": {
      if (state.status !== "playing") return state;
      if (state.playerCooldownMs > 0) return state;

      const playerBullets = state.projectiles.filter((p) => p.owner === "PLAYER");
      if (playerBullets.length >= BRICK_SPACE_ALIEN_CONFIG.MAX_PLAYER_PROJECTILES) return state;

      const bulletId = `pb-${action.nowMs}-${playerBullets.length}`;
      const newBullet: Projectile = {
        id: bulletId,
        owner: "PLAYER",
        position: { x: state.player.centerX, y: 17 }, // Spawn above top cannon pixel
        previousPosition: { x: state.player.centerX, y: 18 },
        direction: -1,
      };

      return {
        ...state,
        projectiles: [...state.projectiles, newBullet],
        playerCooldownMs: BRICK_SPACE_ALIEN_CONFIG.PLAYER_FIRE_COOLDOWN_MS,
      };
    }

    case "START_GAME": {
      const wave = action.wave || 1;
      const { aliens, formation } = generateWaveAliens(wave);
      return {
        ...state,
        status: "ready",
        wave,
        score: 0,
        totalKills: 0,
        player: {
          centerX: 4,
          lives: BRICK_SPACE_ALIEN_CONFIG.INITIAL_LIVES,
          invulnerableUntilMs: 0,
        },
        aliens,
        formation,
        projectiles: [],
        overlayTimerMs: 1200,
      };
    }

    case "TOGGLE_PAUSE": {
      if (state.status === "playing") return { ...state, status: "paused" };
      if (state.status === "paused") return { ...state, status: "playing" };
      return state;
    }

    case "RESUME_GAME": {
      if (state.status === "paused") return { ...state, status: "playing" };
      return state;
    }

    case "RESTART_GAME": {
      return gameReducer(state, { type: "START_GAME", wave: 1 });
    }

    case "NAV_MENU": {
      if (state.status !== "menu") return state;
      const total = MENU_OPTIONS.length;
      const nextIndex =
        action.direction === "UP"
          ? (state.selectedMenuIndex - 1 + total) % total
          : (state.selectedMenuIndex + 1) % total;
      return { ...state, selectedMenuIndex: nextIndex };
    }

    case "CONFIRM_MENU": {
      if (state.status !== "menu") return state;
      if (state.selectedMenuIndex === 0) {
        return gameReducer(state, { type: "START_GAME", wave: 1 });
      }
      if (state.selectedMenuIndex === 1) {
        return { ...state, status: "instructions" };
      }
      if (state.selectedMenuIndex === 2) {
        return { ...state, status: "high-scores" };
      }
      if (state.selectedMenuIndex === 3) {
        return { ...state, soundEnabled: !state.soundEnabled };
      }
      return state;
    }

    case "GO_TO_MENU": {
      return { ...state, status: "menu", overlayTimerMs: 0 };
    }

    case "GO_TO_INSTRUCTIONS": {
      return { ...state, status: "instructions" };
    }

    case "GO_TO_HIGH_SCORES": {
      return { ...state, status: "high-scores" };
    }

    case "TOGGLE_SOUND": {
      return { ...state, soundEnabled: !state.soundEnabled };
    }

    default:
      return state;
  }
}
