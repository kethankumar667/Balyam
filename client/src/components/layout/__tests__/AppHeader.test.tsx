import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AppHeader from "../AppHeader";
import { useAuthStore, setAccessToken } from "../../../store/authStore";
import { useRoomStore } from "../../../store/roomStore";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";

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

/**
 * The header used to carry nine controls: a navigation pill that repeated the sidebar, a free-coins countdown, the
 * streak, the shop, the wallet, the profile, an Admin pill that repeated the sidebar's Admin Console entry, and
 * the theme switch. It is now brand on the left and account controls on the right; destinations live in the sidebar.
 */
describe("AppHeader — one row, not nine", () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it("does not repeat the sidebar's destinations", () => {
    asGuest();
    renderHeader();

    expect(screen.queryByRole("navigation", { name: "Lounge Navigation" })).toBeNull();
    for (const name of ["All Games", "Recently Played", "Favorites"]) {
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
  });

  it("has no Admin pill, even for a super admin: the sidebar's Admin Console entry covers that", () => {
    asVerifiedMember();
    useAuthStore.setState({ isAdmin: true, isSuperAdmin: true });
    renderHeader();

    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("keeps the shop one tap away from every page, as an icon with no word beside it", () => {
    asGuest();
    renderHeader();

    const shop = screen.getByRole("button", { name: /Cosmetics Boutique/i });
    expect(shop.textContent?.trim()).toBe("");
  });

  it("keeps the account controls: wallet, profile and the theme switch", () => {
    asGuest();
    renderHeader();

    expect(screen.getByRole("button", { name: /^Profile/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Switch to (dark|light) mode/ })).toBeDefined();
  });
});

/**
 * Equipping a frame in the shop must show it on the player's own avatar in the header. The header drew the
 * avatar with no `aura`, inside an `overflow-hidden` circle, so a frame (which sits OUTSIDE the avatar, at 124%
 * of it) never appeared. jsdom cannot measure layout, so the clipping half is pinned through the class name.
 */
describe("AppHeader — equipped avatar frame", () => {
  const initial = useCosmeticsStore.getState().resolved;

  afterEach(() => {
    useCosmeticsStore.setState({ resolved: initial });
    setAccessToken(null);
  });

  function equip(avatarAura: string): void {
    useCosmeticsStore.setState({ resolved: { ...initial, avatarAura } });
  }

  it("draws the equipped frame on the profile chip's avatar", () => {
    asGuest();
    equip("frame_marigold_garland");
    renderHeader("TestPlayer");

    const chip = screen.getByRole("button", { name: /^Profile/ });
    expect(chip.querySelector('svg[data-frame="frame_marigold_garland"]')).not.toBeNull();
  });

  it("draws no frame when nothing is equipped", () => {
    asGuest();
    equip("aura_none");
    renderHeader("TestPlayer");

    const chip = screen.getByRole("button", { name: /^Profile/ });
    expect(chip.querySelector("svg[data-frame]")).toBeNull();
  });

  it("does not clip the frame: no overflow-hidden between the frame and the chip", () => {
    asGuest();
    equip("frame_blaze_ring");
    renderHeader("TestPlayer");

    const chip = screen.getByRole("button", { name: /^Profile/ });
    const frame = chip.querySelector('svg[data-frame="frame_blaze_ring"]');
    expect(frame).not.toBeNull();
    for (let el = frame?.parentElement; el && el !== chip; el = el.parentElement) {
      // The picture's own circle clips the PHOTO, not the frame, and is a sibling of the frame, not an ancestor.
      expect(el.className).not.toContain("overflow-hidden");
    }
  });
});
