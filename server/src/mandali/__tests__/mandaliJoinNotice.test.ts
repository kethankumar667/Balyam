import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";

/**
 * A and B are already in a Mandali and have been talking. C joins.
 *
 *  1. Everyone in the Mandali is told, just now, that C joined.
 *  2. C does not get to see the conversation that happened before C arrived.
 */

const OWNER = "p_owner";
const A = "p_a";
const B = "p_b";
const C = "p_c";

const T0 = Date.parse("2026-09-24T10:00:00.000Z");
const at = (secondsAfter: number) => new Date(T0 + secondsAfter * 1000);

function fakeIo() {
  const sent: Array<{ rooms: string[]; event: string; payload: any }> = [];
  const io = {
    to: (target: string | string[]) => ({
      emit: (event: string, payload: unknown) =>
        sent.push({ rooms: Array.isArray(target) ? target : [target], event, payload }),
    }),
  };
  return { io: io as never, sent };
}

async function buildGroup() {
  vi.setSystemTime(at(0));
  const repository = new MandaliRepository();
  const socket = fakeIo();
  const service = new MandaliService(repository, undefined as never, socket.io);

  const created = await service.createMandali(OWNER, "Owner", "avatar_1", {
    name: "Join Notice Test",
    handle: "join-notice-test",
    description: "A and B are already here.",
    visibility: "PUBLIC",
  });
  if (!created.success || !created.mandali) throw new Error("test setup: createMandali failed");
  const mandaliId = created.mandali.id;
  const channelId = (await service.getChannels(mandaliId)).find((c) => c.type === "TEXT")!.channelId;

  vi.setSystemTime(at(10));
  expect((await service.applyToMandali(mandaliId, A, "Asha", "avatar_2")).success).toBe(true);
  expect((await service.applyToMandali(mandaliId, B, "Bala", "avatar_3")).success).toBe(true);

  const say = async (who: string, name: string, text: string, secondsAfter: number) => {
    vi.setSystemTime(at(secondsAfter));
    const res = await service.sendMessage(mandaliId, channelId, who, name, "avatar_1", text);
    expect(res.success).toBe(true);
  };
  await say(A, "Asha", "hello from before", 20);
  await say(B, "Bala", "the plan is a secret", 30);

  socket.sent.length = 0;
  return { repository, service, socket, mandaliId, channelId, say };
}

const textsFor = async (service: MandaliService, channelId: string, who: string, mandaliId: string) => {
  const since = await service.getMemberJoinedAt(mandaliId, who);
  return (await service.getMessages(channelId, 50, since ?? undefined)).map((m) => m.content);
};

describe("a new member joins", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("everyone is told", () => {
    it("puts a line in the main chat saying who joined", async () => {
      const { service, mandaliId, channelId } = await buildGroup();

      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");

      const line = (await service.getMessages(channelId, 50)).find((m) => m.content === "Charan joined the Mandali");
      expect(line).toMatchObject({ kind: "SYSTEM", senderId: C, channelId });
    });

    it("shows it live to anyone reading the chat", async () => {
      const { service, socket, mandaliId, channelId } = await buildGroup();

      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      await vi.waitFor(() => expect(socket.sent.some((s) => s.event === "mandali:chat:message")).toBe(true));

      const live = socket.sent.find((s) => s.event === "mandali:chat:message")!;
      expect(live.rooms).toEqual([`mandali:${mandaliId}`]);
      expect(live.payload.message).toMatchObject({ kind: "SYSTEM", content: "Charan joined the Mandali", channelId });
    });

    it("reaches every member wherever they are in the app, as an activity event about C", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      await vi.waitFor(() => expect(socket.sent.some((s) => s.event === "mandali:activity")).toBe(true));

      const activity = socket.sent.find((s) => s.event === "mandali:activity")!;
      expect(activity.rooms).toEqual(expect.arrayContaining([`user:${OWNER}`, `user:${A}`, `user:${B}`]));
      expect(activity.payload).toMatchObject({
        mandaliId, kind: "SYSTEM", senderId: C, senderName: "Charan", preview: "Charan joined the Mandali",
      });
    });

    it("does not let a failed announcement undo the join", async () => {
      const { service, repository, mandaliId } = await buildGroup();
      vi.spyOn(repository, "saveMessage").mockImplementation(() => {
        throw new Error("storage hiccup");
      });

      vi.setSystemTime(at(100));
      const result = await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");

      expect(result.success).toBe(true);
      expect(await service.isActiveMember(mandaliId, C)).toBe(true);
    });

    it("does not announce someone who could not join", async () => {
      const { service, socket, mandaliId } = await buildGroup();

      const again = await service.applyToMandali(mandaliId, A, "Asha", "avatar_2");

      expect(again.success).toBe(false);
      expect(socket.sent).toEqual([]);
    });
  });

  describe("the newcomer does not see what came before", () => {
    it("C sees nothing said before arriving — only the arrival itself and what follows", async () => {
      const { service, mandaliId, channelId, say } = await buildGroup();

      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      await say(A, "Asha", "welcome C", 110);

      const seenByC = await textsFor(service, channelId, C, mandaliId);
      expect(seenByC).not.toContain("hello from before");
      expect(seenByC).not.toContain("the plan is a secret");
      expect(seenByC).toEqual(expect.arrayContaining(["Charan joined the Mandali", "welcome C"]));
    });

    it("A and B still see the whole conversation", async () => {
      const { service, mandaliId, channelId, say } = await buildGroup();
      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      await say(A, "Asha", "welcome C", 110);

      for (const member of [A, B]) {
        const seen = await textsFor(service, channelId, member, mandaliId);
        expect(seen).toEqual(expect.arrayContaining(["hello from before", "the plan is a secret", "welcome C"]));
      }
    });

    it("someone who leaves and comes back starts fresh — what was said while away is not theirs either", async () => {
      const { service, mandaliId, channelId, say } = await buildGroup();
      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      await say(A, "Asha", "while C is here", 110);
      vi.setSystemTime(at(120));
      await service.leaveMandali(mandaliId, C);
      await say(B, "Bala", "said while C was away", 130);

      vi.setSystemTime(at(200));
      const back = await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");
      expect(back.success).toBe(true);

      const seen = await textsFor(service, channelId, C, mandaliId);
      expect(seen).not.toContain("while C is here");
      expect(seen).not.toContain("said while C was away");
      expect(seen).toContain("Charan joined the Mandali");
    });

    it("what C missed is not counted as 'new messages' in C's notifications", async () => {
      const { service, mandaliId, say } = await buildGroup();
      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");

      const before = (await service.getDigests(C)).find((d) => d.mandaliId === mandaliId)!;
      expect(before.unreadCount).toBe(0);

      await say(A, "Asha", "welcome C", 110);
      const after = (await service.getDigests(C)).find((d) => d.mandaliId === mandaliId)!;
      expect(after.unreadCount).toBe(1);
    });

    it("the arrival line is not counted as a missed message for the others", async () => {
      const { service, mandaliId } = await buildGroup();
      const before = (await service.getDigests(A)).find((d) => d.mandaliId === mandaliId)!.unreadCount;

      vi.setSystemTime(at(100));
      await service.applyToMandali(mandaliId, C, "Charan", "avatar_4");

      const after = (await service.getDigests(A)).find((d) => d.mandaliId === mandaliId)!.unreadCount;
      expect(after).toBe(before);
    });
  });
});

describe("what a newcomer's browser is actually sent", () => {
  let server: Server;
  let baseUrl: string;
  let viewer: { playerId: string; kind: "member" } | null = null;
  let group: Awaited<ReturnType<typeof buildGroup>>;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    group = await buildGroup();
    vi.setSystemTime(at(100));
    await group.service.applyToMandali(group.mandaliId, C, "Charan", "avatar_4");
    await group.say(A, "Asha", "welcome C", 110);
    vi.useRealTimers();

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (viewer) (req as unknown as { player: unknown }).player = viewer;
      next();
    });
    app.use("/api/mandali", createMandaliRouter(group.service));
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const history = async (who: string) => {
    viewer = { playerId: who, kind: "member" };
    const res = await fetch(`${baseUrl}/api/mandali/${group.mandaliId}/channels/${group.channelId}/messages`);
    const body = (await res.json()) as { messages: Array<{ content: string }> };
    return body.messages.map((m) => m.content);
  };

  it("does not include the earlier conversation for the newcomer", async () => {
    const seen = await history(C);

    expect(seen).not.toContain("hello from before");
    expect(seen).not.toContain("the plan is a secret");
    expect(seen).toContain("welcome C");
  });

  it("still includes all of it for the people who were already there", async () => {
    const seen = await history(A);

    expect(seen).toEqual(expect.arrayContaining(["hello from before", "the plan is a secret", "welcome C"]));
  });
});
