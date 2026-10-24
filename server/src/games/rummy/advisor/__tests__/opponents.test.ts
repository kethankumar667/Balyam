import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { feedRisk, readOpponents } from "../opponents.js";
import type { PublicEvent } from "../types.js";

/**
 * Reading the table from what everyone saw: a card lifted from the open pile shows what that player is
 * building, and throwing it back takes it off the list. A closed draw reveals nothing.
 */

let seq = 0;
const card = (spec: string): Card => ({ id: `t${++seq}_${spec}`, rank: spec.slice(0, -1) as Rank, suit: spec.slice(-1) as Suit });
const openDraw = (playerId: string, spec: string): PublicEvent => ({ type: "draw", playerId, source: "open", card: card(spec) });
const closedDraw = (playerId: string): PublicEvent => ({ type: "draw", playerId, source: "closed" });
const discard = (playerId: string, spec: string): PublicEvent => ({ type: "discard", playerId, card: card(spec) });

describe("readOpponents", () => {
  it("knows the cards a player picked up from the open pile", () => {
    const reads = readOpponents([openDraw("bob", "7H"), discard("bob", "KC")], "me");

    expect(reads.byPlayer.get("bob")?.held.map((c) => c.rank + c.suit)).toEqual(["7H"]);
    expect(reads.heldByOpponents).toHaveLength(1);
    expect(reads.byPlayer.get("bob")?.discards.map((c) => c.rank + c.suit)).toEqual(["KC"]);
  });

  it("learns nothing from a closed draw, except that it happened", () => {
    const reads = readOpponents([closedDraw("bob"), closedDraw("bob")], "me");

    expect(reads.heldByOpponents).toEqual([]);
    expect(reads.byPlayer.get("bob")?.closedDraws).toBe(2);
  });

  it("forgets a card once the player throws it back", () => {
    const reads = readOpponents([openDraw("bob", "7H"), discard("bob", "7H")], "me");

    expect(reads.heldByOpponents).toEqual([]);
  });

  it("keeps each opponent's cards apart, and ignores the asking player's own moves", () => {
    const reads = readOpponents([openDraw("bob", "7H"), openDraw("cat", "2S"), openDraw("me", "9D"), discard("me", "5C")], "me");

    expect(reads.byPlayer.get("bob")?.held).toHaveLength(1);
    expect(reads.byPlayer.get("cat")?.held).toHaveLength(1);
    expect(reads.byPlayer.has("me")).toBe(false);
    expect(reads.heldByOpponents).toHaveLength(2);
  });

  it("is not confused by a reshuffle: what was picked up before it is still held", () => {
    const reads = readOpponents([openDraw("bob", "7H"), { type: "reshuffle" }, closedDraw("bob")], "me");

    expect(reads.heldByOpponents).toHaveLength(1);
  });
});

describe("feedRisk", () => {
  const reads = readOpponents([openDraw("bob", "7H")], "me");

  it("rates a neighbour of a picked-up card as dangerous to throw", () => {
    expect(feedRisk(card("8H"), reads)).toBeGreaterThan(feedRisk(card("9H"), reads));
    expect(feedRisk(card("6H"), reads)).toBeGreaterThan(0);
  });

  it("rates a card of the same rank in another suit as risky, and an unrelated card as safe", () => {
    expect(feedRisk(card("7S"), reads)).toBeGreaterThan(0);
    expect(feedRisk(card("KD"), reads)).toBe(0);
  });

  it("treats an Ace as next to a King", () => {
    const aceReads = readOpponents([openDraw("bob", "KH")], "me");
    expect(feedRisk(card("AH"), aceReads)).toBeGreaterThan(0);
  });

  it("is zero when nobody has picked anything up, and never counts a joker as feeding", () => {
    expect(feedRisk(card("8H"), readOpponents([], "me"))).toBe(0);
    expect(feedRisk({ id: "pj", rank: "A", suit: "S", isPrintedJoker: true }, reads)).toBe(0);
  });

  it("caps what a single opponent can contribute", () => {
    const heavy = readOpponents([openDraw("bob", "7H"), openDraw("bob", "9H"), openDraw("bob", "8S"), openDraw("bob", "8D")], "me");
    expect(feedRisk(card("8H"), heavy)).toBeLessThanOrEqual(1.5);
  });
});
