import { describe, it, expect } from "vitest";
import { createEmptyBoard, rotateMatrixCW, rotateMatrixCCW } from "../utils/matrixMath";
import { checkCollision } from "../engine/collisionEngine";
import { tryRotatePiece } from "../engine/rotationEngine";
import { getGhostPosition } from "../engine/ghostEngine";
import { lockPieceIntoBoard } from "../engine/lockEngine";
import { getCompletedLines, clearLinesFromBoard } from "../engine/lineClearEngine";
import { calculateScoreUpdate } from "../engine/scoreEngine";
import { addGarbageRows } from "../engine/garbageEngine";
import { mulberry32, generateShuffledBag } from "../utils/random";
import { createActivePiece } from "../pieces/pieceFactory";
import { gameReducer, createInitialState } from "../engine/gameReducer";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../constants/gameConstants";

describe("Brick Tetris & Pentix Game Engine", () => {
  it("initializes a clean 10x20 board", () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(BOARD_HEIGHT);
    expect(board[0].length).toBe(BOARD_WIDTH);
    expect(board.every((row) => row.every((cell) => cell === 0))).toBe(true);
  });

  it("rotates piece matrices accurately in CW and CCW directions", () => {
    const tPiece = createActivePiece("T");
    const rotatedCW = rotateMatrixCW(tPiece.matrix);
    expect(rotatedCW).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ]);

    const rotatedCCW = rotateMatrixCCW(tPiece.matrix);
    expect(rotatedCCW).toEqual([
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ]);
  });

  it("detects boundary collisions and locked board cell collisions", () => {
    const board = createEmptyBoard();
    const tPiece = createActivePiece("T");

    // Inside bounds
    expect(checkCollision(board, tPiece.matrix, { x: 3, y: 5 })).toBe(false);

    // Left wall collision
    expect(checkCollision(board, tPiece.matrix, { x: -2, y: 5 })).toBe(true);

    // Right wall collision
    expect(checkCollision(board, tPiece.matrix, { x: 9, y: 5 })).toBe(true);

    // Floor collision
    expect(checkCollision(board, tPiece.matrix, { x: 3, y: 19 })).toBe(true);

    // Locked cell collision
    board[10][4] = 1;
    expect(checkCollision(board, tPiece.matrix, { x: 3, y: 9 })).toBe(true);
  });

  it("applies SRS wall kicks when rotating near walls", () => {
    const board = createEmptyBoard();
    const tPiece = createActivePiece("T");
    // Position near right wall
    tPiece.position = { x: 8, y: 5 };

    const rotated = tryRotatePiece(board, tPiece, "CW");
    expect(rotated).not.toBeNull();
    expect(rotated?.rotation).toBe(1);
  });

  it("accurately calculates ghost landing position", () => {
    const board = createEmptyBoard();
    const iPiece = createActivePiece("I");
    iPiece.position = { x: 3, y: 0 };

    const ghost = getGhostPosition(board, iPiece);
    // Floor is at row 19, I piece row 1 has blocks -> ghost.y = 18
    expect(ghost.y).toBe(18);
    expect(ghost.x).toBe(3);
  });

  it("locks active piece and clears completed lines correctly", () => {
    let board = createEmptyBoard();
    // Fill bottom row except for columns 3, 4, 5, 6
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (c < 3 || c > 6) {
        board[19][c] = 1;
      }
    }

    const iPiece = createActivePiece("I");
    iPiece.position = { x: 3, y: 18 }; // row 1 of I piece fills row 19

    board[18][0] = 1; // row 18 has a block that should shift down to row 19
    const lockedBoard = lockPieceIntoBoard(board, iPiece);
    const completed = getCompletedLines(lockedBoard);
    expect(completed).toContain(19);

    const clearedBoard = clearLinesFromBoard(lockedBoard, completed);
    expect(clearedBoard.length).toBe(BOARD_HEIGHT);
    expect(clearedBoard[19][0]).toBe(1); // row 18 shifted down to row 19
  });

  it("calculates scoring, combos, and Back-to-Back bonuses", () => {
    // Single clear at level 1
    const singleRes = calculateScoreUpdate(0, 1, 0, 1, -1, false);
    expect(singleRes.newScore).toBe(100);
    expect(singleRes.isBackToBack).toBe(false);

    // Tetris (4-line) clear with B2B bonus
    const b2bTetris = calculateScoreUpdate(1000, 2, 8, 4, 1, true);
    // base (1000 * 2) * 1.5 + combo (50 * 2 * 2) = 3000 + 200 = 3200
    expect(b2bTetris.pointsEarned).toBe(3200);
    expect(b2bTetris.newLevel).toBe(2);
  });

  it("generates deterministic shuffled bags and adds valid garbage rows", () => {
    const rng = mulberry32(12345);
    const bagClassic = generateShuffledBag("CLASSIC", rng);
    expect(bagClassic.length).toBe(7);
    expect(new Set(bagClassic).size).toBe(7);

    const board = createEmptyBoard();
    const garbageBoard = addGarbageRows(board, 2, rng);
    expect(garbageBoard.length).toBe(BOARD_HEIGHT);
    // Garbage rows have exactly 1 hole
    const bottomHoles = garbageBoard[19].filter((c) => c === 0).length;
    expect(bottomHoles).toBe(1);
  });

  it("progresses state machine through gameReducer actions", () => {
    let state = createInitialState(1000, "CLASSIC");
    expect(state.status).toBe("boot");

    state = gameReducer(state, { type: "SELECT_MENU_ITEM" });
    expect(state.status).toBe("menu");

    state = gameReducer(state, { type: "START_GAME" });
    expect(state.status).toBe("playing");
    expect(state.activePiece).not.toBeNull();

    // Move left and rotate
    const initialX = state.activePiece!.position.x;
    state = gameReducer(state, { type: "MOVE_LEFT" });
    expect(state.activePiece!.position.x).toBe(initialX - 1);

    state = gameReducer(state, { type: "ROTATE_CW" });
    expect(state.activePiece!.rotation).toBe(1);

    // Pause toggle
    state = gameReducer(state, { type: "PAUSE_TOGGLE" });
    expect(state.status).toBe("paused");

    state = gameReducer(state, { type: "PAUSE_TOGGLE" });
    expect(state.status).toBe("playing");
  });
});
