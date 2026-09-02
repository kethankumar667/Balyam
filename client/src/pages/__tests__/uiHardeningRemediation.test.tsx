import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { lazy } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import TournamentsPage from "../TournamentsPage";
import LeaderboardPage from "../LeaderboardPage";
import OfflineBanner from "../../components/games/OfflineBanner";
import {
  RoomSkeleton,
  TournamentSkeleton,
  SocialHubSkeleton,
} from "../../design-system/dls/Skeleton";
import App from "../../App";
import * as opApi from "../../lib/operationalApi";
import { useAuthStore } from "../../store/authStore";

describe("UI Hardening Remediation Suite", () => {
  describe("Test A: Tournament filter semantics", () => {
    it("uses native button controls with aria-pressed and removes all partial tab semantics", () => {
      useAuthStore.setState({ isSuperAdmin: true });
      render(
        <BrowserRouter>
          <TournamentsPage />
        </BrowserRouter>
      );

      // 1. Filter container has role="group", accurate accessible name, and NOT role="tablist"
      const filterGroup = screen.getByRole("group", { name: "Tournament games" });
      expect(filterGroup).toBeDefined();
      expect(filterGroup.getAttribute("role")).toBe("group");
      expect(filterGroup.getAttribute("role")).not.toBe("tablist");

      // 2. Filter controls are native HTML buttons
      const hcButton = screen.getByRole("button", {
        name: /Select Hand Cricket Tournament Cup/i,
      });
      const ludoButton = screen.getByRole("button", {
        name: /Select Ludo Masters Tournament Cup/i,
      });

      expect(hcButton.tagName.toLowerCase()).toBe("button");
      expect(ludoButton.tagName.toLowerCase()).toBe("button");

      // 3. Neither control has role="tab" or aria-selected
      expect(hcButton.getAttribute("role")).toBeNull();
      expect(ludoButton.getAttribute("role")).toBeNull();
      expect(hcButton.getAttribute("aria-selected")).toBeNull();
      expect(ludoButton.getAttribute("aria-selected")).toBeNull();

      // 4. Exposes aria-pressed: Hand Cricket starts selected (true), Ludo unselected (false)
      expect(hcButton.getAttribute("aria-pressed")).toBe("true");
      expect(ludoButton.getAttribute("aria-pressed")).toBe("false");

      // 5. Activating Ludo button switches aria-pressed state cleanly
      fireEvent.click(ludoButton);
      expect(hcButton.getAttribute("aria-pressed")).toBe("false");
      expect(ludoButton.getAttribute("aria-pressed")).toBe("true");

      // 6. Activating Hand Cricket button switches back
      fireEvent.click(hcButton);
      expect(hcButton.getAttribute("aria-pressed")).toBe("true");
      expect(ludoButton.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("Test B: Leaderboard filter semantics", () => {
    it("uses native button controls with aria-pressed for division tiers and retains search accessible name", () => {
      useAuthStore.setState({ isSuperAdmin: true });
      render(
        <BrowserRouter>
          <LeaderboardPage />
        </BrowserRouter>
      );

      // 1. Filter container has role="group", accurate accessible name, and NOT role="tablist"
      const filterGroup = screen.getByRole("group", {
        name: "Filter leaderboard by division tier",
      });
      expect(filterGroup).toBeDefined();
      expect(filterGroup.getAttribute("role")).toBe("group");
      expect(filterGroup.getAttribute("role")).not.toBe("tablist");

      // 2. All tier options are native buttons with no role="tab" or aria-selected
      const tiers = ["All", "Grandmaster", "Master", "Diamond", "Gold"];
      for (const tier of tiers) {
        const btn = screen.getByRole("button", {
          name: new RegExp(`Filter by ${tier} division`, "i"),
        });
        expect(btn.tagName.toLowerCase()).toBe("button");
        expect(btn.getAttribute("role")).toBeNull();
        expect(btn.getAttribute("aria-selected")).toBeNull();
      }

      // 3. Initially, "All" has aria-pressed="true", others have aria-pressed="false"
      const allBtn = screen.getByRole("button", { name: /Filter by All division/i });
      const masterBtn = screen.getByRole("button", { name: /Filter by Master division/i });
      expect(allBtn.getAttribute("aria-pressed")).toBe("true");
      expect(masterBtn.getAttribute("aria-pressed")).toBe("false");

      // 4. Selecting "Master" updates filter state and aria-pressed
      fireEvent.click(masterBtn);
      expect(allBtn.getAttribute("aria-pressed")).toBe("false");
      expect(masterBtn.getAttribute("aria-pressed")).toBe("true");

      // 5. Search field retains its accessible name
      const searchInput = screen.getByLabelText("Search players by name");
      expect(searchInput).toBeDefined();
      expect(searchInput.getAttribute("placeholder")).toBe("Search player...");
    });
  });

  describe("Test C: Offline banner semantics and copy", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("exposes role=alert, accessible retry action, and honest non-overpromising copy", () => {
      const { unmount } = render(<OfflineBanner />);

      // Initially online in test environment, banner is hidden
      expect(screen.queryByRole("alert")).toBeNull();

      // Dispatch offline event to show banner
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });

      // 1. Exposes role="alert" with assertive aria-live
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.getAttribute("aria-live")).toBe("assertive");

      // 2. Copy states already loaded games may remain available and reconnect is an attempt
      expect(alert.textContent).toContain(
        "Already loaded single-player games may remain available while you are offline."
      );
      expect(alert.textContent).toContain(
        "Multiplayer rooms will attempt to reconnect when your connection returns."
      );
      // Confirms old over-promising wording was eliminated
      expect(alert.textContent).not.toContain("remain playable");
      expect(alert.textContent).not.toContain("will automatically reconnect");

      // 3. Retry button has accessible name and >=44x44px touch target
      const retryBtn = screen.getByRole("button", { name: "Retry network connection" });
      expect(retryBtn).toBeDefined();
      expect(retryBtn.className).toContain("min-h-[44px]");
      expect(retryBtn.className).toContain("min-w-[44px]");

      // 4. Retry action clears banner when connectivity is restored
      Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
      fireEvent.click(retryBtn);
      expect(screen.queryByRole("alert")).toBeNull();

      unmount();
    });
  });

  describe("Test D: Skeleton accessibility", () => {
    it("ensures RoomSkeleton, TournamentSkeleton, and SocialHubSkeleton are aria-hidden with no focusable controls and have stable testIds", () => {
      const skeletons = [
        { name: "RoomSkeleton", element: <RoomSkeleton />, testId: "room-skeleton" },
        { name: "TournamentSkeleton", element: <TournamentSkeleton />, testId: "tournament-skeleton" },
        { name: "SocialHubSkeleton", element: <SocialHubSkeleton />, testId: "social-hub-skeleton" },
      ];

      for (const { name, element, testId } of skeletons) {
        const { container, unmount } = render(element);

        // Root element is hidden from assistive technology and carries stable testId
        const root = container.firstElementChild as HTMLElement | null;
        expect(root, `${name} must render a root element`).not.toBeNull();
        expect(root?.getAttribute("aria-hidden")).toBe("true");
        expect(root?.getAttribute("data-testid")).toBe(testId);

        // Skeletons contain zero focusable or interactive controls
        const focusable = container.querySelectorAll(
          "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        expect(
          focusable.length,
          `${name} must contain no focusable controls for keyboard or screen-reader users`
        ).toBe(0);

        unmount();
      }
    });
  });

  describe("Test E: Route fallback selection", () => {
    // A pending lazy component forces Suspense fallback to render
    const createPendingLazy = () => lazy(() => new Promise<never>(() => {}));

    it("selects RoomSkeleton when navigating to /room/example", () => {
      const PendingRoom = createPendingLazy();
      const { container } = render(
        <MemoryRouter initialEntries={["/room/example"]}>
          <App components={{ Room: PendingRoom }} />
        </MemoryRouter>
      );

      // Verifies exact RoomSkeleton identity and absence of other skeletons
      expect(container.querySelector('[data-testid="room-skeleton"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="tournament-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="social-hub-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="dashboard-skeleton"]')).toBeNull();
    });

    it("selects TournamentSkeleton when navigating to /tournaments", () => {
      const PendingTournaments = createPendingLazy();
      const { container } = render(
        <MemoryRouter initialEntries={["/tournaments"]}>
          <App components={{ TournamentsPage: PendingTournaments }} />
        </MemoryRouter>
      );

      // Verifies exact TournamentSkeleton identity and absence of other skeletons
      expect(container.querySelector('[data-testid="tournament-skeleton"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="room-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="social-hub-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="dashboard-skeleton"]')).toBeNull();
    });

    it("selects SocialHubSkeleton when navigating to /social", () => {
      const PendingSocial = createPendingLazy();
      const { container } = render(
        <MemoryRouter initialEntries={["/social"]}>
          <App components={{ SocialHubPage: PendingSocial }} />
        </MemoryRouter>
      );

      // Verifies exact SocialHubSkeleton identity and absence of other skeletons
      expect(container.querySelector('[data-testid="social-hub-skeleton"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="room-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="tournament-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="dashboard-skeleton"]')).toBeNull();
    });

    it("selects DashboardSkeleton when navigating to /admin/matches", async () => {
      vi.spyOn(opApi, "checkOperationalAccess").mockResolvedValue({ kind: "ops-key" });
      useAuthStore.setState({ isMember: true, ready: true });

      const PendingMatches = createPendingLazy();
      const { container } = render(
        <MemoryRouter initialEntries={["/admin/matches"]}>
          <App components={{ AdminMatchesPage: PendingMatches }} />
        </MemoryRouter>
      );

      await act(async () => {
        await Promise.resolve();
      });

      // Verifies exact DashboardSkeleton identity and absence of other skeletons
      expect(container.querySelector('[data-testid="dashboard-skeleton"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="room-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="tournament-skeleton"]')).toBeNull();
      expect(container.querySelector('[data-testid="social-hub-skeleton"]')).toBeNull();
    });
  });
});
