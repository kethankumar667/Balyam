import { describe, it, expect, beforeEach, vi } from "vitest";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { InMemoryEconomyRepository } from "../../persistence/InMemoryEconomyRepository.js";
import { EconomyService } from "../../economy/EconomyService.js";
import type { PostgrestClient } from "../../persistence/postgrest.js";
import { MANDALI_COIN_AMOUNT, MANDALI_COIN_REQUEST_COOLDOWN_MS } from "@shared/mandali/coinRules.js";

/**
 * Durable-mode coin rules, against a fake PostgREST client. The real SQL
 * (cooldown atomicity, funding races) is proven separately against a real
 * Postgres by `npm run verify:mandali`; these tests pin what the Node layer
 * adds on top: the fixed amount, mapping the database's COOLDOWN error into a
 * retry time, the countdown lookup, and that SEND works when members live in
 * Postgres rather than the in-memory map.
 */

const REQUESTER = "guest_requester";
const PAYER = "guest_payer";
const MANDALI = "m_durable";

const memberRow = (identityId: string, name: string) => ({
  mandali_id: MANDALI, identity_id: identityId, display_name: name, avatar: "a1",
  role: "MEMBER", state: "ACTIVE", joined_at: "2026-01-01T00:00:00Z",
});

function fakePostgrest(overrides: {
  rpc?: (fn: string, args: Record<string, unknown>) => unknown;
  select?: (table: string, query: string) => unknown[];
} = {}) {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (overrides.rpc) return overrides.rpc(fn, args);
    throw new Error(`unexpected rpc ${fn}`);
  });
  const select = vi.fn(async (table: string, query: string) => {
    if (overrides.select) return overrides.select(table, query);
    return [];
  });
  return { client: { rpc, select } as unknown as PostgrestClient, rpc, select };
}

/** PostgREST wraps the plpgsql RAISE text in a JSON body; PostgrestError puts the whole body in `.message`. */
const postgrestError = (message: string) => new Error(JSON.stringify({ code: "P0001", message }));

const coinRequestRow = (status = "OPEN") => ({
  id: "cr_1", mandali_id: MANDALI, message_id: "cr_1_card", requester_identity_id: REQUESTER,
  payer_identity_id: PAYER, amount: 100, status,
  expires_at: "2099-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", decided_at: null,
});

const cardMessageRow = {
  message_id: "cr_1_card", mandali_id: MANDALI, channel_id: "c1", sequence: 1,
  sender_identity_id: REQUESTER, sender_role: "MEMBER", kind: "COIN_REQUEST", content: "Requested 100 coins",
  reply_to_id: null, pinned: false, deleted_at: null, created_at: "2026-01-01T00:00:00Z",
};

/** A socket.io server stand-in that records what was emitted to which room. */
function fakeIo() {
  const emitted: Array<{ room: string; event: string; payload: any }> = [];
  const io = {
    to: (room: string) => ({ emit: (event: string, payload: unknown) => emitted.push({ room, event, payload }) }),
  };
  return { io: io as never, emitted };
}

describe("Mandali live updates", () => {
  it("broadcasts a new coin request to the whole Mandali — the person asked has to be told", async () => {
    const { io, emitted } = fakeIo();
    const { client } = fakePostgrest({
      rpc: () => coinRequestRow(),
      select: (table) => (table === "mandali_messages" ? [cardMessageRow] : table === "mandali_memberships" ? [memberRow(REQUESTER, "Req")] : []),
    });
    const service = new MandaliService(new MandaliRepository(client), undefined, io);

    await service.createCoinRequest({ mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100 });

    const event = emitted.find((e) => e.event === "mandali:coin_request:updated");
    expect(event?.room).toBe(`mandali:${MANDALI}`);
    expect(event?.payload.request.payerIdentityId).toBe(PAYER);
    // The card message rides along, so it shows up as a placeholder in everyone's chat…
    expect(event?.payload.message.kind).toBe("COIN_REQUEST");
    // …with the request record the card needs to render its Pay button.
    expect(event?.payload.request.messageId).toBe(event?.payload.message.messageId);
  });

  it("still delivers the request if the card message cannot be loaded", async () => {
    const { io, emitted } = fakeIo();
    const { client } = fakePostgrest({
      rpc: () => coinRequestRow(),
      select: () => { throw new Error("db hiccup"); },
    });
    const service = new MandaliService(new MandaliRepository(client), undefined, io);

    const result = await service.createCoinRequest({ mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100 });

    expect(result.success).toBe(true);
    const event = emitted.find((e) => e.event === "mandali:coin_request:updated");
    expect(event?.payload.request.id).toBe("cr_1");
    expect(event?.payload.message).toBeUndefined();
  });

  it("broadcasts the paid request so the requester's card flips to Paid without a refresh", async () => {
    const { io, emitted } = fakeIo();
    const { client } = fakePostgrest({
      rpc: () => ({ alreadyFunded: false, request: coinRequestRow("FUNDED") }),
    });
    const service = new MandaliService(new MandaliRepository(client), undefined, io);

    await service.fundCoinRequest("cr_1", PAYER);

    const event = emitted.find((e) => e.event === "mandali:coin_request:updated");
    expect(event?.room).toBe(`mandali:${MANDALI}`);
    expect(event?.payload.request.status).toBe("FUNDED");
  });

  it("does not broadcast when the request is refused", async () => {
    const { io, emitted } = fakeIo();
    const { client } = fakePostgrest({ rpc: () => { throw postgrestError("COOLDOWN: retry_after_seconds=60"); } });
    const service = new MandaliService(new MandaliRepository(client), undefined, io);

    await service.createCoinRequest({ mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100 });

    expect(emitted).toHaveLength(0);
  });

  it.each([
    ["promoteMember", (s: MandaliService) => s.promoteMember(MANDALI, "owner", PAYER)],
    ["kickMember", (s: MandaliService) => s.kickMember(MANDALI, "owner", "Owner", PAYER, "spam")],
    ["setMessagePin", (s: MandaliService) => s.setMessagePin(MANDALI, "msg_1", "owner", true)],
    ["deleteMessage", (s: MandaliService) => s.deleteMessage(MANDALI, "msg_1", "owner")],
  ])("%s tells everyone in the Mandali to refresh", async (_name, act) => {
    const { io, emitted } = fakeIo();
    const { client } = fakePostgrest({ rpc: () => ({}) });
    const service = new MandaliService(new MandaliRepository(client), undefined, io);

    const result = await act(service);

    expect(result.success).toBe(true);
    expect(emitted.some((e) => e.event === "mandali:changed" && e.room === `mandali:${MANDALI}`)).toBe(true);
  });
});

describe("Mandali coin rules (durable mode)", () => {
  describe("createCoinRequest", () => {
    it.each([1, 50, 99, 101, 500])("refuses a request for %i coins before touching the database", async (amount) => {
      const { client, rpc } = fakePostgrest();
      const service = new MandaliService(new MandaliRepository(client));

      const result = await service.createCoinRequest({
        mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(`${MANDALI_COIN_AMOUNT} coins`);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("passes the fixed amount and the 4-hour window down to the database", async () => {
      const { client, rpc } = fakePostgrest({
        rpc: () => ({
          id: "cr_1", mandali_id: MANDALI, message_id: "cr_1_card", requester_identity_id: REQUESTER,
          payer_identity_id: PAYER, amount: 100, status: "OPEN",
          expires_at: "2099-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", decided_at: null,
        }),
      });
      const service = new MandaliService(new MandaliRepository(client));

      const result = await service.createCoinRequest({
        mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100,
      });

      expect(result.success).toBe(true);
      const [fn, args] = rpc.mock.calls[0];
      expect(fn).toBe("create_coin_request");
      expect(args.p_amount).toBe(MANDALI_COIN_AMOUNT);
      expect(args.p_cooldown_seconds).toBe(MANDALI_COIN_REQUEST_COOLDOWN_MS / 1000);
    });

    it("turns the database's COOLDOWN error into a friendly message plus the time remaining", async () => {
      const { client } = fakePostgrest({
        rpc: () => { throw postgrestError("COOLDOWN: retry_after_seconds=9000"); },
      });
      const service = new MandaliService(new MandaliRepository(client));

      const result = await service.createCoinRequest({
        mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.retryAfterMs).toBe(9_000_000);
      expect(result.error).not.toMatch(/retry_after_seconds|COOLDOWN/);
    });

    it("does not report a retry time for unrelated database failures", async () => {
      const { client } = fakePostgrest({
        rpc: () => { throw postgrestError("NOT_ACTIVE_MEMBER: requester must be an active member"); },
      });
      const service = new MandaliService(new MandaliRepository(client));

      const result = await service.createCoinRequest({
        mandaliId: MANDALI, channelId: "c1", requesterId: REQUESTER, payerId: PAYER, amount: 100,
      });

      expect(result.success).toBe(false);
      expect(result.retryAfterMs).toBeUndefined();
      expect(result.error).toBe("requester must be an active member");
    });
  });

  describe("getCoinRequestCooldown", () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    it("is zero for someone who has never asked", async () => {
      const { client } = fakePostgrest({ select: () => [] });
      const service = new MandaliService(new MandaliRepository(client));

      expect(await service.getCoinRequestCooldown(REQUESTER)).toEqual({ retryAfterMs: 0 });
    });

    it("counts down from the last request", async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { client } = fakePostgrest({ select: () => [{ created_at: oneHourAgo }] });
      const service = new MandaliService(new MandaliRepository(client));

      const { retryAfterMs } = await service.getCoinRequestCooldown(REQUESTER);

      const threeHours = 3 * 60 * 60 * 1000;
      expect(retryAfterMs).toBeGreaterThan(threeHours - 5_000);
      expect(retryAfterMs).toBeLessThanOrEqual(threeHours);
    });

    it("is zero once the window has passed", async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const { client } = fakePostgrest({ select: () => [{ created_at: fiveHoursAgo }] });
      const service = new MandaliService(new MandaliRepository(client));

      expect(await service.getCoinRequestCooldown(REQUESTER)).toEqual({ retryAfterMs: 0 });
    });

    it("looks up the caller's own requests, newest first, one row", async () => {
      const { client, select } = fakePostgrest({ select: () => [] });
      const service = new MandaliService(new MandaliRepository(client));

      await service.getCoinRequestCooldown(REQUESTER);

      const [table, query] = select.mock.calls[0];
      expect(table).toBe("mandali_coin_requests");
      expect(query).toContain(`requester_identity_id=eq.${REQUESTER}`);
      expect(query).toContain("order=created_at.desc");
      expect(query).toContain("limit=1");
    });
  });

  describe("transferCoins when members live in Postgres", () => {
    it("recognises real members instead of rejecting them from an empty in-memory map", async () => {
      const economyRepo = new InMemoryEconomyRepository();
      economyRepo.testFixture.seedIdentity(REQUESTER, "member");
      economyRepo.testFixture.seedIdentity(PAYER, "member");
      await economyRepo.ensureWallet(REQUESTER);
      await economyRepo.ensureWallet(PAYER);
      const economyService = new EconomyService(economyRepo);
      const before = BigInt((await economyService.getWallet(REQUESTER)).balance);

      const { client } = fakePostgrest({
        select: (table, query) => {
          if (table === "mandali_memberships") {
            return [query.includes(`identity_id=eq.${REQUESTER}`) ? memberRow(REQUESTER, "Req") : memberRow(PAYER, "Pay")];
          }
          if (table === "mandali_channels") {
            return [{ channel_id: "c1", mandali_id: MANDALI, name: "lounge-chat", type: "TEXT", is_archived: false, position: 1 }];
          }
          return [];
        },
        rpc: (fn) => {
          if (fn === "send_mandali_message") throw new Error("announcement not under test");
          throw new Error(`unexpected rpc ${fn}`);
        },
      });
      const service = new MandaliService(new MandaliRepository(client), undefined, undefined, economyService);

      const result = await service.transferCoins(MANDALI, REQUESTER, { toPlayerId: PAYER, amount: 100, type: "SEND" });

      expect(result.success).toBe(true);
      expect(BigInt((await economyService.getWallet(REQUESTER)).balance)).toBe(before - 100n);
    });
  });
});
