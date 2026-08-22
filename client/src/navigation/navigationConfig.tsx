import {
  Home,
  Gamepad2,
  Users,
  Award,
  HelpCircle,
  Settings as SettingsIcon,
  LayoutGrid,
  Sparkles,
  Shield,
  User,
  Flame,
  Clock,
  Trophy,
  PlusCircle,
  History,
  Mail,
  Lock,
  Sliders,
  Bell,
  Database,
  BookOpen,
  Info,
  Layers,
  Swords,
  Crown,
  BarChart2,
  FileText,
  Bookmark,
} from "lucide-react";
import type { NavigationConfig } from "./types";

export const NAVIGATION_CONFIG: NavigationConfig = {
  /* ──────────────────────── 1. Home Section ──────────────────────── */
  home: {
    id: "home",
    showPromoNote: true,
    items: [
      // Primary Group
      {
        id: "home-feed",
        label: "Home",
        icon: Home,
        path: "/",
        isActive: (p) => p === "/" || p === "/home",
      },
      {
        id: "home-games",
        label: "Games",
        icon: Gamepad2,
        path: "/games",
        isActive: (p) => p === "/games" || (p.startsWith("/games") && !p.startsWith("/games/recent") && !p.startsWith("/games/favorites")),
      },

      // Multiplayer & Social Gaming Group
      {
        id: "home-rooms",
        label: "Rooms",
        icon: LayoutGrid,
        action: "openJoin",
      },
      {
        id: "home-recent",
        label: "Recently Played",
        icon: Clock,
        path: "/recently-played",
        isActive: (p) => p.startsWith("/recently-played"),
      },
      {
        id: "home-favorites",
        label: "Favorites",
        icon: Bookmark,
        path: "/favorites",
        isActive: (p) => p.startsWith("/favorites"),
      },

      // Upcoming Disabled / Coming Soon Features (Locked for all users)
      {
        id: "home-tournaments",
        label: "Tournaments",
        icon: Swords,
        path: "/tournaments",
        badge: { text: "Coming Soon", variant: "muted" },
        disabled: true,
        dividerBefore: true,
        isActive: (p) => p.startsWith("/tournaments"),
      },
      {
        id: "home-social",
        label: "Social Hub",
        icon: Users,
        path: "/social",
        badge: { text: "Coming Soon", variant: "muted" },
        disabled: true,
        isActive: (p) => p.startsWith("/social"),
      },
      {
        id: "home-leaderboard",
        label: "Leaderboard",
        icon: Trophy,
        path: "/leaderboard",
        badge: { text: "Coming Soon", variant: "muted" },
        disabled: true,
        isActive: (p) => p.startsWith("/leaderboard"),
      },

      // Personal, Settings & Help Group
      {
        id: "home-help",
        label: "Help Center",
        icon: HelpCircle,
        path: "/about",
        dividerBefore: true,
        isActive: (p) => p === "/about",
      },
      {
        id: "home-profile",
        label: "Profile",
        icon: User,
        path: "/profile",
        requiresAuth: true,
        isActive: (p) => p.startsWith("/profile"),
      },
      {
        id: "home-settings",
        label: "Settings",
        icon: SettingsIcon,
        path: "/settings",
        isActive: (p) => p === "/settings",
      },
    ],
  },

  /* ──────────────────────── 2. Games Section ──────────────────────── */
  games: {
    id: "games",
    showPromoNote: false,
    header: {
      title: "Games Hub",
      subtitle: "Browse classic & multiplayer titles",
      icon: Gamepad2,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      {
        id: "games-all",
        label: "All Games",
        icon: LayoutGrid,
        path: "/games",
        search: "?c=all",
        isActive: (p, s) => p === "/games" && (!s || s === "" || s === "?c=all" || s.includes("c=all")),
      },
      {
        id: "games-retro",
        label: "Classic Nokia Games",
        icon: Sparkles,
        path: "/games",
        search: "?c=retro",
        badge: { text: "90s", variant: "amber" },
        isActive: (p, s) =>
          p === "/games" && s.includes("c=retro") ||
          ["/nokiacricket", "/cricket2d", "/snake", "/nokiasnake", "/snake2d", "/roadrash", "/brickracer", "/racer", "/brickblocks", "/tetris", "/bricktetris", "/pentix", "/breakout", "/brickbreakout", "/brick-breakout", "/blockbreakout"].includes(p),
      },
      {
        id: "games-board",
        label: "Board Games",
        icon: Shield,
        path: "/games",
        search: "?c=board",
        isActive: (_, s) => s.includes("c=board"),
      },
      {
        id: "games-cards",
        label: "Card Games",
        icon: Layers,
        path: "/games",
        search: "?c=board",
        isActive: (_, s) => s.includes("c=cards"),
      },
      {
        id: "games-multiplayer",
        label: "Multiplayer Games",
        icon: Users,
        path: "/games",
        search: "?c=multiplayer",
        badge: { text: "Live", variant: "emerald" },
        isActive: (_, s) => s.includes("c=multiplayer"),
      },
      {
        id: "games-solo",
        label: "Single Player Games",
        icon: User,
        path: "/games",
        search: "?c=solo",
        isActive: (_, s) => s.includes("c=solo"),
      },
      {
        id: "games-trending",
        label: "Trending Games",
        icon: Flame,
        path: "/games",
        search: "?f=trending",
        badge: { text: "Hot", variant: "rose" },
        isActive: (_, s) => s.includes("f=trending"),
      },
      {
        id: "games-recent",
        label: "Recently Played",
        icon: Clock,
        path: "/recently-played",
        isActive: (p) => p.startsWith("/recently-played"),
      },
      {
        id: "games-favorites",
        label: "Favorites",
        icon: Bookmark,
        path: "/favorites",
        isActive: (p) => p.startsWith("/favorites"),
      },
    ],
  },

  /* ──────────────────────── 3. Rooms Section ──────────────────────── */
  rooms: {
    id: "rooms",
    showPromoNote: false,
    header: {
      title: "Lounge Rooms",
      subtitle: "Join or host multiplayer tables",
      icon: Users,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      {
        id: "rooms-join",
        label: "Join Room",
        icon: Users,
        action: "openJoin",
      },
      {
        id: "rooms-create",
        label: "Create Room",
        icon: PlusCircle,
        action: "openCreateRoom",
      },
      {
        id: "rooms-my",
        label: "My Rooms",
        icon: Shield,
        action: "openJoin",
      },
      {
        id: "rooms-active",
        label: "Active Rooms",
        icon: Flame,
        action: "openJoin",
        badge: { text: "Live", variant: "emerald" },
      },
      {
        id: "rooms-history",
        label: "Room History",
        icon: History,
        action: "openProfile",
      },
      {
        id: "rooms-invites",
        label: "Invitations",
        icon: Mail,
        action: "openNotifications",
      },
    ],
  },

  /* ──────────────────────── 4. Achievements Section ──────────────────────── */
  achievements: {
    id: "achievements",
    showPromoNote: false,
    header: {
      title: "Achievements",
      subtitle: "Trophies, badges & rank",
      icon: Award,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      {
        id: "achievements-overview",
        label: "Overview",
        icon: Award,
        path: "/profile",
        hash: "#sec-profile",
        isActive: (p) => p === "/profile" || p === "/achievements",
      },
      {
        id: "achievements-unlocked",
        label: "Unlocked",
        icon: Trophy,
        path: "/profile",
        hash: "#sec-profile",
      },
      {
        id: "achievements-locked",
        label: "Locked",
        icon: Lock,
        path: "/profile",
        hash: "#sec-profile",
      },
      {
        id: "achievements-games",
        label: "Game Achievements",
        icon: Gamepad2,
        path: "/profile",
        hash: "#sec-profile",
      },
      {
        id: "achievements-leaderboard",
        label: "Leaderboard",
        icon: Crown,
        path: "/profile",
        hash: "#sec-profile",
        badge: { text: "Top 10", variant: "amber" },
      },
      {
        id: "achievements-stats",
        label: "Statistics",
        icon: BarChart2,
        path: "/profile",
        hash: "#sec-data",
      },
    ],
  },

  /* ──────────────────────── 5. Profile Section ──────────────────────── */
  profile: {
    id: "profile",
    showPromoNote: false,
    header: {
      title: "Player Profile",
      subtitle: "Account identity & gameplay stats",
      icon: User,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      // ── Group 1: Profile ──
      {
        id: "profile-overview",
        label: "Profile Overview",
        icon: User,
        path: "/profile",
        isActive: (p) => p === "/profile" || p === "/profile/overview",
      },
      {
        id: "profile-personal",
        label: "Personal Information",
        icon: User,
        path: "/profile/personal",
        isActive: (p) => p === "/profile/personal",
      },

      // ── Group 2: Gaming ──
      {
        id: "profile-stats",
        label: "Game Statistics",
        icon: BarChart2,
        path: "/profile/statistics",
        dividerBefore: true,
        isActive: (p) => p === "/profile/statistics" || p === "/profile/stats",
      },
      {
        id: "profile-matches",
        label: "Match History",
        icon: History,
        path: "/profile/matches",
        isActive: (p) => p === "/profile/matches" || p === "/profile/history",
      },
      {
        id: "profile-achievements",
        label: "Achievements",
        icon: Award,
        path: "/profile/achievements",
        isActive: (p) => p === "/profile/achievements",
      },
      // Preferences / Security & Data used to be duplicated here, pointing
      // at the exact same /settings/* routes the Settings section already
      // lists — one feature, two places in the nav to find it. They now
      // live under Settings only (see that section below).
    ],
  },

  /* ──────────────────────── 6. Settings Section ──────────────────────── */
  settings: {
    id: "settings",
    showPromoNote: false,
    header: {
      title: "Settings",
      subtitle: "Sound, graphics & privacy preferences",
      icon: SettingsIcon,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      {
        id: "settings-preferences",
        label: "Preferences",
        icon: Sliders,
        path: "/settings/preferences",
        isActive: (p) => p === "/settings/preferences" || p === "/settings",
      },
      {
        id: "settings-security",
        label: "Security & Data",
        icon: Shield,
        path: "/settings/security",
        isActive: (p) => p === "/settings/security",
      },
    ],
  },

  /* ──────────────────────── 7. Help & Legal Section ──────────────────────── */
  help: {
    id: "help",
    showPromoNote: false,
    header: {
      title: "Help & Rules",
      subtitle: "Game instructions, FAQs & policies",
      icon: HelpCircle,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      {
        id: "help-about",
        label: "About Bhalyam",
        icon: Info,
        path: "/about",
        isActive: (p) => p === "/about",
      },
      {
        id: "help-how-to-play",
        label: "How to Play",
        icon: BookOpen,
        path: "/how-to-play",
        isActive: (p) => p === "/how-to-play" || p === "/help/how-to-play",
      },
      {
        id: "help-guidelines",
        label: "Community Rules",
        icon: Shield,
        path: "/community-rules",
        isActive: (p) => p === "/community-rules" || p === "/rules" || p === "/help/community-rules",
      },
      {
        id: "help-faq",
        label: "Support & FAQs",
        icon: HelpCircle,
        path: "/support",
        isActive: (p) => p === "/support" || p === "/faqs" || p === "/help/faqs" || p === "/help/support",
      },
      {
        id: "help-privacy",
        label: "Privacy Policy",
        icon: FileText,
        path: "/privacy",
        isActive: (p) => p === "/privacy" || p === "/help/privacy",
      },
      {
        id: "help-terms",
        label: "Terms of Service",
        icon: Lock,
        path: "/terms",
        isActive: (p) => p === "/terms" || p === "/help/terms",
      },
    ],
  },

  /* ──────────────────────── 8. Tournaments (Future Ready) ──────────────────────── */
  tournament: {
    id: "tournament",
    showPromoNote: false,
    header: {
      title: "Tournaments",
      subtitle: "Compete in live championships",
      icon: Swords,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      { id: "tourney-active", label: "Live Tournaments", icon: Flame, path: "/tournaments", badge: { text: "Live", variant: "emerald" } },
      { id: "tourney-upcoming", label: "Upcoming Brackets", icon: Clock, path: "/tournaments" },
      { id: "tourney-my", label: "My Matches", icon: Trophy, path: "/tournaments" },
      { id: "tourney-rules", label: "Tournament Rules", icon: BookOpen, path: "/tournaments" },
      { id: "tourney-leaderboard", label: "Leaderboards", icon: Crown, path: "/leaderboard", badge: { text: "Top", variant: "amber" } },
    ],
  },

  /* ──────────────────────── 9. Leaderboard (Future Ready) ──────────────────────── */
  leaderboard: {
    id: "leaderboard",
    showPromoNote: false,
    header: {
      title: "Hall of Fame",
      subtitle: "Global & friends leaderboards",
      icon: Crown,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      { id: "lb-global", label: "Global Ranking", icon: Crown, path: "/leaderboard" },
      { id: "lb-friends", label: "Friends Board", icon: Users, path: "/leaderboard" },
      { id: "lb-weekly", label: "Weekly Top 10", icon: Trophy, path: "/leaderboard", badge: { text: "Hot", variant: "amber" } },
      { id: "lb-games", label: "Game Records", icon: Gamepad2, path: "/leaderboard" },
    ],
  },

  /* ──────────────────────── 10. Admin & Mod (Future Ready) ──────────────────────── */
  admin: {
    id: "admin",
    showPromoNote: false,
    header: {
      title: "Admin Panel",
      subtitle: "Lounge administration & health",
      icon: Shield,
      parentPath: "/",
      parentLabel: "Back to Home",
    },
    items: [
      { id: "admin-overview", label: "System Health", icon: BarChart2, path: "/diagnostics" },
      { id: "admin-rooms", label: "Active Rooms", icon: Users, path: "/diagnostics" },
      { id: "admin-users", label: "Player Reports", icon: User, path: "/diagnostics" },
      { id: "admin-settings", label: "Feature Flags", icon: SettingsIcon, path: "/diagnostics" },
    ],
  },
};
