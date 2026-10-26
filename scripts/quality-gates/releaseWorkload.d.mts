export const JOURNEY_STEPS: string[];
export function evaluateBrowserJourney(flows: Record<string, unknown>, errors: string[]): boolean;
export function parseSoakOptions(args: string[]): { durationSeconds: number; pauseMs: number };
export interface MeasuredSoak {
  durationSeconds: number; requestedDurationSeconds: number; completedCycles: number;
  totalEventsProcessed: number; totalRoomsCreated: number; totalSocketsConnected: number;
  duplicateEventsDetected: number; residualRooms: number; residualSockets: number;
  heapGrowthMb: number; maxWorkGapSeconds: number; settlementChecks: number;
  recoveryChecks: number; observedMoves: number; errors: string[];
}
export function evaluateSoakRun(run: MeasuredSoak): { status: string; releaseEligible: boolean; failures: string[] };
