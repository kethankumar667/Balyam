import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Friend } from "@shared/social/Friend";
import type { FriendRequest } from "@shared/social/FriendRequest";
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
