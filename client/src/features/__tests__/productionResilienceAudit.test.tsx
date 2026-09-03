import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OfflineBanner from "../../components/games/OfflineBanner";
import RecoveryBanner from "../../core/recovery/RecoveryBanner";
import GameCard from "../../components/games/GameCard";
import QrCodeModal from "../../components/QrCodeModal";
import LeaderboardPage from "../../pages/LeaderboardPage";
import MatchHistoryPage from "../../pages/MatchHistoryPage";
import GameRoomSheet from "../../components/bhalyam/GameRoomSheet";
import JoinRoomModal from "../../components/bhalyam/JoinRoomModal";
import SocialHubPage from "../../pages/SocialHubPage";
import { toastStore } from "../../lib/toastStore";
import { BHALYAM_GAMES } from "../../components/bhalyam/data";
import { MemoryRouter } from "react-router-dom";
import { useRoomStore } from "../../store/roomStore";
import type { RoomPublicState } from "@shared/types";

// Mock socket
const mockSocketEmit = vi.fn();
const mockSocketConnect = vi.fn();
vi.mock("../../lib/socket", () => ({
  getSocket: () => ({
    emit: mockSocketEmit,
    connect: mockSocketConnect,
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    timeout: vi.fn().mockReturnThis(),
  }),
  useConnectionState: () => "CONNECTED",
}));

// Mock recovery hook
let mockRecoveryState = "CONNECTED";
const mockRetryRecovery = vi.fn();
vi.mock("../../core/recovery/useRecovery", () => ({
  useRecovery: () => ({
    connectionState: mockRecoveryState,
    retryRecovery: mockRetryRecovery,
  }),
}));

// Mock playerIdentity
const mockApiFetch = vi.fn();
vi.mock("../../lib/playerIdentity", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiJson: vi.fn(),
  usePlayerId: () => ({ playerId: "p_test_123", ready: true, kind: "member" }),
  currentGuestToken: () => null,
  ensureGuestToken: () => Promise.resolve(undefined),
  resolveRoomCredential: () => Promise.resolve({ ok: true, kind: "guest", guestToken: "mock-guest-token" }),
  // Needed by `useWallet()` (mounted app-wide via AppHeader/WalletDrawer in
  // AppLayout) since the guest-wallet-consistency fix: it now subscribes to
  // guest-id changes to catch a guest-to-guest identity swap. No swap is
  // exercised in this suite, so a static "no guest" snapshot is sufficient.
  getGuestIdSnapshot: () => null,
  subscribeGuestId: () => () => {},
}));

// Mock router navigation & outlet context
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useOutletContext: () => ({
      profile: { display_name: "Tester", avatar_id: "A1" },
      stats: { totalMatches: 0, wins: 0, losses: 0, winRate: 0 },
      isMember: true,
      effectivePlayerId: "p_test_123",
    }),
  };
});

interface MockAuthState {
  isMember: boolean;
  isSuperAdmin: boolean;
  email: string;
  capabilities: {
    unlockAllFeatures: boolean;
    joinByCode: boolean;
    hostRoom: boolean;
    hostSharedRoom: boolean;
  };
}

const mockAuthState: MockAuthState = {
  isMember: true,
  isSuperAdmin: true,
  email: "test@example.com",
  capabilities: {
    unlockAllFeatures: true,
    joinByCode: true,
    hostRoom: true,
    hostSharedRoom: true,
  },
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: <T,>(selector?: (state: MockAuthState) => T): T | MockAuthState => {
    return selector ? selector(mockAuthState) : mockAuthState;
  },
  currentAccessToken: () => "mock-token",
  currentAccountKind: () => "member",
  currentGuestToken: () => null,
  useCapabilities: () => mockAuthState.capabilities,
  useIdentityPresentation: () => ({
    mode: "member",
    isVerifiedMember: true,
    isLocalFallback: false,
    label: "Member",
    badgeText: "Active Member",
  }),
  getIdentityPresentation: () => ({
    mode: "member",
    isVerifiedMember: true,
    isLocalFallback: false,
    label: "Member",
    badgeText: "Active Member",
  }),
  hasVerifiedMemberIdentity: () => true,
}));

describe("Production UX Resilience Audit Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecoveryState = "CONNECTED";
    useRoomStore.setState({
      playerId: null,
      playerName: "Tester",
      roomState: null,
    });
  });

  describe("1. Offline Handling & Global Banner Coordination", () => {
    it("renders OfflineBanner when offline and cleans up event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      const { unmount } = render(<OfflineBanner />);

      const banner = screen.getByRole("alert");
      expect(banner).toBeInTheDocument();
      expect(screen.getByText(/You are currently offline/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    });

    it("toggles OfflineBanner on browser offline and online events", () => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      render(<OfflineBanner />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      expect(screen.getByRole("alert")).toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new Event("online"));
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("suppresses RecoveryBanner when device is offline to prevent duplicate banners", () => {
      mockRecoveryState = "RECONNECTING";
      useRoomStore.setState({
        roomState: { code: "ABC123", players: [] } as unknown as RoomPublicState,
      });

      // When online, RecoveryBanner shows
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      const { rerender } = render(
        <MemoryRouter initialEntries={["/room/ABC123"]}>
          <RecoveryBanner />
        </MemoryRouter>
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/Connection dropped. Reconnecting.../i)).toBeInTheDocument();

      // When device goes offline, RecoveryBanner suppresses itself
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      rerender(
        <MemoryRouter initialEntries={["/room/ABC123"]}>
          <RecoveryBanner />
        </MemoryRouter>
      );
      expect(screen.queryByText(/Connection dropped. Reconnecting.../i)).not.toBeInTheDocument();
    });

    it("renders distinct RecoveryBanner messages for RECOVERING, RECOVERED, and FAILED", () => {
      vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
      useRoomStore.setState({
        roomState: { code: "ABC123", players: [] } as unknown as RoomPublicState,
      });

      mockRecoveryState = "RECOVERING";
      const { rerender } = render(
        <MemoryRouter initialEntries={["/room/ABC123"]}>
          <RecoveryBanner />
        </MemoryRouter>
      );
      expect(screen.getByText(/Restoring room & game state.../i)).toBeInTheDocument();

      mockRecoveryState = "RECOVERED";
      rerender(
        <MemoryRouter initialEntries={["/room/ABC123"]}>
          <RecoveryBanner />
        </MemoryRouter>
      );
      expect(screen.getByText(/Back online. Game synchronized./i)).toBeInTheDocument();

      mockRecoveryState = "FAILED";
      rerender(
        <MemoryRouter initialEntries={["/room/ABC123"]}>
          <RecoveryBanner />
        </MemoryRouter>
      );
      expect(screen.getByText(/Unable to restore session automatically./i)).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);
      expect(mockRetryRecovery).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Request Timeout & Stale Socket Callback Lifecycle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("cancels room create on 20s timeout, re-enables controls, and discards late socket acks", async () => {
      let lateAckCallback: ((res: unknown) => void) | null = null;
      mockSocketEmit.mockImplementation((event, payload, ack) => {
        if (event === "room:create") {
          lateAckCallback = ack;
        }
      });

      render(
        <MemoryRouter>
          <GameRoomSheet game="ludo" onClose={vi.fn()} />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/your name/i);
      fireEvent.change(nameInput, { target: { value: "TimeoutTester" } });

      const createBtn = screen.getByRole("button", { name: /create room/i });
      fireEvent.click(createBtn);
      // `createRoom` now awaits `ensureGuestToken()` (mocked above to resolve
      // immediately) before emitting — flush that microtask. Fake timers are
      // active in this block, so this must be a microtask flush, not a real
      // `waitFor` poll.
      await act(async () => {});

      expect(mockSocketEmit).toHaveBeenCalledWith("room:create", expect.any(Object), expect.any(Function));

      // Advance timers by 20,000ms to trigger timeout
      act(() => {
        vi.advanceTimersByTime(20_000);
      });

      // Controls must be re-enabled and actionable timeout guidance shown
      expect(screen.getByText(/The server is taking a while to answer/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create room/i })).not.toBeDisabled();

      // If the late ack finally returns after timeout, it MUST be discarded
      act(() => {
        if (lateAckCallback) {
          lateAckCallback({
            ok: true,
            code: "LATE99",
            playerId: "p_late",
            seatToken: "token_late",
            state: { code: "LATE99", players: [] },
          });
        }
      });

      // Must NOT navigate or update room store after timeout
      expect(mockNavigate).not.toHaveBeenCalledWith("/room/LATE99");
      expect(useRoomStore.getState().playerId).not.toBe("p_late");
    });

    it("cancels join request on 20s timeout in JoinRoomModal and drops late acks", async () => {
      let lateJoinAck: ((res: unknown) => void) | null = null;
      mockSocketEmit.mockImplementation((event, payload, ack) => {
        if (event === "room:join") {
          lateJoinAck = ack;
        }
      });

      render(
        <MemoryRouter>
          <JoinRoomModal open={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      const nameInput = screen.getByLabelText(/your name/i);
      fireEvent.change(nameInput, { target: { value: "JoinTimeoutUser" } });

      const codeInput = screen.getByLabelText(/room code/i);
      act(() => {
        fireEvent.change(codeInput, { target: { value: "TM9999" } });
      });
      // `joinWithCode` now awaits `ensureGuestToken()` (mocked above to
      // resolve immediately) before emitting — flush that microtask.
      await act(async () => {});

      expect(mockSocketEmit).toHaveBeenCalledWith("room:join", expect.any(Object), expect.any(Function));

      // Advance timers by 20,000ms
      act(() => {
        vi.advanceTimersByTime(20_000);
      });

      expect(screen.getByText(/The server is taking a while to answer/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /join room/i })).not.toBeDisabled();

      // Late response arrives
      act(() => {
        if (lateJoinAck) {
          lateJoinAck({
            ok: true,
            code: "TM9999",
            playerId: "p_late_join",
            seatToken: "token_late_join",
          });
        }
      });

      expect(mockNavigate).not.toHaveBeenCalledWith("/room/TM9999");
      expect(useRoomStore.getState().playerId).not.toBe("p_late_join");
    });

    it("cancels Pass & Play create on 20s timeout and drops late acks", async () => {
      let latePassPlayAck: ((res: unknown) => void) | null = null;
      mockSocketEmit.mockImplementation((event, payload, ack) => {
        if (event === "room:create") {
          latePassPlayAck = ack;
        }
      });

      render(
        <MemoryRouter>
          <GameRoomSheet game="snl" onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Toggle Pass & Play checkbox
      const passPlayCheckbox = screen.getByRole("checkbox", { name: /toggle pass and play mode/i });
      fireEvent.click(passPlayCheckbox);

      const p2Input = screen.getByPlaceholderText(/player 2/i);
      fireEvent.change(p2Input, { target: { value: "SecondPlayer" } });

      const startBtn = screen.getByRole("button", { name: /start pass & play/i });
      fireEvent.click(startBtn);
      // `startPassAndPlay` now awaits `ensureGuestToken()` (mocked above to
      // resolve immediately) before emitting — flush that microtask.
      await act(async () => {});

      expect(mockSocketEmit).toHaveBeenCalledWith("room:create", expect.any(Object), expect.any(Function));

      // Advance timers by 20,000ms
      act(() => {
        vi.advanceTimersByTime(20_000);
      });

      expect(screen.getByText(/The server is taking a while to answer/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start pass & play/i })).not.toBeDisabled();

      // Late ack arrives
      act(() => {
        if (latePassPlayAck) {
          latePassPlayAck({
            ok: true,
            code: "PP9999",
            playerId: "p_pp",
            seatToken: "token_pp",
            state: { code: "PP9999", players: [] },
          });
        }
      });

      expect(mockNavigate).not.toHaveBeenCalledWith("/room/PP9999");
    });
  });

  describe("3. QR Code Modal & Clipboard Resilience", () => {
    it("renders valid QR code SVG and handles empty/blank code fallback", () => {
      const { rerender } = render(
        <QrCodeModal
          open={true}
          onClose={vi.fn()}
          code="XYZ789"
          gameName="Classic Ludo"
          hostName="Krishna"
        />
      );

      expect(screen.getByText("XYZ789")).toBeInTheDocument();
      expect(screen.getByText(/"Krishna" invites you to play!/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /close qr modal/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();

      // Render with empty code
      rerender(
        <QrCodeModal
          open={true}
          onClose={vi.fn()}
          code=""
          gameName="Classic Ludo"
        />
      );
      expect(screen.getByRole("status", { name: /qr code unavailable/i })).toBeInTheDocument();
    });

    it("handles clipboard rejection gracefully with error toast", async () => {
      const showSpy = vi.spyOn(toastStore, "show");
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
        },
        configurable: true,
      });

      render(
        <QrCodeModal
          open={true}
          onClose={vi.fn()}
          code="XYZ789"
          gameName="Classic Ludo"
        />
      );

      const codeButton = screen.getByTitle("Tap to copy code");
      fireEvent.click(codeButton);

      await waitFor(() => {
        expect(showSpy).toHaveBeenCalledWith("Couldn't copy code", "error");
      });
    });
  });

  describe("4. Empty States & Dynamic Filters in Feature Hubs", () => {
    it("dynamically shows EmptyState when Leaderboard search matches 0 players and restores on clear", () => {
      render(
        <MemoryRouter>
          <LeaderboardPage />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/search player.../i);
      fireEvent.change(searchInput, { target: { value: "ZzzUnknownPlayer999" } });

      expect(screen.getByText("No players found")).toBeInTheDocument();
      const clearBtn = screen.getByRole("button", { name: /clear filters/i });
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(screen.queryByText("No players found")).not.toBeInTheDocument();
    });

    it("renders active lounge friends in SocialHubPage", () => {
      render(
        <MemoryRouter>
          <SocialHubPage />
        </MemoryRouter>
      );

      expect(screen.getByText("Social Hub")).toBeInTheDocument();
      expect(screen.getByText(/Active Friends, Presence Status & Direct Match Challenges/i)).toBeInTheDocument();
      expect(screen.getByText("Aditi_Pro")).toBeInTheDocument();
    });
  });

  describe("5. Match History Loading Skeletons & API Error Retry", () => {
    it("renders loading skeletons and shows retry button on fetch error", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("Network disconnect"));

      render(
        <MemoryRouter>
          <MatchHistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Couldn't load match history/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Mock successful response on retry
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [], total: 0 }),
      });

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/No matches played yet/i)).toBeInTheDocument();
      });
    });

    it("displays error notice and allows retrying when match detail scorecard fetch fails without injecting fake metrics", async () => {
      mockApiFetch.mockReset();
      let detailFetchAttempts = 0;
      mockApiFetch.mockImplementation(async (url: string) => {
        if (typeof url === "string" && url.includes("/matches/m_real_101")) {
          detailFetchAttempts += 1;
          if (detailFetchAttempts === 1) {
            throw new Error("Scorecard API 500");
          }
          return {
            ok: true,
            json: async () => ({
              match: {
                matchId: "m_real_101",
                roomCode: "REAL99",
                game: "ludo",
                startedAt: Date.now() - 60000,
                finishedAt: Date.now(),
                durationMs: 60000,
                result: "WIN",
                participants: [{ playerId: "p_test_123", name: "Tester", isWinner: true }],
                replayAvailable: false,
                movesCount: 18,
                recoveryCount: 0,
                timelineEventsCount: 30,
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            matches: [
              {
                matchId: "m_real_101",
                roomCode: "REAL99",
                game: "ludo",
                startedAt: Date.now() - 60000,
                finishedAt: Date.now(),
                durationMs: 60000,
                result: "WIN",
                participants: [{ playerId: "p_test_123", name: "Tester", isWinner: true }],
                replayAvailable: false,
              },
            ],
            total: 1,
          }),
        };
      });

      render(
        <MemoryRouter>
          <MatchHistoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
      });

      const viewDetailBtn = screen.getByRole("button", { name: "View" });
      fireEvent.click(viewDetailBtn);

      // Must display modal with real metadata and error alert
      await waitFor(() => {
        expect(screen.getByText("ludo Match Details")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(/Could not load detailed scorecard timeline/i);
      });

      // Verify no fabricated numbers are injected
      expect(screen.queryByText(/24/)).not.toBeInTheDocument();
      expect(screen.queryByText(/42/)).not.toBeInTheDocument();

      const retryDetailBtn = screen.getByRole("button", { name: /retry loading match details/i });
      fireEvent.click(retryDetailBtn);

      await waitFor(() => {
        expect(screen.getByText("Match Timeline Summary")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("30")).toBeInTheDocument();
      });
    });
  });

  describe("6. Image & Artwork Error Fallback Resilience", () => {
    it("replaces broken artwork image with fallback SVG glyph", () => {
      const mockGame = BHALYAM_GAMES[0];

      render(
        <MemoryRouter>
          <GameCard game={mockGame} onSelect={vi.fn()} />
        </MemoryRouter>
      );

      const img = screen.getByAltText(`${mockGame.title} artwork`);
      expect(img).toBeInTheDocument();

      fireEvent.error(img);

      expect(screen.queryByAltText(`${mockGame.title} artwork`)).not.toBeInTheDocument();
    });
  });
});
