import { describe, it, expect } from "vitest";
import { TournamentEngine } from "../TournamentEngine.js";
import type { Tournament } from "@shared/tournaments/Tournament.js";

describe("Tournament Engine & Lifecycle Transitions", () => {
  it("validates legal and illegal state transitions correctly", () => {
    // Legal transitions
    expect(TournamentEngine.canTransition("DRAFT", "REGISTRATION_OPEN")).toBe(true);
    expect(TournamentEngine.canTransition("REGISTRATION_OPEN", "CHECK_IN_OPEN")).toBe(true);
    expect(TournamentEngine.canTransition("CHECK_IN_OPEN", "IN_PROGRESS")).toBe(true);
    expect(TournamentEngine.canTransition("IN_PROGRESS", "FINISHED")).toBe(true);
    expect(TournamentEngine.canTransition("FINISHED", "ARCHIVED")).toBe(true);

    // Illegal transitions
    expect(TournamentEngine.canTransition("DRAFT", "IN_PROGRESS")).toBe(false);
    expect(TournamentEngine.canTransition("FINISHED", "IN_PROGRESS")).toBe(false);
    expect(TournamentEngine.canTransition("ARCHIVED", "REGISTRATION_OPEN")).toBe(false);
  });

  it("processes check-ins and disqualifies absent participants", () => {
    const mockTournament: Tournament = {
      id: "t_checkin",
      title: "Check-in Test",
      description: "Testing check-in validation",
      game: "ludo",
      type: "SINGLE_ELIMINATION",
      status: "CHECK_IN_OPEN",
      config: {
        minPlayers: 2,
        maxPlayers: 4,
        allowLateJoin: false,
        autoAdvanceByes: true,
        checkInRequired: true,
        visibility: "PUBLIC",
      },
      participants: [
        { playerId: "p1", displayName: "Alice", seed: 1, checkedIn: true, status: "REGISTERED" },
        { playerId: "p2", displayName: "Bob", seed: 2, checkedIn: false, status: "REGISTERED" },
      ],
      currentRound: 0,
      totalRounds: 1,
      startsAt: Date.now(),
      createdAt: Date.now(),
      createdBy: "system",
      rewards: [],
    };

    const result = TournamentEngine.processCheckIns(mockTournament);
    expect(result.checkedInCount).toBe(1);
    expect(result.disqualifiedCount).toBe(1);
    expect(mockTournament.participants[0]!.status).toBe("ACTIVE");
    expect(mockTournament.participants[1]!.status).toBe("DISQUALIFIED");
  });
});
