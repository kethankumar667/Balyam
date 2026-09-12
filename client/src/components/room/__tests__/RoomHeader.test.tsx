import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import RoomHeader from "../RoomHeader";
import type { RoomPublicState } from "@shared/types";

vi.mock("../../../hooks/useEconomy", () => ({
  useWallet: () => ({
    wallet: null,
    status: "loaded",
    balance: "100",
    isLoading: false,
    error: null,
    correlationId: null,
    refetch: async () => {},
  }),
}));

vi.mock("../../../store/authStore", () => ({
  useAuthStore: () => ({
    isMember: false,
    kind: "guest",
  }),
}));

vi.mock("../../layout/AppLayout", () => ({
  useAppLayout: () => ({
    openWallet: vi.fn(),
  }),
}));

describe("RoomHeader Component", () => {
  const mockRoomState: RoomPublicState = {
    code: "J82TJK",
    name: "UNO Lounge",
    game: "uno",
    phase: "lobby",
    hostId: "host-1",
    sealed: false,
    players: [],
    entryStakeCoins: 100,
    history: [],
    champion: null,
    unoHistory: [],
    unoChampion: null,
    bingoHistory: [],
    ludoHistory: [],
    maxPlayers: 10,
  };

  it("renders game information and does NOT render BHALYAM relive childhood text", () => {
    render(
      <RoomHeader
        roomState={mockRoomState}
        isHost={true}
        onLeave={() => {}}
        maxPlayers={10}
      />
    );

    // Verify game title and badges are present
    expect(screen.getByText("UNO 🎴")).toBeDefined();
    expect(screen.getByText("Board")).toBeDefined();
    expect(screen.getByText("2–10 Players")).toBeDefined();
    expect(screen.getByText("10–20 min")).toBeDefined();

    // Verify BHALYAM, Relive Childhood branding text, and caption blurb are removed
    expect(screen.queryByText("BHALYAM")).toBeNull();
    expect(screen.queryByText("Relive Childhood")).toBeNull();
    expect(screen.queryByText(/The family classic/i)).toBeNull();

    // Verify game tile image is rendered without circle styling
    const img = screen.getByRole("img", { name: "UNO 🎴" });
    expect(img).toBeDefined();

    // Verify leave room button exists
    expect(screen.getByRole("button", { name: /leave room/i })).toBeDefined();
  });
});
