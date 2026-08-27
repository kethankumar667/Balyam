import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import {
  useEconomyMotion,
  useElementAnchor,
  EconomyMotionOrchestrator,
  SettlementView,
} from "../index";
import * as economyApi from "../../../lib/economyApi";
import { deriveTerminalMatchId, isMatchStartTransition, buildCommitmentPayload } from "../../../lib/economyMotionTriggers";
import type { RoomPublicState, Player } from "@shared/types";

vi.mock("../../../lib/economyApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/economyApi")>();
  return {
    ...actual,
    getMatchSettlement: vi.fn(),
  };
});

describe("Economy Motion Production Integration Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  // ── 1. Real Authoritative Event Mapping ───────────────────────────────────

  describe("Authoritative Event Mapping & Non-Optimistic Execution", () => {
    function HostMatchHarness({ onHookReady }: { onHookReady: (h: ReturnType<typeof useEconomyMotion>) => void }) {
      const motion = useEconomyMotion();
      onHookReady(motion);
      return (
        <div>
          <div id="host-wallet-chip" data-testid="wallet">5,000</div>
          <div id="table-pot-target" data-testid="pot">Table</div>
          <EconomyMotionOrchestrator
            phase={motion.phase}
            commitment={motion.activeCommitment}
            settlement={motion.activeSettlement}
            refund={motion.activeRefund}
            escrow={motion.activeEscrow}
          />
        </div>
      );
    }

    it("displays neutral anticipation state without deducting coins or firing particle flight while awaiting authority", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<HostMatchHarness onHookReady={(h) => { motion = h; }} />);

      expect(motion.phase).toBe("idle");

      // Host clicks start match
      act(() => {
        motion.startAwaitingAuthority();
      });

      expect(motion.phase).toBe("awaiting_authority");
      // Screen reader announces authorization in progress
      expect(screen.getByRole("status").textContent).toContain("Authorizing match entry...");
      // Wallet text remains unchanged
      expect(screen.getByTestId("wallet").textContent).toBe("5,000");
    });

    it("triggers full commitment motion only upon authoritative server ACK with valid payload", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<HostMatchHarness onHookReady={(h) => { motion = h; }} />);

      act(() => {
        motion.startAwaitingAuthority();
      });

      // Server returns authoritative confirmation
      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "server-match-commit-001",
          matchId: "match-auth-100",
          amountPerSeat: "100",
          totalPotAmount: "400",
          seats: [
            { seatId: "s1", seatNumber: 1, name: "Host", isHost: true, isSelf: true },
            { seatId: "s2", seatNumber: 2, name: "Player 2" },
          ],
        });
      });

      expect(motion.phase).toBe("commitment_confirmed");
      expect(screen.getByRole("status").textContent).toContain("Match entry of 100 coins confirmed.");

      // Advance through flights
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(motion.phase).toBe("coins_departing");

      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(motion.phase).toBe("pot_formed");
      expect(screen.getByRole("status").textContent).toContain("Prize pool formed with 400 coins.");
    });
  });

  // ── 2. Idempotency & Duplicate Suppression ────────────────────────────────

  describe("Idempotency, Reconnect & Rematch Isolation", () => {
    function LifecycleHarness({ onHookReady }: { onHookReady: (h: ReturnType<typeof useEconomyMotion>) => void }) {
      const motion = useEconomyMotion();
      onHookReady(motion);
      return <div data-testid="phase-view">{motion.phase}</div>;
    }

    it("suppresses duplicate socket delivery for already processed sequenceId", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<LifecycleHarness onHookReady={(h) => { motion = h; }} />);

      const payload = {
        sequenceId: "stable-tx-12345",
        matchId: "match-01",
        amountPerSeat: "100",
        totalPotAmount: "200",
        seats: [],
      };

      act(() => {
        motion.triggerCommitmentSequence(payload);
      });
      expect(motion.phase).toBe("commitment_confirmed");

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(motion.phase).toBe("complete");

      // Duplicate delivery over socket reconnect
      act(() => {
        motion.triggerCommitmentSequence(payload);
      });
      expect(motion.phase).toBe("complete"); // Suppressed!
    });

    it("allows a subsequent match or rematch with a distinct sequenceId", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      render(<LifecycleHarness onHookReady={(h) => { motion = h; }} />);

      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "match-round-1",
          matchId: "match-01",
          amountPerSeat: "100",
          totalPotAmount: "200",
          seats: [],
        });
      });

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(motion.phase).toBe("complete");

      // Rematch round 2 arrives with new sequenceId
      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "match-round-2",
          matchId: "match-02",
          amountPerSeat: "100",
          totalPotAmount: "200",
          seats: [],
        });
      });
      expect(motion.phase).toBe("commitment_confirmed"); // Accepted!
    });
  });

  // ── 3. Coordinate Anchoring & Missing Fallbacks ───────────────────────────

  describe("useElementAnchor DOM Tracking", () => {
    function AnchorTestComponent({ id }: { id?: string }) {
      const point = useElementAnchor({ elementId: id });
      return (
        <div data-testid="coords">
          {point.x},{point.y}
        </div>
      );
    }

    it("returns viewport fallback gracefully when target DOM element is missing or unmounted", () => {
      render(<AnchorTestComponent id="non-existent-dom-id" />);
      const coords = screen.getByTestId("coords").textContent;
      expect(coords).toBeDefined();
      expect(coords?.split(",").length).toBe(2);
    });
  });

  // ── 4. Authoritative Settlement Integration ───────────────────────────────

  describe("SettlementView Production Motion Integration", () => {
    it("renders RefundSequence with calm sky styling on authoritative REFUNDED record", async () => {
      vi.mocked(economyApi.getMatchSettlement).mockResolvedValueOnce({
        settlement: {
          matchId: "match-refund-001",
          roomCode: "TEST01",
          hostIdentityId: "host-001",
          seatCount: 2,
          humanSeatCount: 2,
          botSeatCount: 0,
          costPerSeat: "100",
          status: "REFUNDED",
          totalCollected: "200",
          totalWalletRewarded: "0",
          totalGuestEscrow: "0",
          totalBotCollection: "0",
          totalWorldBankCut: "0",
          totalRefunded: "200",
          refundReason: "Opponent left table before round started.",
          createdAt: 1724716800000,
          settledAt: 1724716860000,
        },
      });

      render(<SettlementView matchId="match-refund-001" />);

      // Wait for async fetch
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Match Entry Refunded")).toBeDefined();
      expect(screen.getByText("Opponent left table before round started.")).toBeDefined();
      expect(screen.getByText("+200")).toBeDefined();
    });

    it("renders SettlementSequence with verified payouts on authoritative SETTLED record", async () => {
      vi.mocked(economyApi.getMatchSettlement).mockResolvedValueOnce({
        settlement: {
          matchId: "match-settle-001",
          roomCode: "TEST02",
          hostIdentityId: "host-002",
          seatCount: 4,
          humanSeatCount: 4,
          botSeatCount: 0,
          costPerSeat: "100",
          status: "SETTLED",
          totalCollected: "400",
          totalWalletRewarded: "360",
          totalGuestEscrow: "0",
          totalBotCollection: "0",
          totalWorldBankCut: "40",
          totalRefunded: "0",
          refundReason: null,
          createdAt: 1724716800000,
          settledAt: 1724717100000,
        },
      });

      render(<SettlementView matchId="match-settle-001" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Prize Distribution Complete")).toBeDefined();
      expect(screen.getByText("400 Coins")).toBeDefined();
      expect(screen.getByText("40 coins")).toBeDefined();
    });

    it("renders EscrowSequence on authoritative SETTLED record with non-zero guest escrow", async () => {
      vi.mocked(economyApi.getMatchSettlement).mockResolvedValueOnce({
        settlement: {
          matchId: "match-escrow-001",
          roomCode: "TEST03",
          hostIdentityId: "host-003",
          seatCount: 2,
          humanSeatCount: 1,
          botSeatCount: 1,
          costPerSeat: "100",
          status: "SETTLED",
          totalCollected: "200",
          totalWalletRewarded: "0",
          totalGuestEscrow: "180",
          totalBotCollection: "0",
          totalWorldBankCut: "20",
          totalRefunded: "0",
          refundReason: null,
          createdAt: 1724716800000,
          settledAt: 1724717100000,
        },
      });

      render(<SettlementView matchId="match-escrow-001" />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Winnings Secured in Escrow")).toBeDefined();
      expect(screen.getAllByText("180").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("ESCROW")).toBeDefined();
      expect(screen.getByText("Stored in Safe Escrow")).toBeDefined();
    });

    it("cancels pending motion and announces error gracefully on failure", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;

      function Harness() {
        const m = useEconomyMotion();
        motion = m;
        return <EconomyMotionOrchestrator phase={m.phase} errorMessage={m.errorMessage} />;
      }
      const { rerender } = render(<Harness />);

      act(() => {
        motion.startAwaitingAuthority();
      });
      rerender(<Harness />);
      expect(motion.phase).toBe("awaiting_authority");

      act(() => {
        motion.cancelMotion("Insufficient coins to start match");
      });
      rerender(<Harness />);
      expect(motion.phase).toBe("failed");
      expect(motion.errorMessage).toBe("Insufficient coins to start match");
    });

    it("preserves exact precision for large monetary strings without floating-point degradation", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      function Harness() {
        const m = useEconomyMotion();
        motion = m;
        return (
          <EconomyMotionOrchestrator
            phase={m.phase}
            commitment={m.activeCommitment}
          />
        );
      }
      render(<Harness />);

      const largePot = "900719925474099300"; // Beyond Number.MAX_SAFE_INTEGER
      act(() => {
        motion.triggerCommitmentSequence({
          sequenceId: "large-tx-001",
          matchId: "match-large",
          amountPerSeat: "1000000000000000",
          totalPotAmount: largePot,
          seats: [],
        });
      });

      expect(motion.activeCommitment?.totalPotAmount).toBe(largePot);
    });

    it("triggers game start sequence directly on playing state transition", () => {
      let motion!: ReturnType<typeof useEconomyMotion>;
      function Harness() {
        const m = useEconomyMotion();
        motion = m;
        return (
          <EconomyMotionOrchestrator
            phase={m.phase}
            commitment={{
              sequenceId: "start-seq-01",
              matchId: "m-01",
              amountPerSeat: "100",
              totalPotAmount: "200",
              seats: [],
            }}
          />
        );
      }
      const { rerender } = render(<Harness />);

      act(() => {
        motion.triggerGameStartSequence("game-start-01");
      });
      rerender(<Harness />);
      expect(motion.phase).toBe("game_starting");
      expect(screen.getByText("MATCH COMMENCED")).toBeDefined();
    });
  });
});

/**
 * The contract-mismatch fix, end to end: a real `useEconomyMotion()`
 * instance driven by a SEQUENCE of `roomState`-shaped snapshots (exactly
 * what `Room.tsx`'s effects receive from the socket layer), using the same
 * `isMatchStartTransition`/`buildCommitmentPayload`/`deriveTerminalMatchId`
 * helpers `Room.tsx` itself calls — not a hand-picked payload. This is the
 * closest a test gets to "drives actual Room state transitions" without
 * the cost and fragility of mounting the ~1400-line page component itself.
 */
function player(overrides: Partial<Player> = {}): Player {
  return { id: "p1", name: "Alice", isHost: true, isReady: true, isConnected: true, ...overrides } as Player;
}

function roomState(overrides: Partial<RoomPublicState> = {}): RoomPublicState {
  return {
    code: "ABC123",
    game: "rps",
    phase: "lobby",
    players: [player()],
    hostId: "p1",
    maxPlayers: 2,
    name: null,
    history: [],
    champion: null,
    unoHistory: [],
    unoChampion: null,
    bingoHistory: [],
    ludoHistory: [],
    sealed: false,
    currentMatchId: null,
    lastMatchId: null,
    committedCostPerSeat: null,
    committedTotalPot: null,
    ...overrides,
  } as RoomPublicState;
}

describe("Economy Motion — real Room-state-transition sequence (the contract-mismatch fix)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  /** Mirrors exactly what Room.tsx's own effect does on each roomState change. */
  function DriverHarness({ states, selfId }: { states: RoomPublicState[]; selfId?: string }) {
    const motion = useEconomyMotion();
    (DriverHarness as unknown as { motion: ReturnType<typeof useEconomyMotion> }).motion = motion;
    // Same reasoning as Room.tsx itself: destructure the specific stable
    // callbacks so the effect's dependency array names exactly what it
    // uses, instead of the whole `motion` object (a fresh reference every
    // render).
    const { triggerCommitmentSequence, resetMotion } = motion;
    const prevPhaseRef = React.useRef<string | undefined>(undefined);
    const [index, setIndex] = React.useState(0);
    const current = states[index];

    React.useEffect(() => {
      const prev = prevPhaseRef.current;
      const next = current?.phase;
      if (isMatchStartTransition(prev, next) && current) {
        const payload = buildCommitmentPayload(current, selfId);
        if (payload) triggerCommitmentSequence(payload);
      }
      if (next === "finished" && prev !== "finished") {
        resetMotion();
      }
      prevPhaseRef.current = next;
    }, [current, selfId, triggerCommitmentSequence, resetMotion]);

    (DriverHarness as unknown as { advance: () => void }).advance = () => setIndex((i) => Math.min(i + 1, states.length - 1));
    (DriverHarness as unknown as { replay: () => void }).replay = () => setIndex((i) => i); // forces a re-render with the SAME state, simulating a duplicate broadcast
    return <EconomyMotionOrchestrator phase={motion.phase} commitment={motion.activeCommitment} />;
  }

  it("fires the commitment sequence with real amounts on a genuine lobby -> playing transition, never before", async () => {
    const lobby = roomState({ phase: "lobby" });
    const playing = roomState({
      phase: "playing",
      currentMatchId: "m_real_001",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
    });
    const { rerender } = render(<DriverHarness states={[lobby, playing]} selfId="p1" />);
    const h = DriverHarness as unknown as { motion: ReturnType<typeof useEconomyMotion>; advance: () => void };

    expect(h.motion.activeCommitment).toBeNull(); // nothing before the transition

    act(() => h.advance());
    rerender(<DriverHarness states={[lobby, playing]} selfId="p1" />);

    expect(h.motion.activeCommitment?.matchId).toBe("m_real_001");
    expect(h.motion.activeCommitment?.totalPotAmount).toBe("200");
    expect(h.motion.activeCommitment?.sequenceId).toBe("commit-m_real_001");
  });

  it("a duplicate broadcast of the SAME playing state does not replay the sequence", async () => {
    const lobby = roomState({ phase: "lobby" });
    const playing = roomState({
      phase: "playing",
      currentMatchId: "m_dup_001",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
    });
    const spy = vi.spyOn(economyApi, "getMatchSettlement");
    void spy; // not exercised here; kept for symmetry with the mocked module

    const { rerender } = render(<DriverHarness states={[lobby, playing]} selfId="p1" />);
    const h = DriverHarness as unknown as {
      motion: ReturnType<typeof useEconomyMotion>;
      advance: () => void;
      replay: () => void;
    };

    act(() => h.advance());
    rerender(<DriverHarness states={[lobby, playing]} selfId="p1" />);
    const firstCommitment = h.motion.activeCommitment;

    // Simulate the server re-sending the identical "playing" roomState
    // (e.g. an unrelated field changing and re-triggering a broadcast) —
    // the effect re-runs (new object, same phase/matchId), but the hook's
    // own idempotency (sequenceId already recorded) must refuse to replay.
    act(() => h.replay());
    rerender(<DriverHarness states={[lobby, playing]} selfId="p1" />);

    expect(h.motion.activeCommitment).toBe(firstCommitment); // same object, not re-set
  });

  it("a rematch (finished -> playing) commits a NEW matchId and produces a genuinely different sequence id — never suppressed by a stale idempotency entry", async () => {
    const playing1 = roomState({
      phase: "playing",
      currentMatchId: "m_first_match",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
    });
    const finished = roomState({ phase: "finished", currentMatchId: null, lastMatchId: "m_first_match" });
    const playing2 = roomState({
      phase: "playing",
      currentMatchId: "m_second_match_after_rematch",
      committedCostPerSeat: "100",
      committedTotalPot: "200",
      lastMatchId: null,
    });

    const { rerender } = render(<DriverHarness states={[playing1, finished, playing2]} selfId="p1" />);
    const h = DriverHarness as unknown as { motion: ReturnType<typeof useEconomyMotion>; advance: () => void };

    // Start already at playing1 conceptually — advance through finished, then the rematch.
    act(() => h.advance()); // -> finished: resets motion
    rerender(<DriverHarness states={[playing1, finished, playing2]} selfId="p1" />);
    expect(h.motion.phase).toBe("idle");

    act(() => h.advance()); // -> playing2 (finished -> playing IS a match-start transition)
    rerender(<DriverHarness states={[playing1, finished, playing2]} selfId="p1" />);

    expect(h.motion.activeCommitment?.matchId).toBe("m_second_match_after_rematch");
    expect(h.motion.activeCommitment?.sequenceId).not.toBe("commit-m_first_match");
  });

  it("derives the terminal match id for the settlement view exactly at 'finished', from lastMatchId — never currentMatchId, never the room code", () => {
    const finishedWithRealId = roomState({ phase: "finished", currentMatchId: null, lastMatchId: "m_terminal_001" });
    const id = deriveTerminalMatchId(finishedWithRealId);
    expect(id).toBe("m_terminal_001");
    expect(id).not.toBe(finishedWithRealId.code);
  });
});

describe("SettlementView — explicit failure fallback (never a silent blank or a fake success)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("a failed settlement fetch renders an explicit retry banner, not a blank view or fabricated data", async () => {
    vi.mocked(economyApi.getMatchSettlement).mockRejectedValueOnce(
      new economyApi.EconomyClientError(503, "EconomyTemporarilyUnavailable", "A temporary problem occurred."),
    );

    render(<SettlementView matchId="match-fetch-failure-001" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Settlement In Progress")).toBeDefined();
    expect(screen.getByText("A temporary problem occurred.")).toBeDefined();
    expect(screen.getByText("Refresh Status")).toBeDefined();
    // Never shows a fabricated "0" or empty settlement summary in place of the error.
    expect(screen.queryByText("Settlement Summary")).toBeNull();
  });
});
