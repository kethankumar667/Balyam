import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlayerMiniProfilePopover from "../PlayerMiniProfilePopover";
import { useRoomStore } from "../../../store/roomStore";

describe("PlayerMiniProfilePopover Component", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useRoomStore.setState({
      playerId: "self_player_1",
      playerName: "Self Player",
      roomState: { code: "ROOM99" } as any,
    });
  });

  it("does not render when open is false", () => {
    render(
      <MemoryRouter>
        <PlayerMiniProfilePopover
          open={false}
          onClose={onClose}
          playerId="other_player_2"
          displayName="Kethan"
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders player details and actions when open is true", () => {
    render(
      <MemoryRouter>
        <PlayerMiniProfilePopover
          open={true}
          onClose={onClose}
          playerId="other_player_2"
          displayName="Kethan"
        />
      </MemoryRouter>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByText("Kethan")).toBeDefined();
    expect(screen.getByText(/Invite to Active Room/i)).toBeDefined();
    expect(screen.getByText(/Mute Chat & Reactions/i)).toBeDefined();
  });

  it("renders manage profile for self user", () => {
    render(
      <MemoryRouter>
        <PlayerMiniProfilePopover
          open={true}
          onClose={onClose}
          playerId="self_player_1"
          displayName="Self Player"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Manage My Profile/i)).toBeDefined();
    expect(screen.getByText(/You/i)).toBeDefined();
  });

  it("toggles mute state when mute button is clicked", () => {
    render(
      <MemoryRouter>
        <PlayerMiniProfilePopover
          open={true}
          onClose={onClose}
          playerId="other_player_2"
          displayName="Kethan"
        />
      </MemoryRouter>
    );

    const muteBtn = screen.getByText(/Mute Chat & Reactions/i);
    fireEvent.click(muteBtn);

    expect(screen.getByText(/Unmute Kethan/i)).toBeDefined();
  });
});
