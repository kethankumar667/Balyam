import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createAdminUsersRouter, type AdminUserDto } from "../AdminUsersController.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { setUserRole, getUserRole } from "../../security/operationalAuth.js";
import { profileService } from "../../profile/ProfileService.js";

const OPS_KEY = "test-admin-users-operational-key-0001";

describe("AdminUsersController", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.OPERATIONAL_SECRET;

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    server = await startTestServer(mountRouter("/api/admin/users", createAdminUsersRouter()));
  });

  afterEach(async () => {
    await server.close();
    setProgressionRepository(null);
    profileService.reset();
    process.env.OPERATIONAL_SECRET = originalSecret;
  });

  describe("GET /api/admin/users", () => {
    it("refuses anonymous requests with 401", async () => {
      const res = await server.request("/api/admin/users");
      expect(res.status).toBe(401);
    });

    it("returns real user list when authenticated with ops key", async () => {
      // Seed a profile in progression store
      await repo.upsertProfile({
        playerId: "user-alpha-001",
        displayName: "Alpha Tester",
        level: 5,
        experiencePoints: 450,
        joinedAt: Date.now() - 3600000,
        lastSeenAt: Date.now(),
      });

      const res = await server.request("/api/admin/users", {
        headers: { "x-operational-key": OPS_KEY },
      });

      expect(res.status).toBe(200);
      const body = res.body as { users: AdminUserDto[]; total: number };
      expect(body.users.length).toBeGreaterThanOrEqual(1);
      const alpha = body.users.find((u) => u.id === "user-alpha-001");
      expect(alpha).toBeDefined();
      expect(alpha?.name).toBe("Alpha Tester");
      expect(alpha?.isReal).toBe(true);
    });

    it("regression: a player with no gameplay stats yet gets honest zeros, not a fabricated placeholder", async () => {
      // Previously this endpoint hardcoded matchesPlayed/winRate/eloRating/
      // favoriteGame to plausible-looking constants (0, "50%", 1200, "Ludo")
      // for EVERY user regardless of whether they had ever played.
      await repo.upsertProfile({
        playerId: "user-never-played-001",
        displayName: "Never Played",
        level: 1,
        experiencePoints: 0,
        joinedAt: Date.now() - 3600000,
        lastSeenAt: Date.now() - 3600000,
      });

      const res = await server.request("/api/admin/users", { headers: { "x-operational-key": OPS_KEY } });
      const body = res.body as { users: AdminUserDto[] };
      const user = body.users.find((u) => u.id === "user-never-played-001");
      expect(user).toBeDefined();
      expect(user?.matchesPlayed).toBe(0);
      expect(user?.winRate).toBe("0%");
      expect(user?.favoriteGame).toBe("—");
      // A brand-new player's competitive rating still has a real, defined
      // baseline (see calculateCompetitiveRating) — never undefined/NaN.
      expect(typeof user?.rating).toBe("number");
      expect(Number.isNaN(user?.rating)).toBe(false);
    });

    it("reflects a real completed match's stats — the same source the public Leaderboard reads", async () => {
      const playerId = "user-real-match-001";
      await repo.upsertProfile({
        playerId,
        displayName: "Match Player",
        level: 1,
        experiencePoints: 0,
        joinedAt: Date.now() - 7200000,
        lastSeenAt: Date.now() - 7200000,
      });

      const startedAt = Date.now() - 60000;
      const finishedAt = Date.now();
      profileService.recordMatchFinished({
        roomCode: "ADMU01",
        game: "ludo",
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        winnerId: playerId,
        participants: [{ playerId, name: "Match Player", isWinner: true }],
      });

      const res = await server.request("/api/admin/users", { headers: { "x-operational-key": OPS_KEY } });
      const body = res.body as { users: AdminUserDto[] };
      const user = body.users.find((u) => u.id === playerId);
      expect(user).toBeDefined();
      expect(user?.matchesPlayed).toBe(1);
      expect(user?.winRate).toBe("100%");
      expect(user?.favoriteGame).toMatch(/^Ludo/);
      expect(user?.lastActiveAt).not.toBeNull();
    });
  });

  describe("POST /api/admin/users/role", () => {
    it("refuses anonymous role elevation with 401", async () => {
      const res = await server.request("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "u-test-01", role: "super_admin" }),
      });
      expect(res.status).toBe(401);
    });

    it("elevates a user to super_admin and persists dynamic role", async () => {
      const userId = "u-dynamic-super-admin-01";
      const res = await server.request("/api/admin/users/role", {
        method: "POST",
        headers: {
          "x-operational-key": OPS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: "super_admin",
          reason: "Approved via testing console",
        }),
      });

      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; userId: string; role: string };
      expect(body.success).toBe(true);
      expect(body.role).toBe("super_admin");

      // Verify dynamic lookup
      expect(getUserRole(userId)).toBe("super_admin");

      // Demote back to member
      const demoteRes = await server.request("/api/admin/users/role", {
        method: "POST",
        headers: {
          "x-operational-key": OPS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: "member",
          reason: "Demoted to standard member",
        }),
      });
      expect(demoteRes.status).toBe(200);
      expect(getUserRole(userId)).toBe("member");
    });
  });
});
