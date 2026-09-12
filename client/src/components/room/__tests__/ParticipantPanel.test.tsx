import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Player } from "@shared/types";
import ParticipantPanel from "../ParticipantPanel";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p_1",
    name: "Player 1",
    isHost: false,
    isReady: true,
    isConnected: true,
    ...overrides,
  };
}

describe("ParticipantPanel — Invite Seat Slot Visibility", () => {
  it("renders empty invite seats when room is NOT full", () => {
    const players = [
      makePlayer({ id: "p_host", name: "Host", isHost: true }),
      makePlayer({ id: "p_2", name: "Guest" }),
    ];

    render(
      <ParticipantPanel
        players={players}
        maxPlayers={4}
        selfId="p_host"
        isHost={true}
        game="ludo"
        onAddBot={vi.fn()}
      />
    );

    // Empty seat slots should be visible
    expect(screen.queryAllByLabelText(/Empty seat. Click to invite a friend/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/more seats available/i)).toBeDefined();
  });

  it("does NOT render empty invite seats when room IS full", () => {
    const players = [
      makePlayer({ id: "p_host", name: "Host", isHost: true }),
      makePlayer({ id: "p_2", name: "Guest" }),
      makePlayer({ id: "p_3", name: "Player 3" }),
      makePlayer({ id: "p_4", name: "Player 4" }),
    ];

    render(
      <ParticipantPanel
        players={players}
        maxPlayers={4}
        selfId="p_host"
        isHost={true}
        game="ludo"
        onAddBot={vi.fn()}
      />
    );

    // No empty invite seats should be present
    expect(screen.queryByLabelText(/Empty seat. Click to invite a friend/i)).toBeNull();
    expect(screen.queryByText(/more seats available/i)).toBeNull();
    expect(screen.getByText("Table Full")).toBeDefined();
  });
});
