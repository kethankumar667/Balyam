import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { GangActivityEvent, GangDigest } from "@shared/gang/notifications.js";

const io = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const socket = {
    id: "s1",
    connected: true,
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.get(event)?.delete(handler);
    }),
  };
  return { socket, handlers, fire: (event: string, payload: unknown) => handlers.get(event)?.forEach((h) => h(payload)) };
});
const api = vi.hoisted(() => ({ apiJson: vi.fn(), apiFetch: vi.fn() }));
const join = vi.hoisted(() => vi.fn());
/** Stands in for the Gang store's "forget this Gang" — true means it was news to this client. */
const deleted = vi.hoisted(() => ({ apply: vi.fn() }));

/** Who this device is, and who is in the group, for the coin-request celebration. */
const who = vi.hoisted(() => ({ me: "me_1" as string | null, members: [{ playerId: "friend_1", displayName: "Bala", avatar: "bala.png" }, { playerId: "me_1", displayName: "Kethan", avatar: "kethan.png" }] }));

/** Stands in for the wallet reload that follows a coin request being paid. */
const wallet = vi.hoisted(() => ({ refresh: vi.fn(async () => undefined) }));

vi.mock("../../lib/socket", () => ({ getSocket: () => io.socket }));
vi.mock("../useEconomy", () => ({ refreshCurrentWallet: wallet.refresh }));
vi.mock("../../store/gangStore", () => ({
  authenticateGangSocket: vi.fn(async () => undefined),
  useGangStore: { getState: () => ({ applyGangDeleted: deleted.apply, members: who.members }) },
}));
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiJson: api.apiJson,
  apiFetch: api.apiFetch,
  peekPlayerCredential: () => (who.me ? { playerId: who.me, token: "t", kind: "member" as const } : null),
}));
vi.mock("../../lib/roomJoin", () => ({
  joinRoomByCode: join,
  joinFailureMessage: (f: { reason: string; error: string }) =>
    f.reason === "FULL" ? "That room just filled up — someone took the last seat." : f.error,
}));

import { useGangInbox, resetChatToastCooldown } from "../useGangInbox";
import { useGangInboxStore } from "../../store/gangInboxStore";
import { useAuthStore } from "../../store/authStore";
import { toastStore } from "../../lib/toastStore";
import { useGangJoyStore } from "../../store/gangJoyStore";

const digest = (id: string, name: string, over: Partial<GangDigest> = {}): GangDigest => ({
  gangId: id, handle: id, name, emblem: "", level: "ALL", lastReadAt: "2026-09-24T08:00:00.000Z",
  unreadCount: 0, senderCount: 0, topSenders: [], latest: null, invites: [], ...over,
});

let counter = 0;
const event = (over: Partial<GangActivityEvent> = {}): GangActivityEvent => {
  counter += 1;
  return {
    gangId: "m1", channelId: "c1", messageId: `msg${counter}`, senderId: `sender${counter}`,
    senderName: `Sender${counter}`, kind: "TEXT", preview: `line ${counter}`, at: Date.now(), ...over,
  };
};
const invite = (over: Partial<GangActivityEvent> = {}) =>
  event({ kind: "ROOM_INVITE", roomCode: "ABC234", roomInvite: { gameName: "Ludo" }, senderName: "Rajesh", ...over });

let currentPath = "/";
function PathProbe({ children }: { children: ReactNode }) {
  currentPath = useLocation().pathname;
  return <>{children}</>;
}
const wrapperAt = (path: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <PathProbe>{children}</PathProbe>
      </MemoryRouter>
    );
  };

const toasts = () => toastStore.getSnapshot();
const loaded = () => waitFor(() => expect(useGangInboxStore.getState().loaded).toBe(true));

async function mount(digests: GangDigest[], path = "/") {
  api.apiJson.mockResolvedValue({ success: true, digests });
  const view = renderHook(() => useGangInbox(), { wrapper: wrapperAt(path) });
  await loaded();
  return view;
}

describe("useGangInbox", () => {
  beforeEach(() => {
    io.handlers.clear();
    io.socket.on.mockClear();
    io.socket.off.mockClear();
    api.apiJson.mockReset();
    api.apiFetch.mockReset();
    api.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, previous: 0 }) });
    join.mockReset();
    join.mockResolvedValue({ ok: true, code: "ABC234" });
    deleted.apply.mockReset();
    deleted.apply.mockReturnValue(true);
    useGangInboxStore.getState().reset();
    resetChatToastCooldown();
    useAuthStore.setState({ isMember: true, userId: "me", ready: true } as never);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });
  afterEach(() => {
    cleanup();
    toasts().forEach((t) => toastStore.dismiss(t.id));
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  it("does nothing for a guest — no socket listener, no request, no rows", () => {
    useAuthStore.setState({ isMember: false, userId: null, ready: true } as never);

    const { result } = renderHook(() => useGangInbox(), { wrapper: wrapperAt("/") });

    expect(result.current.items).toEqual([]);
    expect(io.handlers.get("gang:activity")).toBeUndefined();
    expect(io.handlers.get("gang:deleted")).toBeUndefined();
    expect(api.apiJson).not.toHaveBeenCalled();
  });

  it("shows what a member missed as one row per Gang, from the server's digests", async () => {
    const { result } = await mount([
      digest("m1", "Ludo Lounge", { unreadCount: 47, senderCount: 2, topSenders: [{ name: "Rajesh", count: 30 }, { name: "Sai", count: 17 }] }),
    ]);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe("47 new messages in Ludo Lounge");
  });

  describe("a shared room", () => {
    it("gets its own toast straight away, with a Join button, and its own row", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("Rajesh invited you to play Ludo · Ludo Lounge");
      expect(toasts()[0].action?.label).toBe("Join");
      expect(result.current.items.map((i) => i.type)).toEqual(["gang_invite"]);
    });

    it("takes the member straight into the room when they tap Join", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));

      await act(async () => toasts()[0].action!.onClick());

      expect(join).toHaveBeenCalledWith("ABC234");
      await waitFor(() => expect(currentPath).toBe("/room/ABC234"));
    });

    it("says the room filled up, decently, when the join loses the race", async () => {
      join.mockResolvedValue({ ok: false, reason: "FULL", error: "Room is full" });
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));

      await act(async () => toasts()[0].action!.onClick());

      await waitFor(() => expect(toasts().some((t) => t.message.includes("just filled up"))).toBe(true));
      expect(currentPath).toBe("/");
    });

    it("still toasts during a chat cooldown — invitations are never batched", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", event()));
      toasts().forEach((t) => toastStore.dismiss(t.id));

      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].action?.label).toBe("Join");
    });
  });

  describe("a busy chat", () => {
    it("eight messages from eight people become ONE toast that keeps a running count", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      for (let i = 0; i < 8; i++) act(() => io.fire("gang:activity", event()));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("8 new messages in Ludo Lounge");
      expect(toasts()[0].action?.label).toBe("Open");
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].title).toBe("8 new messages in Ludo Lounge");
    });

    it("stays quiet after that toast goes away — the bell keeps counting instead", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", event()));
      toasts().forEach((t) => toastStore.dismiss(t.id));

      act(() => io.fire("gang:activity", event()));
      act(() => io.fire("gang:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items[0].title).toBe("3 new messages in Ludo Lounge");
    });

    it("gives each Gang its own toast", async () => {
      await mount([digest("m1", "Ludo Lounge"), digest("m2", "Office Gang")]);

      act(() => io.fire("gang:activity", event({ gangId: "m1" })));
      act(() => io.fire("gang:activity", event({ gangId: "m2" })));

      expect(toasts()).toHaveLength(2);
    });

    it("opens the Gang from the toast", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", event()));

      act(() => toasts()[0].action!.onClick());

      expect(currentPath).toBe("/gang/m1");
    });
  });

  describe("a new member joins", () => {
    const joined = (over: Partial<GangActivityEvent> = {}) =>
      event({ kind: "SYSTEM", senderId: "charan", senderName: "Charan", preview: "Charan joined the Gang", ...over });

    it("tells members elsewhere in the app in one line, without counting it as a missed message", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:activity", joined()));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("Ludo Lounge · Charan joined the Gang");
      expect(toasts()[0].action?.label).toBe("Open");
      expect(result.current.items).toEqual([]);
    });

    it("shows a run of arrivals as one toast that updates, not a stack", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      for (const name of ["Charan", "Divya", "Esha"]) {
        act(() => io.fire("gang:activity", joined({ senderId: name, preview: `${name} joined the Gang` })));
      }

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("Ludo Lounge · Esha joined the Gang");
    });

    it("opens the Gang from the toast", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("gang:activity", joined()));

      act(() => toasts()[0].action!.onClick());

      expect(currentPath).toBe("/gang/m1");
    });

    it("does not tell the person who just joined about themselves", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:activity", joined({ senderId: "me" })));

      expect(toasts()).toHaveLength(0);
    });

    it.each([["MUTED"], ["INVITES_ONLY"]] as const)("stays silent when the Gang is %s", async (level) => {
      await mount([digest("m1", "Ludo Lounge", { level })]);

      act(() => io.fire("gang:activity", joined()));

      expect(toasts()).toHaveLength(0);
    });

    it("stays silent mid-match and while that chat is being read", async () => {
      await mount([digest("m1", "Ludo Lounge")], "/room/XYZ789");
      act(() => io.fire("gang:activity", joined()));
      expect(toasts()).toHaveLength(0);

      cleanup();
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => useGangInboxStore.getState().setViewing("m1"));
      act(() => io.fire("gang:activity", joined()));
      expect(toasts()).toHaveLength(0);
    });
  });

  describe("when a Gang must not interrupt", () => {
    it("MUTED: no toast and no row, even for an invitation", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge", { level: "MUTED" })]);

      act(() => io.fire("gang:activity", event()));
      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });

    it("INVITES_ONLY: chat is silent, an invitation still comes through", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge", { level: "INVITES_ONLY" })]);

      act(() => io.fire("gang:activity", event()));
      expect(toasts()).toHaveLength(0);

      act(() => io.fire("gang:activity", invite({ messageId: "i1" })));
      expect(toasts()).toHaveLength(1);
      expect(result.current.items.map((i) => i.type)).toEqual(["gang_invite"]);
    });

    it("mid-match: no toast, but the bell still counts", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")], "/room/XYZ789");

      act(() => io.fire("gang:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toHaveLength(1);
    });

    it("your own message is not news to you", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:activity", event({ senderId: "me" })));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });

    it("the chat you are reading does not notify or count", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);
      act(() => useGangInboxStore.getState().setViewing("m1"));

      act(() => io.fire("gang:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });
  });

  it("reloads when a message arrives from a Gang it has not heard of (one just joined)", async () => {
    await mount([digest("m1", "Ludo Lounge")]);
    api.apiJson.mockClear();

    act(() => io.fire("gang:activity", event({ gangId: "brand-new" })));

    await waitFor(() => expect(api.apiJson).toHaveBeenCalledWith("/api/gang/notifications/digests"));
    expect(toasts()).toHaveLength(0);
  });

  describe("the bell's gestures", () => {
    it("'Mark all read' tells the server once per Gang", async () => {
      const { result } = await mount([
        digest("m1", "Ludo Lounge", { unreadCount: 5, senderCount: 1, topSenders: [{ name: "A", count: 5 }] }),
        digest("m2", "Office Gang", { unreadCount: 3, senderCount: 1, topSenders: [{ name: "B", count: 3 }] }),
      ]);

      act(() => result.current.update((prev) => prev.map((n) => ({ ...n, unread: false }))));

      await waitFor(() => expect(api.apiFetch).toHaveBeenCalledTimes(2));
      const paths = api.apiFetch.mock.calls.map((c) => c[0]).sort();
      expect(paths).toEqual(["/api/gang/m1/read", "/api/gang/m2/read"]);
      expect(result.current.items).toEqual([]);
    });

    it("dismissing an invitation hides just that row and does not mark the chat read", async () => {
      const { result } = await mount([
        digest("m1", "Ludo Lounge", {
          unreadCount: 6,
          senderCount: 1,
          topSenders: [{ name: "Rajesh", count: 6 }],
          invites: [{ messageId: "i1", roomCode: "ABC234", senderName: "Rajesh", metadata: { gameName: "Ludo" }, at: new Date().toISOString() }],
        }),
      ]);
      const inviteRow = result.current.items.find((i) => i.type === "gang_invite")!;

      act(() => result.current.update((prev) => prev.filter((n) => n.id !== inviteRow.id)));

      expect(result.current.items.map((i) => i.type)).toEqual(["gang"]);
      expect(api.apiFetch).not.toHaveBeenCalled();
    });
  });

  describe("the owner deletes a Gang", () => {
    const deletedEvent = { gangId: "m1", name: "Ludo Lounge" };

    it("tells a member, in one line, wherever they are in the app", async () => {
      await mount([digest("m1", "Ludo Lounge")], "/games");

      act(() => io.fire("gang:deleted", deletedEvent));

      expect(deleted.apply).toHaveBeenCalledWith("m1");
      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("“Ludo Lounge” was deleted by its owner.");
    });

    it("stays quiet for the owner who has just deleted it themselves", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      deleted.apply.mockReturnValue(false);

      act(() => io.fire("gang:deleted", deletedEvent));

      expect(deleted.apply).toHaveBeenCalledWith("m1");
      expect(toasts()).toHaveLength(0);
    });

    it("shows one toast even if the same event arrives twice (two tabs, a reconnect)", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:deleted", deletedEvent));
      act(() => io.fire("gang:deleted", deletedEvent));

      expect(toasts()).toHaveLength(1);
    });

    it.each([
      ["nothing", undefined],
      ["no id", { name: "Ludo Lounge" }],
      ["a numeric id", { gangId: 7, name: "Ludo Lounge" }],
      ["an object as the id", { gangId: { $ne: null }, name: "Ludo Lounge" }],
      ["an empty id", { gangId: "", name: "Ludo Lounge" }],
    ])("ignores a malformed event (%s) without touching anything", async (_label, payload) => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:deleted", payload));

      expect(deleted.apply).not.toHaveBeenCalled();
      expect(toasts()).toHaveLength(0);
    });

    it("copes with a missing name by saying 'A Gang'", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:deleted", { gangId: "m1" }));

      expect(toasts()[0].message).toBe("A Gang you were in was deleted by its owner.");
    });

    it("shows the name as plain text, however odd, and keeps a very long one short", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:deleted", { gangId: "m1", name: `<b>${"x".repeat(200)}</b>` }));

      const message = toasts()[0].message;
      expect(message.startsWith("“<b>x")).toBe(true);
      expect(message.length).toBeLessThan(120);
    });
  });

  describe("a friend pays a coin request", () => {
    beforeEach(() => wallet.refresh.mockClear());

    it("reloads the wallet wherever the member is in the app, not only inside that Gang", async () => {
      await mount([digest("m1", "Ludo Lounge")], "/");

      act(() => io.fire("gang:wallet_changed", { gangId: "m1", requestId: "cr_1", reason: "coin_request_funded" }));

      expect(wallet.refresh).toHaveBeenCalledTimes(1);
    });

    describe("the celebration", () => {
      const funded = (over: Record<string, unknown> = {}) => ({
        gangId: "m1",
        requestId: "cr_1",
        reason: "coin_request_funded",
        amount: 100,
        requesterIdentityId: "me_1",
        fundedByIdentityId: "friend_1",
        ...over,
      });

      beforeEach(() => {
        who.me = "me_1";
        useGangJoyStore.getState().clear();
      });

      it("celebrates for the person who asked, naming the friend who sent the coins", async () => {
        await mount([digest("m1", "Ludo Lounge")]);

        act(() => io.fire("gang:wallet_changed", funded()));

        expect(useGangJoyStore.getState().moment).toMatchObject({ kind: "received", amount: 100, otherName: "Bala" });
      });

      it("gives the person who paid a quieter thank-you", async () => {
        who.me = "friend_1";
        await mount([digest("m1", "Ludo Lounge")]);

        act(() => io.fire("gang:wallet_changed", funded()));

        expect(useGangJoyStore.getState().moment).toMatchObject({ kind: "sent", amount: 100, otherName: "Kethan" });
      });

      it("celebrates nothing when the event carries no amount (an older server)", async () => {
        await mount([digest("m1", "Ludo Lounge")]);

        act(() => io.fire("gang:wallet_changed", { gangId: "m1", requestId: "cr_1", reason: "coin_request_funded" }));

        expect(useGangJoyStore.getState().moment).toBeNull();
      });

      it("celebrates nothing for someone who is neither side of the request", async () => {
        who.me = "stranger_1";
        await mount([digest("m1", "Ludo Lounge")]);

        act(() => io.fire("gang:wallet_changed", funded()));

        expect(useGangJoyStore.getState().moment).toBeNull();
      });

      it("says 'a friend' when the name is not known on this screen", async () => {
        who.members = [];
        await mount([digest("m1", "Ludo Lounge")]);

        act(() => io.fire("gang:wallet_changed", funded()));

        expect(useGangJoyStore.getState().moment?.otherName).toBeNull();
        who.members = [{ playerId: "friend_1", displayName: "Bala", avatar: "bala.png" }, { playerId: "me_1", displayName: "Kethan", avatar: "kethan.png" }];
      });

      it("hands the stage both faces: this player's and the friend's, whichever side they are on", async () => {
        await mount([digest("m1", "Ludo Lounge")]);
        act(() => io.fire("gang:wallet_changed", funded()));
        expect(useGangJoyStore.getState().moment).toMatchObject({
          kind: "received",
          self: { name: "Kethan", avatar: "kethan.png" },
          other: { name: "Bala", avatar: "bala.png" },
        });

        who.me = "friend_1";
        act(() => io.fire("gang:wallet_changed", funded()));
        expect(useGangJoyStore.getState().moment).toMatchObject({
          kind: "sent",
          self: { name: "Bala", avatar: "bala.png" },
          other: { name: "Kethan", avatar: "kethan.png" },
        });
      });
    });

    it("reloads on each payment, so a second request paid later is picked up too", async () => {
      await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("gang:wallet_changed", { gangId: "m1", requestId: "cr_1" }));
      act(() => io.fire("gang:wallet_changed", { gangId: "m1", requestId: "cr_2" }));

      expect(wallet.refresh).toHaveBeenCalledTimes(2);
    });
  });

  it("clears everything when the member signs out", async () => {
    const { result } = await mount([digest("m1", "Ludo Lounge", { unreadCount: 2, senderCount: 1, topSenders: [{ name: "A", count: 2 }] })]);
    expect(result.current.items).toHaveLength(1);

    act(() => useAuthStore.setState({ isMember: false, userId: null } as never));

    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(useGangInboxStore.getState().digests).toEqual([]);
  });

  it("stops listening when unmounted", async () => {
    const { unmount } = await mount([digest("m1", "Ludo Lounge")]);

    unmount();

    expect(io.handlers.get("gang:activity")?.size ?? 0).toBe(0);
    expect(io.handlers.get("gang:deleted")?.size ?? 0).toBe(0);
    expect(io.handlers.get("gang:wallet_changed")?.size ?? 0).toBe(0);
  });
});
