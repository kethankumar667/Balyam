import { describe, it, expect, beforeEach } from "vitest";
import { MembershipStateMachine } from "../MembershipStateMachine.js";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { hasMandaliPermission } from "@shared/mandali/permissions.js";

describe("Mandali Membership State Machine", () => {
  it("allows transition from ACTIVE to REMOVED by a moderator/admin", () => {
    const result = MembershipStateMachine.transitionMembership(
      "ACTIVE",
      "REMOVED",
      "admin_1",
      "Admin User",
      "mandali_1",
      "member_1",
      "Inappropriate behavior"
    );

    expect(result.success).toBe(true);
    expect(result.newState).toBe("REMOVED");
    expect(result.auditEntry).toBeDefined();
    expect(result.auditEntry?.action).toBe("MEMBERSHIP_REMOVED");
    expect(result.auditEntry?.actorId).toBe("admin_1");
  });

  it("allows transition from ACTIVE to BANNED with proper audit log", () => {
    const result = MembershipStateMachine.transitionMembership(
      "ACTIVE",
      "BANNED",
      "owner_1",
      "Owner User",
      "mandali_1",
      "bad_actor_1",
      "Severe violation"
    );

    expect(result.success).toBe(true);
    expect(result.newState).toBe("BANNED");
    expect(result.auditEntry?.action).toBe("MEMBERSHIP_BANNED");
  });

  it("blocks a BANNED member from transitioning back to ACTIVE directly without unban", () => {
    const result = MembershipStateMachine.transitionMembership(
      "BANNED",
      "ACTIVE",
      "bad_actor_1",
      "Bad Actor",
      "mandali_1",
      "bad_actor_1",
      "Trying to rejoin"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Banned members cannot be activated");
  });

  it("allows unbanning a BANNED user to REMOVED", () => {
    const unbanResult = MembershipStateMachine.transitionMembership(
      "BANNED",
      "REMOVED",
      "owner_1",
      "Owner User",
      "mandali_1",
      "bad_actor_1",
      "Appeal accepted"
    );

    expect(unbanResult.success).toBe(true);
    expect(unbanResult.newState).toBe("REMOVED");
    expect(unbanResult.auditEntry?.action).toBe("MEMBERSHIP_REMOVED");
  });

  it("handles application transitions correctly", () => {
    const approve = MembershipStateMachine.transitionApplication(
      "SUBMITTED",
      "APPROVED",
      "mod_1",
      "Moderator",
      "mandali_1",
      "applicant_1"
    );
    expect(approve.success).toBe(true);
    expect(approve.auditEntry?.action).toBe("APPLICATION_APPROVED");

    const reject = MembershipStateMachine.transitionApplication(
      "SUBMITTED",
      "REJECTED",
      "mod_1",
      "Moderator",
      "mandali_1",
      "applicant_2",
      "Profile too new"
    );
    expect(reject.success).toBe(true);
    expect(reject.auditEntry?.action).toBe("APPLICATION_REJECTED");

    // Invalid transition
    const invalid = MembershipStateMachine.transitionApplication(
      "REJECTED",
      "APPROVED",
      "mod_1",
      "Moderator",
      "mandali_1",
      "applicant_2"
    );
    expect(invalid.success).toBe(false);
  });

  it("validates role permissions strictly", () => {
    expect(hasMandaliPermission("OWNER", "TRANSFER_OWNERSHIP")).toBe(true);
    expect(hasMandaliPermission("LEADER", "TRANSFER_OWNERSHIP")).toBe(false);
    expect(hasMandaliPermission("MEMBER", "TRANSFER_OWNERSHIP")).toBe(false);

    expect(hasMandaliPermission("LEADER", "KICK_MEMBERS")).toBe(true);
    expect(hasMandaliPermission("MODERATOR", "KICK_MEMBERS")).toBe(true);
    expect(hasMandaliPermission("MODERATOR", "DELETE_MESSAGES")).toBe(true);
    expect(hasMandaliPermission("MEMBER", "DELETE_MESSAGES")).toBe(false);

    expect(hasMandaliPermission("MEMBER", "LAUNCH_PARTIES")).toBe(true);
    expect(hasMandaliPermission("MEMBER", "INVITE_MEMBERS")).toBe(true);
  });
});

describe("Mandali Service & M-10 Game Launch Handoff", () => {
  let repo: MandaliRepository;
  let service: MandaliService;

  beforeEach(() => {
    repo = new MandaliRepository();
    service = new MandaliService(repo);
  });

  it("creates a new Mandali with unique handle and founder member", async () => {
    const result = await service.createMandali("player_1", "Kethan", "avatar_1", {
      handle: "telugu-warriors",
      name: "Telugu Warriors",
      description: "Traditional games and weekend tournaments",
      language: "Telugu",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(true);
    expect(result.mandali).toBeDefined();
    expect(result.mandali?.handle).toBe("telugu-warriors");
    expect(result.mandali?.ownerId).toBe("player_1");

    const members = await service.getMembers(result.mandali!.id);
    expect(members.length).toBe(1);
    expect(members[0]!.role).toBe("OWNER");
    expect(members[0]!.playerId).toBe("player_1");
  });

  it("rejects duplicate handles", async () => {
    await service.createMandali("p1", "User 1", "av1", {
      handle: "unique-clan",
      name: "Clan 1",
      description: "Description",
    });

    const dup = await service.createMandali("p2", "User 2", "av2", {
      handle: "unique-clan",
      name: "Clan 2",
      description: "Another description",
    });

    expect(dup.success).toBe(false);
    expect(dup.error).toContain("already taken");
  });

  it("coordinates party formation and M-10 game launch handoff", async () => {
    const mandaliRes = await service.createMandali("host_1", "Host", "av1", {
      handle: "ludo-squad-zone",
      name: "Ludo Squad Zone",
      description: "Ludo match lovers",
    });
    const mandaliId = mandaliRes.mandali!.id;

    // Join another member
    await service.applyToMandali(mandaliId, "player_2", "Player Two", "av2");

    // Host creates party
    const partyRes = service.createParty(
      mandaliId,
      "host_1",
      "Host",
      "av1",
      "ludo",
      "classic",
      "Friday Ludo Showdown",
      4
    );
    expect(partyRes.success).toBe(true);
    const partyId = partyRes.party!.partyId;

    // Player 2 joins party
    const joinRes = service.joinParty(mandaliId, partyId, "player_2", "Player Two", "av2");
    expect(joinRes.success).toBe(true);
    expect(joinRes.party?.members.length).toBe(2);

    // Host launches party into game (M-10 Handoff)
    const launchRes = service.launchPartyToGame(mandaliId, partyId, "host_1");
    expect(launchRes.success).toBe(true);
    expect(launchRes.roomCode).toBeDefined();
    expect(launchRes.roomCode?.length).toBe(6);
    expect(launchRes.game).toBe("ludo");

    // Verify party status updated to IN_GAME
    const updatedParties = service.getParties(mandaliId);
    const inGameParty = updatedParties.find((p) => p.partyId === partyId);
    expect(inGameParty?.status).toBe("IN_GAME");
    expect(inGameParty?.roomCode).toBe(launchRes.roomCode);
  });
});
