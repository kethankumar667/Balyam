import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LobbyActionBar from "../../components/room/LobbyActionBar";
import ParticipantPanel from "../../components/room/ParticipantPanel";
import LeaveRoomModal from "../../components/room/LeaveRoomModal";
import CompactColorSelector from "../../components/room/CompactColorSelector";
import type { Player } from "@shared/types";

describe("Priority 2: Room Lifecycle & Host Controls User Journey", () => {
  const mockPlayers: Player[] = [
    {
      id: "p_host",
      name: "Alice (Host)",
      isHost: true,
      isReady: true,
      isConnected: true,
      chosenColor: "red",
    },
    {
      id: "p_guest",
      name: "Bob (Player 2)",
      isHost: false,
      isReady: false,
      isConnected: true,
      chosenColor: "blue",
    },
  ];

  describe("1. Lobby Readiness & Action Controls", () => {
    it("renders ready toggle and calls onToggleReady on user interaction", () => {
      const onToggleReady = vi.fn();
      const onStartGame = vi.fn();

      render(
        <LobbyActionBar
          isHost={false}
          isReady={false}
          canStart={false}
          startGameDisabledReason="Waiting for all players to ready up"
          readyCount={1}
          totalCount={2}
          onToggleReady={onToggleReady}
          onStartGame={onStartGame}
          variant="desktop-panel"
        />
      );

      // Verify ready count text
      expect(screen.getByText("1 of 2 ready")).toBeDefined();

      // Click "I'm Ready"
      const readyBtn = screen.getByRole("button", { name: /I'm Ready/i });
      fireEvent.click(readyBtn);
      expect(onToggleReady).toHaveBeenCalledTimes(1);
    });

    it("displays 'Ready (Cancel)' when user is already marked ready", () => {
      const onToggleReady = vi.fn();

      render(
        <LobbyActionBar
          isHost={false}
          isReady={true}
          canStart={false}
          startGameDisabledReason={null}
          readyCount={2}
          totalCount={2}
          onToggleReady={onToggleReady}
          onStartGame={() => {}}
          variant="desktop-panel"
        />
      );

      const cancelBtn = screen.getByRole("button", { name: /Ready \(Cancel\)/i });
      expect(cancelBtn).toBeDefined();
      fireEvent.click(cancelBtn);
      expect(onToggleReady).toHaveBeenCalledTimes(1);
    });

    it("disables Start Game for host when players are not ready with descriptive reason", () => {
      const onStartGame = vi.fn();

      render(
        <LobbyActionBar
          isHost={true}
          isReady={true}
          canStart={false}
          startGameDisabledReason="Waiting for Bob (Player 2)"
          readyCount={1}
          totalCount={2}
          onToggleReady={() => {}}
          onStartGame={onStartGame}
          variant="desktop-panel"
        />
      );

      const startBtn = screen.getByRole("button", { name: /Start Game/i });
      expect(startBtn.hasAttribute("disabled")).toBe(true);
      expect(screen.getByText("Waiting for Bob (Player 2)")).toBeDefined();

      fireEvent.click(startBtn);
      expect(onStartGame).not.toHaveBeenCalled();
    });

    it("enables Start Game when all conditions are satisfied", () => {
      const onStartGame = vi.fn();

      render(
        <LobbyActionBar
          isHost={true}
          isReady={true}
          canStart={true}
          startGameDisabledReason={null}
          readyCount={2}
          totalCount={2}
          onToggleReady={() => {}}
          onStartGame={onStartGame}
          variant="desktop-panel"
        />
      );

      const startBtn = screen.getByRole("button", { name: /Start Game/i });
      expect(startBtn.hasAttribute("disabled")).toBe(false);

      fireEvent.click(startBtn);
      expect(onStartGame).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Participant Management & Bot Controls", () => {
    it("renders all participants with correct roles, readiness, and colors", () => {
      render(
        <ParticipantPanel
          players={mockPlayers}
          maxPlayers={4}
          selfId="p_host"
          isHost={true}
          game="ludo"
          onAddBot={vi.fn()}
        />
      );

      expect(screen.getByText("Alice (Host)")).toBeDefined();
      expect(screen.getByText("Bob (Player 2)")).toBeDefined();
      expect(screen.getByText("You")).toBeDefined();
      expect(screen.getByText("Host")).toBeDefined();
      expect(screen.getByText("1/2 Ready")).toBeDefined();
    });

    it("allows host to quick-add bot when table has empty seats", () => {
      const onAddBot = vi.fn();

      render(
        <ParticipantPanel
          players={mockPlayers}
          maxPlayers={4}
          selfId="p_host"
          isHost={true}
          game="ludo"
          onAddBot={onAddBot}
        />
      );

      const quickBotBtn = screen.getByRole("button", { name: /Add Bot/i });
      expect(quickBotBtn).toBeDefined();

      fireEvent.click(quickBotBtn);
      expect(onAddBot).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Color Selection System", () => {
    it("allows choosing available color and disables occupied colors", () => {
      const onChooseLudoColor = vi.fn();

      render(
        <CompactColorSelector
          kind="ludo"
          players={mockPlayers}
          selfId="p_host"
          onChooseLudoColor={onChooseLudoColor}
        />
      );

      // Green is unselected, so should be clickable
      const greenBtn = screen.getByRole("button", { name: /Color Green/i });
      expect(greenBtn.hasAttribute("disabled")).toBe(false);
      fireEvent.click(greenBtn);
      expect(onChooseLudoColor).toHaveBeenCalledWith("green");

      // Blue is occupied by Bob, should be disabled
      const blueBtn = screen.getByRole("button", { name: /Occupied by Bob/i });
      expect(blueBtn.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("4. Leave Room Modal Interaction", () => {
    it("renders leave confirmation modal and handles stay and confirm actions", () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      const { rerender } = render(
        <LeaveRoomModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Leave this table?")).toBeDefined();

      // Click Stay Here
      const stayBtn = screen.getByRole("button", { name: /Stay Here/i });
      fireEvent.click(stayBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Click Leave Room
      const leaveBtn = screen.getByRole("button", { name: /Leave Room/i });
      fireEvent.click(leaveBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);

      // Verify modal hides when isOpen is false
      rerender(
        <LeaveRoomModal
          isOpen={false}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      );
      expect(screen.queryByText("Leave this table?")).toBeNull();
    });
  });
});
