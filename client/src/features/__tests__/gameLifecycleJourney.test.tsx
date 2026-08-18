import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RematchPanel from "../../components/RematchPanel";
import PassPhoneGate from "../../components/PassPhoneGate";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { useRoomStore } from "../../store/roomStore";
import type { Player } from "@shared/types";

const mockEmit = vi.fn();
vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

describe("Priority 4: Game Lifecycle & Rematch Negotiation User Journey", () => {
  const mockPlayers: Player[] = [
    {
      id: "p_host",
      name: "Alice (Host)",
      isHost: true,
      isReady: true,
      isConnected: true,
    },
    {
      id: "p_local_2",
      name: "Ravi (Pass & Play)",
      isHost: false,
      isReady: true,
      isConnected: true,
      isLocal: true,
    },
  ];

  beforeEach(() => {
    mockEmit.mockClear();
    useRoomStore.setState({
      roomState: {
        code: "LUDO77",
        game: "ludo",
        phase: "ended",
        hostId: "p_host",
        players: mockPlayers,
        name: "Grand Table",
      } as any,
      rematch: {
        status: "idle",
        requesterId: null,
        declinedBy: null,
        startsAt: null,
        expiresAt: null,
        responses: {},
      },
    });
  });

  describe("1. Rematch Request & Responses Flow", () => {
    it("renders 'Play Again' button for host in idle state and emits rematch:request", () => {
      render(<RematchPanel players={mockPlayers} selfId="p_host" />);

      const playAgainBtn = screen.getByRole("button", { name: /Play Again/i });
      expect(playAgainBtn).toBeDefined();

      fireEvent.click(playAgainBtn);
      expect(mockEmit).toHaveBeenCalledWith("rematch:request");
    });

    it("renders Accept / Decline controls for non-host player when rematch is pending", () => {
      useRoomStore.setState({
        rematch: {
          status: "pending",
          requesterId: "p_host",
          declinedBy: null,
          startsAt: null,
          expiresAt: Date.now() + 30000,
          responses: { p_host: "accept" },
        },
      });

      render(<RematchPanel players={mockPlayers} selfId="p_local_2" />);

      expect(screen.getByText(/Host wants a rematch/i)).toBeDefined();

      const acceptBtn = screen.getByRole("button", { name: /Accept/i });
      const declineBtn = screen.getByRole("button", { name: /Decline/i });

      fireEvent.click(acceptBtn);
      expect(mockEmit).toHaveBeenCalledWith("rematch:respond", "accept");

      fireEvent.click(declineBtn);
      expect(mockEmit).toHaveBeenCalledWith("rematch:respond", "decline");
    });

    it("renders countdown when rematch is accepted by all participants", () => {
      useRoomStore.setState({
        rematch: {
          status: "accepted",
          requesterId: "p_host",
          declinedBy: null,
          startsAt: Date.now() + 5000,
          expiresAt: Date.now() + 5000,
          responses: { p_host: "accept", p_local_2: "accept" },
        },
      });

      render(<RematchPanel players={mockPlayers} selfId="p_host" />);
      expect(screen.getByText(/New game starts in/i)).toBeDefined();
    });

    it("renders cancellation notice when a participant declines", () => {
      useRoomStore.setState({
        rematch: {
          status: "declined",
          requesterId: "p_host",
          declinedBy: "p_local_2",
          startsAt: null,
          expiresAt: null,
          responses: { p_host: "accept", p_local_2: "decline" },
        },
      });

      render(<RematchPanel players={mockPlayers} selfId="p_host" />);
      expect(screen.getByText(/Ravi \(Pass & Play\) declined the rematch/i)).toBeDefined();
    });
  });

  describe("2. Pass & Play Intermission Gate", () => {
    it("displays handover overlay when it becomes a local player's turn on host device", () => {
      render(
        <PassPhoneGate
          activePlayerId="p_local_2"
          players={mockPlayers}
          isHost={true}
        >
          <div data-testid="game-board">Active Ludo Board</div>
        </PassPhoneGate>
      );

      expect(screen.getByText("Pass the phone")).toBeDefined();
      expect(screen.getAllByText(/Ravi \(Pass & Play\)/i).length).toBeGreaterThan(0);

      // Tap to play button
      const continueBtn = screen.getByRole("button", { name: /Pass the phone to Ravi/i });
      fireEvent.click(continueBtn);

      // Overlay dismisses, board visible
      expect(screen.queryByText("Pass the phone")).toBeNull();
      expect(screen.getByTestId("game-board")).toBeDefined();
    });

    it("does NOT display handover overlay when it is host's own turn", () => {
      render(
        <PassPhoneGate
          activePlayerId="p_host"
          players={mockPlayers}
          isHost={true}
        >
          <div data-testid="game-board">Active Ludo Board</div>
        </PassPhoneGate>
      );

      expect(screen.queryByText("Pass the phone")).toBeNull();
      expect(screen.getByTestId("game-board")).toBeDefined();
    });
  });

  describe("3. Turn Time Warning Component", () => {
    it("renders urgent pulse warning when remaining turn time is low", () => {
      render(<TurnTimeWarning deadline={Date.now() + 4000} active={true} />);

      expect(screen.getByText(/s/i)).toBeDefined();
    });

    it("does not render when turn time is comfortable (>10s)", () => {
      const { container } = render(<TurnTimeWarning deadline={Date.now() + 25000} active={true} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
