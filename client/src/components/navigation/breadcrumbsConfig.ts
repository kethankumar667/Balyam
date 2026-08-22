export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

/** Mapping of category query param (`c=...`) on `/games` to human-readable label */
export const GAME_CATEGORY_NAMES: Record<string, string> = {
  all: "All Games",
  favourites: "Favorites",
  multiplayer: "Multiplayer",
  cards: "Card Games",
  board: "Board Games",
  retro: "Retro Classics",
  quick: "Quick Play",
  classic: "Classic Lounge",
  word: "Word & Logic",
};

/**
 * Resolves a breadcrumb hierarchy trail from the current pathname and search params.
 * Flipkart-style: Home > [Category / Parent Section] > [Subcategory] > [Active Page / Item]
 */
export function resolveBreadcrumbs(pathname: string, search: string = ""): BreadcrumbItem[] {
  // Normalize pathname: remove trailing slashes
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // Root or home page has no breadcrumb trail (or only Home)
  if (cleanPath === "/" || cleanPath === "/home") {
    return [];
  }

  const queryParams = new URLSearchParams(search);
  const categoryParam = queryParams.get("c");

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", path: "/" },
  ];

  // 1. Games Catalog & Family
  if (cleanPath === "/games") {
    if (categoryParam && categoryParam !== "all" && GAME_CATEGORY_NAMES[categoryParam]) {
      crumbs.push({ label: "All Games", path: "/games" });
      crumbs.push({ label: GAME_CATEGORY_NAMES[categoryParam] });
    } else {
      crumbs.push({ label: "All Games" });
    }
    return crumbs;
  }

  if (cleanPath === "/favorites") {
    crumbs.push({ label: "Games", path: "/games" });
    crumbs.push({ label: "Favorites" });
    return crumbs;
  }

  if (cleanPath === "/recently-played") {
    crumbs.push({ label: "Games", path: "/games" });
    crumbs.push({ label: "Recently Played" });
    return crumbs;
  }

  // 2. Profile & Account
  if (cleanPath.startsWith("/profile")) {
    crumbs.push({ label: "My Account", path: "/profile" });

    if (cleanPath === "/profile") {
      crumbs.push({ label: "Overview" });
    } else if (cleanPath === "/profile/personal") {
      crumbs.push({ label: "Personal Information" });
    } else if (cleanPath === "/profile/statistics" || cleanPath === "/profile/stats") {
      crumbs.push({ label: "Game Statistics" });
    } else if (cleanPath === "/profile/matches" || cleanPath === "/profile/history") {
      crumbs.push({ label: "Match History" });
    } else if (cleanPath === "/profile/achievements") {
      crumbs.push({ label: "Achievements & Badges" });
    } else {
      const sub = cleanPath.split("/")[2] || "";
      crumbs.push({ label: formatSegment(sub) });
    }
    return crumbs;
  }

  // 3. Competitions & Community
  if (cleanPath === "/leaderboard") {
    crumbs.push({ label: "Competitions", path: "/leaderboard" });
    crumbs.push({ label: "Global Leaderboard" });
    return crumbs;
  }

  if (cleanPath === "/tournaments") {
    crumbs.push({ label: "Competitions", path: "/tournaments" });
    crumbs.push({ label: "Tournaments" });
    return crumbs;
  }

  if (cleanPath === "/social") {
    crumbs.push({ label: "Community", path: "/social" });
    crumbs.push({ label: "Social Hub" });
    return crumbs;
  }

  // 4. Settings
  if (cleanPath.startsWith("/settings")) {
    crumbs.push({ label: "Settings", path: "/settings/preferences" });

    if (cleanPath === "/settings/preferences" || cleanPath === "/settings") {
      crumbs.push({ label: "Preferences" });
    } else if (cleanPath === "/settings/security") {
      crumbs.push({ label: "Security & Data" });
    } else {
      const sub = cleanPath.split("/")[2] || "";
      crumbs.push({ label: formatSegment(sub) });
    }
    return crumbs;
  }

  // 5. Help, Trust & Safety
  if (cleanPath === "/about") {
    crumbs.push({ label: "About Bhalyam" });
    return crumbs;
  }

  if (cleanPath === "/how-to-play" || cleanPath === "/help/how-to-play") {
    crumbs.push({ label: "Help Center", path: "/support" });
    crumbs.push({ label: "How To Play" });
    return crumbs;
  }

  if (cleanPath === "/community-rules" || cleanPath === "/rules" || cleanPath === "/help/community-rules") {
    crumbs.push({ label: "Help Center", path: "/support" });
    crumbs.push({ label: "Community Rules" });
    return crumbs;
  }

  if (cleanPath === "/support" || cleanPath === "/faqs" || cleanPath === "/faq" || cleanPath === "/help/support") {
    crumbs.push({ label: "Help Center", path: "/support" });
    crumbs.push({ label: "Support & FAQs" });
    return crumbs;
  }

  if (cleanPath === "/contact" || cleanPath === "/contact-us" || cleanPath === "/help/contact" || cleanPath === "/support/contact") {
    crumbs.push({ label: "Help Center", path: "/support" });
    crumbs.push({ label: "Contact Us" });
    return crumbs;
  }

  if (cleanPath === "/safety" || cleanPath === "/help/safety") {
    crumbs.push({ label: "Trust & Safety", path: "/safety" });
    crumbs.push({ label: "Safety Center" });
    return crumbs;
  }

  // 6. Legal
  if (cleanPath === "/privacy" || cleanPath === "/help/privacy") {
    crumbs.push({ label: "Legal", path: "/privacy" });
    crumbs.push({ label: "Privacy Policy" });
    return crumbs;
  }

  if (cleanPath === "/terms" || cleanPath === "/terms-of-service" || cleanPath === "/help/terms") {
    crumbs.push({ label: "Legal", path: "/terms" });
    crumbs.push({ label: "Terms of Service" });
    return crumbs;
  }

  // 7. Auth Pages
  if (cleanPath === "/login") {
    crumbs.push({ label: "Account", path: "/login" });
    crumbs.push({ label: "Sign In" });
    return crumbs;
  }

  if (cleanPath === "/signup") {
    crumbs.push({ label: "Account", path: "/signup" });
    crumbs.push({ label: "Create Account" });
    return crumbs;
  }

  if (cleanPath === "/forgot-password") {
    crumbs.push({ label: "Account", path: "/login" });
    crumbs.push({ label: "Forgot Password" });
    return crumbs;
  }

  if (cleanPath === "/reset-password") {
    crumbs.push({ label: "Account", path: "/login" });
    crumbs.push({ label: "Reset Password" });
    return crumbs;
  }

  if (cleanPath === "/verify-email") {
    crumbs.push({ label: "Account", path: "/login" });
    crumbs.push({ label: "Verify Email" });
    return crumbs;
  }

  // 8. Room & Party Screens
  if (cleanPath.startsWith("/room/")) {
    const code = cleanPath.split("/room/")[1]?.toUpperCase() || "";
    crumbs.push({ label: "Game Lounge", path: "/games" });
    crumbs.push({ label: `Room ${code ? `#${code}` : ""}` });
    return crumbs;
  }

  if (cleanPath.startsWith("/tv/")) {
    const code = cleanPath.split("/tv/")[1]?.toUpperCase() || "";
    crumbs.push({ label: "Party TV", path: "/games" });
    crumbs.push({ label: `Screen ${code ? `#${code}` : ""}` });
    return crumbs;
  }

  // 9. Retro Standalone Games
  if (cleanPath === "/nokiacricket" || cleanPath === "/cricket2d") {
    crumbs.push({ label: "Retro Classics", path: "/games?c=retro" });
    crumbs.push({ label: "Nokia Cricket 2D" });
    return crumbs;
  }

  if (cleanPath === "/snake" || cleanPath === "/nokiasnake" || cleanPath === "/snake2d") {
    crumbs.push({ label: "Retro Classics", path: "/games?c=retro" });
    crumbs.push({ label: "Nokia Snake" });
    return crumbs;
  }

  if (cleanPath === "/roadrash" || cleanPath === "/brickracer" || cleanPath === "/racer") {
    crumbs.push({ label: "Retro Classics", path: "/games?c=retro" });
    crumbs.push({ label: "Brick Racer" });
    return crumbs;
  }

  if (cleanPath === "/brickblocks" || cleanPath === "/tetris" || cleanPath === "/bricktetris" || cleanPath === "/pentix") {
    crumbs.push({ label: "Retro Classics", path: "/games?c=retro" });
    crumbs.push({ label: "Brick Tetris" });
    return crumbs;
  }

  if (cleanPath === "/breakout" || cleanPath === "/brickbreakout" || cleanPath === "/brick-breakout" || cleanPath === "/blockbreakout") {
    crumbs.push({ label: "Retro Classics", path: "/games?c=retro" });
    crumbs.push({ label: "Brick Breakout" });
    return crumbs;
  }

  // 10. System, Admin & Showcase
  if (cleanPath === "/admin") {
    crumbs.push({ label: "Console", path: "/admin" });
    crumbs.push({ label: "Admin Dashboard" });
    return crumbs;
  }

  if (cleanPath === "/diagnostics") {
    crumbs.push({ label: "System", path: "/diagnostics" });
    crumbs.push({ label: "Diagnostics" });
    return crumbs;
  }

  if (cleanPath === "/design-system") {
    crumbs.push({ label: "Design System", path: "/design-system" });
    crumbs.push({ label: "Component Catalog" });
    return crumbs;
  }

  if (cleanPath === "/preview/tiles" || cleanPath === "/showcase/tiles") {
    crumbs.push({ label: "Design System", path: "/design-system" });
    crumbs.push({ label: "Game Tiles Showcase" });
    return crumbs;
  }

  if (cleanPath === "/preview/loader" || cleanPath === "/loader") {
    crumbs.push({ label: "Design System", path: "/design-system" });
    crumbs.push({ label: "Gaming Loader Preview" });
    return crumbs;
  }

  if (cleanPath === "/preview/ludo") {
    crumbs.push({ label: "Preview", path: "/games" });
    crumbs.push({ label: "Ludo Board Preview" });
    return crumbs;
  }

  // Dynamic fallback for any unlisted route
  const segments = cleanPath.split("/").filter(Boolean);
  let accumulatedPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accumulatedPath += `/${seg}`;
    const isLast = i === segments.length - 1;
    crumbs.push({
      label: formatSegment(seg),
      path: isLast ? undefined : accumulatedPath,
    });
  }

  return crumbs;
}

/** Formats url slug into Title Case, e.g. "personal-info" -> "Personal Info" */
function formatSegment(seg: string): string {
  if (!seg) return "";
  return seg
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
