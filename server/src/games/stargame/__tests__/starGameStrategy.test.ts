import { describe, it, expect } from "vitest";
import type { Player, StarCard, StarPlayerView } from "@shared/types.js";
import { STAR_THEMES } from "@shared/star-themes.js";
import { StarGameEngine } from "../StarGameEngine.js";
import { chooseStarPass } from "../starGameStrategy.js";

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

const card = (id: string, value: string): StarCard => ({ id, value });

describe("Star Game pass strategy", () => {
  it("passes nothing from an empty hand", () => {
    expect(chooseStarPass({ hand: [], justReceivedId: null, random: mulberry32(1) })).toBeNull();
  });

  it("keeps its biggest group and sends a stray", () => {
    const hand = [card("a1", "red"), card("a2", "red"), card("a3", "red"), card("b1", "blue"), card("c1", "green")];

    for (let seed = 0; seed < 40; seed++) {
      const sent = chooseStarPass({ hand, justReceivedId: null, random: mulberry32(seed) });
      expect(["b1", "c1"]).toContain(sent);
    }
  });

  it("with two pairs and a stray, sends the stray, not half a pair", () => {
    const hand = [card("a1", "red"), card("a2", "red"), card("b1", "blue"), card("b2", "blue"), card("c1", "green")];

    for (let seed = 0; seed < 40; seed++) {
      expect(chooseStarPass({ hand, justReceivedId: "c1", random: mulberry32(seed) })).toBe("c1");
    }
  });

  it("does not always favour the same pair when it holds two equal ones", () => {
    const pairs = [card("a1", "red"), card("a2", "red"), card("b1", "blue"), card("b2", "blue")];
    const sentFromRed = new Set<boolean>();
    for (let seed = 0; seed < 60; seed++) {
      const sent = chooseStarPass({ hand: pairs, justReceivedId: null, random: mulberry32(seed) });
      sentFromRed.add(sent!.startsWith("a"));
    }

    expect(sentFromRed.size).toBe(2);
  });

  it("prefers not to send back the chit it was just handed when another is as poor", () => {
    const hand = [card("a1", "red"), card("a2", "red"), card("a3", "red"), card("b1", "blue"), card("c1", "green")];

    for (let seed = 0; seed < 40; seed++) {
      expect(chooseStarPass({ hand, justReceivedId: "b1", random: mulberry32(seed) })).toBe("c1");
    }
  });

  it("gives up a chit from a hand that is already four of a kind", () => {
    const hand = [card("a1", "red"), card("a2", "red"), card("a3", "red"), card("a4", "red")];

    expect(["a1", "a2", "a3", "a4"]).toContain(chooseStarPass({ hand, justReceivedId: null, random: mulberry32(1) }));
  });
});

const COLORS = STAR_THEMES[0].values;

function newGame(seats: string[], seed: number): StarGameEngine {
  const e = new StarGameEngine();
  e.setRng(mulberry32(seed));
  e.setOptions({ themeId: "colors", totalRounds: 1, passSpeed: "normal" });
  e.init(seats.map((id, i) => ({ id, name: id, isHost: i === 0, isReady: true, isConnected: true, isBot: true }) as Player));
  seats.forEach((id, i) => e.applyMove({ playerId: id, type: "selectValue", data: { value: COLORS[i] } }));
  e.applyMove({ playerId: e.getPublicState().starterId!, type: "shuffle" });
  if (e.getPublicState().phase === "deal") e.resolveDeadline();
  return e;
}

const handOf = (e: StarGameEngine, pid: string): StarCard[] => (e.getStateFor(pid) as StarPlayerView).myHand ?? [];

/** The old bot: a random chit from the hand. Kept here as the opponent to beat. */
function legacyPass(e: StarGameEngine, pid: string, random: () => number): void {
  const hand = handOf(e, pid);
  const pick = hand[Math.floor(random() * hand.length)];
  e.applyMove({ playerId: pid, type: "selectCard", data: { cardId: pick.id } });
  e.applyMove({ playerId: pid, type: "pass" });
}

/** Plays the pass phase until someone holds four of a kind. Returns who is eligible to press STAR and how many passes it took. */
function race(seats: string[], smart: Set<string>, seed: number): { eligible: string[]; passes: number } {
  const e = newGame(seats, seed);
  const random = mulberry32(seed ^ 0x51ed);
  let passes = 0;
  for (let step = 0; step < 4_000 && e.getPublicState().phase === "pass"; step++) {
    const actor = e.pendingActors()[0];
    if (!actor) break;
    if (smart.has(actor)) e.applyAutoMove(actor);
    else legacyPass(e, actor, random);
    passes += 1;
  }
  return { eligible: e.getPublicState().phase === "star" ? e.pendingActors() : [], passes };
}

describe("Star Game race: the new bot against the old random passer", () => {
  it("is eligible for STAR clearly more often than a fair share (one new bot, three old ones)", () => {
    const rounds = 400;
    const seats = ["a", "b", "c", "d"];
    let share = 0;
    let counted = 0;
    for (let i = 0; i < rounds; i++) {
      const newSeat = seats[i % 4];
      const { eligible } = race(seats, new Set([newSeat]), 700 + i);
      if (eligible.length === 0) continue;
      counted += 1;
      if (eligible.includes(newSeat)) share += 1 / eligible.length;
    }

    const rate = share / counted;
    console.info(`[star game] new bot was first to four-of-a-kind in ${(rate * 100).toFixed(1)}% of ${counted} rounds (fair share 25%)`);
    expect(rate).toBeGreaterThan(0.3);
  }, 120_000);

  it("a table of new bots still finishes rounds, so no chit orbits forever", () => {
    const seats = ["a", "b", "c", "d"];
    let finished = 0;
    let totalPasses = 0;
    const rounds = 60;
    for (let i = 0; i < rounds; i++) {
      const { eligible, passes } = race(seats, new Set(seats), 900 + i);
      if (eligible.length > 0) finished += 1;
      totalPasses += passes;
    }

    console.info(`[star game] all-new table: ${finished}/${rounds} rounds reached four of a kind, ${(totalPasses / rounds).toFixed(0)} passes on average`);
    expect(finished).toBe(rounds);
  }, 120_000);
});
