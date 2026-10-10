import { describe, it, expect } from "vitest";
import type { UnoCard, UnoColor, UnoRank } from "@shared/types.js";
import { UnoEngine } from "../UnoEngine.js";
import { bestColor, chooseUnoCard, type UnoBotView } from "../unoStrategy.js";

let counter = 0;
const card = (color: UnoColor | null, rank: UnoRank): UnoCard => ({ id: `c${String(++counter).padStart(3, "0")}`, color, rank });

/** A view where every card in `hand` that fits the current colour (or is a Wild) is playable. */
function view(hand: UnoCard[], currentColor: UnoColor | null, nextOpponentHandSize = 7, top: { color: UnoColor | null; rank: UnoRank } = { color: currentColor, rank: "5" }): UnoBotView {
  const playable = hand.filter((c) => c.color === null || c.color === currentColor || c.rank === top.rank);
  return { hand, playable, currentColor, nextOpponentHandSize };
}

describe("UNO bot strategy", () => {
  it("has nothing to choose when nothing is playable", () => {
    const hand = [card("B", "3"), card("G", "7")];

    expect(chooseUnoCard(view(hand, "R"))).toBeNull();
  });

  it("keeps a Wild in reserve while a coloured card will do", () => {
    const wild = card(null, "Wild");
    const red = card("R", "4");
    const hand = [wild, red, card("B", "2")];

    const choice = chooseUnoCard(view(hand, "R"));

    expect(choice?.card.id).toBe(red.id);
  });

  it("plays the heavier card first, because that is the penalty if someone else goes out", () => {
    const heavy = card("R", "9");
    const light = card("R", "1");
    const hand = [light, heavy, card("B", "5")];

    expect(chooseUnoCard(view(hand, "R"))?.card.id).toBe(heavy.id);
  });

  it("hits the player who is about to win with a +2 rather than saving it", () => {
    const plusTwo = card("R", "+2");
    const number = card("R", "8");
    const hand = [number, plusTwo, card("G", "1")];

    expect(chooseUnoCard(view(hand, "R", 2))?.card.id).toBe(plusTwo.id);
  });

  it("spends a Wild when the next player is one card from winning and it is the best way to stop them", () => {
    const wild = card(null, "Wild");
    const low = card("R", "0");
    const hand = [wild, low, card("G", "4"), card("B", "6")];

    const calm = chooseUnoCard(view(hand, "R", 7));
    const threatened = chooseUnoCard(view(hand, "R", 1));

    expect(calm?.card.id).toBe(low.id);
    expect(threatened?.card.id).toBe(wild.id);
  });

  it("calls the colour it holds the most of when it plays a Wild", () => {
    const wild = card(null, "Wild");
    const hand = [wild, card("G", "1"), card("G", "2"), card("G", "3"), card("R", "9")];

    // Only the Wild is playable on blue.
    const choice = chooseUnoCard({ hand, playable: [wild], currentColor: "B", nextOpponentHandSize: 5 });

    expect(choice?.card.id).toBe(wild.id);
    expect(choice?.color).toBe("G");
  });

  it("never bluffs a Wild Draw Four while it holds a card of the current colour", () => {
    const plusFour = card(null, "Wild+4");
    const red = card("R", "2");
    const hand = [plusFour, red, card("B", "1")];

    const choice = chooseUnoCard(view(hand, "R", 2));

    expect(choice?.card.id).toBe(red.id);
  });

  it("does play a legal Wild Draw Four when it is the only thing it can do", () => {
    const plusFour = card(null, "Wild+4");
    const hand = [plusFour, card("B", "1")];

    const choice = chooseUnoCard({ hand, playable: [plusFour], currentColor: "R", nextOpponentHandSize: 5 });

    expect(choice?.card.id).toBe(plusFour.id);
  });

  it("goes out when it can, whatever else is attractive", () => {
    const last = card("R", "1");
    const choice = chooseUnoCard({ hand: [last], playable: [last], currentColor: "R", nextOpponentHandSize: 7 });

    expect(choice?.card.id).toBe(last.id);
  });

  it("is deterministic: the same situation always gives the same card", () => {
    const hand = [card("R", "4"), card("R", "4"), card("G", "4"), card("B", "7")];

    const a = chooseUnoCard(view(hand, "R"));
    const b = chooseUnoCard(view(hand, "R"));

    expect(a?.card.id).toBe(b?.card.id);
  });

  it("bestColor falls back to red for a hand with no colour at all", () => {
    expect(bestColor([card(null, "Wild")])).toBe("R");
  });
});

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

/** The few private members the old bot reached into, and the state it read. Cast through `unknown`, because they are private. */
interface UnoInternals {
  isPlayableNow(card: UnoCard, top: UnoCard, color: UnoColor | null): boolean;
  pickColorForHand(hand: UnoCard[]): UnoColor;
  canDeclareUno(id: string): boolean;
  state: { hands: Record<string, UnoCard[]>; discard: UnoCard[]; currentColor: UnoColor | null; pendingChallenge: { challengerId: string } | null; drewLastTurn: boolean; winnerId: string | null };
}

/** The bot as it was before: play the FIRST legal card, draw when there is none. Kept here as the opponent to beat. */
function legacyMove(game: UnoEngine, id: string): void {
  const engine = game as unknown as UnoInternals;
  const s = engine.state;
  if (s.pendingChallenge && s.pendingChallenge.challengerId === id) {
    game.applyMove({ playerId: id, type: "acceptDraw" });
    return;
  }
  if (engine.canDeclareUno(id)) {
    game.applyMove({ playerId: id, type: "declareUno" });
    return;
  }
  const hand = s.hands[id];
  const top = s.discard[s.discard.length - 1];
  const first = hand.find((c) => engine.isPlayableNow(c, top, s.currentColor));
  if (first) {
    const wild = first.rank === "Wild" || first.rank === "Wild+4";
    game.applyMove({ playerId: id, type: "play", data: { cardId: first.id, color: wild ? engine.pickColorForHand(hand) : undefined } });
    return;
  }
  const drew = game.applyMove({ playerId: id, type: "draw" });
  if (drew.ok && s.drewLastTurn) game.applyMove({ playerId: id, type: "pass" });
}

function playOne(seed: number, smartFirst: boolean): "smart" | "legacy" | "stalled" {
  const engine = new UnoEngine();
  engine.setRng(mulberry32(seed));
  const ids = smartFirst ? ["smart", "legacy"] : ["legacy", "smart"];
  engine.init(ids.map((id) => ({ id, name: id, isReady: true, isConnected: true })) as never);

  for (let step = 0; step < 3_000; step++) {
    if (engine.isOver()) return (engine as unknown as UnoInternals).state.winnerId === "smart" ? "smart" : "legacy";
    const actor = engine.getTimeoutActor();
    if (!actor) return "stalled";
    if (actor === "smart") engine.applyAutoMove(actor);
    else legacyMove(engine, actor);
  }
  return "stalled";
}

describe("UNO bot tournament: the new strategy against the old first-legal-card bot", () => {
  it("wins clearly more often than it loses, whoever sits first", () => {
    const games = 600;
    let smart = 0;
    let legacy = 0;
    for (let i = 0; i < games; i++) {
      const outcome = playOne(1_000 + i, i % 2 === 0);
      if (outcome === "smart") smart += 1;
      else if (outcome === "legacy") legacy += 1;
    }

    const decided = smart + legacy;
    const rate = smart / decided;
    console.info(`[uno tournament] new bot won ${smart} of ${decided} (${(rate * 100).toFixed(1)}%) against the old bot`);
    // Played to a conclusion, nearly every time.
    expect(decided).toBeGreaterThan(games * 0.98);
    // UNO is largely luck, so the edge is modest; what matters is that it is real and far from a coin flip.
    expect(rate, `new bot won ${smart} of ${decided} (${(rate * 100).toFixed(1)}%)`).toBeGreaterThan(0.56);
  });
});
