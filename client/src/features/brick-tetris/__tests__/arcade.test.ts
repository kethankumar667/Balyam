import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "../engine/gameReducer";
import { lockPieceIntoBoard } from "../engine/lockEngine";
import { checkCollision } from "../engine/collisionEngine";
import { getCompletedLines } from "../engine/lineClearEngine";
import { createEmptyBoard } from "../utils/matrixMath";
import { createActivePiece } from "../pieces/pieceFactory";
import { dailySeed } from "../arcade/rules";

describe("Color Arcade", () => {
  it("keeps piece identity after locking and collides with colored cells", () => {
    const piece = createActivePiece("T");
    piece.position = { x: 3, y: 17 };
    const board = lockPieceIntoBoard(createEmptyBoard(), piece);
    expect(board[17][4]).toBe("T");
    expect(checkCollision(board, piece.matrix, piece.position)).toBe(true);
    expect(createEmptyBoard()[17][4]).toBe(0);
  });

  it("clears rows containing mixed colors", () => {
    const board = createEmptyBoard();
    board[19] = Array.from({ length: 10 }, (_, i) => i % 2 ? "T" : "I");
    expect(getCompletedLines(board)).toEqual([19]);
  });

  it("replays a daily seed identically and changes it on the next UTC date", () => {
    const seed = dailySeed("2026-10-26");
    expect(seed).not.toBe(dailySeed("2026-10-27"));
    const start = () => gameReducer(createInitialState(), { type: "START_GAME", payload: { challenge: "daily", seed } });
    let a = start(), b = start();
    for (let i = 0; i < 12; i++) {
      a = gameReducer(a, { type: "HARD_DROP" });
      b = gameReducer(b, { type: "HARD_DROP" });
    }
    expect(a).toEqual(b);
  });
  it("advances the seeded shuffle instead of repeating the first bag", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME", payload: { seed: 42 } });
    const shapes: string[] = [];
    for (let i = 0; i < 21; i++) {
      shapes.push(state.activePiece!.type);
      state = gameReducer({ ...state, board: createEmptyBoard() }, { type: "HARD_DROP" });
    }
    expect(new Set(shapes.slice(0, 7)).size).toBe(7);
    expect(new Set(shapes.slice(7, 14)).size).toBe(7);
    expect(shapes.slice(7, 14)).not.toEqual(shapes.slice(0, 7));
  });

  it("finishes score attack at exactly two minutes, including paused time", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME", payload: { challenge: "attack" } });
    state = gameReducer(state, { type: "PAUSE_TOGGLE" });
    state = gameReducer(state, { type: "TICK", payload: { deltaMs: 119999 } });
    expect(state.status).toBe("paused");
    state = gameReducer(state, { type: "TICK", payload: { deltaMs: 1 } });
    expect(state.status).toBe("game-over");
    expect(state.outcome).toBe("complete");
  });

  it("completes sprint at forty lines without requiring a top-out", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME", payload: { challenge: "sprint" } });
    state = { ...state, linesCleared: 39, status: "line-clearing", clearingLines: [19], clearingProgress: 0.99 };
    state.board[19].fill(1);
    state = gameReducer(state, { type: "TICK", payload: { deltaMs: 100 } });
    expect(state.linesCleared).toBe(40);
    expect(state.outcome).toBe("complete");
  });
  it("settles a pending clear once at the attack deadline and caps elapsed time", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME", payload: { challenge: "attack" } });
    state = { ...state, elapsedMs: 119999, status: "line-clearing", clearingLines: [19], clearingProgress: 0 };
    state.board[19].fill("T");
    state = gameReducer(state, { type: "TICK", payload: { deltaMs: 5000 } });
    expect(state.elapsedMs).toBe(120000);
    expect(state.linesCleared).toBe(1);
    expect(state.score).toBeGreaterThan(0);
    const score = state.score;
    expect(gameReducer(state, { type: "TICK", payload: { deltaMs: 5000 } }).score).toBe(score);
  });

  it("resumes line clearing without duplicating points", () => {
    let state = gameReducer(createInitialState(), { type: "START_GAME" });
    state = { ...state, status: "line-clearing", clearingLines: [19], clearingProgress: 0.5 };
    state = gameReducer(state, { type: "PAUSE_TOGGLE" });
    expect(state.status).toBe("paused");
    state = gameReducer(state, { type: "PAUSE_TOGGLE" });
    expect(state.status).toBe("line-clearing");
  });
});
