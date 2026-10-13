import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { AdminPlayerService, MemoryAdminPlayerStore } from "../AdminPlayerService.js";
import { PostgrestError } from "../../persistence/postgrest.js";

describe("canonical admin player inspection", () => {
  let repo: InMemoryProgressionRepository;
  let store: MemoryAdminPlayerStore;
  let service: AdminPlayerService;

  beforeEach(() => {
    repo = new InMemoryProgressionRepository();
    store = new MemoryAdminPlayerStore(repo);
    service = new AdminPlayerService(store, () => ["operator", "protected"]);
  });

  it("pages beyond 100 canonical identities including guests without profiles or wallets", async () => {
    for (let index = 0; index < 125; index++) {
      await repo.upsertIdentity({ playerId: `guest-${String(index).padStart(3, "0")}`, kind: "guest", authUserId: null, lastSeenAt: index });
    }
    const page = await service.list({ page: 13, pageSize: 10, search: "", kind: "all", role: "all" });
    expect(page.total).toBe(125);
    expect(page.users).toHaveLength(5);
    expect(page.users.every(user => user.accountKind === "guest" && user.role === "member" && user.email === "")).toBe(true);
    expect((await service.list({ page: 1, pageSize: 10, search: "guest-124", kind: "guest", role: "member" })).total).toBe(1);
  });

  it("inspection never provisions a profile or identity", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    const identityWrite = vi.spyOn(repo, "upsertIdentity");
    const profileWrite = vi.spyOn(repo, "upsertProfile");
    const details = await service.details("guest");
    expect(details.user.email).toBe("");
    expect(details.coverage.join(" ")).toMatch(/process|durab/i);
    expect(identityWrite).not.toHaveBeenCalled();
    expect(profileWrite).not.toHaveBeenCalled();
    await expect(service.details("missing")).rejects.toMatchObject({ status: 404 });
  });

  it("suspends and resumes with an atomic audit and revision check", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    const disconnected = vi.fn();
    service.onSuspend(disconnected);
    const suspension = await service.moderate("operator", "guest", { action: "suspend", reason: "Abusive messages", expectedRevision: 0 });
    expect(suspension).toMatchObject({ isSuspended: true, revision: 1 });
    expect(service.isDenied("guest")).toBe(true);
    expect(disconnected).toHaveBeenCalledWith("guest");
    await expect(service.moderate("operator", "guest", { action: "resume", reason: "Appeal accepted", expectedRevision: 0 })).rejects.toMatchObject({ status: 409 });
    const resumed = await service.moderate("operator", "guest", { action: "resume", reason: "Appeal accepted", expectedRevision: 1 });
    expect(resumed).toMatchObject({ isSuspended: false, revision: 2 });
    expect(service.isDenied("guest")).toBe(false);
    expect((await service.records("guest", "moderation", 1, 20)).records).toHaveLength(2);
  });

  it("protects superadmins and rejects invalid reasons and revisions", async () => {
    for (const playerId of ["operator", "protected", "guest"]) {
      await repo.upsertIdentity({ playerId, kind: "member", authUserId: playerId, lastSeenAt: 1 });
    }
    for (const target of ["operator", "protected"]) {
      await expect(service.moderate("operator", target, { action: "suspend", reason: "Abuse", expectedRevision: 0 })).rejects.toMatchObject({ status: 403 });
    }
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: " ", expectedRevision: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: -1 })).rejects.toMatchObject({ status: 400 });
  });

  it("hydrates every suspended page and keeps denial on failed resume", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    await service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: 0 });
    const reloaded = new AdminPlayerService(store, () => ["operator"]);
    await reloaded.hydrate();
    expect(reloaded.isDenied("guest")).toBe(true);
    vi.spyOn(store, "writeModeration").mockRejectedValue(new Error("store unavailable"));
    await expect(reloaded.moderate("operator", "guest", { action: "resume", reason: "Appeal", expectedRevision: 1 })).rejects.toThrow();
    expect(reloaded.isDenied("guest")).toBe(true);
    vi.spyOn(store, "suspendedPage").mockRejectedValue(new Error("offline"));
    await expect(reloaded.hydrate()).rejects.toThrow("offline");
  });

  it("does not falsely deny an active identity on a definitive stale suspend", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    await service.moderate("operator", "guest", { action: "resume", reason: "Reviewed", expectedRevision: 0 });
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: 0 })).rejects.toMatchObject({ status: 409 });
    expect(service.isDenied("guest")).toBe(false);
  });

  it("keeps denial on an ambiguous suspend timeout and loads beyond one page", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    const disconnect = vi.fn();
    service.onSuspend(disconnect);
    vi.spyOn(store, "writeModeration").mockRejectedValueOnce(new Error("timeout"));
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: 0 })).rejects.toThrow("timeout");
    expect(service.isDenied("guest")).toBe(true);
    expect(disconnect).toHaveBeenCalledWith("guest");
    const load = vi.spyOn(store, "suspendedPage").mockImplementation(async offset =>
      Array.from({ length: offset === 0 ? 250 : 1 }, (_, index) => ({ id: `blocked-${offset + index}`,
        suspension: { isSuspended: true, reason: "Abuse", updatedAt: 1, revision: 1 } })));
    await service.hydrate();
    expect(load).toHaveBeenNthCalledWith(2, 250, 250);
    expect(service.isDenied("blocked-250")).toBe(true);
  });

  it("rejects revisions outside the database range before denying the identity", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    const write = vi.spyOn(store, "writeModeration");
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: 2147483648 })).rejects.toMatchObject({ status: 400 });
    expect(write).not.toHaveBeenCalled();
    expect(service.isDenied("guest")).toBe(false);
  });

  it("rolls back temporary denial when PostgREST definitively rejects the write", async () => {
    await repo.upsertIdentity({ playerId: "guest", kind: "guest", authUserId: null, lastSeenAt: 1 });
    vi.spyOn(store, "writeModeration").mockRejectedValueOnce(new PostgrestError(400, "admin_moderate_player", "Invalid request"));
    await expect(service.moderate("operator", "guest", { action: "suspend", reason: "Abuse", expectedRevision: 0 })).rejects.toThrow();
    expect(service.isDenied("guest")).toBe(false);
  });
});