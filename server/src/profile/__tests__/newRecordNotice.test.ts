import { describe, expect, it, vi } from "vitest";
import { ProfileService } from "../ProfileService.js";
import { scorecardService } from "../ScorecardService.js";

/**
 * When a finished match beats a player's own record the profile service tells whoever registered (the room manager,
 * which sends it to that player's socket). The rule pinned here: only a score that BEATS an earlier one is announced.
 */

let clock = 0;
let players = 0;

/** A fresh player id per test: the scorecard service is one process-wide store. */
const newPlayer = () => `record-notice-${(players += 1)}`;

function finishMatch(service: ProfileService, playerId: string, score: number, roomCode = "REC001") {
  clock += 100_000;
  service.recordMatchFinished({
    roomCode,
    game: "handcricket",
    startedAt: clock,
    finishedAt: clock + 60_000,
    durationMs: 60_000,
    winnerId: playerId,
    participants: [
      { playerId, name: "Ace", isWinner: true, isMember: true, score },
      { playerId: `${playerId}-opponent`, name: "Opponent", isWinner: false, isMember: true, score: 0 },
    ],
  });
}

describe("announcing a beaten personal record", () => {
  it("says nothing for the first score in a mode: there was nothing to beat", () => {
    const service = new ProfileService();
    const listener = vi.fn();
    service.setNewRecordListener(listener);
    const player = newPlayer();

    finishMatch(service, player, 40);

    expect(listener.mock.calls.filter(([id]) => id === player)).toHaveLength(0);
  });

  it("announces a later, better score once, with the old best and the room it was played in", () => {
    const service = new ProfileService();
    const listener = vi.fn();
    service.setNewRecordListener(listener);
    const player = newPlayer();
    finishMatch(service, player, 40);

    finishMatch(service, player, 55, "REC777");

    const calls = listener.mock.calls.filter(([id]) => id === player);
    expect(calls).toHaveLength(1);
    const [, result, roomCode] = calls[0]!;
    expect(roomCode).toBe("REC777");
    expect(result).toMatchObject({ isNewPersonalBest: true, previousBest: 40, deltaFromPrevious: 15 });
    expect(result.scorecard.bestScore).toBe(55);
  });

  it("says nothing for a score that does not beat the best, or only equals it", () => {
    const service = new ProfileService();
    const listener = vi.fn();
    service.setNewRecordListener(listener);
    const player = newPlayer();
    finishMatch(service, player, 60);

    finishMatch(service, player, 45);
    finishMatch(service, player, 60);

    expect(listener.mock.calls.filter(([id]) => id === player)).toHaveLength(0);
  });

  it("does not let a failing listener undo or stop the scoring", () => {
    const service = new ProfileService();
    service.setNewRecordListener(() => { throw new Error("socket gone"); });
    const player = newPlayer();
    finishMatch(service, player, 40);

    expect(() => finishMatch(service, player, 70)).not.toThrow();

    const modes = scorecardService.getScorecards(player).games.handcricket?.modes ?? {};
    expect(Object.values(modes)[0]?.bestScore).toBe(70);
  });

  it("works with no listener registered at all", () => {
    const service = new ProfileService();
    const player = newPlayer();
    finishMatch(service, player, 10);

    expect(() => finishMatch(service, player, 20)).not.toThrow();
  });
});
