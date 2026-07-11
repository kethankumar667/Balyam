import { describe, it, expect, beforeEach } from "vitest";
import { UnoEngine, type InternalUnoState } from "../UnoEngine.js";
import type { Player, UnoCard, UnoColor } from "@shared/types.js";
import { DEFAULT_UNO_OPTIONS } from "@shared/types.js";

/**
 * `state` is private on UnoEngine (compile-time only in TS). Reaching into
 * it here is the pragmatic way to set up exact hand/discard scenarios for
 * play/action-card/win tests — rigging the Fisher–Yates shuffle to land a
 * specific card in a specific hand is far more indirect for the same result.
 */
function stateOf(engine: UnoEngine): InternalUnoState {
  return (engine as unknown as { state: InternalUnoState }).state;
}

let cardSeq = 0;
function card(color: UnoColor | null, rank: UnoCard["rank"], id?: string): UnoCard {
  return { id: id ?? `test-card-${cardSeq++}`, color, rank };
}

describe("UnoEngine", () => {
  let engine: UnoEngine;
  let players: Player[];

  beforeEach(() => {
    engine = new UnoEngine();
    players = [
      {
        id: "p1",
        name: "Alice",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: true,
        isConnected: true,
      },
      {
        id: "p2",
        name: "Bob",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      },
      {
        id: "p3",
        name: "Charlie",
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      },
    ];
  });

  describe("init", () => {
    it("should initialize with 3 players", () => {
      engine.init(players);
      const state = engine.getPublicState();
      expect(state.phase).toBe("playing");
      expect(state.playerOrder).toEqual(["p1", "p2", "p3"]);
      expect(state.turnPlayerId).toBe("p1");
    });

    it("should deal 7 cards to each player", () => {
      engine.init(players);
      const p1State = engine.getStateFor("p1");
      const p2State = engine.getStateFor("p2");
      const p3State = engine.getStateFor("p3");
      expect(p1State.myHand.length).toBe(7);
      expect(p2State.myHand.length).toBe(7);
      expect(p3State.myHand.length).toBe(7);
    });

    it("should set a top card", () => {
      engine.init(players);
      const state = engine.getPublicState();
      expect(state.topCard).toBeDefined();
      expect(state.topCard.id).toBeDefined();
    });

    it("should reject fewer than 2 players", () => {
      expect(() => engine.init([players[0]!])).toThrow();
    });

    it("should reject more than 8 players", () => {
      const manyPlayers: Player[] = Array.from({ length: 9 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        isBot: false,
        isReady: true,
        isLocal: false,
        isHost: false,
        isConnected: true,
      }));
      expect(() => engine.init(manyPlayers)).toThrow();
    });
  });

  describe("game basics", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should not be over at start", () => {
      expect(engine.isOver()).toBe(false);
    });

    it("should identify current player as pending actor", () => {
      const pending = engine.pendingActors();
      expect(pending).toEqual(["p1"]);
    });

    it("should return valid moves for current player", () => {
      const p1State = engine.getStateFor("p1");
      expect(p1State.validMoves).toBeDefined();
      expect(p1State.validMoves.length).toBeGreaterThan(0);
    });
  });

  describe("applyMove - draw", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should add a card to player's hand", () => {
      const stateBefore = engine.getStateFor("p1");
      const handSizeBefore = stateBefore.myHand.length;

      engine.applyMove({
        playerId: "p1",
        type: "draw",
      });

      const stateAfter = engine.getStateFor("p1");
      expect(stateAfter.myHand.length).toBe(handSizeBefore + 1);
    });

    it("should reject drawing twice in a turn", () => {
      engine.applyMove({
        playerId: "p1",
        type: "draw",
      });

      const result = engine.applyMove({
        playerId: "p1",
        type: "draw",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Already drew this turn");
    });
  });

  describe("applyMove - pass", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should reject pass without drawing first", () => {
      const result = engine.applyMove({
        playerId: "p1",
        type: "pass",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Can only pass after drawing");
    });

    it("should advance turn after draw + pass", () => {
      const stateBefore = engine.getPublicState();
      expect(stateBefore.turnPlayerId).toBe("p1");

      engine.applyMove({ playerId: "p1", type: "draw" });
      engine.applyMove({ playerId: "p1", type: "pass" });

      const stateAfter = engine.getPublicState();
      expect(stateAfter.turnPlayerId).toBe("p2");
    });
  });

  describe("player removal", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should remove disconnected player from turn order", () => {
      const stateBefore = engine.getPublicState();
      expect(stateBefore.playerOrder).toContain("p2");

      engine.removePlayer("p2");

      const stateAfter = engine.getPublicState();
      expect(stateAfter.playerOrder).not.toContain("p2");
    });

    it("should end game if only one player remains", () => {
      engine.removePlayer("p2");
      engine.removePlayer("p3");
      expect(engine.isOver()).toBe(true);
    });
  });

  describe("bot auto-move", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("should apply an auto-move for a bot", () => {
      const result = engine.applyAutoMove("p1");
      expect(result.ok).toBe(true);
    });
  });

  // ---------------------------------------------------------------------
  // Added while standing up Phase 1 (Foundation) of the UNO plan review —
  // see client/public/game plan/PLAN_REVIEW_REPORT.md §7 Phase 1. Covers
  // the rules-correctness surface the original suite never touched: `play`
  // validity, every action-card effect, win detection, deck composition,
  // and draw-pile reshuffle.
  // ---------------------------------------------------------------------

  describe("deck composition", () => {
    it("deals from a full, correctly-composed 108-card deck", () => {
      engine.init(players);
      const s = stateOf(engine);
      const all: UnoCard[] = [...Object.values(s.hands).flat(), ...s.deck, ...s.discard];

      expect(all).toHaveLength(108);
      expect(new Set(all.map((c) => c.id)).size).toBe(108);
      expect(all.filter((c) => c.rank === "Wild")).toHaveLength(4);
      expect(all.filter((c) => c.rank === "Wild+4")).toHaveLength(4);

      for (const color of ["R", "G", "B", "Y"] as const) {
        const colorCards = all.filter((c) => c.color === color);
        expect(colorCards).toHaveLength(25); // 1x"0" + 2x("1".."9") + 2x(Skip/Reverse/+2)
        expect(colorCards.filter((c) => c.rank === "0")).toHaveLength(1);
        for (const n of ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const) {
          expect(colorCards.filter((c) => c.rank === n)).toHaveLength(2);
        }
        for (const action of ["Skip", "Reverse", "+2"] as const) {
          expect(colorCards.filter((c) => c.rank === action)).toHaveLength(2);
        }
      }
    });
  });

  describe("applyMove - play (color/number/symbol matching)", () => {
    beforeEach(() => {
      engine.init(players);
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
    });

    it("accepts a card matching color", () => {
      const matching = card("R", "9", "match-color");
      stateOf(engine).hands["p1"] = [matching];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: matching.id } });
      expect(result.ok).toBe(true);
      expect(stateOf(engine).discard.at(-1)?.id).toBe(matching.id);
      expect(stateOf(engine).currentColor).toBe("R");
    });

    it("accepts a card matching number regardless of color", () => {
      const matching = card("G", "5", "match-number");
      stateOf(engine).hands["p1"] = [matching];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: matching.id } });
      expect(result.ok).toBe(true);
      expect(stateOf(engine).currentColor).toBe("G");
    });

    it("rejects a card matching neither color, number, nor symbol", () => {
      const mismatch = card("B", "2", "mismatch");
      stateOf(engine).hands["p1"] = [mismatch];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: mismatch.id } });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Invalid play: color/rank mismatch");
      expect(stateOf(engine).hands["p1"]).toHaveLength(1); // untouched
    });

    it("Wild is always playable and sets the chosen color", () => {
      const wild = card(null, "Wild", "wild-1");
      stateOf(engine).hands["p1"] = [wild];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild.id, color: "Y" } });
      expect(result.ok).toBe(true);
      expect(stateOf(engine).currentColor).toBe("Y");
    });

    it("rejects Wild without a chosen color", () => {
      const wild = card(null, "Wild", "wild-2");
      stateOf(engine).hands["p1"] = [wild];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild.id } });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Must choose color for Wild card");
    });

    it("Wild+4 is always PLAYABLE even when the player holds a legal alternative — illegality is a challenge concern, not a play-time block", () => {
      // Deliberate design (UNO_GAME_PLAN.md §14.5, confirmed in Phase 2):
      // official UNO never blocks an illegal Wild+4 outright, since
      // opponents can't see the player's hand — it's discouraged via the
      // challenge mechanic instead. See the "Wild Draw Four challenge"
      // describe block below for the legality/penalty resolution itself.
      const legalAlternative = card("R", "3", "legal-alt"); // matches current color R
      const wild4 = card(null, "Wild+4", "wild4-1");
      stateOf(engine).hands["p1"] = [legalAlternative, wild4];
      const result = engine.applyMove({
        playerId: "p1",
        type: "play",
        data: { cardId: wild4.id, color: "B" },
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("win detection", () => {
    beforeEach(() => {
      engine.init(players);
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
    });

    it("ends the game the instant the last card is played", () => {
      const winning = card("R", "7", "winner-card");
      stateOf(engine).hands["p1"] = [winning];
      const result = engine.applyMove({ playerId: "p1", type: "play", data: { cardId: winning.id } });
      expect(result.ok).toBe(true);
      expect(result.isOver).toBe(true);
      expect(result.winnerId).toBe("p1");
      expect(engine.isOver()).toBe(true);
      expect(engine.getPublicState().winnerId).toBe("p1");
    });

    it("awards the winner points for every OTHER player's remaining hand (Volume 4 §20)", () => {
      const s = stateOf(engine);
      const winning = card("R", "7", "winner-card");
      s.hands["p1"] = [winning];
      // p2: 5 (number) + 20 (Skip) = 25. p3: 50 (Wild) = 50. Total = 75.
      s.hands["p2"] = [card("B", "5", "p2-a"), card("B", "Skip", "p2-b")];
      s.hands["p3"] = [card(null, "Wild", "p3-a")];

      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: winning.id } });

      expect(engine.getPublicState().scores["p1"]).toBe(75);
      expect(engine.getPublicState().scores["p2"]).toBe(0);
      expect(engine.getPublicState().scores["p3"]).toBe(0);
    });

    it("scores Wild Draw Four at 50 and number cards at face value including 0", () => {
      const s = stateOf(engine);
      const winning = card("R", "7", "winner-card-2");
      s.hands["p1"] = [winning];
      // p2: 0 (face value) + 50 (Wild+4) + 20 (Reverse) + 20 (+2) = 90.
      s.hands["p2"] = [
        card("G", "0", "p2-zero"),
        card(null, "Wild+4", "p2-w4"),
        card("Y", "Reverse", "p2-rev"),
        card("Y", "+2", "p2-d2"),
      ];
      s.hands["p3"] = [];

      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: winning.id } });

      expect(engine.getPublicState().scores["p1"]).toBe(90);
    });

    it("accumulates onto an existing score rather than overwriting it", () => {
      const s = stateOf(engine);
      s.scores["p1"] = 40; // simulate a prior round's carry-over
      const winning = card("R", "7", "winner-card-3");
      s.hands["p1"] = [winning];
      s.hands["p2"] = [card("B", "3", "p2-only")]; // +3
      s.hands["p3"] = [];

      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: winning.id } });

      expect(engine.getPublicState().scores["p1"]).toBe(43);
    });
  });

  describe("action cards — turn advancement (3 players: p1 -> p2 -> p3)", () => {
    beforeEach(() => {
      engine.init(players);
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
      s.turnIndex = 0; // p1's turn
      s.direction = 1;
    });

    // Every hand below carries a non-matching filler card alongside the
    // action card under test — playing down to an empty hand triggers the
    // engine's win branch, which returns *before* handleActionCard ever
    // runs, so a single-card hand would silently skip the exact logic
    // these tests exist to exercise.
    const FILLER = () => card("B", "1", `filler-${cardSeq}`);

    it("Skip: skips exactly one player", () => {
      const skip = card("R", "Skip", "skip-1");
      stateOf(engine).hands["p1"] = [skip, FILLER()];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: skip.id } });
      expect(engine.getPublicState().turnPlayerId).toBe("p3");
    });

    it("Reverse: reverses turn order to the previous player, not the next", () => {
      // Regression test for a real engine bug found while writing this
      // suite: turnIndex advancement never consulted `direction` before the
      // Foundation-phase fix in UnoEngine.ts, so Reverse only flipped the
      // display flag while turn order silently continued forward.
      const reverse = card("R", "Reverse", "rev-1");
      stateOf(engine).hands["p1"] = [reverse, FILLER()];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: reverse.id } });
      const after = engine.getPublicState();
      expect(after.direction).toBe(-1);
      expect(after.turnPlayerId).toBe("p3");
    });

    it("Reverse then Skip: direction stays reversed across subsequent plays", () => {
      const reverse = card("R", "Reverse", "rev-2");
      stateOf(engine).hands["p1"] = [reverse, FILLER()];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: reverse.id } });
      expect(engine.getPublicState().turnPlayerId).toBe("p3");

      // p3 plays Skip in the now-reversed direction: should skip p2 (the
      // "previous" player in original order, now next-in-line) and land on p1.
      const skip = card("R", "Skip", "skip-2");
      stateOf(engine).hands["p3"] = [skip, FILLER()];
      engine.applyMove({ playerId: "p3", type: "play", data: { cardId: skip.id } });
      expect(engine.getPublicState().turnPlayerId).toBe("p1");
    });

    it("Draw Two: next player draws 2 and is skipped", () => {
      const drawTwo = card("R", "+2", "d2-1");
      stateOf(engine).hands["p1"] = [drawTwo, FILLER()];
      const p2HandBefore = stateOf(engine).hands["p2"].length;
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: drawTwo.id } });
      expect(stateOf(engine).hands["p2"]).toHaveLength(p2HandBefore + 2);
      expect(engine.getPublicState().turnPlayerId).toBe("p3");
    });

    it("Wild Draw Four: color updates immediately, but the draw/skip is deferred behind a challenge window", () => {
      const wild4 = card(null, "Wild+4", "w4-1");
      stateOf(engine).hands["p1"] = [wild4, FILLER()];
      const p2HandBefore = stateOf(engine).hands["p2"].length;
      const result = engine.applyMove({
        playerId: "p1",
        type: "play",
        data: { cardId: wild4.id, color: "G" },
      });
      expect(result.ok).toBe(true);
      const after = engine.getPublicState();
      // Nothing drawn and turn NOT advanced yet — see "Wild Draw Four challenge" below.
      expect(stateOf(engine).hands["p2"]).toHaveLength(p2HandBefore);
      expect(after.currentColor).toBe("G");
      expect(after.pendingChallenge).toEqual({ challengerId: "p2", playedById: "p1" });
    });
  });

  describe("Wild Draw Four challenge (Volume 4 §16-17)", () => {
    beforeEach(() => {
      engine.init(players);
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
      s.turnIndex = 0; // p1's turn
      s.direction = 1;
    });

    function playWildFour() {
      const wild4 = card(null, "Wild+4", "w4-challenge");
      stateOf(engine).hands["p1"] = [wild4, card("B", "1", "filler")];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild4.id, color: "G" } });
    }

    it("blocks other moves while a decision is outstanding", () => {
      playWildFour();
      const blocked = engine.applyMove({ playerId: "p3", type: "draw" });
      expect(blocked.ok).toBe(false);
    });

    it("only the targeted player may accept or challenge", () => {
      playWildFour();
      const wrongPlayer = engine.applyMove({ playerId: "p3", type: "acceptDraw" });
      expect(wrongPlayer.ok).toBe(false);
    });

    it("acceptDraw: target draws 4 and loses their turn, exactly as an un-challenged play always did", () => {
      playWildFour();
      const p2Before = stateOf(engine).hands["p2"].length;
      engine.applyMove({ playerId: "p2", type: "acceptDraw" });
      const after = engine.getPublicState();
      expect(stateOf(engine).hands["p2"]).toHaveLength(p2Before + 4);
      expect(after.turnPlayerId).toBe("p3");
      expect(after.pendingChallenge).toBeNull();
    });

    it("illegal play, challenged: the player who played it draws 4 instead, challenger keeps their turn", () => {
      // p1's remaining hand (after the Wild+4 leaves it) still has a Red
      // card — a legal alternative existed, so the Wild+4 was illegal.
      const wild4 = card(null, "Wild+4", "w4-illegal");
      stateOf(engine).hands["p1"] = [wild4, card("R", "3", "legal-alt")];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild4.id, color: "G" } });

      const p1Before = stateOf(engine).hands["p1"].length;
      const result = engine.applyMove({ playerId: "p2", type: "challenge" });
      expect(result.ok).toBe(true);
      const after = engine.getPublicState();
      expect(stateOf(engine).hands["p1"]).toHaveLength(p1Before + 4);
      expect(after.turnPlayerId).toBe("p2"); // challenger keeps their turn
      expect(after.pendingChallenge).toBeNull();
    });

    it("legal play, challenged: the challenger draws 6 instead of 4 and still loses their turn", () => {
      // p1's remaining hand has no Red card — the Wild+4 was legal.
      const wild4 = card(null, "Wild+4", "w4-legal");
      stateOf(engine).hands["p1"] = [wild4, card("B", "1", "no-red-here")];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild4.id, color: "G" } });

      const p2Before = stateOf(engine).hands["p2"].length;
      const result = engine.applyMove({ playerId: "p2", type: "challenge" });
      expect(result.ok).toBe(true);
      const after = engine.getPublicState();
      expect(stateOf(engine).hands["p2"]).toHaveLength(p2Before + 6);
      expect(after.turnPlayerId).toBe("p3");
      expect(after.pendingChallenge).toBeNull();
    });

    it("never actually rejects the play itself, even when illegal — legality only matters if challenged", () => {
      // Documents the deliberate design (UNO_GAME_PLAN.md §14.5): official
      // UNO never blocks an illegal Wild+4 outright, since opponents can't
      // see the player's hand. It's always challengeable, never unplayable.
      const wild4 = card(null, "Wild+4", "w4-always-playable");
      stateOf(engine).hands["p1"] = [wild4, card("R", "3", "legal-alt")];
      const result = engine.applyMove({
        playerId: "p1",
        type: "play",
        data: { cardId: wild4.id, color: "G" },
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("Reverse in a 2-player game acts as Skip (official rule)", () => {
    it("returns the turn to the player who played Reverse, not the opponent", () => {
      engine = new UnoEngine();
      engine.init(players.slice(0, 2)); // p1, p2 only
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
      const reverse = card("R", "Reverse", "rev-2p");
      s.hands["p1"] = [reverse, card("B", "1", "filler-2p")]; // avoid a false win
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: reverse.id } });
      expect(engine.getPublicState().turnPlayerId).toBe("p1"); // p2 was effectively skipped
    });
  });

  describe("draw pile reshuffle", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("reshuffles the discard pile (keeping the top card) once the draw pile runs low", () => {
      const s = stateOf(engine);
      s.deck = [card("R", "1", "last-deck-card")];
      s.discard = [
        card("G", "2", "d1"),
        card("B", "3", "d2"),
        card("Y", "4", "d3"),
        card("R", "9", "top-kept"), // must stay as the new discard top
      ];
      const handBefore = s.hands["p1"].length;

      const result = engine.applyMove({ playerId: "p1", type: "draw" });

      expect(result.ok).toBe(true);
      const after = stateOf(engine);
      expect(after.hands["p1"]).toHaveLength(handBefore + 1);
      expect(after.discard.map((c) => c.id)).toEqual(["top-kept"]);
      // 4 discard cards -> pop kept top -> 3 reshuffled into the 1-card deck
      // (4 total) -> draw 1 -> 3 remain.
      expect(after.deck).toHaveLength(3);
    });

    it("falls back to taking whatever remains when there aren't enough cards to reshuffle", () => {
      const s = stateOf(engine);
      s.deck = [card("R", "1", "only-deck-card")];
      s.discard = [card("R", "5", "sole-discard-top")]; // length <= 1, can't reshuffle
      const handBefore = s.hands["p1"].length;

      const result = engine.applyMove({ playerId: "p1", type: "draw" });

      expect(result.ok).toBe(true);
      const after = stateOf(engine);
      expect(after.hands["p1"]).toHaveLength(handBefore + 1);
      expect(after.deck).toHaveLength(0);
    });
  });

  describe("starting card (UNO_GAME_PLAN.md §4.2, fixed Phase 2)", () => {
    it("never reveals a Wild/Wild+4 as the opening card — re-draws until a colored card appears", () => {
      // Was: silently defaulted currentColor to Red on a Wild opener. Now:
      // the Wild is shuffled back in and another card drawn, matching
      // Volume 4 §7. Run enough inits to make a false pass astronomically
      // unlikely if the fix ever regresses (~7% chance per init of landing
      // a Wild in that slot with no re-draw).
      for (let attempt = 0; attempt < 200; attempt++) {
        const e = new UnoEngine();
        e.init(players);
        const top = stateOf(e).discard[0]!;
        expect(top.rank).not.toBe("Wild");
        expect(top.rank).not.toBe("Wild+4");
        expect(stateOf(e).currentColor).toBe(top.color);
      }
    });

    it("keeps the deck's total card count intact even when a Wild had to be re-drawn", () => {
      // Regression guard for the re-draw loop's deck bookkeeping: no card
      // should be created or lost while shuffling a Wild back into the pool.
      for (let attempt = 0; attempt < 50; attempt++) {
        const e = new UnoEngine();
        e.init(players);
        const s = stateOf(e);
        const total = Object.values(s.hands).flat().length + s.deck.length + s.discard.length;
        expect(total).toBe(108);
      }
    });
  });

  describe("UNO declaration and catch (Volume 4 §18)", () => {
    beforeEach(() => {
      engine.init(players);
      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
    });

    it("cannot declare with more than one card", () => {
      // p1 has 7 cards from the deal.
      const result = engine.applyMove({ playerId: "p1", type: "declareUno" });
      expect(result.ok).toBe(false);
    });

    it("declares successfully at exactly one card", () => {
      stateOf(engine).hands["p1"] = [card("R", "9", "last-card")];
      const result = engine.applyMove({ playerId: "p1", type: "declareUno" });
      expect(result.ok).toBe(true);
      expect(engine.getPublicState().unoDeclaredBy).toEqual(["p1"]);
    });

    it("cannot declare twice for the same hand", () => {
      stateOf(engine).hands["p1"] = [card("R", "9", "last-card")];
      engine.applyMove({ playerId: "p1", type: "declareUno" });
      const again = engine.applyMove({ playerId: "p1", type: "declareUno" });
      expect(again.ok).toBe(false);
    });

    it("catchUno: penalizes a player at 1 card who hasn't declared", () => {
      stateOf(engine).hands["p2"] = [card("B", "3", "caught-card")];
      const before = stateOf(engine).hands["p2"].length;
      const result = engine.applyMove({
        playerId: "p1",
        type: "catchUno",
        data: { targetId: "p2" },
      });
      expect(result.ok).toBe(true);
      expect(stateOf(engine).hands["p2"]).toHaveLength(before + 2);
    });

    it("catchUno: fails once the target has already declared", () => {
      stateOf(engine).hands["p2"] = [card("B", "3", "declared-card")];
      engine.applyMove({ playerId: "p2", type: "declareUno" });
      const result = engine.applyMove({
        playerId: "p1",
        type: "catchUno",
        data: { targetId: "p2" },
      });
      expect(result.ok).toBe(false);
    });

    it("catchUno: cannot target yourself", () => {
      stateOf(engine).hands["p1"] = [card("R", "9", "own-card")];
      const result = engine.applyMove({
        playerId: "p1",
        type: "catchUno",
        data: { targetId: "p1" },
      });
      expect(result.ok).toBe(false);
    });

    it("a stale declaration does not survive a later return to 1 card (Draw Two mid-declaration)", () => {
      // p1 declares at 1 card, then gets hit by a +2 (grows to 3), plays
      // one down to 2, then draws down to... simulate the "grows away from
      // 1, later returns to 1" cycle directly against internal state to
      // prove syncUnoDeclaration's cleanup actually fires.
      const s = stateOf(engine);
      s.hands["p1"] = [card("R", "9", "solo")];
      engine.applyMove({ playerId: "p1", type: "declareUno" });
      expect(engine.getPublicState().unoDeclaredBy).toContain("p1");

      // Simulate a +2 penalty landing on p1 via the real draw path so
      // syncUnoDeclaration runs exactly as production code would call it.
      s.turnIndex = s.playerOrder.indexOf("p1");
      s.drewLastTurn = false;
      engine.applyMove({ playerId: "p1", type: "draw" }); // hand: 1 -> 2
      expect(engine.getPublicState().unoDeclaredBy).not.toContain("p1");
    });

    it("bots always auto-declare via applyAutoMove instead of ever getting caught", () => {
      stateOf(engine).hands["p1"] = [card("R", "9", "bot-last-card")];
      const result = engine.applyAutoMove("p1");
      expect(result.ok).toBe(true);
      expect(engine.getPublicState().unoDeclaredBy).toContain("p1");
    });
  });

  describe("turn timer plumbing (RoomManager integration points)", () => {
    beforeEach(() => {
      engine.init(players);
    });

    it("getTurnTimerSeconds reflects DEFAULT_UNO_OPTIONS before any setOptions call", () => {
      expect(engine.getTurnTimerSeconds()).toBe(20);
    });

    it("setOptions before init changes the seconds used by the started game", () => {
      const e = new UnoEngine();
      e.setOptions({ ...DEFAULT_UNO_OPTIONS, turnTimerSeconds: 45 });
      e.init(players);
      expect(e.getTurnTimerSeconds()).toBe(45);
    });

    it("setTurnDeadline/clearTurnDeadline round-trip onto the public state", () => {
      expect(engine.getPublicState().turnDeadline).toBeNull();
      const deadline = Date.now() + 20_000;
      engine.setTurnDeadline(deadline);
      expect(engine.getPublicState().turnDeadline).toBe(deadline);
      engine.clearTurnDeadline();
      expect(engine.getPublicState().turnDeadline).toBeNull();
    });

    it("getTimeoutActor returns the real turn holder normally, and the challenger during a pending Wild Draw Four", () => {
      expect(engine.getTimeoutActor()).toBe("p1");

      const s = stateOf(engine);
      s.discard = [card("R", "5", "top")];
      s.currentColor = "R";
      const wild4 = card(null, "Wild+4", "w4-timeout");
      s.hands["p1"] = [wild4, card("B", "1", "filler")];
      engine.applyMove({ playerId: "p1", type: "play", data: { cardId: wild4.id, color: "G" } });

      expect(engine.getTimeoutActor()).toBe("p2");
    });

    it("getTimeoutActor never returns a merely declare-eligible player who isn't the real turn/challenge holder", () => {
      // p2 sits on an undeclared 1-card hand, but it's p1's turn — the
      // timeout must force p1's move, not silently declare for p2.
      stateOf(engine).hands["p2"] = [card("B", "3", "undeclared")];
      expect(engine.getTimeoutActor()).toBe("p1");
      expect(engine.pendingActors()).toContain("p2"); // still bot-scheduler-visible
    });
  });
});
