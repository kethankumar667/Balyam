import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { MandaliActivityEvent, MandaliDigest } from "@shared/mandali/notifications.js";

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

vi.mock("../../lib/socket", () => ({ getSocket: () => io.socket }));
vi.mock("../../store/mandaliStore", () => ({ authenticateMandaliSocket: vi.fn(async () => undefined) }));
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiJson: api.apiJson,
  apiFetch: api.apiFetch,
}));
vi.mock("../../lib/roomJoin", () => ({
  joinRoomByCode: join,
  joinFailureMessage: (f: { reason: string; error: string }) =>
    f.reason === "FULL" ? "That room just filled up — someone took the last seat." : f.error,
}));

import { useMandaliInbox, resetChatToastCooldown } from "../useMandaliInbox";
import { useMandaliInboxStore } from "../../store/mandaliInboxStore";
import { useAuthStore } from "../../store/authStore";
import { toastStore } from "../../lib/toastStore";

const digest = (id: string, name: string, over: Partial<MandaliDigest> = {}): MandaliDigest => ({
  mandaliId: id, handle: id, name, emblem: "", level: "ALL", lastReadAt: "2026-09-24T08:00:00.000Z",
  unreadCount: 0, senderCount: 0, topSenders: [], latest: null, invites: [], ...over,
});

let counter = 0;
const event = (over: Partial<MandaliActivityEvent> = {}): MandaliActivityEvent => {
  counter += 1;
  return {
    mandaliId: "m1", channelId: "c1", messageId: `msg${counter}`, senderId: `sender${counter}`,
    senderName: `Sender${counter}`, kind: "TEXT", preview: `line ${counter}`, at: Date.now(), ...over,
  };
};
const invite = (over: Partial<MandaliActivityEvent> = {}) =>
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
const loaded = () => waitFor(() => expect(useMandaliInboxStore.getState().loaded).toBe(true));

async function mount(digests: MandaliDigest[], path = "/") {
  api.apiJson.mockResolvedValue({ success: true, digests });
  const view = renderHook(() => useMandaliInbox(), { wrapper: wrapperAt(path) });
  await loaded();
  return view;
}

describe("useMandaliInbox", () => {
  beforeEach(() => {
    io.handlers.clear();
    io.socket.on.mockClear();
    io.socket.off.mockClear();
    api.apiJson.mockReset();
    api.apiFetch.mockReset();
    api.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, previous: 0 }) });
    join.mockReset();
    join.mockResolvedValue({ ok: true, code: "ABC234" });
    useMandaliInboxStore.getState().reset();
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

    const { result } = renderHook(() => useMandaliInbox(), { wrapper: wrapperAt("/") });

    expect(result.current.items).toEqual([]);
    expect(io.handlers.get("mandali:activity")).toBeUndefined();
    expect(api.apiJson).not.toHaveBeenCalled();
  });

  it("shows what a member missed as one row per Mandali, from the server's digests", async () => {
    const { result } = await mount([
      digest("m1", "Ludo Lounge", { unreadCount: 47, senderCount: 2, topSenders: [{ name: "Rajesh", count: 30 }, { name: "Sai", count: 17 }] }),
    ]);

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe("47 new messages in Ludo Lounge");
  });

  describe("a shared room", () => {
    it("gets its own toast straight away, with a Join button, and its own row", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("Rajesh invited you to play Ludo · Ludo Lounge");
      expect(toasts()[0].action?.label).toBe("Join");
      expect(result.current.items.map((i) => i.type)).toEqual(["mandali_invite"]);
    });

    it("takes the member straight into the room when they tap Join", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));

      await act(async () => toasts()[0].action!.onClick());

      expect(join).toHaveBeenCalledWith("ABC234");
      await waitFor(() => expect(currentPath).toBe("/room/ABC234"));
    });

    it("says the room filled up, decently, when the join loses the race", async () => {
      join.mockResolvedValue({ ok: false, reason: "FULL", error: "Room is full" });
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));

      await act(async () => toasts()[0].action!.onClick());

      await waitFor(() => expect(toasts().some((t) => t.message.includes("just filled up"))).toBe(true));
      expect(currentPath).toBe("/");
    });

    it("still toasts during a chat cooldown — invitations are never batched", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("mandali:activity", event()));
      toasts().forEach((t) => toastStore.dismiss(t.id));

      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].action?.label).toBe("Join");
    });
  });

  describe("a busy chat", () => {
    it("eight messages from eight people become ONE toast that keeps a running count", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      for (let i = 0; i < 8; i++) act(() => io.fire("mandali:activity", event()));

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].message).toBe("8 new messages in Ludo Lounge");
      expect(toasts()[0].action?.label).toBe("Open");
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].title).toBe("8 new messages in Ludo Lounge");
    });

    it("stays quiet after that toast goes away — the bell keeps counting instead", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("mandali:activity", event()));
      toasts().forEach((t) => toastStore.dismiss(t.id));

      act(() => io.fire("mandali:activity", event()));
      act(() => io.fire("mandali:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items[0].title).toBe("3 new messages in Ludo Lounge");
    });

    it("gives each Mandali its own toast", async () => {
      await mount([digest("m1", "Ludo Lounge"), digest("m2", "Office Gang")]);

      act(() => io.fire("mandali:activity", event({ mandaliId: "m1" })));
      act(() => io.fire("mandali:activity", event({ mandaliId: "m2" })));

      expect(toasts()).toHaveLength(2);
    });

    it("opens the Mandali from the toast", async () => {
      await mount([digest("m1", "Ludo Lounge")]);
      act(() => io.fire("mandali:activity", event()));

      act(() => toasts()[0].action!.onClick());

      expect(currentPath).toBe("/mandali/m1");
    });
  });

  describe("when a Mandali must not interrupt", () => {
    it("MUTED: no toast and no row, even for an invitation", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge", { level: "MUTED" })]);

      act(() => io.fire("mandali:activity", event()));
      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });

    it("INVITES_ONLY: chat is silent, an invitation still comes through", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge", { level: "INVITES_ONLY" })]);

      act(() => io.fire("mandali:activity", event()));
      expect(toasts()).toHaveLength(0);

      act(() => io.fire("mandali:activity", invite({ messageId: "i1" })));
      expect(toasts()).toHaveLength(1);
      expect(result.current.items.map((i) => i.type)).toEqual(["mandali_invite"]);
    });

    it("mid-match: no toast, but the bell still counts", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")], "/room/XYZ789");

      act(() => io.fire("mandali:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toHaveLength(1);
    });

    it("your own message is not news to you", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);

      act(() => io.fire("mandali:activity", event({ senderId: "me" })));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });

    it("the chat you are reading does not notify or count", async () => {
      const { result } = await mount([digest("m1", "Ludo Lounge")]);
      act(() => useMandaliInboxStore.getState().setViewing("m1"));

      act(() => io.fire("mandali:activity", event()));

      expect(toasts()).toHaveLength(0);
      expect(result.current.items).toEqual([]);
    });
  });

  it("reloads when a message arrives from a Mandali it has not heard of (one just joined)", async () => {
    await mount([digest("m1", "Ludo Lounge")]);
    api.apiJson.mockClear();

    act(() => io.fire("mandali:activity", event({ mandaliId: "brand-new" })));

    await waitFor(() => expect(api.apiJson).toHaveBeenCalledWith("/api/mandali/notifications/digests"));
    expect(toasts()).toHaveLength(0);
  });

  describe("the bell's gestures", () => {
    it("'Mark all read' tells the server once per Mandali", async () => {
      const { result } = await mount([
        digest("m1", "Ludo Lounge", { unreadCount: 5, senderCount: 1, topSenders: [{ name: "A", count: 5 }] }),
        digest("m2", "Office Gang", { unreadCount: 3, senderCount: 1, topSenders: [{ name: "B", count: 3 }] }),
      ]);

      act(() => result.current.update((prev) => prev.map((n) => ({ ...n, unread: false }))));

      await waitFor(() => expect(api.apiFetch).toHaveBeenCalledTimes(2));
      const paths = api.apiFetch.mock.calls.map((c) => c[0]).sort();
      expect(paths).toEqual(["/api/mandali/m1/read", "/api/mandali/m2/read"]);
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
      const inviteRow = result.current.items.find((i) => i.type === "mandali_invite")!;

      act(() => result.current.update((prev) => prev.filter((n) => n.id !== inviteRow.id)));

      expect(result.current.items.map((i) => i.type)).toEqual(["mandali"]);
      expect(api.apiFetch).not.toHaveBeenCalled();
    });
  });

  it("clears everything when the member signs out", async () => {
    const { result } = await mount([digest("m1", "Ludo Lounge", { unreadCount: 2, senderCount: 1, topSenders: [{ name: "A", count: 2 }] })]);
    expect(result.current.items).toHaveLength(1);

    act(() => useAuthStore.setState({ isMember: false, userId: null } as never));

    await waitFor(() => expect(result.current.items).toEqual([]));
    expect(useMandaliInboxStore.getState().digests).toEqual([]);
  });

  it("stops listening when unmounted", async () => {
    const { unmount } = await mount([digest("m1", "Ludo Lounge")]);

    unmount();

    expect(io.handlers.get("mandali:activity")?.size ?? 0).toBe(0);
  });
});
