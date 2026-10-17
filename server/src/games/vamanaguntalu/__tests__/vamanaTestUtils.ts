import type { MoveResult } from "../../GameEngine.js";
import type { Player, VamanaOptions } from "@shared/types.js";
import { VAMANA_PIT_COUNT } from "@shared/types.js";
import { VamanaEngine, type VamanaPosition } from "../VamanaEngine.js";

/** A 14-pit board from a sparse description; every pit not listed is empty. */
export const board = (seeds: Record<number, number>): number[] =>
  Array.from({ length: VAMANA_PIT_COUNT }, (_, pit) => seeds[pit] ?? 0);

export function makePlayers(flags: { p1Bot?: boolean; p2Bot?: boolean } = {}): [Player, Player] {
  return [
    { id: "p1", name: "Player 1", isHost: true, isReady: true, isConnected: true, isBot: flags.p1Bot === true },
    { id: "p2", name: "Player 2", isHost: false, isReady: true, isConnected: true, isBot: flags.p2Bot === true },
  ];
}

/** Small, fast, seedable PRNG so bot and tie-break behaviour is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestClock {
  now: () => number;
  advance: (ms: number) => void;
}

export function makeClock(start = 1_000_000): TestClock {
  let t = start;
  return { now: () => t, advance: (ms) => void (t += ms) };
}

export interface EngineFixture {
  engine: VamanaEngine;
  players: [Player, Player];
  clock: TestClock;
}

export function newEngine(
  args: {
    options?: Partial<VamanaOptions>;
    seed?: number;
    flags?: { p1Bot?: boolean; p2Bot?: boolean };
    position?: VamanaPosition;
  } = {},
): EngineFixture {
  const clock = makeClock();
  const engine = new VamanaEngine({ now: clock.now, random: mulberry32(args.seed ?? 1), position: args.position });
  if (args.options) engine.setOptions(args.options);
  const players = makePlayers(args.flags);
  engine.init(players);
  return { engine, players, clock };
}

export type GameOutcome = "first" | "second" | "draw";

/**
 * Finds, by seeded random self-play, a complete legal game that ends in the wanted way, and returns its
 * pits in order (the seats alternate, p1 first). It lets room-level tests play a real game end to end
 * without hand-writing 40 moves. Throws rather than hanging if nothing turns up.
 */
export function findGame(want: GameOutcome, maxSeeds = 20_000): number[] {
  for (let seed = 1; seed <= maxSeeds; seed++) {
    const { engine } = newEngine({ seed });
    const random = mulberry32(seed * 7_919);
    const pits: number[] = [];
    while (!engine.isOver() && pits.length < 2_000) {
      const state = engine.getPublicState();
      const options = state.pits
        .map((count, pit) => ({ count, pit }))
        .filter(({ count, pit }) => count > 0 && (state.turnPlayerId === "p1" ? pit < 7 : pit >= 7))
        .map(({ pit }) => pit);
      const pit = options[Math.floor(random() * options.length)];
      pits.push(pit);
      engine.applyMove({ playerId: state.turnPlayerId, type: "sow", data: { pit } });
    }
    const end = engine.getPublicState();
    const matches =
      (want === "draw" && end.endReason === "draw") ||
      (want === "first" && end.endReason === "seeds" && end.winnerId === "p1") ||
      (want === "second" && end.endReason === "seeds" && end.winnerId === "p2");
    if (matches) return pits;
  }
  throw new Error(`No ${want} game found within ${maxSeeds} seeds`);
}

/** Sends a sow through the same envelope the socket layer delivers. `pit` is deliberately `unknown`. */
export function sow(engine: VamanaEngine, playerId: string, pit: unknown): MoveResult {
  return engine.applyMove({ playerId, type: "sow", data: { pit } });
}
