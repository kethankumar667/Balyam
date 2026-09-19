import { GAME_MODE_REGISTRY } from "@shared/profile/GameModes.js";

/** Nothing legitimate scores past a billion; this only stops absurd values. */
export const MAX_RECORDABLE_SCORE = 1_000_000_000;

export type ScoreValidation = { ok: true } | { ok: false; error: string };

const ID_PATTERN = /^[A-Za-z0-9_]{1,40}$/;
const METRIC_KEY_PATTERN = /^[A-Za-z0-9_]{1,40}$/;
const MAX_METRIC_KEYS = 16;
const MAX_METRIC_STRING = 80;
const MAX_MATCH_ID = 100;
const RADAR_AXES: ReadonlySet<string> = new Set(["velocity", "clutch", "efficiency", "consistency", "aggression"]);
const CONTEXTS: ReadonlySet<string> = new Set(["SOLO", "VS_BOTS", "PVP_MULTIPLAYER", "PASS_AND_PLAY"]);

const fail = (error: string): ScoreValidation => ({ ok: false, error });

/**
 * `game` and `modeId` end up as keys on plain objects (`GAME_MODE_REGISTRY[game]`,
 * `archive.games[game]`, `game.modes[modeId]`). A name such as `constructor` or
 * `__proto__` is *inherited*, so a lookup returns the `Object` function instead
 * of `undefined` and the code below it misbehaves (a TypeError, or a scorecard
 * stored with no `bestScore`). Refuse every name Object.prototype already owns.
 */
const isReservedName = (name: string): boolean => name in Object.prototype;

function validateMetrics(value: unknown): ScoreValidation {
  if (value === undefined) return { ok: true };
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fail("Invalid secondaryMetrics");
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_METRIC_KEYS) return fail("Too many secondaryMetrics");
  for (const [key, v] of entries) {
    if (!METRIC_KEY_PATTERN.test(key) || isReservedName(key)) return fail("Invalid secondaryMetrics key");
    const isNumber = typeof v === "number" && Number.isFinite(v);
    const isShortString = typeof v === "string" && v.length <= MAX_METRIC_STRING;
    if (!isNumber && !isShortString) return fail("Invalid secondaryMetrics value");
  }
  return { ok: true };
}

function validateRadar(value: unknown): ScoreValidation {
  if (value === undefined) return { ok: true };
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fail("Invalid radarMetrics");
  for (const [axis, v] of Object.entries(value as Record<string, unknown>)) {
    if (!RADAR_AXES.has(axis)) return fail("Invalid radarMetrics axis");
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) return fail("Invalid radarMetrics value");
  }
  return { ok: true };
}

/**
 * Validates a score the CLIENT reported for a solo game.
 *
 * Solo and arcade titles are computed in the browser, so the server cannot
 * re-derive the result — but it can refuse values no real play could produce.
 * Before this, `score: 0` (or `-1`) was stored as a lower-is-better personal
 * best that no honest player could ever beat.
 *
 * What it cannot do: a determined cheater can still post a value just inside
 * the plausible range. That residual risk is inherent to a client-computed
 * result and is acceptable for a cosmetic leaderboard — it would not be if
 * coins or prizes were ever attached to rank.
 *
 * Unknown game/mode pairs are still accepted unless the game opts in to
 * `strictModes`: the recorder has always created a fallback scorecard for
 * them, and rejecting would silently break titles this file has not heard of.
 */
export function validateRecordScorePayload(body: unknown): ScoreValidation {
  const b = body !== null && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!b || !b.game || !b.modeId || typeof b.score !== "number") {
    return fail("Missing game, modeId, or numeric score");
  }
  const { game, modeId, score } = b;
  if (typeof game !== "string" || typeof modeId !== "string") {
    return fail("Missing game, modeId, or numeric score");
  }
  if (!ID_PATTERN.test(game) || !ID_PATTERN.test(modeId) || isReservedName(game) || isReservedName(modeId)) {
    return fail("Invalid game or modeId");
  }
  if (!Number.isFinite(score) || score < 0 || score > MAX_RECORDABLE_SCORE) {
    return fail("Score out of range");
  }

  if (b.context !== undefined && (typeof b.context !== "string" || !CONTEXTS.has(b.context))) {
    return fail("Invalid context");
  }
  if (b.matchId !== undefined && (typeof b.matchId !== "string" || b.matchId.length > MAX_MATCH_ID)) {
    return fail("Invalid matchId");
  }
  const metrics = validateMetrics(b.secondaryMetrics);
  if (!metrics.ok) return metrics;
  const radar = validateRadar(b.radarMetrics);
  if (!radar.ok) return radar;

  const config = Object.hasOwn(GAME_MODE_REGISTRY, game) ? GAME_MODE_REGISTRY[game] : undefined;
  if (config?.serverScored) return fail("Scores for this game are recorded by the server");

  const mode = config?.modes.find((m) => m.modeId === modeId);
  if (config?.strictModes && !mode) return fail("Unknown mode for this game");
  if (mode) {
    const belowFloor = mode.minPlausibleScore !== undefined && score < mode.minPlausibleScore;
    const aboveCeiling = mode.maxPlausibleScore !== undefined && score > mode.maxPlausibleScore;
    if (belowFloor || aboveCeiling) return fail("Score out of range for this mode");
  }
  return { ok: true };
}
