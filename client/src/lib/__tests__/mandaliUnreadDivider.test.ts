import { describe, it, expect } from "vitest";
import type { MandaliMessage } from "@shared/mandali/types.js";
import { insertUnreadDivider, UNREAD_DIVIDER_ID } from "../mandaliUnreadDivider";

const msg = (id: string, timestamp: number, senderId = "other", kind?: string): MandaliMessage =>
  ({
    messageId: id, channelId: "c1", mandaliId: "m1", senderId, senderName: senderId, senderAvatar: "a",
    senderRole: "MEMBER", content: id, reactions: {}, timestamp, ...(kind ? { kind } : {}),
  }) as MandaliMessage;

describe("insertUnreadDivider", () => {
  const messages = [msg("a", 100), msg("b", 200), msg("c", 300), msg("d", 400)];

  it("draws the line before the first message you had not read, and counts what is below it", () => {
    const result = insertUnreadDivider(messages, 250, "me");

    expect(result.map((m) => m.messageId)).toEqual(["a", "b", UNREAD_DIVIDER_ID, "c", "d"]);
    expect(result[2]).toMatchObject({ kind: "SYSTEM", content: "2 new messages" });
  });

  it("uses the singular for one", () => {
    expect(insertUnreadDivider(messages, 350, "me")[3].content).toBe("1 new message");
  });

  it("does nothing when you were already caught up", () => {
    expect(insertUnreadDivider(messages, null, "me")).toBe(messages);
    expect(insertUnreadDivider(messages, 400, "me")).toBe(messages);
  });

  it("does not count your own messages as new", () => {
    const own = [msg("a", 100), msg("mine", 300, "me"), msg("d", 400)];

    const result = insertUnreadDivider(own, 250, "me");

    expect(result.map((m) => m.messageId)).toEqual(["a", "mine", UNREAD_DIVIDER_ID, "d"]);
    expect(result[2].content).toBe("1 new message");
  });

  it("does not count system lines as new", () => {
    const withSystem = [msg("a", 100), msg("sys", 300, "", "SYSTEM")];

    expect(insertUnreadDivider(withSystem, 250, "me")).toBe(withSystem);
  });

  it("never changes the list it was given", () => {
    const original = [...messages];

    insertUnreadDivider(messages, 250, "me");

    expect(messages).toEqual(original);
  });
});
