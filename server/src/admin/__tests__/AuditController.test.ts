import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { startTestServer, mountRouter, type TestServer } from "../../testing/httpTestServer.js";
import { createAuditRouter, type AuditLogEntry } from "../AuditController.js";
import { EconomyService } from "../../economy/EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import type { EconomyRepository } from "../../persistence/EconomyRepository.js";

const OPS_KEY = "test-audit-operational-key-0001";
const HOST_ID = "usr_audit_host_001";

describe("GET /api/admin/audit", () => {
  let server: TestServer;
  let repo: InMemoryEconomyRepository;
  let service: EconomyService;
  const originalSecret = process.env.OPERATIONAL_SECRET;

  beforeEach(async () => {
    process.env.OPERATIONAL_SECRET = OPS_KEY;
    repo = new InMemoryEconomyRepository();
    repo.testFixture.seedIdentity(HOST_ID, "member");
    repo.testFixture.seedWallet({
      identityId: HOST_ID,
      identityKind: "member",
      balance: "10000",
      lifetimeGranted: "10000",
      lifetimeEarned: "0",
      lifetimeSpent: "0",
      lifetimeRefunded: "0",
      starterGranted: true,
      isFrozen: false,
    });

    // A real MATCH_COMMITTED settlement event, produced the same way a live
    // room produces one — not a fabricated row.
    await repo.commitMatchEntry({
      matchId: "match_audit_001",
      roomCode: "AUD001",
      hostIdentityId: HOST_ID,
      seatCount: 2,
      humanSeatCount: 2,
      botSeatCount: 0,
      isSolo: false,
    });

    // A real ADMIN_ADJUSTMENT ledger entry, the same RPC path a super admin
    // top-up in the console goes through.
    await repo.adminAdjustWallet({
      identityId: HOST_ID,
      amountCoins: "500",
      adminPrincipalId: "admin-operator-42",
      reason: "Compensating a support ticket",
      idempotencyKey: "audit-test-topup-1",
    });

    service = new EconomyService(repo);
    server = await startTestServer(mountRouter("/api/admin/audit", createAuditRouter(service)));
  });

  afterEach(async () => {
    await server.close();
    process.env.OPERATIONAL_SECRET = originalSecret;
  });

  it("regression: an anonymous request is refused before touching the repository", async () => {
    const res = await server.request("/api/admin/audit");
    expect(res.status).toBe(401);
  });

  it("merges settlement events and admin wallet adjustments into one real feed", async () => {
    const res = await server.request("/api/admin/audit", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    const body = res.body as { entries: AuditLogEntry[] };

    const settlementEntry = body.entries.find((e) => e.kind === "SETTLEMENT");
    expect(settlementEntry).toBeDefined();
    expect(settlementEntry?.actionCode).toBe("MATCH_COMMITTED");
    expect(settlementEntry?.resourceId).toBe("match_audit_001");
    expect(settlementEntry?.initiatorKind).toBe("system");

    const adjustmentEntry = body.entries.find((e) => e.kind === "WALLET_ADJUSTMENT");
    expect(adjustmentEntry).toBeDefined();
    expect(adjustmentEntry?.actionCode).toBe("ADMIN_ADJUSTMENT");
    expect(adjustmentEntry?.initiatorKind).toBe("admin");
    expect(adjustmentEntry?.initiatorId).toBe("admin-operator-42");
    expect(adjustmentEntry?.detail).toBe("Compensating a support ticket");

    // Never fabricated actor names/roles/IP addresses — only real ids.
    expect(JSON.stringify(body.entries)).not.toMatch(/ipAddress|actorName|actorRole/);
  });

  it("supports filtering to just one kind via ?kind=", async () => {
    const settlementOnly = await server.request("/api/admin/audit?kind=SETTLEMENT", {
      headers: { "x-operational-key": OPS_KEY },
    });
    const settlementBody = settlementOnly.body as { entries: AuditLogEntry[] };
    expect(settlementBody.entries.every((e) => e.kind === "SETTLEMENT")).toBe(true);
    expect(settlementBody.entries.length).toBeGreaterThan(0);

    const adjustmentOnly = await server.request("/api/admin/audit?kind=WALLET_ADJUSTMENT", {
      headers: { "x-operational-key": OPS_KEY },
    });
    const adjustmentBody = adjustmentOnly.body as { entries: AuditLogEntry[] };
    expect(adjustmentBody.entries.every((e) => e.kind === "WALLET_ADJUSTMENT")).toBe(true);
    expect(adjustmentBody.entries.length).toBeGreaterThan(0);
  });

  it("rejects an invalid ?kind= value", async () => {
    const res = await server.request("/api/admin/audit?kind=NOT_A_REAL_KIND", {
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(res.status).toBe(400);
  });

  it("regression: a repository failure is a 503, never a 200 with fabricated rows", async () => {
    const failing = {
      listRecentSettlementEvents: async () => {
        throw new Error("simulated outage");
      },
      listLedgerEntriesByType: async () => [],
    } as unknown as EconomyRepository;
    const failingService = new EconomyService(failing);
    const failingServer = await startTestServer(
      mountRouter("/api/admin/audit", createAuditRouter(failingService)),
    );
    try {
      const res = await failingServer.request("/api/admin/audit", { headers: { "x-operational-key": OPS_KEY } });
      expect(res.status).toBe(503);
      const body = res.body as { entries?: unknown };
      expect(body.entries).toBeUndefined();
    } finally {
      await failingServer.close();
    }
  });
});
