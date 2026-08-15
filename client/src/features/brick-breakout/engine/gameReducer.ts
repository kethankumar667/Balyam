import type { GameAction, GameState, Paddle, Ball } from "../types";
import { BREAKOUT_CONSTANTS } from "../constants/gameConstants";
import { generateLevelBricks, calculateTickSpeed } from "./levelGenerator";
import { movePaddle, syncAttachedBall } from "./movementEngine";
import { simulateBallStep } from "./collisionEngine";

export function createInitialPaddle(width: number = BREAKOUT_CONSTANTS.PADDLE_WIDTH): Paddle {
  return {
    centerX: Math.floor(BREAKOUT_CONSTANTS.GRID_WIDTH / 2),
    width,
    row: BREAKOUT_CONSTANTS.PADDLE_ROW,
  };
}

export function createInitialBall(paddle: Paddle): Ball {
  return {
    position: {
      x: paddle.centerX,
      y: paddle.row - 1,
    },
    velocity: {
      dx: 0,
      dy: -1,
    },
    attachedToPaddle: true,
  };
}

export function createInitialBreakoutState(savedHighScore: number = 0, soundEnabled: boolean = true): GameState {
  const paddle = createInitialPaddle();
  const ball = createInitialBall(paddle);
  const bricks = generateLevelBricks(1);
  const remainingBricks = bricks.filter((b) => b.type !== "INDESTRUCTIBLE").length;

  return {
    status: "menu",
    paddle,
    ball,
    bricks,
    score: 0,
    highScore: savedHighScore,
    lives: BREAKOUT_CONSTANTS.INITIAL_LIVES,
    level: 1,
    combo: 1,
    remainingBricks,
    settings: {
      soundEnabled,
      reducedMotion: false,
      controlSensitivity: "NORMAL",
    },
    tickSpeedMs: calculateTickSpeed(1),
    lastPaddleMoveDir: 0,
  };
}

export function breakoutGameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const level = action.level ?? 1;
      const paddle = createInitialPaddle();
      const ball = createInitialBall(paddle);
      const bricks = generateLevelBricks(level);
      const remainingBricks = bricks.filter((b) => b.type !== "INDESTRUCTIBLE").length;

      return {
        ...state,
        status: "serving",
        paddle,
        ball,
        bricks,
        score: 0,
        lives: BREAKOUT_CONSTANTS.INITIAL_LIVES,
        level,
        combo: 1,
        remainingBricks,
        tickSpeedMs: calculateTickSpeed(level),
        lastPaddleMoveDir: 0,
      };
    }

    case "SERVE_BALL": {
      if (state.status !== "life-lost" && state.status !== "ready") return state;
      const paddle = createInitialPaddle(state.paddle.width);
      const ball = createInitialBall(paddle);

      return {
        ...state,
        status: "serving",
        paddle,
        ball,
        combo: 1,
        lastPaddleMoveDir: 0,
      };
    }

    case "LAUNCH_BALL": {
      if (state.status !== "serving" || !state.ball.attachedToPaddle) return state;

      // Random or directional launch: dy is always -1 (upwards)
      const initialDx = (state.lastPaddleMoveDir !== 0 ? state.lastPaddleMoveDir : (Math.random() < 0.5 ? -1 : 1)) as -1 | 1;

      return {
        ...state,
        status: "playing",
        ball: {
          ...state.ball,
          velocity: { dx: initialDx, dy: -1 },
          attachedToPaddle: false,
        },
      };
    }

    case "MOVE_PADDLE": {
      if (state.status !== "playing" && state.status !== "serving") return state;

      const newPaddle = movePaddle(state.paddle, action.direction);
      const newBall = syncAttachedBall(state.ball, newPaddle);

      return {
        ...state,
        paddle: newPaddle,
        ball: newBall,
        lastPaddleMoveDir: action.direction,
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;

      const result = simulateBallStep(
        state.ball,
        state.paddle,
        state.bricks,
        state.combo,
        state.lastPaddleMoveDir,
      );

      // Handle missed ball
      if (result.missed) {
        const remainingLives = state.lives - 1;
        const isGameOver = remainingLives <= 0;
        const newHighScore = Math.max(state.highScore, state.score);

        return {
          ...state,
          status: isGameOver ? "game-over" : "life-lost",
          lives: Math.max(0, remainingLives),
          highScore: newHighScore,
          combo: 1,
        };
      }

      const newScore = state.score + result.scoreDelta;
      const newHighScore = Math.max(state.highScore, newScore);
      const newRemainingBricks = result.updatedBricks.filter((b) => b.type !== "INDESTRUCTIBLE").length;
      const newCombo = result.destroyedBrickCount > 0 ? state.combo + result.destroyedBrickCount : state.combo;

      // Check level completion
      if (newRemainingBricks === 0) {
        const levelBonus = BREAKOUT_CONSTANTS.SCORE_LEVEL_CLEAR_BASE * state.level;
        return {
          ...state,
          status: "level-complete",
          bricks: result.updatedBricks,
          score: newScore + levelBonus,
          highScore: Math.max(newHighScore, newScore + levelBonus),
          remainingBricks: 0,
        };
      }

      return {
        ...state,
        ball: result.ball,
        bricks: result.updatedBricks,
        score: newScore,
        highScore: newHighScore,
        remainingBricks: newRemainingBricks,
        combo: newCombo,
      };
    }

    case "NEXT_LEVEL": {
      if (state.status !== "level-complete") return state;
      const nextLevel = state.level + 1;
      const paddle = createInitialPaddle(state.paddle.width);
      const ball = createInitialBall(paddle);
      const bricks = generateLevelBricks(nextLevel);
      const remainingBricks = bricks.filter((b) => b.type !== "INDESTRUCTIBLE").length;

      return {
        ...state,
        status: "serving",
        level: nextLevel,
        paddle,
        ball,
        bricks,
        remainingBricks,
        combo: 1,
        tickSpeedMs: calculateTickSpeed(nextLevel),
        lastPaddleMoveDir: 0,
      };
    }

    case "PAUSE_TOGGLE": {
      if (state.status === "playing") {
        return { ...state, status: "paused" };
      }
      if (state.status === "paused") {
        return { ...state, status: "playing" };
      }
      return state;
    }

    case "RESUME": {
      if (state.status === "paused") {
        return { ...state, status: "playing" };
      }
      return state;
    }

    case "RESTART": {
      return breakoutGameReducer(state, { type: "START_GAME", level: 1 });
    }

    case "OPEN_INSTRUCTIONS": {
      return { ...state, status: "instructions" };
    }

    case "OPEN_MENU": {
      return { ...state, status: "menu" };
    }

    case "TOGGLE_SOUND": {
      return {
        ...state,
        settings: {
          ...state.settings,
          soundEnabled: !state.settings.soundEnabled,
        },
      };
    }

    case "SET_STATUS": {
      return { ...state, status: action.status };
    }

    default:
      return state;
  }
}
