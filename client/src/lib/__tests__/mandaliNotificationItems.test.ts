import { describe, it, expect } from "vitest";
import type { MandaliDigest } from "@shared/mandali/notifications.js";
import { digestsToItems, describeSenders, chatMessageCount } from "../mandaliNotificationItems";

const digest = (over: Partial<MandaliDigest> = {}): MandaliDigest => ({
  mandaliId: "m1",
  handle: "ludo-lounge",
  name: "Ludo Lounge",
  emblem: "",
  level: "ALL",
  lastReadAt: "2026-09-24T08:00:00.000Z",
  unreadCount: 47,
  senderCount: 7,
  topSenders: [
    { name: "Rajesh", count: 23 },
    { name: "Sai", count: 11 },
    { name: "Anand", count: 5 },
  ],
  latest: { senderName: "Rajesh", kind: "TEXT", preview: "who is up for Ludo tonight?", at: "2026-09-24T09:00:00.000Z" },
  invites: [],
  ...over,
});

const invite = (id: string, code = "ABC234") => ({
  messageId: id,
  roomCode: code,
  senderName: "Rajesh",
  metadata: { gameName: "Ludo" },
  at: "2026-09-24T09:05:00.000Z",
});

const NONE = new Set<string>();

describe("digestsToItems", () => {
  it("turns 47 messages from 7 people into ONE notification that tells the whole story", () => {
    const items = digestsToItems([digest()], NONE);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "mandali",
      title: "47 new messages in Ludo Lounge",
      desc: "Rajesh (23), Sai (11) +5 more · Latest: “who is up for Ludo tonight?”",
      unread: true,
      mandaliId: "m1",
      mandaliHandle: "ludo-lounge",
    });
  });

  it("names a lone speaker plainly and uses the singular", () => {
    const items = digestsToItems(
      [digest({ unreadCount: 1, senderCount: 1, topSenders: [{ name: "Rajesh", count: 1 }] })],
      NONE
    );

    expect(items[0].title).toBe("1 new message in Ludo Lounge");
    expect(items[0].desc.startsWith("Rajesh · Latest:")).toBe(true);
  });

  it("keeps a room invitation as its own notification, apart from the chat summary", () => {
    const items = digestsToItems([digest({ unreadCount: 12, invites: [invite("i1"), invite("i2", "XYZ789")] })], NONE);

    expect(items.map((i) => i.type)).toEqual(["mandali", "mandali_invite", "mandali_invite"]);
    expect(items[0].title).toBe("10 new messages in Ludo Lounge");
    expect(items[1]).toMatchObject({
      title: "Rajesh invited you to play Ludo",
      desc: "Room ABC234 · Ludo Lounge",
      roomCode: "ABC234",
      inviteMessageId: "i1",
    });
  });

  it("does not add an empty chat summary when the only thing missed is an invitation", () => {
    const items = digestsToItems([digest({ unreadCount: 1, invites: [invite("i1")] })], NONE);

    expect(items.map((i) => i.type)).toEqual(["mandali_invite"]);
  });

  it("shows nothing for a Mandali you have caught up on", () => {
    expect(digestsToItems([digest({ unreadCount: 0, senderCount: 0, topSenders: [] })], NONE)).toEqual([]);
  });

  it("MUTED shows nothing at all — not even invitations", () => {
    expect(digestsToItems([digest({ level: "MUTED", invites: [invite("i1")] })], NONE)).toEqual([]);
  });

  it("INVITES_ONLY hides the chat summary but keeps the invitations", () => {
    const items = digestsToItems([digest({ level: "INVITES_ONLY", unreadCount: 12, invites: [invite("i1")] })], NONE);

    expect(items.map((i) => i.type)).toEqual(["mandali_invite"]);
  });

  it("hides an invitation the member dismissed, and only that one", () => {
    const items = digestsToItems(
      [digest({ unreadCount: 3, invites: [invite("i1"), invite("i2", "XYZ789")] })],
      new Set(["i1"])
    );

    expect(items.filter((i) => i.type === "mandali_invite").map((i) => i.inviteMessageId)).toEqual(["i2"]);
  });

  it("says 999+ rather than a number the server stopped counting", () => {
    expect(digestsToItems([digest({ unreadCount: 1000 })], NONE)[0].title).toBe("999+ new messages in Ludo Lounge");
  });

  it("describes a coin request instead of dumping its raw text", () => {
    const coin = digestsToItems(
      [digest({ latest: { senderName: "Sai", kind: "COIN_REQUEST", preview: "raw", at: "2026-09-24T09:00:00.000Z" } })],
      NONE
    );

    expect(coin[0].desc).toContain("Latest: a coin request");
  });

  it("shortens a very long last line", () => {
    const long = "x".repeat(300);
    const items = digestsToItems(
      [digest({ latest: { senderName: "Sai", kind: "TEXT", preview: long, at: "2026-09-24T09:00:00.000Z" } })],
      NONE
    );

    expect(items[0].desc.length).toBeLessThan(160);
    expect(items[0].desc).toContain("…");
  });

  it("lists the Mandali with the newest activity first", () => {
    const older = digest({ mandaliId: "m-old", name: "Office", latest: { senderName: "A", kind: "TEXT", preview: "hi", at: "2026-09-23T09:00:00.000Z" } });
    const newer = digest({ mandaliId: "m-new", name: "Family" });

    expect(digestsToItems([older, newer], NONE).map((i) => i.mandaliId)).toEqual(["m-new", "m-old"]);
  });

  it("survives a digest with no latest message", () => {
    const items = digestsToItems([digest({ latest: null })], NONE);

    expect(items[0].desc).not.toContain("Latest");
    expect(items[0].time).toBe("");
  });
});

describe("describeSenders / chatMessageCount", () => {
  it("shows the two most active people and counts the rest", () => {
    expect(describeSenders(digest())).toBe("Rajesh (23), Sai (11) +5 more");
  });

  it("never reports a negative chat count", () => {
    expect(chatMessageCount({ unreadCount: 1, invites: [invite("a"), invite("b")] })).toBe(0);
  });
});
