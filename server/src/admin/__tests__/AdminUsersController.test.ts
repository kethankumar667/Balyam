import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createAdminUsersRouter } from "../AdminUsersController.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import { setUserRole, getUserRole } from "../../security/operationalAuth.js";

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
      const body = res.body as { users: Array<{ id: string; name: string; isReal: boolean }>; total: number };
      expect(body.users.length).toBeGreaterThanOrEqual(1);
      const alpha = body.users.find((u) => u.id === "user-alpha-001");
      expect(alpha).toBeDefined();
      expect(alpha?.name).toBe("Alpha Tester");
      expect(alpha?.isReal).toBe(true);
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
