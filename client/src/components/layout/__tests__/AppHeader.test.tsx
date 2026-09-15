import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AppHeader from "../AppHeader";
import { useAuthStore, setAccessToken } from "../../../store/authStore";
import { useRoomStore } from "../../../store/roomStore";

// AppHeader mounts `useWallet()`, which otherwise fires a real network
// request (`getEconomyWallet()`). Not what this suite is about — mocked to
// a static, already-loaded value so the test is deterministic and offline.
vi.mock("../../../hooks/useEconomy", () => ({
  useWallet: () => ({
    wallet: null,
    status: "loaded",
    balance: "0",
    isLoading: false,
    error: null,
    correlationId: null,
    refetch: async () => {},
  }),
}));

function renderHeader(playerName = "TestPlayer") {
  useRoomStore.setState({ playerName });
  return render(
    <BrowserRouter>
      <AppHeader />
    </BrowserRouter>,
  );
}

function asGuest(): void {
  setAccessToken(null);
  useAuthStore.setState({ kind: "guest", userId: null, isAdmin: false, isSuperAdmin: false });
}
function asLocalFallback(): void {
  setAccessToken(null);
  useAuthStore.setState({ kind: "member", userId: null, isAdmin: false, isSuperAdmin: false });
}
function asVerifiedMember(): void {
  setAccessToken("test-access-token");
  useAuthStore.setState({ kind: "member", userId: "user-verified-1", isAdmin: false, isSuperAdmin: false });
}

/**
 * The header's profile chip has no standalone "Guest"/"Offline Demo Mode"
 * badge of its own — that badge lives in ProfileSheet.tsx (see its own
 * "Offline Demo Mode consumer-wiring fix" describe block in
 * ProfileSheet.test.tsx, which owns that coverage). What AppHeader itself
 * is responsible for is `displayName = playerName.trim() || identity.label`
 * — the profile button's visible name and accessible label fall back to
 * the centralized `useIdentityPresentation()` label only when no room
 * player name is set.
 */
describe("AppHeader — identity label fallback when no player name is set", () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it("guest: falls back to the Guest label", () => {
    asGuest();
    renderHeader("");
    expect(screen.getByText("Guest")).toBeDefined();
  });

  it("local fallback: falls back to the Offline Demo Mode label", () => {
    asLocalFallback();
    renderHeader("");
    expect(screen.getByText("Offline Demo Mode")).toBeDefined();
  });

  it("verified member: falls back to the Member label", () => {
    asVerifiedMember();
    renderHeader("");
    expect(screen.getByText("Member")).toBeDefined();
  });

  it("a real player name always wins over the identity label fallback", () => {
    asLocalFallback();
    renderHeader("TestPlayer");
    expect(screen.getByText("TestPlayer")).toBeDefined();
    expect(screen.queryByText("Offline Demo Mode")).toBeNull();
  });
});
