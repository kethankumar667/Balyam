import { describe, it, expect, beforeEach, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiFetch: api.apiFetch,
}));

import { useMandaliStore } from "../mandaliStore";
import { useMandaliInboxStore } from "../mandaliInboxStore";

/**
 * The client half of "the owner deletes their Mandali".
 *
 * Two entry points end in the same place: the owner's own delete, and the
 * server telling every member it happened. Both must leave nothing of the group
 * behind, and the second must be safe to run twice — the owner hears about their
 * own deletion too, and should not be told about it as if it were news.
 */

const message = {
  messageId: "m1", channelId: "c1", mandaliId: "man1", senderId: "p1", senderName: "Sai", senderAvatar: "a",
  senderRole: "MEMBER", content: "the group's private conversation", reactions: {}, timestamp: 1,
};

function openTheDoomedMandali() {
  useMandaliStore.setState({
    mandalis: [{ id: "man1" }, { id: "other" }] as never,
    myMandalis: [{ id: "man1" }, { id: "other" }] as never,
    activeMandali: { id: "man1", name: "Ludo Lounge", handle: "ludo-lounge" } as never,
    members: [{ playerId: "p1" }] as never,
    channels: [{ channelId: "c1" }] as never,
    activeChannelId: "c1",
    messages: { c1: [message] as never },
    coinRequests: { r1: {} as never },
    coinTransfers: [{}] as never,
    pendingJoinRequests: [{}] as never,
    isSubmitting: false,
  });
  useMandaliInboxStore.setState({
    digests: [{ mandaliId: "man1" }, { mandaliId: "other" }] as never,
    loaded: true,
  });
}

const replyWith = (body: unknown, ok = true) => api.apiFetch.mockResolvedValue({ ok, json: async () => body });

describe("deleteMandali (the owner's action)", () => {
  beforeEach(() => {
    api.apiFetch.mockReset();
    openTheDoomedMandali();
  });

  it("sends a DELETE for that Mandali, carrying only the typed handle", async () => {
    replyWith({ success: true });

    await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(api.apiFetch).toHaveBeenCalledTimes(1);
    const [url, init] = api.apiFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/mandali/man1");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body as string)).toEqual({ confirmHandle: "ludo-lounge" });
  });

  it("leaves nothing of the group in memory once the server says it is gone", async () => {
    replyWith({ success: true });

    const res = await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(res).toEqual({ success: true });
    const state = useMandaliStore.getState();
    expect(state.activeMandali).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.channels).toEqual([]);
    expect(state.activeChannelId).toBeNull();
    expect(state.messages).toEqual({});
    expect(state.coinRequests).toEqual({});
    expect(state.coinTransfers).toEqual([]);
    expect(state.pendingJoinRequests).toEqual([]);
  });

  it("drops it from the owner's lists and the inbox, and keeps every other Mandali", async () => {
    replyWith({ success: true });

    await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(useMandaliStore.getState().myMandalis.map((m) => m.id)).toEqual(["other"]);
    expect(useMandaliStore.getState().mandalis.map((m) => m.id)).toEqual(["other"]);
    expect(useMandaliInboxStore.getState().digests.map((d) => d.mandaliId)).toEqual(["other"]);
  });

  it("does not disturb a different Mandali that happens to be open", async () => {
    replyWith({ success: true });
    useMandaliStore.setState({ activeMandali: { id: "other" } as never, messages: { c9: [message] as never } });

    await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(useMandaliStore.getState().activeMandali).toEqual({ id: "other" });
    expect(useMandaliStore.getState().messages).toEqual({ c9: [message] });
  });

  it("changes nothing and reports the reason when the server refuses", async () => {
    replyWith({ success: false, error: "Only the owner can delete this Mandali." }, false);

    const res = await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(res).toEqual({ success: false, error: "Only the owner can delete this Mandali." });
    expect(useMandaliStore.getState().activeMandali).not.toBeNull();
    expect(useMandaliStore.getState().myMandalis.map((m) => m.id)).toEqual(["man1", "other"]);
    expect(useMandaliInboxStore.getState().digests).toHaveLength(2);
  });

  it("changes nothing when the network fails, and says so", async () => {
    api.apiFetch.mockRejectedValue(new Error("offline"));

    const res = await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(res).toEqual({ success: false, error: "offline" });
    expect(useMandaliStore.getState().activeMandali).not.toBeNull();
  });

  it("does not treat a reply without success:true as a deletion", async () => {
    replyWith({});

    const res = await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(res.success).toBe(false);
    expect(useMandaliStore.getState().activeMandali).not.toBeNull();
  });

  it("marks itself busy while waiting, and never leaves itself stuck busy", async () => {
    let finish: (v: unknown) => void = () => undefined;
    api.apiFetch.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const pending = useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");
    expect(useMandaliStore.getState().isSubmitting).toBe(true);
    finish({ ok: true, json: async () => ({ success: false, error: "no" }) });
    await pending;

    expect(useMandaliStore.getState().isSubmitting).toBe(false);
  });
});

describe("applyMandaliDeleted (someone else's deletion, or the echo of your own)", () => {
  beforeEach(() => {
    api.apiFetch.mockReset();
    openTheDoomedMandali();
  });

  it("removes the Mandali everywhere and reports that it was news", () => {
    const wasNews = useMandaliStore.getState().applyMandaliDeleted("man1");

    expect(wasNews).toBe(true);
    expect(useMandaliStore.getState().activeMandali).toBeNull();
    expect(useMandaliStore.getState().messages).toEqual({});
    expect(useMandaliStore.getState().myMandalis.map((m) => m.id)).toEqual(["other"]);
    expect(useMandaliInboxStore.getState().digests.map((d) => d.mandaliId)).toEqual(["other"]);
  });

  it("is news to a member who only had it in their inbox, never having opened it", () => {
    useMandaliStore.setState({ activeMandali: null, myMandalis: [], mandalis: [] });

    expect(useMandaliStore.getState().applyMandaliDeleted("man1")).toBe(true);
    expect(useMandaliInboxStore.getState().digests.map((d) => d.mandaliId)).toEqual(["other"]);
  });

  it("is NOT news the second time, so nobody is told twice", () => {
    useMandaliStore.getState().applyMandaliDeleted("man1");

    expect(useMandaliStore.getState().applyMandaliDeleted("man1")).toBe(false);
  });

  it("is NOT news to the owner who just deleted it themselves", async () => {
    replyWith({ success: true });
    await useMandaliStore.getState().deleteMandali("man1", "ludo-lounge");

    expect(useMandaliStore.getState().applyMandaliDeleted("man1")).toBe(false);
  });

  it("knows nothing about a Mandali it never held, and touches nothing", () => {
    const before = useMandaliStore.getState().myMandalis;

    expect(useMandaliStore.getState().applyMandaliDeleted("never-heard-of-it")).toBe(false);
    expect(useMandaliStore.getState().myMandalis).toBe(before);
    expect(useMandaliStore.getState().activeMandali).not.toBeNull();
  });
});

describe("mandaliInboxStore.forget", () => {
  it("removes one Mandali's summary and no one else's", () => {
    useMandaliInboxStore.setState({
      digests: [{ mandaliId: "a" }, { mandaliId: "b" }, { mandaliId: "c" }] as never,
      loaded: true,
    });

    useMandaliInboxStore.getState().forget("b");

    expect(useMandaliInboxStore.getState().digests.map((d) => d.mandaliId)).toEqual(["a", "c"]);
  });

  it("is a no-op for one it does not hold", () => {
    useMandaliInboxStore.setState({ digests: [{ mandaliId: "a" }] as never, loaded: true });
    const before = useMandaliInboxStore.getState().digests;

    useMandaliInboxStore.getState().forget("zzz");

    expect(useMandaliInboxStore.getState().digests).toBe(before);
  });
});
