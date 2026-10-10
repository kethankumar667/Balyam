import { describe, it, expect } from "vitest";
import type { LudoColor, LudoState, LudoToken, Player } from "@shared/types.js";
import { resolveDestination, safeSquaresFor, trackLengthFor } from "@shared/ludo-rules.js";
import { LudoEngine } from "../LudoEngine.js";
import { chooseLudoToken, type LudoPositionView, type LudoSeatView } from "../ludoStrategy.js";

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

const PLAYERS = 2;

const tok = (color: LudoColor, k: number, state: LudoToken["state"], pos?: number): LudoToken => ({
  id: `${color}-${k}`,
  color,
  state,
  ...(state === "track" ? { trackPos: pos } : state === "stretch" ? { stretchPos: pos } : {}),
});
const yard = (color: LudoColor, from: number, count: number): LudoToken[] =>
  Array.from({ length: count }, (_, i) => tok(color, from + i, "yard"));

/** A 2-player cross board: red starts at square 0, green at 13. Stars (safe squares) are 0, 8, 13, 21, 26, 34, 39, 47. */
function view(over: Partial<LudoPositionView> & { mine: LudoSeatView }): LudoPositionView {
  return {
    playerCount: PLAYERS,
    dice: 3,
    rivals: [],
    movable: over.mine.tokens.filter((t) => t.state !== "home").map((t) => t.id),
    mandatoryCapture: false,
    noSafeSquares: false,
    ...over,
  };
}
const red = (tokens: LudoToken[]): LudoSeatView => ({ arm: "red", tokens, hasCaptured: true });
const green = (tokens: LudoToken[]): LudoSeatView => ({ arm: "green", tokens, hasCaptured: true });

describe("Ludo strategy", () => {
  it("has nothing to choose when nothing can move, and moves the only candidate", () => {
    const mine = red([tok("red", 0, "track", 5), ...yard("red", 1, 3)]);

    expect(chooseLudoToken(view({ mine, movable: [] }))).toBeNull();
    expect(chooseLudoToken(view({ mine, movable: ["red-0"] }))).toBe("red-0");
  });

  it("captures a rival on an unsafe square", () => {
    // red-0 at 6 + 3 lands on 9, where a green token stands and 9 is not a star.
    const mine = red([tok("red", 0, "track", 6), tok("red", 1, "track", 30), ...yard("red", 2, 2)]);
    const rival = green([tok("green", 0, "track", 9), ...yard("green", 1, 3)]);

    expect(chooseLudoToken(view({ mine, rivals: [rival], dice: 3 }))).toBe("red-0");
  });

  it("takes a token home when it can", () => {
    const mine = red([tok("red", 0, "stretch", 3), tok("red", 1, "track", 10), ...yard("red", 2, 2)]);

    expect(chooseLudoToken(view({ mine, dice: 3 }))).toBe("red-0");
  });

  it("does not stack two of its own tokens where one roll takes both", () => {
    // Red at 20 and 24, dice 4. red-0 -> 24 stacks both on a square a green token at 18 hits on a six;
    // red-1 -> 28 keeps them apart (20 is two ahead of green, 28 only reachable after a six).
    const mine = red([tok("red", 0, "track", 20), tok("red", 1, "track", 24), ...yard("red", 2, 2)]);
    const rival = green([tok("green", 0, "track", 18), ...yard("green", 1, 3)]);

    expect(chooseLudoToken(view({ mine, rivals: [rival], dice: 4 }))).toBe("red-1");
  });

  it("runs a token that is about to be hit rather than moving a safe one", () => {
    // Green at 17 is 3 behind red-0 at 20 (a 1-in-6 hit). Moving red-0 four squares to 24 puts it 7 away.
    // Moving red-1 from 30 to the star at 34 would leave red-0 where it is.
    const mine = red([tok("red", 0, "track", 20), tok("red", 1, "track", 30), ...yard("red", 2, 2)]);
    const rival = green([tok("green", 0, "track", 17), ...yard("green", 1, 3)]);

    expect(chooseLudoToken(view({ mine, rivals: [rival], dice: 4 }))).toBe("red-0");
  });

  it("is deterministic: the same position always gives the same token", () => {
    const mine = red([tok("red", 0, "track", 6), tok("red", 1, "track", 30), ...yard("red", 2, 2)]);
    const rival = green([tok("green", 0, "track", 9), ...yard("green", 1, 3)]);
    const v = view({ mine, rivals: [rival], dice: 3 });

    expect(chooseLudoToken(v)).toBe(chooseLudoToken(v));
  });

  it("always answers with one of the movable tokens, in any position (random positions)", () => {
    const random = mulberry32(17);
    const TL = trackLengthFor(PLAYERS);
    for (let trial = 0; trial < 2_000; trial++) {
      const make = (color: LudoColor): LudoToken[] =>
        Array.from({ length: 4 }, (_, k) => {
          const roll = random();
          if (roll < 0.25) return tok(color, k, "yard");
          if (roll < 0.85) return tok(color, k, "track", Math.floor(random() * TL));
          if (roll < 0.95) return tok(color, k, "stretch", Math.floor(random() * 5));
          return tok(color, k, "home");
        });
      const mine = red(make("red"));
      const rival = green(make("green"));
      const dice = 1 + Math.floor(random() * 6);
      const ctx = { color: "red" as LudoColor, playerCount: PLAYERS, mandatoryCapture: false, hasCaptured: true };
      const movable = mine.tokens.filter((t) => t.state !== "home" && resolveDestination(t, dice, ctx) !== null).map((t) => t.id);

      const pick = chooseLudoToken(view({ mine, rivals: [rival], dice, movable }));

      if (movable.length === 0) expect(pick).toBeNull();
      else expect(movable).toContain(pick);
    }
  });
});

/* ── Tournament against the old scorer ─────────────────────────────── */

const seat = (id: string): Player => ({ id, name: id, isHost: false, isReady: true, isConnected: true, isBot: true }) as unknown as Player;

/** The bot as it was: danger as a head count, a bonus for stacking, small progress terms. Kept here as the opponent to beat. */
function legacyChoose(state: LudoState, pid: string): string | null {
  const movable = state.movableTokenIds;
  if (movable.length === 0) return null;
  const count = state.playerOrder.length;
  const length = trackLengthFor(count);
  const arm = state.playerArms[pid];
  const dice = state.diceValue ?? 0;
  const list = state.tokens[pid];
  const colors = state.playerOrder.map((p) => state.playerArms[p]);
  const safe = safeSquaresFor(colors, count);
  const ctx = { color: arm, playerCount: count, mandatoryCapture: state.options.mandatoryCapture, hasCaptured: state.hasCaptured[pid] };
  const inYard = list.filter((t) => t.state === "yard").length;
  const threatsAt = (position: number): number => {
    let n = 0;
    for (const other of state.playerOrder) {
      if (other === pid) continue;
      for (const t of state.tokens[other]) {
        if (t.state !== "track" || t.trackPos == null) continue;
        const d = (position - t.trackPos + length) % length;
        if (d >= 1 && d <= 6) n += 1;
      }
    }
    return n;
  };

  let best: { id: string; score: number } | null = null;
  for (const id of movable) {
    const token = list.find((t) => t.id === id)!;
    const dest = resolveDestination(token, dice, ctx);
    if (!dest) continue;
    let score = 0;
    if (dest.state === "home") score += 1500;
    if (dest.state === "track" && !safe.has(dest.trackPos)) {
      for (const other of state.playerOrder) {
        if (other === pid) continue;
        for (const t of state.tokens[other]) if (t.state === "track" && t.trackPos === dest.trackPos) score += 600;
      }
    }
    if (dest.state === "track") {
      if (safe.has(dest.trackPos)) score += 90;
      else score -= threatsAt(dest.trackPos) * 180;
      if (list.some((t) => t.id !== token.id && t.state === "track" && t.trackPos === dest.trackPos)) score += 70;
    }
    if (token.state === "track" && token.trackPos != null && !safe.has(token.trackPos)) {
      const now = threatsAt(token.trackPos);
      if (now > 0) score += 80 + now * 20;
    }
    if (token.state === "yard" && dice === 6 && dest.state === "track") score += 60 + Math.max(0, inYard - 1) * 30;
    if (dest.state === "stretch") score += 40 + dest.stretchPos * 5;
    else if (dest.state === "track") score += 8;
    if (token.state === "track") score += (token.trackPos ?? 0) * 0.1;
    else if (token.state === "stretch") score += 5 + (token.stretchPos ?? 0);
    if (!best || score > best.score) best = { id, score };
  }
  return best?.id ?? movable[0];
}

/** Plays one game; `smartSeats` use the engine's bot, the rest use the old scorer. Returns the winning player's id. */
function playGame(ids: string[], smartSeats: Set<string>, seed: number): string | null {
  const engine = new LudoEngine();
  engine.setRng(mulberry32(seed));
  engine.init(ids.map(seat));

  for (let step = 0; step < 30_000 && !engine.isOver(); step++) {
    const state = engine.getPublicState();
    const actor = state.turnPlayerId;
    if (state.turnPhase === "rolling") engine.applyMove({ playerId: actor, type: "roll" });
    else if (smartSeats.has(actor)) engine.applyAutoMove(actor);
    else {
      const tokenId = legacyChoose(state, actor);
      if (tokenId) engine.applyMove({ playerId: actor, type: "move", data: { tokenId } });
    }
  }
  return engine.getPublicState().winnerId;
}

describe("Ludo bot tournament: the new brain against the old scorer", () => {
  it("wins a head-to-head more often than it loses, in either seat", () => {
    const games = 300;
    let wins = 0;
    let losses = 0;
    for (let i = 0; i < games; i++) {
      const ids = i % 2 === 0 ? ["new", "old"] : ["old", "new"];
      const winner = playGame(ids, new Set(["new"]), 5_000 + i);
      if (winner === "new") wins += 1;
      else if (winner === "old") losses += 1;
    }

    console.info(`[ludo head-to-head] new bot won ${wins}, old bot won ${losses} of ${games}`);
    expect(wins).toBeGreaterThan(losses);
  }, 240_000);

  it("beats its fair share as one new bot against three old ones (fair share is 25%)", () => {
    const games = 240;
    let wins = 0;
    for (let i = 0; i < games; i++) {
      const order = ["a", "b", "c", "d"];
      const newSeat = order[i % 4];
      const winner = playGame(order, new Set([newSeat]), 9_000 + i);
      if (winner === newSeat) wins += 1;
    }

    console.info(`[ludo 1-v-3] new bot won ${wins} of ${games} (${((wins / games) * 100).toFixed(1)}%; fair share 25%)`);
    expect(wins / games).toBeGreaterThan(0.25);
  }, 240_000);
});
