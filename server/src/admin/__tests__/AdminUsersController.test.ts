import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createAdminUsersRouter, type AdminUserDto } from "../AdminUsersController.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { setUserRole, getUserRole } from "../../security/operationalAuth.js";
import { profileService } from "../../profile/ProfileService.js";
import { progressionSync } from "../../persistence/ProgressionSync.js";
import { AdminPlayerService, MemoryAdminPlayerStore, setAdminPlayerService } from "../AdminPlayerService.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";

const OPS_KEY = "test-admin-users-operational-key-0001";
const JWT_SECRET = "fixture-admin-users-jwt-signing-secret";
function adminHeaders(): Record<string, string> {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ sub: "directory-operator", aud: "authenticated", iss: "https://example.supabase.co/auth/v1", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return { authorization: `Bearer ${header}.${body}.${signature}` };
}

describe("AdminUsersController", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  const originalSecret = process.env.OPERATIONAL_SECRET;

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    vi.stubEnv("ADMIN_USER_IDS", "directory-operator");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_JWT_SECRET", JWT_SECRET);
    clearVerificationCache();
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    setAdminPlayerService(new AdminPlayerService(new MemoryAdminPlayerStore(repo)));
    for (const playerId of ["user-alpha-001", "user-never-played-001", "user-real-match-001"]) {
      await repo.upsertIdentity({ playerId, kind: "member", authUserId: playerId, lastSeenAt: Date.now() });
    }
    server = await startTestServer(mountRouter("/api/admin/users", createAdminUsersRouter()));
  });

  afterEach(async () => {
    await server.close();
    await progressionSync.drain();
    setAdminPlayerService(null);
    setProgressionRepository(null);
    profileService.reset();
    process.env.OPERATIONAL_SECRET = originalSecret;
    vi.unstubAllEnvs();
  });

  describe("GET /api/admin/users", () => {
    it("refuses anonymous requests with 401", async () => {
      const res = await server.request("/api/admin/users");
      expect(res.status).toBe(401);
    });

    it("returns canonical users to a verified human superadmin", async () => {
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
        headers: adminHeaders(),
      });

      expect(res.status).toBe(200);
      const body = res.body as { users: AdminUserDto[]; total: number };
      expect(body.users.length).toBeGreaterThanOrEqual(1);
      const alpha = body.users.find((u) => u.id === "user-alpha-001");
      expect(alpha).toBeDefined();
      expect(alpha?.name).toBe("Alpha Tester");
      expect(alpha?.accountKind).toBe("member");
      expect(alpha?.email).toBe("");
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

      const res = await server.request("/api/admin/users", { headers: adminHeaders() });
      const body = res.body as { users: AdminUserDto[] };
      const user = body.users.find((u) => u.id === "user-never-played-001");
      expect(user).toBeDefined();
      expect(user?.matchesPlayed).toBe(0);
      expect(user?.winRate).toBe("0%");
      expect(user?.favoriteGame).toBe("none");
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

      await progressionSync.drain();
      const res = await server.request("/api/admin/users", { headers: adminHeaders() });
      const body = res.body as { users: AdminUserDto[] };
      const user = body.users.find((u) => u.id === playerId);
      expect(user).toBeDefined();
      expect(user?.matchesPlayed).toBe(1);
      expect(user?.winRate).toBe("100%");
      expect(user?.favoriteGame).toBe("ludo");
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
