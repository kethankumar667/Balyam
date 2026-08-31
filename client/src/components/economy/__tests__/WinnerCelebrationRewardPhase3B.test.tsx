import React from "react";
import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BhalyamResultModal, { type RankedPlayerResult } from "../../BhalyamResultModal";
import { SettlementView } from "../SettlementView";
import type { Player } from "@shared/types";
import * as economyApi from "../../../lib/economyApi";
import { fireFireworksBurst } from "../../../animations/particles/comicBursts";

vi.mock("../../../lib/socket", () => ({
  getSocket: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

vi.mock("../../../store/roomStore", () => ({
  useRoomStore: vi.fn((selector) =>
    selector({
      rematch: { status: "idle", responses: {} },
      roomState: { hostId: "p_1", game: "rummy" },
    }),
  ),
}));

vi.mock("../../../animations/particles/comicBursts", () => ({
  fireFireworksBurst: vi.fn(),
  fireComicDustBurst: vi.fn(),
  fireStarSparkleBurst: vi.fn(),
}));

function mockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "p_1",
    name: "Alice",
    avatar: "avatar_1",
    isHost: true,
    isReady: true,
    isConnected: true,
    isBot: false,
    ...overrides,
  } as Player;
}

const mockRankedPlayers: RankedPlayerResult[] = [
  { id: "p_1", name: "Alice", score: 120, avatar: "avatar_1" },
  { id: "p_2", name: "Bob", score: 85, avatar: "avatar_2" },
  { id: "p_3", name: "Charlie", score: 40, avatar: "avatar_3" },
];

const mockSettledRecord: economyApi.MatchEconomySettlementRecord = {
  matchId: "m_settle_phase3b",
  roomCode: "ROOM01",
  hostIdentityId: "host_1",
  seatCount: 3,
  humanSeatCount: 3,
  botSeatCount: 0,
  costPerSeat: "100",
  totalCollected: "300",
  totalWalletRewarded: "270",
  totalGuestEscrow: "0",
  totalBotCollection: "0",
  totalWorldBankCut: "30",
  totalRefunded: "0",
  refundReason: null,
  status: "SETTLED",
  createdAt: Date.now() - 60000,
  settledAt: Date.now(),
};

describe("Phase 3B: Reward Distribution & Winner Celebration System", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
  });

  // ── 1. Authoritative Reward Distribution ───────────────────────────────────

  describe("Feature 1: Authoritative Reward Distribution", () => {
    it("renders the aggregate wallet-prize total without attributing it to a named winner", async () => {
      vi.spyOn(economyApi, "getMatchSettlement").mockResolvedValueOnce({
        settlement: mockSettledRecord,
      });

      render(<SettlementView matchId="m_settle_phase3b" />);

      // Initially shows loading skeleton
      expect(screen.getByLabelText("Loading economy data")).toBeDefined();

      // Wait for async fetch to resolve
      await act(async () => {
        await Promise.resolve();
      });

      // Verified: authoritative pot and aggregate wallet-prize total displayed
      expect(screen.getByText("Prize Distribution Complete")).toBeDefined();
      expect(screen.getByText("300 Coins")).toBeDefined();
      expect(screen.getByText("+270")).toBeDefined();
      // totalWalletRewarded is a sum across up to 3 placements — must never
      // be presented as one named individual's personal credit.
      expect(screen.getByText("Wallet Prizes Distributed")).toBeDefined();
      expect(screen.getByText(/Aggregate coins credited across all winning wallets/i)).toBeDefined();
      expect(screen.queryByText(/\(You\)/i)).toBeNull();
      expect(screen.queryByText("Alice")).toBeNull();
      expect(screen.getByText(/World Bank Community Reserve Contribution:/i)).toBeDefined();
      expect(screen.getByText(/30 coins/i)).toBeDefined();
    });

    it("never shows the aggregate wallet-prize row as a self-credit regardless of who is viewing", async () => {
      vi.spyOn(economyApi, "getMatchSettlement").mockResolvedValueOnce({
        settlement: mockSettledRecord,
      });

      const { container } = render(<SettlementView matchId="m_settle_phase3b" />);

      await act(async () => {
        await Promise.resolve();
      });

      // The "(You)"-eligible highlight class is never applied to the
      // aggregate row — there's no self-identity in an aggregate figure.
      expect(container.querySelector(".bg-amber-500\\/20.border-amber-500\\/50")).toBeNull();
    });

    it("displays guest escrow voucher sequence when guest winnings are present", async () => {
      const escrowRecord: economyApi.MatchEconomySettlementRecord = {
        ...mockSettledRecord,
        matchId: "m_escrow_phase3b",
        totalGuestEscrow: "150",
      };

      vi.spyOn(economyApi, "getMatchSettlement").mockResolvedValueOnce({
        settlement: escrowRecord,
      });

      render(<SettlementView matchId="m_escrow_phase3b" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText(/Winnings Secured in Escrow/i)).toBeDefined();
      expect(screen.getAllByText("150").length).toBeGreaterThanOrEqual(1);
    });

    it("displays refund sequence when settlement status is REFUNDED", async () => {
      const refundedRecord: economyApi.MatchEconomySettlementRecord = {
        ...mockSettledRecord,
        matchId: "m_refund_phase3b",
        status: "REFUNDED",
        totalRefunded: "300",
        refundReason: "Abandoned match refunded to table host",
      };

      vi.spyOn(economyApi, "getMatchSettlement").mockResolvedValueOnce({
        settlement: refundedRecord,
      });

      render(<SettlementView matchId="m_refund_phase3b" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText(/Match Entry Refunded/i)).toBeDefined();
      expect(screen.getByText(/Abandoned match refunded to table host/i)).toBeDefined();
    });
  });

  // ── 2. Winner Celebration & Runner-Up Experience ───────────────────────────

  describe("Feature 2: Winner Celebration & Runner-Up Experience", () => {
    it("renders winner headline, trophy, and triggers fireworks burst on mount", () => {
      render(
        <BhalyamResultModal
          winnerId="p_1"
          winnerName="Alice"
          winnerScore={120}
          rankedPlayers={mockRankedPlayers}
          players={[mockPlayer({ id: "p_1" }), mockPlayer({ id: "p_2" })]}
          selfId="p_1"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("- You win! -")).toBeDefined();
      expect(screen.getByText("+120 points")).toBeDefined();
      expect(fireFireworksBurst).toHaveBeenCalledWith({ intensity: 0.95 });
    });

    it("renders subtle runner-up and 3rd place badges for non-winning participants", () => {
      render(
        <BhalyamResultModal
          winnerId="p_1"
          winnerName="Alice"
          winnerScore={120}
          rankedPlayers={mockRankedPlayers}
          players={[
            mockPlayer({ id: "p_1" }),
            mockPlayer({ id: "p_2", name: "Bob" }),
            mockPlayer({ id: "p_3", name: "Charlie" }),
          ]}
          selfId="p_2"
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("- Alice wins! -")).toBeDefined();
      expect(screen.getByText("Runner-Up")).toBeDefined();
      expect(screen.getByText("3rd")).toBeDefined();
      expect(screen.getByText("Bob")).toBeDefined();
    });

    it("suppresses Runner-Up/3rd badges when non-winners are tied (no genuine placement to claim)", () => {
      // Mirrors Room.tsx's generic rankedPlayers fallback for games without
      // their own scorecard: winner scores 100, every other seat scores 0 —
      // an unconditional tie with no real placement information.
      const tiedPlayers: RankedPlayerResult[] = [
        { id: "p_1", name: "Alice", score: 100 },
        { id: "p_2", name: "Bob", score: 0 },
        { id: "p_3", name: "Charlie", score: 0 },
      ];

      render(
        <BhalyamResultModal
          winnerId="p_1"
          winnerName="Alice"
          rankedPlayers={tiedPlayers}
          players={[
            mockPlayer({ id: "p_1" }),
            mockPlayer({ id: "p_2", name: "Bob" }),
            mockPlayer({ id: "p_3", name: "Charlie" }),
          ]}
          selfId="p_2"
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByText("Runner-Up")).toBeNull();
      expect(screen.queryByText("3rd")).toBeNull();
    });
  });

  // ── 3. Results Screen Polish & Accessibility ───────────────────────────────

  describe("Feature 3: Results Screen Polish & Accessibility", () => {
    it("provides screen-reader polite live announcement of match winner", () => {
      render(
        <BhalyamResultModal
          winnerId="p_1"
          winnerName="Alice"
          rankedPlayers={mockRankedPlayers}
          players={[mockPlayer({ id: "p_1" }), mockPlayer({ id: "p_2" })]}
          selfId="p_2"
          onClose={vi.fn()}
        />,
      );

      const liveRegions = screen.getAllByRole("status");
      const announcement = liveRegions.find((r) => r.textContent === "Alice won the match.");
      expect(announcement).toBeDefined();
    });

    it("does not forward winner identity into the settlement view's aggregate payout row", async () => {
      vi.spyOn(economyApi, "getMatchSettlement").mockResolvedValueOnce({
        settlement: mockSettledRecord,
      });

      render(
        <BhalyamResultModal
          winnerId="p_1"
          winnerName="Alice"
          rankedPlayers={mockRankedPlayers}
          players={[mockPlayer({ id: "p_1" }), mockPlayer({ id: "p_2" })]}
          selfId="p_1"
          matchId="m_settle_phase3b"
          onClose={vi.fn()}
        />,
      );

      await act(async () => {
        await Promise.resolve();
      });

      // "Alice (You)" is legitimate in the game-victory headline/live-region
      // above (winnerId/selfId are authoritative there), but must never
      // reach the aggregate wallet-prize row inside SettlementView.
      expect(screen.getByText("- You win! -")).toBeDefined();
      expect(screen.getByText("Wallet Prizes Distributed")).toBeDefined();
      expect(screen.queryByText(/Alice \(You\)/i)).toBeNull();
    });
  });
});
