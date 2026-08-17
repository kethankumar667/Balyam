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

  if (normalized.startsWith("/games") || RETRO_GAME_ROUTES.has(normalized)) {
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

  if (normalized.startsWith("/about") || normalized.startsWith("/privacy")) {
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

export interface ResolveNavigationOptions {
  pathname: string;
  search?: string;
  hash?: string;
  isMember?: boolean;
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
  config = NAVIGATION_CONFIG,
}: ResolveNavigationOptions): ResolvedNavigationSection {
  const sectionId = determineSection(pathname);
  const section = config[sectionId] || config.home;

  const mapItem = (item: NavigationItem): ResolvedNavigationItem => {
    const active = isItemActive(item, pathname, search, hash);
    const fullHref = item.path
      ? `${item.path}${item.search || ""}${item.hash || ""}`
      : undefined;

    return {
      ...item,
      active,
      fullHref,
    };
  };

  const filterAuth = (item: NavigationItem): boolean => {
    if (item.requiresAuth && !isMember) {
      return false;
    }
    return true;
  };

  const items = section.items.filter(filterAuth).map(mapItem);
  const footerItems = section.footerItems?.filter(filterAuth).map(mapItem);

  return {
    id: section.id,
    header: section.header,
    showPromoNote: section.showPromoNote,
    items,
    footerItems,
  };
}
