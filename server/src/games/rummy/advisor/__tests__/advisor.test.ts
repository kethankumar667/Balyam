import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@shared/types.js";
import { validateDeclare } from "../../declare.js";
import { adviseDraw, advise, findShow, rankDiscards } from "../advisor.js";
import { readOpponents } from "../opponents.js";
import type { AdvisorTable, PublicEvent } from "../types.js";
import { DEFAULT_TUNING } from "../tuning.js";
import { unseenCounts } from "../unseen.js";

/**
 * The advisor's decisions on hands whose right answer a strong player would not argue about: show when the
 * hand is complete, throw the card that is no use to you, take the open card only when it finishes something,
 * and let what an opponent was seen to pick up break a tie.
 */

let seq = 0;
const card = (spec: string): Card => ({ id: `t${++seq}_${spec}`, rank: spec.slice(0, -1) as Rank, suit: spec.slice(-1) as Suit });
const cards = (spec: string): Card[] => spec.split(" ").map(card);
const spec = (c: Card): string => c.rank + c.suit;

/** No T in any hand below, so it can be the wild rank without turning a card into a joker. */
const WILD: Rank = "T";
const CUT = card("TD");
const ME = "me";

/** Three melds, a pair of jacks and two loose cards: one J short of showing. */
const NEAR_WIN = "4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC KS 2C";

function table(over: Partial<AdvisorTable>): AdvisorTable {
  return {
    myId: ME,
    hand: [],
    wild: WILD,
    cutCard: CUT,
    openPile: [],
    openJokerDrawable: false,
    closedDeckCount: 40,
    phase: "discard",
    log: [],
    opponents: [{ id: "bob", handSize: 13 }],
    mode: "single",
    myTotal: 0,
    poolTarget: null,
    myTurns: 5,
    ...over,
  };
}

describe("findShow", () => {
  it("finds the winning show and throws the one spare card", () => {
    const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC JS KC");

    const show = findShow(hand, WILD);

    expect(show).not.toBeNull();
    expect(hand.find((c) => c.id === show?.discardCardId)).toMatchObject({ rank: "K", suit: "C" });
  });

  it("returns a show the engine's own declaration check accepts", () => {
    const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC JS KC");
    const show = findShow(hand, WILD);
    const byId = new Map(hand.map((c) => [c.id, c]));

    const melds = (show?.melds ?? []).map((group) => group.map((id) => byId.get(id) as Card));

    expect(validateDeclare(melds, WILD).ok).toBe(true);
  });

  it("does not claim a show for a hand that is one card short, or for the wrong number of cards", () => {
    expect(findShow(cards(NEAR_WIN), WILD)).toBeNull();
    expect(findShow(cards(NEAR_WIN).slice(0, 13), WILD)).toBeNull();
  });
});

describe("rankDiscards", () => {
  const unseen = unseenCounts({ hand: cards(NEAR_WIN), openPile: [], cutCard: CUT, heldByOpponents: [] });

  it("throws a card that belongs to nothing and keeps the pair that needs one more", () => {
    const options = rankDiscards(cards(NEAR_WIN), WILD, unseen, readOpponents([], ME));

    expect(["KS", "2C"]).toContain(spec(options[0].card));
    expect(options[0].evaluation.needed).toBe(1);
  });

  it("throws the dearer of two useless cards, because it costs more if an opponent shows first", () => {
    const options = rankDiscards(cards(NEAR_WIN), WILD, unseen, readOpponents([], ME));

    expect(spec(options[0].card)).toBe("KS");
  });

  it("lists each kind of card once, so two identical cards are one choice", () => {
    const options = rankDiscards(cards("4S 4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC KS"), WILD, unseen, readOpponents([], ME));
    const names = options.map((o) => spec(o.card));

    expect(new Set(names).size).toBe(names.length);
  });

  it("lets what an opponent was seen to take decide the discard when points held matter little", () => {
    // The opponent took the Q♠, which sits next to the K♠. With points weighted lightly, keeping the K♠ (and
    // throwing the 2♣) is the safer play; with them weighted as shipped the K♠ goes (next test).
    const light = { ...DEFAULT_TUNING, deadwoodWeight: 0.35, finalChance: 0.12 };
    const picked: PublicEvent[] = [{ type: "draw", playerId: "bob", source: "open", card: card("QS") }];

    const withoutRead = rankDiscards(cards(NEAR_WIN), WILD, unseen, readOpponents([], ME), light);
    const withRead = rankDiscards(cards(NEAR_WIN), WILD, unseen, readOpponents(picked, ME), light);

    expect(spec(withoutRead[0].card)).toBe("KS");
    expect(spec(withRead[0].card)).toBe("2C");
  });

  it("will still give up a card an opponent wants when keeping it costs many points", () => {
    const picked: PublicEvent[] = [{ type: "draw", playerId: "bob", source: "open", card: card("QS") }];

    const options = rankDiscards(cards(NEAR_WIN), WILD, unseen, readOpponents(picked, ME));

    expect(spec(options[0].card)).toBe("KS");
  });
});

describe("adviseDraw", () => {
  const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC KS");
  const reads = readOpponents([], ME);

  it("takes the open card when it finishes the hand's set", () => {
    const top = card("JS");
    const unseen = unseenCounts({ hand, openPile: [top], cutCard: CUT, heldByOpponents: [] });

    const choice = adviseDraw(hand, WILD, unseen, reads, top, false);

    expect(choice.from).toBe("open");
    expect(choice.openCardIsOut).toBe(true);
  });

  it("leaves the open card alone when it does nothing for the hand", () => {
    const top = card("2C");
    const unseen = unseenCounts({ hand, openPile: [top], cutCard: CUT, heldByOpponents: [] });

    const choice = adviseDraw(hand, WILD, unseen, reads, top, false);

    expect(choice.from).toBe("closed");
    expect(choice.openCardIsOut).toBe(false);
  });

  it("will not lift a printed joker once the first draw is gone", () => {
    const top: Card = { id: "pj", rank: "A", suit: "S", isPrintedJoker: true };
    const unseen = unseenCounts({ hand, openPile: [top], cutCard: CUT, heldByOpponents: [] });

    expect(adviseDraw(hand, WILD, unseen, reads, top, false).from).toBe("closed");
  });

  it("takes a printed joker on the first draw when it is allowed", () => {
    const top: Card = { id: "pj", rank: "A", suit: "S", isPrintedJoker: true };
    const unseen = unseenCounts({ hand, openPile: [top], cutCard: CUT, heldByOpponents: [] });

    expect(adviseDraw(hand, WILD, unseen, reads, top, true).from).toBe("open");
  });

  it("goes to the closed deck when the open pile is empty", () => {
    const unseen = unseenCounts({ hand, openPile: [], cutCard: CUT, heldByOpponents: [] });

    const choice = adviseDraw(hand, WILD, unseen, reads, null, false);

    expect(choice.from).toBe("closed");
    expect(choice.openCard).toBeNull();
  });
});

describe("advise", () => {
  it("says to show when the hand is complete", () => {
    const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC JS KC");

    const advice = advise(table({ hand, phase: "discard" }));

    expect(advice.kind).toBe("declare");
  });

  it("says to discard, best first, when the hand is not yet complete", () => {
    const advice = advise(table({ hand: cards(NEAR_WIN), phase: "discard" }));

    expect(advice.kind).toBe("discard");
    if (advice.kind === "discard") expect(advice.options.length).toBeGreaterThan(0);
  });

  it("says where to draw from at the start of the turn", () => {
    const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC KS");

    const advice = advise(table({ hand, phase: "draw", openPile: [card("JS")] }));

    expect(advice.kind).toBe("draw");
    if (advice.kind === "draw") expect(advice.choice.from).toBe("open");
  });

  it("waits when it is not the player's turn, and when there is no hand", () => {
    expect(advise(table({ hand: cards(NEAR_WIN), phase: "waiting" })).kind).toBe("wait");
    expect(advise(table({ hand: [], phase: "draw" })).kind).toBe("wait");
  });

  it("counts a card an opponent is holding as gone from the deck", () => {
    const hand = cards("4S 5S 6S 7S 3H 4H 5H 8D 8C 8H JD JC KS");
    const held: PublicEvent[] = [{ type: "draw", playerId: "bob", source: "open", card: card("JS") }];
    const withoutRead = advise(table({ hand, phase: "draw" }));
    const withRead = advise(table({ hand, phase: "draw", log: held }));

    if (withoutRead.kind !== "draw" || withRead.kind !== "draw") throw new Error("expected draw advice");
    expect(withRead.unseenTotal).toBe(withoutRead.unseenTotal - 1);
  });
});
