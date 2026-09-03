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

function renderHeader() {
  // A distinct player name so `displayName` (playerName || identity.label)
  // never coincidentally equals the identity badge text under test —
  // otherwise a blank name would render "Offline Demo Mode" or "Guest"
  // TWICE (once as the name, once as the badge) for unrelated reasons.
  useRoomStore.setState({ playerName: "TestPlayer" });
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
 * Consumer-wiring regression (Phase C3): the header's profile chip used to
 * fall back to a hardcoded "Guest" label for anything that wasn't a
 * verified member (`!isMember`), so a local-fallback session — which
 * genuinely is not a verified member — was mislabeled "Guest" instead of
 * "Offline Demo Mode". The chip now reads `identity.isLocalFallback`
 * (the same centralized `useIdentityPresentation()` the rest of the app
 * uses) before falling back to the guest label.
 */
describe("AppHeader — identity-mode presentation (Offline Demo Mode consumer-wiring fix)", () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it("guest: shows the Guest label", () => {
    asGuest();
    renderHeader();
    expect(screen.getByText("Guest")).toBeDefined();
    expect(screen.queryByText("Offline Demo Mode")).toBeNull();
  });

  it("local fallback: shows Offline Demo Mode, not Guest", () => {
    asLocalFallback();
    renderHeader();
    expect(screen.getByText("Offline Demo Mode")).toBeDefined();
    expect(screen.queryByText("Guest")).toBeNull();
  });

  it("verified member: shows neither the Guest nor the Offline Demo Mode chip (existing member presentation is unaffected)", () => {
    asVerifiedMember();
    renderHeader();
    expect(screen.queryByText("Guest")).toBeNull();
    expect(screen.queryByText("Offline Demo Mode")).toBeNull();
  });
});
