import { describe, it, expect } from "vitest";
import { determineSection, isItemActive, resolveNavigation } from "../routeResolver";
import { NAVIGATION_CONFIG } from "../navigationConfig";
import type { NavigationItem } from "../types";
import { Home, Gamepad2 } from "lucide-react";

describe("Route Resolver & Context-Aware Navigation", () => {
  describe("determineSection", () => {
    it("maps / and /home to 'home'", () => {
      expect(determineSection("/")).toBe("home");
      expect(determineSection("/home")).toBe("home");
      expect(determineSection("/home/")).toBe("home");
    });

    it("maps /games and nested retro game routes to 'games'", () => {
      expect(determineSection("/games")).toBe("games");
      expect(determineSection("/games/nokia-snake")).toBe("games");
      expect(determineSection("/nokiacricket")).toBe("games");
      expect(determineSection("/snake")).toBe("games");
      expect(determineSection("/brickracer")).toBe("games");
      expect(determineSection("/brickblocks")).toBe("games");
      expect(determineSection("/tetris")).toBe("games");
      expect(determineSection("/breakout")).toBe("games");
    });

    it("maps room routes to 'rooms'", () => {
      expect(determineSection("/rooms")).toBe("rooms");
      expect(determineSection("/room/ABC123")).toBe("rooms");
      expect(determineSection("/tv/ABC123")).toBe("rooms");
    });

    it("maps profile and settings routes to their respective sections", () => {
      expect(determineSection("/profile")).toBe("profile");
      expect(determineSection("/profile/edit")).toBe("profile");
      expect(determineSection("/settings")).toBe("settings");
      expect(determineSection("/settings/audio")).toBe("settings");
    });

    it("maps about and privacy to 'help'", () => {
      expect(determineSection("/about")).toBe("help");
      expect(determineSection("/privacy")).toBe("help");
    });

    it("defaults unknown routes to 'home'", () => {
      expect(determineSection("/random-404")).toBe("home");
    });

    it("maps /favorites and /recently-played to 'games' (Games Hub chrome, not a bare home fallback)", () => {
      expect(determineSection("/favorites")).toBe("games");
      expect(determineSection("/recently-played")).toBe("games");
    });
  });

  describe("isItemActive", () => {
    it("correctly identifies active home path", () => {
      const item: NavigationItem = { id: "home", label: "Home", icon: Home, path: "/" };
      expect(isItemActive(item, "/")).toBe(true);
      expect(isItemActive(item, "/home")).toBe(true);
      expect(isItemActive(item, "/games")).toBe(false);
    });

    it("matches query search parameters", () => {
      const item: NavigationItem = {
        id: "games-retro",
        label: "Retro",
        icon: Gamepad2,
        path: "/games",
        search: "?c=retro",
      };
      expect(isItemActive(item, "/games", "?c=retro")).toBe(true);
      expect(isItemActive(item, "/games", "?c=board")).toBe(false);
      expect(isItemActive(item, "/games", "")).toBe(false);
    });

    it("matches hash fragments", () => {
      const item: NavigationItem = {
        id: "profile-sec",
        label: "Security",
        icon: Home,
        path: "/profile",
        hash: "#sec-account",
      };
      expect(isItemActive(item, "/profile", "", "#sec-account")).toBe(true);
      expect(isItemActive(item, "/profile", "", "#sec-profile")).toBe(false);
    });

    it("executes custom isActive matcher if provided", () => {
      const item: NavigationItem = {
        id: "custom",
        label: "Custom",
        icon: Home,
        isActive: (p) => p.includes("special"),
      };
      expect(isItemActive(item, "/special-route")).toBe(true);
      expect(isItemActive(item, "/normal-route")).toBe(false);
    });
  });

  describe("resolveNavigation", () => {
    it("resolves home section with all items when member", () => {
      const resolved = resolveNavigation({ pathname: "/", isMember: true });
      expect(resolved.id).toBe("home");
      expect(resolved.items.length).toBeGreaterThan(3);
      const active = resolved.items.find((i) => i.active);
      expect(active?.id).toBe("home-feed");
    });

    it("marks unreleased items with Coming Soon badge and disabled state, and gates profile for guests", () => {
      const guestNav = resolveNavigation({ pathname: "/", isMember: false });
      const memberNav = resolveNavigation({ pathname: "/", isMember: true });
      const guestTournaments = guestNav.items.find((i) => i.id === "home-tournaments");
      const guestLeaderboard = guestNav.items.find((i) => i.id === "home-leaderboard");
      const guestSocial = guestNav.items.find((i) => i.id === "home-social");
      const guestProfile = guestNav.items.find((i) => i.id === "home-profile");
      const guestSettings = guestNav.items.find((i) => i.id === "home-settings");

      const memberTournaments = memberNav.items.find((i) => i.id === "home-tournaments");
      const memberLeaderboard = memberNav.items.find((i) => i.id === "home-leaderboard");
      const memberSocial = memberNav.items.find((i) => i.id === "home-social");
      const memberProfile = memberNav.items.find((i) => i.id === "home-profile");

      // Tournaments, Leaderboard, Social are disabled Coming Soon for all users
      expect(guestTournaments?.badge?.text).toBe("Coming Soon");
      expect(guestTournaments?.disabled).toBe(true);
      expect(guestLeaderboard?.badge?.text).toBe("Coming Soon");
      expect(guestLeaderboard?.disabled).toBe(true);
      expect(guestSocial?.badge?.text).toBe("Coming Soon");
      expect(guestSocial?.disabled).toBe(true);

      expect(memberTournaments?.badge?.text).toBe("Coming Soon");
      expect(memberTournaments?.disabled).toBe(true);
      expect(memberLeaderboard?.badge?.text).toBe("Coming Soon");
      expect(memberLeaderboard?.disabled).toBe(true);
      expect(memberSocial?.badge?.text).toBe("Coming Soon");
      expect(memberSocial?.disabled).toBe(true);

      // Profile is Member gated: Member badge for guests, unlocked for members
      expect(guestProfile?.badge?.text).toBe("Member");
      expect(guestSettings?.badge?.text).toBeUndefined();
      expect(memberProfile?.badge).toBeUndefined();
    });

    it("switches context to games navigation with header when on /games", () => {
      const resolved = resolveNavigation({ pathname: "/games", search: "?c=retro" });
      expect(resolved.id).toBe("games");
      expect(resolved.header?.title).toBe("Games Hub");
      const active = resolved.items.find((i) => i.active);
      expect(active?.id).toBe("games-retro");
    });

    /**
     * Regression: these two Games Hub items used to point at /games with a
     * search param (`?f=popular`, `?f=quick`) that GamesPage never read, so
     * the link navigated but nothing filtered and "All Games" stayed
     * highlighted. They now point at their own dedicated routes.
     */
    it("resolves Recently Played and Favorites to their own routes, active on their own pages", () => {
      const onGames = resolveNavigation({ pathname: "/games" });
      const recentItem = onGames.items.find((i) => i.id === "games-recent");
      const favItem = onGames.items.find((i) => i.id === "games-favorites");
      expect(recentItem?.fullHref).toBe("/recently-played");
      expect(favItem?.fullHref).toBe("/favorites");
      expect(recentItem?.active).toBe(false);
      expect(favItem?.active).toBe(false);

      const onRecent = resolveNavigation({ pathname: "/recently-played" });
      expect(onRecent.id).toBe("games");
      expect(onRecent.items.find((i) => i.id === "games-recent")?.active).toBe(true);

      const onFavorites = resolveNavigation({ pathname: "/favorites" });
      expect(onFavorites.id).toBe("games");
      expect(onFavorites.items.find((i) => i.id === "games-favorites")?.active).toBe(true);
    });

    it("exposes Recently Played and Favorites on the Home section too", () => {
      const home = resolveNavigation({ pathname: "/" });
      expect(home.items.some((i) => i.id === "home-recent" && i.fullHref === "/recently-played")).toBe(true);
      expect(home.items.some((i) => i.id === "home-favorites" && i.fullHref === "/favorites")).toBe(true);
    });
  });

  describe("Admin Console footer entry", () => {
    it("does not appear for an ordinary signed-in member", () => {
      const home = resolveNavigation({ pathname: "/", isMember: true });
      expect(home.footerItems?.some((i) => i.id === "nav-superadmin-console")).toBeFalsy();
    });

    it("appears, with a Super Admin badge, once isSuperAdmin is true", () => {
      const home = resolveNavigation({ pathname: "/", isMember: true, isSuperAdmin: true });
      const entry = home.footerItems?.find((i) => i.id === "nav-superadmin-console");
      expect(entry).toBeDefined();
      expect(entry?.fullHref).toBe("/admin/dashboard");
      expect(entry?.badge?.text).toBe("Super Admin");
    });

    it("also appears via capabilities.accessAdminPanel, independent of isSuperAdmin", () => {
      const home = resolveNavigation({ pathname: "/", isMember: true, accessAdminPanel: true });
      expect(home.footerItems?.some((i) => i.id === "nav-superadmin-console")).toBe(true);
    });

    it("does not duplicate itself while already inside the admin section", () => {
      const admin = resolveNavigation({ pathname: "/admin/dashboard", isMember: true, isSuperAdmin: true });
      const count = (admin.footerItems ?? []).filter((i) => i.id === "nav-superadmin-console").length;
      expect(count).toBe(0);
    });
  });

  describe("NAVIGATION_CONFIG Schema Integrity", () => {
    it("ensures all sections have unique item IDs", () => {
      const allIds = new Set<string>();
      Object.values(NAVIGATION_CONFIG).forEach((section) => {
        section.items.forEach((item) => {
          expect(allIds.has(item.id)).toBe(false);
          allIds.add(item.id);
        });
      });
    });
  });
});
