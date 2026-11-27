import { describe, it, expect, vi, beforeEach } from "vitest";

const socket = vi.hoisted(() => ({ disconnectSocket: vi.fn() }));
vi.mock("../../lib/socket", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/socket")>()),
  disconnectSocket: socket.disconnectSocket,
}));

import { useGangStore, resetGangSession } from "../gangStore";
import { useGangInboxStore } from "../gangInboxStore";
import { useRoomInviteStatusStore } from "../roomInviteStatusStore";
import { useAuthStore } from "../authStore";

const message = {
  messageId: "m1", channelId: "c1", gangId: "man1", senderId: "p1", senderName: "Sai", senderAvatar: "a",
  senderRole: "MEMBER", content: "the group's private conversation", reactions: {}, timestamp: 1,
};

function fillWithAGang() {
  useGangStore.setState({
    gangs: [{ id: "public-1" }] as never,
    myGangs: [{ id: "man1" }] as never,
    activeGang: { id: "man1", name: "Ludo Lounge" } as never,
    members: [{ playerId: "p1" }] as never,
    channels: [{ channelId: "c1" }] as never,
    activeChannelId: "c1",
    messages: { c1: [message] as never },
    coinRequests: { r1: {} as never },
    coinTransfers: [{}] as never,
    pendingJoinRequests: [{}] as never,
  });
  useGangInboxStore.setState({ digests: [{ gangId: "man1" }] as never, loaded: true });
  useRoomInviteStatusStore.setState({ statuses: { ABC234: {} as never } });
}

describe("Gang session reset", () => {
  beforeEach(() => {
    socket.disconnectSocket.mockClear();
    useAuthStore.setState({ userId: null, isMember: false } as never);
    fillWithAGang();
  });

  it("leaves nothing of the group's conversation in memory", () => {
    resetGangSession();

    const state = useGangStore.getState();
    expect(state.messages).toEqual({});
    expect(state.activeGang).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.channels).toEqual([]);
    expect(state.activeChannelId).toBeNull();
    expect(state.myGangs).toEqual([]);
    expect(state.coinRequests).toEqual({});
    expect(state.coinTransfers).toEqual([]);
    expect(state.pendingJoinRequests).toEqual([]);
  });

  it("keeps the public directory — anyone may browse it", () => {
    resetGangSession();

    expect(useGangStore.getState().gangs).toEqual([{ id: "public-1" }]);
  });

  it("drops the connection the account authenticated on, so live messages stop arriving", () => {
    resetGangSession();

    expect(socket.disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("clears the notification digests and shared-room statuses too", () => {
    resetGangSession();

    expect(useGangInboxStore.getState().digests).toEqual([]);
    expect(useRoomInviteStatusStore.getState().statuses).toEqual({});
  });

  describe("when the account goes away by any route", () => {
    it("resets on sign-out (a verified member becomes a guest)", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAGang();

      useAuthStore.setState({ userId: null, isMember: false } as never);

      expect(useGangStore.getState().messages).toEqual({});
      expect(socket.disconnectSocket).toHaveBeenCalled();
    });

    it("resets when a local-only member session ends", () => {
      useAuthStore.setState({ userId: null, isMember: true } as never);
      fillWithAGang();

      useAuthStore.setState({ isMember: false } as never);

      expect(useGangStore.getState().messages).toEqual({});
    });

    it("resets when a different account signs in on the same device", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAGang();

      useAuthStore.setState({ userId: "user-2", isMember: true } as never);

      expect(useGangStore.getState().messages).toEqual({});
    });
  });

  describe("when nobody has left", () => {
    it("does not reset when a guest signs in", () => {
      useAuthStore.setState({ userId: null, isMember: false } as never);
      fillWithAGang();
      socket.disconnectSocket.mockClear();

      useAuthStore.setState({ userId: "user-1", isMember: true } as never);

      expect(useGangStore.getState().messages).toEqual({ c1: [message] });
      expect(socket.disconnectSocket).not.toHaveBeenCalled();
    });

    it("does not reset for an unrelated change on the same account", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAGang();
      socket.disconnectSocket.mockClear();

      useAuthStore.setState({ email: "same@example.com" } as never);

      expect(useGangStore.getState().messages).toEqual({ c1: [message] });
      expect(socket.disconnectSocket).not.toHaveBeenCalled();
    });
  });
});
