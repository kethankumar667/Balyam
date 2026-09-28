import {
  Award,
  History,
  LayoutDashboard,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface ProfileNavigationItem {
  path: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accent: "gold" | "cyan" | "violet" | "coral";
}

export const PROFILE_NAV_ITEMS: readonly ProfileNavigationItem[] = [
  {
    path: "/profile",
    label: "Overview",
    shortLabel: "Home",
    description: "Career overview and game mastery",
    icon: LayoutDashboard,
    accent: "gold",
  },
  {
    path: "/profile/matches",
    label: "Matches",
    shortLabel: "Matches",
    description: "Battle history and match details",
    icon: History,
    accent: "cyan",
  },
  {
    path: "/profile/achievements",
    label: "Achievements",
    shortLabel: "Trophies",
    description: "Achievement progress and unlocks",
    icon: Award,
    accent: "violet",
  },
  {
    path: "/profile/scorecards",
    label: "Scorecards",
    shortLabel: "Scores",
    description: "Personal records by game",
    icon: Trophy,
    accent: "coral",
  },
] as const;

export const PROFILE_ROUTE_REDIRECTS = {
  "/profile/overview": "/profile",
  "/profile/personal": "/profile?edit=profile",
  "/profile/statistics": "/profile#mastery",
  "/profile/stats": "/profile#mastery",
  "/profile/history": "/profile/matches",
} as const;
