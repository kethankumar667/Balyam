import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MandaliRepository } from "../MandaliRepository.js";
import { MandaliService } from "../MandaliService.js";
import { createMandaliRouter } from "../MandaliController.js";
import type { RoomManager } from "../../rooms/RoomManager.js";

const MANDALI = "mandali_ludo_kings";
const HOST = "p_rajesh_ludo"; // seeded owner
const FRIEND = "p_sai_kittu"; // seeded member
const OUTSIDER = "p_not_in_this_mandali";

type Summary = NonNullable<ReturnType<RoomManager["getRoomSummary"]>>;
const summary = (over: Partial<Summary> = {}): Summary => ({
  code: "ABC234", game: "ludo", phase: "lobby", players: 2, maxPlayers: 4, sealed: false, name: "Friday Ludo", hostName: "Rajesh", ...over,
});

/** A RoomManager stand-in: which rooms exist and who is seated in them. */
function fakeRooms() {
  const rooms = new Map<string, { summary: Summary; seated: Set<string> }>();
  const manager = {
    getRoomSummary: (code: string) => rooms.get(code.toUpperCase())?.summary ?? null,
    isIdentityInRoom: (code: string, id: string) => rooms.get(code.toUpperCase())?.seated.has(id) ?? false,
  } as unknown as RoomManager;
  const open = (code: string, seated: string[], over: Partial<Summary> = {}) =>
    rooms.set(code, { summary: summary({ code, ...over }), seated: new Set(seated) });
  return { manager, open, rooms };
}

/** A socket.io stand-in that records what was sent to which rooms. */
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

const build = () => {
  const repository = new MandaliRepository();
  const rooms = fakeRooms();
  const socket = fakeIo();
  const service = new MandaliService(repository, rooms.manager, socket.io);
  return { repository, service, rooms, ...socket };
};

describe("sharing a room into a Mandali", () => {
  it("posts a joinable card carrying the room code and its details", async () => {
    const { service, rooms, repository } = build();
    rooms.open("ABC234", [HOST]);

    const result = await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: "abc234" });

    expect(result.success).toBe(true);
    expect(result.message).toMatchObject({
      kind: "ROOM_INVITE",
      roomCode: "ABC234",
      senderId: HOST,
      roomInvite: { game: "ludo", gameName: expect.any(String), maxPlayers: 4, roomName: "Friday Ludo", hostName: "Rajesh" },
    });
    expect(result.message?.content).toContain("ABC234");
    const stored = repository.getMessages(result.message!.channelId).map((m) => m.messageId);
    expect(stored).toContain(result.message!.messageId);
  });

  it("goes to the room's chat and to every member's notifications", async () => {
    const { service, rooms, sent } = build();
    rooms.open("ABC234", [HOST]);

    await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: "ABC234" });
    await Promise.resolve();

    expect(sent.some((e) => e.event === "mandali:chat:message" && e.rooms.includes(`mandali:${MANDALI}`))).toBe(true);
    const activity = sent.find((e) => e.event === "mandali:activity");
    expect(activity?.rooms).toEqual(expect.arrayContaining([`user:${HOST}`, `user:${FRIEND}`]));
    expect(activity?.payload).toMatchObject({ kind: "ROOM_INVITE", roomCode: "ABC234", mandaliId: MANDALI });
  });

  it.each([
    ["a room that no longer exists", () => undefined, "not open any more"],
    ["someone who is not in that room", (r: ReturnType<typeof fakeRooms>) => r.open("ABC234", ["someone_else"]), "room you are in"],
    ["a match already in progress", (r: ReturnType<typeof fakeRooms>) => r.open("ABC234", [HOST], { phase: "playing" }), "already started"],
    ["a full room", (r: ReturnType<typeof fakeRooms>) => r.open("ABC234", [HOST], { players: 4 }), "is full"],
    ["a sealed room", (r: ReturnType<typeof fakeRooms>) => r.open("ABC234", [HOST], { sealed: true }), "private"],
  ])("refuses to share %s", async (_name, arrange, message) => {
    const { service, rooms, sent } = build();
    arrange(rooms);

    const result = await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: "ABC234" });

    expect(result.success).toBe(false);
    expect(result.error).toContain(message);
    expect(sent).toHaveLength(0);
  });

  it("refuses a malformed code and someone who is not a member", async () => {
    const { service, rooms } = build();
    rooms.open("ABC234", [HOST, OUTSIDER]);

    expect((await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: "no way!" })).success).toBe(false);
    expect((await service.shareRoomInvite({ mandaliId: MANDALI, senderId: OUTSIDER, roomCode: "ABC234" })).success).toBe(false);
  });

  it("shares the same room once — a second share within minutes reuses the first card", async () => {
    const { service, rooms, sent } = build();
    rooms.open("ABC234", [HOST, FRIEND]);

    const first = await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: "ABC234" });
    const again = await service.shareRoomInvite({ mandaliId: MANDALI, senderId: FRIEND, roomCode: "ABC234" });

    expect(again.success).toBe(true);
    expect(again.deduplicated).toBe(true);
    expect(again.message?.messageId).toBe(first.message?.messageId);
    expect(sent.filter((e) => e.event === "mandali:chat:message")).toHaveLength(1);
  });

  it("stops one person spamming rooms: 6 an hour, then a retry time", async () => {
    const { service, rooms } = build();
    const codes = ["AAAA11", "BBBB22", "CCCC33", "DDDD44", "EEEE55", "FFFF66", "GGGG77"];
    codes.forEach((c) => rooms.open(c, [HOST]));

    const results = [];
    for (const code of codes) results.push(await service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: code }));

    expect(results.slice(0, 6).every((r) => r.success)).toBe(true);
    expect(results[6].success).toBe(false);
    expect(results[6].retryAfterMs).toBeGreaterThan(0);
    expect(results[6].retryAfterMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});

describe("live status of a shared room", () => {
  const share = async (ctx: ReturnType<typeof build>, code = "ABC234") =>
    ctx.service.shareRoomInvite({ mandaliId: MANDALI, senderId: HOST, roomCode: code });

  it.each([
    ["open with a free seat", { players: 2 }, "OPEN"],
    ["full", { players: 4 }, "FULL"],
    ["in progress", { phase: "playing" as const }, "IN_PROGRESS"],
    ["finished", { phase: "finished" as const }, "CLOSED"],
  ])("reports a room that is %s", async (_label, over, state) => {
    const ctx = build();
    ctx.rooms.open("ABC234", [HOST]);
    await share(ctx);
    ctx.rooms.open("ABC234", [HOST], over);

    const [status] = await ctx.service.getRoomInviteStatuses(FRIEND, ["ABC234"]);

    expect(status).toMatchObject({ code: "ABC234", state, maxPlayers: 4 });
  });

  it("reports a room that has disappeared as closed", async () => {
    const ctx = build();
    ctx.rooms.open("ABC234", [HOST]);
    await share(ctx);
    ctx.rooms.rooms.delete("ABC234");

    const [status] = await ctx.service.getRoomInviteStatuses(FRIEND, ["ABC234"]);

    expect(status.state).toBe("CLOSED");
  });

  it("says when you are already seated in that room", async () => {
    const ctx = build();
    ctx.rooms.open("ABC234", [HOST, FRIEND]);
    await share(ctx);

    const [asFriend] = await ctx.service.getRoomInviteStatuses(FRIEND, ["ABC234"]);

    expect(asFriend.youAreIn).toBe(true);
  });

  it("only answers for rooms that were shared into your own Mandalis — it is not a lookup for any room", async () => {
    const ctx = build();
    ctx.rooms.open("ABC234", [HOST]);
    ctx.rooms.open("SECRET", [HOST]);
    await share(ctx, "ABC234");

    expect(await ctx.service.getRoomInviteStatuses(FRIEND, ["ABC234", "SECRET"])).toHaveLength(1);
    expect(await ctx.service.getRoomInviteStatuses(OUTSIDER, ["ABC234"])).toEqual([]);
  });

  it("ignores junk codes and caps how many it will answer at once", async () => {
    const ctx = build();
    ctx.rooms.open("ABC234", [HOST]);
    await share(ctx);
    const many = ["ABC234", "bad code", "", ...Array.from({ length: 40 }, (_, i) => `ZZ${String(i).padStart(4, "0")}`)];

    const statuses = await ctx.service.getRoomInviteStatuses(FRIEND, many);

    expect(statuses.map((s) => s.code)).toEqual(["ABC234"]);
  });
});

describe("read state and the digest (in-memory)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const say = async (ctx: ReturnType<typeof build>, who: string, text: string) => {
    const channel = (await ctx.service.getChannels(MANDALI)).find((c) => c.type === "TEXT")!;
    vi.advanceTimersByTime(1000);
    await ctx.service.sendMessage(MANDALI, channel.channelId, who, who, "a1", text);
  };

  it("summarises what a member missed into one item", async () => {
    const ctx = build();
    await ctx.service.markRead(MANDALI, FRIEND);
    for (let i = 0; i < 5; i++) await say(ctx, HOST, `chatter ${i}`);
    await say(ctx, FRIEND, "my own message");

    const digest = (await ctx.service.getDigests(FRIEND)).find((d) => d.mandaliId === MANDALI)!;

    expect(digest.unreadCount).toBe(5);
    expect(digest.senderCount).toBe(1);
    expect(digest.latest?.preview).toBe("chatter 4");
  });

  it("marking read clears it, returns the old pointer for the new-messages line, and only newer messages count after", async () => {
    const ctx = build();
    const first = await ctx.service.markRead(MANDALI, FRIEND);
    await say(ctx, HOST, "before");
    const second = await ctx.service.markRead(MANDALI, FRIEND);

    expect(second.previous).toBe(first.current);
    expect((await ctx.service.getDigests(FRIEND)).find((d) => d.mandaliId === MANDALI)!.unreadCount).toBe(0);

    await say(ctx, HOST, "after");
    expect((await ctx.service.getDigests(FRIEND)).find((d) => d.mandaliId === MANDALI)!.unreadCount).toBe(1);
  });

  it("each member has their own pointer", async () => {
    const ctx = build();
    await ctx.service.markRead(MANDALI, FRIEND);
    await ctx.service.markRead(MANDALI, HOST);
    await say(ctx, HOST, "hello");
    await ctx.service.markRead(MANDALI, FRIEND);

    const forHost = (await ctx.service.getDigests(HOST)).find((d) => d.mandaliId === MANDALI)!;
    const forFriend = (await ctx.service.getDigests(FRIEND)).find((d) => d.mandaliId === MANDALI)!;

    expect(forHost.unreadCount).toBe(0); // their own message
    expect(forFriend.unreadCount).toBe(0); // they read it
  });

  it("refuses to track reads for someone who is not a member", async () => {
    const ctx = build();

    expect((await ctx.service.markRead(MANDALI, OUTSIDER)).success).toBe(false);
    expect((await ctx.service.setNotificationLevel(MANDALI, OUTSIDER, "MUTED")).success).toBe(false);
  });

  it("remembers a mute and refuses an unknown setting", async () => {
    const ctx = build();

    expect((await ctx.service.setNotificationLevel(MANDALI, FRIEND, "MUTED")).success).toBe(true);
    expect((await ctx.service.getDigests(FRIEND)).find((d) => d.mandaliId === MANDALI)!.level).toBe("MUTED");
    expect((await ctx.service.setNotificationLevel(MANDALI, FRIEND, "LOUD" as never)).success).toBe(false);
  });

  it("sends new activity to current members' personal rooms, not to strangers", async () => {
    const ctx = build();
    await say(ctx, HOST, "hello everyone");
    await Promise.resolve();

    const activity = ctx.sent.find((e) => e.event === "mandali:activity");

    expect(activity?.payload).toMatchObject({ mandaliId: MANDALI, senderId: HOST, preview: "hello everyone", kind: "TEXT" });
    expect(activity?.rooms).toContain(`user:${FRIEND}`);
    expect(activity?.rooms).not.toContain(`user:${OUTSIDER}`);
  });
});

describe("HTTP routes", () => {
  let server: Server;
  let baseUrl: string;
  let player: { playerId: string; kind: "member" | "guest" } | null = { playerId: HOST, kind: "member" };
  const ctx = build();

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (player) (req as unknown as { player: unknown }).player = player;
      next();
    });
    app.use("/api/mandali", createMandaliRouter(ctx.service));
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const api = (path: string, init?: RequestInit) => fetch(`${baseUrl}/api/mandali${path}`, init);
  const post = (path: string, body: unknown) =>
    api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("shares a room, then reports its status and an unread digest to a friend", async () => {
    ctx.rooms.open("ABC234", [HOST]);
    player = { playerId: HOST, kind: "member" };

    const shared = await post(`/${MANDALI}/room-invites`, { roomCode: "ABC234" });
    expect(shared.status).toBe(201);
    expect(((await shared.json()) as { message: { kind: string } }).message.kind).toBe("ROOM_INVITE");

    player = { playerId: FRIEND, kind: "member" };
    const status = await api("/room-invites/status?codes=ABC234");
    const statusBody = (await status.json()) as { success: boolean; statuses: Array<{ state: string }> };
    expect(statusBody.success).toBe(true);
    expect(statusBody.statuses[0].state).toBe("OPEN");

    const digests = await api("/notifications/digests");
    expect(((await digests.json()) as { success: boolean }).success).toBe(true);
  });

  it("answers a repeat share with 200 and alreadyShared, not a second card", async () => {
    ctx.rooms.open("REPEAT", [HOST]);
    player = { playerId: HOST, kind: "member" };
    await post(`/${MANDALI}/room-invites`, { roomCode: "REPEAT" });

    const again = await post(`/${MANDALI}/room-invites`, { roomCode: "REPEAT" });

    expect(again.status).toBe(200);
    expect(((await again.json()) as { alreadyShared: boolean }).alreadyShared).toBe(true);
  });

  it("tells the client how long to wait when it has shared too many", async () => {
    player = { playerId: HOST, kind: "member" };
    for (const code of ["RATE11", "RATE22", "RATE33", "RATE44", "RATE55", "RATE66", "RATE77"]) {
      ctx.rooms.open(code, [HOST]);
      const res = await post(`/${MANDALI}/room-invites`, { roomCode: code });
      if (res.status === 429) {
        expect(((await res.json()) as { retryAfterMs: number }).retryAfterMs).toBeGreaterThan(0);
        return;
      }
    }
    throw new Error("expected a 429 after too many shares");
  });

  it("keeps the new read routes reachable — they are not swallowed by the Mandali lookup", async () => {
    player = { playerId: FRIEND, kind: "member" };

    const digests = await api("/notifications/digests");
    const statuses = await api("/room-invites/status?codes=");

    expect(digests.status).toBe(200);
    expect(statuses.status).toBe(200);
  });

  it("refuses guests, and rejects unknown notification settings", async () => {
    player = { playerId: "guest_abc", kind: "guest" };
    expect((await post(`/${MANDALI}/room-invites`, { roomCode: "ABC234" })).status).toBe(403);

    player = { playerId: FRIEND, kind: "member" };
    const bad = await api(`/${MANDALI}/notification-level`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: "LOUD" }),
    });
    expect(bad.status).toBe(400);
  });

  it("marks read over HTTP", async () => {
    player = { playerId: FRIEND, kind: "member" };

    const res = await post(`/${MANDALI}/read`, {});

    expect(res.status).toBe(200);
    expect(((await res.json()) as { current: number }).current).toBeGreaterThan(0);
  });
});
