import { describe, it, expect } from "vitest";
import type { MandaliMessage } from "@shared/mandali/types.js";
import { buildDigests, DIGEST_UNREAD_CAP } from "../digest.js";

const ME = "me";
const T0 = 1_000_000;

const msg = (over: Partial<MandaliMessage> & { senderId: string; timestamp: number }): MandaliMessage => ({
  messageId: `m_${over.timestamp}_${over.senderId}`,
  channelId: "c1",
  mandaliId: "m1",
  senderName: over.senderId,
  senderAvatar: "a1",
  senderRole: "MEMBER",
  content: "hello",
  reactions: {},
  kind: "TEXT",
  ...over,
});

const run = (messages: MandaliMessage[], pointer = T0, level: "ALL" | "INVITES_ONLY" | "MUTED" = "ALL") =>
  buildDigests({
    playerId: ME,
    mandalis: [{ id: "m1", handle: "h", name: "Ludo Lounge", emblem: "e" }],
    messages,
    readPointer: () => pointer,
    level: () => level,
    nameOf: (_m, id) => id.toUpperCase(),
  })[0];

describe("buildDigests", () => {
  it("turns many messages into one summary: how many, how many people, who wrote most, what was last", () => {
    const messages = [
      ...[1, 2, 3, 4].map((i) => msg({ senderId: "bob", timestamp: T0 + i, content: `bob ${i}` })),
      ...[5, 6, 7].map((i) => msg({ senderId: "ann", timestamp: T0 + i, content: `ann ${i}` })),
      msg({ senderId: "cy", timestamp: T0 + 8, content: "ready for a match?" }),
    ];

    const digest = run(messages);

    expect(digest.unreadCount).toBe(8);
    expect(digest.senderCount).toBe(3);
    expect(digest.topSenders).toEqual([
      { name: "BOB", count: 4 },
      { name: "ANN", count: 3 },
      { name: "CY", count: 1 },
    ]);
    expect(digest.latest).toMatchObject({ senderName: "CY", preview: "ready for a match?" });
  });

  it("only counts what arrived after the read pointer", () => {
    const digest = run([msg({ senderId: "bob", timestamp: T0 - 5 }), msg({ senderId: "bob", timestamp: T0 + 5 })]);

    expect(digest.unreadCount).toBe(1);
  });

  it("never counts my own messages, system chatter, or emptied (deleted) messages", () => {
    const digest = run([
      msg({ senderId: ME, timestamp: T0 + 1 }),
      msg({ senderId: "bob", timestamp: T0 + 2, kind: "SYSTEM", content: "Bob joined" }),
      msg({ senderId: "bob", timestamp: T0 + 3, content: "" }),
      msg({ senderId: "bob", timestamp: T0 + 4, content: "real one" }),
    ]);

    expect(digest.unreadCount).toBe(1);
    expect(digest.latest?.preview).toBe("real one");
  });

  it("lists unread room invites separately, newest first", () => {
    const invite = (t: number, code: string) =>
      msg({ senderId: "bob", timestamp: T0 + t, kind: "ROOM_INVITE", roomCode: code, content: `room ${code}`, roomInvite: { gameName: "Ludo" } as never });

    const digest = run([invite(1, "AAA111"), msg({ senderId: "ann", timestamp: T0 + 2 }), invite(3, "BBB222")]);

    expect(digest.invites.map((i) => i.roomCode)).toEqual(["BBB222", "AAA111"]);
    expect(digest.invites[0].senderName).toBe("BOB");
    expect(digest.unreadCount).toBe(3);
  });

  it("reports nothing for a quiet Mandali and carries the mute level through", () => {
    const digest = run([], T0, "MUTED");

    expect(digest.unreadCount).toBe(0);
    expect(digest.latest).toBeNull();
    expect(digest.level).toBe("MUTED");
  });

  it("caps how far back it looks, so a very busy chat stays cheap", () => {
    const many = Array.from({ length: DIGEST_UNREAD_CAP + 50 }, (_, i) => msg({ senderId: "bob", timestamp: T0 + i + 1 }));

    expect(run(many).unreadCount).toBe(DIGEST_UNREAD_CAP);
  });

  it("truncates a long preview", () => {
    const digest = run([msg({ senderId: "bob", timestamp: T0 + 1, content: "x".repeat(500) })]);

    expect(digest.latest?.preview.length).toBe(120);
  });

  it("puts the Mandali with the newest activity first and quiet ones last", () => {
    const digests = buildDigests({
      playerId: ME,
      mandalis: [
        { id: "quiet", handle: "q", name: "Quiet", emblem: "e" },
        { id: "busy", handle: "b", name: "Busy", emblem: "e" },
      ],
      messages: [msg({ senderId: "bob", timestamp: T0 + 1, mandaliId: "busy" })],
      readPointer: () => T0,
      level: () => "ALL",
      nameOf: () => "Bob",
    });

    expect(digests.map((d) => d.mandaliId)).toEqual(["busy", "quiet"]);
  });
});
