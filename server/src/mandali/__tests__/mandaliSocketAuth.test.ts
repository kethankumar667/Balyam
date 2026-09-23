import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { registerMandaliSocketHandlers } from "../MandaliSocketHandlers.js";
import { mintGuestToken } from "../../auth/guestToken.js";
import { clearGuestIdentityProvisioningCache } from "../../auth/identity.js";
import { InMemoryProgressionRepository } from "../../persistence/InMemoryProgressionRepository.js";
import { setProgressionRepository } from "../../persistence/index.js";
import type { MandaliMember } from "@shared/mandali/types.js";

/**
 * Regression coverage for the actor-spoofing hole this session closed:
 * every mandali:* socket handler used to trust `payload.playerId` /
 * `payload.leaderId` verbatim, so any client could claim to be any member.
 * Proves the fix end-to-end through the REAL `registerMandaliSocketHandlers`
 * (not a re-implementation of it) — a captured `mandali:chat:send` handler,
 * invoked with a payload naming a different member than the one who
 * authenticated the connection, must still record the message as the
 * authenticated member, never the claimed one.
 */

/** Minimal fake Socket.IO `Socket` — captures registered handlers so tests
 * can invoke the real production handler functions directly. */
function createFakeSocket() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const socket = {
    id: "test-socket-1",
    data: {} as Record<string, unknown>,
    on: (event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler);
    },
    join: vi.fn(),
    leave: vi.fn(),
  };
  return { socket, handlers };
}

function ackSpy() {
  const calls: unknown[] = [];
  const ack = (res: unknown) => calls.push(res);
  return { ack, calls };
}

describe("Mandali socket handlers — actor identity comes from the authenticated connection, never the payload", () => {
  let repository: MandaliRepository;
  let service: MandaliService;
  let mandaliId: string;
  const OWNER = mintGuestToken();
  const OTHER = mintGuestToken();

  beforeEach(async () => {
    setProgressionRepository(new InMemoryProgressionRepository());
    clearGuestIdentityProvisioningCache();

    repository = new MandaliRepository();
    service = new MandaliService(repository);

    const created = await service.createMandali(OWNER.playerId, "Owner", "avatar_1", {
      name: "Socket Auth Test Mandali",
      handle: "socket-auth-test",
      description: "Regression coverage for Mandali socket authentication.",
    });
    if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
    mandaliId = created.mandali.id;

    const otherMember: MandaliMember = {
      memberId: `mem_${OTHER.playerId}`,
      mandaliId,
      playerId: OTHER.playerId,
      displayName: "Other Member",
      avatar: "avatar_2",
      role: "MEMBER",
      state: "ACTIVE",
      joinedAt: Date.now(),
      presence: "online",
      contributionScore: 0,
    };
    repository.saveMember(otherMember);
  });

  afterEach(() => {
    setProgressionRepository(null);
    vi.restoreAllMocks();
  });

  it("refuses mandali:chat:send before mandali:authenticate has succeeded", async () => {
    const { socket, handlers } = createFakeSocket();
    registerMandaliSocketHandlers({} as never, socket as never, service);
    const { ack, calls } = ackSpy();

    const channelId = (await service.getChannels(mandaliId)).find((c) => c.name === "lounge-chat")!.channelId;
    await handlers.get("mandali:chat:send")!(
      { mandaliId, channelId, playerId: OWNER.playerId, content: "should not land" },
      ack
    );

    expect(calls[0]).toMatchObject({ success: false });
    expect(String((calls[0] as { error?: string }).error)).toMatch(/authenticat/i);
    expect(await service.getMessages(channelId, 50)).toHaveLength(0);
  });

  it("attributes a sent message to the AUTHENTICATED socket identity, not a claimed payload.playerId", async () => {
    const { socket, handlers } = createFakeSocket();
    registerMandaliSocketHandlers({} as never, socket as never, service);

    // Authenticate the connection as OWNER.
    const authAck = ackSpy();
    await handlers.get("mandali:authenticate")!({ token: OWNER.token }, authAck.ack);
    expect(authAck.calls[0]).toMatchObject({ success: true, playerId: OWNER.playerId });

    // Send a message while FALSELY claiming to be OTHER in the payload.
    const channelId = (await service.getChannels(mandaliId)).find((c) => c.name === "lounge-chat")!.channelId;
    const sendAck = ackSpy();
    await handlers.get("mandali:chat:send")!(
      {
        mandaliId,
        channelId,
        playerId: OTHER.playerId, // the lie
        content: "who really sent this?",
      },
      sendAck.ack
    );

    expect(sendAck.calls[0]).toMatchObject({ success: true });
    const messages = await service.getMessages(channelId, 50);
    expect(messages).toHaveLength(1);
    // The authenticated identity wins, not the payload's claim.
    expect(messages[0].senderId).toBe(OWNER.playerId);
    expect(messages[0].senderId).not.toBe(OTHER.playerId);
  });

  it("rejects an invalid/forged token at mandali:authenticate and leaves the connection unauthenticated", async () => {
    const { socket, handlers } = createFakeSocket();
    registerMandaliSocketHandlers({} as never, socket as never, service);

    const authAck = ackSpy();
    await handlers.get("mandali:authenticate")!({ token: "bg1.forged.notasignature" }, authAck.ack);
    expect(authAck.calls[0]).toMatchObject({ success: false });

    const channelId = (await service.getChannels(mandaliId)).find((c) => c.name === "lounge-chat")!.channelId;
    const sendAck = ackSpy();
    await handlers.get("mandali:chat:send")!(
      { mandaliId, channelId, playerId: OWNER.playerId, content: "still not authenticated" },
      sendAck.ack
    );
    expect(sendAck.calls[0]).toMatchObject({ success: false });
    expect(await service.getMessages(channelId, 50)).toHaveLength(0);
  });
});
