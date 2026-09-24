import { describe, it, expect, beforeEach, vi } from "vitest";

const apiJsonMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiJson: apiJsonMock,
}));

import { useMandaliStore } from "../mandaliStore";

describe("Mandali Client Store", () => {
  beforeEach(() => {
    useMandaliStore.setState({
      mandalis: [],
      myMandalis: [],
      activeMandali: null,
      members: [],
      channels: [],
      activeChannelId: null,
      messages: {},
      parties: [],
      memories: [],
      events: [],
      activeGameLaunch: null,
      isLoading: false,
      isSubmitting: false,
      errorMessage: null,
    });
  });

  it("initializes with empty default values", () => {
    const state = useMandaliStore.getState();
    expect(state.mandalis).toEqual([]);
    expect(state.activeMandali).toBeNull();
    expect(state.activeChannelId).toBeNull();
    expect(state.activeGameLaunch).toBeNull();
  });

  it("updates active channel", () => {
    useMandaliStore.getState().setActiveChannel("ch_test_lounge");
    expect(useMandaliStore.getState().activeChannelId).toBe("ch_test_lounge");
  });

  describe("loading chat history after a page refresh", () => {
    const message = (id: string, content: string) => ({
      messageId: id, channelId: "ch1", mandaliId: "m1", senderId: "p1", senderName: "A",
      senderAvatar: "a1", senderRole: "MEMBER", content, reactions: {}, timestamp: 1,
    });

    beforeEach(() => {
      apiJsonMock.mockReset();
      useMandaliStore.setState({ activeMandali: { id: "m1" } as never });
    });

    it("shows the stored messages when the server replies { messages } with no success flag (how it always replied)", async () => {
      apiJsonMock.mockResolvedValue({ messages: [message("a", "hi from A"), message("b", "hi from B")] });

      await useMandaliStore.getState().fetchMessages("ch1");

      expect(useMandaliStore.getState().messages["ch1"].map((m) => m.content)).toEqual(["hi from A", "hi from B"]);
    });

    it("shows them when the reply carries success: true", async () => {
      apiJsonMock.mockResolvedValue({ success: true, messages: [message("a", "hello")] });

      await useMandaliStore.getState().fetchMessages("ch1");

      expect(useMandaliStore.getState().messages["ch1"]).toHaveLength(1);
    });

    it("keeps what is on screen if the request fails, instead of wiping the chat", async () => {
      useMandaliStore.setState({ messages: { ch1: [message("a", "already here") as never] } });
      apiJsonMock.mockResolvedValue(null);

      await useMandaliStore.getState().fetchMessages("ch1");

      expect(useMandaliStore.getState().messages["ch1"]).toHaveLength(1);
    });
  });

  it("clears active game launch overlay", () => {
    useMandaliStore.setState({
      activeGameLaunch: {
        mandaliId: "mandali_1",
        partyId: "party_1",
        roomCode: "XYZ123",
        game: "ludo",
        members: [{ playerId: "p1", name: "Player 1" }],
      },
    });

    expect(useMandaliStore.getState().activeGameLaunch).not.toBeNull();
    useMandaliStore.getState().clearActiveLaunch();
    expect(useMandaliStore.getState().activeGameLaunch).toBeNull();
  });
});
