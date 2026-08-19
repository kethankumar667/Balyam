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

    it("marks requiresAuth items as locked for guests", () => {
      const guestNav = resolveNavigation({ pathname: "/", isMember: false });
      const memberNav = resolveNavigation({ pathname: "/", isMember: true });
      const guestSettings = guestNav.items.find((i) => i.id === "home-settings");
      const memberSettings = memberNav.items.find((i) => i.id === "home-settings");
      expect(guestSettings?.badge?.text).toBe("🔒 Lock");
      expect(memberSettings?.badge?.text).toBeUndefined();
    });

    it("switches context to games navigation with header when on /games", () => {
      const resolved = resolveNavigation({ pathname: "/games", search: "?c=retro" });
      expect(resolved.id).toBe("games");
      expect(resolved.header?.title).toBe("Games Hub");
      const active = resolved.items.find((i) => i.active);
      expect(active?.id).toBe("games-retro");
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
