import { type ArcadeState, type Mode } from "./rules";

export const SAVE_KEY = "bhalyam_brick_breakout_v1";
export interface RunRecord { mode: Mode; date: string; score: number; level: number; combo: number; bricks: number }
export interface ArcadeSave { version: 1; records: RunRecord[]; sound: boolean; effects: boolean; legacyBest: number }
export const defaultSave = (): ArcadeSave => ({ version: 1, records: [], sound: true, effects: true, legacyBest: 0 });
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const mode = (value: unknown): value is Mode => value === "campaign" || value === "score-attack" || value === "daily";
function validRecord(value: unknown): value is RunRecord {
  return object(value) && mode(value.mode) && typeof value.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    nonnegative(value.score) && nonnegative(value.level) && nonnegative(value.combo) && nonnegative(value.bricks);
}
function retain(records: RunRecord[]): RunRecord[] {
  const permanent = records.filter(r => r.mode !== "daily");
  const daily = records.filter(r => r.mode === "daily").sort((a, b) => b.date.localeCompare(a.date));
  const recent = daily.slice(0, 60);
  const best = daily.reduce<RunRecord | undefined>((prior, record) => !prior || record.score > prior.score ? record : prior, undefined);
  if (best && !recent.includes(best)) recent.push(best);
  return [...permanent, ...recent];
}
function readRaw(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return {};
  const parsed: unknown = JSON.parse(raw);
  if (!object(parsed)) throw new Error("The existing Breakout save is not an object.");
  return parsed;
}
export function loadArcade(): ArcadeSave {
  const raw = readRaw();
  const legacyBest = nonnegative(raw.highScore) ? raw.highScore : 0;
  const sound = typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : true;
  if (raw.arcade === undefined) return { ...defaultSave(), legacyBest, sound };
  const arcade = raw.arcade;
  if (!object(arcade) || arcade.version !== 1 || !Array.isArray(arcade.records) ||
    !arcade.records.every(validRecord) || typeof arcade.sound !== "boolean" || typeof arcade.effects !== "boolean") {
    throw new Error("The arcade save could not be validated. Your existing data has not been overwritten.");
  }
  return { version: 1, records: retain(arcade.records), sound: arcade.sound, effects: arcade.effects, legacyBest };
}
export function saveArcade(data: ArcadeSave): void {
  const raw = readRaw();
  const { legacyBest: _legacy, ...arcade } = data;
  window.localStorage.setItem(SAVE_KEY, JSON.stringify({ ...raw, arcade }));
}
export function recordRun(data: ArcadeSave, state: ArcadeState): ArcadeSave {
  if (state.status !== "finished" || !nonnegative(state.score)) return data;
  const keyMatches = (r: RunRecord) => r.mode === state.mode && (state.mode !== "daily" || r.date === state.date);
  const prior = data.records.find(keyMatches);
  if (prior && prior.score >= state.score) return data;
  const record: RunRecord = { mode: state.mode, date: state.date, score: state.score, level: state.level, combo: state.bestCombo, bricks: state.destroyed };
  return { ...data, records: retain([record, ...data.records.filter(r => !keyMatches(r))]) };
}
export function bestFor(data: ArcadeSave, mode: Mode, date?: string): number {
  return data.records.reduce((best, r) => r.mode === mode && (date === undefined || r.date === date) ? Math.max(best, r.score) : best, 0);
}
