import type {
  GameState,
  GameAction,
  PieceType,
  GameMode,
} from "../types";
import {
  DEFAULT_LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  DEFAULT_DAS_MS,
  DEFAULT_ARR_MS,
  LINE_CLEAR_ANIMATION_MS,
  GARBAGE_INTERVAL_MS,
  BASE_GRAVITY_BY_LEVEL,
  VISIBLE_QUEUE_SIZE,
} from "../constants/gameConstants";
import { createEmptyBoard } from "../utils/matrixMath";
import { mulberry32, generateShuffledBag } from "../utils/random";
import { createActivePiece } from "../pieces/pieceFactory";
import { checkCollision } from "./collisionEngine";
import { tryRotatePiece } from "./rotationEngine";
import { getGhostPosition } from "./ghostEngine";
import { lockPieceIntoBoard } from "./lockEngine";
import { getCompletedLines, clearLinesFromBoard } from "./lineClearEngine";
import { calculateScoreUpdate } from "./scoreEngine";
import { addGarbageRows } from "./garbageEngine";
import {
  SOFT_DROP_POINT_PER_CELL,
  HARD_DROP_POINT_PER_CELL,
} from "../constants/scoringConstants";
import { dailySeed } from "../arcade/rules";

export function createInitialState(savedHighScore = 0, initialMode: GameMode = "CLASSIC"): GameState {
  const seed = Date.now();
  const rng = mulberry32(seed);
  const bag = generateShuffledBag(initialMode, rng);

  return {
    challenge: initialMode === "PENTIX" ? "pentix" : "marathon",
    elapsedMs: 0,
    piecesPlaced: 0,
    outcome: null,
    pausedFrom: "playing",
    practiceSpeed: 1000,
    dailyDate: null,
    status: "boot",
    mode: initialMode,
    board: createEmptyBoard(),
    activePiece: null,
    nextQueue: [],
    heldPiece: null,
    canHold: true,
    score: 0,
    highScore: savedHighScore,
    linesCleared: 0,
    level: 1,
    combo: -1,
    backToBack: false,
    gravityAccumulatorMs: 0,
    lockDelayAccumulatorMs: 0,
    lockResetsCount: 0,
    clearingLines: [],
    clearingProgress: 0,
    isSoftDropping: false,
    settings: {
      soundEnabled: true,
      ghostPieceEnabled: true,
      hardDropEnabled: true,
      lockDelayMs: DEFAULT_LOCK_DELAY_MS,
      maxLockResets: MAX_LOCK_RESETS,
      dasMs: DEFAULT_DAS_MS,
      arrMs: DEFAULT_ARR_MS,
      garbageRowsEnabled: false,
    },
    rngSeed: (seed + 0x6d2b79f5) >>> 0,
    bag,
    garbageAccumulatorMs: 0,
    selectedMenuItem: 0,
  };
}

function refillBagIfNeeded(bag: PieceType[], mode: GameMode, rng: () => number): PieceType[] {
  if (bag.length < VISIBLE_QUEUE_SIZE + 2) {
    return [...bag, ...generateShuffledBag(mode, rng)];
  }
  return bag;
}

function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "TICK": {
      const { deltaMs } = action.payload;

      // In non-playing or paused states, ignore tick
      if (state.status !== "playing" && state.status !== "line-clearing") {
        return state;
      }

      // Handle line-clearing flash animation transition
      if (state.status === "line-clearing") {
        const newProgress = state.clearingProgress + deltaMs / LINE_CLEAR_ANIMATION_MS;
        if (newProgress < 1) {
          return { ...state, clearingProgress: newProgress };
        }

        // Finish clearing lines and spawn next piece
        const clearedBoard = clearLinesFromBoard(state.board, state.clearingLines);
        const scoreUpdate = calculateScoreUpdate(
          state.score,
          state.level,
          state.linesCleared,
          state.clearingLines.length,
          state.combo,
          state.backToBack,
        );

        const rng = mulberry32(state.rngSeed);
        let updatedBag = [...state.bag];
        updatedBag = refillBagIfNeeded(updatedBag, state.mode, rng);

        const nextPieceType = state.nextQueue[0] || updatedBag.shift()!;
        const remainingQueue = state.nextQueue.slice(1);
        while (remainingQueue.length < VISIBLE_QUEUE_SIZE && updatedBag.length > 0) {
          remainingQueue.push(updatedBag.shift()!);
        }

        const newPiece = createActivePiece(nextPieceType);
        const isBlockOut = checkCollision(clearedBoard, newPiece.matrix, newPiece.position);

        return {
          ...state,
          board: clearedBoard,
          activePiece: isBlockOut ? null : newPiece,
          nextQueue: remainingQueue,
          bag: updatedBag,
          score: scoreUpdate.newScore,
          highScore: Math.max(state.highScore, scoreUpdate.newScore),
          level: scoreUpdate.newLevel,
          linesCleared: scoreUpdate.newLines,
          combo: scoreUpdate.newCombo,
          backToBack: scoreUpdate.isBackToBack,
          clearingLines: [],
          clearingProgress: 0,
          canHold: true,
          gravityAccumulatorMs: 0,
          lockDelayAccumulatorMs: 0,
          lockResetsCount: 0,
          status: isBlockOut ? "game-over" : "playing",
        };
      }

      if (!state.activePiece) {
        return state;
      }

      // Garbage rows accumulation for Pentix mode
      let currentBoard = state.board;
      let newGarbageAccumulator = state.garbageAccumulatorMs;
      if (state.mode === "PENTIX" && state.settings.garbageRowsEnabled) {
        newGarbageAccumulator += deltaMs;
        if (newGarbageAccumulator >= GARBAGE_INTERVAL_MS) {
          newGarbageAccumulator -= GARBAGE_INTERVAL_MS;
          const rng = mulberry32(state.rngSeed);
          currentBoard = addGarbageRows(currentBoard, 1, rng);
        }
      }

      // Compute current gravity speed
      const baseSpeed = state.challenge === "practice" ? state.practiceSpeed : BASE_GRAVITY_BY_LEVEL[state.level] ?? 40;
      const gravityInterval = state.isSoftDropping ? Math.max(25, baseSpeed / 16) : baseSpeed;

      let newGravityAccumulator = state.gravityAccumulatorMs + deltaMs;
      let currentPiece = state.activePiece;
      let softDropScoreBonus = 0;

      // Check if touching floor/obstacle
      const isTouchingSurface = checkCollision(currentBoard, currentPiece.matrix, {
        x: currentPiece.position.x,
        y: currentPiece.position.y + 1,
      });

      if (!isTouchingSurface) {
        // Fall down with gravity
        while (newGravityAccumulator >= gravityInterval) {
          newGravityAccumulator -= gravityInterval;
          const nextY = currentPiece.position.y + 1;
          if (!checkCollision(currentBoard, currentPiece.matrix, { x: currentPiece.position.x, y: nextY })) {
            currentPiece = {
              ...currentPiece,
              position: { ...currentPiece.position, y: nextY },
            };
            if (state.isSoftDropping) {
              softDropScoreBonus += SOFT_DROP_POINT_PER_CELL;
            }
          } else {
            break;
          }
        }
      }

      // Check lock delay
      const nowTouchingSurface = checkCollision(currentBoard, currentPiece.matrix, {
        x: currentPiece.position.x,
        y: currentPiece.position.y + 1,
      });

      if (nowTouchingSurface) {
        const newLockDelay = state.lockDelayAccumulatorMs + deltaMs;

        if (newLockDelay >= state.settings.lockDelayMs) {
          // Lock piece
          const lockedBoard = lockPieceIntoBoard(currentBoard, currentPiece);
          const completedLines = getCompletedLines(lockedBoard);

          if (completedLines.length > 0) {
            return {
              ...state,
              board: lockedBoard,
              score: state.score + softDropScoreBonus,
              clearingLines: completedLines,
              clearingProgress: 0,
              status: "line-clearing",
            };
          }

          // No lines cleared -> spawn next piece
          const rng = mulberry32(state.rngSeed);
          let updatedBag = [...state.bag];
          updatedBag = refillBagIfNeeded(updatedBag, state.mode, rng);

          const nextPieceType = state.nextQueue[0] || updatedBag.shift()!;
          const remainingQueue = state.nextQueue.slice(1);
          while (remainingQueue.length < VISIBLE_QUEUE_SIZE && updatedBag.length > 0) {
            remainingQueue.push(updatedBag.shift()!);
          }

          const spawnedPiece = createActivePiece(nextPieceType);
          const isBlockOut = checkCollision(lockedBoard, spawnedPiece.matrix, spawnedPiece.position);

          return {
            ...state,
            board: lockedBoard,
            activePiece: isBlockOut ? null : spawnedPiece,
            nextQueue: remainingQueue,
            bag: updatedBag,
            score: state.score + softDropScoreBonus,
            highScore: Math.max(state.highScore, state.score + softDropScoreBonus),
            combo: -1, // Reset combo on non-clearing lock
            canHold: true,
            gravityAccumulatorMs: 0,
            lockDelayAccumulatorMs: 0,
            lockResetsCount: 0,
            status: isBlockOut ? "game-over" : "playing",
          };
        }

        return {
          ...state,
          board: currentBoard,
          activePiece: currentPiece,
          score: state.score + softDropScoreBonus,
          gravityAccumulatorMs: newGravityAccumulator,
          lockDelayAccumulatorMs: newLockDelay,
          garbageAccumulatorMs: newGarbageAccumulator,
        };
      }

      return {
        ...state,
        board: currentBoard,
        activePiece: currentPiece,
        score: state.score + softDropScoreBonus,
        gravityAccumulatorMs: newGravityAccumulator,
        lockDelayAccumulatorMs: 0,
        garbageAccumulatorMs: newGarbageAccumulator,
      };
    }

    case "MOVE_LEFT": {
      if (state.status !== "playing" || !state.activePiece) return state;
      const targetPos = { x: state.activePiece.position.x - 1, y: state.activePiece.position.y };

      if (!checkCollision(state.board, state.activePiece.matrix, targetPos)) {
        const isTouching = checkCollision(state.board, state.activePiece.matrix, {
          x: targetPos.x,
          y: targetPos.y + 1,
        });
        const resetLock = isTouching && state.lockResetsCount < state.settings.maxLockResets;

        return {
          ...state,
          activePiece: { ...state.activePiece, position: targetPos },
          lockDelayAccumulatorMs: resetLock ? 0 : state.lockDelayAccumulatorMs,
          lockResetsCount: resetLock ? state.lockResetsCount + 1 : state.lockResetsCount,
        };
      }
      return state;
    }

    case "MOVE_RIGHT": {
      if (state.status !== "playing" || !state.activePiece) return state;
      const targetPos = { x: state.activePiece.position.x + 1, y: state.activePiece.position.y };

      if (!checkCollision(state.board, state.activePiece.matrix, targetPos)) {
        const isTouching = checkCollision(state.board, state.activePiece.matrix, {
          x: targetPos.x,
          y: targetPos.y + 1,
        });
        const resetLock = isTouching && state.lockResetsCount < state.settings.maxLockResets;

        return {
          ...state,
          activePiece: { ...state.activePiece, position: targetPos },
          lockDelayAccumulatorMs: resetLock ? 0 : state.lockDelayAccumulatorMs,
          lockResetsCount: resetLock ? state.lockResetsCount + 1 : state.lockResetsCount,
        };
      }
      return state;
    }

    case "ROTATE_CW": {
      if (state.status !== "playing" || !state.activePiece) return state;
      const rotated = tryRotatePiece(state.board, state.activePiece, "CW");
      if (rotated) {
        const isTouching = checkCollision(state.board, rotated.matrix, {
          x: rotated.position.x,
          y: rotated.position.y + 1,
        });
        const resetLock = isTouching && state.lockResetsCount < state.settings.maxLockResets;

        return {
          ...state,
          activePiece: rotated,
          lockDelayAccumulatorMs: resetLock ? 0 : state.lockDelayAccumulatorMs,
          lockResetsCount: resetLock ? state.lockResetsCount + 1 : state.lockResetsCount,
        };
      }
      return state;
    }

    case "ROTATE_CCW": {
      if (state.status !== "playing" || !state.activePiece) return state;
      const rotated = tryRotatePiece(state.board, state.activePiece, "CCW");
      if (rotated) {
        const isTouching = checkCollision(state.board, rotated.matrix, {
          x: rotated.position.x,
          y: rotated.position.y + 1,
        });
        const resetLock = isTouching && state.lockResetsCount < state.settings.maxLockResets;

        return {
          ...state,
          activePiece: rotated,
          lockDelayAccumulatorMs: resetLock ? 0 : state.lockDelayAccumulatorMs,
          lockResetsCount: resetLock ? state.lockResetsCount + 1 : state.lockResetsCount,
        };
      }
      return state;
    }

    case "SOFT_DROP_START": {
      if (state.status !== "playing") return state;
      return { ...state, isSoftDropping: true };
    }

    case "SOFT_DROP_END": {
      return { ...state, isSoftDropping: false };
    }

    case "HARD_DROP": {
      if (state.status !== "playing" || !state.activePiece || !state.settings.hardDropEnabled) {
        return state;
      }

      const ghost = getGhostPosition(state.board, state.activePiece);
      const dropDistance = ghost.y - state.activePiece.position.y;
      const hardDropPoints = dropDistance * HARD_DROP_POINT_PER_CELL;

      const droppedPiece: typeof state.activePiece = {
        ...state.activePiece,
        position: ghost,
      };

      const lockedBoard = lockPieceIntoBoard(state.board, droppedPiece);
      const completedLines = getCompletedLines(lockedBoard);

      if (completedLines.length > 0) {
        return {
          ...state,
          board: lockedBoard,
          activePiece: droppedPiece,
          score: state.score + hardDropPoints,
          highScore: Math.max(state.highScore, state.score + hardDropPoints),
          clearingLines: completedLines,
          clearingProgress: 0,
          status: "line-clearing",
        };
      }

      // No lines cleared -> spawn next piece
      const rng = mulberry32(state.rngSeed);
      let updatedBag = [...state.bag];
      updatedBag = refillBagIfNeeded(updatedBag, state.mode, rng);

      const nextPieceType = state.nextQueue[0] || updatedBag.shift()!;
      const remainingQueue = state.nextQueue.slice(1);
      while (remainingQueue.length < VISIBLE_QUEUE_SIZE && updatedBag.length > 0) {
        remainingQueue.push(updatedBag.shift()!);
      }

      const spawnedPiece = createActivePiece(nextPieceType);
      const isBlockOut = checkCollision(lockedBoard, spawnedPiece.matrix, spawnedPiece.position);

      return {
        ...state,
        board: lockedBoard,
        activePiece: isBlockOut ? null : spawnedPiece,
        nextQueue: remainingQueue,
        bag: updatedBag,
        score: state.score + hardDropPoints,
        highScore: Math.max(state.highScore, state.score + hardDropPoints),
        combo: -1,
        canHold: true,
        gravityAccumulatorMs: 0,
        lockDelayAccumulatorMs: 0,
        lockResetsCount: 0,
        status: isBlockOut ? "game-over" : "playing",
      };
    }

    case "HOLD_PIECE": {
      if (state.status !== "playing" || !state.activePiece || !state.canHold) {
        return state;
      }

      const currentType = state.activePiece.type;
      let newActiveType: PieceType;
      let newNextQueue = [...state.nextQueue];
      let newBag = [...state.bag];

      if (state.heldPiece === null) {
        const rng = mulberry32(state.rngSeed);
        newBag = refillBagIfNeeded(newBag, state.mode, rng);
        newActiveType = newNextQueue.shift() || newBag.shift()!;
        while (newNextQueue.length < VISIBLE_QUEUE_SIZE && newBag.length > 0) {
          newNextQueue.push(newBag.shift()!);
        }
      } else {
        newActiveType = state.heldPiece;
      }

      const newPiece = createActivePiece(newActiveType);
      const isBlockOut = checkCollision(state.board, newPiece.matrix, newPiece.position);

      return {
        ...state,
        heldPiece: currentType,
        canHold: false,
        activePiece: isBlockOut ? null : newPiece,
        nextQueue: newNextQueue,
        bag: newBag,
        gravityAccumulatorMs: 0,
        lockDelayAccumulatorMs: 0,
        lockResetsCount: 0,
        status: isBlockOut ? "game-over" : "playing",
      };
    }

    case "PAUSE_TOGGLE": {
      if (state.status === "playing" || state.status === "line-clearing") return { ...state, status: "paused", pausedFrom: state.status, isSoftDropping: false };
      if (state.status === "paused") return { ...state, status: state.pausedFrom };
      return state;
    }

    case "START_GAME": {
      const challenge = action.payload?.challenge ?? (action.payload?.mode === "PENTIX" ? "pentix" : "marathon");
      const mode = challenge === "pentix" ? "PENTIX" : action.payload?.mode ?? "CLASSIC";
      const seed = action.payload?.seed ?? Date.now();
      const rng = mulberry32(seed);
      let bag = generateShuffledBag(mode, rng);

      const firstPieceType = bag.shift()!;
      const nextQueue: PieceType[] = [];
      while (nextQueue.length < VISIBLE_QUEUE_SIZE && bag.length > 0) {
        nextQueue.push(bag.shift()!);
      }

      return {
        ...createInitialState(state.highScore, mode),
        status: "playing",
        mode,
        board: createEmptyBoard(),
        activePiece: createActivePiece(firstPieceType),
        nextQueue,
        bag,
        rngSeed: (seed + 0x6d2b79f5) >>> 0,
        challenge,
        practiceSpeed: action.payload?.practiceSpeed ?? 1000,
        dailyDate: action.payload?.dailyDate ?? null,
        settings: state.settings,
      };
    }

    case "RESTART_GAME": {
      return gameReducer(state, { type: "START_GAME", payload: { mode: state.mode, challenge: state.challenge, practiceSpeed: state.practiceSpeed, seed: state.dailyDate ? dailySeed(state.dailyDate) : undefined, dailyDate: state.dailyDate ?? undefined } });
    }

    case "NAVIGATE_MENU": {
      if (state.status !== "menu" && state.status !== "boot") return state;
      const totalItems = 4;
      const delta = action.payload.direction === "UP" ? -1 : 1;
      const nextIndex = (state.selectedMenuItem + delta + totalItems) % totalItems;
      return { ...state, selectedMenuItem: nextIndex };
    }

    case "SELECT_MENU_ITEM": {
      if (state.status === "boot") {
        return { ...state, status: "menu", selectedMenuItem: 0 };
      }
      if (state.status === "menu") {
        switch (state.selectedMenuItem) {
          case 0:
            return gameReducer(state, { type: "START_GAME" });
          case 1:
            return {
              ...state,
              mode: state.mode === "CLASSIC" ? "PENTIX" : "CLASSIC",
            };
          case 2:
            return { ...state, status: "high-scores" };
          case 3:
            return { ...state, status: "instructions" };
        }
      }
      if (state.status === "game-over" || state.status === "high-scores" || state.status === "instructions") {
        return { ...state, status: "menu" };
      }
      return state;
    }

    case "TOGGLE_MODE": {
      const nextMode: GameMode = state.mode === "CLASSIC" ? "PENTIX" : "CLASSIC";
      return { ...state, mode: nextMode };
    }

    case "TOGGLE_GHOST": {
      return {
        ...state,
        settings: {
          ...state.settings,
          ghostPieceEnabled: !state.settings.ghostPieceEnabled,
        },
      };
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

    case "OPEN_INSTRUCTIONS":
      return { ...state, status: "instructions" };

    case "OPEN_HIGH_SCORES":
      return { ...state, status: "high-scores" };

    case "BACK_TO_MENU":
      return { ...state, status: "menu" };

    default:
      return state;
  }
}

/** Track mode goals separately from the shared movement/rotation rules. */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "RESTORE_GAME") return { ...action.payload, status: "paused", isSoftDropping: false };
  const running = state.status === "playing" || state.status === "line-clearing";
  const timed = state.challenge === "attack" || state.challenge === "sprint" || state.challenge === "daily";
  let input = state;
  if (action.type === "TICK") {
    if (!Number.isFinite(action.payload.deltaMs) || action.payload.deltaMs < 0) return state;
    if (running || (timed && state.status === "paused")) {
      input = { ...state, elapsedMs: state.elapsedMs + action.payload.deltaMs };
    }
    const remaining = state.challenge === "attack" ? Math.max(0, 120000 - state.elapsedMs) : Infinity;
    action = { ...action, payload: { deltaMs: Math.min(100, remaining, action.payload.deltaMs) } };
  }
  let next = reduceGame(input, action);
  if (next.bag.length > state.bag.length && action.type !== "START_GAME") {
    next = { ...next, rngSeed: (state.rngSeed + 0x6d2b79f5) >>> 0 };
  }
  if (running && next.board !== state.board && !state.clearingLines.length &&
      (next.status === "line-clearing" || next.activePiece !== state.activePiece)) {
    next = { ...next, piecesPlaced: state.piecesPlaced + 1 };
  }
  const reachedLines = (next.challenge === "sprint" || next.challenge === "daily") && next.linesCleared >= 40;
  const reachedTime = next.challenge === "attack" && next.elapsedMs >= 120000;
  if ((running || state.status === "paused") && (reachedLines || reachedTime)) {
    if (reachedTime && next.clearingLines.length) {
      next = reduceGame({ ...next, status: "line-clearing" }, { type: "TICK", payload: { deltaMs: LINE_CLEAR_ANIMATION_MS } });
    }
    return { ...next, elapsedMs: reachedTime ? 120000 : next.elapsedMs, status: "game-over", outcome: "complete", isSoftDropping: false };
  }
  if (next.status === "game-over" && !next.outcome) next = { ...next, outcome: "top-out" };
  return next;
}
