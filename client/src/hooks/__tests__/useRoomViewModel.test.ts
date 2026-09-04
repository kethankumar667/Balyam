import { describe, expect, it } from "vitest";
import { computeRoomViewModel } from "../useRoomViewModel";
import type { RoomPublicState } from "@shared/types";

describe("computeRoomViewModel Characterization Suite", () => {
  it("returns default empty state when roomState is null", () => {
    const vm = computeRoomViewModel(null, null);
    expect(vm.selfPlayer).toBeNull();
    expect(vm.selfIsHost).toBe(false);
    expect(vm.canStartGame).toBe(false);
    expect(vm.totalPlayersCount).toBe(0);
    expect(vm.isRoomFull).toBe(false);
  });

  it("calculates host permissions, ready states, and start triggers in lobby", () => {
    const mockRoomState: RoomPublicState = {
      code: "LUDO01",
      name: "Friday Ludo",
      game: "ludo",
      phase: "lobby",
      hostId: "p_host",
      sealed: false,
      players: [
        { id: "p_host", name: "Host Player", isHost: true, isReady: true, isConnected: true },
        { id: "p_guest", name: "Guest Player", isHost: false, isReady: false, isConnected: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 4,
    };

    // As host
    const hostVm = computeRoomViewModel(mockRoomState, "p_host");
    expect(hostVm.selfIsHost).toBe(true);
    expect(hostVm.selfIsReady).toBe(true);
    expect(hostVm.allReady).toBe(false);
    expect(hostVm.canStartGame).toBe(false);
    expect(hostVm.startGameDisabledReason).toBe("Waiting for 1 player to be ready");
    expect(hostVm.canAddBot).toBe(true);
    expect(hostVm.colorPickerKind).toBe("ludo");

    // As guest
    const guestVm = computeRoomViewModel(mockRoomState, "p_guest");
    expect(guestVm.selfIsHost).toBe(false);
    expect(guestVm.selfIsReady).toBe(false);
    expect(guestVm.canStartGame).toBe(false);
    expect(guestVm.startGameDisabledReason).toBe("Waiting for host to start");
    expect(guestVm.canAddBot).toBe(false);
  });

  it("enables game start when all players are ready and minimum count reached", () => {
    const mockRoomState: RoomPublicState = {
      code: "RPS001",
      name: "RPS Duel",
      game: "rps",
      phase: "lobby",
      hostId: "p_host",
      sealed: false,
      players: [
        { id: "p_host", name: "Player 1", isHost: true, isReady: true, isConnected: true },
        { id: "p_bot", name: "Bot 1", isHost: false, isReady: true, isConnected: true, isBot: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 2,
    };

    const vm = computeRoomViewModel(mockRoomState, "p_host");
    expect(vm.selfIsHost).toBe(true);
    expect(vm.allReady).toBe(true);
    expect(vm.canStartGame).toBe(true);
    expect(vm.startGameDisabledReason).toBeNull();
    expect(vm.isRoomFull).toBe(true);
    expect(vm.canAddBot).toBe(false); // full
    expect(vm.humanPlayers).toHaveLength(1);
    expect(vm.botPlayers).toHaveLength(1);
  });

  it("handles games with no bot support (Snake, SpaceWar, RoadRash)", () => {
    const mockRoomState: RoomPublicState = {
      code: "SNK001",
      name: "Snake Battle",
      game: "snake",
      phase: "lobby",
      hostId: "p_host",
      sealed: false,
      players: [
        { id: "p_host", name: "Host", isHost: true, isReady: true, isConnected: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 4,
    };

    const vm = computeRoomViewModel(mockRoomState, "p_host");
    expect(vm.noBotSupport).toBe(true);
    expect(vm.canAddBot).toBe(false);
    expect(vm.minPlayersNeeded).toBe(1); // Snake can start with 1 player
    expect(vm.canStartGame).toBe(true);
  });

  it("activates Dots & Boxes pen color picker in lobby", () => {
    const mockRoomState: RoomPublicState = {
      code: "DOTS01",
      name: "Dots Table",
      game: "dotsboxes",
      phase: "lobby",
      hostId: "p_host",
      sealed: false,
      players: [
        { id: "p_host", name: "Host", isHost: true, isReady: true, isConnected: true, penColor: "gold" },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 6,
    };

    const vm = computeRoomViewModel(mockRoomState, "p_host");
    expect(vm.colorPickerKind).toBe("dotsboxes");
  });

  it("disables game start for unsupported seat counts (>5 players) with clear corrective reason", () => {
    const mockRoomState: RoomPublicState = {
      code: "LUDO06",
      name: "6-Seat Ludo",
      game: "ludo",
      phase: "lobby",
      hostId: "p_1",
      sealed: false,
      players: [
        { id: "p_1", name: "Player 1", isHost: true, isReady: true, isConnected: true },
        { id: "p_2", name: "Player 2", isHost: false, isReady: true, isConnected: true },
        { id: "p_3", name: "Player 3", isHost: false, isReady: true, isConnected: true },
        { id: "p_4", name: "Player 4", isHost: false, isReady: true, isConnected: true },
        { id: "p_5", name: "Player 5", isHost: false, isReady: true, isConnected: true },
        { id: "p_6", name: "Player 6", isHost: false, isReady: true, isConnected: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 8,
    };

    const vm = computeRoomViewModel(mockRoomState, "p_1");
    expect(vm.allReady).toBe(true);
    expect(vm.totalPlayersCount).toBe(6);
    expect(vm.isSeatCountSupported).toBe(false);
    expect(vm.canStartGame).toBe(false);
    expect(vm.startGameDisabledReason).toBe(
      "Table size exceeds economy capacity (max 5 seats). Remove 1 player to start."
    );
  });

  it("permits game start when table is exactly 5 seats and all players ready", () => {
    const mockRoomState: RoomPublicState = {
      code: "RUMMY05",
      name: "5-Seat Rummy",
      game: "rummy",
      phase: "lobby",
      hostId: "p_1",
      sealed: false,
      players: [
        { id: "p_1", name: "Player 1", isHost: true, isReady: true, isConnected: true },
        { id: "p_2", name: "Player 2", isHost: false, isReady: true, isConnected: true },
        { id: "p_3", name: "Player 3", isHost: false, isReady: true, isConnected: true },
        { id: "p_4", name: "Player 4", isHost: false, isReady: true, isConnected: true },
        { id: "p_5", name: "Player 5", isHost: false, isReady: true, isConnected: true },
      ],
      history: [],
      champion: null,
      unoHistory: [],
      unoChampion: null,
      bingoHistory: [],
      ludoHistory: [],
      maxPlayers: 6,
    };

    const vm = computeRoomViewModel(mockRoomState, "p_1");
    expect(vm.allReady).toBe(true);
    expect(vm.totalPlayersCount).toBe(5);
    expect(vm.isSeatCountSupported).toBe(true);
    expect(vm.canStartGame).toBe(true);
    expect(vm.startGameDisabledReason).toBeNull();
  });
});
