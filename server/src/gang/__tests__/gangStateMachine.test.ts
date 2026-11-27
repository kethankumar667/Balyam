import { describe, it, expect, beforeEach } from "vitest";
import { MembershipStateMachine } from "../MembershipStateMachine.js";
import { GangRepository } from "../GangRepository.js";
import { GangService } from "../GangService.js";
import { hasGangPermission } from "@shared/gang/permissions.js";

describe("Gang Membership State Machine", () => {
  it("allows transition from ACTIVE to REMOVED by a moderator/admin", () => {
    const result = MembershipStateMachine.transitionMembership(
      "ACTIVE",
      "REMOVED",
      "admin_1",
      "Admin User",
      "gang_1",
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
      "gang_1",
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
      "gang_1",
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
      "gang_1",
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
      "gang_1",
      "applicant_1"
    );
    expect(approve.success).toBe(true);
    expect(approve.auditEntry?.action).toBe("APPLICATION_APPROVED");

    const reject = MembershipStateMachine.transitionApplication(
      "SUBMITTED",
      "REJECTED",
      "mod_1",
      "Moderator",
      "gang_1",
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
      "gang_1",
      "applicant_2"
    );
    expect(invalid.success).toBe(false);
  });

  it("validates role permissions strictly", () => {
    expect(hasGangPermission("OWNER", "TRANSFER_OWNERSHIP")).toBe(true);
    expect(hasGangPermission("LEADER", "TRANSFER_OWNERSHIP")).toBe(false);
    expect(hasGangPermission("MEMBER", "TRANSFER_OWNERSHIP")).toBe(false);

    expect(hasGangPermission("LEADER", "KICK_MEMBERS")).toBe(true);
    expect(hasGangPermission("MODERATOR", "KICK_MEMBERS")).toBe(true);
    expect(hasGangPermission("MODERATOR", "DELETE_MESSAGES")).toBe(true);
    expect(hasGangPermission("MEMBER", "DELETE_MESSAGES")).toBe(false);

    expect(hasGangPermission("MEMBER", "LAUNCH_PARTIES")).toBe(true);
    expect(hasGangPermission("MEMBER", "INVITE_MEMBERS")).toBe(true);
  });
});

describe("Gang Service & M-10 Game Launch Handoff", () => {
  let repo: GangRepository;
  let service: GangService;

  beforeEach(() => {
    repo = new GangRepository();
    service = new GangService(repo);
  });

  it("creates a new Gang with unique handle and founder member", async () => {
    const result = await service.createGang("player_1", "Kethan", "avatar_1", {
      handle: "telugu-warriors",
      name: "Telugu Warriors",
      description: "Traditional games and weekend tournaments",
      language: "Telugu",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(true);
    expect(result.gang).toBeDefined();
    expect(result.gang?.handle).toBe("telugu-warriors");
    expect(result.gang?.ownerId).toBe("player_1");

    const members = await service.getMembers(result.gang!.id);
    expect(members.length).toBe(1);
    expect(members[0]!.role).toBe("OWNER");
    expect(members[0]!.playerId).toBe("player_1");
  });

  it("rejects duplicate handles", async () => {
    await service.createGang("p1", "User 1", "av1", {
      handle: "unique-clan",
      name: "Clan 1",
      description: "Description",
    });

    const dup = await service.createGang("p2", "User 2", "av2", {
      handle: "unique-clan",
      name: "Clan 2",
      description: "Another description",
    });

    expect(dup.success).toBe(false);
    expect(dup.error).toContain("already taken");
  });
});
