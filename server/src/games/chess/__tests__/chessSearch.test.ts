import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { chooseChessMove, evaluate } from "../chessSearch.js";

/** A small seeded generator, so a tournament gives the same result every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A budget long enough that a slow or busy machine cannot change which move is found. */
const generous = { budgetMs: 10_000 };

describe("chess search", () => {
  it("finds a mate in one", () => {
    // White to move: Qh5xf7# (Scholar's mate pattern).
    const chess = new Chess("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4");

    const move = chooseChessMove(chess, "master", { ...generous, random: mulberry32(1) });

    expect(move?.san).toBe("Qxf7#");
  });

  it("takes a queen that has been left hanging", () => {
    // White to move; the black queen on d5 is attacked by the white knight on c3 and is undefended.
    const chess = new Chess("rnb1kbnr/pppp1ppp/8/3qp3/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 3");

    for (const level of ["medium", "master"] as const) {
      const move = chooseChessMove(chess, level, { ...generous, random: mulberry32(2) });
      expect(move?.san, `${level} should take the queen`).toBe("Nxd5");
    }
  });

  it("does not leave its own queen to be taken for nothing", () => {
    // Black to move with its queen on d4 attacked by a pawn; it must move or defend it, not play elsewhere.
    const chess = new Chess("rnb1kbnr/pppp1ppp/8/4p3/3qP3/2P5/PP1P1PPP/RNBQKBNR b KQkq - 0 3");

    for (const level of ["medium", "master"] as const) {
      const move = chooseChessMove(chess, level, { ...generous, random: mulberry32(3) });
      const after = new Chess(chess.fen());
      after.move(move!);
      const queenSquare = move!.piece === "q" ? move!.to : "d4";
      const canBeTaken = after.moves({ verbose: true }).some((m) => m.to === queenSquare && m.captured === "q");
      expect(canBeTaken, `${level} left the queen en prise with ${move?.san}`).toBe(false);
    }
  });

  it("easy still plays a legal move", () => {
    const chess = new Chess();
    for (let i = 0; i < 20; i++) {
      const move = chooseChessMove(chess, "easy", { random: mulberry32(i) });
      expect(move).not.toBeNull();
      expect(chess.moves({ verbose: true }).some((m) => m.san === move!.san)).toBe(true);
    }
  });

  it("returns the only legal move without searching", () => {
    // Black king on h8 in check from the rook on h1 side file? Use a position with exactly one legal reply.
    const chess = new Chess("7k/8/5K2/8/8/8/8/6R1 b - - 0 1");
    const legal = chess.moves({ verbose: true });
    expect(legal.length).toBeGreaterThan(0);

    const move = chooseChessMove(chess, "master", { random: mulberry32(4) });

    expect(move).not.toBeNull();
    expect(legal.some((m) => m.san === move!.san)).toBe(true);
  });

  it("returns null when there is no legal move", () => {
    const mated = new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");

    expect(chooseChessMove(mated, "master")).toBeNull();
  });

  it("stays inside its time budget, so it can never freeze the server", () => {
    // A busy middlegame position.
    const chess = new Chess("r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7");

    const timings: number[] = [];
    let move = null;
    for (let i = 0; i < 5; i++) {
      const started = Date.now();
      move = chooseChessMove(chess, "master");
      timings.push(Date.now() - started);
    }
    const elapsed = Math.max(...timings);
    console.info(`[chess time] master move times in a busy middlegame: ${timings.join(", ")} ms (budget 150)`);

    expect(move).not.toBeNull();
    // A 150 ms budget. The full suite runs hundreds of files in parallel, so a loaded machine can stretch
    // this several-fold; the bound only has to catch a search that has stopped honouring its clock.
    expect(elapsed).toBeLessThan(2_000);
  });

  it("still answers when the clock has already run out", () => {
    const chess = new Chess();

    const move = chooseChessMove(chess, "master", { budgetMs: -1 });

    expect(move).not.toBeNull();
  });

  it("values a queen up over equal material", () => {
    const equal = new Chess();
    const queenUp = new Chess("rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

    // Black has no queen in the second position.
    expect(evaluate(queenUp) - evaluate(equal)).toBeGreaterThan(800);
  });

  it("is deterministic for a fixed random source", () => {
    const chess = new Chess("r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7");

    const a = chooseChessMove(chess, "medium", { ...generous, random: mulberry32(9) });
    const b = chooseChessMove(chess, "medium", { ...generous, random: mulberry32(9) });

    expect(a?.san).toBe(b?.san);
  });
});

/** The fraction of a move's budget each look at the clock uses up in the tournament. */
const TOURNAMENT_BUDGET_PER_CHECK = 0.5;

/** The bot as it was: a random legal move, preferring captures and checks. Kept here as the opponent to beat. */
function legacyMove(chess: Chess, random: () => number) {
  const legal = chess.moves({ verbose: true });
  const priority = legal.filter((m) => m.captured || m.san.includes("+") || m.san.includes("#"));
  const pool = priority.length > 0 ? priority : legal;
  return pool[Math.floor(random() * pool.length)];
}

function material(chess: Chess, color: "w" | "b"): number {
  const worth: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let total = 0;
  for (const row of chess.board()) for (const piece of row) if (piece && piece.color === color) total += worth[piece.type];
  return total;
}

/** Plays one game; returns the new bot's result: 1 win, 0.5 draw, 0 loss. A game that runs on is judged on material. */
function playGame(level: "medium" | "master", newBotIsWhite: boolean, seed: number): number {
  const random = mulberry32(seed);
  const chess = new Chess();
  const newColor = newBotIsWhite ? "w" : "b";

  for (let ply = 0; ply < 200 && !chess.isGameOver(); ply++) {
    // A clock that advances a fixed step per look at it, not per millisecond of wall time. The search reads
    // the clock only between depths, so this gives it the same amount of thinking on a busy machine as on
    // an idle one, and the tournament cannot flake under load.
    const budgetMs = level === "master" ? 40 : 20;
    let ticks = 0;
    const steppedClock = () => (ticks += budgetMs * TOURNAMENT_BUDGET_PER_CHECK);
    const move =
      chess.turn() === newColor
        ? chooseChessMove(chess, level, { budgetMs, random, now: steppedClock })
        : legacyMove(chess, random);
    if (!move) break;
    chess.move(move);
  }

  if (chess.isCheckmate()) return chess.turn() === newColor ? 0 : 1;
  if (chess.isGameOver()) return 0.5;
  const lead = material(chess, newColor) - material(chess, newColor === "w" ? "b" : "w");
  return lead >= 4 ? 1 : lead <= -4 ? 0 : 0.5;
}

describe("chess bot tournament: the new search against the old random-captures bot", () => {
  it.each(["medium", "master"] as const)("%s beats the old bot and does not lose", (level) => {
    const games = 6;
    let points = 0;
    let losses = 0;
    for (let i = 0; i < games; i++) {
      const result = playGame(level, i % 2 === 0, 500 + i);
      points += result;
      if (result === 0) losses += 1;
    }

    console.info(`[chess tournament] ${level} scored ${points} of ${games} against the old bot (${losses} losses)`);
    expect(losses).toBe(0);
    expect(points).toBeGreaterThanOrEqual(games - 1);
  }, 120_000);
});
