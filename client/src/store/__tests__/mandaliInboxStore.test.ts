import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MandaliActivityEvent, MandaliDigest } from "@shared/mandali/notifications.js";

const api = vi.hoisted(() => ({ apiFetch: vi.fn(), apiJson: vi.fn() }));
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiFetch: api.apiFetch,
  apiJson: api.apiJson,
}));

import { useMandaliInboxStore, foldActivity } from "../mandaliInboxStore";

const digest = (over: Partial<MandaliDigest> = {}): MandaliDigest => ({
  mandaliId: "m1", handle: "ludo-lounge", name: "Ludo Lounge", emblem: "", level: "ALL",
  lastReadAt: "2026-09-24T08:00:00.000Z", unreadCount: 0, senderCount: 0, topSenders: [], latest: null, invites: [],
  ...over,
});

const event = (over: Partial<MandaliActivityEvent> = {}): MandaliActivityEvent => ({
  mandaliId: "m1", channelId: "c1", messageId: "msg1", senderId: "rajesh", senderName: "Rajesh",
  kind: "TEXT", preview: "hello", at: Date.parse("2026-09-24T09:00:00.000Z"), ...over,
});

const ok = (body: unknown) => ({ ok: true, json: async () => body });

const state = () => useMandaliInboxStore.getState();
const inbox = (id = "m1") => state().digests.find((d) => d.mandaliId === id)!;

describe("foldActivity", () => {
  it("counts the message, the speaker and the latest line", () => {
    const next = foldActivity(digest(), event());

    expect(next).toMatchObject({
      unreadCount: 1, senderCount: 1,
      topSenders: [{ name: "Rajesh", count: 1 }],
      latest: { senderName: "Rajesh", preview: "hello" },
    });
  });

  it("ranks the most active speaker first and does not double-count a returning one", () => {
    let d = digest();
    d = foldActivity(d, event({ senderName: "Sai" }));
    d = foldActivity(d, event({ senderName: "Rajesh" }));
    d = foldActivity(d, event({ senderName: "Rajesh" }));

    expect(d.senderCount).toBe(2);
    expect(d.topSenders).toEqual([{ name: "Rajesh", count: 2 }, { name: "Sai", count: 1 }]);
  });

  it("keeps counting people beyond the three it names", () => {
    let d = digest();
    for (const name of ["A", "B", "C", "D", "E"]) d = foldActivity(d, event({ senderName: name }));

    expect(d.topSenders).toHaveLength(3);
    expect(d.senderCount).toBe(5);
  });

  it("stops at the server's cap", () => {
    expect(foldActivity(digest({ unreadCount: 1000 }), event()).unreadCount).toBe(1000);
  });

  it("records a shared room as an invitation, newest first, at most five", () => {
    let d = digest();
    for (let i = 0; i < 7; i++) {
      d = foldActivity(d, event({ messageId: `i${i}`, kind: "ROOM_INVITE", roomCode: `ROOM${i}AA`, roomInvite: { gameName: "Ludo" } }));
    }

    expect(d.invites).toHaveLength(5);
    expect(d.invites[0].messageId).toBe("i6");
  });

  it("does not mutate the digest it was given", () => {
    const before = digest();
    foldActivity(before, event());

    expect(before.unreadCount).toBe(0);
  });
});

describe("useMandaliInboxStore", () => {
  beforeEach(() => {
    api.apiFetch.mockReset();
    api.apiJson.mockReset();
    state().reset();
    useMandaliInboxStore.setState({ digests: [digest()], loaded: true });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it("loads the digests from the server", async () => {
    api.apiJson.mockResolvedValue({ success: true, digests: [digest({ unreadCount: 9 })] });

    await state().refresh();

    expect(inbox().unreadCount).toBe(9);
    expect(state().loaded).toBe(true);
  });

  it("keeps what it has when the server cannot be reached", async () => {
    useMandaliInboxStore.setState({ digests: [digest({ unreadCount: 4 })] });
    api.apiJson.mockResolvedValue(null);

    await state().refresh();

    expect(inbox().unreadCount).toBe(4);
  });

  describe("applyActivity", () => {
    it("folds a message from someone else into the right Mandali", () => {
      expect(state().applyActivity(event(), "me")).toBe("applied");
      expect(inbox().unreadCount).toBe(1);
    });

    it("ignores what you sent yourself", () => {
      expect(state().applyActivity(event({ senderId: "me" }), "me")).toBe("own-message");
      expect(inbox().unreadCount).toBe(0);
    });

    it("asks to reload when it is a Mandali it has never heard of", () => {
      expect(state().applyActivity(event({ mandaliId: "brand-new" }), "me")).toBe("unknown-mandali");
    });

    it("does not count the same invitation twice", () => {
      const invite = event({ kind: "ROOM_INVITE", roomCode: "ABC234", messageId: "i1" });
      state().applyActivity(invite, "me");

      expect(state().applyActivity(invite, "me")).toBe("duplicate");
      expect(inbox().unreadCount).toBe(1);
    });

    it("does not count a message as missed while you are looking at that chat", () => {
      state().setViewing("m1");

      expect(state().applyActivity(event(), "me")).toBe("viewing");
      expect(inbox().unreadCount).toBe(0);
    });

    it("does count it if you are looking at a DIFFERENT Mandali", () => {
      state().setViewing("other");

      expect(state().applyActivity(event(), "me")).toBe("applied");
    });

    it("does count it if the chat is open in a background tab", () => {
      state().setViewing("m1");
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });

      expect(state().applyActivity(event(), "me")).toBe("applied");
    });
  });

  describe("system notices", () => {
    it("are not counted as missed messages — 'Charan joined' is news, not chat", () => {
      const joined = event({ kind: "SYSTEM", senderId: "charan", senderName: "Charan", preview: "Charan joined the Mandali" });

      expect(state().applyActivity(joined, "me")).toBe("system");

      expect(inbox().unreadCount).toBe(0);
      expect(inbox().latest).toBeNull();
      expect(inbox().senderCount).toBe(0);
    });

    it("about yourself are ignored — you know you just joined", () => {
      expect(state().applyActivity(event({ kind: "SYSTEM", senderId: "me" }), "me")).toBe("own-message");
    });
  });

  describe("markRead", () => {
    beforeEach(() => {
      useMandaliInboxStore.setState({
        digests: [digest({ unreadCount: 12, senderCount: 3, topSenders: [{ name: "Sai", count: 12 }] })],
      });
    });

    it("clears the count straight away and reports how many were unread before", async () => {
      api.apiFetch.mockResolvedValue(ok({ success: true, previous: 12, current: 0 }));

      const pending = state().markRead("m1");
      expect(inbox().unreadCount).toBe(0);

      expect(await pending).toEqual({ previous: 12 });
      expect(api.apiFetch).toHaveBeenCalledWith("/api/mandali/m1/read", expect.objectContaining({ method: "POST" }));
    });

    it("puts the count back if the server did not record it — it is still unread", async () => {
      api.apiFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

      expect(await state().markRead("m1")).toBeNull();

      expect(inbox().unreadCount).toBe(12);
    });

    it("puts the count back if the network fails", async () => {
      api.apiFetch.mockRejectedValue(new Error("offline"));

      expect(await state().markRead("m1")).toBeNull();

      expect(inbox().unreadCount).toBe(12);
    });
  });

  describe("setLevel", () => {
    it("applies straight away and tells the server", async () => {
      api.apiFetch.mockResolvedValue(ok({ success: true }));

      const pending = state().setLevel("m1", "MUTED");
      expect(inbox().level).toBe("MUTED");

      expect(await pending).toBe(true);
      expect(api.apiFetch).toHaveBeenCalledWith(
        "/api/mandali/m1/notification-level",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ level: "MUTED" }) })
      );
    });

    it("goes back to the old setting if the server refused", async () => {
      api.apiFetch.mockResolvedValue({ ok: false, json: async () => ({}) });

      expect(await state().setLevel("m1", "MUTED")).toBe(false);

      expect(inbox().level).toBe("ALL");
    });
  });

  it("remembers a dismissed invitation across refreshes", async () => {
    state().dismissInvite("i1");
    api.apiJson.mockResolvedValue({ success: true, digests: [digest()] });

    await state().refresh();

    expect(state().dismissedInvites).toEqual({ i1: true });
  });

  it("forgets everything on sign-out", () => {
    state().dismissInvite("i1");
    state().setViewing("m1");

    state().reset();

    expect(state()).toMatchObject({ digests: [], dismissedInvites: {}, viewingMandaliId: null, loaded: false });
  });
});
