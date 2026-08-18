import { describe, it, expect } from "vitest";
import { BracketEngine } from "../BracketEngine.js";
import type { TournamentParticipant } from "@shared/tournaments/Tournament.js";

describe("Tournament Bracket Engine", () => {
  const mockParticipants: TournamentParticipant[] = [
    { playerId: "p1", displayName: "Alice", seed: 1, checkedIn: true, status: "ACTIVE" },
    { playerId: "p2", displayName: "Bob", seed: 2, checkedIn: true, status: "ACTIVE" },
    { playerId: "p3", displayName: "Charlie", seed: 3, checkedIn: true, status: "ACTIVE" },
    { playerId: "p4", displayName: "Diana", seed: 4, checkedIn: true, status: "ACTIVE" },
  ];

  it("generates a 4-player single elimination bracket with Semifinals and Finals", () => {
    const bracket = BracketEngine.generateBracket("t1", mockParticipants);
    expect(bracket.tournamentId).toBe("t1");
    expect(bracket.rounds.length).toBe(2);

    expect(bracket.rounds[0]!.name).toBe("Semifinals");
    expect(bracket.rounds[0]!.matches.length).toBe(2);

    expect(bracket.rounds[1]!.name).toBe("Finals");
    expect(bracket.rounds[1]!.matches.length).toBe(1);

    // Initial match setup
    const r1m1 = bracket.rounds[0]!.matches[0]!;
    expect(r1m1.player1?.playerId).toBe("p1");
    expect(r1m1.player2?.playerId).toBe("p2");
    expect(r1m1.status).toBe("READY");
  });

  it("handles Byes automatically for unseeded slots", () => {
    const threePlayers = mockParticipants.slice(0, 3);
    const bracket = BracketEngine.generateBracket("t_byes", threePlayers, true);

    // Match 2 in Round 1 has player3 vs null (BYE)
    const r1m2 = bracket.rounds[0]!.matches[1]!;
    expect(r1m2.player1?.playerId).toBe("p3");
    expect(r1m2.player2).toBeNull();
    expect(r1m2.status).toBe("BYE");
    expect(r1m2.winnerId).toBe("p3");

    // Player 3 should be automatically advanced to Finals match
    const finals = bracket.rounds[1]!.matches[0]!;
    expect(finals.player2?.playerId).toBe("p3");
  });

  it("advances match winners through rounds until Finals champion is crowned", () => {
    const bracket = BracketEngine.generateBracket("t_full", mockParticipants);

    // 1. Semifinal 1: Alice beats Bob
    const res1 = BracketEngine.advanceWinner(bracket, bracket.rounds[0]!.matches[0]!.matchId, "p1", 2, 0);
    expect(res1.success).toBe(true);
    expect(res1.isTournamentOver).toBe(false);

    // 2. Semifinal 2: Charlie beats Diana
    const res2 = BracketEngine.advanceWinner(bracket, bracket.rounds[0]!.matches[1]!.matchId, "p3", 2, 1);
    expect(res2.success).toBe(true);
    expect(res2.isTournamentOver).toBe(false);

    // Finals should now be READY between Alice and Charlie
    const finals = bracket.rounds[1]!.matches[0]!;
    expect(finals.status).toBe("READY");
    expect(finals.player1?.playerId).toBe("p1");
    expect(finals.player2?.playerId).toBe("p3");

    // 3. Finals: Alice beats Charlie
    const finalsRes = BracketEngine.advanceWinner(bracket, finals.matchId, "p1", 3, 2);
    expect(finalsRes.isTournamentOver).toBe(true);
    expect(finalsRes.championId).toBe("p1");
    expect(finalsRes.runnerUpId).toBe("p3");
  });
});
