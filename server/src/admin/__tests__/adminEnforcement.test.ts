import crypto from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Router } from "express";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createAdminUsersRouter } from "../AdminUsersController.js";
import { AdminPlayerService, MemoryAdminPlayerStore, setAdminPlayerService } from "../AdminPlayerService.js";
import { InMemoryProgressionRepository, setProgressionRepository } from "../../persistence/index.js";
import { attachPlayerIdentity, clearGuestIdentityProvisioningCache, requireIdentity, resolvePlayerIdentity } from "../../auth/identity.js";
import { authRouter } from "../../auth/AuthController.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { resolveIdentity } from "../../rooms/economyIdentity.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { profileRouter } from "../../profile/ProfileController.js";
import { profileService } from "../../profile/ProfileService.js";
import { setUserRole } from "../../security/operationalAuth.js";

const JWT_SECRET = "fixture-only-admin-enforcement-secret";
function memberToken(id: string, email = "person@example.invalid"): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: id, email, aud: "authenticated", iss: "https://example.supabase.co/auth/v1", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${header}.${payload}.${crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url")}`;
}

describe("admin HTTP and identity enforcement", () => {
  let server: TestServer;
  let repo: InMemoryProgressionRepository;
  let service: AdminPlayerService;
  let store: MemoryAdminPlayerStore;
  beforeEach(async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_JWT_SECRET", JWT_SECRET);
    vi.stubEnv("OPERATIONAL_SECRET", "fixture-machine-key");
    vi.stubEnv("ADMIN_USER_IDS", "operator,protected");
    clearVerificationCache();
    clearGuestIdentityProvisioningCache();
    repo = new InMemoryProgressionRepository();
    setProgressionRepository(repo);
    store = new MemoryAdminPlayerStore(repo);
    service = new AdminPlayerService(store);
    setAdminPlayerService(service);
    const app = Router();
    app.use(attachPlayerIdentity);
    app.use("/api/admin/users", createAdminUsersRouter());
    app.use("/api/auth", authRouter);
    app.use("/api/profile", profileRouter);
    app.get("/private", requireIdentity, (_req, res) => res.json({ ok: true }));
    server = await startTestServer(mountRouter("/", app));
  });
  afterEach(async () => {
    await server.close();
    setAdminPlayerService(null);
    setProgressionRepository(null);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    setUserRole("race-target", "member");
  });
  it("allows only verified human superadmins, not machine keys or email-named admins", async () => {
    expect((await server.request("/api/admin/users", { headers: { "x-operational-key": "fixture-machine-key" } })).status).toBe(403);
    expect((await server.request("/api/admin/users", { headers: { authorization: `Bearer ${memberToken("ordinary", "superadmin@example.invalid")}` } })).status).toBe(401);
    const response = await server.request("/api/admin/users?page=1&pageSize=10", { headers: { authorization: `Bearer ${memberToken("operator")}` } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 10 });
    expect((await server.request("/api/admin/users?page=0", { headers: { authorization: `Bearer ${memberToken("operator")}` } })).status).toBe(400);
  });
  it("guest creation provisions a canonical identity without a profile or wallet", async () => {
    const response = await server.request("/api/auth/guest", { method: "POST" });
    expect(response.status).toBe(201);
    const id = (response.body as { playerId: string }).playerId;
    expect(await repo.getIdentity(id)).toMatchObject({ kind: "guest" });
    expect(await repo.getProfile(id)).toBeNull();
  });
  it("suspension blocks private HTTP, renewal and verified socket entry; resume restores the same token", async () => {
    const guest = mintGuestToken();
    await resolvePlayerIdentity(guest.token);
    const headers = { authorization: `Bearer ${memberToken("operator")}`, "Content-Type": "application/json" };
    const path = `/api/admin/users/${guest.playerId}/suspension`;
    expect((await server.request(path, { method: "POST", headers, body: JSON.stringify({ action: "suspend", reason: "Abusive chat", expectedRevision: 0 }) })).status).toBe(200);
    expect((await server.request("/private", { headers: { authorization: `Bearer ${guest.token}` } })).status).toBe(403);
    expect((await server.request("/api/auth/guest/renew", { method: "POST", headers: { authorization: `Bearer ${guest.token}` } })).status).toBe(403);
    await expect(resolveIdentity(null, guest.token)).rejects.toMatchObject({ status: 403 });
    expect((await server.request(path, { method: "POST", headers, body: JSON.stringify({ action: "resume", reason: "Appeal accepted", expectedRevision: 1 }) })).status).toBe(200);
    expect((await server.request("/private", { headers: { authorization: `Bearer ${guest.token}` } })).status).toBe(200);
  });

  it("refuses promotion while moderation is committing", async () => {
    await repo.upsertIdentity({ playerId: "race-target", kind: "member", authUserId: "race-target", lastSeenAt: 1 });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const original = store.writeModeration.bind(store);
    const write = vi.spyOn(store, "writeModeration").mockImplementation(async (...args) => { await pending; return original(...args); });
    const moderation = server.request("/api/admin/users/race-target/suspension", { method: "POST",
      headers: { authorization: `Bearer ${memberToken("operator")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suspend", reason: "Abuse", expectedRevision: 0 }) });
    await vi.waitFor(() => expect(write).toHaveBeenCalled());
    const promotion = await server.request("/api/admin/users/role", { method: "POST",
      headers: { "x-operational-key": "fixture-machine-key", "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "race-target", role: "super_admin", reason: "Promote" }) });
    release();
    await moderation;
    expect(promotion.status).toBe(409);
  });

  it("allows suspended guests to erase only their own profile", async () => {
    const guest = mintGuestToken();
    await resolvePlayerIdentity(guest.token);
    await service.moderate("operator", guest.playerId, { action: "suspend", reason: "Abuse", expectedRevision: 0 });
    const erase = vi.spyOn(profileService, "deleteProfile").mockImplementation(() => true);
    const headers = { authorization: `Bearer ${guest.token}` };
    expect((await server.request(`/api/profile/${guest.playerId}`, { method: "DELETE", headers })).status).toBe(200);
    expect(erase).toHaveBeenCalledWith(guest.playerId);
    expect((await server.request("/api/profile/someone-else", { method: "DELETE", headers })).status).toBe(403);
    expect((await server.request(`/api/profile/${guest.playerId}`, { headers })).status).toBe(403);
  });
});