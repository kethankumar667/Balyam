import type { ComponentType } from "react";

export type NavigationSectionId =
  | "home"
  | "games"
  | "rooms"
  | "achievements"
  | "profile"
  | "settings"
  | "help"
  | "tournament"
  | "leaderboard"
  | "admin";

export type NavItemAction =
  | "openJoin"
  | "openCreateRoom"
  | "openProfile"
  | "openSettings"
  | "openNotifications"
  | "openGameSheet";

export interface NavBadge {
  text: string;
  variant?: "accent" | "amber" | "emerald" | "rose" | "purple" | "muted";
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path?: string;
  search?: string;
  hash?: string;
  action?: NavItemAction;
  actionParam?: string;
  badge?: NavBadge;
  requiresAuth?: boolean;
  disabled?: boolean;
  isActive?: (pathname: string, search: string, hash: string) => boolean;
}

export interface NavigationSectionHeader {
  title: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string }>;
  parentPath?: string;
  parentLabel?: string;
}

export interface NavigationSection {
  id: NavigationSectionId;
  header?: NavigationSectionHeader;
  items: NavigationItem[];
  footerItems?: NavigationItem[];
  showPromoNote?: boolean;
}

export type NavigationConfig = Record<NavigationSectionId, NavigationSection>;

export interface ResolvedNavigationItem extends NavigationItem {
  active: boolean;
  fullHref?: string;
}

export interface ResolvedNavigationSection extends Omit<NavigationSection, "items" | "footerItems"> {
  items: ResolvedNavigationItem[];
  footerItems?: ResolvedNavigationItem[];
}
