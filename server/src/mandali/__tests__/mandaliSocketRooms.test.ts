import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { registerMandaliSocketHandlers } from "../MandaliSocketHandlers.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";

/**
 * Who may listen to a Mandali's live conversation.
 *
 * The broadcast room carries every message the group sends. Authenticating a
 * connection proves who someone is, not that they belong to this group — so
 * joining the room is checked against membership, and a connection that
 * re-authenticates as someone else does not keep the previous person's rooms.
 */

function createFakeSocket() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const rooms = new Set<string>();
  const socket = {
    id: "test-socket-1",
    data: {} as Record<string, unknown>,
    rooms,
    on: (event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler);
    },
    join: vi.fn((room: string) => {
      rooms.add(room);
    }),
    leave: vi.fn((room: string) => {
      rooms.delete(room);
    }),
  };
  return { socket, handlers, rooms };
}

describe("Mandali live room membership", () => {
  const OWNER = mintGuestToken();
  const STRANGER = mintGuestToken();
  let service: MandaliService;
  let mandaliId: string;
  let room: string;

  beforeEach(async () => {
    setProgressionRepository(new InMemoryProgressionRepository());
    clearGuestIdentityProvisioningCache();
    service = new MandaliService(new MandaliRepository());
    const created = await service.createMandali(OWNER.playerId, "Owner", "avatar_1", {
      name: "Room Access Test",
      handle: "room-access-test",
      description: "Who may listen in.",
    });
    if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
    mandaliId = created.mandali.id;
    room = `mandali:${mandaliId}`;
  });

  afterEach(() => {
    setProgressionRepository(null);
    vi.restoreAllMocks();
  });

  async function connectAs(token: string) {
    const fake = createFakeSocket();
    registerMandaliSocketHandlers({} as never, fake.socket as never, service);
    await fake.handlers.get("mandali:authenticate")!({ token }, () => undefined);
    return fake;
  }

  it("lets an active member listen to the live conversation", async () => {
    const { handlers, rooms } = await connectAs(OWNER.token);

    await handlers.get("mandali:join_room")!({ mandaliId, playerId: OWNER.playerId });

    expect(rooms.has(room)).toBe(true);
  });

  it("keeps out someone who is signed in but not in this Mandali", async () => {
    const { handlers, rooms } = await connectAs(STRANGER.token);

    await handlers.get("mandali:join_room")!({ mandaliId, playerId: STRANGER.playerId });

    expect(rooms.has(room)).toBe(false);
  });

  it("keeps out a connection that never authenticated", async () => {
    const fake = createFakeSocket();
    registerMandaliSocketHandlers({} as never, fake.socket as never, service);

    await fake.handlers.get("mandali:join_room")!({ mandaliId, playerId: OWNER.playerId });

    expect(fake.rooms.has(room)).toBe(false);
  });

  it("does not let a claimed playerId stand in for the authenticated one", async () => {
    const { handlers, rooms } = await connectAs(STRANGER.token);

    await handlers.get("mandali:join_room")!({ mandaliId, playerId: OWNER.playerId });

    expect(rooms.has(room)).toBe(false);
  });

  it("drops the previous person's rooms when the connection re-authenticates as someone else", async () => {
    const { handlers, rooms } = await connectAs(OWNER.token);
    await handlers.get("mandali:join_room")!({ mandaliId, playerId: OWNER.playerId });
    expect(rooms.has(room)).toBe(true);
    expect(rooms.has(`user:${OWNER.playerId}`)).toBe(true);

    await handlers.get("mandali:authenticate")!({ token: STRANGER.token }, () => undefined);

    expect(rooms.has(room)).toBe(false);
    expect(rooms.has(`user:${OWNER.playerId}`)).toBe(false);
    expect(rooms.has(`user:${STRANGER.playerId}`)).toBe(true);
  });

  it("keeps the same person's rooms when they simply authenticate again", async () => {
    const { handlers, rooms } = await connectAs(OWNER.token);
    await handlers.get("mandali:join_room")!({ mandaliId, playerId: OWNER.playerId });

    await handlers.get("mandali:authenticate")!({ token: OWNER.token }, () => undefined);

    expect(rooms.has(room)).toBe(true);
  });
});
