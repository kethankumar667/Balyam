import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createRequire } from "node:module";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import type { PostgrestClient } from "../../persistence/postgrest.js";

/**
 * A coin request being paid, over REAL sockets: a real Socket.IO server, three real client connections
 * (the person who asked, the person who paid, and a bystander in the same group) and the real
 * `MandaliService`. This is the closest a test gets to "two accounts in a Mandali" without a database:
 * the SQL that moves the coins is proven separately on a real Postgres (`npm run verify:mandali`), and
 * which room a signed-in socket joins is proven in `mandaliSocketAuth.test.ts`. What this proves is the
 * part in between: that paying fires the right event, with the right facts, to exactly the right people.
 *
 * The client library is loaded from the client package (the server has no dependency on it), and a
 * missing one fails the test loudly rather than skipping it.
 */
const clientRequire = createRequire(new URL("../../../../client/package.json", import.meta.url));
/** The few things this test uses of a client socket; the real library is loaded above, its types are not (the server does not depend on it). */
interface ClientSocket {
  on(event: string, handler: (payload: Record<string, unknown>) => void): void;
  once(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}
const { io: connect } = clientRequire("socket.io-client") as { io: (url: string, options: Record<string, unknown>) => ClientSocket };

const REQUESTER = "acct_requester";
const PAYER = "acct_payer";
const BYSTANDER = "acct_bystander";
const MANDALI = "m_live";

const fundedRequest = {
  id: "cr_1", mandali_id: MANDALI, message_id: "cr_1_card", requester_identity_id: REQUESTER,
  payer_identity_id: PAYER, funded_by_identity_id: PAYER, amount: 250, status: "FUNDED",
  expires_at: "2099-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", decided_at: "2026-01-01T00:01:00Z",
};

function stubDatabase(): PostgrestClient {
  return {
    rpc: vi.fn(async () => ({ alreadyFunded: false, request: fundedRequest })),
    select: vi.fn(async () => []),
  } as unknown as PostgrestClient;
}

describe("a coin request is paid, over real sockets", () => {
  let http: HttpServer;
  let io: Server;
  let port: number;
  const clients: ClientSocket[] = [];

  /** Connects as an account and records every wallet event it is sent. */
  async function connectAs(identityId: string): Promise<{ socket: ClientSocket; events: Array<Record<string, unknown>> }> {
    const events: Array<Record<string, unknown>> = [];
    const socket = connect(`http://127.0.0.1:${port}`, { auth: { identityId }, transports: ["websocket"], forceNew: true });
    socket.on("mandali:wallet_changed", (payload: Record<string, unknown>) => events.push(payload));
    clients.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", (err) => reject(err));
    });
    return { socket, events };
  }

  const settle = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    http = createServer();
    io = new Server(http);
    // Stand-in for the authenticated join (see mandaliSocketAuth.test.ts): a signed-in socket sits in its own room.
    io.on("connection", (socket) => {
      const id = (socket.handshake.auth as { identityId?: string }).identityId;
      if (id) void socket.join(`user:${id}`);
    });
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    port = (http.address() as AddressInfo).port;
  });

  afterAll(async () => {
    for (const c of clients) c.disconnect();
    io.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  });

  it("tells the person who asked and the person who paid, with who asked, who paid and how much", async () => {
    const asked = await connectAs(REQUESTER);
    const paid = await connectAs(PAYER);
    const service = new MandaliService(new MandaliRepository(stubDatabase()), undefined, io);

    const result = await service.fundCoinRequest("cr_1", PAYER);
    await settle();

    expect(result.success).toBe(true);
    for (const side of [asked, paid]) {
      expect(side.events).toHaveLength(1);
      expect(side.events[0]).toMatchObject({
        mandaliId: MANDALI,
        requestId: "cr_1",
        reason: "coin_request_funded",
        amount: 250,
        requesterIdentityId: REQUESTER,
        fundedByIdentityId: PAYER,
      });
    }
  });

  it("tells nobody else in the group, so nobody celebrates a payment that was not theirs", async () => {
    const bystander = await connectAs(BYSTANDER);
    const service = new MandaliService(new MandaliRepository(stubDatabase()), undefined, io);

    await service.fundCoinRequest("cr_1", PAYER);
    await settle();

    expect(bystander.events).toHaveLength(0);
  });

  it("reaches every device a person has signed in on", async () => {
    const phone = await connectAs(REQUESTER);
    const laptop = await connectAs(REQUESTER);
    const service = new MandaliService(new MandaliRepository(stubDatabase()), undefined, io);

    await service.fundCoinRequest("cr_1", PAYER);
    await settle();

    expect(phone.events.length).toBeGreaterThanOrEqual(1);
    expect(laptop.events.length).toBeGreaterThanOrEqual(1);
  });
});
