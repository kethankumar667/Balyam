import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PlayerList from "../PlayerList";
import type { Player } from "@shared/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p1",
    name: "Alice",
    isHost: false,
    isReady: true,
    isConnected: true,
    ...overrides,
  };
}

describe("PlayerList — Quit badge", () => {
  it("shows a Quit badge for a player force-removed by the auto-play turn cap", () => {
    render(
      <PlayerList
        players={[makePlayer({ hasQuit: true, quitReason: "auto_play_limit" })]}
        selfId={null}
      />,
    );

    expect(screen.getByText("Quit")).toBeDefined();
    expect(screen.queryByText("Auto")).toBeNull();
  });

  it("shows the Auto badge, not Quit, for a player still auto-playing (not yet quit)", () => {
    render(
      <PlayerList
        players={[makePlayer({ isAutoPlaying: true, autoPlayReason: "idle" })]}
        selfId={null}
      />,
    );

    expect(screen.getByText("Auto")).toBeDefined();
    expect(screen.queryByText("Quit")).toBeNull();
  });

  it("shows neither badge for a normal, present player", () => {
    render(<PlayerList players={[makePlayer()]} selfId={null} />);

    expect(screen.queryByText("Quit")).toBeNull();
    expect(screen.queryByText("Auto")).toBeNull();
  });
});
