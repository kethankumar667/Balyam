import { describe, it, expect, beforeEach } from "vitest";
import { partyService } from "../PartyService.js";
import { PartyEngine } from "../PartyEngine.js";

describe("Party Subsystem Suite", () => {
  beforeEach(() => {
    partyService.clear();
  });

  describe("PartyEngine State Machine", () => {
    it("validates allowed transitions and rejects illegal transitions", () => {
      expect(PartyEngine.canTransition("CREATED", "INVITING")).toBe(true);
      expect(PartyEngine.canTransition("CREATED", "READY")).toBe(true);
      expect(PartyEngine.canTransition("DISBANDED", "CREATED")).toBe(false);
    });
  });

  describe("PartyService Lifecycle", () => {
    it("creates party with leader", () => {
      const party = partyService.createParty("p1", "LeaderAlice", "👑", 4);
      expect(party.leaderId).toBe("p1");
      expect(party.members.length).toBe(1);
      expect(party.members[0].isLeader).toBe(true);
      expect(party.status).toBe("CREATED");
    });

    it("invites player and accepts into squad", () => {
      const party = partyService.createParty("p1", "Alice");
      const invite = partyService.invitePlayer(party.id, "p1", "Alice", "p2");

      expect(invite.status).toBe("PENDING");
      expect(party.status).toBe("INVITING");

      const joinedParty = partyService.acceptInvitation(invite.id, "Bob", "🦁");
      expect(joinedParty.members.length).toBe(2);
      expect(joinedParty.members[1].playerId).toBe("p2");
    });

    it("toggles member ready states and auto-transitions party to READY", () => {
      const party = partyService.createParty("p1", "Alice");
      const invite = partyService.invitePlayer(party.id, "p1", "Alice", "p2");
      partyService.acceptInvitation(invite.id, "Bob");

      // Set member ready
      const readyParty = partyService.setMemberReady("p2", true);
      expect(readyParty.status).toBe("READY");
    });

    it("handles leaving and leader reassignment", () => {
      const party = partyService.createParty("p1", "Alice");
      const invite = partyService.invitePlayer(party.id, "p1", "Alice", "p2");
      partyService.acceptInvitation(invite.id, "Bob");

      partyService.leaveParty("p1");
      const updated = partyService.getPlayerParty("p2");
      expect(updated?.leaderId).toBe("p2");
      expect(updated?.members.length).toBe(1);
    });

    it("disbands party cleanly", () => {
      const party = partyService.createParty("p1", "Alice");
      partyService.disbandParty("p1");
      expect(partyService.getPlayerParty("p1")).toBeUndefined();
    });
  });
});
