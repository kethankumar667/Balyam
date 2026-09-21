import { describe, it, expect, beforeEach } from "vitest";
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
