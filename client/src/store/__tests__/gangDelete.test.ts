import { describe, it, expect, beforeEach, vi } from "vitest";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiFetch: api.apiFetch,
}));

import { useGangStore } from "../gangStore";
import { useGangInboxStore } from "../gangInboxStore";

/**
 * The client half of "the owner deletes their Gang".
 *
 * Two entry points end in the same place: the owner's own delete, and the
 * server telling every member it happened. Both must leave nothing of the group
 * behind, and the second must be safe to run twice — the owner hears about their
 * own deletion too, and should not be told about it as if it were news.
 */

const message = {
  messageId: "m1", channelId: "c1", gangId: "man1", senderId: "p1", senderName: "Sai", senderAvatar: "a",
  senderRole: "MEMBER", content: "the group's private conversation", reactions: {}, timestamp: 1,
};

function openTheDoomedGang() {
  useGangStore.setState({
    gangs: [{ id: "man1" }, { id: "other" }] as never,
    myGangs: [{ id: "man1" }, { id: "other" }] as never,
    activeGang: { id: "man1", name: "Ludo Lounge", handle: "ludo-lounge" } as never,
    members: [{ playerId: "p1" }] as never,
    channels: [{ channelId: "c1" }] as never,
    activeChannelId: "c1",
    messages: { c1: [message] as never },
    coinRequests: { r1: {} as never },
    coinTransfers: [{}] as never,
    pendingJoinRequests: [{}] as never,
    isSubmitting: false,
  });
  useGangInboxStore.setState({
    digests: [{ gangId: "man1" }, { gangId: "other" }] as never,
    loaded: true,
  });
}

const replyWith = (body: unknown, ok = true) => api.apiFetch.mockResolvedValue({ ok, json: async () => body });

describe("deleteGang (the owner's action)", () => {
  beforeEach(() => {
    api.apiFetch.mockReset();
    openTheDoomedGang();
  });

  it("sends a DELETE for that Gang, carrying only the typed handle", async () => {
    replyWith({ success: true });

    await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(api.apiFetch).toHaveBeenCalledTimes(1);
    const [url, init] = api.apiFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/gang/man1");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body as string)).toEqual({ confirmHandle: "ludo-lounge" });
  });

  it("leaves nothing of the group in memory once the server says it is gone", async () => {
    replyWith({ success: true });

    const res = await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(res).toEqual({ success: true });
    const state = useGangStore.getState();
    expect(state.activeGang).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.channels).toEqual([]);
    expect(state.activeChannelId).toBeNull();
    expect(state.messages).toEqual({});
    expect(state.coinRequests).toEqual({});
    expect(state.coinTransfers).toEqual([]);
    expect(state.pendingJoinRequests).toEqual([]);
  });

  it("drops it from the owner's lists and the inbox, and keeps every other Gang", async () => {
    replyWith({ success: true });

    await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(useGangStore.getState().myGangs.map((m) => m.id)).toEqual(["other"]);
    expect(useGangStore.getState().gangs.map((m) => m.id)).toEqual(["other"]);
    expect(useGangInboxStore.getState().digests.map((d) => d.gangId)).toEqual(["other"]);
  });

  it("does not disturb a different Gang that happens to be open", async () => {
    replyWith({ success: true });
    useGangStore.setState({ activeGang: { id: "other" } as never, messages: { c9: [message] as never } });

    await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(useGangStore.getState().activeGang).toEqual({ id: "other" });
    expect(useGangStore.getState().messages).toEqual({ c9: [message] });
  });

  it("changes nothing and reports the reason when the server refuses", async () => {
    replyWith({ success: false, error: "Only the owner can delete this Gang." }, false);

    const res = await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(res).toEqual({ success: false, error: "Only the owner can delete this Gang." });
    expect(useGangStore.getState().activeGang).not.toBeNull();
    expect(useGangStore.getState().myGangs.map((m) => m.id)).toEqual(["man1", "other"]);
    expect(useGangInboxStore.getState().digests).toHaveLength(2);
  });

  it("changes nothing when the network fails, and says so", async () => {
    api.apiFetch.mockRejectedValue(new Error("offline"));

    const res = await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(res).toEqual({ success: false, error: "offline" });
    expect(useGangStore.getState().activeGang).not.toBeNull();
  });

  it("does not treat a reply without success:true as a deletion", async () => {
    replyWith({});

    const res = await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(res.success).toBe(false);
    expect(useGangStore.getState().activeGang).not.toBeNull();
  });

  it("marks itself busy while waiting, and never leaves itself stuck busy", async () => {
    let finish: (v: unknown) => void = () => undefined;
    api.apiFetch.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    const pending = useGangStore.getState().deleteGang("man1", "ludo-lounge");
    expect(useGangStore.getState().isSubmitting).toBe(true);
    finish({ ok: true, json: async () => ({ success: false, error: "no" }) });
    await pending;

    expect(useGangStore.getState().isSubmitting).toBe(false);
  });
});

describe("applyGangDeleted (someone else's deletion, or the echo of your own)", () => {
  beforeEach(() => {
    api.apiFetch.mockReset();
    openTheDoomedGang();
  });

  it("removes the Gang everywhere and reports that it was news", () => {
    const wasNews = useGangStore.getState().applyGangDeleted("man1");

    expect(wasNews).toBe(true);
    expect(useGangStore.getState().activeGang).toBeNull();
    expect(useGangStore.getState().messages).toEqual({});
    expect(useGangStore.getState().myGangs.map((m) => m.id)).toEqual(["other"]);
    expect(useGangInboxStore.getState().digests.map((d) => d.gangId)).toEqual(["other"]);
  });

  it("is news to a member who only had it in their inbox, never having opened it", () => {
    useGangStore.setState({ activeGang: null, myGangs: [], gangs: [] });

    expect(useGangStore.getState().applyGangDeleted("man1")).toBe(true);
    expect(useGangInboxStore.getState().digests.map((d) => d.gangId)).toEqual(["other"]);
  });

  it("is NOT news the second time, so nobody is told twice", () => {
    useGangStore.getState().applyGangDeleted("man1");

    expect(useGangStore.getState().applyGangDeleted("man1")).toBe(false);
  });

  it("is NOT news to the owner who just deleted it themselves", async () => {
    replyWith({ success: true });
    await useGangStore.getState().deleteGang("man1", "ludo-lounge");

    expect(useGangStore.getState().applyGangDeleted("man1")).toBe(false);
  });

  it("knows nothing about a Gang it never held, and touches nothing", () => {
    const before = useGangStore.getState().myGangs;

    expect(useGangStore.getState().applyGangDeleted("never-heard-of-it")).toBe(false);
    expect(useGangStore.getState().myGangs).toBe(before);
    expect(useGangStore.getState().activeGang).not.toBeNull();
  });
});

describe("gangInboxStore.forget", () => {
  it("removes one Gang's summary and no one else's", () => {
    useGangInboxStore.setState({
      digests: [{ gangId: "a" }, { gangId: "b" }, { gangId: "c" }] as never,
      loaded: true,
    });

    useGangInboxStore.getState().forget("b");

    expect(useGangInboxStore.getState().digests.map((d) => d.gangId)).toEqual(["a", "c"]);
  });

  it("is a no-op for one it does not hold", () => {
    useGangInboxStore.setState({ digests: [{ gangId: "a" }] as never, loaded: true });
    const before = useGangInboxStore.getState().digests;

    useGangInboxStore.getState().forget("zzz");

    expect(useGangInboxStore.getState().digests).toBe(before);
  });
});
