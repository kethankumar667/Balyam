import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Friend, SharedHistory } from "@shared/social/Friend";
import type { FriendRequest } from "@shared/social/FriendRequest";
import type { BlockedPlayer } from "@shared/social/Block";
import SocialHubPage from "../SocialHubPage";
import { useAuthStore } from "../../store/authStore";
import * as socialApi from "../../lib/api/social";

vi.mock("../../lib/playerIdentity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/playerIdentity")>();
  return {
    ...actual,
    usePlayerId: () => ({
      playerId: "player_test_me",
      ready: true,
      kind: "member" as const,
    }),
  };
});

vi.mock("../../lib/api/social", () => ({
  getFriends: vi.fn(),
  getFriendRequests: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  getBlockedPlayers: vi.fn(),
  getSharedHistory: vi.fn(),
  blockPlayer: vi.fn(),
  unblockPlayer: vi.fn(),
  reportPlayer: vi.fn(),
}));

const api = vi.mocked(socialApi);

const ME = "player_test_me";

const SAI: Friend = {
  playerId: ME,
  friendPlayerId: "player_sai",
  displayName: "Sai Kumar",
  createdAt: 1_700_000_000_000,
};

function outgoingTo(recipientId: string, id: string): FriendRequest {
  return { id, senderId: ME, senderName: "Me", recipientId, status: "PENDING", createdAt: Date.now() };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SocialHubPage />
    </MemoryRouter>,
  );
}

const noRequests = { success: true, incoming: [], outgoing: [] };

describe("SocialHubPage — real friends and requests (WP0)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.setState({ isSuperAdmin: true });
    api.getFriends.mockResolvedValue({ success: true, friends: [] });
    api.getFriendRequests.mockResolvedValue(noRequests);
    api.getBlockedPlayers.mockResolvedValue({ success: true, blocked: [] });
  });

  describe("Friends tab (G2)", () => {
    it("lists the caller's real friends and none of the old hard-coded ones", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      renderPage();

      expect(await screen.findByText("Sai Kumar")).toBeDefined();
      expect(api.getFriends).toHaveBeenCalledWith(ME);
      for (const invented of ["Aditi_Pro", "Vikram_HC", "Sneha_Ace", "Rahul_King"]) {
        expect(screen.queryByText(invented)).toBeNull();
      }
    });

    it("invents no status for a friend whose presence is unknown", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      renderPage();
      await screen.findByText("Sai Kumar");

      expect(screen.queryByText("Online")).toBeNull();
      expect(screen.queryByText("Offline")).toBeNull();
      expect(screen.queryByRole("combobox", { name: /filter friends by status/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /party invite/i })).toBeNull();
    });

    it("shows an honest empty state with a way to add a friend", async () => {
      renderPage();

      expect(await screen.findByText("No Friends Added Yet")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /add friend by id/i }));
      expect(await screen.findByText(/no incoming friend requests/i)).toBeDefined();
    });

    it("unfriends through the confirm dialog and drops the row", async () => {
      api.getFriends.mockResolvedValueOnce({ success: true, friends: [SAI] });
      api.removeFriend.mockResolvedValue({ success: true, removed: true });
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /remove sai kumar from friends/i }));
      expect(api.removeFriend).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: /^remove friend$/i }));

      await waitFor(() => expect(api.removeFriend).toHaveBeenCalledWith(ME, "player_sai"));
      await waitFor(() => expect(screen.queryByText("Sai Kumar")).toBeNull());
    });

    it("keeps the row and shows the error in the dialog when unfriending fails", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.removeFriend.mockRejectedValue(new Error("Server said no"));
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /remove sai kumar from friends/i }));
      fireEvent.click(screen.getByRole("button", { name: /^remove friend$/i }));

      expect(await screen.findByText("Server said no")).toBeDefined();
      expect(screen.getAllByText("Sai Kumar").length).toBeGreaterThan(0);
    });

    it("shows a load error with Retry instead of an empty list, and recovers", async () => {
      api.getFriends.mockRejectedValueOnce(new Error("Friends service down"));
      renderPage();

      expect(await screen.findByText("Friends service down")).toBeDefined();
      expect(screen.queryByText("No Friends Added Yet")).toBeNull();

      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(await screen.findByText("Sai Kumar")).toBeDefined();
    });

    it("shows a loading state before the friends arrive", async () => {
      let release: (value: { success: true; friends: Friend[] }) => void = () => {};
      api.getFriends.mockReturnValue(new Promise((resolve) => (release = resolve)));
      renderPage();

      expect(screen.getByRole("status", { name: /loading your friends/i })).toBeDefined();
      release({ success: true, friends: [SAI] });
      expect(await screen.findByText("Sai Kumar")).toBeDefined();
    });
  });

  describe("Friendship timeline (WP5)", () => {
    const TIMELINE: SharedHistory = {
      playerId: ME,
      friendPlayerId: "player_sai",
      matchesPlayedTogether: 12,
      winsTogether: 0,
      tournamentsTogether: 0,
      lastPlayedAt: 1_700_000_000_000,
      firstPlayedAt: 1_690_000_000_000,
      currentStreakDays: 3,
      bestStreakDays: 5,
      milestones: [
        { kind: "FRIENDS_SINCE", reachedAt: 1_680_000_000_000 },
        { kind: "FIRST_MATCH", reachedAt: 1_690_000_000_000, matchId: "m1" },
        { kind: "MATCHES_10", reachedAt: 1_695_000_000_000, matchId: "m10" },
      ],
    };

    async function openTimeline() {
      fireEvent.click(await screen.findByRole("button", { name: /view shared history with sai kumar/i }));
    }

    it("opens the friend's timeline from their History button, asking for exactly that friend", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.getSharedHistory.mockResolvedValue({ success: true, history: TIMELINE });
      renderPage();
      expect(api.getSharedHistory).not.toHaveBeenCalled();

      await openTimeline();

      await waitFor(() => expect(api.getSharedHistory).toHaveBeenCalledWith(ME, "player_sai"));
      expect(await screen.findByText("3-day streak")).toBeDefined();
      expect(screen.getByText("Became friends")).toBeDefined();
      expect(screen.getByText("10 matches together")).toBeDefined();
    });

    it("fetches nothing for a timeline nobody opened", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      renderPage();
      await screen.findByText("Sai Kumar");

      expect(api.getSharedHistory).not.toHaveBeenCalled();
    });

    it("shows a loading state first", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      let release: (value: { success: true; history: SharedHistory }) => void = () => {};
      api.getSharedHistory.mockReturnValue(new Promise((resolve) => (release = resolve)));
      renderPage();

      await openTimeline();

      expect(await screen.findByRole("status", { name: /loading your timeline/i })).toBeDefined();
      release({ success: true, history: TIMELINE });
      expect(await screen.findByText("3-day streak")).toBeDefined();
    });

    it("shows why and offers Retry when the timeline cannot load, and recovers", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.getSharedHistory.mockRejectedValueOnce(new Error("Shared history is only available between friends."));
      renderPage();

      await openTimeline();

      expect(await screen.findByText("Shared history is only available between friends.")).toBeDefined();
      api.getSharedHistory.mockResolvedValue({ success: true, history: TIMELINE });
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(await screen.findByText("3-day streak")).toBeDefined();
    });

    it("closes, and loads again for the next friend who is opened", async () => {
      const KAVYA: Friend = { playerId: ME, friendPlayerId: "player_kavya", displayName: "Kavya", createdAt: 1 };
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI, KAVYA] });
      api.getSharedHistory.mockResolvedValue({ success: true, history: TIMELINE });
      renderPage();

      await openTimeline();
      await screen.findByText("3-day streak");
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: /you & sai kumar/i })).toBeNull());

      api.getSharedHistory.mockResolvedValue({
        success: true,
        history: { ...TIMELINE, friendPlayerId: "player_kavya", currentStreakDays: 0, bestStreakDays: 0, matchesPlayedTogether: 2, milestones: [] },
      });
      fireEvent.click(screen.getByRole("button", { name: /view shared history with kavya/i }));

      await waitFor(() => expect(api.getSharedHistory).toHaveBeenLastCalledWith(ME, "player_kavya"));
      expect(await screen.findByText("None active")).toBeDefined();
    });
  });

  describe("Blocking and reporting (WP1)", () => {
    const BLOCKED_SAI: BlockedPlayer = {
      playerId: "player_sai",
      displayName: "Sai Kumar",
      blockedAt: 1_700_000_000_000,
    };

    async function openBlockedTab() {
      fireEvent.click(await screen.findByRole("button", { name: /^blocked/i }));
    }

    it("blocks a friend after a confirm that says what happens, and moves them to the Blocked tab", async () => {
      api.getFriends.mockResolvedValueOnce({ success: true, friends: [SAI] });
      api.getBlockedPlayers
        .mockResolvedValueOnce({ success: true, blocked: [] })
        .mockResolvedValue({ success: true, blocked: [BLOCKED_SAI] });
      api.blockPlayer.mockResolvedValue({ success: true, alreadyBlocked: false });
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /^block sai kumar$/i }));
      expect(api.blockPlayer).not.toHaveBeenCalled();
      expect(screen.getByText(/they are not told/i)).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /^block$/i }));

      await waitFor(() => expect(api.blockPlayer).toHaveBeenCalledWith("player_sai"));
      await waitFor(() => expect(screen.queryByText("Sai Kumar")).toBeNull());

      await openBlockedTab();
      expect(await screen.findByText("Sai Kumar")).toBeDefined();
      expect(screen.getByRole("button", { name: /unblock sai kumar/i })).toBeDefined();
    });

    it("keeps the friend and shows why in the dialog when blocking fails", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.blockPlayer.mockRejectedValue(new Error("Your block list is full"));
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /^block sai kumar$/i }));
      fireEvent.click(screen.getByRole("button", { name: /^block$/i }));

      expect(await screen.findByText("Your block list is full")).toBeDefined();
      expect(screen.getAllByText("Sai Kumar").length).toBeGreaterThan(0);
    });

    it("reports a friend with the reason chosen, and confirms it was sent", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.reportPlayer.mockResolvedValue({ success: true });
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /^report sai kumar$/i }));
      const send = screen.getByRole("button", { name: /send report/i }) as HTMLButtonElement;
      expect(send.disabled).toBe(true);

      fireEvent.click(screen.getByLabelText("Spam"));
      expect(send.disabled).toBe(false);
      fireEvent.click(send);

      await waitFor(() => expect(api.reportPlayer).toHaveBeenCalledWith("player_sai", "SPAM"));
      expect(await screen.findByText("Your report was sent.")).toBeDefined();
    });

    it("keeps the report dialog open and shows why when sending fails", async () => {
      api.getFriends.mockResolvedValue({ success: true, friends: [SAI] });
      api.reportPlayer.mockRejectedValue(new Error("Slow down and try again shortly."));
      renderPage();

      fireEvent.click(await screen.findByRole("button", { name: /^report sai kumar$/i }));
      fireEvent.click(screen.getByLabelText("Harassment or bullying"));
      fireEvent.click(screen.getByRole("button", { name: /send report/i }));

      expect(await screen.findByText("Slow down and try again shortly.")).toBeDefined();
      expect(screen.queryByText("Your report was sent.")).toBeNull();
    });

    it("lists blocked players and unblocks one", async () => {
      api.getBlockedPlayers
        .mockResolvedValueOnce({ success: true, blocked: [BLOCKED_SAI] })
        .mockResolvedValue({ success: true, blocked: [] });
      api.unblockPlayer.mockResolvedValue({ success: true, removed: true });
      renderPage();
      await openBlockedTab();

      expect(await screen.findByText("Sai Kumar")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /unblock sai kumar/i }));

      await waitFor(() => expect(api.unblockPlayer).toHaveBeenCalledWith("player_sai"));
      await waitFor(() => expect(screen.queryByText("Sai Kumar")).toBeNull());
      expect(screen.getByText(/haven.t blocked anyone/i)).toBeDefined();
    });

    it("keeps the row and shows why when unblocking fails", async () => {
      api.getBlockedPlayers.mockResolvedValue({ success: true, blocked: [BLOCKED_SAI] });
      api.unblockPlayer.mockRejectedValue(new Error("Couldn't reach the server"));
      renderPage();
      await openBlockedTab();

      fireEvent.click(await screen.findByRole("button", { name: /unblock sai kumar/i }));

      expect(await screen.findByText("Couldn't reach the server")).toBeDefined();
      expect(screen.getByText("Sai Kumar")).toBeDefined();
    });

    it("says so plainly when nobody is blocked", async () => {
      renderPage();
      await openBlockedTab();

      expect(await screen.findByText(/haven.t blocked anyone/i)).toBeDefined();
    });

    it("shows a load error with Retry instead of an empty list, and recovers", async () => {
      api.getBlockedPlayers.mockRejectedValueOnce(new Error("Blocked list unavailable"));
      renderPage();
      await openBlockedTab();

      expect(await screen.findByText("Blocked list unavailable")).toBeDefined();
      expect(screen.queryByText(/haven.t blocked anyone/i)).toBeNull();

      api.getBlockedPlayers.mockResolvedValue({ success: true, blocked: [BLOCKED_SAI] });
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(await screen.findByText("Sai Kumar")).toBeDefined();
    });

    it("shows a tab count only once that list has loaded", async () => {
      let release: (value: { success: true; blocked: BlockedPlayer[] }) => void = () => {};
      api.getBlockedPlayers.mockReturnValue(new Promise((resolve) => (release = resolve)));
      renderPage();

      expect(await screen.findByRole("button", { name: "Blocked" })).toBeDefined();
      release({ success: true, blocked: [BLOCKED_SAI] });
      expect(await screen.findByRole("button", { name: "Blocked (1)" })).toBeDefined();
    });
  });

  describe("Requests tab", () => {
    async function openRequestsTab() {
      fireEvent.click(await screen.findByRole("button", { name: /^requests/i }));
    }

    it("cancels an outgoing request through the API and removes the row (F4)", async () => {
      api.getFriendRequests.mockResolvedValueOnce({
        success: true,
        incoming: [],
        outgoing: [outgoingTo("player_target_alice", "req_outgoing_1")],
      });
      api.cancelFriendRequest.mockResolvedValue({
        success: true,
        request: { ...outgoingTo("player_target_alice", "req_outgoing_1"), status: "CANCELLED" },
      });
      renderPage();
      await openRequestsTab();

      expect(await screen.findByText(/player_target_alice/i)).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /cancel friend request to player_target_alice/i }));

      await waitFor(() => expect(api.cancelFriendRequest).toHaveBeenCalledWith("req_outgoing_1"));
      await waitFor(() => expect(screen.queryByText(/player_target_alice/i)).toBeNull());
      expect(screen.getByText(/no pending outgoing requests/i)).toBeDefined();
    });

    it("shows a visible error and keeps the row when cancelling fails (F4 / F6)", async () => {
      api.getFriendRequests.mockResolvedValue({
        success: true,
        incoming: [],
        outgoing: [outgoingTo("player_target_bob", "req_outgoing_err")],
      });
      api.cancelFriendRequest.mockRejectedValue(new Error("Failed to cancel on server"));
      renderPage();
      await openRequestsTab();

      fireEvent.click(await screen.findByRole("button", { name: /cancel friend request to player_target_bob/i }));

      expect((await screen.findAllByText(/failed to cancel on server/i)).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/player_target_bob/i)).toBeDefined();
    });

    it("sends a request with only the recipient id — no display text (G3)", async () => {
      api.sendFriendRequest.mockResolvedValue({
        success: true,
        request: outgoingTo("player_new", "req_new"),
      });
      renderPage();
      await openRequestsTab();

      fireEvent.change(await screen.findByPlaceholderText(/enter player id/i), {
        target: { value: "player_new" },
      });
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

      await waitFor(() => expect(api.sendFriendRequest).toHaveBeenCalledWith("player_new"));
    });

    it("shows a load error with Retry instead of 'No pending requests', and recovers (G7)", async () => {
      api.getFriendRequests.mockRejectedValueOnce(new Error("Requests service down"));
      renderPage();
      await openRequestsTab();

      expect(await screen.findByText("Requests service down")).toBeDefined();
      expect(screen.queryByText(/no incoming friend requests/i)).toBeNull();

      api.getFriendRequests.mockResolvedValue(noRequests);
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(await screen.findByText(/no incoming friend requests/i)).toBeDefined();
    });

    it("shows a loading state before the requests arrive (G7)", async () => {
      let release: (value: typeof noRequests) => void = () => {};
      api.getFriendRequests.mockReturnValue(new Promise((resolve) => (release = resolve)));
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: /^requests/i }));

      expect(screen.getByRole("status", { name: /loading your friend requests/i })).toBeDefined();
      release(noRequests);
      expect(await screen.findByText(/no incoming friend requests/i)).toBeDefined();
    });
  });
});
