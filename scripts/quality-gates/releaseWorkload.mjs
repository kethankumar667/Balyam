export const JOURNEY_STEPS = [
  "identity", "roomCreation", "roomJoin", "chat", "modal",
  "gameArena", "gameFinished", "recovery", "cleanup",
];

export function evaluateBrowserJourney(flows, errors) {
  return JOURNEY_STEPS.every((step) => flows[step] === true) && errors.length === 0;
}

export function parseSoakOptions(args) {
  let durationSeconds = 3600;
  const seen = new Set();
  for (const argument of args) {
    const match = /^--duration-seconds=(\d+)$/.exec(argument);
    if (!match || seen.has("duration")) throw new Error(`Invalid/duplicate soak option: ${argument}`);
    seen.add("duration");
    durationSeconds = Number(match[1]);
    if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 86400) {
      throw new Error("Soak duration must be an integer between 1 and 86400 seconds.");
    }
  }
  return { durationSeconds, pauseMs: 2500 };
}

export function evaluateSoakRun(run) {
  const failures = [...run.errors];
  for (const key of ["completedCycles", "totalEventsProcessed", "totalRoomsCreated",
    "totalSocketsConnected", "observedMoves", "settlementChecks", "recoveryChecks"]) {
    if (!Number.isSafeInteger(run[key]) || run[key] < 1) failures.push(`${key} was not observed.`);
  }
  for (const key of ["duplicateEventsDetected", "residualRooms", "residualSockets"]) {
    if (run[key] !== 0) failures.push(`${key} must be zero, received ${run[key]}.`);
  }
  if (!Number.isFinite(run.heapGrowthMb) || run.heapGrowthMb > 50) failures.push("Post-cleanup heap growth exceeds 50 MiB or was not measured.");
  if (!Number.isFinite(run.maxWorkGapSeconds) || run.maxWorkGapSeconds < 0 || run.maxWorkGapSeconds > 60) failures.push("Workload stalled for more than 60 seconds or continuity was not measured.");
  if (!Number.isSafeInteger(run.requestedDurationSeconds) || run.requestedDurationSeconds < 1 ||
    !Number.isFinite(run.durationSeconds) || run.durationSeconds < run.requestedDurationSeconds) failures.push("Requested active workload duration was not completed.");
  if (run.settlementChecks !== run.completedCycles || run.recoveryChecks !== run.completedCycles) failures.push("Every completed cycle must verify settlement and recovery.");
  if (run.totalRoomsCreated !== run.completedCycles || run.totalSocketsConnected < run.completedCycles * 3 ||
    run.observedMoves < run.completedCycles * 5 || run.totalEventsProcessed < run.observedMoves + run.completedCycles) failures.push("Observed counters do not cover every completed cycle.");
  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    releaseEligible: failures.length === 0 && run.durationSeconds >= 3600,
    failures,
  };
}
