import { rummyRoundPoints } from "@shared/rummyScoring.js";

interface ParticipantRecord {
  score?: number;
  secondaryMetrics?: Record<string, number | string>;
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function cricketRecordScore(state: Record<string, unknown>, playerId: string): ParticipantRecord {
  const innings = [object(state.innings1), object(state.innings2)]
    .filter((entry) => entry.battingPlayerId === playerId && typeof entry.runs === "number" && number(entry.balls) > 0)
    .sort((a, b) => number(b.runs) - number(a.runs))[0];
  if (!innings) return {};
  const batters = Object.values(object(innings.batterStats)).map(object);
  const runs = number(innings.runs);
  const balls = number(innings.balls);
  return { score: runs, secondaryMetrics: {
    balls, strikeRate: Math.round(runs / balls * 100),
    fours: batters.reduce((total, batter) => total + number(batter.fours), 0),
    sixes: batters.reduce((total, batter) => total + number(batter.sixes), 0),
  } };
}

export function rummyRecordScore(state: Record<string, unknown>, playerId: string): ParticipantRecord {
  const pool = state.matchMode === "pool101" || state.matchMode === "pool201";
  if (state.phase !== "finished" || state.invalidDeclareBy || state.endedByDisconnect ||
    (pool && state.matchOver !== true) || state.winnerId !== playerId ||
    (pool && state.matchWinnerId !== playerId)) return {};
  const scores = object(state.scores);
  const playerOrder: unknown[] = Array.isArray(state.playerOrder) ? state.playerOrder : [];
  const points = rummyRoundPoints({
    winnerId: playerId,
    playerOrder: playerOrder.filter((id): id is string => typeof id === "string"),
    scores: Object.fromEntries(Object.entries(scores).map(([id, penalty]) => [id, number(penalty)])),
  }, playerId);
  return points > 0 ? { score: points, secondaryMetrics: { winningPoints: points, dealsWon: 1 } } : {};
}
