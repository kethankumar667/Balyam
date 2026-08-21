import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@shared/types";
import { generateRummyHint } from "../hintEngine";

describe("Rummy Hint Engine", () => {
  const c = (id: string, rank: Rank, suit: Suit, isPrintedJoker?: boolean): Card => ({
    id,
    rank,
    suit,
    isPrintedJoker: !!isPrintedJoker,
  });

  it("recommends drawing from Open Deck when top card completes or improves a meld", () => {
    // Hand has 4S, 5S (waiting for 6S)
    const hand: Card[] = [
      c("1", "4", "S"),
      c("2", "5", "S"),
      c("3", "K", "H"),
      c("4", "Q", "D"),
    ];
    const topOfOpen = c("open_1", "6", "S");

    const hint = generateRummyHint({
      hand,
      wildRank: "2",
      turnAction: "draw",
      canDraw: true,
      canDiscardOrDeclare: false,
      topOfOpenPile: topOfOpen,
      openJokerDrawable: true,
      isReadyToDeclare: false,
    });

    expect(hint.actionType).toBe("draw");
    expect(hint.recommendedDeck).toBe("open");
    expect(hint.description).toContain("6S");
  });

  it("recommends drawing from Closed Deck when top discard is unhelpful", () => {
    const hand: Card[] = [
      c("1", "4", "S"),
      c("2", "5", "S"),
      c("3", "6", "S"),
      c("4", "9", "H"),
    ];
    const topOfOpen = c("open_1", "2", "C"); // Wild is '8'

    const hint = generateRummyHint({
      hand,
      wildRank: "8",
      turnAction: "draw",
      canDraw: true,
      canDiscardOrDeclare: false,
      topOfOpenPile: topOfOpen,
      openJokerDrawable: true,
      isReadyToDeclare: false,
    });

    expect(hint.actionType).toBe("draw");
    expect(hint.recommendedDeck).toBe("closed");
  });

  it("recommends drawing open card when it is a Wild Joker", () => {
    const hand: Card[] = [
      c("1", "4", "S"),
      c("2", "5", "S"),
      c("3", "K", "H"),
    ];
    const topOfOpen = c("open_1", "7", "D"); // Wild rank is 7

    const hint = generateRummyHint({
      hand,
      wildRank: "7",
      turnAction: "draw",
      canDraw: true,
      canDiscardOrDeclare: false,
      topOfOpenPile: topOfOpen,
      openJokerDrawable: true,
      isReadyToDeclare: false,
    });

    expect(hint.actionType).toBe("draw");
    expect(hint.recommendedDeck).toBe("open");
    expect(hint.reason).toContain("Wild Joker");
  });

  it("recommends the highest deadwood card to discard", () => {
    // Pure sequence: 4S, 5S, 6S (0 pts). Unmatched: KH (10 pts), 3D (3 pts)
    const hand: Card[] = [
      c("1", "4", "S"),
      c("2", "5", "S"),
      c("3", "6", "S"),
      c("4", "K", "H"),
      c("5", "3", "D"),
    ];

    const hint = generateRummyHint({
      hand,
      wildRank: "A",
      turnAction: "discardOrDeclare",
      canDraw: false,
      canDiscardOrDeclare: true,
      topOfOpenPile: c("o", "8", "C"),
      openJokerDrawable: true,
      isReadyToDeclare: false,
    });

    expect(hint.actionType).toBe("discard");
    expect(hint.recommendedDiscardCardId).toBe("4"); // KH
    expect(hint.description).toContain("KH");
  });

  it("recommends declare when hand is fully melded and valid", () => {
    const hand: Card[] = [
      // Pure run 1: A-2-3 S
      c("1", "A", "S"),
      c("2", "2", "S"),
      c("3", "3", "S"),
      // Pure run 2: 7-8-9 H
      c("4", "7", "H"),
      c("5", "8", "H"),
      c("6", "9", "H"),
      // Set: 5C, 5D, 5H
      c("7", "5", "C"),
      c("8", "5", "D"),
      c("9", "5", "H"),
      // Set: KC, KD, KS
      c("10", "K", "C"),
      c("11", "K", "D"),
      c("12", "K", "S"),
      // 14th card to discard: 9D
      c("13", "9", "D"),
    ];

    const hint = generateRummyHint({
      hand,
      wildRank: "T",
      turnAction: "discardOrDeclare",
      canDraw: false,
      canDiscardOrDeclare: true,
      topOfOpenPile: null,
      openJokerDrawable: false,
      isReadyToDeclare: true,
    });

    expect(hint.actionType).toBe("declare");
    expect(hint.title).toContain("Ready to Declare");
  });

  it("never mutates input arrays or objects", () => {
    const hand: Card[] = [c("1", "4", "S"), c("2", "5", "S")];
    const handClone = JSON.stringify(hand);

    generateRummyHint({
      hand,
      wildRank: "K",
      turnAction: "draw",
      canDraw: true,
      canDiscardOrDeclare: false,
      topOfOpenPile: c("o", "6", "S"),
      openJokerDrawable: true,
      isReadyToDeclare: false,
    });

    expect(JSON.stringify(hand)).toBe(handClone);
  });
});
