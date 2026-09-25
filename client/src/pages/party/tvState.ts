export interface TvHandCricketChase {
  target: number;
  runs: number;
  ballsRemaining: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getHandCricketChase(state: Record<string, unknown>): TvHandCricketChase | null {
  if (state.phase !== "innings2" || !isRecord(state.innings1) || !isRecord(state.innings2)) {
    return null;
  }

  const firstInningsRuns = state.innings1.runs;
  const secondInningsRuns = state.innings2.runs;
  const balls = state.innings2.balls;
  const overs = state.innings2.overs;

  if (
    typeof firstInningsRuns !== "number" ||
    typeof secondInningsRuns !== "number" ||
    typeof balls !== "number" ||
    typeof overs !== "number"
  ) {
    return null;
  }

  return {
    target: firstInningsRuns + 1,
    runs: secondInningsRuns,
    ballsRemaining: Math.max(0, overs * 6 - balls),
  };
}

export function getLatestSnlEventKind(state: Record<string, unknown>): string | null {
  if (!Array.isArray(state.recentEvents) || state.recentEvents.length === 0) {
    return null;
  }

  const latestEvent = state.recentEvents[state.recentEvents.length - 1];
  return isRecord(latestEvent) && typeof latestEvent.kind === "string" ? latestEvent.kind : null;
}

export function getLatestSnlEventKey(state: Record<string, unknown>): string | null {
  if (!Array.isArray(state.recentEvents) || state.recentEvents.length === 0) {
    return null;
  }

  const latestEvent = state.recentEvents[state.recentEvents.length - 1];
  if (!isRecord(latestEvent) || typeof latestEvent.kind !== "string") return null;

  return `${latestEvent.kind}:${typeof latestEvent.ts === "number" ? latestEvent.ts : "unknown"}`;
}

export interface TvHandCricketBall {
  key: string;
  runs: number;
  isWicket: boolean;
}

export function getLatestHandCricketBall(state: Record<string, unknown>): TvHandCricketBall | null {
  const inningsKey = state.phase === "innings2" ? "innings2" : "innings1";
  if (!isRecord(state[inningsKey]) || !Array.isArray(state[inningsKey].history)) return null;

  const history = state[inningsKey].history;
  const latestBall = history[history.length - 1];
  if (!isRecord(latestBall) || typeof latestBall.runs !== "number" || typeof latestBall.wicket !== "boolean") {
    return null;
  }

  const ballNumber = typeof latestBall.ballNumber === "number" ? latestBall.ballNumber : history.length;
  return {
    key: `${inningsKey}:${ballNumber}`,
    runs: latestBall.runs,
    isWicket: latestBall.wicket,
  };
}