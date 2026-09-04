import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { startTestServer, type TestServer } from "../../testing/httpTestServer.js";
import { attachPlayerIdentity } from "../../auth/identity.js";
import { clearVerificationCache } from "../../lib/supabaseAuth.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { createEconomyRouter } from "../EconomyController.js";
import { EconomyService } from "../EconomyService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { logger } from "../../lib/logger.js";

/**
 * Real HTTP requests against the real router, real auth middleware, and a
 * real (in-memory) EconomyService — the same "prove it with an actual
 * request" discipline `playerAuthorization.test.ts` established for P0-2.
 */

const JWT_SECRET = "test-jwt-secret-for-economy-api";
const PROJECT_URL = "https://example.supabase.co";
const OPS_KEY = "economy-ops-key-of-sufficient-length-0001";
const ALICE = "aaaaaaaa-1111-2222-3333-444444444444"; // a "member" identity
const BOB = "bbbbbbbb-1111-2222-3333-444444444444"; // a second "member" identity

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function mintMemberToken(sub: string): string {
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub, email: `${sub.slice(0, 5)}@example.com`, aud: "authenticated",
    iss: `${PROJECT_URL}/auth/v1`, exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_JWT_SECRET", "SESSION_SECRET", "OPERATIONAL_SECRET", "ADMIN_API_KEY", "ADMIN_USER_IDS", "NODE_ENV"];
let saved: Record<string, string | undefined> = {};

let server: TestServer;
let repo: InMemoryEconomyRepository;
let service: EconomyService;

beforeEach(async () => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET;
  process.env.SUPABASE_URL = PROJECT_URL;
  process.env.SESSION_SECRET = "deterministic-session-secret-for-economy-api-tests";
  process.env.OPERATIONAL_SECRET = OPS_KEY;
  clearVerificationCache();

  repo = new InMemoryEconomyRepository();
  service = new EconomyService(repo, { delay: async () => undefined });
  server = await startTestServer((app) => {
    app.use(attachPlayerIdentity);
    app.use("/api/economy", createEconomyRouter(service));
  });
});

afterEach(async () => {
  await server.close();
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function seedHost(identityId: string, balance: string, kind: "member" | "guest" = "member"): void {
  repo.testFixture.seedWallet({ identityId, identityKind: kind, balance, lifetimeGranted: balance, starterGranted: true });
}

/* ═══════════════════════ wallet retrieval ════════════════════════════════ */

describe("GET /api/economy/wallet", () => {
  it("returns the caller's own provisioned wallet", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const res = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(200);
    const body = res.body as { wallet: { identityId: string; balance: string } };
    expect(body.wallet.identityId).toBe(ALICE);
    expect(body.wallet.balance).toBe("5000"); // member starter grant
  });

  it("auth failure: an anonymous request is refused before the service is ever called", async () => {
    const res = await server.request("/api/economy/wallet");
    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe("Unauthorized");
  });

  it("works for a guest identity too — wallet endpoints are not member-only", async () => {
    const { playerId, token } = mintGuestToken();
    repo.testFixture.seedIdentity(playerId, "guest");
    const res = await server.request("/api/economy/wallet", { token });
    expect(res.status).toBe(200);
    expect((res.body as { wallet: { balance: string } }).wallet.balance).toBe("2000"); // guest starter grant
  });

  it("service-layer failure propagation: IdentityNotFoundError maps to a structured 404, never a raw throw", async () => {
    // ALICE has a verifiable token but was never seeded into player_identities.
    const res = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(404);
    // Phase 2 added a correlationId to every error response (structured
    // diagnostics) — asserted as "a string", not a fixed value, since it's a
    // fresh UUID per request.
    expect(res.body).toEqual({
      error: "IdentityNotFound",
      message: "No registered identity was found for this account.",
      correlationId: expect.any(String),
    });
  });
});

/* ═══════════════════════ wallet ledger ════════════════════════════════════ */

describe("GET /api/economy/wallet/ledger", () => {
  it("returns the caller's own ledger, newest first", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) }); // provisions
    const res = await server.request("/api/economy/wallet/ledger", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(200);
    const body = res.body as { entries: Array<{ entryType: string }>; hasMore: boolean };
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]?.entryType).toBe("STARTER_GRANT");
    expect(body.hasMore).toBe(false);
  });

  it("validation failure: a non-integer limit is rejected before the service is called", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const res = await server.request("/api/economy/wallet/ledger?limit=notanumber", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe("InvalidRequest");
  });
});

/* ═══════════════════════ checkout quote ═══════════════════════════════════ */

describe("POST /api/economy/checkout/quote", () => {
  it("quotes a 2-seat checkout using the caller's own identity as host", async () => {
    seedHost(ALICE, "1000");
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: 2, humanSeatCount: 2, botSeatCount: 0 }),
    });
    expect(res.status).toBe(200);
    const body = res.body as { quote: { totalCommitment: string; hasSufficientFunds: boolean } };
    expect(body.quote.totalCommitment).toBe("200");
    expect(body.quote.hasSufficientFunds).toBe(true);
  });

  it("checkout quote validation: rejects a non-integer seatCount before the service is called", async () => {
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: "two", humanSeatCount: 2, botSeatCount: 0 }),
    });
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe("InvalidRequest");
  });

  it("service-layer failure propagation: a structurally valid seatCount with no approved economy schedule maps to 422 UnsupportedSeatCount with a truthful message (P0 fix: never a hardcoded upper bound)", async () => {
    seedHost(ALICE, "1000");
    repo.testFixture.removePrizeSchedule(7);
    // 7 is well within the catalog's own largest maximum (Tambola, 12) —
    // structurally ordinary. When no schedule is configured for it, it
    // maps to 422 UnsupportedSeatCount via the real schedule lookup.
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: 7, humanSeatCount: 7, botSeatCount: 0 }),
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toBe("UnsupportedSeatCount");
    expect((res.body as { message: string }).message).toBe("This table size is not yet supported by the game economy.");
  });

  it("checkout quote validation: a genuinely structural mismatch (seatCount 0) still maps to 422 InvalidSeatConfiguration", async () => {
    seedHost(ALICE, "1000");
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: 0, humanSeatCount: 0, botSeatCount: 0 }),
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toBe("InvalidSeatConfiguration");
  });

  it("never trusts a client-supplied hostIdentityId — the quote is always for the caller", async () => {
    seedHost(ALICE, "1000");
    seedHost(BOB, "50000");
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      // Even if a client sends someone else's id, it must be ignored.
      body: JSON.stringify({ hostIdentityId: BOB, seatCount: 2, humanSeatCount: 2, botSeatCount: 0 }),
    });
    expect(res.status).toBe(200);
    expect((res.body as { quote: { hostBalance: string } }).quote.hostBalance).toBe("1000"); // ALICE's, not BOB's
  });
});

/* ═══════════════════════ checkout commit ═══════════════════════════════════ */

describe("POST /api/economy/checkout/commit", () => {
  const commitBody = (overrides: Partial<Record<string, unknown>> = {}) =>
    JSON.stringify({ matchId: "m_api_commit", roomCode: "R1", seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false, ...overrides });

  it("commits successfully and returns 201 with the new settlement", async () => {
    seedHost(ALICE, "1000");
    const res = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody(),
    });
    expect(res.status).toBe(201);
    const body = res.body as { applied: boolean; settlement: { status: string; totalCollected: string } };
    expect(body.applied).toBe(true);
    expect(body.settlement.status).toBe("COMMITTED");
    expect(body.settlement.totalCollected).toBe("200");
  });

  it("commit replay: the same matchId returns 200 (not 201) with applied:false and the ORIGINAL settlement", async () => {
    seedHost(ALICE, "1000");
    const first = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody(),
    });
    const second = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody(),
    });
    expect(second.status).toBe(200);
    const body = second.body as { applied: boolean; settlement: unknown };
    expect(body.applied).toBe(false);
    expect(body.settlement).toEqual((first.body as { settlement: unknown }).settlement);
  });

  it("validation failure: an empty matchId is rejected before the service is called", async () => {
    seedHost(ALICE, "1000");
    const res = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody({ matchId: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("service-layer failure propagation: insufficient funds maps to 422", async () => {
    seedHost(ALICE, "10");
    const res = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody({ matchId: "m_api_poor" }),
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toBe("InsufficientFunds");
  });

  it("service-layer failure propagation: a frozen wallet maps to 403 WalletFrozen", async () => {
    seedHost(ALICE, "1000");
    repo.testFixture.setFrozen(ALICE, true);
    const res = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE), body: commitBody({ matchId: "m_api_frozen" }),
    });
    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toBe("WalletFrozen");
  });

  it("commits only against the caller's OWN wallet, never a body-supplied hostIdentityId", async () => {
    seedHost(ALICE, "1000");
    seedHost(BOB, "1000");
    const res = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: commitBody({ matchId: "m_api_ownership", hostIdentityId: BOB }),
    });
    expect(res.status).toBe(201);
    expect((res.body as { settlement: { hostIdentityId: string } }).settlement.hostIdentityId).toBe(ALICE);
    const bobWallet = await repo.getWallet(BOB);
    expect(bobWallet?.balance).toBe("1000"); // untouched
  });
});

/* ═══════════════════════ settlement lookup ═════════════════════════════════ */

describe("GET /api/economy/settlements/:matchId", () => {
  it("returns the settlement to its own host", async () => {
    seedHost(ALICE, "1000");
    await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ matchId: "m_lookup_1", roomCode: "R1", seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false }),
    });
    const res = await server.request("/api/economy/settlements/m_lookup_1", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(200);
    expect((res.body as { settlement: { matchId: string } }).settlement.matchId).toBe("m_lookup_1");
  });

  it("authorization failure: a non-host caller is refused 403, not shown the record", async () => {
    seedHost(ALICE, "1000");
    seedHost(BOB, "1000");
    await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ matchId: "m_lookup_2", roomCode: "R1", seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false }),
    });
    const res = await server.request("/api/economy/settlements/m_lookup_2", { token: mintMemberToken(BOB) });
    expect(res.status).toBe(403);
    expect((res.body as { error: string }).error).toBe("Forbidden");
  });

  it("returns 404 for a matchId with no settlement", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const res = await server.request("/api/economy/settlements/m_never_existed", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe("MatchNotFound");
  });
});

/* ═══════════════════════ reconcile & stale (operational auth) ═════════════ */

describe("GET /api/economy/settlements/:matchId/reconcile and /stale", () => {
  it("reconcile: refused without operational credentials", async () => {
    const res = await server.request("/api/economy/settlements/m_x/reconcile");
    expect(res.status).toBe(401);
  });

  it("reconcile: succeeds with the operational key and reports a balanced settlement", async () => {
    seedHost(ALICE, "1000");
    await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ matchId: "m_reconcile", roomCode: "R1", seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false }),
    });
    const res = await server.request("/api/economy/settlements/m_reconcile/reconcile", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    expect((res.body as { reconciliation: { matchId: string } }).reconciliation.matchId).toBe("m_reconcile");
  });

  it("stale: refused without operational credentials", async () => {
    const res = await server.request("/api/economy/settlements/stale");
    expect(res.status).toBe(401);
  });

  it("stale: succeeds with the operational key, returns an empty list for a fresh commit", async () => {
    seedHost(ALICE, "1000");
    await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ matchId: "m_stale", roomCode: "R1", seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false }),
    });
    const res = await server.request("/api/economy/settlements/stale", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    expect((res.body as { settlements: unknown[] }).settlements).toEqual([]); // not old enough yet
  });
});

/* ═══════════════════════ world bank (operational auth) ═════════════════════ */

describe("GET /api/economy/world-bank", () => {
  it("refused without operational credentials — not player-facing", async () => {
    const res = await server.request("/api/economy/world-bank", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(401);
  });

  it("returns the treasury snapshot with an operational credential", async () => {
    const res = await server.request("/api/economy/world-bank", { headers: { "x-operational-key": OPS_KEY } });
    expect(res.status).toBe(200);
    const body = res.body as { worldBank: { baseFeeRevenue: string; guestEscrowLiability: string } };
    expect(body.worldBank.baseFeeRevenue).toBe("0");
    expect(body.worldBank.guestEscrowLiability).toBe("0");
  });
});

/* ═══════════════════════ admin wallet lookup & adjustment (operational auth) ═══ */

describe("Admin Wallet Operations (/api/economy/admin/wallet)", () => {
  it("GET /admin/wallet/:identityId refused without operational credentials", async () => {
    const res = await server.request(`/api/economy/admin/wallet/${ALICE}`, { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(401);
  });

  it("GET /admin/wallet/:identityId returns wallet and ledger with operational key", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const res = await server.request(`/api/economy/admin/wallet/${ALICE}`, {
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(res.status).toBe(200);
    const body = res.body as { wallet: { balance: string }; ledger: unknown[] };
    expect(body.wallet).toBeDefined();
    expect(body.ledger).toBeDefined();
  });

  it("POST /admin/wallet/adjust refused without operational credentials", async () => {
    const res = await server.request("/api/economy/admin/wallet/adjust", {
      method: "POST",
      token: mintMemberToken(ALICE),
      body: JSON.stringify({ identityId: ALICE, amountCoins: "1000", reason: "Test top-up" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /admin/wallet/adjust validates required fields", async () => {
    const res = await server.request("/api/economy/admin/wallet/adjust", {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({ identityId: "", amountCoins: "1000" }),
    });
    expect(res.status).toBe(400);

    const res2 = await server.request("/api/economy/admin/wallet/adjust", {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({ identityId: ALICE, amountCoins: "-50" }),
    });
    expect(res2.status).toBe(400);
  });

  it("POST /admin/wallet/adjust credits coins and records ledger entry, and is idempotent", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const adjustRes = await server.request("/api/economy/admin/wallet/adjust", {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({
        identityId: ALICE,
        amountCoins: "2500",
        reason: "VIP operator bonus",
        idempotencyKey: "test-adjust-1",
      }),
    });
    expect(adjustRes.status).toBe(200);
    const body = adjustRes.body as { applied: boolean; result: { balance: string } };
    expect(body.applied).toBe(true);
    // Starter grant is 5000 + 2500 = 7500
    expect(BigInt(body.result.balance)).toBe(7500n);

    // Replay with the same idempotency key
    const replayRes = await server.request("/api/economy/admin/wallet/adjust", {
      method: "POST",
      headers: { "x-operational-key": OPS_KEY },
      body: JSON.stringify({
        identityId: ALICE,
        amountCoins: "2500",
        reason: "VIP operator bonus",
        idempotencyKey: "test-adjust-1",
      }),
    });
    expect(replayRes.status).toBe(200);
    const replayBody = replayRes.body as { applied: boolean; result: { balance: string } };
    expect(replayBody.applied).toBe(false);
    expect(BigInt(replayBody.result.balance)).toBe(7500n);

    // Verify via GET /admin/wallet/:identityId that ledger contains the ADMIN_ADJUSTMENT entry
    const lookupRes = await server.request(`/api/economy/admin/wallet/${ALICE}`, {
      headers: { "x-operational-key": OPS_KEY },
    });
    expect(lookupRes.status).toBe(200);
    const lookupBody = lookupRes.body as {
      wallet: { balance: string };
      ledger: Array<{ entryType: string; amount: string; description: string }>;
    };
    expect(BigInt(lookupBody.wallet.balance)).toBe(7500n);
    const adminEntry = lookupBody.ledger.find((e) => e.entryType === "ADMIN_ADJUSTMENT");
    expect(adminEntry).toBeDefined();
    expect(adminEntry?.amount).toBe("2500");
    expect(adminEntry?.description).toBe("VIP operator bonus");
  });
});

/* ═══════════════════ member wallet — the proven production ledger sequence ═══════════════════
 * Regression for a real incident: production showed STARTER_GRANT(+5000) →
 * BOT_ENTRY_DEBIT(-400) → MATCH_REFUND(+400), a real ledger proving a final
 * balance of 5000 — while the wallet UI displayed 0. That was root-caused as
 * an HTTP/client-side failure (Phase 1), not a backend arithmetic bug — this
 * test exists to keep the BACKEND half of that proof pinned: real starter
 * grant, real bot-match debit, real refund, read back through the exact same
 * `GET /wallet` route the UI calls.
 */
describe("GET /api/economy/wallet — the proven production ledger sequence", () => {
  it("returns 5000 after a real starter grant, a real bot-match debit, and a real refund", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");

    // First touch of any kind grants the starter bonus — captured BEFORE the
    // debit so the assertions below are real arithmetic, not a tautology.
    const beforeDebit = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    const starterGrant = BigInt((beforeDebit.body as { wallet: { balance: string } }).wallet.balance);
    expect(starterGrant).toBe(5000n); // the actual proven production member starter grant

    // 1 human + 1 bot — the exact seat shape production's BOT_ENTRY_DEBIT came from.
    // The cost itself is read from the quote, not hardcoded: it comes from
    // `economy_configurations`, which this in-memory fixture seeds with its
    // own defaults independent of production's — the invariant under test is
    // the ARITHMETIC (starter grant, minus a real debit, plus a real refund,
    // nets back to the exact starter amount), not one specific cost number.
    const quote = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: 2, humanSeatCount: 1, botSeatCount: 1 }),
    });
    expect(quote.status).toBe(200);
    const cost = BigInt((quote.body as { quote: { totalCommitment: string } }).quote.totalCommitment);
    expect(cost).toBeGreaterThan(0n);

    const matchId = "m_proven_ledger_sequence";
    const commit = await server.request("/api/economy/checkout/commit", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ matchId, roomCode: "R1", seatCount: 2, humanSeatCount: 1, botSeatCount: 1, isSolo: false }),
    });
    expect(commit.status).toBe(201);

    const afterDebit = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    expect(BigInt((afterDebit.body as { wallet: { balance: string } }).wallet.balance)).toBe(starterGrant - cost);

    // Refunds are RoomManager-internal (no HTTP route), so this calls the
    // service directly — the exact call `abandonRoom`'s
    // `attemptAbandonmentPersistence` makes.
    await service.refundMatchEntry(matchId, "Room abandoned mid-match — all human players departed");

    const afterRefund = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    expect((afterRefund.body as { wallet: { balance: string } }).wallet.balance).toBe(starterGrant.toString());

    const ledger = await server.request("/api/economy/wallet/ledger", { token: mintMemberToken(ALICE) });
    const entries = (ledger.body as { entries: { entryType: string; amount: string }[] }).entries;
    // Newest first — MATCH_REFUND, BOT_ENTRY_DEBIT, STARTER_GRANT.
    expect(entries.map((e) => e.entryType)).toEqual(["MATCH_REFUND", "BOT_ENTRY_DEBIT", "STARTER_GRANT"]);
    expect(entries.map((e) => BigInt(e.amount))).toEqual([cost, -cost, starterGrant]);
  });
});

/* ═══════════════════════ voucher redemption & status ═══════════════════════ */

async function settleWithGuestWinner(matchId: string, hostId: string): Promise<string> {
  seedHost(hostId, "1000");
  await service.commitMatchEntry({
    matchId, roomCode: "R1", hostIdentityId: hostId, seatCount: 2, humanSeatCount: 2, botSeatCount: 0, isSolo: false,
  });
  repo.testFixture.seedIdentity(`guest_${matchId}`, "guest");
  repo.testFixture.seedIdentity(`member_${matchId}`, "member");
  const result = await service.settleMatchEconomy({
    matchId, isValidRanking: true,
    participants: [
      { identityId: `guest_${matchId}`, identityKind: "guest", placement: 1 },
      { identityId: `member_${matchId}`, identityKind: "member", placement: 2 },
    ],
  });
  return result.issuedVouchers[0]!.rawCode;
}

describe("POST /api/economy/vouchers/redeem", () => {
  it("redeems successfully: 200, applied true, newBalance reflects the credit", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const rawCode = await settleWithGuestWinner("m_api_redeem", "host_redeem");
    const res = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: rawCode }),
    });
    expect(res.status).toBe(200);
    const body = res.body as { applied: boolean; voucher: { status: string }; newBalance: string };
    expect(body.applied).toBe(true);
    expect(body.voucher.status).toBe("REDEEMED");
    expect(body.newBalance).toBe("5150"); // 5000 starter grant + 150
    expect("codeHash" in body.voucher).toBe(false);
  });

  it("voucher replay: the SAME member redeeming again gets applied:false, not an error", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const rawCode = await settleWithGuestWinner("m_api_redeem_replay", "host_redeem_replay");
    await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: rawCode }),
    });
    const second = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: rawCode }),
    });
    expect(second.status).toBe(200);
    expect((second.body as { applied: boolean }).applied).toBe(false);
  });

  it("voucher validation: an empty code is rejected before the service is called", async () => {
    const res = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("authorization failure: a guest is refused 403 before the service is called", async () => {
    const { token } = mintGuestToken();
    const res = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token, body: JSON.stringify({ code: "whatever" }),
    });
    expect(res.status).toBe(403);
  });

  it("structured error response: a bogus code is 422 VoucherNotRedeemable, never leaking which specific reason", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const res = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: "totally-made-up-code" }),
    });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: "VoucherNotRedeemable", message: "This code isn't valid or has already been used." });
  });

  it("a cross-redeemer attempt on an already-redeemed voucher is ALSO merged into VoucherNotRedeemable (oracle prevention)", async () => {
    const rawCode = await settleWithGuestWinner("m_api_cross_redeem", "host_cross");
    repo.testFixture.seedIdentity(ALICE, "member");
    repo.testFixture.seedIdentity(BOB, "member");
    await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: rawCode }),
    });
    const res = await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(BOB), body: JSON.stringify({ code: rawCode }),
    });
    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toBe("VoucherNotRedeemable");
  });
});

describe("GET /api/economy/vouchers/:voucherId", () => {
  it("is public: no credential required", async () => {
    const rawCode = await settleWithGuestWinner("m_api_status", "host_status");
    const res = await server.request(`/api/economy/vouchers/${encodeURIComponent(rawCode)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ voucher: { status: "ACTIVE", coinAmount: "150" } });
  });

  it("returns 404 for a code that matches no voucher", async () => {
    const res = await server.request("/api/economy/vouchers/not-a-real-code");
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBe("VoucherNotFound");
  });
});

/* ═══════════════════════ bigint boundary values ═══════════════════════════ */

describe("Economy API — bigint boundary values over HTTP", () => {
  it("a wallet balance beyond Number.MAX_SAFE_INTEGER survives the full HTTP round trip as an exact string", async () => {
    const huge = "9223372036854775807"; // Postgres bigint max
    repo.testFixture.seedWallet({ identityId: ALICE, identityKind: "member", balance: huge, lifetimeGranted: huge });
    const res = await server.request("/api/economy/wallet", { token: mintMemberToken(ALICE) });
    expect(res.status).toBe(200);
    const body = res.body as { wallet: { balance: string } };
    expect(body.wallet.balance).toBe(huge);
    expect(typeof body.wallet.balance).toBe("string");
    // The corruption this whole remediation effort exists to prevent: had
    // this value ever passed through JSON-as-number, it would come back
    // rounded, not merely re-stringified differently.
    expect(body.wallet.balance).not.toBe(String(Number(huge)));
  });

  it("a huge seat cost quotes an exact, non-rounded totalCommitment over HTTP", async () => {
    const hugeCost = "3000000000000000000";
    repo.testFixture.seedConfiguration(
      { id: "active", version: 1, guestStarterCoins: "2000", memberStarterCoins: "5000", seatCostCoins: hugeCost, isActive: true },
      [{ seatCount: 2, collectedCoins: "0", firstPlaceCoins: "0", secondPlaceCoins: "0", thirdPlaceCoins: "0", worldBankCoins: "0" }],
    );
    seedHost(ALICE, "9223372036854775807");
    const res = await server.request("/api/economy/checkout/quote", {
      method: "POST", token: mintMemberToken(ALICE),
      body: JSON.stringify({ seatCount: 2, humanSeatCount: 2, botSeatCount: 0 }),
    });
    expect(res.status).toBe(200);
    expect((res.body as { quote: { totalCommitment: string } }).quote.totalCommitment).toBe((3000000000000000000n * 2n).toString());
  });
});

/* ═══════════════════════ logging safety ═══════════════════════════════════ */

describe("Economy API — logging never carries voucher secrets", () => {
  let logSpies: Array<{ mockRestore: () => void; mock: { calls: unknown[][] } }>;

  beforeEach(() => {
    logSpies = [
      vi.spyOn(logger, "info").mockImplementation(() => undefined),
      vi.spyOn(logger, "warn").mockImplementation(() => undefined),
      vi.spyOn(logger, "error").mockImplementation(() => undefined),
      vi.spyOn(logger, "debug").mockImplementation(() => undefined),
    ];
  });

  afterEach(() => {
    for (const spy of logSpies) spy.mockRestore();
  });

  it("no logger call across a redeem-then-status-check flow over HTTP contains the raw code", async () => {
    repo.testFixture.seedIdentity(ALICE, "member");
    const rawCode = await settleWithGuestWinner("m_api_log_safety", "host_log_safety");
    await server.request("/api/economy/vouchers/redeem", {
      method: "POST", token: mintMemberToken(ALICE), body: JSON.stringify({ code: rawCode }),
    });
    await server.request(`/api/economy/vouchers/${encodeURIComponent(rawCode)}`);

    const allCalls = logSpies.flatMap((spy) => spy.mock.calls);
    expect(allCalls.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(allCalls);
    expect(serialized).not.toContain(rawCode);
  });
});
