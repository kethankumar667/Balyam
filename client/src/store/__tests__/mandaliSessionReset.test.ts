import { describe, it, expect, vi, beforeEach } from "vitest";

const socket = vi.hoisted(() => ({ disconnectSocket: vi.fn() }));
vi.mock("../../lib/socket", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/socket")>()),
  disconnectSocket: socket.disconnectSocket,
}));

import { useMandaliStore, resetMandaliSession } from "../mandaliStore";
import { useMandaliInboxStore } from "../mandaliInboxStore";
import { useRoomInviteStatusStore } from "../roomInviteStatusStore";
import { useAuthStore } from "../authStore";

const message = {
  messageId: "m1", channelId: "c1", mandaliId: "man1", senderId: "p1", senderName: "Sai", senderAvatar: "a",
  senderRole: "MEMBER", content: "the group's private conversation", reactions: {}, timestamp: 1,
};

function fillWithAMandali() {
  useMandaliStore.setState({
    mandalis: [{ id: "public-1" }] as never,
    myMandalis: [{ id: "man1" }] as never,
    activeMandali: { id: "man1", name: "Ludo Lounge" } as never,
    members: [{ playerId: "p1" }] as never,
    channels: [{ channelId: "c1" }] as never,
    activeChannelId: "c1",
    messages: { c1: [message] as never },
    coinRequests: { r1: {} as never },
    coinTransfers: [{}] as never,
    pendingJoinRequests: [{}] as never,
  });
  useMandaliInboxStore.setState({ digests: [{ mandaliId: "man1" }] as never, loaded: true });
  useRoomInviteStatusStore.setState({ statuses: { ABC234: {} as never } });
}

describe("Mandali session reset", () => {
  beforeEach(() => {
    socket.disconnectSocket.mockClear();
    useAuthStore.setState({ userId: null, isMember: false } as never);
    fillWithAMandali();
  });

  it("leaves nothing of the group's conversation in memory", () => {
    resetMandaliSession();

    const state = useMandaliStore.getState();
    expect(state.messages).toEqual({});
    expect(state.activeMandali).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.channels).toEqual([]);
    expect(state.activeChannelId).toBeNull();
    expect(state.myMandalis).toEqual([]);
    expect(state.coinRequests).toEqual({});
    expect(state.coinTransfers).toEqual([]);
    expect(state.pendingJoinRequests).toEqual([]);
  });

  it("keeps the public directory — anyone may browse it", () => {
    resetMandaliSession();

    expect(useMandaliStore.getState().mandalis).toEqual([{ id: "public-1" }]);
  });

  it("drops the connection the account authenticated on, so live messages stop arriving", () => {
    resetMandaliSession();

    expect(socket.disconnectSocket).toHaveBeenCalledTimes(1);
  });

  it("clears the notification digests and shared-room statuses too", () => {
    resetMandaliSession();

    expect(useMandaliInboxStore.getState().digests).toEqual([]);
    expect(useRoomInviteStatusStore.getState().statuses).toEqual({});
  });

  describe("when the account goes away by any route", () => {
    it("resets on sign-out (a verified member becomes a guest)", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAMandali();

      useAuthStore.setState({ userId: null, isMember: false } as never);

      expect(useMandaliStore.getState().messages).toEqual({});
      expect(socket.disconnectSocket).toHaveBeenCalled();
    });

    it("resets when a local-only member session ends", () => {
      useAuthStore.setState({ userId: null, isMember: true } as never);
      fillWithAMandali();

      useAuthStore.setState({ isMember: false } as never);

      expect(useMandaliStore.getState().messages).toEqual({});
    });

    it("resets when a different account signs in on the same device", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAMandali();

      useAuthStore.setState({ userId: "user-2", isMember: true } as never);

      expect(useMandaliStore.getState().messages).toEqual({});
    });
  });

  describe("when nobody has left", () => {
    it("does not reset when a guest signs in", () => {
      useAuthStore.setState({ userId: null, isMember: false } as never);
      fillWithAMandali();
      socket.disconnectSocket.mockClear();

      useAuthStore.setState({ userId: "user-1", isMember: true } as never);

      expect(useMandaliStore.getState().messages).toEqual({ c1: [message] });
      expect(socket.disconnectSocket).not.toHaveBeenCalled();
    });

    it("does not reset for an unrelated change on the same account", () => {
      useAuthStore.setState({ userId: "user-1", isMember: true } as never);
      fillWithAMandali();
      socket.disconnectSocket.mockClear();

      useAuthStore.setState({ email: "same@example.com" } as never);

      expect(useMandaliStore.getState().messages).toEqual({ c1: [message] });
      expect(socket.disconnectSocket).not.toHaveBeenCalled();
    });
  });
});
