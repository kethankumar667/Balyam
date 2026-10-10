import { describe, it, expect } from "vitest";
import type { Player, RpsChoice } from "@shared/types.js";
import { RpsEngine } from "../RpsEngine.js";
import { chooseRpsMove, predictOpponent, type RpsRoundView } from "../rpsStrategy.js";

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

const C: RpsChoice[] = ["rock", "paper", "scissors"];
const BEATS: Record<RpsChoice, RpsChoice> = { rock: "paper", paper: "scissors", scissors: "rock" }; // key -> what beats it
const wins = (a: RpsChoice, b: RpsChoice): boolean => BEATS[b] === a;

/** A human with a habit. Given the rounds so far (their view: mine = their throw), returns their next throw. */
type Human = (past: RpsRoundView[], random: () => number) => RpsChoice;

const humans: Record<string, Human> = {
  "always rock": () => "rock",
  "cycles rock-paper-scissors": (past) => C[past.length % 3],
  "favours rock (60%)": (_p, r) => (r() < 0.6 ? "rock" : C[Math.floor(r() * 3)]),
  "repeats a win, answers the bot's last throw after a loss": (past, r) => {
    const last = past[past.length - 1];
    if (!last) return C[Math.floor(r() * 3)];
    if (wins(last.mine, last.theirs)) return last.mine;
    return BEATS[last.theirs];
  },
  "plays what beats the bot's last throw": (past, r) => {
    const last = past[past.length - 1];
    return last ? BEATS[last.theirs] : C[Math.floor(r() * 3)];
  },
};

/** Net win rate of the bot over `rounds` against a human: (bot wins - human wins) / rounds. */
function netRate(human: Human, rounds: number, seed: number): number {
  const random = mulberry32(seed);
  const botView: RpsRoundView[] = [];
  const humanView: RpsRoundView[] = [];
  let net = 0;
  for (let i = 0; i < rounds; i++) {
    const bot = chooseRpsMove(botView, random);
    const them = human(humanView, random);
    if (wins(bot, them)) net += 1;
    else if (wins(them, bot)) net -= 1;
    botView.push({ mine: bot, theirs: them });
    humanView.push({ mine: them, theirs: bot });
  }
  return net / rounds;
}

describe("RPS bot", () => {
  it("throws something legal with no history at all", () => {
    expect(C).toContain(chooseRpsMove([], mulberry32(1)));
  });

  it("learns a repeater from a handful of rounds", () => {
    const history: RpsRoundView[] = Array.from({ length: 6 }, () => ({ mine: "rock", theirs: "rock" }));
    const guess = predictOpponent(history);

    expect(guess[0]).toBeGreaterThan(0.6);
  });

  it("never reads the opponent's current throw: its inputs are past rounds and a random source only", () => {
    expect(chooseRpsMove.length).toBeLessThanOrEqual(2);
  });

  it.each(Object.entries(humans))("beats a human who %s", (_name, human) => {
    const rate = netRate(human, 300, 11);

    expect(rate).toBeGreaterThan(0.25);
  });

  it("cannot be beaten by, and cannot beat, a perfectly random player", () => {
    const rates = [21, 22, 23, 24].map((seed) => netRate((_p, r) => C[Math.floor(r() * 3)], 600, seed));
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;

    console.info(`[rps vs random] net rate per seed: ${rates.map((x) => x.toFixed(3)).join(", ")} (mean ${mean.toFixed(3)})`);
    expect(Math.abs(mean)).toBeLessThan(0.08);
  });

  it("is quick enough to run on every round", () => {
    const history: RpsRoundView[] = Array.from({ length: 200 }, (_, i) => ({ mine: C[i % 3], theirs: C[(i * 7) % 3] }));
    const started = Date.now();
    for (let i = 0; i < 200; i++) chooseRpsMove(history, mulberry32(i));

    expect((Date.now() - started) / 200).toBeLessThan(5);
  });
});

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

describe("RPS engine with the learning bot", () => {
  it("wins a first-to-10 match against a repeater far more often than not", () => {
    let botWins = 0;
    const matches = 40;
    for (let m = 0; m < matches; m++) {
      const engine = new RpsEngine();
      engine.init([seat("bot"), seat("human")]);
      for (let round = 0; round < 200 && !engine.isOver(); round++) {
        engine.applyMove({ playerId: "human", type: "choose", data: { choice: "rock" } });
        engine.applyAutoMove("bot");
      }
      if ((engine.getPublicState() as { winnerId: string | null }).winnerId === "bot") botWins += 1;
    }

    expect(botWins).toBeGreaterThan(matches * 0.9);
  });
});
