import type {
  NavigationConfig,
  NavigationItem,
  NavigationSectionId,
  ResolvedNavigationItem,
  ResolvedNavigationSection,
} from "./types";
import { NAVIGATION_CONFIG } from "./navigationConfig";

const RETRO_GAME_ROUTES = new Set([
  "/nokiacricket",
  "/cricket2d",
  "/snake",
  "/nokiasnake",
  "/snake2d",
  "/roadrash",
  "/brickracer",
  "/racer",
  "/brickblocks",
  "/tetris",
  "/bricktetris",
  "/pentix",
  "/breakout",
  "/brickbreakout",
  "/brick-breakout",
  "/blockbreakout",
]);

/**
 * Maps any pathname to its parent NavigationSectionId.
 * Nested sub-routes automatically inherit their parent section.
 */
export function determineSection(pathname: string): NavigationSectionId {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "") || "/";

  if (normalized === "/" || normalized === "/home") {
    return "home";
  }

  if (
    normalized.startsWith("/games") ||
    normalized.startsWith("/favorites") ||
    normalized.startsWith("/recently-played") ||
    RETRO_GAME_ROUTES.has(normalized)
  ) {
    return "games";
  }

  if (
    normalized.startsWith("/rooms") ||
    normalized.startsWith("/room/") ||
    normalized.startsWith("/tv/")
  ) {
    return "rooms";
  }

  if (normalized.startsWith("/achievements")) {
    return "achievements";
  }

  if (normalized.startsWith("/profile")) {
    return "profile";
  }

  if (normalized.startsWith("/settings")) {
    return "settings";
  }

  if (
    normalized.startsWith("/about") ||
    normalized.startsWith("/privacy") ||
    normalized.startsWith("/how-to-play") ||
    normalized.startsWith("/community-rules") ||
    normalized.startsWith("/rules") ||
    normalized.startsWith("/support") ||
    normalized.startsWith("/faqs") ||
    normalized.startsWith("/terms") ||
    normalized.startsWith("/safety") ||
    normalized.startsWith("/help")
  ) {
    return "help";
  }

  if (normalized.startsWith("/tournament")) {
    return "tournament";
  }

  if (normalized.startsWith("/leaderboard")) {
    return "leaderboard";
  }

  if (normalized.startsWith("/admin") || normalized.startsWith("/diagnostics")) {
    return "admin";
  }

  return "home";
}

/**
 * Checks if a specific NavigationItem is active for the current URL.
 */
export function isItemActive(
  item: NavigationItem,
  pathname: string,
  search: string = "",
  hash: string = "",
): boolean {
  if (typeof item.isActive === "function") {
    return item.isActive(pathname, search, hash);
  }

  if (!item.path) {
    return false;
  }

  const normalizedCurrent = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const normalizedTarget = item.path.toLowerCase().replace(/\/+$/, "") || "/";

  // Check search params match if specified on item
  if (item.search) {
    if (normalizedCurrent !== normalizedTarget) return false;
    const targetParams = new URLSearchParams(item.search);
    const currentParams = new URLSearchParams(search);
    let allMatch = true;
    targetParams.forEach((val, key) => {
      if (currentParams.get(key) !== val) {
        allMatch = false;
      }
    });
    return allMatch;
  }

  // Check hash match if specified on item
  if (item.hash) {
    if (normalizedCurrent !== normalizedTarget) return false;
    return (hash || "").toLowerCase() === item.hash.toLowerCase();
  }

  // Default exact or prefix match
  if (normalizedTarget === "/") {
    return normalizedCurrent === "/" || normalizedCurrent === "/home";
  }

  return normalizedCurrent === normalizedTarget || normalizedCurrent.startsWith(`${normalizedTarget}/`);
}

import { ShieldCheck } from "lucide-react";

export interface ResolveNavigationOptions {
  pathname: string;
  search?: string;
  hash?: string;
  isMember?: boolean;
  isSuperAdmin?: boolean;
  unlockAllFeatures?: boolean;
  accessAdminPanel?: boolean;
  config?: NavigationConfig;
}

/**
 * Resolves full context-aware navigation section for the given route.
 */
export function resolveNavigation({
  pathname,
  search = "",
  hash = "",
  isMember = false,
  isSuperAdmin = false,
  unlockAllFeatures = false,
  accessAdminPanel = false,
  config = NAVIGATION_CONFIG,
}: ResolveNavigationOptions): ResolvedNavigationSection {
  const sectionId = determineSection(pathname);
  const section = config[sectionId] || config.home;
  const isSuperUnlocked = isSuperAdmin || unlockAllFeatures;

  const mapItem = (item: NavigationItem): ResolvedNavigationItem => {
    const active = isItemActive(item, pathname, search, hash);
    const fullHref = item.path
      ? `${item.path}${item.search || ""}${item.hash || ""}`
      : undefined;

    // When super admin mode is active, unlock previously disabled features
    const disabled = isSuperUnlocked ? false : Boolean(item.disabled);

    let badge = item.badge;
    if (isSuperUnlocked && item.disabled) {
      badge = { text: "Unlocked", variant: "emerald" };
    } else if (item.requiresAuth && !isMember && !badge) {
      badge = { text: "Member", variant: "amber" };
    }

    return {
      ...item,
      disabled,
      badge,
      active,
      fullHref,
    };
  };

  const items = section.items.map(mapItem);
  const footerItems = section.footerItems?.map(mapItem) || [];

  // If user has admin capabilities and isn't already inside the admin section, offer 1-click admin console navigation
  if ((accessAdminPanel || isSuperAdmin) && sectionId !== "admin") {
    const alreadyHasAdmin = items.some((i) => i.path?.startsWith("/admin")) || footerItems.some((i) => i.path?.startsWith("/admin"));
    if (!alreadyHasAdmin) {
      footerItems.push({
        id: "nav-superadmin-console",
        label: "Admin Console",
        icon: ShieldCheck,
        path: "/admin/dashboard",
        badge: { text: "Super Admin", variant: "amber" },
        active: pathname.startsWith("/admin"),
        fullHref: "/admin/dashboard",
      });
    }
  }

  return {
    id: section.id,
    header: section.header,
    showPromoNote: section.showPromoNote,
    items,
    footerItems,
  };
}
