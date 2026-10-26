import type { Challenge, GameState, PieceType } from "../types";
import { loadTetrisData, STORAGE_KEY } from "../services/storageService";
import { BLOCK_COLORS, isTimed, MODES } from "./rules";
import { createInitialState } from "../engine/gameReducer";
import { createActivePiece } from "../pieces/pieceFactory";
import { rotateMatrixCW } from "../utils/matrixMath";

export const DEFAULT_BINDINGS = {
  MOVE_LEFT: "ArrowLeft", MOVE_RIGHT: "ArrowRight", SOFT_DROP_START: "ArrowDown",
  ROTATE_CW: "ArrowUp", ROTATE_CCW: "KeyZ", HARD_DROP: "Space", HOLD_PIECE: "KeyC", PAUSE_TOGGLE: "Escape",
};
export type Control = keyof typeof DEFAULT_BINDINGS;
export type Bindings = Record<Control, string>;
export interface RunRecord {
  id: string;
  mode: Challenge;
  score: number;
  lines: number;
  elapsedMs: number;
  pieces: number;
  complete: boolean;
  date: string;
  dailyDate: string | null;
}
export interface ArcadeSave {
  version: 1;
  records: RunRecord[];
  run: GameState | null;
  bindings: Bindings;
  sound: boolean;
  volume: number;
  effects: boolean;
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const piece = (p: unknown): p is PieceType => typeof p === "string" && Object.prototype.hasOwnProperty.call(BLOCK_COLORS, p);
const challenge = (p: unknown): p is Challenge => MODES.some(mode => mode.id === p);

export function validateRun(value: unknown): GameState | null {
  if (!object(value) || !challenge(value.challenge) || isTimed(value.challenge)) return null;
  if (value.mode !== (value.challenge === "pentix" ? "PENTIX" : "CLASSIC")) return null;
  if (!Array.isArray(value.board) || value.board.length !== 20 ||
      !value.board.every(row => Array.isArray(row) && row.length === 10 && row.every(cell => cell === 0 || cell === 1 || piece(cell)))) return null;
  if (!Array.isArray(value.bag) || !value.bag.every(piece) || !Array.isArray(value.nextQueue) ||
      value.nextQueue.length !== 4 || !value.nextQueue.every(piece)) return null;
  if (!object(value.activePiece) || !piece(value.activePiece.type) ||
      !Number.isInteger(value.activePiece.rotation) || !object(value.activePiece.position)) return null;
  const { x, y } = value.activePiece.position;
  if (typeof x !== "number" || !Number.isInteger(x) || x < -4 || x > 9 ||
      typeof y !== "number" || !Number.isInteger(y) || y < -4 || y > 19) return null;
  const rotation = value.activePiece.rotation;
  if (typeof rotation !== "number" || rotation < 0 || rotation > 3) return null;
  if (value.heldPiece !== null && !piece(value.heldPiece)) return null;
  const keys = ["score", "highScore", "linesCleared", "level", "elapsedMs", "piecesPlaced", "rngSeed",
    "gravityAccumulatorMs", "lockDelayAccumulatorMs", "lockResetsCount", "clearingProgress", "garbageAccumulatorMs"] as const;
  if (!keys.every(key => finite(value[key])) || !finite(value.practiceSpeed) || value.practiceSpeed < 40 || value.practiceSpeed > 3000) return null;
  if (!Array.isArray(value.clearingLines) || !value.clearingLines.every(n => Number.isInteger(n) && n >= 0 && n < 20)) return null;
  if (typeof value.combo !== "number" || !Number.isInteger(value.combo) || value.combo < -1 ||
      typeof value.backToBack !== "boolean" || typeof value.canHold !== "boolean") return null;
  // Rebuild from known fields rather than spreading device-controlled objects into the engine.
  const mode = value.challenge === "pentix" ? "PENTIX" : "CLASSIC";
  const base = createInitialState(0, mode);
  const active = createActivePiece(value.activePiece.type);
  let expected = active.matrix;
  for (let i = 0; i < rotation; i++) expected = rotateMatrixCW(expected);
  const matrix = value.activePiece.matrix;
  if (!Array.isArray(matrix) || matrix.length !== active.matrix.length ||
      JSON.stringify(matrix) !== JSON.stringify(expected)) return null;
  // These fields have been individually checked above; retain the schema's exact numeric types.
  const numeric = Object.fromEntries(keys.map(key => [key, value[key]])) as Pick<GameState, typeof keys[number]>;
  return {
    ...base, ...numeric, mode, challenge: value.challenge,
    board: value.board, bag: value.bag, nextQueue: value.nextQueue,
    activePiece: { ...active, rotation, position: { x, y }, matrix: expected },
    heldPiece: value.heldPiece, canHold: value.canHold, combo: value.combo,
    backToBack: value.backToBack, practiceSpeed: value.practiceSpeed, status: "paused",
    pausedFrom: value.clearingLines.length ? "line-clearing" : "playing",
    clearingLines: value.clearingLines,
  };
}

export function readArcade(): ArcadeSave {
  const defaults: ArcadeSave = { version: 1, records: [], run: null, bindings: { ...DEFAULT_BINDINGS }, sound: true, volume: 0.5, effects: true };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaults;
  const legacy: unknown = JSON.parse(raw);
  if (!object(legacy) || legacy.arcade === undefined) return defaults;
  const data = legacy.arcade;
  if (!object(data) || data.version !== 1) throw new Error("This Brick Blocks save version is not supported.");
  const records = Array.isArray(data.records) ? data.records.filter((r): r is RunRecord =>
    object(r) && typeof r.id === "string" && challenge(r.mode) && finite(r.score) && finite(r.lines) &&
    finite(r.elapsedMs) && finite(r.pieces) && typeof r.complete === "boolean" && typeof r.date === "string" &&
    (r.dailyDate === null || typeof r.dailyDate === "string")) : [];
  const bindings = { ...DEFAULT_BINDINGS };
  if (object(data.bindings)) {
    const mapped = data.bindings;
    for (const key of Object.keys(bindings) as Control[]) {
      if (typeof mapped[key] === "string" && /^(Arrow(Left|Right|Up|Down)|Key[A-Z]|Digit[0-9]|Space|Escape|ShiftLeft|ShiftRight)$/.test(mapped[key])) bindings[key] = mapped[key];
    }
    if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) throw new Error("Saved keyboard controls contain duplicate keys.");
  }
  const run = data.run == null ? null : validateRun(data.run);
  if (data.run != null && !run) throw new Error("The saved run is invalid. Existing records have not been changed.");
  return { ...defaults, records: records.slice(0, 100), run, bindings,
    sound: data.sound !== false, volume: finite(data.volume) ? Math.min(1, data.volume) : 0.5, effects: data.effects !== false };
}

export function writeArcade(data: ArcadeSave): void {
  const legacy = loadTetrisData();
  const best = (mode: Challenge) => Math.max(0, ...data.records.filter(record => record.mode === mode).map(record => record.score));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...legacy, arcade: data,
    bestClassicScore: Math.max(legacy.bestClassicScore, best("marathon")),
    bestPentixScore: Math.max(legacy.bestPentixScore, best("pentix")),
  }));
}

export function recordRun(state: GameState): RunRecord {
  return {
    id: crypto.randomUUID(), mode: state.challenge, score: state.score, lines: state.linesCleared,
    elapsedMs: state.elapsedMs, pieces: state.piecesPlaced, complete: state.outcome === "complete",
    date: new Date().toISOString(), dailyDate: state.dailyDate,
  };
}

export function retainRecords(records: RunRecord[]): RunRecord[] {
  const bests = MODES.flatMap(mode => {
    let candidates = records.filter(record => record.mode === mode.id);
    if (mode.id === "daily") {
      const latestDate = candidates.reduce((date, record) => record.dailyDate && record.dailyDate > date ? record.dailyDate : date, "");
      candidates = candidates.filter(record => record.dailyDate === latestDate);
    }
    if (mode.id === "sprint" || mode.id === "daily") {
      return candidates.filter(record => record.complete).sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, 1);
    }
    return candidates.sort((a, b) => b.score - a.score).slice(0, 1);
  });
  return [...new Map([...bests, ...records].map(record => [record.id, record])).values()].slice(0, 100);
}
