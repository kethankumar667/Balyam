import { describe, it, expect, beforeEach, vi } from "vitest";

const apiJsonMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiJson: apiJsonMock,
}));

import { useGangStore } from "../gangStore";

describe("Gang Client Store", () => {
  beforeEach(() => {
    useGangStore.setState({
      gangs: [],
      myGangs: [],
      activeGang: null,
      members: [],
      channels: [],
      activeChannelId: null,
      messages: {},
      memories: [],
      events: [],
      isLoading: false,
      isSubmitting: false,
      errorMessage: null,
    });
  });

  it("initializes with empty default values", () => {
    const state = useGangStore.getState();
    expect(state.gangs).toEqual([]);
    expect(state.activeGang).toBeNull();
    expect(state.activeChannelId).toBeNull();
  });

  it("updates active channel", () => {
    useGangStore.getState().setActiveChannel("ch_test_lounge");
    expect(useGangStore.getState().activeChannelId).toBe("ch_test_lounge");
  });

  describe("loading chat history after a page refresh", () => {
    const message = (id: string, content: string) => ({
      messageId: id, channelId: "ch1", gangId: "m1", senderId: "p1", senderName: "A",
      senderAvatar: "a1", senderRole: "MEMBER", content, reactions: {}, timestamp: 1,
    });

    beforeEach(() => {
      apiJsonMock.mockReset();
      useGangStore.setState({ activeGang: { id: "m1" } as never });
    });

    it("shows the stored messages when the server replies { messages } with no success flag (how it always replied)", async () => {
      apiJsonMock.mockResolvedValue({ messages: [message("a", "hi from A"), message("b", "hi from B")] });

      await useGangStore.getState().fetchMessages("ch1");

      expect(useGangStore.getState().messages["ch1"].map((m) => m.content)).toEqual(["hi from A", "hi from B"]);
    });

    it("shows them when the reply carries success: true", async () => {
      apiJsonMock.mockResolvedValue({ success: true, messages: [message("a", "hello")] });

      await useGangStore.getState().fetchMessages("ch1");

      expect(useGangStore.getState().messages["ch1"]).toHaveLength(1);
    });

    it("keeps what is on screen if the request fails, instead of wiping the chat", async () => {
      useGangStore.setState({ messages: { ch1: [message("a", "already here") as never] } });
      apiJsonMock.mockResolvedValue(null);

      await useGangStore.getState().fetchMessages("ch1");

      expect(useGangStore.getState().messages["ch1"]).toHaveLength(1);
    });
  });
});
